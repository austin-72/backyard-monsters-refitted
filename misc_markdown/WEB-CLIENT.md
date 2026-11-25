# The game in the browser

The game is made for the browser: `client-web/` is the whole client, TypeScript (`client-web/src`) running on a
small Flash-compatible layer of its own (`src/flash`, `src/as3`), with its art in `client-web/public`. It has every
Inferno MR2 change: the Inferno start, Map Room 2 with zoom-out and Jump, the daily reward, the invite referrals,
chat over `/chat/poll`, the build-stamp version control.

It began as the Flash client converted from ActionScript (10 October 2026: the converted code became the source,
and the ActionScript, the converter and the Flash builds were retired; see "Made for the browser" below). How the
runtime works and what it does differently from Flash Player: `client-web/README.md`, `client-web/DESIGN.md`,
`client-web/DEVIATIONS.md`. Bugs of the original client that are kept on purpose: `client-web/bugreport.md`.

## For players

Open **https://inferno.maproom2.com/** in a current browser (Chrome, Edge, Firefox or Safari).
There is nothing to install and nothing to update: every visit loads the build the server
publishes. Invite links work the same way with `?ref=`: `https://inferno.maproom2.com/?ref=<code>`.
The old address, `/web/`, keeps working.

## The page

The game opens in a 760×670 window, the size of the Flash projector window, centred under a slim
top bar. Drag just outside any edge or corner to resize it (the game lays itself out for the new
size, as in Flash); double-click an edge to go back to 760×670. The top bar has a full-screen button
and a settings wheel (hidden in full screen):

| Setting | |
|---|---|
| Resolution | Full (default), Sharpest (screen resolution, on scaled displays), Balanced (75%), Performance (50%) |
| Dynamic resolution | Off by default. Lowers the resolution while the game can't keep up, raises it again when it can |
| Show frame rate | A frame counter in the top bar |
| Window | Size presets: 760×670, 1024×768, 1280×800, fit browser |
| Volume | Master volume on top of the game's own sound settings |
| Troubleshooting | Redraw everything every frame; reset settings; reload the game; the client build number |

Settings are kept in the browser. `?shell=0` in the address shows the game alone, filling the page
(for embedding it in another page).

## Phones and tablets

On touch screens (iPhone, Android, iPad) the game fills the screen, kept clear of notches and rounded
corners. A small menu button at the top centre opens the settings (with the frame rate in it when
that is switched on).

- **Touch:** one finger is the mouse (tap = click, drag = drag, e.g. to scroll the map); pinching
  with two fingers zooms, delivered to the game as mouse-wheel steps.
