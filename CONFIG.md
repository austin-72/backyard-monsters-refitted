# Configuration files

Every file that holds a setting for this server, what it controls, and which settings an operator usually
changes. For what each feature does, see `INFERNO-ONLY-NOTES.md` (`NOTES-INDEX.md` lists its sections).

## How a change takes effect

| What you changed | What to do |
|---|---|
| `server/.env` | `docker compose up -d` (Docker re-creates the containers whose settings changed). Without Docker: restart the server. |
| A file in `server/src/config/` (or anything else in `server/src`) | `docker compose up --build -d`: the source is copied into the image, so a plain restart keeps the old file. Without Docker: restart the server. |
| `server/docker-compose.yml` | `docker compose up -d` |
| A file in `server/public/` | The kits (`public/assets/kits`) and the published client (`public/web`, `public/web-dev`) are bound from the host: nothing to do. Every other file under `server/public` (the Change Log, the "What's different?" PDF, pictures) is copied into the image: `docker compose up --build -d`. Without Docker: nothing (the Change Log is read again when its file changes). |
| The game's own code (`client-web/src`) | Publish the client: `publish-web.cmd` / `./publish-web.sh` (`WEB-CLIENT.md`). |

Most numbers in the server's config files reach the game as flags on every yard load, so a change needs a
server restart and no new client.

---

## 1. `server/.env` (environment)

Made from `server/example.env` (`bun run db:init` copies it and fills in a random `SECRET_KEY` when there is
no `.env`). With Docker, the file is optional: `docker-compose.yml` has a default for every key, and the keys
it lists under `environment:` win over `.env` (for example `DB_HOST`, `REDIS_URL` and `PORT` always point
inside Docker). Secrets are covered in `OPERATIONS-LOGS-AND-SECRETS.md`, section 2.

| Key | What it controls | Usually changed? |
|---|---|---|
| `ENV` | `local` or `production` (`prod` is accepted; an unknown value counts as production; `server/src/config/normalizeEnv.ts`). Production: no request bodies or database queries printed, a JSON log file, migrations not run at start outside Docker. | Yes: `production` for a public server |
| `SECRET_KEY` | Signs every login token and password-reset token. Docker's default is `secret`, which the server warns about. | Yes: a long random value. Changing it signs everyone out |
| `BASE_URL` | The server's own address, as players reach it. | Yes, for a public server |
| `CHAT_WS_HOST`, `CHAT_WS_PORT` | Where the stock socket chat listens and connects. Not used by the default HTTP chat. | Set `CHAT_WS_HOST` with `BASE_URL`, as `RELEASE-CHECKLIST.md` shows |
| `CHAT_POLICY_PORTS` | Ports the Flash socket policy on 843 allows. Defaults to `CHAT_WS_PORT`. | Rarely |
| `PORT` | The API port inside the process (Docker fixes it at 3001). | No |
| `API_PORT` | The host port Docker publishes the API on (default 3001). | If 3001 is taken |
| `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | The database. | `DB_PASSWORD` for a public server; read "DB_PASSWORD" in `OPERATIONS-LOGS-AND-SECRETS.md` first |
| `DB_HOST_PORT` | The host port for PostgreSQL (default 5432, on 127.0.0.1 only). | If 5432 is taken |
| `DB_POOL_MAX` | Database connections in the pool (default 20; `server/src/mikro-orm.config.ts`). | If slow-request lines show the pool full |
| `REDIS_URL`, `REDIS_PORT` | Redis (Docker always uses `redis://redis:6379` inside; `REDIS_PORT` is the host port, 127.0.0.1 only). | If 6379 is taken |
| `SESSION_LIFETIME` | How long a login token lasts (default `30d`). | Rarely |
| `SESSION_BIND_DEVICE` | A token works only in the browser it was made in. `0` turns it off. | Rarely |
| `SAVED_LOGIN_DAYS` | Saved logins on the login page expire this many days after their last use (default 14). | Rarely |
| `COMPRESS_REPLIES` | `0` turns off compressing the server's answers. | No |
| `BACKUP_DIR`, `BACKUP_HOUR`, `BACKUP_KEEP_DAYS`, `BACKUP_KEEP_WEEKS`, `BACKUP_KEEP_MONTHS`, `TZ` | The `backup` service: where, when, how many (`RUNNING-INFERNO-ONLY.md`, "Backups"). | `BACKUP_DIR`, to keep a copy off the machine |
| `ALERT_WEBHOOK_URL` | A Discord channel's webhook: short alerts (a new bug, a bug back, a new cheat report, planned maintenance going on, a failed or late backup; at most one of a kind every 10 minutes). Empty: none. | Recommended for a public server |
| `BACKUP_STATUS_DIR` | Where the admin panel looks for backups to show the newest (default `backups` beside the server; Docker mounts `BACKUP_DIR` there read only). | No |
| `WEB_URL` | The start of the password-reset link in reset emails. `example.env` has a placeholder. | Yes, if you turn email on |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | The mail server for "forgot password" emails (`server/src/config/MailConfig.ts`). | Only to turn email on |
| `DISCORD_TOKEN` | Discord avatars, only when Discord is required (it is not by default). | No |
| `CDN_URL`, `USE_VERSION_MANAGEMENT` | The upstream project's version manifest (`server/src/config/VersionManifestConfig.ts`). | No: keep `USE_VERSION_MANAGEMENT=disabled` |
| `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `PGADMIN_PORT` | pgAdmin, only with `docker compose --profile tools up`. | Only if you use pgAdmin (not on a public machine) |

## 2. `server/docker-compose.yml` and `server/docker-compose.prod.yml`

- **`docker-compose.yml`:** the services `db-init` (schema and migrations, runs once per `up`), `web` (the
  server), `db` (PostgreSQL 18.1), `backup` (nightly backups), `redis` (with an append-only file on its own
  volume) and `pgadmin` (only with `--profile tools`). It sets the published ports, the memory and CPU caps,
  Docker's log rotation (10 files of 20 MB), and the host folders bound into `web`: `public/assets/kits`,
  `public/client`, `public/web`, `public/web-dev` and `logs`. Usually changed: nothing. Ports are moved
  from `.env`.
- **`docker-compose.prod.yml`:** an overlay for production. It also publishes the API on port 80, sets
  `ENV=production`, and removes the host ports of PostgreSQL and Redis. Use it with
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`.

