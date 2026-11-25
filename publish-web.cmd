@echo off
rem Puts out an update, all of it, in this order:
rem   1. a database backup (a dated server\backups\bym-<date>.dump, as the nightly ones; the same keeping rules
rem      remove it in time: every backup for 14 days, then one a week for 8 weeks, then one a month for 12)
rem   2. the server updated: docker compose up --build -d in server\ (the Change Log, guide and docs with it),
rem      then waits until it answers
rem   3. the game (client-web) published to the server, so players open https://inferno.maproom2.com/ in any
rem      modern browser. A new build stamp first: the server tells games older than this one to reload.
rem   4. the project published to GitHub: https://github.com/austin-72/backyard-monsters-refitted, branch
rem      inferno-mr2 and no other branch (step 4 below says what is left out).
rem It stops at the first step that fails, before the next one. Steps 1 and 2 need Docker Desktop running and
rem the server already set up; step 3 Node.js 22 or newer (the first run installs the tools); step 4 Git.
rem
rem The commit message: commit-message.txt in the project folder if there is one (used once: it becomes
rem commit-message.last.txt after the push), else a predefined one: the build, and the Change Log's entry
rem for today if it has one.
rem
rem Switches (set them before running, e.g. "set SKIP_GITHUB=1"):
rem   SKIP_SERVER=1   no backup and no server update (only the game, then GitHub)
rem   SKIP_GITHUB=1   don't publish to GitHub
rem   SERVER_URL, CDN_URL   the address the game is built for (default https://inferno.maproom2.com/)
rem What step 4 printed is in publish-github.log.
setlocal
cd /d "%~dp0"
set "SRC=%CD%"
set "DST=%SRC%\.github\@bymr-inferno-mr2"
set "REPO=https://github.com/austin-72/backyard-monsters-refitted.git"
set "BRANCH=inferno-mr2"
set "GIT_NAME=Austin"
set "GIT_EMAIL=11325054+austin-72@users.noreply.github.com"
set "GHLOG=%SRC%\publish-github.log"

if "%SKIP_SERVER%"=="1" goto :game

rem ---- 1. A backup of the database first (server\backup-db.cmd does the same)
echo.
echo [1/4] Backing up the database...
where docker >nul 2>nul || (echo Docker was not found. Start Docker Desktop, or set SKIP_SERVER=1. & pause & exit /b 1)
pushd "%SRC%\server"
docker compose exec -T backup db-backup once
if errorlevel 1 (
  popd
  echo The backup did not work, so nothing was updated. Is the server running? Start it with: docker compose up -d
  pause
  exit /b 1
)

rem ---- 2. The server
echo.
echo [2/4] Updating the server (docker compose up --build -d)...
docker compose up --build -d
if errorlevel 1 (
  popd
  echo Updating the server FAILED, so the game was not published. "docker compose logs web" in server\ says why.
  pause
  exit /b 1
)
popd
set "PORT=3001"
for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"API_PORT=" "%SRC%\server\.env" 2^>nul') do for /f "tokens=1" %%P in ("%%B") do set "PORT=%%P"
echo Waiting for the server to answer on port %PORT%...
set /a TRIES=0
:waitserver
curl -s -f -o nul -m 5 "http://localhost:%PORT%/connection" && goto :serverup
set /a TRIES+=1
if %TRIES% geq 90 (
  echo The server did not answer within 3 minutes, so the game was not published.
  echo "docker compose logs web" in server\ says why.
  pause
  exit /b 1
)
rem (ping, not timeout: timeout refuses to run without a console, e.g. when the script is started by a tool)
ping -n 3 127.0.0.1 >nul
goto :waitserver
:serverup
echo The server is up.

:game
rem ---- 3. The game
echo.
echo [3/4] Publishing the game...
cd /d "%SRC%\client-web"
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
set "STAMP="
for /f "tokens=3 delims=:" %%S in ('findstr /c:"IOBUILD:" "src\game\IOBuild.ts"') do set STAMP=%%S
echo.
echo Published the game, build %STAMP%, to server\public\web.
echo Players open the site itself, e.g. https://inferno.maproom2.com/ (and /web/ still works).
echo With Docker: live at once (docker-compose.yml binds server\public\web into the container).
call npm run --silent check
cd /d "%SRC%"

rem ---- 4. GitHub
if "%SKIP_GITHUB%"=="1" goto :done
echo.
echo [4/4] Publishing to GitHub (branch %BRANCH%)...
call :github > "%GHLOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
type "%GHLOG%"
if "%RESULT%"=="0" goto :ghok
echo.
echo PUBLISHING TO GITHUB FAILED (the game and the server are updated). The details are above and in publish-github.log.
pause
exit /b %RESULT%
:ghok
echo Published to %REPO% (branch %BRANCH%)

:done
echo.
echo All done.
timeout /t 10 >nul 2>nul
exit /b 0

:github
where git >nul 2>&1
if errorlevel 1 goto :nogit
rem The commit message: commit-message.txt, or a predefined one (the build, and today's Change Log entry).
set "MSGFILE=%SRC%\commit-message.txt"
if exist "%MSGFILE%" goto :havemessage
set "MSGFILE=%TEMP%\bymr-commit-message.txt"
node -e "const fs=require('fs');const [,f,b,o]=process.argv;let e=null;try{e=JSON.parse(fs.readFileSync(f,'utf8')).entries[0]}catch(x){}const t=new Date();const day=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');let m='Inferno Map Room 2: build '+(b||'?')+' ('+day+')';if(e&&e.date===day){m='Inferno Map Room 2, build '+(b||'?')+': '+e.headline+'\n\n'+e.items.map(i=>'- '+i.title).join('\n')}fs.writeFileSync(o,m+'\n')" "%SRC%\server\public\docs\changelog.json" "%STAMP%" "%MSGFILE%"
if errorlevel 1 (echo Writing the commit message failed. & exit /b 1)
:havemessage

rem ---- 1. Copy the current files into the published copy.
rem Only what the game and the server need to be built and run, and the guides for running them.
rem Left out because they are private (never published):
rem   vidya                personal files, nothing to do with the game
rem   server\logs          the server's logs (players' addresses and names)
rem   server\backups       the database backups (every account)
rem   server\data          local database files
rem   .env, dump.rdb, *.dump, *.log   secrets, database files and logs
rem   SUSPECTED-BUGS.md    lists possible exploits, some not fixed yet, on a server that is live
rem   firewall-event-*.json           Cloudflare security exports
rem   server\src\scripts\anticheat\priv   the private anticheat scripts
rem   client-web\tools\*-balance       the balance runs (they can hold a test account's backup)
rem Left out because nothing needs them to build or run the game (25 November):
rem   .github              the published copy itself
rem   node_modules, dist   downloaded packages and build output
rem   server\public\web, web-dev   the built game (made by publish-web)
rem   server\public\client the retired Flash launcher; bymr-stable.swf a build output
rem   server\public\assets\archived   old pictures nothing uses
rem   client, art          the original Flash game's art (for reference) and the art's source files
rem   client-web\tools\test, video, trophy-art   the tests and the art and video tools
rem   sandbox-tools, .vscode, bymr-upload, make-upload-zips.*   tools for working on the project
rem   HANDOFF.md, INFERNO-ONLY-NOTES.md, NOTES-INDEX.md, hell_freezes_over.md   the working notes
rem   client-web\bugreport.md, DESIGN.md, DEVIATIONS.md   notes from the browser port
rem   CLAUDE.md, commit-message.txt, commit-message.last.txt, the logs   the commit message and the logs
rem /MIR also removes from the copy whatever was deleted from the project, or is now left out. Its .git
rem folder is kept.
if not exist "%DST%" mkdir "%DST%"
robocopy "%SRC%" "%DST%" /MIR /R:1 /W:1 /NFL /NDL /NJH /NP ^
  /XD "%SRC%\.github" "%SRC%\vidya" "%SRC%\client" "%SRC%\art" "%SRC%\sandbox-tools" "%SRC%\.vscode" ^
      "%SRC%\bymr-upload" "%SRC%\server\logs" "%SRC%\server\backups" "%SRC%\server\data" ^
      "%SRC%\server\public\web" "%SRC%\server\public\web-dev" "%SRC%\server\public\client" ^
      "%SRC%\server\public\assets\archived" "%SRC%\server\src\scripts\anticheat\priv" ^
      "%SRC%\client-web\tools\test" "%SRC%\client-web\tools\video" "%SRC%\client-web\tools\trophy-art" ^
      "%SRC%\client-web\tools\hfo-balance" "%SRC%\client-web\tools\fmi-balance" node_modules dist .git ^
  /XF .env dump.rdb *.dump *.log bymr-stable.swf firewall-event-*.json CLAUDE.md ^
      "%SRC%\SUSPECTED-BUGS.md" "%SRC%\HANDOFF.md" "%SRC%\INFERNO-ONLY-NOTES.md" "%SRC%\NOTES-INDEX.md" ^
      "%SRC%\hell_freezes_over.md" "%SRC%\commit-message.txt" "%SRC%\commit-message.last.txt" ^
      "%SRC%\make-upload-zips.cmd" "%SRC%\make-upload-zips.mjs" "%SRC%\make-upload-zips.sh" ^
      "%SRC%\client-web\bugreport.md" "%SRC%\client-web\DESIGN.md" "%SRC%\client-web\DEVIATIONS.md"
if errorlevel 8 goto :copyfailed

rem Tidying the published copy (25 November): the guides other than README, CONTRIBUTING and SECURITY go into
rem misc_markdown\, and the README's links point there; the README's line for the working notes goes
rem (INFERNO-ONLY-NOTES.md is not published). /MIR removes misc_markdown on the next run (it is not in the
rem project) and this puts it back, so nothing changes in git unless a guide did.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = $env:DST; $m = Join-Path $d 'misc_markdown'; New-Item -ItemType Directory -Force -Path $m | Out-Null; $names = 'ADMIN-GUIDE','BUG-REPORTS','CONFIG','GOING-PUBLIC-CLOUDFLARE','OPERATIONS-LOGS-AND-SECRETS','RELEASE-CHECKLIST','RUNNING-INFERNO-ONLY','TROUBLESHOOTING','UPDATES','WEB-CLIENT'; foreach ($n in $names) { $f = Join-Path $d ($n + '.md'); if (Test-Path -LiteralPath $f) { Move-Item -LiteralPath $f -Destination (Join-Path $m ($n + '.md')) -Force } }; $p = Join-Path $d 'README.md'; $t = [IO.File]::ReadAllText($p); $t = [Regex]::Replace($t, '(?m)^\| \[INFERNO-ONLY-NOTES\.md\][^\n]*\n', ''); foreach ($n in $names) { $t = $t.Replace('](./' + $n + '.md)', '](./misc_markdown/' + $n + '.md)') }; [IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))"
if errorlevel 1 goto :copyfailed

cd /d "%DST%"
if errorlevel 1 exit /b 1

rem ---- 2. First run: the copy is not a git repository yet. Connect it to GitHub and line it up with
rem what is already on the branch, without touching any files here.
if exist ".git" goto :ready
git init -b %BRANCH%
if errorlevel 1 exit /b 1
git remote add origin "%REPO%"
git fetch origin %BRANCH%
if errorlevel 1 exit /b 1
git reset --mixed FETCH_HEAD
if errorlevel 1 exit /b 1

:ready
git remote set-url origin "%REPO%"
git config user.name "%GIT_NAME%"
git config user.email "%GIT_EMAIL%"

git add -A
if errorlevel 1 exit /b 1
rem Stop publishing anything that .gitignore now excludes (the file stays in this folder).
for /f "delims=" %%F in ('git ls-files -ci --exclude-standard') do git rm -q --cached "%%F"

rem ---- 3. A last check: nothing of the server's own data is about to be published.
git diff --cached --quiet -- ":(glob)**/.env" ":(glob)**/*.dump" ":(glob)**/dump.rdb" ":(glob)**/bymr.jsonl*" ":(glob)**/firewall-event-*.json" "vidya" "server/logs" "server/backups" "server/data" "SUSPECTED-BUGS.md"
if errorlevel 1 goto :private

git diff --cached --quiet
if not errorlevel 1 goto :push
git commit -F "%MSGFILE%"
if errorlevel 1 exit /b 1

:push
git push -u origin HEAD:%BRANCH%
if errorlevel 1 exit /b 1
rem A commit-message.txt is used once: kept as commit-message.last.txt, so the next update can't reuse it.
if /i "%MSGFILE%"=="%SRC%\commit-message.txt" move /y "%SRC%\commit-message.txt" "%SRC%\commit-message.last.txt" >nul
exit /b 0

:nogit
echo Git was not found. Install Git for Windows from https://git-scm.com and run this again.
exit /b 1

:copyfailed
echo Copying the project into .github\@bymr-inferno-mr2 failed. Nothing was published to GitHub.
exit /b 1

:private
echo STOPPED: files that must stay private were about to be published. Nothing was published to GitHub.
git diff --cached --name-only -- ":(glob)**/.env" ":(glob)**/*.dump" ":(glob)**/dump.rdb" ":(glob)**/bymr.jsonl*" ":(glob)**/firewall-event-*.json" "vidya" "server/logs" "server/backups" "server/data" "SUSPECTED-BUGS.md"
git reset -q
exit /b 1