- **Typing:** tapping a text field opens the phone's keyboard; the game slides up so the field stays
  visible above it. The keyboard stays open until you tap outside the field or tap the keyboard's
  Done/close key (which also takes the focus out of the game's field).
- **Full screen:** Android: menu, Full screen (also locks landscape). iPhone Safari cannot show web
  pages full screen; there, Share → Add to Home Screen gives a full-screen app icon (the site has an
  app icon and manifest for that, on Android too).
- **Orientation:** the game is made for landscape; holding the phone upright shows a one-time tip
  (it still works upright, on a tall stage).
- **Sharpness:** high-density screens default to Sharp (2×); Full (1×) is faster, Performance (50%)
  faster still, and dynamic resolution can be switched on in the menu.

`?mobile=1` / `?mobile=0` forces the touch-screen or desktop page for testing.

### Notes for adapting the game to phones

- **Stage size.** The game's UI needs at least 760×670, so on smaller screens the stage keeps that
  minimum in stage pixels, with the screen's shape, and is scaled down to fit. A landscape iPhone
  (about 750×340 CSS pixels) gets a stage of about 1470×670 drawn at 0.51×; upright, 760×1290.
  `stage.stageWidth`/`stageHeight` and `Event.RESIZE` work as on desktop.
- **Touch targets.** At 0.5× a 40×40 stage-pixel button is 20 CSS pixels, below a comfortable finger
  size (about 44). Buttons of 80+ stage pixels work well on phones.
- **Hover.** A tap sends MOUSE_OVER, MOUSE_DOWN, MOUSE_UP, CLICK; the pointer then stays "over" what was
  tapped until the next tap elsewhere. Anything shown only on hover needs a tap-friendly alternative.
- **Detecting a phone.** `Capabilities.touchscreenType` is `"finger"` on touch screens (`"none"` with a
  mouse); `Multitouch.supportsTouchEvents` is true there and `Multitouch.maxTouchPoints` is available.
- **Touch input modes** work as in Flash:

  | `Multitouch.inputMode` | What the game receives |
  |---|---|
  | `NONE` (default) | Mouse events for the first finger; a two-finger pinch arrives as MOUSE_WHEEL steps |
  | `TOUCH_POINT` | `TouchEvent` TOUCH_BEGIN / TOUCH_MOVE / TOUCH_END for every finger (`touchPointID`, `isPrimaryTouchPoint`, `stageX`/`stageY`), TOUCH_TAP when a touch ends on the object it began on; the primary finger also sends mouse events. No automatic pinch: the game handles it |
  | `GESTURE` | Two fingers send `TransformGestureEvent` GESTURE_ZOOM, GESTURE_PAN and GESTURE_ROTATE (phase begin / update / end; `scaleX`/`scaleY`, `offsetX`/`offsetY` and `rotation` are changes since the previous event) |

  `tools/test/touch-modes-test.mjs` exercises all three under phone emulation.

## What is where

The browser client is part of this project (it used to be a separate add-on):

| Path | What it is |
|---|---|
| `client-web/src/game` | the game itself (TypeScript; `index.ts` lists every module in load order) |
| `client-web/src/flash`, `src/as3` | the Flash-compatible runtime the game runs on (display list, events, text, sound...) |
| `client-web/src/player`, `src/main.ts` | the page round the game: canvas, input, resizing, phones, settings |
| `client-web/public` | the art: `swf/` (the original library: shapes, sprites, fonts), `embed/_assets` (pictures, sounds) |
| `client-web/tools` | build, watch, publish, stamp, check; `test/` the browser tests |
| `publish-web.cmd`, `publish-web.sh` | stamp the build, build the browser client and copy it to `server/public/web` (`publish-web.cmd` also backs up, updates the server and publishes to GitHub: "Publishing") |
| `watch-web.cmd`, `watch-web.sh` | rebuild and publish to `server/public/web-dev` on every change |
| `WEB-CLIENT.md` | this file |
| `stamp-build.cmd`, `stamp-build.sh` | write the build stamp (date and time) into `client-web/src/game/IOBuild.ts` on its own (`publish-web` does this itself) |
| `.vscode/tasks.json` | **BYMR - Release** (`stamp-build`, then `publish-web`), **BYMR - Watch** |
| `server/docker-compose.yml` | binds `public/web` and `public/web-dev` into the container |

## Publishing

- **By hand:** run `publish-web.cmd` (Windows) or `./publish-web.sh`. Nothing is needed before it.
  `publish-web.cmd` also backs the database up and updates the server (Docker) first, and publishes the
  project to GitHub after (`UPDATES.md`); `set SKIP_SERVER=1` and `set SKIP_GITHUB=1` before it publish only
  the game. `publish-web.sh` publishes only the game.
- **VS Code:** **BYMR - Release** runs `stamp-build.cmd` and then `publish-web.cmd`. The stamp is written
  twice (the second one wins); that is harmless.

`publish-web` needs Node.js 22 or newer (the first run installs the tools with `npm install`). In order, it:
1. gives the release a new build stamp (`npm run stamp`, into `client-web/src/game/IOBuild.ts`): the server
   then asks every open game older than this build to reload;
2. builds `client-web` with `RELEASE=1` (`npm run build`);
3. copies the result to `server/public/web` and makes the site's front page (`server/public/index.html`, the
   stock "Your server is now running" page) open the game (`npm run publish -- --root`);
4. compares the build stamps involved (`npm run check`; see "Troubleshooting: not the current version").

The front page loads the game's files from `/web/`, so publishing again needs no restart.
(`stamp-build` on its own only writes the stamp; it is not needed before `publish-web`. Before 12 October
`publish-web` did not stamp, and a release published without the task kept the last stamp, so games
already open were never asked to reload.)
The address compiled in defaults to `https://inferno.maproom2.com/`; set `SERVER_URL` (and
`CDN_URL`) to change it. It only matters when the page is opened from somewhere other than the
game server: served from the game server, the client plays on the server that served it (the same
rule `GAME.ts` applies).

**What it builds** (`RELEASE=1`, `client-web/tools/build.ts`) is made to load fast; the game itself is the same
program as a plain `npm run build`:

- the bundle **minified** (5.2 MB instead of 9.7; function and class names kept, so error reports still name them;
  `game.<hash>.js.map` maps it back to `src/` in the browser's developer tools);
- **the art in one file**, `art.bin` (the library's 369 bitmaps and the 193 embedded pictures and sounds, 5.4 MB),
  so a first visit makes about 50 requests instead of about 550. If it can't be loaded, the game loads the files one
  by one, as before;
- every text file **compressed ahead** (`.br` and `.gz` next to it: the bundle goes over the network as 1 MB); the
  server sends those to browsers that take them;
- the page asks for the data files (`fonts.json`, `library.json`, the art) while the bundle is still arriving.

Measured on a 20 Mbit/s line (40 ms): the yard is on screen after 5.8 s on a first visit (was 13.2 s, 19.6 MB, 552
requests; now 8.3 MB, 53 requests), and after about 2.6 s on a later visit (was about 7.4 s; 0.04 MB comes over
the network instead of 10). `client-web/tools/test/load-perf.mjs` measures it.

`watch-web` and a plain `npm run build` build without these (faster to build); `MINIFY=1`, `PACK=1` or
`COMPRESS=1` turn one on. Watch mode removes `.br`/`.gz` files and `art.bin` a release build left in its folder, so
the server never hands out an old copy.

**The first time only**, restart the server after publishing: it lists the folders of
`server/public` once at startup and only serves those. Later publishes are just file copies.

**With Docker**, `docker-compose.yml` binds `./public/web` and `./public/web-dev` into the container,
so a publish is a plain file copy: no image rebuild. After changing
`docker-compose.yml` itself, run `docker compose up -d` once so the container picks up the binds.

## Troubleshooting: not the current version

`publish-web` ends by comparing the build stamps involved. Run the comparison on its own from `client-web`:

```
npm run check
```

It shows the stamp of your sources (`client-web/src/game/IOBuild.ts`), of the browser client on disk
(`server/public/web`), of the last Flash client if one is still there (`server/public/client/bymr-stable.swf`)
and of the one your server actually serves (`http://localhost:3001/web/`; `CHECK_URL=https://your.host` checks
another server), and says what to do about any difference: publish again (`publish-web` stamps a new build), restart
the server or rebuild the Docker image, copy `server/public/web` to the machine players use, or point
it at the folder that holds your current sources.

## Troubleshooting: slow

The game should run at its full 40 frames per second on any recent PC. The first releases of the
browser client drew with the graphics card, which Chrome handles badly for this game (about 7 fps
on a fast PC); it now draws on the processor. If it is slow, check that `publish-web` was run with
this version, and measure in the browser console (F12):

```
s=__player.stats;s.frames=s.scriptMs=s.renderMs=0;await new Promise(r=>setTimeout(r,5000));`${s.frames/5} fps, script ${(s.scriptMs/s.frames).toFixed(1)} ms, render ${(s.renderMs/s.frames).toFixed(1)} ms`
```

Like the Flash Player, the game only redraws the parts of the window that changed each frame, so a large
window mostly costs nothing extra. If frames are still late because of drawing, it lowers its drawing
resolution in steps until it keeps up (text gets softer) and raises it again when there is room;
`/web/?quality=full` always keeps full resolution. `/web/?hidpi=1` draws at the full
resolution of scaled displays (sharper, up to 4x the work). When frames arrive late the game
simulation itself falls behind (bug #1 in `client-web/bugreport.md`, the same as in Flash), so a
slow machine shows slow-motion monsters and timers, and slower loading.

## Troubleshooting: `/web/` says "Not Found"

1. **Is it published?** `server\public\web\index.html` must exist. If it does not, `publish-web`
   failed: run it from a terminal (`cmd` or PowerShell in the project folder) so its messages stay
   visible. 
2. **Was the server restarted?** The server serves only the `public` folders that existed when it
   started, so restart it once after the first publish.
3. **Docker?** `docker-compose.yml` binds `server\public\web` into the container; if the container
   was created before that line was added, run `docker compose up -d` once to re-create it.
4. **The address ends with a slash:** `http://localhost:3001/web/`. Without it the server answers
   "Not Found".

## Automatic publishing while you work

`watch-web.cmd` (Windows) or `./watch-web.sh` (VS Code: **BYMR - Watch**) watches `client-web/src`,
`client-web/public` and `index.html` and, on every save, builds and publishes the game to
**`server/public/web-dev`**. Open **`http://localhost:3001/web-dev/?watch=1`**: with `?watch=1` the page
reloads itself whenever a new build is published (a few seconds after a save). A save that does not build
shows the error in the watch window and keeps the last good build.

It publishes to `web-dev`, not `web`, on purpose: players keep getting `/web/`, which only
`publish-web` or the release task update, so half-finished edits never reach them. The first time,
restart the server once so it serves `/web-dev/` (with Docker, `docker-compose.yml` binds
`public/web-dev` too). To publish straight to the live folder
anyway: `watch-web.cmd --target web`.

To start it whenever the project is opened, add `"runOptions": { "runOn": "folderOpen" }` to the
**BYMR - Watch** task in `.vscode/tasks.json` (VS Code asks once to allow automatic tasks).

## Version control

The game sends its `IOBuild` stamp with `/init`. The server reads the stamp of the build it publishes
(`server/public/web/version.json`; and of the last Flash client while `server/public/client/bymr-stable.swf`
is still there, the newer counting). When a newer build is published, a game started before gets the "New
Update Available!" screen, and a running one gets the in-game notice at its next yard change; reloading the
page picks up the new build. (So an old Flash client still around is told to update once a newer browser
build is out, and from then on can't play: there is no newer Flash client to get.)

Reloading always gets the newest build, although browsers keep the game's files: the page is a small fixed loader
that asks for `version.json` with a unique query and then loads the content-hashed bundle (`game.<hash>.js`) and
the data and art with `?v=<build id>`. In production the server lets browsers keep those for a year without asking
again (`Cache-Control: immutable`: a new build has new names, so nothing old is ever used), and the rest of
`server/public` for an hour, as before. Locally (`ENV=local`) nothing is cached.

## Launcher behaviour

The page does what the Flash launcher (`play.swf`) did:

- **Switch account** (and any other `io_restart` request the game sends on
  `loaderInfo.sharedEvents`) reloads the page without the login token, so the game opens on its
  login page with the saved account list.
- Parameters the launcher passed to the SWF go in the page's query string: `ref`, and optionally
  `serverUrl`, `token`, `language`.

## Invite links

The Invite Friends popup shows "Join me on maproom 2 in the inferno! - A custom backyard monsters refitted
server." and "Play in your browser at <link>", with a Copy button. The link is
`InfernoOnlyConfig.referral.inviteUrl` + `/?ref=<code>` (`inviteLink()` in
`server/src/services/user/referrals.ts`; empty `inviteUrl` = the server's `BASE_URL`), which opens the
browser client. `/play.swf?ref=<code>` links sent earlier still work; both record the referral the same way.

## Tested

Against this server on a fresh database, in headless Chromium:

- Login and registration from the in-game forms, including an invite code: the referral was
  recorded.
- The Inferno yard with the configured starting resources and shiny, and the welcome popup.
- The daily reward: collected 10 shiny, which the server saved.
- Chat over `/chat/poll`.
- Map Room 2 with zoom-out, the tribe popup, and viewing a devil tribe yard (279 buildings).
- Switch account.
- The version check refusing an outdated build.

Not yet tested in the browser: attacks on the world map, outposts and kits, the Catapult, alliances,
the admin panel, the store with the new prices.

## Made for the browser (working on the game)

Until 10 October 2026 the game's source was the ActionScript in `client/scripts`: every build converted it to
TypeScript (`tools/as3-to-ts`) and read the art out of the Flash library `assets.swf` (`tools/swf-assets`), and the
same sources were also compiled into a Flash client (`bymr-stable.swf`, the launcher, the projector pack). Now the
TypeScript is the source and the art is plain files: the converted code and the extracted art were committed as
they were and the rest retired. Nothing in the game changed: the game built from the TypeScript is the same
program, bug for bug (built minified, the bundle is byte for byte the one the converter's output gave; unminified,
only comments differ).

- **Edit the game** in `client-web/src/game`. The code keeps the shape the conversion gave it, and the runtime
  relies on it: a class's fields are declared with `as3.fields(this, {...})` in a static block (their starting
  values), the constructor is `$ctor`, a method passed as a callback is `as3.bind(this, this.method)`, casts are
  `as3.as` / `as3.cast`, numbers meant as whole numbers are written `| 0` (`int`, `uint` are only type names).
  Write new code the same way next to it.
- **A new module** (file) goes into `src/game/index.ts`, after the modules its top-level code needs (its superclass,
  what its static fields use): that list is the load order. If the game finds it by name (`getDefinitionByName`, a
  class bound to a library symbol), add it to `src/game/registry.ts` too.
- **A new picture or sound:** put the file in `client-web/public/embed/_assets/` (subfolders are fine) and embed it
  in a class, as `io_pt_rotate_w.ts` does: `static { as3.embed(this, { source: "/_assets/<file>" }); }`. The build
  lists the folder in `public/embed/manifest.json` itself. (Pictures loaded from the server, `server/public/assets`,
  work as before.)
- **The original library** (`public/swf`: the shapes, sprites, buttons, texts and fonts of the Flash art, and
  their bitmaps) is read-only data now: classes bound to its symbols use `as3.embed(this, { source:
  "/_assets/assets.swf", symbol: "<name>" })`, the name `assets.swf` only saying which library.
- **The build stamp** is in `src/game/IOBuild.ts`; `publish-web` writes a new one at every release (`npm run stamp`,
  or `stamp-build` on its own).
- `client/` holds the original game's art exported from its Flash files (images, sprites, shapes, sounds, fonts),
  for reference when drawing new art; the game does not use it.