## 3. `server/src/config/InfernoOnlyConfig.ts`

The main file: almost every rule of the Inferno-only game. The table in `INFERNO-ONLY-NOTES.md`,
"Tunables (server, no client rebuild needed)", describes most keys. What it holds:

| Key | What it controls |
|---|---|
| `enabled` | The whole Inferno-only mode. Leave `true`. |
| `admins` | Usernames that are admins (exact, capitals count). Names are reserved. **Usually changed** when you add or remove an admin (`OPERATIONS-LOGS-AND-SECRETS.md`, section 3). |
| `requireDiscord` | Discord verification at login. `false` by default. |
| `anticheat` | The cheat detector: `enabled`, and `refuse` (refuse what a forged request would gain, or only report it). |
| `attackViolationBanAfter` | Refused attack payloads before an automatic ban; 0 (default) never bans. |
| `startingShiny`, `startingResources` | What a new account starts with. |
| `resourceMultiplier`, `magmaMultiplier`, `buildTimeDivisor`, `hatchSeconds` | The pace: production and timers. **Often tuned.** |
| `workers`, `workerSacrificeShiny` | Main-yard workers (outposts always have 2), and the Shiny a sacrificed worker pays (0 turns it off). |
| `prices` | Every Shiny price: protection, overdrives, moving yards, outpost takeover, power-ups, kit buy-outs, walls, top-ups, repair, finish-now, and the Store's Extras (`prices.shop`: Harvest Drone, Training Manual, Academy Scholarship, Raid Insurance, Short Hop, Outpost Guard, Golden Coat, Pet Treats, Name Tag, Champion Statue; and the Apprentice, Repair Crew and Scout Report sold in the Store's own tabs). **Often tuned.** |
| `outpostCapacity` | Storage each outpost adds per resource. |
| `dailyLogin` | The daily reward and its streak days. `shiny: 0` turns it off. |
| `referral` | Invite rewards (`shiny`) and the address invite links use (`inviteUrl`). **Set `inviteUrl`** to your own address. |
| `seo` | `siteUrl`: the address search engines and link previews are given. **Set it** to your own address. |
| `community` | `discordUrl`, `statusUrl`: your own Discord invite and status page, linked from the login screen when starting takes a while. Empty: no link. |
| `welcome` | The popup shown once per login (empty body: none). |
| `minClientBuild` | A floor on the client build stamp; 0 = none. The published build already sets the normal floor. |
| `assetVersion` | Only for a game open from before 23 October: each picture is now asked for with its own content hash (`/assetmap`), which changes by itself when a picture is replaced. Nothing to raise. |
| `yardShadows`, `yardShadowsWhileMoving`, `yardPartialRedraw`, `redrawSweepMs` | How the yard is drawn. |
| `wildAttacks` | Wild tribe attacks on main yards: how often, from what level, and each tribe's armies. |
| `catapult` | The Catapult's three ammunition rows: damage, radius, times, costs. |
| `hiddenUi` | Stock buttons hidden (gift, earn, daveclub). |
| `flipTribeYards` | Tribe yards turned 180 degrees. Reset tribe yards after changing it. |
| `rezghul` | Rezghul on or off, and his magma cost. |
| `invasions` | The base game's Wild Monster Invasions. Off. |
| `disabledDecorations` | Decoration ids taken out of the build menu. |
| `kitPagingTest` | A test switch for the kit popup. Leave `false`. |
| `chat`, `chatTransport` | Chat on or off; `"http"` (works through a web-only tunnel) or `"socket"` (needs ports 3010 and 843). |
| `alliances`, `mapRoom3`, `mushrooms` | Alliances on/off; Map Room 3 (off); mushrooms in the main yard. |
| `tribeSpawns` | How tribes are laid out on the map. Changing any value re-rolls every tribe cell: reset tribe yards. |
| `spawn` | Where new players land. |
| `gauntlet` | Moloch's Gauntlet: days open, stages, win percent, attempts, rewards. |
| `fmi` | The schedule of a classified event. Leave it as it is. |
| `moloch` | Moloch strongholds: how many, levels, which descent bases, loot and loot caps. Changing it re-rolls tribe cells. |
| `synergy` | Monster synergies: on/off, the pairings and what each gives (more damage or armour), the radius, how much partner is needed (by housing), which sides get them (the tribes' own monsters: off). Champions never get or give one, whatever is written here. `INFERNO-ONLY-NOTES.md`, "The Soul Crucible and monster synergies". |

## 4. The other files in `server/src/config/`

| File | What it controls | Usually changed |
|---|---|---|
| `CasinoConfig.ts` | The Brimstone Pit (building 141): on/off, smallest and largest bet, a daily wager cap, payout caps, the silent luck table, which Pit level opens each game, which wins are announced in chat, every game's pay table, the jackpot's seed and cap. Every game is set to return just under 100%; `bun scripts/casino-rtp.ts` (in `server`) checks that none returns 100% or more. | `maxBet`, `dailyWagerCap`, `announce`; change pay tables only with the RTP check |
| `ArcadeConfig.ts` | The Devil's Arcade (building 142): on/off, the sixteen games and their modes, the highest score a second or a run can earn (higher is refused), run time-out, board size, how long a live match waits before a bot, lobby sizes. | Rarely |
| `AllianceConfig.ts` | Alliance size (50 members), name length (3-30), power-ups (Armament, Conquest, Declare War, and the Inferno's Harvest Moon and Builders' Guild): how long each runs, recharge (4 days here), Shiny per hour (from `prices.powerupHour`); Tier II (`POWERUP_TIER2`: runs 1.5x, then 6 days' charge) and planned starts (`POWERUP_PLAN`: 5 minutes to 7 days ahead, a reminder 15 minutes before). Also the texts of alliance shouts. | Rarely |
| `PetsConfig.ts` | Pets: on/off, price (500 Shiny), how many in the yard, per kind and in all, name length, the Magma cost to grow one, which monsters can be pets. | `price`, `growCost` |
| `CrucibleConfig.ts` | The Soul Crucible (building 172): on/off, what a pour gives back for each pair of resources at level 1 and at level 6 (`rates`), the share of the yard's storage that may be poured in a day at each of its six levels (20% to 80%) and the least that share can be (50,000), the least pour. | `rates`, `dailyCapOfStorage` |
| `ReplayConfig.ts` | Attack replays: days kept, the newest kept per defender, size limits, how long an imported replay stays. | `keepDays` |
| `UnderworldConfig.ts` | The Depths of Hell: size and place of the layer, portal count, cell height, outpost and exit range, levels by distance from a portal, loot and caps, the takeover cost multiplier. Server restart only. | Rarely |
| `MapRoom2Config.ts` | Map Room 2 terrain: noise scale, terrain scale, edge smoothing, the largest storage. Changing the terrain numbers changes every world's map. | No |
| `MapRoom3Config.ts` | Map Room 3's cell generation. Map Room 3 is off on this server (`mapRoom3: false`). | No |
| `GameConfig.ts` | `devConfig`: the base project's development switches (sandbox bases, debug console, event overrides, allowed message types). | No |
| `ChatConfig.ts` | The names of the chat channels in Redis. | No |
| `MailConfig.ts` | The SMTP connection, built from the `SMTP_*` keys in `.env`. | No: set `.env` instead |
| `VersionManifestConfig.ts` | Reads the upstream project's version manifest when `USE_VERSION_MANAGEMENT=enabled`. | No |
| `normalizeEnv.ts` | Not a setting: maps the spellings of `ENV` to `local` or `production`. | No |

## 5. Other server files that act as settings

| File | What it controls |
|---|---|
| `server/src/enums/MapRoom.ts` | World size (400 x 400) and players per world (625). |
| `server/src/middleware/rateLimiters.ts` | Rate limits per route (login, register, chat polling, the map, the admin panel, bug reports). Edit the code, then `docker compose up --build -d`. |
| `server/src/mikro-orm.config.ts` | The database connection; pool size from `DB_POOL_MAX`; time-outs for a free connection (30 s), a locked row (30 s) and an idle transaction (2 min). |
| `server/src/game-data/tribes/devil/devilify.ts` | How overworld tribe yards are turned into devil yards (building swaps, level scaling). Reset tribe yards after changing it. |
| `server/src/game-data/designs/defaultDesigns.ts` | The default tribe and Moloch layouts. Admins change layouts in the game's Designer instead (stored in table `io_design`). |
| `server/public/assets/kits/inferno-kits.json` | The six server kits (with `kit-N.png` pictures). Written by the Designer and by `src/scripts/export-kits.ts`; prices can be edited by hand (`RUNNING-INFERNO-ONLY.md`, "Outpost kits"). |
| `server/public/docs/changelog.json` | What the in-game Change Log shows. |
| `server/public/guide/*.md` | The player guide (`/guide`; the login page's "What's different?" and the game's guide links go there) and the rules (`rules.md`, `/rules`). One Markdown file per chapter, in the order `index.md` lists them. A changed file shows within seconds, no restart (`server/src/controllers/guide.ts`). |
| `server/src/guide-classified/*.md` | The guide's chapters only some players may read (the events they took part in), added to their guide when the game opens it. Not in `public/`, so never served as files. |
| `server/public/docs/Inferno-Maproom-2-changes.pdf` | The old guide (6 October), kept but no longer linked: `/whats-different` now goes to `/guide`. |
| `server/ecosystem.config.mjs` | PM2's settings, for running without Docker (`pm2 start ecosystem.config.mjs`). |

## 6. The browser client

| File or setting | What it controls |
|---|---|
| `SERVER_URL`, `CDN_URL` (environment, when building) | The server address built into the game. Used only when the page is opened from somewhere other than the game server. `publish-web` defaults both to `https://inferno.maproom2.com/`; a plain `npm run build` defaults to the upstream addresses. **Set them** when you publish for your own server from a machine that is not the server. |
| `RELEASE`, `MINIFY`, `PACK`, `COMPRESS` (environment, when building) | How the bundle is built (`client-web/tools/build.ts`). `publish-web` sets `RELEASE=1`, which turns on all three. |
| `client-web/src/game/IOBuild.ts` | The build stamp. Written by `npm run stamp`, which `publish-web` runs itself. Do not edit by hand. |
| `client-web/src/config.ts` | Where `SERVER_URL` and `CDN_URL` enter the code. No settings of its own. |
| `.vscode/tasks.json` | The VS Code tasks **BYMR - Release** and **BYMR - Watch**. |

Tables inside the game's code (a change needs a new client publish):
- Tribe display names: `TRIBES.DEVIL_NAMES` in `client-web/src/game/com/monsters/ai/TRIBES.ts`.
- Kit prices and building swaps: `client-web/src/game/com/monsters/kits/InfernoKits.ts` (keep the swaps in
  step with `devilify.ts` on the server).
- Map colours: `client-web/src/game/com/monsters/maproom_advanced/InfernoMapTheme.ts`.
- Outpost build limits: `IO_OUTPOST_QUANTITY` in `client-web/src/game/GLOBAL.ts`.
- Monster stats: the game's `CREATURELOCKER` and the server's `monsterStats.ts` must match.

## What an operator usually changes, in short

1. `server/.env`: `ENV=production`, `SECRET_KEY`, `BASE_URL`, `CHAT_WS_HOST`, `DB_PASSWORD`, maybe
   `BACKUP_DIR` (`RELEASE-CHECKLIST.md`, step 1).
2. `InfernoOnlyConfig.ts`: `admins`, `referral.inviteUrl`, `seo.siteUrl`; then the pace (`resourceMultiplier`,
   `magmaMultiplier`, `buildTimeDivisor`) and `prices` as the game settles.
3. `CasinoConfig.ts`: `maxBet` and `dailyWagerCap` if the Pit needs limits.
4. (Pictures need nothing: each one's address follows its content.)
