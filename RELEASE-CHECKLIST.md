# Release checklist

Everything in the code is set for release. What is left can only be done on your machine.

## 1. Server settings

Create or edit `server\.env` so it contains:

```
ENV=production
SECRET_KEY=<a long random string of your own, 32+ characters, never shared>
USE_VERSION_MANAGEMENT=disabled
BASE_URL=https://inferno-mr2.maproom2.com
CHAT_WS_HOST=inferno-mr2.maproom2.com:3010
```

`ENV=production` (the server also accepts `prod`) turns request and database-query logging off, turns attack validation on and uses the normal (hourly)
rate limits. `SECRET_KEY` signs every login: with the default, anyone can forge one. The server
prints a `!!! SECURITY` warning at start-up while either is wrong, so check the first lines of
`docker compose logs web` after starting: there should be no such warning.

## 2. Fresh world

Your test world holds a 500M shiny account and the outposts the kits were built from.

```
cd D:\@bymr-inferno-mr2\server
docker compose down -v
docker compose up --build -d
```

The kits are not affected: they are built into the client and also live in
`server\public\assets\kits`.

## 3. Player build

Ctrl+Shift+B > **BYMR - Release**. It stamps the build with the date and time (`stamp-build.cmd`), compiles
BYMR - Stable, and publishes it (`publish-client.cmd` copies `bin\bymr-stable.swf` into
`server\public\client\`). The server reads the stamp out of the published SWF and logs
`Published client build: <stamp>`; from then on a client with an older stamp is asked to restart, on the
login screen if it is just starting, at its next yard change if it was already running. Nothing to
configure and nothing to bump by hand. If the log instead says the client carries no build stamp, the
check is off for that build: tell whoever maintains this. Players start the game with

```
flashplayer.exe https://inferno-mr2.maproom2.com/play.swf
```

That address is a 2 KB launcher (`server\public\client\launcher.swf`, shipped built). It asks the server
which build is current and loads exactly that build from an address containing the build, so no cache
can ever hand out an old game. (`/bymr-stable.swf` gives the launcher too, but a player whose Flash has
an old game cached under that address should switch to `/play.swf`.)

(No quotes around the address: the projector treats a closing quote as part of it.)

Give players `Inferno-MR2.zip`: the Flash projector, a `Launch-inferno-mr2` shortcut that runs exactly
that line, and `instructions.txt` (unzip, double-click the shortcut). The shortcut and instructions are
kept in `player-pack\`; the zip is those two files plus `client\archived\flashplayers\flashplayer.exe`.
Nobody downloads a SWF by hand, and publishing a new build updates every player at their next launch:
no server rebuild, no restart, no new zip. (Debug and Local
builds still talk to localhost and are opened from disk.)

## 4. Try it as a player, with a friend

Register a new account through the public address and check: you land in an Inferno yard with no
tutorial; the kit popup shows six kits on two pages; an attack on a tribe works; claiming the
outpost with shiny works. Then the part nobody has tested yet: attack each other's yards and
outposts, send mail, make and join an alliance.

## 5. Backups

`server\backup-db.cmd` writes a dated dump into `server\backups`. Add it to Windows Task Scheduler
to run nightly.

## Already done in this build

- The six kits are built into the client. A server's own `inferno-kits.json` still overrides them.
- Outposts can no longer recycle buildings (`outpostRecycling: false`); the kit paging test is off.
- Login tokens are verified in every mode, and passwords are never written to the log.
- The tutorial is skipped in production too. New accounts get an avatar from this server, not
  from the upstream project's CDN.
- Chat works through cloudflared: it rides on ordinary web requests (`chatTransport: "http"`), so it
  needs no chat port and no Flash socket policy. `"socket"` brings back the stock WebSocket transport,
  which needs ports 3010 and 843 reachable directly.

## Known gaps you are shipping with

Overworld art on a few buildings, missing Inferno quest icons, no champions / catapult / monster lab /
siege buildings, academy training capped at level 5, no wild monster invasions. The performance work
has not been tested under real load: if a big battle bogs down, keep the server log.
