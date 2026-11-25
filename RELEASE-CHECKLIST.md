# Release checklist

Two lists: **First launch** (sections 1 to 5, once, before the world opens to players) and **Every release**
(the last section, each time you put out an update to a running world). Sections 1 to 5 are for a world nobody
plays in yet: section 2 deletes everything.

## 1. Server settings

Create or edit `server\.env` so it contains:

```
ENV=production
SECRET_KEY=<a long random string of your own, 32+ characters, never shared>
USE_VERSION_MANAGEMENT=disabled
BASE_URL=https://inferno.maproom2.com
CHAT_WS_HOST=inferno.maproom2.com:3010
```

`ENV=production` (the server also accepts `prod`) turns request and database-query logging off, turns attack validation on and uses the normal (hourly)
rate limits. `SECRET_KEY` signs every login: with the default, anyone can forge one. The server
prints a `!!! SECURITY` warning at start-up while either is wrong, so check the first lines of
`docker compose logs web` after starting: there should be no such warning.

## 2. Fresh world (first launch only)

**Never on a running world:** `down -v` deletes the database, every player's yard and account, for good. For an
update, see "Every release" below.

Your test world holds test accounts and whatever you built while testing (admin test mode puts your own
account back when you switch it off, but other test accounts keep what they did).

```
cd D:\@bymr-inferno-mr2\server
docker compose down -v
docker compose up --build -d
```

The kits are not affected: they are built into the client and also live in
`server\public\assets\kits`.

## 3. Player build

Run `publish-web.cmd` (Linux/macOS: `./publish-web.sh`), or Ctrl+Shift+B > **BYMR - Release**, which runs
`stamp-build.cmd` and then `publish-web.cmd`. `publish-web` stamps the build itself with the date and time
(`npm run stamp`, into `client-web\src\game\IOBuild.ts`), builds the game and publishes it into
`server\public\web\` (see `WEB-CLIENT.md`, "Publishing"); `stamp-build` is not needed first. The server reads the
stamp from `server\public\web\version.json` and logs `Published browser client build: <stamp>`; from then on a
client with an older stamp is asked to reload, on the login screen if it is just starting, at its next yard change
if it was already running. Nothing to configure and nothing to bump by hand. Players open

```
https://inferno.maproom2.com/
```

in a browser: nothing to install, and a new build reaches everyone at their next load, with no server rebuild
and no restart. (No Flash client is built any more; see RUNNING-INFERNO-ONLY.md, "2. Client".)

## 4. Try it as a player, with a friend

Register a new account through the public address and check: you land in an Inferno yard with no
tutorial; the kit popup shows six kits on two pages; an attack on a tribe works; claiming the
outpost with shiny works. Then the part nobody has tested yet: attack each other's yards and
outposts, send mail, make and join an alliance.

## 5. Backups

Nothing to do: the `backup` service backs the database up every day into `server\backups` (14 daily, 8
weekly, 12 monthly kept). Check it once: after `docker compose up -d` there is a `bym-<date>.dump` in
`server\backups` within a minute. Consider `BACKUP_DIR` in `server\.env` pointing at a OneDrive folder, so a
copy lives off this computer. `backup-db.cmd` backs up on demand; `restore-db.cmd` puts one back
(RUNNING-INFERNO-ONLY.md, "Backups"). (Before this, `backup-db.cmd` was an empty file: no backups were
being made.)

## Already done in this build

- The six kits are built into the client. A server's own `inferno-kits.json` still overrides them.
- Outposts cannot recycle buildings (only an admin's kit draft in the Designer can); the kit paging test is off.
- Login tokens are verified in every mode, and passwords are never written to the log.
- The tutorial is skipped in production too. New accounts get an avatar from this server, not
  from the upstream project's CDN.
- Chat works through cloudflared: it rides on ordinary web requests (`chatTransport: "http"`), so it
  needs no chat port and no Flash socket policy. `"socket"` brings back the stock WebSocket transport,
  which needs ports 3010 and 843 reachable directly.

## Known gaps you are shipping with

No champion cage (the Inferno's champions are monsters, housed in the Compound), no monster lab or siege
buildings, and no Wild Monster Invasions (switched off: `invasions` in `InfernoOnlyConfig.ts`). A few
mission icons in `server/public/assets/missionicon` are missing (also in the base game). The performance
work has not been tested under real load: if a big battle bogs down, keep the server log.

## Every release

For an update to a world players are using (a delta zip or a new full copy). Nothing here deletes data.

1. **Back up**: `backup-db.cmd` (Linux/macOS: `./backup-db.sh`), and check the new `.dump` in `server\backups`.
2. **Warn the players**: on the admin panel's Status tab, plan maintenance 15 minutes ahead with a message
   ("Back at 18:00 UTC"). Players in the game are warned at 15, 5 and 1 minutes; at the time maintenance mode goes
   on, their yards are saved and they are told.
3. **Put the files in place**: extract the zip over the project folder (it holds only changed files). Never copy
   `client-web\src\game\IOBuild.ts` from somewhere else: `publish-web` stamps it.
4. **Server**: `cd server` then `docker compose up --build -d`. The `db-init` service applies any new migrations
   before the server starts (without Docker: `bun run migration:up` in `server`, then restart). Check
   `docker compose logs web`: `Server running on:` and no `!!! SECURITY` lines.
5. **Client**: `publish-web.cmd` (Linux/macOS: `./publish-web.sh`) when anything under `client-web` changed. Open
   games are asked to reload. `publish-web` also writes the players' Shiny page again (`server\public\docs\shiny.html`,
   at `/shiny`) from the server's settings. When a Shiny price or reward in `InfernoOnlyConfig.ts` changed, also run
   `bun server/scripts/shinyPage.ts` from the project folder, even with no client change, and with Docker before
   step 4: `public\docs` is built into the image, so the page goes live with `docker compose up --build -d`.
6. **Check**: log in as a player; the Status tab shows the new published build; the Change Log shows the new day.
7. **Open again**: turn maintenance mode off and clear any announcement.

If something is wrong after step 4, the backup from step 1 and `restore-db.cmd` put the database back
(RUNNING-INFERNO-ONLY.md, "Backups"); the previous files go back the same way they came.

