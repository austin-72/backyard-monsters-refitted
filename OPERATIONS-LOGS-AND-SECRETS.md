# Operations: logs, secrets, admins and moderators

Run the commands in the `server` folder. With Docker, database commands go through
`docker compose exec db psql -U postgres -d bym -c "..."` (use your `DB_USER` and `DB_NAME` if you
changed them).

---

## 1. Reading the logs

### Where the log goes

What gets written depends on `ENV` (`server/src/utils/logger.ts`). `ENV` is normalised to `local` or
`production` at start (`server/src/config/normalizeEnv.ts`). Docker's default is `ENV=local`.

| | `ENV=local` | `ENV=production` |
|---|---|---|
| Console | pretty text, with each record's properties | pretty text, one line per record, no properties |
| File | none | `server/logs/bymr.jsonl`, JSON Lines |
| Request log (one line per request) | off | on |
| Database queries printed | yes | no (`server/src/mikro-orm.config.ts`, `debug`) |
| Request bodies printed | yes, for most game routes, with password and token fields hidden (`server/src/middleware/logRequest.ts`) | no |

**In Docker.**
- The console goes to Docker's log. Read it with `docker compose logs web`. Docker keeps 10 files of
  20 MB (`docker-compose.yml`, `logging`).
- The file is written inside the container to `/app/logs/bymr.jsonl`. The folder is bound to
  `server/logs` on the host, so it survives rebuilds.
- The backup service has its own log: `docker compose logs backup`, and `backup.log` in the backups
  folder.

**Outside Docker.**
- The console is wherever you started the server. With PM2 (`server/ecosystem.config.mjs`, app name
  `bymr-server`): `pm2 logs`.
- The file is `server/logs/bymr.jsonl`, found from the code's own location, not the working folder.

**Rotation of the file.** At 100 MB it rotates and keeps 9 old copies, `bymr.jsonl.1` to
`bymr.jsonl.9`: about 1 GB in all.

### Format of `bymr.jsonl`

