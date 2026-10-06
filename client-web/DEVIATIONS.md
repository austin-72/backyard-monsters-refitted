# Deviations from the Flash client

The browser client aims to behave exactly like the Flash client (including its
bugs, see `bugreport.md`). This file lists everything that is knowingly
different, either because browsers cannot do what Flash did or because a Flash
behaviour could not be verified. Nothing here was compared side by side with a
real Flash Player: where a behaviour is "believed", it is inferred from
documentation, other emulators (Ruffle) or the game's own code depending on it.

## 1. Platform replacements (unavoidable)

| Area | Flash client | Browser client |
|---|---|---|
| Chat transport | `com.worlize.websocket.WebSocket`, a WebSocket protocol implementation over `flash.net.Socket` (raw TCP) | Same public API over the browser's native `WebSocket` (`tools/as3-to-ts/overrides/com/worlize/websocket/WebSocket.ts`). On pages served over https, `ws://` is upgraded to `wss://`, so the chat server needs TLS in production. Application-level `ping()` is a no-op (browsers handle ping/pong). |
| Raw sockets | `flash.net.Socket` | Not available; `connect()` fails with IOError #2031. Only the unused TLS test harness used it directly. |
| Video | FLV (H.264/AAC) via `NetStream` | Browsers cannot play FLV. `tools/video/remux-flv.sh` copies the streams into MP4 (no re-encode); `NetStream.play("x.flv")` plays `x.mp4`, then `x.webm`, then the original URL. Deploy the MP4s next to the FLVs on the CDN. |
| JavaScript bridge | `ExternalInterface` | Unavailable, exactly like the standalone projector the game targets (`GLOBAL._local` is true); calls throw #2067 as they do there. |
| Local storage | Flash Local Shared Objects (AMF) | `localStorage`, JSON-encoded (Dates preserved). Written on `flush()` and on page close, as Flash writes on unload. Existing Flash `.sol` data is not migrated. |
| Cross-domain policy | `crossdomain.xml` | CORS. The server already sends `Access-Control-Allow-Origin: *`; the CDN must too, for images drawn into BitmapData. |
| SWF bytes | `loaderInfo.bytes` = the SWF | Empty `ByteArray`, so `md5(loaderInfo.bytes)` (sent as `lootbonus`) has a different value. The server does not use it. |
| Restarting the game | A launcher SWF (or the game itself) loads the game SWF again into a `Loader`; the Inferno MR2 fork asks its launcher with a cancelable `io_restart` event on `loaderInfo.sharedEvents` | The page is the launcher: it accepts `io_restart` and reloads itself without the `token` parameter. Loading game SWFs into a `Loader` is impossible, so older restart paths that do that fail with an IO error. |
| Distribution | The launcher asks the server for the current SWF | `index.html` is a fixed loader that reads `version.json` (with a unique query) and loads the content-hashed bundle and assets it names, so a reload always gets the newest build whatever the HTTP caching. |
| Full screen | `stage.displayState = FULL_SCREEN` after a click | The element full-screen API (or its `webkit` form). A browser without it (Safari on iPhone) ignores the request: the stage stays `normal`, `allowsFullScreen` is false, and the page shows how to get full screen there (Add to Home Screen). If the browser refuses a request, the stage goes back to `normal` and a `FullScreenEvent` (not full screen) follows. |
| Background tabs | The Flash Player slowed a hidden page's frame rate | Browsers slow a hidden page's timers to once a second, and after a few minutes to once a minute, which nearly stopped the game (an attack paused, then its timer raced to catch up when the tab came back). Every timer (the frame loop, `Timer`, `setTimeout`, `setInterval`) runs through `src/flash/_clock.ts`: while the page is hidden a small worker, whose timers are not slowed, wakes the page every 8 ms to run the timers that are due. The game keeps its full speed in the background; nothing is drawn while hidden, and the first frame back is drawn whole. A page the browser freezes outright (phones: background tabs, locked screen) still stops; the game's "away more than 5 minutes" stop covers that. Tested with `tools/test/background-test.mjs`. |
| Sound | Flash audio mixer | Web Audio. Browsers start audio only after a user gesture (first click or key press), and iOS can leave it "interrupted" (a call, another app), which the next touch resumes. The 32-channel limit is kept (`Sound.play()` returns `null` beyond it). Embedded sounds (`[Embed]` mp3, e.g. `sound_click1`) are loaded before the game starts, like images. A sound that fails to load gives its channels back, and playing it returns a silent channel that holds none (before, each such play kept a channel for good, until all sound effects were silent). |

