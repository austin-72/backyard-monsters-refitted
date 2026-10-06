# Backyard Monsters Refitted: browser client

The Flash client (`client/`) converted to TypeScript and running in a browser
without Flash. It talks to the unchanged BYMR server.

- `DESIGN.md`: how it works and the decisions to review
- `DEVIATIONS.md`: every known difference from the Flash client
- `bugreport.md`: bugs of the original client that are preserved on purpose

## Requirements

Node.js 22+ (for building), and for the tools also `tsx` (`npm i -g tsx`).
Development used Chromium; release testing should cover Chrome, Edge, Firefox
and Safari.

## Build

```sh
cd client-web
npm install
SERVER_URL=https://server.bymrefitted.com/ CDN_URL=https://cdn.bymrefitted.com/ npm run build
```

`SERVER_URL` and `CDN_URL` replace the Flash build's `CONFIG::SERVER_URL` and
`CONFIG::CDN_URL` defines (the values above are the defaults). The output in
`dist/` is a static site: `index.html` (a fixed loader), `version.json`, the
content-hashed bundle `game.<hash>.js` and the converted assets.
Host it anywhere; the server already allows cross-origin requests. Set
`MINIFY=1` for a minified bundle.

## Run

Open `dist/index.html` through a web server. Parameters that the Flash
launcher passed as FlashVars go in the query string:

| Parameter | Meaning |
|---|---|
| `serverUrl` | game server base URL, e.g. `http://localhost:3001/` (overrides the build default) |
| `token` | session token: skips the login form |
| `language` | language file name, e.g. `english` (the launcher passes this with `token`) |
| `ref` | invite code (Inferno MR2 fork: stored until an account is registered with it) |
| `hidpi` | `1` renders at the screen's full resolution on scaled displays: sharper, slower |
| `gpu` | `1` uses GPU-backed canvases (much slower for this game in Chrome; for testing) |
| `quality` | `auto` turns on dynamic resolution (lower resolution while frames are late); off by default |
| `shell` | `0` shows the game alone, filling the page (no top bar or resizable window) |
| `mobile` | `1`/`0` forces the touch-screen or desktop page (normally chosen by the device) |
| `maxpixels` | caps the canvas at this many pixels, e.g. `2100000` (about 1920x1080) |
| `redraw` | `full` redraws the whole window every frame (no redraw regions; for comparison and testing) |

Example: `http://localhost:8080/?serverUrl=http://localhost:3001/`

### Deploying the videos

Browsers cannot play FLV. Before deploying, create MP4 copies next to the FLVs
on the CDN (streams are copied, not re-encoded; needs ffmpeg):

```sh
tools/video/remux-flv.sh <path to the CDN's assets directory>
```

Add `--webm` to also produce WebM copies for browsers without H.264 support.

### Chat

The chat server address comes from the server (`CHAT_WS_HOST`). When the page
is served over https, the client connects with `wss://`, so the chat server
needs TLS in that setup.

## Development

```sh
SERVER_URL=http://localhost:8080/server/ CDN_URL=http://localhost:8080/server/ npm run dev
# builds, then serves dist/ and a mock game server on http://localhost:8080
```

The mock server at `/server/` (static files from `../server/public` plus a few
mocked routes) only covers the login screen. For everything
else run the real server from `server/` (see its README; locally that needs
PostgreSQL, Redis and Bun, or `docker compose up`), build with
`SERVER_URL=http://localhost:3001/ CDN_URL=http://localhost:3001/` and open
`http://localhost:8080/?serverUrl=http://localhost:3001/`.

Performance scripts (Playwright): `tools/test/attack-perf.mjs <monsters>` starts an attack on a
tribe yard, spawns that many monsters and reports frame times with a CPU profile (Inferno MR2
fork); `tools/test/redraw-test.mjs` checks redraw regions against full redraws; `tools/test/profile.mjs`
profiles any screen; `tools/test/mobile-test.mjs "iPhone 13 landscape"` checks layout, taps, pinch
zoom and text input under phone emulation; `tools/test/touch-modes-test.mjs` checks the three
`Multitouch.inputMode` modes; `tools/test/pinch-zoom-test.mjs` checks the game's own pinch zoom
(`IoPinchZoom`: one zoom step per pinch, no wheel events); `tools/test/sound-test.mjs` checks the embedded click sound, that a sound that can't load doesn't use up the
channels, and that switched-off music stays off when it loops; `tools/test/planner-test.mjs` checks the Yard
Planner on a yard with 220 walls (yard not drawn behind it, group moves, quick overlap check = full check,
frame rate at a quarter CPU); `tools/test/planner-tools-test.mjs` checks the planner toolbar (flip on a
selection, Store confirm, undo / redo); `tools/test/catapult-test.mjs` checks the shiny confirm on instant
upgrades, the Strongbox pages, the Catapult ammunition and the Sulfur shield; `tools/test/alliance-chat-test.mjs`
checks the Global / Alliance chat tabs, name clicks, alliance Members and the invite text with two players
(see HANDOFF.md for its setup); `xvfb-run -a node tools/test/background-test.mjs` checks that a hidden tab keeps
playing at full speed (`src/flash/_clock.ts`); `tools/test/stops-test.mjs` checks full screen without the browser API, the
message window in full screen, the "away too long" stop and the logged-out stop, and their Reload buttons
(bug reports #15, #17, #18, #19); `tools/test/keyboard-test.mjs` checks that the on-screen keyboard's
focus holds, typing arrives, and closing it releases the game's field.

`npm run publish` copies `dist/` into `../server/public/web` (`--root` also makes the site's front
page open the game; `--target <folder>` publishes elsewhere).

`npm run watch` rebuilds on every change to `client/scripts` and publishes to
`../server/public/web-dev` (`--target web` for the live folder, `--no-publish` to only rebuild
`dist/`). Open the page with `?watch=1` and it reloads itself after each build.

In the browser console, `__game` holds the game's classes (for example
`__game.MAP._GROUND`) and `__player` the stage, frame statistics
(`__player.stats`) and profiling switches (`__player.debug`).

### Headless tests

The scripts in `tools/test/` drive the client with Playwright
(`npm i -g playwright` or set `PLAYWRIGHT_PATH`; `CHROMIUM_PATH` selects a browser):

```sh
node tools/test/snap.mjs                      # load, print console output, screenshot
EMAIL=... PASSWORD=... node tools/test/base.mjs 12 1280 800   # log in via token, screenshot the base
STEPS="c:1015,565 w:1000 s:menu" node tools/test/base.mjs     # click, wait, screenshot to /tmp/step-menu.png
```

## Converting again (until the TypeScript cutover)

While development continues in AS3, regenerate the TypeScript and assets from
the Flash sources:

```sh
npm run convert      # client/scripts -> src/game (needs ../playerglobal.swc from the AIR/Flex SDK)
npm run assets       # client/scripts/_assets/assets.swf -> public/swf, [Embed] files -> public/embed
```

Do not edit `src/game` by hand before the cutover: it is overwritten. Deliberate
replacements belong in `tools/as3-to-ts/overrides/` (copied over the output).
After the cutover, `src/game` is the source and these tools are retired.

`npm run typecheck` runs the TypeScript compiler; about 120 errors remain
(see `DESIGN.md`). The build itself does not type-check.
