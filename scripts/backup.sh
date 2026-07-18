#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'
umask 077

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
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

for cmd in pg_dump curl openssl mc python3 mktemp date; do
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
: "${BACKUP_NAME:=${PGDATABASE}-$(date -u +%Y%m%dT%H%M%SZ)}"
: "${OPENSSL_ITERATIONS:=200000}"

workdir="$(mktemp -d)"
pgpass_file="$workdir/.pgpass"
dump_file="$workdir/${BACKUP_NAME}.dump"
encrypted_file="$workdir/${BACKUP_NAME}.dump.enc"

log "Preparing authenticated PostgreSQL connection"
printf '%s:%s:%s:%s:%s\n' "$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER" "$DB_PASSWORD" > "$pgpass_file"
chmod 600 "$pgpass_file"
unset DB_PASSWORD
export PGPASSFILE="$pgpass_file"

log "Fetching encryption passphrase from Vault"
vault_url="${VAULT_ADDR%/}/v1/${VAULT_SECRET_PATH#/}"
vault_response="$({
	curl \
		--fail \
		--silent \
		--show-error \
		--header "X-Vault-Token: ${VAULT_TOKEN}" \
		--request GET \
		"$vault_url"
})"

BACKUP_PASSPHRASE="$({
	python3 -c '
import json
import sys

key = sys.argv[1]
payload = json.load(sys.stdin)
data = payload.get("data", {})

if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
	data = data["data"]

value = data.get(key)
if not isinstance(value, str) or not value:
	raise SystemExit(f"Vault secret key {key!r} was not found or is empty")

print(value)
' "$VAULT_SECRET_KEY" <<<"$vault_response"
})"
unset vault_response
export BACKUP_PASSPHRASE

log "Running hot compressed PostgreSQL dump"
pg_dump \
	--host="$PGHOST" \
	--port="$PGPORT" \
	--username="$PGUSER" \
	--dbname="$PGDATABASE" \
	--no-password \
	--format=custom \
	--compress=9 \
	--file="$dump_file"

log "Encrypting backup with AES-256-CBC and PBKDF2"
openssl enc \
	-aes-256-cbc \
	-salt \
	-pbkdf2 \
	-iter "$OPENSSL_ITERATIONS" \
	-md sha256 \
	-in "$dump_file" \
	-out "$encrypted_file" \
	-pass env:BACKUP_PASSPHRASE

unset BACKUP_PASSPHRASE
secure_remove "$dump_file"

log "Preparing MinIO upload target"
case "$MINIO_ENDPOINT" in
	http://*|https://*)
		minio_url="${MINIO_ENDPOINT%/}"
		;;
	*)
		minio_url="http://${MINIO_ENDPOINT%/}"
		;;
esac

case "$minio_url" in
	http://*)
		minio_url="http://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${minio_url#http://}"
		;;
	https://*)
		minio_url="https://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${minio_url#https://}"
		;;
esac

printf -v MC_HOST_minio '%s' "$minio_url"
export MC_HOST_minio
unset MINIO_ACCESS_KEY MINIO_SECRET_KEY

log "Ensuring immutable MinIO bucket exists"
mc mb --ignore-existing --with-lock "minio/${MINIO_BUCKET}"

object_key="${MINIO_PREFIX%/}/${PGDATABASE}/${BACKUP_NAME}.dump.enc"

log "Uploading encrypted backup to MinIO"
mc cp --quiet "$encrypted_file" "minio/${MINIO_BUCKET}/${object_key}"

secure_remove "$encrypted_file"

log "Backup completed successfully: minio/${MINIO_BUCKET}/${object_key}"
