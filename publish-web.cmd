@echo off
rem setlocal: the folder change and the variables set here end with the script
setlocal
rem Publishes the browser version of the game (client-web) to the server, so players can open
rem     https://inferno-mr2.maproom2.com/web/
rem in any modern browser, without Flash. Run it after stamp-build.cmd, so the browser build carries
rem the same build stamp as the published SWF (the server refuses clients older than that stamp).
rem Needs Node.js 22 or newer. The first run installs the tools (npm install).
cd /d "%~dp0client-web"
where node >nul 2>nul || (echo Node.js was not found. Install Node.js 22 or newer from https://nodejs.org & pause & exit /b 1)
if not exist "node_modules\.bin\tsx.cmd" (
  echo Installing the build tools...
  call npm install --no-audit --no-fund || (echo npm install FAILED & pause & exit /b 1)
)
if "%SERVER_URL%"=="" set SERVER_URL=https://inferno-mr2.maproom2.com/
if "%CDN_URL%"=="" set CDN_URL=%SERVER_URL%
echo Converting the ActionScript client...
call npm run convert || (echo Converting the ActionScript client FAILED & pause & exit /b 1)
echo Converting the assets...
call npm run assets || (echo Converting the assets FAILED & pause & exit /b 1)
echo Building...
call npm run build || (echo Building the browser client FAILED & pause & exit /b 1)
call npm run --silent publish -- --root || (echo Copying to server\public FAILED & pause & exit /b 1)
if not exist "..\server\public\web\index.html" (echo server\public\web\index.html is missing after the copy & pause & exit /b 1)
for /f "tokens=3 delims=:" %%S in ('findstr /c:"IOBUILD:" "..\client\scripts\IOBuild.as"') do set STAMP=%%S
echo.
echo Published the browser client, build %STAMP%, to server\public\web.
echo Players open the site itself, e.g. https://inferno-mr2.maproom2.com/ (and /web/ still works).
echo With Docker: live at once (docker-compose.yml binds server\public\web into the container).
call npm run --silent check
exit /b 0
