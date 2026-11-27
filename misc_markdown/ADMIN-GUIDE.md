# Admin guide

The operator's daily work, done through the admin panel wherever the panel can do it. Raw SQL is only a
fallback: it skips the checks, the chat side and the admin log.

Related: `BUG-REPORTS.md` (how bug reports work), `OPERATIONS-LOGS-AND-SECRETS.md` (logs, secrets, adding
admins and moderators), `TROUBLESHOOTING.md`, `RUNNING-INFERNO-ONLY.md` (backups, restore, updates).
Commands are run in the `server` folder.

---

## 1. Getting into the panel

- You must be an admin: your username is in `admins` in `server/src/config/InfernoOnlyConfig.ts`
  (`OPERATIONS-LOGS-AND-SECRETS.md`, "Add an admin").
- In the game, press the **Admin** button on your own yard. It opens `/admin` in the browser and signs you
  in with a one-time code (good for 2 minutes). The panel session lasts 12 hours; after that, press Admin
  again. An expired link says so.
- Tabs: **Status**, **Players**, **Reports**, **Bugs**, **Chat**, **Invites**, **Map**, **Health**, **Log**.
- Every change made in the panel is checked on the server and written to the admin log (Log tab, table
  `bym.admin_log`, and the server log as `ADMIN <name>: ...`), with who did it.

## 2. A daily round

1. **Status tab:** players online, server version, published client build. Check that maintenance mode
   is off unless you meant it, and that the announcement is the one you want.
2. **Bugs tab:** new rows since yesterday (section 3). **Feedback tab:** new reports from players (section 3b).
3. **Reports tab:** open cheat-detection rows and attack-violation reports (section 4).
4. **Backups:** a new `bym-<date>.dump` in `server\backups` (or your `BACKUP_DIR`), and no
   `LAST-BACKUP-FAILED.txt` (section 9).
