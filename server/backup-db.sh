#!/bin/sh
# Backs up the game database now, the way the nightly backup does (backup-db.cmd's twin, for Linux and macOS): a
# dated file in the backups folder (server/backups unless BACKUP_DIR in .env says otherwise). The server must be
# running. Nightly backups need nothing: the "backup" service in docker-compose.yml makes them by itself.
cd "$(dirname "$0")" || exit 1
if ! docker compose exec -T backup db-backup once; then
  echo
  echo "The backup did not work. Is the server running? Start it with: docker compose up -d"
  exit 1
fi
