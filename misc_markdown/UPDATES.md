# Updating the game

How to put out an update to the running world: the game, the server, the Change Log, the notes and GitHub.
Everything here keeps the players' data. For a first launch or a fresh world, see `RELEASE-CHECKLIST.md`.

All commands are run on the server's computer. Paths are from the project folder, `D:\@bymr-inferno-mr2`.

**In short:** test, write the Change Log and the notes, then run `publish-web.cmd`. It backs the database up,
updates the server, publishes the game and publishes the project to GitHub, in that order, and stops at the
first step that fails.

## 1. Test it

- Run `watch-web.cmd` and open `/web-dev/?watch=1` on the site. It rebuilds on every change. Players never
  see `/web-dev/`.
- Server changes: `bunx tsc --noEmit` in `server\` (or `bun run typecheck`) should report nothing.
- Try the thing you changed, as a player, before going further.

## 2. Warn the players (server changes only)

In the game: **Admin** > **Status** > plan maintenance about 15 minutes ahead, with a message that says when
the game is back. Players are warned at 15, 5 and 1 minutes; their yards are saved when it starts. Run
`publish-web.cmd` once maintenance has started.

A game-only update doesn't need it: the server restart in `publish-web.cmd` is a short break, and open games
are simply asked to reload.

## 3. Write the Change Log

Players read it in the game (the **Changelog** button) and at `/changes`. Every change a player can notice
goes in, including fixes. Changes only admins see (the panel, test tools, internal work) stay out.

The file is `server\public\docs\changelog.json`. Add to the top of `entries`, and set `updated` to the same date:

```json
{
  "date": "2026-11-11",
  "headline": "A few words on the day's main changes",
  "items": [
    {
      "area": "Fixes",
      "title": "Renaming a bookmark",
      "text": "What was wrong and what happens now, in a player's words."
    }
  ]
}
```

- **One entry per day.** A second update on the same day adds its items to that day's entry and extends the
  headline.
- **`area`** must be one of: Yard, Buildings, Brimstone Pit, Economy, Battles, Monsters, Pets, Replays, Map,
  Outposts, Hellgate, Depths, Events, Quests, Arcade, Leaderboards, D.A.V.E. Club, Alliances, Chat, Interface,
  Browser, Signing in, Server, Fixes. A new area also has to be added to `CHANGELOG_TOPICS` in
  `server\src\controllers\changelog.ts`, or the topic filter won't find it.
- **Write for players**: what they will see, not file names, function names or bug numbers.
- **An older item that this update undoes or changes** gets `"later": "2026-11-11"` (or
  `{ "date": "...", "note": "a few words" }`). Its own text stays as it was.
- **Check the file is still valid JSON** before publishing. A broken file empties the Change Log.

`server\public\docs` is built into the server's image, so the Change Log goes live with the server update in
`publish-web.cmd`. To change only the Change Log without an update, copy it into the running server (no
restart, no break for players):
```
cd D:\@bymr-inferno-mr2\server
docker cp public/docs/changelog.json bymr-api-server:/app/public/docs/changelog.json
```

## 4. Write it down

- `INFERNO-ONLY-NOTES.md`: a new `## ` section at the end for the update (what changed, in which files, why,
  and how it was tested). This is the technical record; the Change Log is the players' version.
