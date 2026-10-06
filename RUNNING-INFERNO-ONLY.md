# Running the inferno-only server

This is the bym-refitted repository at commit `6d706bd` with the inferno-only changes applied.
Layout is unchanged: `client/` (ActionScript source + assets), `server/` (Bun + Koa + Postgres +
Redis). What changed and why is in `INFERNO-ONLY-NOTES.md`.

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
| Apply a change to `InfernoOnlyConfig.ts` or any other source file | `docker compose up --build -d` |
| Back up the database now | `backup-db.cmd` (nightly backups happen by themselves: see "Backups" below) |
| Put a backup back | `restore-db.cmd` lists them, `restore-db.cmd <name>` restores one |
| Wipe the database and start a fresh world | `docker compose down -v` then `docker compose up --build` (back up first: this deletes everything) |
| Check tribe spawning is repeatable | `docker compose exec db psql -U postgres -d bym -c "select uuid from bym.world;"` then `docker compose exec web bun src/scripts/verify-tribe-spawns.ts <uuid>` |

**Port already in use?** If PostgreSQL or Redis is also installed on Windows and running, Docker
cannot take ports 5432 / 6379. Either stop those Windows services, or create a file `server\.env`
containing the lines below, then run `docker compose up --build` again. The game only talks to port
3001, so moving these two changes nothing else.
```
DB_HOST_PORT=5433
REDIS_PORT=6380
```
Ports 3001 (API), 3010 (chat) and 843 (Flash socket policy) must be free as well.

A `.env` file is optional with Docker: every setting has a default in `docker-compose.yml`.

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

**Back up now:** `backup-db.cmd` (in `server`). Do it before anything risky: a big update, a migration,
`docker compose down -v`, Docker Desktop trouble.

**Restore:** `restore-db.cmd` lists the backups; `restore-db.cmd bym-2026-09-26_0400.dump` puts that one
back. It asks you to type YES, backs up the database as it is first (`bym-before-restore-<time>.dump`,
kept until you delete it), stops the game server, replaces the whole database, and starts the server
again. Everything since that backup is gone for every player. Players who are logged in log in again.

On another computer or a fresh install: copy the `.dump` file into its `server\backups`, start the server
once (`docker compose up -d`), then `restore-db.cmd <name>`.

Without Docker, the same script works on its own (Linux/macOS, `pg_dump` 18 or newer):
`PGHOST=localhost PGUSER=postgres PGPASSWORD=... PGDATABASE=bym BACKUP_PATH=/some/folder sh server/docker/db-backup.sh once`
(or `loop` to keep running it daily, e.g. as a systemd service).

## 1b. Server without Docker