## 2. Language and runtime semantics

- **Which classes exist:** like the Flash compiler (mxmlc), only classes reachable through references from the main class (`GAME`) are linked. A library symbol whose class nothing refers to is created as a plain MovieClip, and `getDefinitionByName` does not find that class. (Example: the top bar's spinner symbol has a class that rotates it, but no code refers to it, so in Flash it is a plain clip rotated only by `UI_TOP`; linking it made the spinner turn twice as fast.) `tools/as3-to-ts/last-run-unlinked.txt` lists these symbols; the converter option `--link-all` links everything instead.
- **`addChildAt(child, numChildren)` for an existing child** is allowed and moves it to the top, as in Flash (the index is checked before the child is taken out).

These follow AS3 exactly; they are listed because the JavaScript defaults differ.

- **Class construction:** AS3 constructors run field initialisers and body before `super()` and may use `this` first. Each class's constructor becomes `$ctor`, called once through the `as3.ASObject` root constructor.
- **Static initialisation:** AVM2 initialises a class's statics when the class is first used. 53 classes whose static initialisers are not constant use `as3.lazyStatics` (first access runs the initialiser); classes with only constant statics initialise at load, which is not observably different.
- **`hasOwnProperty`:** true for members declared by the object's class hierarchy, as in AS3 (JavaScript would answer false for methods; the HUD layout depends on this).
- **`super.field`:** a field read or written through `super` is the instance's own field (fields are not virtual).
- **Method closures:** memoised per receiver (`as3.bind`), so `removeEventListener(t, this.f)` matches the earlier add and `arguments.callee` equals `this.method`.
- **`Vector.<T>`:** reads and writes through `Vector`-typed expressions are bounds-checked (RangeError #1125, #1126 for fixed vectors) and coerced to the element type by small helpers the converter emits; growing `length` fills in default values. Access through untyped (`*`/`Object`) references behaves like an `Array` (no RangeError).
- **Sorting:** a port of the AVM2 quicksort, so elements that compare equal end up in Flash's order (JavaScript's sort is stable and would differ).
- **Type coercions:** implicit AS3 coercions are explicit in the code (`| 0`, `>>> 0`, `Number()`, `as3.str()`, `as3.cast()` with Error #1034).

Known differences that remain:

- **`for each` over plain objects** visits the object's own keys (as AS3 visits dynamic properties), fixed when the loop starts; each value is read when the loop reaches it and keys deleted meanwhile are skipped.
- **`for...in` / `for each` order** follows insertion order. Flash's order came from its hash tables and was not stable across runs; code relying on a particular order would already have been flaky.
- **`for...in` over sealed class instances** can enumerate fields that were assigned at runtime (they become own properties in JavaScript); Flash enumerates only dynamic properties.
- **`++`/`--` on `uint` variables** are not wrapped to 32 bits: decrementing a `uint` holding 0 gives -1 instead of 4294967295. Plain and compound assignments (`=`, `+=`, `-=`) are wrapped. No affected code path was found, but this was not audited.
- **Error messages:** common engine errors are mapped to Flash wording and numbers (#1009 null reference, #1006 not a function, #1023 stack overflow); other messages and all stack traces are JavaScript's.

## 3. Display and rendering

- **Frame loop:** 40 fps on a fixed schedule that never runs early (required by bug #1). Hidden browser tabs throttle timers, so the simulation slows or pauses in background tabs; after more than 5 minutes the game's own "Time Threshold Exceeded" check (`GLOBAL.TIME_ELAPSED_THRESHHOLD`) can trigger, as it would after a long Flash stall.
- **Coordinates and alpha:** `x`/`y` are stored in twips (1/20 px, truncated, NaN becomes -107374182.4) and `alpha` in steps of 1/256, which is believed to match Flash Player. Unverified.
- **Canvas rasterization:** all canvases use Chrome's CPU rasterizer (`willReadFrequently`). The game draws hundreds of vector shapes and glyph outlines per frame and blits canvases into each other, which GPU-backed Canvas 2D handles badly (6.8 fps measured on a fast PC; 40 fps on the CPU rasterizer). `?gpu=1` switches back to GPU canvases.
- **Device-font text in a scaled field** (e.g. button labels, whose buttons are widened with `width`): as in Flash, the glyphs are drawn at the field's vertical scale, unstretched, and the text is laid out across the field's scaled width, so centred labels stay centred. Embedded-font text is scaled like shapes.
- **9-slice scaling (`scale9Grid`)** applies to the container's own shapes; child objects (text fields, clips) are scaled normally with it, as in Flash.
- **Minimum stage size:** with `StageScaleMode.NO_SCALE` the stage is the window's size, but never smaller than the game's own size (760×670 stage pixels): a smaller window or phone screen gets a stage of at least that size, with the screen's shape, scaled down to fit. (Flash would cut the game off instead.)
- **Touch screens:** the first finger acts as the mouse; a second finger turns the gesture into a pinch, delivered as MOUSE_WHEEL steps at the midpoint (the first finger's press is released without a click). `Capabilities.touchscreenType` is `"finger"` on touch screens. `Multitouch.inputMode` TOUCH_POINT delivers `TouchEvent`s (BEGIN/MOVE/END/TAP; the primary finger also as mouse events) and GESTURE delivers `TransformGestureEvent` zoom/pan/rotate from two fingers; OVER/OUT/ROLL touch events, swipe, press-and-tap and touch samples are not implemented.
- **Text input on phones:** typing goes through a hidden native text box focused during the tap (browsers only open the on-screen keyboard from a user gesture). The canvas cancels the touch events' default action, since iOS would otherwise move focus to the tapped canvas and close the keyboard; closing the keyboard yourself removes the focus from the game's field as well.
- **Stage:** projector-style window. `StageScaleMode.NO_SCALE` with Flash's default centred alignment (the game's layout code relies on it). Rendering is at one pixel per CSS pixel, like Flash, and the browser scales it on high-DPI screens; `?hidpi=1` renders at the display's resolution instead (sharper, but 2-4x the drawing work at 150-200% scaling). **Resolution** is chosen in the page's settings: full (default), screen resolution, 75% or 50%. **Dynamic resolution** (off by default, or `?quality=auto`) lowers the canvas resolution in steps while frames are late because of drawing, and raises it again when frames are on time; a resolution that was too slow is retried after 20 s, then 40, 80... `?maxpixels=N` caps the canvas size.
- **Vector shapes:** converted from `assets.swf` with SWF's edge-based fill rules. Anti-aliasing is the browser's; edges can differ by a pixel.
- **Filters:** drop shadow, glow and blur use Gaussian blurs where Flash used repeated box blurs, so soft edges differ slightly. Bevel and gradient glow/bevel are approximations; `ConvolutionFilter` is not implemented. Filtered objects are cached as bitmaps until their content changes.
- **Colour transforms and blend modes:** exact for normal, multiply, screen, lighten, darken, difference, add, overlay, hardlight, erase and alpha. `subtract` and `invert` are not supported by Canvas 2D and render as normal.
- **Redraw regions:** as in Flash Player, only the parts of the screen that changed are drawn again each frame. Before rendering, every visible object is compared with the previous frame (appearance, screen position, children); the changed areas are cleared and redrawn, and objects outside them are skipped. A full redraw happens on the first frame, after a resize, and every 3 seconds as a safety net; `?redraw=full` redraws everything every frame. `tools/test/redraw-test.mjs` checks the result against full redraws across many screens.
- **`cacheAsBitmap`:** honoured as in Flash: the object is drawn once into a bitmap that is reused until its visible content changes (hidden children do not count). Content that changes nearly every frame is drawn directly for a while instead, and objects larger than 4000 pixels are always drawn directly. Like Flash, a cached bitmap is reused wherever the object moves, drawn at whole-pixel positions (so moving content can land up to half a pixel from its exact position); a change of scale, rotation or content redraws it. The same applies to filtered and colour-transformed objects.
- **Mouse hit testing** carries the pointer position down the display list in each object's local coordinates, including `scrollRect` scroll offsets exactly as drawn (the previous implementation ignored those offsets; the game does not use `scrollRect`). `localToGlobal`/`globalToLocal` still ignore scroll offsets.
- **Timeline stepping:** each frame only the playing clips on the stage are stepped, in the order they started playing rather than display-list order. The game has no timeline frame scripts, so the order is not observable.
- **9-slice scaling:** applied to library shapes inside `scale9Grid` containers; other content in such containers is positioned but not sliced.
- **Morph shapes:** the library's single morph shape renders its start shape only.
- **Timelines:** the Flash placement rules are implemented (objects persist while the same placement is on the timeline; timeline children are attached, named and positioned before their constructor runs; code-moved objects are no longer animated). A timeline "move" that names a different character keeps the object and, for shapes, swaps its graphics in place, as Flash does (Ruffle: `replace_with`); other object types keep their content. Depth ordering between code-added and timeline-added children is an approximation.
- **Text:** laid out with the metrics of the embedded fonts and drawn from their glyph outlines, so line breaks and `textWidth` follow the font data. Anti-aliasing, grid fitting and `antiAliasType` are not emulated. When several embedded fonts share a name, the lookup uses name and style first, then name only, and merges same-name subsets with the earliest-defined font winning. This rule is inferred (the login title only renders with it), not verified. Device fonts (`embedFonts = false`) use the browser's fonts.
- **Input fields:** typing goes through a hidden native text area (IME, clipboard, mobile keyboards). Selection highlighting is simplified.
- **Hand cursor and focus:** the hand shows only when the mouse target itself is a button-mode sprite, as in Flash. Focus moves on mouse down to text fields, buttons and button-mode sprites.

## 4. BitmapData

- An opaque BitmapData (`transparent = false`) is backed by an opaque canvas, so copying it is a plain copy rather than a blend. Its pixels are the same as before (opaque bitmaps never held alpha).

- `copyPixels` into an opaque bitmap composites the source (an opaque bitmap cannot store alpha). The map renderer's normal path only works this way, which is the basis for this rule.
- `noise()` uses the Park-Miller generator and `perlinNoise()` the SVG 1.1 turbulence algorithm, with Flash's seed handling and premultiplied-alpha rounding as reverse-engineered by the Ruffle project. Mushroom placement and wild monster attack choices depend on `noise()` output (via gskinner `Rndm`), so any mismatch here changes those. Unverified against Flash Player.
- Pixels read back with `getPixel`/`getPixel32` after drawing operations go through the browser's premultiplied canvas, so semi-transparent values can differ from Flash by rounding.
- Not implemented: `applyFilter`, `floodFill`, `merge`, `getPixels`/`setPixels`, `compare`, `hitTest` against another BitmapData. The game was not seen calling them.

## 5. Not implemented (not used by the game as far as tested)

`ByteArray` compression and AMF (`readObject`/`writeObject`), `FileReference`,
`LocalConnection`, `StyleSheet.parseCSS`, `SoundMixer.computeSpectrum`,
`Sound.extract`, 3D display properties. Each logs a single "not implemented"
warning to the console if it is ever called.
