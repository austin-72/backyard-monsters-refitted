@echo off
rem Watches client\scripts and publishes the browser client to server\public\web-dev on every change,
rem for testing at http://localhost:3001/web-dev/?watch=1 (the page reloads itself on each build).
rem Players keep getting server\public\web, which only publish-web.cmd / the release task update.
rem Needs Node.js 22 or newer. Ctrl+C stops it.
setlocal
cd /d "%~dp0client-web"
where node >nul 2>nul || (echo Node.js was not found. Install Node.js 22 or newer from https://nodejs.org & pause & exit /b 1)
if not exist "node_modules\.bin\tsx.cmd" (
  echo Installing the build tools...
  call npm install --no-audit --no-fund || (echo npm install FAILED & pause & exit /b 1)
)
if "%SERVER_URL%"=="" set SERVER_URL=https://inferno-mr2.maproom2.com/
if "%CDN_URL%"=="" set CDN_URL=%SERVER_URL%
call npm run --silent watch -- %*
