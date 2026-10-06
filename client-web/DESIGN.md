# Design of the browser client

This document explains how `client-web` works and which decisions shaped it.
`CONTRIBUTING.md` asks that architecture come from a person: the decisions
below were made while building this port and are written down so that
maintainers can review, change or reject them before the cutover.

## Goal and approach

Goal: run the existing game in a browser without Flash, behaving exactly like
the Flash client, bugs included (`bugreport.md`), with TypeScript as the
source of truth afterwards.

Approach: **transpile and emulate**, not rewrite.

1. A converter (`tools/as3-to-ts`) translates all 1,477 AS3 files mechanically
   into TypeScript, keeping names, structure and comments.
2. A runtime (`src/as3`, `src/flash`) implements the ActionScript 3 language
   semantics and the Flash APIs the game uses, on Canvas 2D, Web Audio,
   `fetch`, `localStorage`, WebSocket and HTML video.
3. An asset pipeline (`tools/swf-assets`) converts the Flash library
   (`assets.swf`) and embedded files into browser formats at build time.
4. A player (`src/player`) boots the document class like Flash Player: frame
   loop, rendering, input.

The server needs no code changes. Its only new requirement is the MP4 copies of
the siege videos (`tools/video/remux-flv.sh`), plus TLS on the chat socket when
the page itself is served over https.

## Repository layout

```
client-web/
  src/game/          converted game code (generated until cutover, then hand-maintained)
  src/as3/           AS3 language runtime: classes, coercions, Vector, Dictionary, XML, sort
  src/flash/         flash.* API: display, events, text, net, media, filters, geom, utils, ...
  src/player/        boot, frame loop, rendering entry, input, library preloading
  src/main.ts        entry point
  public/swf/        converted library: fonts.json, library.json, bitmaps/
  public/embed/      files from [Embed(source=...)] (images, sound)
  tools/as3-to-ts/   converter (+ overrides/ for deliberate hand-written replacements)
  tools/swf-assets/  SWF library converter
  tools/video/       FLV to MP4 remux script
  tools/test/        dev server, headless-browser test scripts
```

## Decisions to review

**D1. Transpile the AS3 instead of rewriting the game.** A rewrite could not
reproduce 203k lines of behaviour exactly. The cost is generated-looking code
in places (explicit coercions, `$ctor`), which maintainers inherit.

**D2. TypeScript becomes the source of truth after a one-time cutover.** Until
then the converter is re-run on the AS3 sources (`npm run convert`) and hand
edits to `src/game` are lost; changes that cannot be expressed in AS3 go in
`tools/as3-to-ts/overrides/`. After cutover the AS3 sources and the converter
are retired. Chosen by the project owner.

**D3. Construction protocol.** JavaScript cannot run code before `super()` or
use `this` before it; AS3 can. Every class's constructor body becomes a method
`$ctor(...)`; the root class `as3.ASObject` calls `$alloc()` (runtime-native
state), `$afterAlloc()` (library symbol content, timeline attachment) and
`$ctor(...)`; `super(...)` becomes `super.$ctor(...)`. Field defaults live on
the prototype (`as3.fields`), non-constant field initialisers run at the top
of `$ctor`. **Consequence:** never use TypeScript field initialisers in these
classes, and keep `useDefineForClassFields: false`.

**D4. Coercions are explicit.** AS3 converts values at every typed boundary
(`int`, `uint`, `Number`, `String`, class types). The converter writes these
conversions into the code (`x | 0`, `>>> 0`, `Number(x)`, `as3.str(x)`,
`as3.cast(x, T)`). This is noisy but makes the behaviour visible and exact.

**D5. One barrel module, ordered for loading.** Game modules import each other
through `@game` (`src/game/index.ts`), which lists modules so that
superclasses and load-time dependencies come first. Class static state with
non-constant initialisers is initialised on first use (`as3.lazyStatics`), as
AVM2 does, which removes most ordering constraints.

**D6. The Flash API is emulated, not replaced.** Game code keeps calling
`addChild`, `gotoAndStop`, `TextField.htmlText` and so on. The runtime
reproduces the Flash behaviours the game depends on, including error numbers
(#2025, #2006, #1009 ...), since the game's uncaught-error handler reports them.

**D7. Canvas 2D renderer with render caches.** The whole display list is
redrawn each frame. Filtered objects are cached as bitmaps until their
subtree changes (this took rendering from 14.5 ms to 1.5 ms per frame on the
base screen). WebGL would be faster, and the renderer is isolated in
`display/core.ts` (`renderObject`) so it could be replaced later.

**D8. Text uses the SWF's own fonts.** Glyph outlines and metrics come from
the embedded DefineFont3 data, so wrapping and auto-sizing follow the font
data instead of the user's installed fonts.

**D9. Assets are converted at build time.** `assets.swf` becomes JSON
(shapes as SVG path data, timelines as placement ops) plus image files. The
runtime instantiates symbols from this data when game classes bound with
`[Embed(symbol=...)]` are constructed.

**D10. Exact emulation where gameplay depends on it.** `BitmapData.noise()`
drives the seeded random generator used for wild monster attacks and
mushrooms; tick banking needs Flash's frame pacing; sorting uses the AVM2
algorithm. Visual-only behaviour (anti-aliasing, blur shapes) is approximate.

**D11. Deliberate replacements are isolated.** Only one game file is replaced
(the chat WebSocket library, `tools/as3-to-ts/overrides/`); everything else is
converted. See `DEVIATIONS.md`.

## Converter

`tools/as3-to-ts`: `lexer.ts` and `parser.ts` build an AST; `model.ts` resolves
classes, members and types across the program and Adobe's `playerglobal.swc`
(read by `abc.ts`); `analyze.ts` decides which `var`s must be hoisted to keep
function scoping; `emit-core.ts` and `emit.ts` write TypeScript; `cli.ts` runs
it and writes the barrel (`src/game/index.ts`) and class registry
(`src/game/registry.ts`). It needs `playerglobal.swc` (from the Adobe AIR or
Flex SDK) at `../playerglobal.swc`; the constants it yields are already
committed in `src/flash/_constants.ts`.

## Testing

- `tools/dev-server.ts` serves `dist/` and a stand-in for the game server
  (static assets plus a few mocked routes) for work on the login screen.
- For everything else, run the real server locally (see README) and use the
  headless-browser scripts in `tools/test/` (`base.mjs` logs in with a token
  and can script clicks, waits and screenshots).
- `window.__game` exposes the game's classes and `window.__player` the stage,
  frame statistics and profiling switches, for debugging in the browser console.

## Known gaps

See `DEVIATIONS.md`. Areas not yet exercised by tests: attacking other players,
the world maps (v2/v3), Inferno, alliances, the store and payment popups,
most events. `npm run typecheck` reports about 120 remaining TypeScript errors
(mostly AS3 patterns such as duplicate object keys and constructor signatures
that differ from their superclass); the build does not depend on them.
