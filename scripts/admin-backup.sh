#!/usr/bin/env bash
# =============================================================================
# Sinapsi · encrypted full database backup, run by the PLATFORM ADMIN on their
# own computer (never in CI: health data must not pass through GitHub).
#
#   scripts/admin-backup.sh            # one backup now
#   scripts/backup-schedule.sh setup   # run it automatically every day (macOS)
#
# Database URL:  $SUPABASE_DB_URL, or the macOS Keychain item "sinapsi-db-url"
#                (Supabase dashboard → Connect → Session pooler).
# Encryption:    1. age + public key in ~/.config/sinapsi/backup-recipients.txt
#                   (recommended: unattended, the private key stays offline);
#                2. otherwise openssl AES-256 with a passphrase from the Keychain
#                   item "sinapsi-backup-passphrase", or typed interactively.
# Rotation:      keeps the newest $SINAPSI_BACKUP_KEEP files (default 30).
#
# The dump covers the `public` (clinical data) and `auth` (accounts, 2FA)
# schemas. Patient names are already end-to-end encrypted inside the database.
# =============================================================================
set -euo pipefail

OUT_DIR="${SINAPSI_BACKUP_DIR:-$HOME/Sinapsi-backups}"
KEEP="${SINAPSI_BACKUP_KEEP:-30}"
RECIPIENTS="${SINAPSI_BACKUP_RECIPIENTS:-$HOME/.config/sinapsi/backup-recipients.txt}"
STAMP="$(date +%Y%m%d-%H%M%S)"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() {
  log "ERROR: $*" >&2
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$*\" with title \"Sinapsi: backup non riuscito\"" >/dev/null 2>&1 || true
  fi
  exit 1
}
keychain() { security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null || true; }

DB_URL="${SUPABASE_DB_URL:-}"
if [[ -z "$DB_URL" && "$(uname)" == "Darwin" ]]; then DB_URL="$(keychain sinapsi-db-url)"; fi
[[ -n "$DB_URL" ]] || fail "database URL not set (SUPABASE_DB_URL or Keychain item sinapsi-db-url)"

command -v pg_dump >/dev/null || fail "pg_dump not found: brew install libpq && brew link --force libpq"

if [[ "$(uname)" == "Darwin" ]] && ! fdesetup status 2>/dev/null | grep -q "On"; then
  log "WARNING: FileVault is off. Backups of health data belong on an encrypted disk."
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
umask 077

DUMP=(pg_dump "$DB_URL" --format=custom --no-owner --no-privileges --schema=public --schema=auth)

if command -v age >/dev/null && [[ -s "$RECIPIENTS" ]]; then
  OUT="$OUT_DIR/sinapsi-$STAMP.dump.age"
  "${DUMP[@]}" | age --encrypt --recipients-file "$RECIPIENTS" --output "$OUT.part" || fail "dump or encryption failed"
else
  OUT="$OUT_DIR/sinapsi-$STAMP.dump.enc"
  PASS="${SINAPSI_BACKUP_PASSPHRASE:-}"
  if [[ -z "$PASS" && "$(uname)" == "Darwin" ]]; then PASS="$(keychain sinapsi-backup-passphrase)"; fi
  if [[ -n "$PASS" ]]; then
    "${DUMP[@]}" | SINAPSI_PASS="$PASS" openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:SINAPSI_PASS -out "$OUT.part" \
      || fail "dump or encryption failed"
  elif [[ -t 0 ]]; then
    log "No age key and no stored passphrase: you will be asked for a passphrase."
    "${DUMP[@]}" | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -out "$OUT.part" || fail "dump or encryption failed"
  else
    fail "no encryption key configured (run scripts/backup-schedule.sh setup)"
  fi
fi

mv "$OUT.part" "$OUT"
[[ -s "$OUT" ]] || fail "empty backup file"
log "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Rotation: keep the newest $KEEP backups.
ls -1t "$OUT_DIR"/sinapsi-*.dump.* 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f -- "$old" && log "Removed old backup: $old"
done
