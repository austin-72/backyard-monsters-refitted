@echo off
rem Backs up the game database now, the way the nightly backup does: a dated file in the backups
rem folder (server\backups unless BACKUP_DIR in .env says otherwise). The server must be running.
rem Nightly backups need nothing: the "backup" service in docker-compose.yml makes them by itself.
setlocal
cd /d "%~dp0"
docker compose exec -T backup db-backup once
if errorlevel 1 (
  echo.
  echo The backup did not work. Is the server running? Start it with: docker compose up -d
  exit /b 1
)
endlocal
