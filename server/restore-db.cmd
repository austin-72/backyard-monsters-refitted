@echo off
rem Puts a backup back: the whole game database is replaced by it. Usage:
rem   restore-db.cmd                             lists the backups
rem   restore-db.cmd bym-2026-09-26_0400.dump    restores that one
rem The database as it is now is backed up first (bym-before-restore-<time>.dump), and the game server
rem is stopped while it runs, then started again.
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Backups, newest first:
  docker compose exec -T backup sh -c "ls -1t /backups | grep '\.dump$'"
  echo.
  echo To put one back: restore-db.cmd ^<name^>
  exit /b 0
)
echo This replaces the WHOLE game database with %~nx1.
echo Everything since that backup is lost: every player's progress, accounts made since, everything.
echo (The database as it is now is backed up first.)
set /p CONFIRM=Type YES to go ahead: 
if /i not "%CONFIRM%"=="YES" (
  echo Nothing was changed.
  exit /b 1
)
docker compose exec -T backup db-backup once before-restore
if errorlevel 1 (
  echo Could not back up the database as it is now, so nothing was changed. Is the server running?
  exit /b 1
)
docker compose stop web
docker compose exec -T backup db-backup restore "%~nx1"
if errorlevel 1 (
  echo.
  echo THE RESTORE DID NOT WORK. The database may be incomplete: restore the before-restore backup
  echo just made the same way, then start the server with: docker compose start web
  exit /b 1
)
docker compose start web
echo.
echo Done: the database is %~nx1 again, and the game server is running.
endlocal
