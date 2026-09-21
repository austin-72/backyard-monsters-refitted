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
| Wipe the database and start a fresh world | `docker compose down -v` then `docker compose up --build` |
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

Use a **fresh database**. Tribe yards that players have attacked are stored, so an old database
would keep overworld layouts. To start over: drop and recreate `bym`, `redis-cli flushall`,
`bun run db:init`.

Docker works as upstream documents it (`server/docker-compose.yml`); nothing about it changed.

### Settings

Everything for this mode is in `server/src/config/InfernoOnlyConfig.ts`: starting shiny, production
multipliers, timer divisor, hatch seconds, workers, tribe spawning, Moloch rate / levels / loot,
`requireDiscord`, `alliances`. World size is in `server/src/enums/MapRoom.ts`. Restart the server
after editing. Changing any `tribeSpawns` or `moloch` value re-rolls the map: wipe the database.

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
- 10,000-25,000 shiny, 5 workers, about 60k of each resource.
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
