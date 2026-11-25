# Updating the game

How to put out an update to the running world: the game, the server, the Change Log, the notes and GitHub.
Everything here keeps the players' data. For a first launch or a fresh world, see `RELEASE-CHECKLIST.md`.

All commands are run on the server's computer. Paths are from the project folder, `D:\@bymr-inferno-mr2`.

## Which steps an update needs

| What changed | Steps |
|---|---|
| Only files under `client-web\` (the game) | 1, 4, 5, 6, 7, 8 |
| Anything under `server\src\`, a migration, or `InfernoOnlyConfig.ts` | all of them |
| Only `server\public\docs\` (Change Log, FAQ, Shiny page) or `server\public\guide\` | 4, then 3 or the quick copy in step 4 |
| Only documents (`*.md` in the project folder) | 7, 8 |

Server first, then the game. A new game build makes every open game reload, so the server has to be ready
for it before the build goes out.

## 1. Test it

- Run `watch-web.cmd` and open `/web-dev/?watch=1` on the site. It rebuilds on every change. Players never
  see `/web-dev/`.
- Server changes: `bunx tsc --noEmit` in `server\` (or `bun run typecheck`) should report nothing.
- Try the thing you changed, as a player, before going further.

## 2. Back up and warn the players (server changes only)

1. `server\backup-db.cmd`, then check there is a new `bym-<date>.dump` in `server\backups`.
2. In the game: **Admin** > **Status** > plan maintenance about 15 minutes ahead, with a message that says
   when the game is back. Players are warned at 15, 5 and 1 minutes; their yards are saved when it starts.

A game-only update needs neither: nothing stops, open games are simply asked to reload.

## 3. Update the server (server changes only)

```
cd D:\@bymr-inferno-mr2\server
docker compose up --build -d
docker compose logs web --tail 50
```

- New migrations are applied before the server starts.
- The log should show `Server running on:` and no `!!! SECURITY` lines.
- Log in once as a player. The game players have open is still the old build, and it must keep working
  against the new server until step 5.

## 4. Write the Change Log

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
- **Check the file is still valid JSON** before publishing it. A broken file empties the Change Log.

**Getting it to the players.** `server\public\docs` is built into the server's image; editing the file on
disk changes nothing by itself.

- With a server update, step 3 already does it, so write the Change Log before step 3.
- Without one, copy the file into the running server (no restart, no break for players):
  ```
  cd D:\@bymr-inferno-mr2\server
  docker cp public/docs/changelog.json bymr-api-server:/app/public/docs/changelog.json
  ```
  The next `docker compose up --build -d` makes it permanent.

Don't put a change in the Change Log before it is live. If the game build is not out yet, do step 5 first.

## 5. Publish the game (changes under `client-web\`)

Run `publish-web.cmd`, or Ctrl+Shift+B > **BYMR - Release** in VS Code.

- It gives the build a new stamp, builds the game, copies it to `server\public\web` and checks the copy.
  Nothing to bump by hand. Never copy `client-web\src\game\IOBuild.ts` from anywhere else.
- It is live at once: no server rebuild, no restart. Open games are asked to reload.
- It also writes the players' Shiny page again (`server\public\docs\shiny.html`). When a Shiny price or
  reward in `InfernoOnlyConfig.ts` changed, that page only goes live with step 3 (or a `docker cp`, as for
  the Change Log).

## 6. Check it

- Open the site in a browser. It should load the new build.
- **Admin** > **Status**: **Published client build** shows the new stamp.
- The Change Log shows the new day.
- **Admin** > **Bugs**: mark a bug fixed only now, once its fix is published. If it is reported again by the
  new build, it reopens by itself. Watch the tab for new rows over the next hour.
- If you planned maintenance: turn maintenance mode off and clear the announcement.

## 7. Write it down

- `INFERNO-ONLY-NOTES.md`: a new `## ` section at the end for the update (what changed, in which files, why,
  and how it was tested). This is the technical record; the Change Log is the players' version.
- `NOTES-INDEX.md`: one line for the new section.
- When an update changes how something is run or set up, the document for it too: `CONFIG.md` (settings),
  `ADMIN-GUIDE.md` (the panel), `RUNNING-INFERNO-ONLY.md`, `TROUBLESHOOTING.md`, and
  `server\public\guide\` (the players' guide).

## 8. Publish to GitHub

After the release, so GitHub matches what is live.

1. Write `commit-message.txt` in the project folder: a first line that sums the update up, an empty line,
   then one line per change. It has to be rewritten for every publish.
2. Run `publish-to-github.bat`.

It copies the current files into `.github\@bymr-inferno-mr2`, commits them and pushes to the `inferno-mr2`
branch of `austin-72/backyard-monsters-refitted`, and to no other branch. What it printed is in
`publish-github.log`.

It publishes only what the game and the server need to be built and run, and the guides for running them.
It leaves out what is private (`server\.env`, the logs, the database backups, `vidya\`,
`SUSPECTED-BUGS.md`, Cloudflare exports) and what nothing needs to build or run the game (`node_modules`,
the built game, `client\` and `art\`, the tests and art tools, the working notes such as
`INFERNO-ONLY-NOTES.md` and `HANDOFF.md`, and the script's own files); the published README leaves out its
line for the notes. The full list is at the top of the script. It stops without publishing if a private
file is about to go out. A new kind of private file needs adding to both the script's "Left out" list and
`.gitignore`.

## If something goes wrong

- **The server doesn't start, or the game breaks after step 3**: `docker compose logs web` says why. The
  backup from step 2 goes back with `server\restore-db.cmd` (`RUNNING-INFERNO-ONLY.md`, "Backups"); the
  previous files go back the way they came, then `docker compose up --build -d` again.
- **A bad game build**: fix it and run `publish-web.cmd` again. There is no step back to the previous
  build other than publishing again from the earlier sources.
- **Players still see the old game**: they reload at their next yard change, or at the login screen.
  `server\public\web\version.json` holds the stamp the server is handing out.
- **The Change Log didn't change**: the file didn't reach the server (step 4, "Getting it to the players"),
  or it isn't valid JSON.
- **`publish-to-github.bat` failed**: the reason is at the end of `publish-github.log`. Nothing is half
  published; fix the cause and run it again.

## Quick list

1. Test (`watch-web.cmd`, `/web-dev/?watch=1`).
2. Server changed: `backup-db.cmd`, plan maintenance.
3. Write the Change Log entry.
4. Server changed: `docker compose up --build -d`, check the log. Otherwise `docker cp` the Change Log.
5. Game changed: `publish-web.cmd`.
6. Check the site, the Status tab, the Change Log, the Bugs tab. End maintenance.
7. Notes: `INFERNO-ONLY-NOTES.md`, `NOTES-INDEX.md`.
8. `commit-message.txt`, then `publish-to-github.bat`.
