# Running the inferno-only server

This is a fork of the bym-refitted repository (base commit `6d706bd`) with the inferno-only changes
applied. Layout: `server/` (Bun + Koa + Postgres + Redis) and `client-web/` (the game, TypeScript, played in
the browser). `client/` only holds the original game's art exported from its Flash files, for reference; the
game does not use it. What changed and why is in `INFERNO-ONLY-NOTES.md` (`NOTES-INDEX.md` lists its
sections). Every setting file is described in `CONFIG.md`.

## 1a. Server on Windows with Docker (easiest)

Docker runs the API server, PostgreSQL and Redis for you. Nothing else has to be installed for the
server: no Bun, no Postgres, no Redis.

1. Start **Docker Desktop** and wait until it says it is running.
2. Open PowerShell in the `server` folder of this zip (Explorer: Shift + right-click the folder >
   "Open PowerShell window here") and run:
   ```
   docker compose up --build
   ```
   The first run builds the image and creates the database; later runs start in seconds. It is ready
   when the log prints `Server running on: http://localhost:3001`.
3. Check it: open http://localhost:3001/connection in a browser. A blank page means it is up
   (`curl.exe -i http://localhost:3001/connection` shows `200 OK`).

Day to day:

| What | Command (run in `server`) |
|---|---|
| Run in the background | `docker compose up --build -d` |
| Follow the server log | `docker compose logs -f web` |
| Stop | `docker compose down` |
| Apply a change to `InfernoOnlyConfig.ts` or any other source file | `docker compose up --build -d` (the source is copied into the image) |
| Apply a change to `server\.env` | `docker compose up -d` |
| Back up the database now | `backup-db.cmd` (Linux/macOS: `./backup-db.sh`; nightly backups happen by themselves: see "Backups" below) |
| Put a backup back | `restore-db.cmd` lists them, `restore-db.cmd <name>` restores one (Linux/macOS: `./restore-db.sh`) |
| Wipe the database and start a fresh world | `docker compose down -v` then `docker compose up --build` (back up first: this deletes everything) |
| Check tribe spawning is repeatable | `docker compose exec db psql -U postgres -d bym -c "select uuid from bym.world;"` then `docker compose exec web bun src/scripts/verify-tribe-spawns.ts <uuid>` |

**Ports.** `docker-compose.yml` publishes these on the host:

| Port | What | Change it with (in `server\.env`) |
|---|---|---|
| 3001 | the game API. The game itself needs only this one: chat goes over `/chat/poll` and the Devil's Arcade over `/arcade/ws`, both on this port | `API_PORT` |
| 3010 | the stock chat WebSocket, used only with `chatTransport: "socket"` | `CHAT_WS_PORT` |
| 843 | the Flash socket policy, used only with `chatTransport: "socket"` | (fixed) |
| 5432 | PostgreSQL, on 127.0.0.1 only | `DB_HOST_PORT` |
| 6379 | Redis, on 127.0.0.1 only | `REDIS_PORT` |
| 8080 | pgAdmin, only with `docker compose --profile tools up` | `PGADMIN_PORT` |

With `docker-compose.prod.yml` on top, the API is also published on port 80 (Compose adds that file's ports
to these), and PostgreSQL and Redis have no host port at all.

**Port already in use?** If PostgreSQL or Redis is also installed on Windows and running, Docker
cannot take ports 5432 / 6379. Either stop those Windows services, or create a file `server\.env`
containing the lines below, then run `docker compose up --build` again. The game server reaches the
database and Redis inside Docker, so moving these two changes nothing else.
```
DB_HOST_PORT=5433
REDIS_PORT=6380
```
Ports 3001, 3010 and 843 must be free as well: Docker cannot start the `web` container while one of its
published ports is taken. More in `TROUBLESHOOTING.md`, "Port already in use".

A `.env` file is optional with Docker: every setting has a default in `docker-compose.yml`. Those
defaults are for a computer of your own (`ENV=local`, `SECRET_KEY=secret`); a public server needs its own
values (`RELEASE-CHECKLIST.md`, step 1).

### Backups

The `backup` service in `docker-compose.yml` backs up the database by itself, as long as the server is
running (`docker compose up -d` starts it with the rest; nothing to set up in Windows):
- **When:** every day at 4:00 (Chicago time), and at once when it starts and the newest backup is more
  than a day old, so a computer that is off at 4:00 still gets its daily backup when it is next on.
