#!/bin/sh
# Automatic database backups: the "backup" service in docker-compose.yml runs this.
#
#   db-backup loop             every day at BACKUP_HOUR (local time, TZ), and at once when the newest
#                              backup is more than a day old (the computer was off at that hour)
#   db-backup once [label]     a backup now (backup-db.cmd); with a label (restore-db.cmd's
#                              "before-restore") it is <database>-<label>-<time>.dump, which the keeping
#                              rules leave alone
#   db-backup restore <file>   replace the database with a backup (restore-db.cmd)
#   db-backup prune            only apply the keeping rules
#
# A backup is a compressed pg_dump (custom format) named <database>-YYYY-MM-DD_HHMM.dump, checked
# (pg_restore --list) before it counts. Kept: every backup of the last BACKUP_KEEP_DAYS days, then the
# newest of each week for BACKUP_KEEP_WEEKS weeks, then the newest of each month for
# BACKUP_KEEP_MONTHS months. The newest backup is never removed. A failed backup leaves
# LAST-BACKUP-FAILED.txt in the folder (removed by the next good one), and every run is written to
# backup.log there.
#
# Connection: PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE, as for psql.
set -u

DIR=${BACKUP_PATH:-/backups}
DB=${PGDATABASE:-bym}
HOUR=${BACKUP_HOUR:-4}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-14}
KEEP_WEEKS=${BACKUP_KEEP_WEEKS:-8}
KEEP_MONTHS=${BACKUP_KEEP_MONTHS:-12}
CHECK_SECONDS=${BACKUP_CHECK_SECONDS:-600}
LOG="$DIR/backup.log"
FAILED="$DIR/LAST-BACKUP-FAILED.txt"

mkdir -p "$DIR"

log() {
  line="$(date '+%Y-%m-%d %H:%M:%S') $*"
  echo "$line"
  echo "$line" >> "$LOG"
}

# Backups of this database, newest first.
backups() {
  ls -1 "$DIR" 2>/dev/null | grep -E "^$DB-[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}\.dump\$" | sort -r
}

backup() {
  stamp=$(date '+%Y-%m-%d_%H%M')
  label=$(echo "${1:-}" | tr -cd 'a-zA-Z0-9-')
  out="$DIR/$DB-${label:+$label-}$stamp.dump"
  part="$out.partial"
  if pg_dump -Fc -Z 6 -f "$part" "$DB" 2>>"$LOG" && pg_restore --list "$part" >/dev/null 2>>"$LOG"; then
    mv -f "$part" "$out"
    rm -f "$FAILED"
    log "backup ok: $(basename "$out") ($(du -h "$out" | cut -f1))"
    prune
    return 0
  fi
  rm -f "$part"
  log "BACKUP FAILED: $DB could not be dumped (the lines above say why)"
  {
    echo "The last database backup failed at $(date '+%Y-%m-%d %H:%M')."
    echo "See backup.log in this folder, and check the server is running (docker compose ps)."
  } > "$FAILED"
  return 1
}

prune() {
  today=$(date +%s)
  newest=$(backups | head -1)
  seen=" "
  for f in $(backups); do
    day=$(echo "$f" | sed -E "s/^$DB-([0-9]{4}-[0-9]{2}-[0-9]{2})_.*/\1/")
    age=$(( (today - $(date -d "$day" +%s)) / 86400 ))
    week="w$(date -d "$day" +%G-%V)"
    month="m$(date -d "$day" +%Y-%m)"
    keep=""
    if [ "$f" = "$newest" ] || [ "$age" -lt "$KEEP_DAYS" ]; then
      keep="day"
    elif [ "$age" -lt $((KEEP_WEEKS * 7)) ] && ! echo "$seen" | grep -q " $week "; then
      keep="week"
    elif [ "$age" -lt $((KEEP_MONTHS * 31)) ] && ! echo "$seen" | grep -q " $month "; then
      keep="month"
    fi
    # (a backup kept for any reason stands for its week and month: older ones there can go)
    if [ -n "$keep" ]; then
      seen="$seen$week $month "
    else
      rm -f "$DIR/$f"
      log "removed old backup $f"
    fi
  done
}

# A backup is due: none yet today and it is past BACKUP_HOUR, or the newest is more than a day old.
due() {
  if [ -n "$(backups | grep "^$DB-$(date +%Y-%m-%d)_" | head -1)" ]; then
    return 1
  fi
  [ "$(date +%-H)" -ge "$HOUR" ] && return 0
  newest=$(backups | head -1)
  [ -z "$newest" ] && return 0
  [ $(( $(date +%s) - $(stat -c %Y "$DIR/$newest") )) -ge 86400 ] && return 0
  return 1
}

restore() {
  file="$DIR/${1:-}"
  if [ -z "${1:-}" ] || [ ! -f "$file" ]; then
    echo "No backup called '${1:-}' in the backups folder. There are:"
    backups
    return 1
  fi
  pg_restore --list "$file" >/dev/null || { echo "$1 is not a readable backup."; return 1; }
  log "restoring $1 into $DB"
  psql -q -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)" -c "CREATE DATABASE \"$DB\"" || { log "RESTORE FAILED: could not recreate $DB"; return 1; }
  if pg_restore --no-owner --exit-on-error -d "$DB" "$file"; then
    log "restored $1"
    return 0
  fi
  log "RESTORE FAILED: $1 did not restore completely"
  return 1
}

case "${1:-loop}" in
  once)
    backup "${2:-}"
    ;;
  prune)
    prune
    ;;
  restore)
    restore "${2:-}"
    ;;
  loop)
    log "backups of $DB every day at $HOUR:00 ($(date +%Z)) into this folder; keeping $KEEP_DAYS days, $KEEP_WEEKS weeks, $KEEP_MONTHS months"
    until pg_isready -q; do sleep 5; done
    while :; do
      if due; then backup; fi
      sleep "$CHECK_SECONDS"
    done
    ;;
  *)
    echo "db-backup loop | once | prune | restore <file>"
    exit 2
    ;;
esac