- `NOTES-INDEX.md`: one line for the new section.
- When an update changes how something is run or set up, the document for it too: `CONFIG.md` (settings),
  `ADMIN-GUIDE.md` (the panel), `RUNNING-INFERNO-ONLY.md`, `TROUBLESHOOTING.md`, and
  `server\public\guide\` (the players' guide).
- Optional: `commit-message.txt` in the project folder, the GitHub commit's message (a first line that sums
  the update up, an empty line, then one line per change). Without it the commit gets a predefined message:
  the build number, and the Change Log's entry for today if there is one. It is used once: after the push it
  becomes `commit-message.last.txt`.

## 5. Publish: `publish-web.cmd`

Run `publish-web.cmd` (or Ctrl+Shift+B > **BYMR - Release** in VS Code). Docker Desktop must be running.

1. **Backup.** A dated `bym-<date>.dump` in `server\backups`, as the nightly ones, removed in time by the same
   keeping rules (every backup for 14 days, then one a week for 8 weeks, then one a month for 12;
   `RUNNING-INFERNO-ONLY.md`, "Backups"). If it fails, nothing else happens.
2. **The server.** `docker compose up --build -d` in `server\`, then it waits (up to 3 minutes) until the
   server answers. New migrations are applied before the server starts. The Change Log, the guide and the
   docs pages go live with it.
3. **The game.** A new build stamp (open games are asked to reload), the build, the copy to
   `server\public\web` and its check, and the players' Shiny page written again. Nothing to bump by hand.
   Never copy `client-web\src\game\IOBuild.ts` from anywhere else.
4. **GitHub.** The project copied into `.github\@bymr-inferno-mr2`, committed and pushed to the `inferno-mr2`
   branch of `austin-72/backyard-monsters-refitted`, and to no other branch. What it printed is in
   `publish-github.log`.

What goes to GitHub: only what the game and the server need to be built and run, and the guides for running
them (the guides other than README, CONTRIBUTING and SECURITY in `misc_markdown\`). It leaves out what is
private (`server\.env`, the logs, the database backups, `vidya\`, `SUSPECTED-BUGS.md`, Cloudflare exports)
and what nothing needs to build or run the game (`node_modules`, the built game, `client\` and `art\`, the
tests and art tools, the working notes such as `INFERNO-ONLY-NOTES.md` and `HANDOFF.md`, the commit message
and the logs). The full list is at the top of step 4 in the script. It stops without publishing if a private
file is about to go out. A new kind of private file needs adding to both the script's "Left out" list and
`.gitignore`.

Switches, set before running it (`set SKIP_GITHUB=1`, then `publish-web.cmd`): `SKIP_SERVER=1` skips the
backup and the server (only the game, then GitHub); `SKIP_GITHUB=1` skips GitHub.

After step 2, the log should show `Server running on:` and no `!!! SECURITY` lines:
`docker compose logs web --tail 50` in `server\`.

## 6. Check it

- Open the site in a browser. It should load the new build.
- **Admin** > **Status**: **Published client build** shows the new stamp.
- The Change Log shows the new day.
- **Admin** > **Bugs**: mark a bug fixed only now, once its fix is published. If it is reported again by the
  new build, it reopens by itself. Watch the tab for new rows over the next hour.
- If you planned maintenance: turn maintenance mode off and clear the announcement.

## If something goes wrong

- **The backup failed**: the server isn't running (`docker compose up -d` in `server\`), or `backup.log` in
  `server\backups` says why. Nothing was updated.
- **The server doesn't start, or the game breaks after step 2**: `docker compose logs web` says why. The
  backup from step 1 goes back with `server\restore-db.cmd` (`RUNNING-INFERNO-ONLY.md`, "Backups"); the
  previous files go back the way they came, then `docker compose up --build -d` again.
- **A bad game build**: fix it and run `publish-web.cmd` again (`set SKIP_SERVER=1` first if the server
  needs nothing). There is no step back to the previous build other than publishing again from the earlier
  sources.
- **Players still see the old game**: they reload at their next yard change, or at the login screen.
  `server\public\web\version.json` holds the stamp the server is handing out.
- **The Change Log didn't change**: the server wasn't updated, or the file isn't valid JSON.
- **GitHub failed**: the game and the server are updated; the reason is at the end of `publish-github.log`.
  Nothing is half published on GitHub. Fix the cause and run `publish-web.cmd` again with `SKIP_SERVER=1`.

## Quick list

1. Test (`watch-web.cmd`, `/web-dev/?watch=1`).
2. Server changed: plan maintenance.
3. Write the Change Log entry.
4. Notes: `INFERNO-ONLY-NOTES.md`, `NOTES-INDEX.md`; `commit-message.txt` if you want your own.
5. `publish-web.cmd`.
6. Check the site, the Status tab, the Change Log, the Bugs tab. End maintenance.
