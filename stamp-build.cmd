@echo off
rem Writes the build stamp (date and time) into client\scripts\IOBuild.as. Run before a release build:
rem the VS Code task "BYMR - Release" does it, then builds BYMR - Stable, then publishes the client.
cd /d "%~dp0"
for /f %%S in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmm"') do set STAMP=%%S
if "%STAMP%"=="" (echo Could not read the date. & exit /b 1)
powershell -NoProfile -Command "$f='client\scripts\IOBuild.as'; $t=[IO.File]::ReadAllText($f); $n=[regex]::Replace($t,'IOBUILD:\d+:','IOBUILD:%STAMP%:'); [IO.File]::WriteAllText($f,$n)"
if errorlevel 1 (echo Could not write client\scripts\IOBuild.as & exit /b 1)
echo Build stamp: %STAMP%