One JSON object per line (LogTape's JSON Lines formatter, with `message: "template"`):
```json
{"@timestamp":"2026-10-01T10:13:20.000Z","level":"INFO","message":"User {username} logged in | ID: {userid} | IP: {ip}","logger":"bymr","properties":{"username":"...","userid":1,"ip":"..."}}
```
- `@timestamp`: UTC, ISO 8601.
- `level`: `DEBUG`, `INFO`, `WARN`, `ERROR` or `FATAL`.
- `message`: the message **template**. Values written as `{name}` are in `properties`. Many messages
  are already complete strings.
- `logger`: `bymr` for the server, `bymr.http` for the request log, `bymr.admin-claim` and others for
  scripts.
- `properties`: the values. Request lines have `method`, `url`, `path`, `status`, `responseTime`,
  `contentLength`, `remoteAddr`. Records made during a request should also carry `requestId`,
  `remoteAddr` and `userAgent` (`server/src/middleware/requestLogging.ts`).

The request log skips `/assets/...`, `/connection`, and `/chat/poll` answers below 400.

**Not in the file:** lines the code prints with `console` instead of the logger. These include the
`!!! SECURITY` and `!!! ENV=` warnings, `Server running on: ...`, and `ErrorInterceptor error: ...`.
Read those in `docker compose logs web` (or `pm2 logs`).

The log holds personal data: emails and IP addresses (login and register lines). Share extracts, not
the whole file.

### Useful commands

Docker's log, for a time window or a search:
```
docker compose logs web --since 2026-09-30T10:12:00Z --until 2026-09-30T10:16:00Z
docker compose logs web --since 1h | Select-String "Unhandled error"
# Linux
docker compose logs web --since 1h | grep 'Unhandled error'
```

`jq` on the file (in `server`; on Windows install `jq` first, or use the `grep` forms):
```
# errors and fatal records
jq -c 'select(.level == "ERROR" or .level == "FATAL")' logs/bymr.jsonl

# requests that ended in 5xx
jq -c 'select(.logger == "bymr.http" and .properties.status >= 500) | [."@timestamp", .properties.method, .properties.path, .properties.status, .properties.responseTime]' logs/bymr.jsonl

# requests the server answered with 429
jq -c 'select(.logger == "bymr.http" and .properties.status == 429) | [."@timestamp", .properties.path, .properties.remoteAddr]' logs/bymr.jsonl

# slow requests (still running after 15 s)
jq -r 'select(.message | startswith("Slow request")) | ."@timestamp" + " " + .message' logs/bymr.jsonl

# unhandled errors, with their values
jq -c 'select(.message | startswith("Unhandled error")) | {t: ."@timestamp", p: .properties}' logs/bymr.jsonl

# a time window (timestamps are UTC and compare as text)
jq -c 'select(."@timestamp" >= "2026-09-30T10:12" and ."@timestamp" < "2026-09-30T10:16")' logs/bymr.jsonl

# one player's logins
jq -c 'select(.properties.event == "login" and .properties.username == "NAME")' logs/bymr.jsonl

# admin actions
jq -r 'select(.message | startswith("ADMIN ")) | ."@timestamp" + " " + .message' logs/bymr.jsonl
```
Older records are in the rotated files: run the same command on `logs/bymr.jsonl.1` and so on.

`grep` works too, because the JSON has no spaces:
```
grep '"level":"ERROR"' logs/bymr.jsonl
grep 'Slow request' logs/bymr.jsonl
```

### Lines that matter

| Line (start of the message) | Meaning | Source |
|---|---|---|
| `!!! SECURITY: ...` | `SECRET_KEY` is weak, or a public `BASE_URL` runs with `ENV=local`. Fix before players come. | `server/src/server.ts` |
| `!!! ENV="..." is not a known value` | A typo in `ENV`; it is treated as production. | `server/src/config/normalizeEnv.ts` |
| `Server running on: ...` | Start-up finished. | `server/src/server.ts` |
| `Startup failed: ...` | The server stopped at start (database, Redis, config). | `server/src/server.ts` |
| `Database migration failure: ...` | Migrations at start failed (not run at all with `ENV=production`). | `server/src/server.ts` |
| `Redis disconnected: ...` / `Redis reconnected, exiting ...` | Redis was lost. The server exits on reconnect so it restarts clean. | `server/src/server.ts`, `server/src/utils/redisReconnectGuard.ts` |
| `Unhandled error on <method> <path>: ...` | A server 500. Also in the admin panel's Bugs tab. | `server/src/middleware/clientSafeError.ts` |
| `Slow request: ...` / `Slow request ended: ...` | A request ran over 15 s; why, and how it ended. Look here for 524s. | `server/src/middleware/slowRequests.ts` |
| `JWT verification failed: ...` | A login token was refused. Many of them right after a `SECRET_KEY` change is expected. | `server/src/middleware/auth.ts` |
| `Token refused: ... made in another browser` | A token was used from another browser. | `server/src/middleware/auth.ts` |
| `Admin "NAME" is account #N.` / `Admin name "NAME" is not an account yet ...` / `Not admins ...` | Start-up check of the configured admins. | `server/src/services/admin/admin.ts` |
| `ADMIN NAME: <action> ...` | An admin or moderator action (also in `bym.admin_log`). | `server/src/services/admin/admin.ts` |
| `Attack refused for '...'` | An attack the server would not accept. | `server/src/services/base/reportManager.ts` |
| `Published browser client build: N.` / `Current client build: N. ...` | The web client the server serves. | `server/src/services/clientBuild.ts` |
| `Could not start socket policy server on port 843` | Port 843 is taken. Harmless with HTTP chat. | `server/src/chat/chatServer.ts` |

---

## 2. Secrets

All of these live in **`server/.env`**. Docker reads that file twice: to fill in
`docker-compose.yml` (the `${...}` values) and as `env_file` for the `web` service. The keys listed under
`environment:` in the compose file win. `.env` is kept out of git (`.gitignore`) and out of the image
(`server/.dockerignore`). `server/example.env` is the template. `bun run db:init` makes a `.env` from it,
with a random `SECRET_KEY`, when there is none (`server/src/scripts/build-env.mjs`).

After any change to `server/.env`: `docker compose up -d` (Docker re-creates the containers whose
settings changed). Outside Docker: restart the server.

### SECRET_KEY

- **Used for:** signing and checking every login token (`server/src/controllers/auth/login.ts`,
  `server/src/middleware/auth.ts`), and the 20-minute password reset tokens
  (`server/src/controllers/auth/forgotPassword.ts`).
- **Default:** with Docker, `secret` when `.env` has none. That makes the server print
  `!!! SECURITY` at start and lets anyone forge a login.
- **Rotate:** put a new long random value in `server/.env`, for example the 64 hex characters of
  `openssl rand -hex 32` (this is the length `build-env.mjs` makes). Then `docker compose up -d`.
- **What rotating breaks:**
  - Every player is signed out. Their game shows the login page. Expect a wave of
    `JWT verification failed` lines.
  - Password reset links already sent stop working.
  - Not affected: saved logins on the login page (random secrets kept as hashes in `bym.user_login`,
    `server/src/services/user/savedLogins.ts`), admin panel sessions and chat tokens (random values in
    Redis). Players with a saved login can pick their name and sign in again without the password.

### DB_PASSWORD (and DB_USER, DB_NAME)

- **Used by:** the server, `db-init` (migrations), the `backup` service (`PGPASSWORD`), and the
  `db` container itself (`POSTGRES_PASSWORD`), all in `docker-compose.yml`. The default is `dev12345`.
- **On an existing volume:** the database password is set when the `db` volume is first created.
  Changing `DB_PASSWORD` in `.env` later does **not** change it in the database (the official
  postgres image only uses `POSTGRES_PASSWORD` when it creates a new database folder). The result:
  `db-init` fails, so `web` does not start, and backups fail with `LAST-BACKUP-FAILED.txt`.
- **Rotate, in this order:**
  1. Back up: `backup-db.cmd` (Linux/macOS: `./backup-db.sh`).
  2. Change it in the database:
     ```
     docker compose exec db psql -U postgres -d bym -c "ALTER USER postgres PASSWORD 'NEW_PASSWORD';"
     ```
  3. Put the same value in `server/.env` as `DB_PASSWORD=NEW_PASSWORD`.
  4. `docker compose up -d`.
  5. Check: `docker compose logs web` shows `Server running on:`, and `backup-db.cmd` works.
- **What rotating breaks:** nothing for players. A saved connection in pgAdmin needs the new password.
- Never use `docker compose down -v` to get past a password problem: it deletes the database.

### Redis

- No password. It is bound to `127.0.0.1` in `docker-compose.yml`, and `docker-compose.prod.yml`
  removes its host port. Inside Docker the server always uses `REDIS_URL=redis://redis:6379`.
- Keep it that way: Redis holds login sessions (with a copy in Postgres), admin panel sessions, mutes,
  maintenance mode and chat history.

### DISCORD_TOKEN

- **Used for:** fetching Discord avatars (`server/src/services/discord/fetchDiscordAvatar.ts`), only
  with `ENV=production` and Discord required. This fork's default is `requireDiscord: false`
  (`server/src/config/InfernoOnlyConfig.ts`), so it is normally unused.
- **Rotate:** make a new token in Discord's developer portal, put it in `.env`, `docker compose up -d`.
- **What rotating breaks:** nothing for players.

### SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (and WEB_URL)

- **Used for:** "forgot password" emails (`server/src/config/MailConfig.ts`,
  `server/src/controllers/auth/forgotPassword.ts`). `WEB_URL` is the start of the reset link in the
  email. `example.env` sets it to a placeholder, `https://your-domain.example`: set it to your own site
  before turning email on.
- **Rotate:** change the password at your mail provider, then in `.env`, then `docker compose up -d`.
- **What rotating breaks:** reset emails fail between the two changes.

### API consumer keys

- Keys for outside apps that read the map's bulk data, in `bym.api_consumer` (only a hash is kept).
  They are checked only when `ENV` is not `local` (`server/src/middleware/apiConsumer.ts`).
- **Manage** (`server/src/scripts/api-consumers.ts`; with Docker prefix `docker compose exec web`):
  ```
  bun run consumer:create <name>    prints the new key once
  bun run consumer:list
  bun run consumer:revoke <id>
  ```
- **Rotate:** create a second key under the same name, hand it over, revoke the old one when they have
  switched. Revoking stops the old key at its next request.

### PGADMIN_EMAIL, PGADMIN_PASSWORD

- pgAdmin's login, only used with `docker compose --profile tools up`. Compose defaults are
  `admin@admin.com` / `admin`.
- pgAdmin keeps its own data in the `pgadmin` volume. Whether a new password in `.env` reaches an
  existing pgAdmin volume should be checked in pgAdmin's documentation.
- Do not run it on a public machine (see `GOING-PUBLIC-CLOUDFLARE.md`, section 5).

### Cloudflare tunnel token

- Not used by the game server. It lives in the `cloudflared` service on the machine that runs the
  tunnel. See `GOING-PUBLIC-CLOUDFLARE.md` to rotate it.

### Settings that are not secret but change who stays signed in

| Variable | Default | Effect |
|---|---|---|
| `SESSION_LIFETIME` | `30d` | How long a login token lasts. |
| `SESSION_BIND_DEVICE` | on (`0` turns it off) | A token works only in the browser it was made in. |
| `SAVED_LOGIN_DAYS` | `14` | Saved logins expire this many days after their last use. |
| `ENV` | `local` in Docker | Use `production` for a public server. |

---

## 3. Admins and moderators

### How roles are stored and checked

- **Admins are not stored in the database.** An admin is an account whose username is in `admins` in
  `server/src/config/InfernoOnlyConfig.ts` (default `["admintester"]`). The match is exact, capitals
  included. It is checked on every request (`isAdmin` in `server/src/services/admin/admin.ts`).
- Admin names are reserved: nobody can register or rename to one from the game, in any capitals.
- **Moderators** are stored in the database: the column `chat_mod` (boolean, default `false`) on the
  table `bym."user"`, added by migration `20261005_AddChatModerators`. A moderator gets a `[Mod]`
  badge in chat, can delete chat lines and mute players for up to a day, and cannot act on admins or
  other moderators (`server/src/chat/chatModeration.ts`).
- Every admin and moderator action is written to `bym.admin_log` and to the server log as
  `ADMIN <name>: ...`.

The config file is copied into the Docker image, so a change to it needs `docker compose up --build -d`
(`RUNNING-INFERNO-ONLY.md`). Outside Docker, restart the server.

### Add an admin

1. Add the name to `admins` in `server/src/config/InfernoOnlyConfig.ts`, exactly as it should be:
   ```ts
   admins: ["admintester", "NewAdminName"] as string[],
   ```
2. Rebuild and start: `docker compose up --build -d`.
3. Check the start-up log: `docker compose logs web | Select-String "Admin"` (Linux:
   `| grep Admin`).
   - `Admin "NewAdminName" is account #N.` means an account already has that exact name, and **that
     account is an admin now**. Make sure it is the right person's.
   - `Admin name "NewAdminName" is not an account yet` means go to step 4.
4. The person registers in the game under any name. Then give that account the admin name
   (`server/src/scripts/admin-claim.ts`):
   ```
   docker compose exec web bun run admin:claim <their current username or user id> NewAdminName
   ```
   Outside Docker: `bun run admin:claim <account> NewAdminName`. The account, its yards and an alliance
   it leads are renamed. No restart is needed; it applies at the account's next request.
5. The new admin opens the panel with the **Admin** button in the game (it signs the browser in to
   `/admin` with a one-time code).

### Remove an admin

1. Take the name out of `admins` in `server/src/config/InfernoOnlyConfig.ts`.
2. `docker compose up --build -d`.
3. From the next request, the account is a normal player. Its admin panel session stops working,
   because the panel checks `isAdmin` again (`sessionAdmin` in `server/src/services/admin/admin.ts`).
4. The account keeps the name, and the name is no longer reserved. If you put the name back in the
   config later, that account is an admin again.

To review what an admin did:
```
docker compose exec db psql -U postgres -d bym -c "select at, admin_name, action, target_name, details from bym.admin_log order by at desc limit 50;"
```

### Add or remove a moderator

**Preferred: the admin panel.** Open the player in the panel. The row "Chat moderator" has
**Make moderator** or **Remove moderator**. This also tells the chat server at once
(`chatMod` in `server/src/controllers/admin/adminApi.ts`), so the player's badge and powers change
while they are online, and it is written to the admin log.

**By SQL**, if the panel is not available (the migration `20261005_AddChatModerators` must have run):
```
# add
docker compose exec db psql -U postgres -d bym -c "UPDATE bym.\"user\" SET chat_mod = true WHERE username = 'NAME';"
# remove
docker compose exec db psql -U postgres -d bym -c "UPDATE bym.\"user\" SET chat_mod = false WHERE username = 'NAME';"
# list
docker compose exec db psql -U postgres -d bym -c "SELECT userid, username FROM bym.\"user\" WHERE chat_mod = true ORDER BY username;"
```
In PowerShell the `\"` inside the double quotes may need different quoting; the commands in
`RUNNING-INFERNO-ONLY.md` ("To ban or unban by hand") use the same form.

Limits of the SQL way:
- Chat reads the role when the player's chat signs in (`server/src/chat/chatIdentity.ts`). A player
  already in chat keeps the old role until their chat connects again (for example, they reload the
  game). This matters most when **removing** a moderator: use the panel for that, or make sure they
  reload.
- The change is not written to `bym.admin_log`.
