# Bug reports: status

Automatic bug reports from players' games (admin panel `/admin/` → **Bugs**; reporter
`client/scripts/com/monsters/debug/IoBugReport.as`, server `server/src/services/admin/bugReports.ts`).
State as of 2026-09-24 (second pass). Read `HANDOFF.md` first.

- Most players run the **browser client** (`client-web/`, stack traces with `/web/game.<hash>.js`,
  `src/game/...`, `src/flash/...`). It is part of this project now.
- Builds seen: `202609231843`, `202609232236`, `202609240806`, `202609240830`, `202609241336`. Fixes reach
  players only once a newer client is published (BYMR - Release).
- Reports come from **two addresses**, `inferno-mr2.maproom2.com` and `inferno.maproom2.com`. Local data (saved
  accounts, login) is per address in Flash and in browsers.

## Status

| # | Problem | Status |
|---|---|---|
| 1 | HTTP 401 Unauthorized | Not a bug. Delete. |
| 2 | Yard Planner #2006 (`addChildAt`) | Fixed in AS3 (`addChild`); the browser runtime now also accepts it. |
| 3 | HTTP 500 at login (21×, 1 player, build 202609240830) | **Open: needs the server log.** See below. |
| 4 | Music: `stop` time out of range | Fixed (music re-looped on SOUND_COMPLETE). |
| 5 | #1009 with no stack | Not diagnosable. Watch for a repeat. |
| 6 | HTTP 409 at login | Not a bug (wrong password). Delete. |
| 7 | Map popup #2025 removeChild | Fixed. |
| 8, 9 | `_musicChannel` / soundTransform null | Fixed with #4. |
| 10, 11 | `MapRoomCell.Check` / Dirty Cell | Fixed (deep copy of `serverData.m`). |
| 12 | Load Error after 409 | Not a bug. Delete. **No longer reported** (the line names the status; 4xx skipped). |
| 13 | HALT: new version published | Not a bug. Delete. **No longer reported** (quiet stop; server drops it from old clients too). |
| 14 | HTTP 502 | Not a bug (deploy). Delete. **No longer reported** (502/503/504 skipped). |
| 15 | Full screen #1006 in `goFullScreen` | **Fixed in the browser runtime** (`client-web/src/player/Player.ts`): iPhone Safari has no element full-screen API and the runtime called it anyway. Now: nothing happens, the page explains Add to Home Screen; a refused request goes back to normal instead of claiming full screen. |
| 16 | Chat `onLogin() false: 'null'` | Same cause as #19 (a login no longer valid); after #19 the game stops with a clear message. Left as is. |
| 17 | `TimeHax` | **Fixed:** a phone locked or switched away for 5+ minutes. The stop stays (the yard may have changed on the server), but now says why, its Reload button works and logs back in, and it is not reported. |
| 18 | `Message.detectFS` tBody undefined | **Fixed in AS3:** the message window's warning clip has a static text, no `tBody` (in the original SWF, so Flash crashed too). Guarded. |
| 19 | `updatesaved` 401 mid-game | **Fixed:** "You were logged out: this account was logged in somewhere else, or the login expired." Reload opens the login page. Before: "Base.Page: Could not authenticate" and a Reload button that did nothing. |