Needs: [Bun](https://bun.sh) 1.x, PostgreSQL 14+, Redis.

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

**Updating an existing server:** new versions can add database columns. After pulling, run the
migrations once. Outside production (`ENV` other than `prod`) the server applies them itself when it
starts; with `ENV=prod` run `bun run migration:up` in `server/` (in Docker:
`docker compose exec web bun run migration:up`).
This version adds `20260923_AddDailyLogin`, `20260923_AddPlayerKits`, `20260924_AddAdminPanel`, `20260925_AddBugReports`, `20260925_RelockChampions`, `20260925_AddAdminTestMode`, `20260926_AddGauntlet` and `20260926_AddGauntletClaims`.
The admin is `admintester` (`admins` in `server/src/config/InfernoOnlyConfig.ts`; exact, capitals included).
Admin names are reserved, so nobody can register them from the game: register your account under any name,
then give it the admin name with `bun run admin:claim <your username> admintester` (with Docker:
`docker compose exec web bun run admin:claim <your username> admintester`). If a cron job or timer runs
`scripts/monthly-shiny.ts`, remove it: the daily login reward replaces it and the script now grants nothing.

Use a **fresh database**. Tribe yards that players have attacked are stored, so an old database
would keep overworld layouts. To start over: drop and recreate `bym`, `redis-cli flushall`,
`bun run db:init`.

Docker works as upstream documents it (`server/docker-compose.yml`). The only change: `public/assets/kits`
and `public/client` are bound to the host, so exported kits and published clients survive rebuilds.

### Settings

Everything for this mode is in `server/src/config/InfernoOnlyConfig.ts`: starting shiny, production
multipliers, timer divisor, hatch seconds, workers, tribe spawning, Moloch rate / levels / loot,
`requireDiscord`, `alliances`. World size is in `server/src/enums/MapRoom.ts`. Restart the server
after editing. Changing any `tribeSpawns` or `moloch` value re-rolls which tribe sits on which cell:
reset the stored tribe yards (see [Resetting tribe yards](#resetting-tribe-yards)).

`ENV=local` in `.env` is fine for playing with friends on a LAN. For a public host follow upstream's
"Hosting a production server" wiki page; `requireDiscord: false` keeps Discord out of it.

### Check tribe spawning is repeatable

```
bun src/scripts/verify-tribe-spawns.ts <world-uuid>            # uuid: select uuid from bym.world;
bun src/scripts/verify-tribe-spawns.ts <world-uuid> reverse    # same fingerprint
```

## Resetting tribe yards

A tribe yard is generated when someone first attacks it and is then stored, damage and all. After
changing anything that alters tribe layouts (`flipTribeYards`, the building swaps) reset the stored
ones so they are generated again. Players, outposts and the map itself are not touched:
```
docker compose exec db psql -U postgres -d bym -c "delete from bym.save where type='tribe'; delete from bym.world_map_cell where base_type=1;"
```
Changing `tribeSpawns` or the `moloch` settings changes which tribe sits on which cell. Players and their
outposts keep their cells, so the reset above is enough; a full wipe is only needed if you want
everyone to start over on the new map.

## Outpost kits from your own outposts

The kit popup holds six kits over two pages. Until you make your own it shows the three stock kits,
converted to Inferno buildings.

1. Give yourself shiny to build with (close the game first, it reads shiny at login):
   ```
   docker compose exec db psql -U postgres -d bym -c "update bym.save set credits = 500000000 where type = 'main' and name = 'YOUR_USERNAME';"
   ```
2. In the game, take over outposts and build each one exactly how a kit should look. Finish every
   building (instant build), then leave the yard so it saves. Note each outpost's map coordinates.
3. From `server`, point the command at them, slot = coordinates as the game shows them:
   ```
   docker compose exec web bun src/scripts/export-kits.ts 1=-54,-130 2=-60,-128 3=-71,-140 4=-80,-122 5=-66,-150 6=-90,-131
   ```
   Add `name1="Ember Kit"` to name a kit and `price1=1500000,1500000,750000` to price it in bone,
   coal and sulfur (a fourth number sets the shiny buy-out; without it the game's own top-up formula
   is used). Names and prices can also be changed on their own, without coordinates. Slots you leave
   out keep what they had, so kits can be redone one at a time. It also draws a preview image for
   each kit.
The kits are live as soon as step 3 finishes: reopen the kit popup, no rebuild of anything. The
files are written to `server/public/assets/kits` on your disk (the compose file binds that folder
into the container), so rebuilding or re-creating the containers does not lose them. Check what
the game will see at http://localhost:3001/assets/kits/inferno-kits.json. The popup shows a second
page as soon as any of slots 4-6 is filled.

Prices default to `"auto"` (the client adds up the real building costs). To set one by hand, edit
`server/public/assets/kits/inferno-kits.json`:
`"price": { "r1": 3000000, "r2": 3000000, "r3": 1500000, "shiny": 300 }`. Names and prices you set
survive re-running the command. Without Docker, run `bun src/scripts/export-kits.ts ...` directly.

## 2. Client

The client must be rebuilt: the stock launcher / stock SWF will not work with this server, because
the inferno-only behaviour is compiled in (`GLOBAL.INFERNO_ONLY = true` in `client/scripts/GLOBAL.as`).

Follow upstream's "Client Recompilation Guide" wiki page. In short:

1. Install JDK 11 or newer and put its `bin` on your `PATH`.
2. Download the pre-configured Apache Flex SDK linked from that wiki page.
3. In VS Code install the **ActionScript & MXML** extension (bowlerhatllc.vscode-as3mxml).
4. Open this folder in VS Code, then *Command Palette > ActionScript: Select Workspace SDK* and
   pick the Flex SDK.
5. `Ctrl+Shift+B` and choose **BYMR - Debug**. It compiles `bin/bymr-debug.swf` and opens it in the
   bundled Flash projector (`client/archived/flashplayers/`).

The server address is compiled in too: `CONFIG::SERVER_URL` / `CONFIG::CDN_URL` in `asconfig.json`
(and `asconfig.local.json` / `asconfig.stable.json` for the other build tasks). They point at
`http://localhost:3001/`. Change them before building if the server runs elsewhere, and give your
players the SWF you built plus a Flash projector.

**Browser client (no Flash).** `client-web/` converts the same `client/scripts` to JavaScript and
runs it in a browser; most players use it. `publish-web.cmd` builds it into `server/public/web` and
makes the site's front page open it; **BYMR - Release** runs it after publishing the SWF. Everything
about it (settings, phones, watch mode, troubleshooting) is in `WEB-CLIENT.md`.

## Going public: inferno-mr2.maproom2.com

Three builds exist. **BYMR - Debug** and **BYMR - Local** talk to `http://localhost:3001/` and are for
your own testing. **BYMR - Stable** is the one players get: it is compiled against
`https://inferno-mr2.maproom2.com/` (both `CONFIG::SERVER_URL` and `CONFIG::CDN_URL` in
`asconfig.stable.json`). Build and publish it with Ctrl+Shift+B > **BYMR - Release** (stamp, compile BYMR - Stable, `publish-client.cmd`; the
stamp is the client's version, and the server asks anything older than what it serves to restart):
the server hands the client out itself, and players start the projector with
`https://inferno-mr2.maproom2.com/play.swf`: a small launcher that asks the server which build is current
and loads exactly that one, from an address that contains the build, so a cached old game cannot be
picked up. Players open that address (the `Launch-inferno-mr2` shortcut in `player-pack\` does it for
them; ship it in a zip next to `flashplayer.exe`). The file is served with
"always revalidate", unlike artwork, so a newly published build reaches everyone at their next launch
and a CDN in front of the server never pins an old one. A client started from a web address plays on
the server it came from, whatever address was compiled in.

The address is compiled into the SWF, so it has to match how the server is really reached:

- It says **https** and no port, which needs something in front of the game server that answers on
  port 443 with a valid certificate and forwards to port 3001 (a reverse proxy such as Caddy or
  nginx, or a tunnel). If you serve plain HTTP instead, change both values to
  `'http://inferno-mr2.maproom2.com/'` (add `:3001` if there is no proxy at all) and rebuild.
  Do not mix them: a server that redirects http to https breaks the game's POST requests.
- In `server/.env` tell the server its public name, then `docker compose up --build -d`:
  ```
  BASE_URL=https://inferno-mr2.maproom2.com
  CHAT_WS_HOST=inferno-mr2.maproom2.com:3010
  ```
- Chat goes through the web address too. The stock chat is a WebSocket on its own port (3010), and
  Flash will not open it without first fetching a policy file from port 843 on the same host: two
  raw ports that a web-only tunnel such as cloudflared cannot carry. This build's default,
  `chatTransport: "http"`, sends the same chat messages as ordinary requests to `/chat/poll`, so chat
  works wherever the game does. Set it to `"socket"` only if you expose 3010 and 843 directly.
- A public server should not run as `ENV=local`: that mode prints every request, passwords
  included, into the log. See upstream's "Hosting a production server" wiki page for `ENV=prod`
  (it needs a real `SECRET_KEY`; keep `USE_VERSION_MANAGEMENT=disabled`).
  The value is `ENV=production`; `prod` is accepted as well. Anything else the code does not know is
  treated as production.

## 3. First login: what you should see

- Register in the game's login screen, log in, and you land directly in an Inferno yard: lava
  terrain, Under Hall, two harvesters, two silos. No tutorial, no overworld, no portal.
- 2,000-2,025 shiny, 5 workers, 60k bone / coal / sulfur and 55k magma.
- Build a **Map Room** and a **Flinger** (both are in the build menu at Under Hall 1). The map is
  Map Room 2: every land cell is a devil tribe, coordinates read as negatives, and the flinger
  level sets how far you can attack (level 1 = 4 cells).
- Destroy a tribe yard, take the cell over, and you get an Inferno outpost with 1 worker.
- Moloch strongholds are the level 46 / 50 cells named Moloch (they borrow the Beelzenaut icon with a
  crimson tint until they get art of their own): rare, and worth 60M-120M.

## 4. What has and has not been tested

Tested for real: the server, end to end over HTTP on a fresh database (see the verification section
of `INFERNO-ONLY-NOTES.md`), including `bun run db:init` from a clean shell.

Not tested: the client in Flash. It was type-checked with an ActionScript compiler and has no new
errors, but no SWF was built with the Flex SDK or opened. Expect to find visual and gameplay issues
on first play; the notes list the known rough edges and everything parked (art swaps).

## Bans and refused attacks

A player whose attack payload the server would not accept (a monster it does not know, or monster stats
that differ from its table) has the attack refused, and the reason is logged and kept:

```
docker compose logs web | Select-String "Attack refused"
docker compose exec db psql -U postgres -d bym -c "select username, attack_violations, report from bym.report order by userid desc limit 5;"
```

The account is not banned automatically (`attackViolationBanAfter` in InfernoOnlyConfig.ts). To ban or
unban by hand:

```
docker compose exec db psql -U postgres -d bym -c "update bym.\"user\" set banned=true  where username='NAME';"
docker compose exec db psql -U postgres -d bym -c "update bym.\"user\" set banned=false where username='NAME';"
```
