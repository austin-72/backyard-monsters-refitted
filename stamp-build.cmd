@echo off
rem Writes the build stamp (date and time) into client-web\src\game\IOBuild.ts. Run before a release:
rem the VS Code task "BYMR - Release" does it, then publishes the game (publish-web.cmd).
setlocal
cd /d "%~dp0client-web"
where node >nul 2>nul || (echo Node.js was not found. Install Node.js 22 or newer from https://nodejs.org & exit /b 1)
if not exist "node_modules\.bin\tsx.cmd" (
  call npm install --no-audit --no-fund || (echo npm install FAILED & exit /b 1)
)
call npm run --silent stamp || (echo Could not write client-web\src\game\IOBuild.ts & exit /b 1)
