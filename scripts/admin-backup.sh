#!/usr/bin/env bash
# =============================================================================
# Sinapsi · encrypted full database backup, run by the PLATFORM ADMIN on their
# own computer (never in CI: health data must not pass through GitHub).
#
#   export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
#   scripts/admin-backup.sh [output-dir]
#
# Needs: pg_dump (brew install libpq) and, preferably, age (brew install age).
# The dump covers the `public` (clinical data) and `auth` (accounts, MFA
# factors) schemas and is encrypted with a passphrase before touching disk.
# Store the output on an encrypted disk (FileVault) and a second offline copy.
# =============================================================================
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase dashboard → Connect → Session pooler)}"
OUT_DIR="${1:-$HOME/Sinapsi-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

command -v pg_dump >/dev/null || { echo "pg_dump not found: brew install libpq && brew link --force libpq" >&2; exit 1; }

if [[ "$(uname)" == "Darwin" ]] && ! fdesetup status 2>/dev/null | grep -q "On"; then
  echo "WARNING: FileVault is off. Backups of health data belong on an encrypted disk." >&2
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
umask 077

DUMP=(pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --schema=public --schema=auth)

if command -v age >/dev/null; then
  OUT="$OUT_DIR/sinapsi-$STAMP.dump.age"
  echo "Encrypting with age (you will be asked for a passphrase twice)…"
  "${DUMP[@]}" | age --passphrase --output "$OUT"
else
  OUT="$OUT_DIR/sinapsi-$STAMP.dump.enc"
  echo "age not found, using openssl AES-256-CBC + PBKDF2 (brew install age is recommended)…"
  "${DUMP[@]}" | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -out "$OUT"
fi

echo "Backup written to $OUT ($(du -h "$OUT" | cut -f1))."
echo "Restore: decrypt (age -d / openssl enc -d …) and pg_restore --no-owner -d <target-db-url>."
