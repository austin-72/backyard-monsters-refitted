# Troubleshooting

Short entries for problems an operator meets. Each one has: Symptom, Likely cause, What to check, Fix.

Run the commands in the `server` folder unless an entry says otherwise. Commands are given for
PowerShell (Windows) and for a Linux/macOS shell where they differ.

Related documents: `RUNNING-INFERNO-ONLY.md` (setup, backups), `OPERATIONS-LOGS-AND-SECRETS.md` (logs,
secrets, admins), `GOING-PUBLIC-CLOUDFLARE.md` (the tunnel), `WEB-CLIENT.md` (the browser client).

---

## 1. Docker says "read-only file system"

**Symptom.** Docker Desktop commands fail, or containers fail to start or write, with a "read-only file
system" error.

**Likely cause.** Docker Desktop (on Windows, its WSL 2 backend) is in a broken state. This is known from
`HANDOFF.md` ("If Docker Desktop breaks").

**What to check.**
```
docker compose ps
docker compose logs --tail 50 web
docker compose logs --tail 50 backup
```
Look in `server\backups` (or your `BACKUP_DIR`) for the newest `bym-YYYY-MM-DD_HHMM.dump`.

**Fix.**
1. Back up first if you still can: `backup-db.cmd` (Linux/macOS: `./backup-db.sh`). If that fails, copy
   the newest `.dump` file from the backups folder to somewhere safe.
2. Quit Docker Desktop.
3. Run `wsl --shutdown`.
4. Start Docker Desktop again, then `docker compose up -d`.
5. Never run `docker compose down -v` or `docker system prune --volumes` to "fix" this. They delete the
   database volume.

---

## 2. Port already in use

**Symptom.** `docker compose up` fails because a port is already allocated, or the server outside Docker
fails to listen.

**Likely cause.** Another program holds one of the ports the stack publishes. The ports, from
`server/docker-compose.yml`:

| Port | What | Setting in `server/.env` |
|---|---|---|
| 3001 | game API (the only one the game needs) | `API_PORT` |
| 3010 | chat WebSocket | `CHAT_WS_PORT` |
| 843 | Flash socket policy | (fixed) |
| 5432 | PostgreSQL, on 127.0.0.1 only | `DB_HOST_PORT` |
| 6379 | Redis, on 127.0.0.1 only | `REDIS_PORT` |
| 8080 | pgAdmin, only with `--profile tools` | `PGADMIN_PORT` |
| 80 | game API, only with `docker-compose.prod.yml` | (fixed in that file) |

The usual case on Windows is a local PostgreSQL or Redis service on 5432 / 6379
(`RUNNING-INFERNO-ONLY.md`, "Port already in use?").

**What to check.**
```
# Windows
netstat -ano | findstr :5432
# Linux
ss -ltnp | grep 5432
```
Repeat for the port the error names.

**Fix.**
- Stop the other program, or move the port in `server\.env`, for example:
  ```
  DB_HOST_PORT=5433
  REDIS_PORT=6380
  ```
  Then `docker compose up --build`. Moving 5432 or 6379 changes nothing for the game.
- If port 843 cannot be taken, the server logs `Could not start socket policy server on port 843` and
  goes on. With the default `chatTransport: "http"` chat does not need 843 or 3010.

---

## 3. HTTP 500 at login

**Symptom.** The login or register screen fails with a server error. Bug reports show
`HTTP 500` on `/api/.../player/getinfo` (login) or `/api/.../player/register`.

