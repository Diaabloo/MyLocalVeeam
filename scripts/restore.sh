#!/usr/bin/env bash
# ==============================================================================
# Script: restore.sh
# Description: Retrieves an encrypted PostgreSQL database dump from MinIO, fetches
#              the decryption key from HashiCorp Vault, decrypts it, and restores it.
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'
umask 077

log() {
	printf '[%s] INFO: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
	printf '[%s] ERROR: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2
	exit 1
}

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

secure_remove() {
	if command -v shred >/dev/null 2>&1; then
		shred -u -z "$@" 2>/dev/null || rm -f "$@"
	else
		rm -f "$@"
	fi
}

cleanup() {
	local exit_code=$?
	trap - EXIT INT TERM

	if [[ -n "${pgpass_file:-}" && -f "${pgpass_file:-}" ]]; then
		secure_remove "$pgpass_file"
	fi

	if [[ -n "${workdir:-}" && -d "${workdir:-}" ]]; then
		rm -rf "$workdir"
	fi

	exit "$exit_code"
}

trap cleanup EXIT INT TERM

for cmd in pg_restore curl openssl mc python3 mktemp date awk grep; do
	require_cmd "$cmd"
done

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${VAULT_ADDR:?VAULT_ADDR is required}"
: "${VAULT_TOKEN:?VAULT_TOKEN is required}"
: "${VAULT_SECRET_PATH:=secret/data/backups/postgres}"
: "${VAULT_SECRET_KEY:=passphrase}"
: "${MINIO_ENDPOINT:?MINIO_ENDPOINT is required}"
: "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}"
: "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}"
: "${MINIO_BUCKET:?MINIO_BUCKET is required}"
: "${MINIO_PREFIX:=postgres-backups}"
: "${OPENSSL_ITERATIONS:=600000}"

TARGET_BACKUP="${1:-}"

workdir="$(mktemp -d)"
pgpass_file="$workdir/.pgpass"
encrypted_file="$workdir/backup.dump.enc"
dump_file="$workdir/backup.dump"

log "Preparing authenticated PostgreSQL connection"
printf '%s:%s:%s:%s:%s\n' "$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER" "$DB_PASSWORD" > "$pgpass_file"
chmod 600 "$pgpass_file"
unset DB_PASSWORD
export PGPASSFILE="$pgpass_file"

log "Preparing MinIO access"
case "$MINIO_ENDPOINT" in
	http://*|https://*) minio_url="${MINIO_ENDPOINT%/}" ;;
	*) minio_url="http://${MINIO_ENDPOINT%/}" ;;
esac

case "$minio_url" in
	http://*) minio_url="http://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${minio_url#http://}" ;;
	https://*) minio_url="https://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${minio_url#https://}" ;;
esac

printf -v MC_HOST_minio '%s' "$minio_url"
export MC_HOST_minio
unset MINIO_ACCESS_KEY MINIO_SECRET_KEY

# 1. Identify the target backup file to restore
if [ -z "$TARGET_BACKUP" ]; then
	log "No specific backup requested. Discovering the latest one..."
	LATEST=$(mc ls minio/"${MINIO_BUCKET}/${MINIO_PREFIX}/${PGDATABASE}/" | awk '{print $NF}' | grep '\.dump\.enc$' | sort | tail -n 1 || true)
	if [ -z "$LATEST" ]; then
		die "Could not find any backups for database $PGDATABASE in MinIO."
	fi
	MINIO_PATH="minio/${MINIO_BUCKET}/${MINIO_PREFIX}/${PGDATABASE}/${LATEST}"
	log "Found latest backup: $LATEST"
else
	if [[ "$TARGET_BACKUP" == minio/* ]]; then
		MINIO_PATH="$TARGET_BACKUP"
	else
		MINIO_PATH="minio/${MINIO_BUCKET}/${MINIO_PREFIX}/${PGDATABASE}/${TARGET_BACKUP}"
	fi
	log "Using requested backup target: $MINIO_PATH"
fi

# 2. Download from MinIO
log "Downloading encrypted snapshot from MinIO..."
mc cp --quiet "$MINIO_PATH" "$encrypted_file"

# 3. Retrieve encryption key from HashiCorp Vault
log "Fetching AES-256 decryption key from Vault"
vault_url="${VAULT_ADDR%/}/v1/${VAULT_SECRET_PATH#/}"
vault_response="$({
	curl --fail --silent --show-error --header "X-Vault-Token: ${VAULT_TOKEN}" --request GET "$vault_url"
})"

BACKUP_PASSPHRASE="$({
	python3 -c '
import json, sys
key = sys.argv[1]
data = json.load(sys.stdin).get("data", {})
if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
	data = data["data"]
value = data.get(key)
if not isinstance(value, str) or not value:
	raise SystemExit(f"Vault secret key {key!r} not found")
print(value)
' "$VAULT_SECRET_KEY" <<<"$vault_response"
})"
unset vault_response
export BACKUP_PASSPHRASE

# 4. Decrypt the payload
log "Decrypting snapshot with AES-256-CBC and PBKDF2"
openssl enc -d -aes-256-cbc -pbkdf2 -iter "$OPENSSL_ITERATIONS" -md sha256 \
	-in "$encrypted_file" -out "$dump_file" -pass env:BACKUP_PASSPHRASE
unset BACKUP_PASSPHRASE
secure_remove "$encrypted_file"

# 5. Restore the Database
log "Restoring database via pg_restore (clean & if-exists)..."
pg_restore \
	--host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE" \
	--no-password --clean --if-exists --no-owner "$dump_file"

secure_remove "$dump_file"
log "Restore process completed successfully."