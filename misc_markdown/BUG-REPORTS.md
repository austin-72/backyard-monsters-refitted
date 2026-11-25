# Bug reports

How bug reports reach the operator, and how to work through them. The day-to-day steps are also in
`ADMIN-GUIDE.md`, "Bug reports".

(This file used to be a status list of the reports of 24 September to 1 October. Those reports and their
fixes are in `INFERNO-ONLY-NOTES.md`, in the sections whose headings start with "Bug reports" and
"Bug hunt"; `NOTES-INDEX.md` lists them. The two that were still open are at the end of this file.)

## Where reports come from

**The game sends them by itself.** Every error the game logs, uncaught errors included, is sent quietly to
the server (`POST /bugreport`). Players see nothing and press nothing.

**Players can also write one.** Since 25 November a right-click anywhere in the game (or **Bugs and ideas** in
the settings menu) has **Report a bug** and **Suggest a change**: their words, what they highlighted, and a
screenshot if they want. Those are kept apart, one row each, in the admin panel's **Feedback** tab
(`ADMIN-GUIDE.md`, section 3b; `server/src/services/feedback/playerFeedback.ts`).

- Client: `client-web/src/game/com/monsters/debug/IoBugReport.ts` (hooked into `LOGGER`).
- Server: `server/src/controllers/debug/reportBug.ts` and `server/src/services/admin/bugReports.ts`.
- Stored in table `bym.bug_report`.

Limits per game session: the same error at most 3 times, 40 reports in all, at least 2 seconds apart. The
route is rate limited to 120 requests a minute per address.

Not sent, or dropped by the server, because they are answers and not bugs:
- HTTP 4xx answers (a login that expired, a wrong password, a name already taken, ...) and the
  "Load Error" and save lines that follow them;
- HTTP 502, 503 and 504 (the server or its proxy restarting during a deploy);
- the notice that a newer client was published.

**The server reports its own failures.** Every unhandled server error is recorded as
`Server 500 on <method> <path>: <error>`, with the server's stack and the request's short field values
(never passwords, tokens or emails) (`server/src/middleware/clientSafeError.ts`). The answer carries a
reference; when the game then reports the same failure (`[ref 1a2b3c4d]` in its message), what the game
saw is added to the server's row instead of making a second one. A request that failed slowly gets the
server's notes on what it waited for (`server/src/middleware/slowRequests.ts`).

## What a report holds

Identical problems are grouped into one row, by a fingerprint of the first line and the first stack frame
with numbers, ids and the site's address taken out. Each row shows:
- the title (the first line), how many times it happened and to how many players, and the names of the
  last five;
- the last client build that sent it (`server` for the server's own reports);
- first and last seen;
- under **details**: the error, and the context of the latest one: the account, the browser (from its
  User-Agent), where the player was (mode, yard, map cell, popup, screen size, minutes running), their last
  clicks, the last popups and yards, the last server requests, and the last log lines.

## The Bugs tab in the admin panel

Open the panel with the **Admin** button in the game, then the **Bugs** tab.

| Control | What it does |
|---|---|
| Open / Fixed | Which rows to list (200 at most, the most recent first). |
| mark fixed | Moves the row to Fixed. If the same problem is reported again, the row reopens by itself and the server logs `Bug #N reported again after being marked fixed`. |
| reopen | Moves a fixed row back to Open. |
| delete | Deletes the row. If the problem happens again, it starts a new row. |
| a player's name | Opens that player's card. |

Every change is written to the admin log (Log tab). The server log also has a line for each new row:
`New bug reported by the game: ...`.

## Working through them

1. Compare the row's build with **Published client build** on the Status tab. A row whose last build is
   older than the published one may already be fixed: wait and see if it comes back from the new build.
2. Read the details: the first line, the stack (`/web/game.<hash>.js`, `src/game/...`, `src/flash/...` for
   the game; the server stack for `Server 500`), and what the player did last.
3. For a server failure, read the server log around the row's last-seen time:
   ```
   docker compose logs web --since 2026-10-15T10:12:00Z --until 2026-10-15T10:16:00Z
   ```
   (UTC; `OPERATIONS-LOGS-AND-SECRETS.md` has more log commands.) `HTTP 524` rows are Cloudflare's
   100-second limit: `TROUBLESHOOTING.md`, "Cloudflare 524".
4. Mark a row fixed only once the fix is published (a new client with `publish-web`, or the server updated
   with `docker compose up --build -d`). If it comes back, it reopens.
5. Delete rows that are not bugs: a connection that dropped (a phone asleep, a tab put away), a scripted
   session on someone's own machine.

## Older reports still open

- **#3, HTTP 500 at login (24 September, 21 times, one player).** It happened before a yard loaded. The
  first suspect was a migration missing on the live database. Check the columns:
  ```
  docker compose exec db psql -U postgres -d bym -c "SELECT column_name FROM information_schema.columns WHERE table_schema='bym' AND table_name='user' AND column_name IN ('login_streak','login_last_claim','player_kits','ban_reason');"
  ```
  All four must be listed; if not, `docker compose exec web bun run migration:up`. The server log of
  2026-09-24 18:30-18:40 UTC would say more. (`TROUBLESHOOTING.md`, "HTTP 500 at login".)
- **#51, HTTP 524 on `/base/save` (30 September, one save, one player).** Cloudflare stopped waiting after
  100 seconds; the server was stalled. The log of 2026-09-30 10:13-10:15 UTC would say why. Since then, a
  request gives up within 30 seconds of waiting on the database and slow requests are logged
  (`GOING-PUBLIC-CLOUDFLARE.md`, "The 100-second limit").