**Likely cause.**
- A database migration has not run on this database (the first suspect in `BUG-REPORTS.md`, #3). With
  `ENV=production` the server does not run migrations at start (`server/src/server.ts`).
- The server cannot reach PostgreSQL or Redis. On a lost Redis connection the server exits and Docker
  restarts it (`server/src/utils/redisReconnectGuard.ts`).
- The database pool is exhausted: a request waits at most 30 s for a connection and then fails
  (`server/src/mikro-orm.config.ts`).

**What to check.**
```
docker compose ps
docker compose logs db-init
docker compose logs web --since 30m | Select-String "Unhandled error|Startup failed|migration|Redis"
```
(Linux: replace `Select-String "..."` with `grep -E '...'`.)

Every unhandled error is logged as `Unhandled error on POST /api/...: <error>`
(`server/src/middleware/clientSafeError.ts`). Server 500s also appear in the admin panel's **Bugs** tab
as `Server 500 on ...`, with the stack.

Check the columns from `BUG-REPORTS.md`:
```
docker compose exec db psql -U postgres -d bym -c "SELECT column_name FROM information_schema.columns WHERE table_schema='bym' AND table_name='user' AND column_name IN ('login_streak','login_last_claim','player_kits','ban_reason');"
```
All four must be listed.

**Fix.**
- Missing migrations: `docker compose exec web bun run migration:up` (outside Docker:
  `bun run migration:up` in `server`).
- Database or Redis down: `docker compose up -d`, then check `docker compose ps` again.
- If `db-init` failed with a password error, see "DB password on an existing volume" in
  `OPERATIONS-LOGS-AND-SECRETS.md`.

---

## 4. Cloudflare 524 (timeout)

**Symptom.** A request fails with HTTP 524 after about 100 seconds or more. Bug reports read like
`HTTP 524 on /quests/status (125157 ms)`.

**Likely cause.** The server did not answer within Cloudflare's 100-second limit. The repo's history
(`INFERNO-ONLY-NOTES.md`) traces these to the server or database being stalled (pool connections all
in use, rows locked), not to a route that is slow by design.

**What to check.**
- The server notes every request still running after 15 s
  (`server/src/middleware/slowRequests.ts`):
  ```
  docker compose logs web --since 2h | Select-String "Slow request"
  ```
  Each line shows the database pool (in use, free, waiting), how late the server clock ran, and what
  each database connection was doing.
- The time window of the report:
  ```
  docker compose logs web --since 2026-09-30T10:12:00Z --until 2026-09-30T10:16:00Z
  ```
- Host load: `docker stats` (the `web` container is capped at 2 GB and 4 CPUs, `db` at 1 GB and 1 CPU,
  in `docker-compose.yml`).

**Fix.**
- Find what the slow-request lines say the server waited on, and fix that.
- If the pool is always full, raise `DB_POOL_MAX` in `server/.env` (default 20), then
  `docker compose up -d`.
- See `GOING-PUBLIC-CLOUDFLARE.md`, "The 100-second limit".

---

## 5. HTTP 429 (rate limited)

**Symptom.** Requests fail with HTTP 429.

**Likely cause.** Either the game server's own limiter or Cloudflare.
- The server limits only some routes (`server/src/middleware/rateLimiters.ts`), for example login
  (30 per 5 minutes per address in production), register, chat polling, the map, the admin panel. Its
  429 answers carry a JSON body such as `{"error":"Too many login attempts. Please try again later."}`.
- The server does **not** limit `/base/save`, `/base/load`, `/init` and other everyday calls. A 429 on
  those came from Cloudflare (`INFERNO-ONLY-NOTES.md`, bug reports #75 and #76).

**What to check.**
- Did the server answer it? In production, the request log has every answer:
  ```
  jq -c 'select(.logger == "bymr.http" and .properties.status == 429) | [."@timestamp", .properties.path, .properties.remoteAddr]' logs/bymr.jsonl
  ```
  No line for that path and time means Cloudflare sent it.
- In Cloudflare: **Security > Events** shows which rule answered.

**Fix.**
- From Cloudflare: change or skip the rule that fired for the game's own paths.
- From the server: the limits are in `server/src/middleware/rateLimiters.ts`. Many players behind one
  address share per-address limits (login, register). Changing a limit means editing that file and
  `docker compose up --build -d`.
- If every player seems to share one address in the log, the server is being reached without
  Cloudflare in front. See `GOING-PUBLIC-CLOUDFLARE.md`.

---

## 6. Log lines starting with "!!! SECURITY"

**Symptom.** At start-up the log shows one or both of:
```
!!! SECURITY: SECRET_KEY is missing, short or the default. Anyone can forge logins. Set a long random value in server/.env.
!!! SECURITY: BASE_URL is public but ENV=local. Set ENV=prod in server/.env: local mode is for testing on your own machine.
```

**Likely cause.** `server/src/server.ts` prints these with `console.warn` when:
- `SECRET_KEY` is shorter than 24 characters or is `secret`. With Docker, `secret` is the default when
  `server/.env` has no `SECRET_KEY` (`docker-compose.yml`: `SECRET_KEY=${SECRET_KEY:-secret}`).
- `BASE_URL` does not contain `localhost` or `127.0.0.1` and `ENV` is `local`. Docker's default is
  `ENV=local`.

A related line, `!!! ENV="..." is not a known value. Treating it as "production".`, comes from
`server/src/config/normalizeEnv.ts`.

These lines go to the console only (Docker's log), not to `logs/bymr.jsonl`.

**What to check.**
```
docker compose logs web | Select-String "!!!"
# Linux (single quotes, so the shell does not expand !!)
docker compose logs web | grep '!!!'
```

**Fix.** In `server/.env`:
```
ENV=production
SECRET_KEY=<a long random value, 32+ characters>
```
Then `docker compose up -d` and check the first lines of `docker compose logs web` again. Read
"Secrets" in `OPERATIONS-LOGS-AND-SECRETS.md` before changing `SECRET_KEY` on a live server: it signs
everyone out.

---

## 7. A backup failed

**Symptom.** `LAST-BACKUP-FAILED.txt` is in the backups folder (`server\backups`, or `BACKUP_DIR`), or
`backup-db.cmd` says "The backup did not work".

**Likely cause.** The `backup` service (`server/docker/db-backup.sh`, run by the `backup` service in
`docker-compose.yml`) could not dump or check the database. Common reasons:
- The database or the backup container is not running.
- `DB_PASSWORD` in `server/.env` no longer matches the database (the backup uses it as `PGPASSWORD`).
- The backups folder cannot be written (a wrong `BACKUP_DIR`, a full disk).

**What to check.**
- `backup.log` in the backups folder. Each run is written there; a failure ends with
  `BACKUP FAILED: bym could not be dumped (the lines above say why)`.
- ```
  docker compose ps
  docker compose logs --tail 50 backup
  ```

**Fix.**
- Fix the cause shown in `backup.log`, then `docker compose up -d`.
- Make a backup now to confirm: `backup-db.cmd` (Linux/macOS: `./backup-db.sh`). A good backup removes
  `LAST-BACKUP-FAILED.txt` and logs `backup ok: <file> (<size>)`.
- After changing `BACKUP_*` settings or `TZ` in `server/.env`, run `docker compose up -d`.

---

## 8. "/web/ not found"

**Symptom.** `http://<server>/web/` answers "Not Found", or the front page does not open the game.

**Likely cause.** The browser client is not published, or the server does not serve the folder.
The server lists the top-level folders of `server/public` once, at start-up
(`server/src/utils/staticPaths.ts`), and serves only those.

**What to check.** (from `WEB-CLIENT.md`, "Troubleshooting: `/web/` says Not Found")
1. Does `server\public\web\index.html` exist? If not, `publish-web` failed.
2. With Docker, does the container see it?
   ```
   docker compose exec web ls /app/public/web
   ```
3. Is there a trailing slash? `http://localhost:3001/web/` works, `/web` does not.
4. Compare build stamps, from `client-web`:
   ```
   npm run check
   ```
   (`CHECK_URL=https://your.host` checks another server.)

**Fix.**
- Publish again from a terminal so its messages stay visible: `publish-web.cmd` (Linux/macOS:
  `./publish-web.sh`).
- Without Docker: restart the server once after the first publish.
- With Docker: if the container was made before `docker-compose.yml` bound `./public/web`, run
  `docker compose up -d` once to re-create it.
- If you build on one machine and serve from another, copy `server/public/web` to the server machine.