| 26 | Chat `onLogin() false: 'null'` (build 202609250803) | **Fixed:** the line now gives the chat server's reason; the expected ones (a login no longer valid) are not reported. |
| 27 | HTTP 500 `/base/save` in a wild monster attack (build 202609251802, 2 players) | **Fixed (server):** the yard attacked was rebuilt, and its row deleted, by the attacker's own poll when the yard had not been attacked for 12 hours; the next save found no yard. Details in INFERNO-ONLY-NOTES "Bug reports and review, 25 September (second round)". From now on every server 500 shows up in the Bugs tab itself, as "Server 500 on ...", with the stack. |
| 42, 43 | `costs[_lvl.Get()]` undefined in `BuildingOverlay.Update`, view mode (build 202609271914) | **Fixed:** a building being built is timed by its first cost; a Map Room under construction threw (INFERNO-ONLY-NOTES "Bug reports, 29 September"). |
| 44, 46 | No answer from the server (`updatesaved` 91 s, Android; `getinfo` 5 s, iPhone) | Not a bug (connection dropped). Delete. |
| 45 | HALT purchase problem (ClaudeBot, `localhost`) | Not a player's: a scripted session on someone's own machine. Delete. |
| 47 | `Scroll`: null (reading 'x'), 100×, build 202609281823 | **Fixed:** two base loads in flight left a map listening; only the latest load builds now, and Scroll ignores a map not on screen. |
| 49 | `getarea` refused for x=-320 y=-90 (a zone outside the world) | **Fixed:** the server answers a zone outside the world with no cells; the map no longer asks for one. |
| 50, 52, 55, 59 | No answer from the server (`updatesaved` 252 s and `save` 19 s on Android, `casino/ascent/state` 36 ms, `/init` 1 s) | Connection dropped (a phone asleep, a tab put away). **No longer reported** (written as "log"; saves and polls go again, five failed saves in a row still stop the game and are reported). `/init` now tries three more times, two seconds apart, before "Failed to connect to the server." Delete. |
| 51 | HTTP 524 on `/base/save`, 125 s, in a wild monster attack | Cloudflare gave up waiting for the server (100 s). One save, one player; the save code has nothing that waits that long, so the server was stalled (database or host). **Open: look at the server log for 2026-09-30 10:13-10:15 UTC** (5:13-5:15 AM Chicago; `docker compose logs web --since 2026-09-30T10:12:00Z --until 2026-09-30T10:16:00Z`; the request log has each request's time). The game went on (a failed save is tried again). |
| 53 | "Base ID 1029 outpost w TH bdg" (ClaudeBot) | **Fixed:** the main yard, loaded after outposts with no yard kind given, kept the outpost's kind and stopped. The player's own yard now takes the kind the server's answer gives (`type` main/outpost). |
| 54 | HALT "You do not have permission" (ClaudeBot), an `ibuild` load | **Fixed:** a stock way back to the separate Inferno yard (none in Inferno-only) was taken after an attack; the load was refused and halted. Every such load now goes home (`BASE.LoadBase`), with a "log" line saying where it came from. |
| 56, 58 | `_UI_BOTTOM._mc` null in `UI_BOTTOM.Update` (#1009 in #58), Android, after logging in or registering twice | **Fixed:** the bottom bar is guarded (delivered with the overnight bug hunt; build 202609302347 predates it), and now a login or registration clicked twice is sent once (two logins loaded two yards at once). |
| 57 | `MAP._EFFECTS` null in `EFFECTS.SplatParticle` | **Fixed:** a monster's death splat after its yard's layers were taken down does nothing. |

After publishing the next client: mark **2, 4, 7, 8, 9, 10, 11, 15, 17, 18, 19** fixed (a fixed bug reopens by
itself when it comes back). Delete **1, 6, 12, 13, 14**. #16 can be deleted too.

Also fixed along the way: the **Oops window's Reload button** did nothing in the projector or the browser (it
called the old Facebook page). It now reloads the game, still logged in.

Note: the server now leaves the site address out of the fingerprint, so reports containing a URL start new
rows once the server is deployed. The old rows stay until deleted.

## #3 HTTP 500 at login: what is needed

Happens before a yard loads (mode null): `/api/v1.7.3-beta/player/getinfo`, `/player/register` or the first base
load. Report time 18:36:20 UTC on 2026-09-24 (13:36 Chicago). Needed:

```
docker compose logs web --since 2026-09-24T18:30:00Z --until 2026-09-24T18:40:00Z
```

(in `server/`; or `server/logs`). The server logs every unhandled error as
`Unhandled error on POST /api/... : <error>`. First suspect: a migration missing on the live database. Check:

```sql
SELECT column_name FROM information_schema.columns WHERE table_schema='bym' AND table_name='user'
  AND column_name IN ('login_streak','login_last_claim','player_kits','ban_reason');
```

All four must be listed. If not, run `docker compose exec web bun run migration:up`.

## Tests

`client-web/tools/test/stops-test.mjs` (phone emulation, against a local server) checks #15, #17, #18, #19 and
the Reload buttons; all 13 checks pass. Not tested on a real iPhone or in the Flash projector.

## Player reports (2026-09-24, afternoon)

| Report | Status |
|---|---|
| Sound effects disappear completely in the browser | **Fixed (browser runtime):** the button click sound is built into the game and was never loaded; every click kept one of the 32 sound channels, so after about 32 clicks no sound effect could start. It loads now, and a sound that can't load no longer holds channels. |
| Music switched off comes back when the song loops | **Fixed (AS3, `SOUNDS.replayMusic`):** the replay used the default volume instead of the music setting. |
| Yard Planner slow on mobile, worst moving several buildings | **Fixed (AS3):** the yard behind the planner was redrawn every frame, forcing the whole planner to redraw; a group move ran a pixel overlap test against every building on every pointer move. At a quarter CPU with 220 walls: open planner 4 → 23 fps, dragging 60 walls 1.3 → 11-17 fps. |
| Closing the chat sometimes breaks clicks on buildings | **Not reproduced.** Tried: X to close and reopen, arrow to enlarge/shrink, X while enlarged, all with mouse and phone touch, with the chat's text field focused. The closed chat only takes clicks on its title bar. Needs details: device/browser, which button closed it, what a click on a building then does. Tried again 1 October: closed with its X while another player posted lines, then real clicks on every building in view and on the area the chat covered (and just above the open chat, where its scrolled-out lines are): every click reached the yard. |
