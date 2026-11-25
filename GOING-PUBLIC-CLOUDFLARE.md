# Going public with Cloudflare

How to run the game server behind a Cloudflare tunnel (`cloudflared`): the tunnel as a service, cache
rules, the 100-second limit, keeping the server's port closed, and rotating the tunnel token.

What comes from this repository is cited with a file. The `cloudflared` commands and the Cloudflare
dashboard steps are Cloudflare's, not this project's. They are not in the repo, so check them against
Cloudflare's current documentation before you rely on them.

Before going public, also do `RELEASE-CHECKLIST.md`, step 1 (`ENV=production`, a real `SECRET_KEY`,
`BASE_URL`, `CHAT_WS_HOST`).

---

## 1. What the server expects

- Players open the site over **https** with no port, for example `https://inferno.maproom2.com/`.
  The tunnel answers on 443 and forwards to the game server (`RUNNING-INFERNO-ONLY.md`, "Going public").
- Point the tunnel's public hostname at the game API on the same machine:
  - `http://localhost:3001` with the plain `docker-compose.yml` (host port `API_PORT`, default 3001);
  - `http://localhost:80` if you start with `docker-compose.prod.yml` (it maps `80:3001`).
- Chat rides on ordinary web requests (`chatTransport: "http"` in
  `server/src/config/InfernoOnlyConfig.ts`, the default), so the tunnel needs to carry only the web
  address. Ports 3010 and 843 are needed only with `chatTransport: "socket"`.
- The Devil's Arcade uses a WebSocket on the same port, `/arcade/ws`, through the same tunnel
  (`server/src/server.ts`, `server/src/services/arcade/hub.ts`). Make sure WebSockets are allowed for
  the zone in Cloudflare.
- Do not let anything turn the game's http requests into redirects to https. `RUNNING-INFERNO-ONLY.md`
  warns that a server that redirects http to https breaks the game's POST requests. Serve the game from
  its https address from the start.

In `server/.env`:
```
ENV=production
BASE_URL=https://inferno.maproom2.com
CHAT_WS_HOST=inferno.maproom2.com:3010
```
Then `docker compose up --build -d`.

---

## 2. Run the tunnel as a service

Run `cloudflared` as an operating-system service, so it starts with the machine and comes back after a
crash. Use a tunnel that is managed from the Cloudflare dashboard (Zero Trust, Networks, Tunnels). The
dashboard shows the install command with your token in it.

Cloudflare's command to install the connector as a service (Windows service or systemd unit):
```
cloudflared service install <YOUR_TUNNEL_TOKEN>
```
To remove it:
```
cloudflared service uninstall
```
To check it is running:
```
# Windows (PowerShell)
Get-Service cloudflared
# Linux
systemctl status cloudflared
```
(Check the service name on your machine; the commands above assume `cloudflared`.)

Points that matter for this server:
- Run it on the same machine as the game server, so it reaches `localhost:3001` (or `:80`) and nothing
  else needs to be open.
- The token is stored in the service's configuration on that machine. Anyone who can read it can run
  your tunnel. Treat admin access to that machine as access to the tunnel.
- Never put the token in this repository, in `server/.env`, in a screenshot, or in a bug report. Use a
  placeholder such as `<YOUR_TUNNEL_TOKEN>` in notes.
- After a restart of the machine, check that both are up: the tunnel shows "Healthy" in the dashboard,
  and `https://<your host>/connection` answers 200 with an empty page (`server/src/app.routes.ts`).

---

## 3. Cache rules worth setting

The server already says what may be cached (`server/src/middleware/corsCacheControlSetup.ts`,
production only):

| What | Cache-Control the server sends |
|---|---|
| Game API answers (everything that is not a file in `server/public`) | `no-cache, no-store, must-revalidate` |
| Files in `server/public` | `public, max-age=3600` (1 hour) |
| Content-hashed game files under `/web/` (`game.<hash>.js`, files asked for with `?v=<build id>`) | `public, max-age=31536000, immutable` |
| Pictures asked for with their own content hash, `?v=<10 hex>` (`/assetmap`: nothing to raise by hand) | `public, max-age=31536000, immutable` |
| Pictures asked for with a hash that is no longer theirs (an old open tab after a picture was replaced) | `no-cache, no-store, must-revalidate` |
| `/assetmap?v=<its version>` | `public, max-age=31536000, immutable` |
| Front page, `/web/` and `/web/index.html` | `no-cache`, when the published page carries its `__SITE_URL__` placeholder (`server/src/middleware/seo.ts`) |
| Not found or error answers for files | `no-cache, no-store, must-revalidate` |

The game's loader asks for `version.json` with a unique query each time, so a new build reaches players
even through a cache (`WEB-CLIENT.md`).

Suggested rules (Caching > Cache Rules):
1. **Static files: eligible for cache, use the origin's headers.** Match paths starting with `/web/`
   and `/assets/`. Set Edge TTL to use the origin's Cache-Control. Do not override it: the server's own
   headers are what keep a new build and new pictures from being stuck.
2. **Bypass cache** for `/admin`, `/api/`, `/chat/` and `/web-dev/`. The API and the admin panel must
   never be cached. `/web-dev/` is the watch-mode build and changes on every save.