- **Where:** `server\backups`, one compressed file per backup, `bym-2026-09-26_0400.dump`. Each is checked
  after it is written before it counts.
- **How many:** every backup of the last 14 days, then one a week for 8 weeks, then one a month for 12
  months (about 35 files; a few MB each for a small server). The newest is never removed.
- **If one fails:** `LAST-BACKUP-FAILED.txt` appears in the folder (gone after the next good one), and
  `backup.log` there says why. `docker compose logs backup` shows the same.

Settings (optional, in `server\.env`):
```
BACKUP_DIR=C:/Users/YOU/OneDrive/bymr-backups   # somewhere else; a synced folder keeps a copy off this PC
BACKUP_HOUR=4          # 0-23
BACKUP_KEEP_DAYS=14
BACKUP_KEEP_WEEKS=8
BACKUP_KEEP_MONTHS=12
TZ=America/Chicago     # the time zone BACKUP_HOUR is in
```
After changing them: `docker compose up -d`. Backups on the same disk as the database don't survive
that disk failing: pointing `BACKUP_DIR` at a OneDrive / Google Drive folder, or copying the folder
elsewhere now and then, does.

**Back up now:** `backup-db.cmd` (in `server`; Linux/macOS: `./backup-db.sh`). Do it before anything
risky: a big update, a migration, `docker compose down -v`, Docker Desktop trouble.

**Restore:** `restore-db.cmd` lists the backups; `restore-db.cmd bym-2026-09-26_0400.dump` puts that one
back (Linux/macOS: `./restore-db.sh`). It asks you to type YES, backs up the database as it is first
(`bym-before-restore-<time>.dump`, kept until you delete it), stops the game server, replaces the whole
database, and starts the server again. Everything since that backup is gone for every player. Players who
are logged in log in again.

A backup holds the database only. Not in it: Redis (chat history, mutes, maintenance mode, the
announcement, sessions), `server\.env`, the config files, `server\public\docs` (the Change Log),
`server\public\assets\kits` (the kits and their pictures) and the logs. Copy those yourself if you need
them elsewhere.

On another computer or a fresh install: copy the `.dump` file into its `server\backups`, start the server
once (`docker compose up -d`), then `restore-db.cmd <name>`.

Without Docker, the same script works on its own (Linux/macOS, `pg_dump` 18 or newer):
`PGHOST=localhost PGUSER=postgres PGPASSWORD=... PGDATABASE=bym BACKUP_PATH=/some/folder sh server/docker/db-backup.sh once`
(or `loop` to keep running it daily, e.g. as a systemd service).

## 1b. Server without Docker