5. **Server log:** start-up warnings and errors (`TROUBLESHOOTING.md`, "Log lines starting with !!!
   SECURITY"):
   ```
   docker compose logs web --since 24h | Select-String "!!!|Unhandled error|Slow request"
   ```
   (Linux: `| grep -E '!!!|Unhandled error|Slow request'`.)

## 3. Bug reports

Reports arrive by themselves: the game sends every error it hits, and the server records its own
failures. Full details: `BUG-REPORTS.md`. What players write themselves (the right-click menu) is in the
**Feedback** tab (section 3b).

In the **Bugs** tab:
1. Look at the Open list. Each row is one problem, with how many times, how many players, the last five
   players' names and the last build that sent it.
2. Compare the row's build with the published build on the Status tab. Rows from older builds may already
   be fixed.
3. Open **details** for the error, the stack and what the player did last. For `Server 500 on ...` rows,
   read the server log around the last-seen time.
4. **mark fixed** once the fix is published. A fixed bug that is reported again reopens by itself.
5. **delete** rows that are not bugs (a dropped connection, someone's scripted test session).

A player's name in a row opens their card, if you need to look at their account.

## 3b. Player feedback (the Feedback tab)

Players right-click anything in the game (or use **Bugs and ideas** in the settings menu on a phone) to
**Report a bug** or **Suggest a change**, with what they right-clicked highlighted and, if they chose, a
screenshot (the highlight is drawn on it) and a picture of their own. Reports from an admin's account are marked
**ADMIN**.

In the **Feedback** tab:
1. Pick what to list: open (new, read, planned), one status, closed, or all; bugs or suggestions; players or
   admins only; or search.
2. Each report has the player's words, what was highlighted, where they were, **screenshot** and **their
   picture** (shown on a click; click the picture for full size), and their last clicks.
3. Set the **status** (new, read, planned, done, not planned), write an **answer** if you want one, and a
   **note** for admins, then **Save**. The player sees the status and the answer under **My reports** in the
   game; a new answer, or planned / done / not planned, shows as new to them.
4. **copy as text** for an issue or a message; **delete** removes it for the player too.

A player can send 6 reports in 10 minutes and 30 a day; a player whose main yard is above level 40, and an admin, has no cap. On the server's computer, `docker compose exec -T web
bun run feedback` in `server` writes the open reports with their pictures to `server\logs\feedback\`.

## 4. Cheat reports and refused attacks

Both are in the **Reports** tab. Nobody is ever banned automatically: you decide.

**Cheat detection.** Each row is something the game itself can never send, checked with room to spare, so
a row means a changed game or forged requests, not bad luck. A row shows the player, the rule that found
it, how many times (and how many of those were refused), the latest proof (with earlier ones under
"earlier"), and first and last time. "what each check is" lists the rules.
- Open / Dismissed: which rows to list.
- **dismiss**: closes the row (it is kept, with who dismissed it).
- The player's name opens their card. The card also shows a "Cheat detection" line for open rows.

By default what a forged request would gain is refused as well as reported (`anticheat.refuse` in
`InfernoOnlyConfig.ts`).

**Attack-violation reports.** Attacks the server refused (a monster it does not know, or stats that
differ from its table), counted per player, with the latest reasons. **dismiss** sets the count back
to 0.

**Deciding.** Read the proof. One odd row can be a player on a very old build; repeated rows of forged
saves or resources are not. Then either dismiss the row, or ban from the player's card (section 5). Take
back what was gained with "Shiny and resources" on the card if needed (section 6).

## 5. Bans and other account actions

Open the player: **Players** tab (filter by name or id; click a column heading to sort), or a name in
any report. The card shows registration, last seen, world, home cell, alliance, Shiny, outposts, refused
attacks, login streak, chat state, any ban reason and open cheat rows.

**Ban.** Write the reason the player will see and press **Ban**. A reason is required.
- At login the player is told `Your account has been banned: <reason>`. A game already open is stopped
  with `Banned: <reason>` at its next request.
- The player is silenced in chat at once.
- Admins cannot be banned from the panel.
- A ban has no end date: it lasts until you press **Unban**. Timed bans are not supported, and neither are
  bans by address or by device.

**Unban.** Press **Unban** on the card. The reason is cleared and chat is allowed again.

**Delete account.** At the bottom of the card. Type the username exactly and give a reason for the log.
It deletes the main yard, outposts and every other yard, their map cells, mail, pets, casino history,
quest book and the account. An alliance the player leads goes to its longest-serving officer (or member),
or is deleted if nobody else is in it. It cannot be undone (only a restore of a backup, which undoes
everything else since then too). Admins and your own account cannot be deleted from the panel.

**Invite rewards.** "Friends invited" shows who joined through the player's link and whether each was
paid. **Bar from invite rewards** (with a reason) stops friends who join through that link from paying
either side, for abuse such as inviting one's own accounts. Shiny already paid stays paid. **Lift** undoes
it.

**Other buttons on the card:**
- **Lift shiny lock**: turns off the player's no-shiny mode (their Shiny shows as 0 while it is on).
- **Move main yard to X, Y**: to free land in the player's own world (not water, not a Moloch
  stronghold, not taken). Their outposts stay where they are.
- **Saved kits**: rename or delete one of the player's three own kits.
- **Name**: rename the player (their own 6-month wait isn't started by it), or **Let them rename now**.
- **Scores**: **Wipe scores** (a reason needed) deletes their Devil's Arcade scores and Hellgate best and
  leaves them off the Brimstone Pit's and Hellgate's boards; **Put back on the boards** undoes the hiding.

## 6. Compensation

On the player's card, **Shiny and resources**:
- **Change shiny by**: a positive number adds, a negative one takes away (never below 0). A note is
  required; the log keeps the before and after.
- **Resources**: amounts to add (or take, with a minus) of bone, coal, sulfur and magma, with a note. Only
  the boxes you fill in change; they are added to what the yard has when the server applies them.
- Both take effect on the player's next yard load. A player who is online should reload.
- They change the main yard only.

Other ways to put something right, on the same card:
- **Login streak**: set the days collected in a row (0-6); today's reward is then still to collect.
- **Quest book**: **Mark done** for a quest that happened before the book counted it (the player still
  collects it), **Not collected**, or **Start again** for the whole book (rewards are paid again when
  collected).
- **Moloch's Gauntlet: Start again**: the player's Gauntlet this month starts over; their yards are healed;
  rewards already paid this month are not paid again.

Not supported: compensation to every player at once (do it player by player, or say so in an
announcement), and sending in-game mail from the panel.

Do not change Shiny or resources with SQL while the server runs: it keeps loaded yards in memory and can
write over the change.

## 7. Chat

On the player's card, **Chat**:
- **Mute for N minutes** (1 minute to 30 days) with a **reason** the player sees (at once if they are in chat,
  and each time they try to talk), and **Unmute**.
- **Make moderator** / **Remove moderator**. A moderator gets a `[Mod]` badge and can delete chat lines and
  mute players for up to a day, never admins or other moderators. Their actions are in the log.

In the game, an admin's chat name menu has **Delete line** (gone for everyone) and **Mute** (up to 30 days
for admins). There is no word filter on this server.

## 8. Announcements and maintenance

Both are on the **Status** tab. Both are kept in Redis, so they survive a server restart.

**Announcement.** A popup every player sees once, on their next yard load or within a few seconds if they
are playing.
- Up to 500 characters (`<` and `>` are removed).
- **Show for** 1 to 336 hours (14 days); after that it is gone by itself.
- **also post in chat**: the text also goes to Global chat as a banner line.
- **Send** replaces any announcement already showing. **Clear** removes it now.

**Maintenance mode.** While it is on, only admins can log in; everyone else is shown your message.
Players already in the game are not thrown out, but within a few seconds their game saves their yard and tells
them, with a Reload button. There is no button to sign everyone out.

**Plan it** instead of switching it on: type the message, a number of minutes and press **Plan**. Players in the
game are warned 15, 5 and 1 minutes before; at the time maintenance mode goes on by itself. **Cancel the plan**
stops it. The Status tab says when it is planned.

A planned update, in order:
1. Announce it a while ahead (with a time), so players can finish what they are doing.
2. Plan maintenance mode 15 minutes ahead with a message ("Back at 18:00 UTC"), or turn it on now.
3. Back up: `backup-db.cmd` (Linux/macOS: `./backup-db.sh`).
4. Update: extract the new files, then `docker compose up --build -d` for the server. The `db-init`
   service runs new migrations before the server starts. Publish the client if it changed:
   `publish-web.cmd` (it stamps the build; open games are asked to reload).
5. Check: `docker compose logs web` shows `Server running on:`, the Status tab shows the new published
   build, and you can play.
6. Turn maintenance mode off, and clear the announcement.

## 9. Backups

The `backup` service backs up the database every day at 4:00 (Chicago time by default) and keeps 14 daily,
8 weekly and 12 monthly copies in `server\backups` (`RUNNING-INFERNO-ONLY.md`, "Backups").

- **Check** daily: the Status tab's **Newest backup** (red when over a day old or when the last one failed;
  with `ALERT_WEBHOOK_URL` set you are also told in Discord), or in the folder: a new `bym-YYYY-MM-DD_HHMM.dump`, and no `LAST-BACKUP-FAILED.txt` in the folder.
  `backup.log` there and `docker compose logs backup` say why one failed (`TROUBLESHOOTING.md`,
  "A backup failed").
- **Back up now** before anything risky (an update, a migration, Docker trouble): `backup-db.cmd`
  (Linux/macOS: `./backup-db.sh`).
- **Keep a copy elsewhere**: set `BACKUP_DIR` in `server\.env` to a synced folder, or copy the folder now
  and then. Backups on the same disk do not survive that disk.
- **Restore**: `restore-db.cmd` lists the backups, `restore-db.cmd <name>` puts one back after you type
  YES (Linux/macOS: `./restore-db.sh`). It backs up the current database first, stops the server, replaces
  the whole database and starts the server again. Everything since that backup is lost for every player.
  Use it for disasters, not to undo one player's problem.
- **Not in a backup**: Redis (chat history, mutes, maintenance mode, the announcement, sessions),
  `server\.env`, the config files, `server\public\docs`, `server\public\assets\kits`, the logs. Keep your
  own copy of `.env` and the kits folder.

## 10. Other tools

- **Moloch's Gauntlet** (Status tab): **Open now** (for the usual number of days from now), **Close now**,
  or **Calendar** (back to the first days of each month).
- **Classified events:** the Status tab and the player card also have switches for a classified event.
  Use them only as its section in `INFERNO-ONLY-NOTES.md` describes.
- **Map tab:** **Inspect a cell** (world, X, Y: terrain, what is stored there, the owner, the tribe and
  level); **Reset this tribe yard** or **Reset every tribe yard** (yards under attack and the players' own
  Gauntlet yards are left); **Worlds** (players per world, Moloch strongholds destroyed).
- **Invites tab:** pending relocation invites between alliance members, with **cancel**.
- **Log tab:** every admin and moderator action, filterable by admin, player, action or text.
- **In the game:** admin **test mode** (the Test switch next to Admin: unlimited resources and instant
  building on your own account, put back as it was when you switch it off) and the **Designer** (edit the
  six kits, the tribe levels and Moloch's bases). See `INFERNO-ONLY-NOTES.md`, "Admin test mode" and "The
  Designer (admins; 27 September)".

## 10b. Since 15 October

- **Players** loads a page of 200 at a time from the server; type to filter, click a heading to sort, **Load more**.
- **Log**: a date range, **Older** for more than 200 rows, **Download CSV**; a player's name opens their card.
- **Bugs**: search, a build filter, sorting, the last 5 reports of each, **copy as issue**. A bug marked fixed
  stays fixed when the report comes from a game older than the build that was published when you marked it.
- **Reports**: a filter by check, a note when you dismiss, **reopen**, and **ban with this proof**.
- **Status**: who is in admin test mode, with **switch off** (their yard is put back).
- **Change Shiny** asks first, showing the Shiny before and after.
- **Status**: **who is online** (the count is the players active in the last 5 minutes); **Panel sessions**:
  everyone signed in to the panel, from where, with **sign out** and **Sign out all others** (each sign-in is in
  the Log as `panel-signin`); **planned maintenance** (section 8); **Newest backup** (section 9).
- **Shiny for many players** (Status): players active in the last N days, everyone, or a list of names or ids;
  **Preview** says how many and who, then **Give** (a note is required; the count must still match, so preview
  again if it changed). Banned players and those who never opened the game are left out.
- **Links**: the address follows the tab (`/admin#Bugs`), and `/admin#Players/123` opens that player's card;
  share or bookmark them.
- **Alerts**: set `ALERT_WEBHOOK_URL` in `server\.env` to a Discord channel's webhook to be told of a new bug,
  a bug back after a fix, a new cheat report, planned maintenance going on, and a failed or late backup (at most
  one of each kind every 10 minutes). Restart the server after setting it.

## 10c. Health, logins, inactive players, chat, kit versions

- **Health tab** (QoL #269): database connections (in use, free, waiting for one), Redis memory (used, peak, its
  limit), the requests found slow in the last hour (still running after 15 seconds: what, whose, how long, and the
  server's state then), and failures (HTTP 5xx) per hour for the last 24 hours. The hourly counts start again when
  the server restarts (the tab says since when); each failure is also in the Bugs tab with its stack.
- **Logins** on a player's card (QoL #246): the last 90 days, each with its result (signed in; signed in and
  signed the other device out; wrong password; refused because banned or in maintenance), browser and address,
  and **Same browser as**: the other accounts that logged in in one of the player's browsers (alts, or a shared
  computer). A browser is known by its own cookie, whatever its network; its very first login has none yet.
  Kept from the day this was installed.
- **Inactive players** (Players tab, QoL #254): players not seen for N days or more (their main yard's last save),
  longest gone first or most recent first, with their outposts. Read only; **open** shows the card.
- **Chat tab** (QoL #256): the chat of the last 30 days at most, searchable by text or name, read only. Alliance
  chats keep every line; each Global room keeps only its last 100 lines, so older Global chat is not there.
- **Outpost kits: earlier versions** (Map tab, QoL #271): every Designer save or reset of a kit first keeps a
  copy of `public\assets\kits\inferno-kits.json`, the last 5, next to it as `.inferno-kits.<UTC time>.json`
  (hidden files: never served to players). **Restore** puts all six kits back as one copy had them and draws their
  pictures again (the file as it is now is copied first). A kit's **Reset** in the Designer is unchanged.
- **Classified events:** the Status tab and the player card also show a second classified event's state, read
  only (see its section in `INFERNO-ONLY-NOTES.md`); its dates come from the config.

## 11. Not supported

Briefly, so you don't look for them:
- timed bans, and bans by address or device;
- signing every player out, or kicking one player out of a game in progress (a ban stops their game at
  its next request);
- Shiny, resources or mail to every player at once;
- player-written bug reports in the game;
- editing a player's yard (buildings, monsters) from the panel;
- switching the Wart Bloom from the panel (it follows its weekly calendar), and acting on many inactive players at
  once;
- undoing a deleted account (other than restoring a whole backup).
