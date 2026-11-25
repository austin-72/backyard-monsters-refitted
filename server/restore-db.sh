#!/bin/sh
# Puts a backup back: the whole game database is replaced by it (restore-db.cmd's twin, for Linux and macOS).
#   ./restore-db.sh                             lists the backups
#   ./restore-db.sh bym-2026-09-26_0400.dump    restores that one
# The database as it is now is backed up first (bym-before-restore-<time>.dump), and the game server is stopped
# while it runs, then started again. A dump from an older version of the server is brought up to date by the
# migrations, which run again (db-init) before the server starts.
#
# What a dump does NOT hold: Redis (chat history, mutes, maintenance mode, announcements, sessions: players sign in
# again), the server's .env and config, public/docs (the changelog), the kits' files and pictures
# (public/assets/kits), and anything in the logs folder.
cd "$(dirname "$0")" || exit 1
if [ -z "$1" ]; then
  echo "Backups, newest first:"
  docker compose exec -T backup sh -c "ls -1t /backups | grep '\.dump$'"
  echo
  echo "To put one back: ./restore-db.sh <name>"
  exit 0
fi
NAME=$(basename "$1")
echo "This replaces the WHOLE game database with $NAME."
echo "Everything since that backup is lost: every player's progress, accounts made since, everything."
echo "(The database as it is now is backed up first.)"
printf "Type YES to go ahead: "
read -r CONFIRM
if [ "$CONFIRM" != "YES" ] && [ "$CONFIRM" != "yes" ]; then
  echo "Nothing was changed."
  exit 1
fi
if ! docker compose exec -T backup db-backup once before-restore; then
  echo "Could not back up the database as it is now, so nothing was changed. Is the server running?"
  exit 1
fi
docker compose stop web
if ! docker compose exec -T backup db-backup restore "$NAME"; then
  echo
  echo "THE RESTORE DID NOT WORK. The database may be incomplete: restore the before-restore backup"
  echo "just made the same way, then start the server with: docker compose start web"
  exit 1
fi
# (an older dump: the migrations it hasn't had)
docker compose run --rm db-init || echo "The migrations did not all run: see the output above before players come back."
docker compose start web
echo
echo "Done: the database is $NAME again, and the game server is running."
echo "Players are signed in again as usual; chat history and mutes (Redis) are as they were before the restore."