3. Do not use a site-wide "cache everything" rule that ignores the origin's headers.
4. Keep **Caching > Configuration > Caching Level** at **Standard**. "Ignore query string" would make every version of
   a picture the same address, and the old copy would stay. Since 23 October the game asks for each picture by its
   own content hash (`?v=`), so a replaced picture needs no purge.

The repo's notes mention a cache rule set for the live host on 6 October, after Cloudflare answered
game calls with 429 (`INFERNO-ONLY-NOTES.md`, bug reports #75 and #76). The exact rule is not recorded
in the repo. If 429s come back, **Security > Events** in Cloudflare shows which rule fired.

---

## 4. The 100-second limit

Cloudflare closes a request that the server has not answered after 100 seconds and returns HTTP 524
to the game. The game reports it like `HTTP 524 on /quests/status (125157 ms)`.

Game calls that have hit it, from `INFERNO-ONLY-NOTES.md` and `BUG-REPORTS.md`:
- `/base/save` (during a wild monster attack; #51);
- `/quests/status` and `/casino/bonepile/start` (#84, #85);
- `/casino/*` requests and saves during fast casino play (#63, #64, #67);
- `/worldmapv2/ioreach` (#73).

None of these routes is slow by design. In each case the server or the database was stalled.

What the server does about it now:
- A request waits at most 30 s for a free database connection and at most 30 s for a locked row. The
  database closes a connection left idle inside a transaction for 2 minutes
  (`server/src/mikro-orm.config.ts`, `driverOptions`). A stuck request fails with an error the server
  records, before the 100 s mark.
- One player's casino requests run one at a time (`server/src/middleware/casinoQueue.ts`).
- Every request still running after 15 s is logged as `Slow request: ...`, with the pool, the server's
  clock lag and what each database connection is doing (`server/src/middleware/slowRequests.ts`).

What to do when 524s appear: see `TROUBLESHOOTING.md`, "Cloudflare 524". `DB_POOL_MAX` (default 20)
sets the pool size.

---

## 5. The server's port must only be reachable through Cloudflare

**The server trusts the `CF-Connecting-IP` header.** In `server/src/server.ts`:
```ts
app.proxy = true;
app.proxyIpHeader = "CF-Connecting-IP";
```
With this, Koa takes the client's address (`ctx.ip`) from that header. Cloudflare sets it on every
request it forwards. A client that reaches the port directly can send any value it likes.

What uses `ctx.ip`:
- per-address rate limits: login, register, forgot password, chat polling, the admin panel's sign-in
  and API (`server/src/middleware/rateLimiters.ts`);
- the limit of accounts made per address per hour (`server/src/controllers/auth/register.ts`);
- the "same connection" check for invite rewards (`server/src/services/user/referrals.ts`, through
  `registration_ip` and `last_ip`);
- the address saved on each login (`last_ip`) and written to the log;
- old login tokens bound to a network (`server/src/middleware/auth.ts`, `sameNetwork`).

So a direct connection lets someone skip the per-address limits, fake invite rewards, and fill the log
with false addresses. `app.proxy = true` also makes Koa trust other forwarding headers (the protocol and
host), which the server uses for cookie and page addresses.

What to do:
- Let only `cloudflared` reach the game. Block inbound 3001 (and 80, 3010, 843) from the internet in
  the host's firewall and in your router (no port forwarding).
- `docker-compose.yml` publishes `${API_PORT:-3001}:3001`, `3010` and `843` on all interfaces. The
  database and Redis are already bound to `127.0.0.1` in the same file. You can do the same for the
  API, for example `127.0.0.1:${API_PORT:-3001}:3001`, so only this machine (and the tunnel on it)
  can reach it. This is a change you would make to the compose file yourself; it is not the default.
- Do not run pgAdmin (`docker compose --profile tools up`) on a public machine. Its port
  (`PGADMIN_PORT`, default 8080) is published on all interfaces and it runs with
  `PGADMIN_CONFIG_SERVER_MODE=False`.

How to check from **another** network (a phone on mobile data, for example):
```
curl -i http://<your public IP>:3001/connection
```
It must fail or time out. `https://<your host>/connection` through Cloudflare must answer 200.

---

## 6. Rotate the tunnel token

Rotate it when it may have leaked (a screenshot, a shared log, a lost machine) or when someone with
access leaves.

Option A, new token for the same tunnel:
1. In the Cloudflare dashboard, open the tunnel and make a new token for it (rotate or refresh the
   token; check the current wording in Cloudflare's documentation).
2. On the server machine:
   ```
   cloudflared service uninstall
   cloudflared service install <YOUR_NEW_TUNNEL_TOKEN>
   ```
3. Check the tunnel is "Healthy" and `https://<your host>/connection` answers 200.
4. Check in the dashboard that no other connector is still attached to the tunnel.

Option B, a new tunnel:
1. Create a new tunnel in the dashboard, with the same public hostname and service
   (`http://localhost:3001`).
2. Install it on the server machine with its token, as in section 2 (uninstall the old service first).
3. When the new one is healthy, delete the old tunnel in the dashboard. Its token stops working.

Either way: players see a short break at most. Rotating the tunnel token does not touch the game's
logins, the database or `server/.env`.
