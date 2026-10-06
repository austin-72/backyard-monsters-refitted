# Browser client (no Flash)

`client-web/` is this game's client converted from ActionScript to TypeScript and running in a
browser. It is built from the same `client/scripts` sources as the Flash client, so it has every
Inferno MR2 change: the Inferno start, Map Room 2 with zoom-out and Jump, the daily reward, the
invite referrals, chat over `/chat/poll`, the build-stamp version control. The server needs no
code changes.

How the conversion works, and what behaves differently from Flash: `client-web/README.md`,
`client-web/DESIGN.md`, `client-web/DEVIATIONS.md`. Bugs of the original client that are kept on
purpose: `client-web/bugreport.md`.

## For players

Open **https://inferno-mr2.maproom2.com/** in a current browser (Chrome, Edge, Firefox or Safari).
There is nothing to install and nothing to update: every visit loads the build the server
publishes. Invite links work the same way with `?ref=`: `https://inferno-mr2.maproom2.com/?ref=<code>`.
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
| `client-web/` | the browser client: converter, Flash runtime, and this client converted |
| `publish-web.cmd`, `publish-web.sh` | build the browser client and copy it to `server/public/web` |
| `watch-web.cmd`, `watch-web.sh` | rebuild and publish to `server/public/web-dev` on every change |
| `WEB-CLIENT.md` | this file |
| `.vscode/tasks.json` | task `io-publish-web`, run by **BYMR - Release** after `io-publish-client` |
| `server/docker-compose.yml` | binds `public/web` and `public/web-dev` into the container, like `public/client` |

## Publishing

The browser client is published next to the SWF, from the same stamped sources:

- **VS Code:** **BYMR - Release** runs `io-publish-web` after publishing the SWF.
- **By hand:** run `stamp-build.cmd`, build and publish the SWF as before, then `publish-web.cmd`
  (Windows) or `./publish-web.sh` (Linux/Mac).

`publish-web` needs Node.js 22 or newer (the first run installs the tools with `npm install`). It
converts `client/scripts` and the assets, builds, copies the result to `server/public/web`, and makes
the site's front page (`server/public/index.html`, the stock "Your server is now running" page) open
the game. The front page loads the game's files from `/web/`, so publishing again needs no restart.
The address compiled in defaults to `https://inferno-mr2.maproom2.com/`; set `SERVER_URL` (and
`CDN_URL`) to change it. It only matters when the page is opened from somewhere other than the
game server: served from the game server, the client plays on the server that served it (the same
rule `GAME.as` applies to a SWF opened from a web address).

**The first time only**, restart the server after publishing: it lists the folders of
`server/public` once at startup and only serves those. Later publishes are just file copies.

**With Docker**, `docker-compose.yml` binds `./public/web` and `./public/web-dev` into the container
(as it does `./public/client`), so a publish is a plain file copy: no image rebuild. After changing
`docker-compose.yml` itself, run `docker compose up -d` once so the container picks up the binds.

## Troubleshooting: not the current version

`publish-web` converts `client/scripts`, the same folder the Flash build compiles (`asconfig.json`),
and ends by comparing the build stamps involved. Run the comparison on its own from `client-web`:

```
npm run check
```

It shows the stamp of your sources (`client/scripts/IOBuild.as`), of the published Flash client
(`server/public/client/bymr-stable.swf`), of the browser client on disk (`server/public/web`) and of the
one your server actually serves (`http://localhost:3001/web/`; `CHECK_URL=https://your.host` checks
another server), and says what to do about any difference: publish again after `stamp-build`, restart
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

`watch-web.cmd` (Windows) or `./watch-web.sh` watches `client/scripts` and, on every save,
converts, builds and publishes the browser client to **`server/public/web-dev`**. Open
**`http://localhost:3001/web-dev/?watch=1`**: with `?watch=1` the page reloads itself whenever a
new build is published (about 10 seconds after a save). Only `.as` changes: convert and build;
changes to images, sounds, `assets.swf` or an `[Embed]` also reconvert the assets. A save that does
not compile shows the error in the watch window and keeps the last good build.

It publishes to `web-dev`, not `web`, on purpose: players keep getting `/web/`, which only
`publish-web` or the release task update, so half-finished edits never reach them. The first time,
restart the server once so it serves `/web-dev/` (with Docker, `docker-compose.yml` binds
`public/web-dev` too). To publish straight to the live folder
anyway: `watch-web.cmd --target web`.

To start it with VS Code, add this task to `.vscode/tasks.json`; with `runOn: folderOpen` it starts
whenever the project is opened (VS Code asks once to allow automatic tasks):

```json
{
  "label": "BYMR - Web watch",
  "detail": "Publishes the browser client to server/public/web-dev on every change.",
  "type": "shell",
  "command": "${workspaceFolder}/watch-web.cmd",
  "isBackground": true,
  "problemMatcher": [],
  "runOptions": { "runOn": "folderOpen" }
}
```

## Version control

The browser client sends its `IOBuild` stamp with `/init`, like the SWF. When a newer SWF is
published, a browser client built from older sources gets the "New Update Available!" screen, and
a running one gets the in-game notice at its next yard change. That is why the release task
publishes both: when the two are published together, reloading the page picks up the new build.

Reloading always gets the newest build, although the server caches `/web/` for an hour in
production: the page is a small fixed loader that asks for `version.json` with a unique query and
then loads the content-hashed bundle and assets named there.

## Launcher behaviour

The browser page takes the launcher's part:

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