Needs: [Bun](https://bun.sh) 1.x (the Docker image uses 1.4.2), PostgreSQL (the Docker setup uses 18.1),
Redis.

1. PostgreSQL: create a database called `bym`, and give the `postgres` user the password
   `dev12345` (or put your own values in `server/.env` in step 3).
   ```
   psql -U postgres -c "ALTER USER postgres PASSWORD 'dev12345';"
   psql -U postgres -c "CREATE DATABASE bym;"
   ```
2. Start Redis on the default port (`redis-server`).
3. From `server/`:
   ```
   bun install
   bun run db:init     # creates .env from example.env (random SECRET_KEY), schema, migrations
   bun dev             # or: bun src/server.ts
   ```
   The server listens on http://localhost:3001. `GET /connection` returns 200 when it is up.

**Updating an existing server:** new versions can add database columns and tables. The migrations are in
`server/src/database/migrations`; `bun run migration:up` applies the ones a database is missing.
- With Docker, the `db-init` service runs them (`bun run db:init`) when `docker compose up` starts it, and
  `web` waits for it to finish.
- Without Docker, outside production (`ENV` other than `production` / `prod`) the server applies them
  itself when it starts. With `ENV=production` run `bun run migration:up` in `server/` (the server says `!!! N database migration(s) not applied` at start while any are missing).
- By hand in Docker: `docker compose exec web bun run migration:up`.

The admin is `admintester` (`admins` in `server/src/config/InfernoOnlyConfig.ts`; exact, capitals included).
Admin names are reserved, so nobody can register them from the game: register your account under any name,
then give it the admin name with `bun run admin:claim <your username> admintester` (with Docker:
`docker compose exec web bun run admin:claim <your username> admintester`). More on admins and moderators:
`OPERATIONS-LOGS-AND-SECRETS.md`; the admin's daily work: `ADMIN-GUIDE.md`. If a cron job or timer runs
`scripts/monthly-shiny.ts`, remove it: the daily login reward replaces it and the script now grants nothing.

Use a **fresh database** for a new server. Tribe yards that players have attacked are stored, so an old
database would keep overworld layouts (or reset them: see [Resetting tribe yards](#resetting-tribe-yards)).
To start over: drop and recreate `bym`, `redis-cli flushall`, `bun run db:init`.

Docker works as upstream documents it (`server/docker-compose.yml`), with these changes: a `backup` service;
Redis keeps its data on its own volume; PostgreSQL and Redis are reachable from this computer only; the
rest of `server/.env` reaches the server (`env_file`); and these host folders are bound into the container,
so what is written there survives rebuilds and publishing is a file copy:
`public/assets/kits`, `public/client`, `public/web`, `public/web-dev` and `logs`.

### Settings

The settings are spread over several files; `CONFIG.md` lists each one, what it controls and what an
operator usually changes. The main one is `server/src/config/InfernoOnlyConfig.ts`: starting shiny,
production multipliers, timer divisor, hatch seconds, workers, prices, tribe spawning, Moloch rate /
levels / loot, admins, `requireDiscord`, `alliances` and more. World size is in
`server/src/enums/MapRoom.ts`. After editing a config file: `docker compose up --build -d` (without Docker,
restart the server). Changing any `tribeSpawns` or `moloch` value re-rolls which tribe sits on which cell:
reset the stored tribe yards (see [Resetting tribe yards](#resetting-tribe-yards)).

`ENV=local` in `.env` is fine for playing with friends on a LAN. For a public host, do
`RELEASE-CHECKLIST.md` and, behind a Cloudflare tunnel, `GOING-PUBLIC-CLOUDFLARE.md`.
`requireDiscord: false` (the default) keeps Discord out of it.

### Check tribe spawning is repeatable

```
bun src/scripts/verify-tribe-spawns.ts <world-uuid>            # uuid: select uuid from bym.world;
bun src/scripts/verify-tribe-spawns.ts <world-uuid> reverse    # same fingerprint
```

## Resetting tribe yards

A tribe yard is generated when someone first attacks it and is then stored, damage and all. It goes back
to fresh by itself 12 hours after its last attack. After changing anything that alters tribe layouts
(`flipTribeYards`, the building swaps) reset the stored ones so they are generated again. Players,
outposts and the map itself are not touched.

Use the admin panel: **Map** tab, **Reset every tribe yard** (or **Inspect a cell**, then **Reset this
tribe yard** for one). It leaves yards that a player is attacking right now and the players' own Moloch's
Gauntlet yards, and it is written to the admin log.

By SQL, only if the panel is not available. This deletes every stored tribe yard, including yards under
attack and the Gauntlet yards, and writes nothing to the admin log:
```
docker compose exec db psql -U postgres -d bym -c "delete from bym.save where type='tribe'; delete from bym.world_map_cell where base_type=1;"
```
Changing `tribeSpawns` or the `moloch` settings changes which tribe sits on which cell. Players and their
outposts keep their cells, so the reset above is enough; a full wipe is only needed if you want
everyone to start over on the new map.

## Outpost kits from your own outposts

The kit popup holds the six server kits on two pages (Ember, Brimstone, Demon, Damnation, Underlord and
Apocalypse). They are built into the client; `server/public/assets/kits/inferno-kits.json`, when it holds
kits, overrides them. A third page holds each player's own three kits.

**The easy way: the Designer.** An admin has a **Designer** button in the top bar on their own yards. Its
Outpost kits tab lists the six kits; **Edit** opens one as a free, instant draft yard, and **Save** writes
it into `inferno-kits.json` with its pictures. **Reset** puts the kit back as it was before it was first
changed. Details: `INFERNO-ONLY-NOTES.md`, "The Designer (admins; 27 September)".

**From real outposts** (`src/scripts/export-kits.ts`):

1. Get resources to build with: switch on **admin test mode** (the **Test** switch next to the Admin button
   on your own yards). While it is on you have unlimited resources and shiny, everything builds at once,
   and the Test tools' **Map: Take as outpost** makes a cell your outpost at once. Switching test mode off
   puts your account back as it was, outposts included, so do step 3 **before** switching it off. (Do not
   give yourself shiny with SQL: the server keeps loaded saves in memory and can write over a change made
   while it runs.)
2. In the game, build each outpost exactly how a kit should look. Finish every building, then leave the
   yard so it saves. Note each outpost's map coordinates (0-399, as the game shows them).
3. From `server`, point the command at them, slot = coordinates:
   ```
   docker compose exec web bun src/scripts/export-kits.ts 1=120,340 2=126,338 3=131,350 4=140,332 5=126,360 6=150,341
   ```
   Add `name1="Ember Kit"` to name a kit and `price1=1500000,1500000,750000` to price it in bone,
   coal and sulfur (a fourth number sets the shiny buy-out; without it the game's own top-up formula
   is used). Names and prices can also be changed on their own, without coordinates. Slots you leave
   out keep what they had, so kits can be redone one at a time. It also draws a preview image for
   each kit. Add `world=<uuid>` if the server has more than one world.

The kits are live as soon as the command finishes: reopen the kit popup, no rebuild of anything. The
files are written to `server/public/assets/kits` on your disk (the compose file binds that folder
into the container), so rebuilding or re-creating the containers does not lose them. A database backup
does not hold them: copy the folder yourself. Check what the game will see at
http://localhost:3001/assets/kits/inferno-kits.json.

Prices default to `"auto"` (the client adds up the real building costs). To set one by hand, edit
`server/public/assets/kits/inferno-kits.json`:
`"price": { "r1": 3000000, "r2": 3000000, "r3": 1500000, "shiny": 300 }`. Names and prices you set
survive re-running the command. Without Docker, run `bun src/scripts/export-kits.ts ...` directly.

## 2. Client

The game is played in the browser: `client-web/` (TypeScript, `client-web/src/game`; the inferno-only behaviour is
built in, `GLOBAL.INFERNO_ONLY = true` in `GLOBAL.ts`). There is nothing for players to install. To publish it:

1. Install Node.js 22 or newer.
2. Run `publish-web.cmd` (Linux / Mac: `./publish-web.sh`), or in VS Code `Ctrl+Shift+B` > **BYMR - Release**.
   The first run installs the build tools (`npm install`).

On Windows, `publish-web.cmd` also backs the database up and updates the server (Docker) first, and publishes
the project to GitHub after (`UPDATES.md`). `set SKIP_SERVER=1` and `set SKIP_GITHUB=1` before it publish only
the game (on your own server, set `SKIP_GITHUB=1`, or change the repository at the top of the script).

`publish-web` gives the release a new build stamp itself, then builds the game (`RELEASE=1`), copies it into
`server/public/web`, makes the site's front page open it, and compares the build stamps (`npm run check`).
`stamp-build` is not needed first. (**BYMR - Release** still runs `stamp-build.cmd` and then
`publish-web.cmd`, so the stamp is written twice; that is harmless.) The server address the game uses is the
one it was served from; `SERVER_URL` (default `https://inferno.maproom2.com/`) only matters when the page
is opened from somewhere else. While you work, `watch-web.cmd` / `./watch-web.sh` rebuilds on every save and
publishes to `/web-dev/`. Everything about it (settings, phones, watch mode, troubleshooting, how to work on the
game's code and art) is in `WEB-CLIENT.md`.

(The Flash client is no longer built. If a server still has the last one in `server/public/client/`, it is served
to old Flash players until a newer browser build is published, after which they are told to update and can't
play; delete that folder to stop serving it.)

## Going public: inferno.maproom2.com

Players open `https://inferno.maproom2.com/` in a browser. Publish with `publish-web` (or **BYMR -
Release**): it stamps the build, and the server asks any game with an older stamp than the one it serves to
reload. The page is a small fixed loader that fetches `version.json` with a unique query and then the
content-hashed bundle it names, so a newly published build reaches everyone at their next load and a CDN in front
of the server never pins an old one.

Behind a Cloudflare tunnel, follow `GOING-PUBLIC-CLOUDFLARE.md`. The address has to match how the server is
really reached:

- It says **https** and no port, which needs something in front of the game server that answers on
  port 443 with a valid certificate and forwards to the game API: port 3001 with the plain
  `docker-compose.yml`, port 80 with `docker-compose.prod.yml` (a reverse proxy such as Caddy or nginx, or
  a tunnel). Plain HTTP works too (the game plays on the server it was served from). Do not mix them: a
  server that redirects http to https breaks the game's POST requests.
- In `server/.env` tell the server its public name, then `docker compose up --build -d`:
  ```
  BASE_URL=https://inferno.maproom2.com
  CHAT_WS_HOST=inferno.maproom2.com:3010
  ```
  (`CHAT_WS_HOST` is where the stock socket chat connects; with the default HTTP chat it is not used.)
- Chat goes through the web address too. The stock chat is a WebSocket on its own port (3010) (and the old
  Flash client also needed a policy file from port 843): raw ports that a web-only tunnel such as
  cloudflared cannot carry. This build's default,
  `chatTransport: "http"`, sends the same chat messages as ordinary requests to `/chat/poll`, so chat
  works wherever the game does. Set it to `"socket"` only if you expose 3010 and 843 directly. The Devil's
  Arcade's live games use a WebSocket at `/arcade/ws` on the game's own port, so the tunnel or proxy must
  allow WebSockets.
- A public server should not run as `ENV=local`: that mode prints every request into the console
  (passwords and tokens are hidden, `server/src/middleware/logRequest.ts`) and writes no JSON log file. Use
  `ENV=production` with a real `SECRET_KEY` and `USE_VERSION_MANAGEMENT=disabled` (`RELEASE-CHECKLIST.md`,
  step 1). `prod` is accepted as well. Anything else the code does not know is treated as production.

## 3. First login: what you should see

- Register in the game's login screen (registering logs you in), and you land directly in an Inferno
  yard: lava terrain and an Under Hall. No tutorial, no overworld.
- 2,000-2,025 shiny, 5 workers, 60k bone / coal / sulfur and 55k magma.
- Build a **Map Room** and a **Flinger** (both are in the build menu at Under Hall 1). The map is
  Map Room 2: every land cell is a devil tribe, coordinates run from 0, 0 to 399, 399, and the Flinger's
  level sets how far you can attack.
- Destroy a tribe yard, take the cell over, and you get an Inferno outpost with 2 workers.
- Moloch strongholds are the level 46 / 50 cells named Moloch, with their own map icon: rare, and worth
  60M-120M of each resource (half that in magma).

## 4. What has and has not been tested

Tested for real: the server, end to end over HTTP on a fresh database (see the verification section
of `INFERNO-ONLY-NOTES.md`), including `bun run db:init` from a clean shell.

The game itself is tested in the browser by the scripts in `client-web/tools/test/` (Playwright, against a
local server); the notes list the known rough edges and everything parked.

## Bans and refused attacks

A player whose attack payload the server would not accept (a monster it does not know, or monster stats
that differ from its table) has the attack refused, and the reason is logged and kept. The admin panel's
**Reports** tab lists them under "Attack-violation reports". From the log or the database:

```
docker compose logs web | Select-String "Attack refused"
docker compose exec db psql -U postgres -d bym -c "select username, attack_violations, report from bym.report order by userid desc limit 5;"
```

The account is not banned automatically (`attackViolationBanAfter` in InfernoOnlyConfig.ts).

**Cheat detection** (`anticheat` in InfernoOnlyConfig.ts, on by default): requests no fair game can send
(forged saves, resources or loot out of nowhere, impossible scores...) are reported in the admin panel's
Reports tab, "Cheat detection", with the proof, and what they would have gained is refused. Nobody is banned
automatically. `refuse: false` reports only; `enabled: false` turns it off. From the database:

```
docker compose exec db psql -U postgres -d bym -c "select username, rule, count, refused, last_at from bym.cheat_report where status='open' order by last_at desc;"
```

**To ban or unban:** use the admin panel. Open the player (Players tab, or the name in a report), write the
reason the player will see, and press **Ban**; **Unban** lifts it. The panel also silences the player in chat
at once and writes the ban to the admin log. A banned player is refused at login with the reason, and a game
already open is stopped with it. See `ADMIN-GUIDE.md`.

To ban or unban by hand, only if the panel is not available. This sets no reason, does not silence chat and
writes nothing to the admin log:

```
docker compose exec db psql -U postgres -d bym -c "update bym.\"user\" set banned=true  where username='NAME';"
docker compose exec db psql -U postgres -d bym -c "update bym.\"user\" set banned=false where username='NAME';"
```
