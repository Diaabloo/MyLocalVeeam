#!/bin/sh

set -e

VAULT_ADDR="http://127.0.0.1:8200"
VAULT_TOKEN="veeam-root-token"
export VAULT_ADDR VAULT_TOKEN

log() {
	printf '[vault-init] %s\n' "$*"
}

log "waiting for Vault to report initialized"
until vault status >/dev/null 2>&1; do
	sleep 1
done

log "configuring Vault secrets engine"
if ! vault secrets list -format=json | grep -q '"secret/"'; then
	vault secrets enable -path=secret kv-v2 >/dev/null
fi

log "seeding backup passphrase"
if [ -z "${VAULT_BACKUP_PASSPHRASE:-}" ]; then
	log "WARNING: VAULT_BACKUP_PASSPHRASE is not set. Using fallback passphrase."
	VAULT_BACKUP_PASSPHRASE="MaCleDeChiffrementUltraSecreteVeeam2026!"
fi

vault kv put secret/backups/postgres passphrase="${VAULT_BACKUP_PASSPHRASE}" >/dev/null

log "Vault bootstrap complete"