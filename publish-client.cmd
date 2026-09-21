@echo off
rem Publishes the player build so it can be started from a web address:
rem     flashplayer.exe https://inferno-mr2.maproom2.com/bymr-stable.swf
rem The VS Code task "BYMR - Release" does all of it: stamp the build, compile BYMR - Stable, publish.
rem No server rebuild or restart is needed.
cd /d "%~dp0"
if not exist "bin\bymr-stable.swf" (echo bin\bymr-stable.swf not found. Build "BYMR - Stable" first. & pause & exit /b 1)
if not exist "server\public\client" mkdir "server\public\client"
copy /y "bin\bymr-stable.swf" "server\public\client\bymr-stable.swf" >nul
if errorlevel 1 (echo Copy FAILED & pause & exit /b 1)
for /f "tokens=2 delims=:" %%S in ('findstr /c:"IOBUILD:" "client\scripts\IOBuild.as"') do set STAMP=%%S
echo Published build %STAMP%. Players get it the next time they start the game;
echo anyone still running an older build is asked to restart at their next yard change.
