@echo off
rem setlocal: the folder change and the variables set here end with the script
setlocal
rem Publishes the game (client-web) to the server, so players can open
rem     https://inferno.maproom2.com/
rem in any modern browser. It gives the release a new build stamp itself (the server tells games older than
rem the published one to reload): stamp-build.cmd is no longer needed first.
rem Needs Node.js 22 or newer. The first run installs the tools (npm install).
cd /d "%~dp0client-web"
where node >nul 2>nul || (echo Node.js was not found. Install Node.js 22 or newer from https://nodejs.org & pause & exit /b 1)
if not exist "node_modules\.bin\tsx.cmd" (
  echo Installing the build tools...
  call npm install --no-audit --no-fund || (echo npm install FAILED & pause & exit /b 1)
)
rem A new build stamp first (stamp-build): the server then asks every open game older than this one to reload.
rem (Without it the release kept the last stamp, and games already open were never told: 12 October.)
call npm run --silent stamp || (echo Stamping the build FAILED & pause & exit /b 1)
if "%SERVER_URL%"=="" set SERVER_URL=https://inferno.maproom2.com/
if "%CDN_URL%"=="" set CDN_URL=%SERVER_URL%
echo Building...
rem RELEASE=1: minified, the art in one file, everything compressed ahead (client-web\tools\build.ts)
set RELEASE=1
call npm run build || (echo Building the game FAILED & pause & exit /b 1)
call npm run --silent publish -- --root || (echo Copying to server\public FAILED & pause & exit /b 1)
if not exist "..\server\public\web\index.html" (echo server\public\web\index.html is missing after the copy & pause & exit /b 1)
rem (QoL #645) the players' Shiny page, server\public\docs\shiny.html (/shiny), written again from the server's settings
call node_modules\.bin\tsx.cmd ..\server\scripts\shinyPage.ts || echo Writing server\public\docs\shiny.html FAILED (the game itself is published).
for /f "tokens=3 delims=:" %%S in ('findstr /c:"IOBUILD:" "src\game\IOBuild.ts"') do set STAMP=%%S
echo.
echo Published the game, build %STAMP%, to server\public\web.
echo Players open the site itself, e.g. https://inferno.maproom2.com/ (and /web/ still works).
echo With Docker: live at once (docker-compose.yml binds server\public\web into the container).
call npm run --silent check
exit /b 0
