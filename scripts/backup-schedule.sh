#!/usr/bin/env bash
# =============================================================================
# Sinapsi · schedule the encrypted admin backup on macOS (launchd).
#
#   scripts/backup-schedule.sh setup     # keys, Keychain, daily schedule
#   scripts/backup-schedule.sh run-now   # one backup immediately
#   scripts/backup-schedule.sh status    # schedule + latest backups + log
#   scripts/backup-schedule.sh uninstall # remove the schedule (keeps backups)
#
# The job runs every day at 20:30. If the Mac is asleep at that time, macOS runs
# it as soon as it wakes; if it is switched off, the next day's run catches up.
# =============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.sinapsi.backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/sinapsi-backup.log"
CONF="$HOME/.config/sinapsi"
RECIPIENTS="$CONF/backup-recipients.txt"
HOUR="${SINAPSI_BACKUP_HOUR:-20}"
MINUTE="${SINAPSI_BACKUP_MINUTE:-30}"

[[ "$(uname)" == "Darwin" ]] || { echo "This helper is for macOS (launchd). On Linux use a cron entry for scripts/admin-backup.sh."; exit 1; }

setup() {
  echo "== Tools"
  for tool in pg_dump age; do
    command -v "$tool" >/dev/null || { echo "Missing $tool. Install with: brew install libpq age && brew link --force libpq"; exit 1; }
  done

  echo "== Encryption key (age)"
  mkdir -p "$CONF" && chmod 700 "$CONF"
  if [[ -s "$RECIPIENTS" ]]; then
    echo "Public key already configured: $RECIPIENTS"
  else
    KEYFILE="$HOME/Desktop/sinapsi-backup-PRIVATE-key.txt"
    age-keygen -o "$KEYFILE" 2>/dev/null
    age-keygen -y "$KEYFILE" > "$RECIPIENTS"
    chmod 600 "$KEYFILE" "$RECIPIENTS"
    cat <<MSG

  A new key pair was created.
  - Public key (used to encrypt, stays on this Mac): $RECIPIENTS
  - PRIVATE key (needed to RESTORE): $KEYFILE
    → Print it or copy it to a USB stick kept in a safe place, then delete it from this Mac.
      Without it the backups cannot be opened by anyone.

MSG
  fi

  echo "== Database connection (stored in the macOS Keychain)"
  if security find-generic-password -a "$USER" -s sinapsi-db-url >/dev/null 2>&1; then
    echo "Keychain item sinapsi-db-url already present."
  else
    echo "Paste the Session pooler connection string (Supabase → Connect → Session pooler),"
    echo "with the database password filled in. It is not echoed."
    read -r -s DB_URL
    echo
    security add-generic-password -a "$USER" -s sinapsi-db-url -w "$DB_URL" -U
  fi

  echo "== Daily schedule ($HOUR:$MINUTE)"
  mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
  cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>"$REPO/scripts/admin-backup.sh"</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
PLISTEOF
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "Installed. Running a first backup now…"
  run_now
}

run_now() {
  "$REPO/scripts/admin-backup.sh" 2>&1 | tee -a "$LOG"
}

status() {
  if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
    echo "Schedule: active (every day at $HOUR:$MINUTE)"
  else
    echo "Schedule: NOT installed (run: scripts/backup-schedule.sh setup)"
  fi
  echo "Latest backups:"
  ls -1t "${SINAPSI_BACKUP_DIR:-$HOME/Sinapsi-backups}"/sinapsi-*.dump.* 2>/dev/null | head -5 || echo "  none yet"
  echo "Last log lines:"
  tail -n 5 "$LOG" 2>/dev/null || echo "  no log yet"
}

uninstall() {
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  echo "Schedule removed. Backups in ${SINAPSI_BACKUP_DIR:-$HOME/Sinapsi-backups} were kept."
}

case "${1:-}" in
  setup) setup ;;
  run-now) run_now ;;
  status) status ;;
  uninstall) uninstall ;;
  *) echo "Usage: $0 setup | run-now | status | uninstall"; exit 1 ;;
esac
