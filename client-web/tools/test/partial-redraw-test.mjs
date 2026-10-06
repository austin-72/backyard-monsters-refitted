// The yard drawn again only where it changed (client com/monsters/rendering/Renderer.as, the browser
// runtime's changed-rectangle log in BitmapData.ts / core.ts), checked against drawing it whole:
//  - after each step, the yard as drawn bit by bit is compared, pixel for pixel over the view, with the same
//    frame drawn whole; and the screen with a full redraw of the screen (__player.verifyRedraw)
//  - steps: idle, the pointer over the yard, a building picked up and dragged over others and put down, a
//    new building placed and cancelled, scrolling and zooming, shadows switched on and off, a wild attack
//    with monsters walking, fighting and dying
//  - an idle yard draws (almost) nothing again; dragging draws a small part of it
//  - the sweep: a wrong patch left on the yard is drawn over within a second, on the yard and on screen
//   EMAIL=... PASSWORD=... node tools/test/partial-redraw-test.mjs
// The yard is not saved (a wild attack is launched on it, nothing kept). Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const { token } = await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const g = (fn, a) => page.evaluate(fn, a);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
await g(() => { window.__game.BASE._blockSave = true; window.__game.WMATTACK._enabled = false; });
const R = "com.monsters.rendering::Renderer";

/**
 * The yard canvas over the part in view, as drawn now (bit by bit), then drawn whole in the same frame:
 * how many pixels differ. The yard is then drawn bit by bit again from the next frame.
 */
const compare = () => g((R) => {
  const Ren = window.__classByName(R);
  const M = window.__game.MAP; const inst = M._instance || M.instance;
  const bd = inst.canvas, ctx = bd.$ctx, v = inst.viewRect; // (the view, in the canvas's own pixels)
  const x = Math.max(0, Math.floor(v.x)), y = Math.max(0, Math.floor(v.y));
  const w = Math.min(bd.$w - x, Math.ceil(v.width)), h = Math.min(bd.$h - y, Math.ceil(v.height));
  // (drawn in parts once more first: the game can change between frames, on a timer, and the frame
  // drawn whole below would show that change while the last frame could not)
  inst._renderer.render();
  const a = ctx.getImageData(x, y, w, h).data;
  Ren.ioMode = 2; inst._renderer.render(); Ren.ioMode = 0;
  const b = ctx.getImageData(x, y, w, h).data;
  let diff = 0, box = null;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
      diff++; const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      box = box ? [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)] : [px, py, px, py];
    }
  }
  // what is drawn there (when it differs)
  let at;
  if (box) {
    const RD = window.__classByName("com.monsters.rendering::RasterData"), cb = [x + box[0], y + box[1], x + box[2] + 1, y + box[3] + 1];
    at = [];
    for (const list of [RD.s_unsortedData, RD.s_visibleData]) for (const e of list) {
      if (!e || e._cleared || !e._pt || !e._rsHas || e._rsW * e._rsH > 4e6) continue;
      if (e._rsX < cb[2] && e._rsX + e._rsW > cb[0] && e._rsY < cb[3] && e._rsY + e._rsH > cb[1] && at.length < 8) {
        const d = e._data;
        at.push({ data: d && d.constructor && d.constructor.name, box: [e._rsX, e._rsY, e._rsW, e._rsH].map(Math.round), depth: Math.round(e._depth), alpha: e._alpha >>> 24, blend: e._blendMode || undefined, filter: e._filter ? 1 : undefined });
      }
    }
    const i = ((box[1] + 2) * w + box[0] + 2) * 4;
    at.push({ drawnInParts: [a[i], a[i + 1], a[i + 2]], drawnWhole: [b[i], b[i + 1], b[i + 2]] });
  }
  return { diff, box, view: [x, y, w, h], at };
}, R);
const screen = () => g(() => { window.__player.render(); return window.__player.verifyRedraw(); });
const stats = () => g((R) => ({ ...window.__classByName(R).ioStats }), R);
const resetStats = () => g((R) => { const s = window.__classByName(R).ioStats; for (const k in s) s[k] = 0; }, R);
let failures = 0;
const step = async (label, run) => {
  if (run) await run();
  await page.waitForTimeout(700);
  const c = await compare();
  const s = await screen();
  // (up to 4 pixels on screen: a text field's clip on a half pixel is smoothed a shade differently when the
  // screen is drawn again in parts; the yard itself must match exactly)
  if (s.diff && s.diff <= 4) s.diff = 0;
  const ok = c.diff === 0 && !s.diff;
  if (!ok) failures++;
  check(`${label}: the yard as drawn bit by bit is the yard drawn whole`, ok, JSON.stringify({ yard: c.diff, where: c.box, screen: s.diff || 0, at: c.at }));
};

// 0. it is on, and draws partly
await resetStats(); await page.waitForTimeout(2000);
let st = await stats();
check("partial redraw is on in the browser", st.partial + st.idle > st.full && st.partial + st.idle > 20, JSON.stringify(st));
check("an idle yard draws (almost) nothing again", st.area / Math.max(1, st.partial + st.idle) < 200000, `${Math.round(st.area / Math.max(1, st.partial + st.idle))} px a frame (the whole yard: 8 million)`);

await step("idle");
await step("the pointer over the yard", async () => { for (let a = 0; a < 6; a += 0.3) await page.mouse.move(640 + Math.cos(a) * 250, 400 + Math.sin(a) * 150); });

// 1. dragging a building over others, then putting it down
const pick = await g(() => {
  const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION");
  const all = IM.getInstancesByClass(BF).filter((b) => b._type !== 17 && b._type !== 14 && b._class !== "decoration" && b._class !== "mushroom" && b._mc);
  all.sort((a, b) => Math.abs(a._mc.x) + Math.abs(a._mc.y) - (Math.abs(b._mc.x) + Math.abs(b._mc.y)));
  window.__A = all[0]; window.__from = [all[0]._mc.x, all[0]._mc.y];
  const p = window.__game.MAP._GROUND.localToGlobal({ x: all[0]._mc.x, y: all[0]._mc.y }); return window.__player.stageToClient(p.x, p.y);
});
await page.mouse.move(pick.x, pick.y);
await step("a building picked up", async () => { await g(() => window.__A.StartMove()); });
await resetStats();
await step("dragged across the yard, over other buildings", async () => { for (let a = 0; a < 5; a += 0.12) await page.mouse.move(640 + Math.cos(a) * 200, 400 + Math.sin(a) * 120); });
st = await stats();
check("dragging draws a small part of the yard again", st.partial > 10 && st.area / Math.max(1, st.partial) < 400000, `${Math.round(st.area / Math.max(1, st.partial))} px a frame, ${st.full} whole frames`);
await step("put down (sent back or kept)", async () => { await g(() => window.__A.StopMoveB()); });
await step("put back where it was", async () => { await g(() => { const a = window.__A; a.StartMove(); a._mc.x = window.__from[0]; a._mc.y = window.__from[1]; a._ioFollowKey = "x"; a.StopMoveB(); }); });

// 2. a new building placed, then cancelled
await step("a new building on the pointer", async () => { const t = await g(() => { const B = window.__game.BASE; const t = [6, 3, 4, 21, 5].find((t) => !B.CanBuild(t, false).error); return (window.__placing = t ? B.addBuildingB(t) : null) ? t : 0; }); check("a new building is on the pointer", !!t, `type ${t}`); await g(() => { window.__P = window.__placing; }); for (let a = 0; a < 3; a += 0.2) await page.mouse.move(640 + Math.cos(a) * 180, 400 + Math.sin(a) * 100); });
await step("cancelled", async () => { await g(() => { try { window.__P.Cancel(); } catch (e) {} }); });

// 3. the view scrolled and zoomed
await step("scrolled", async () => { await g(() => { window.__game.MAP._GROUND.x -= 220; window.__game.MAP._GROUND.y += 90; window.__game.MAP.instance.resizeViewRect(); }); await page.waitForTimeout(400); });
await step("zoomed out and in", async () => { await page.mouse.move(640, 400); for (const d of [300, 300, -300, -300]) { await page.mouse.wheel(0, d); await page.waitForTimeout(300); } });

// 4. shadows off, then on again (they are also hidden and shown again when a building is picked up and put
// down, above)
await step("shadows switched off", async () => { await g(() => { window.__game.GLOBAL._flags.io_shadows = 0; }); });
await step("shadows switched on", async () => { await g(() => { window.__game.GLOBAL._flags.io_shadows = 1; }); });

// 5. a wild attack: monsters walking, fighting, dying, effects on the ground
await step("a wild attack begins", async () => {
  await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._history.lastattack = 0; G._flags.io_wildlast = 0; W._queued = { type: 7, attack: { IC2: 6, IC1: 10 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC2: 60, IC1: 60 }, warned: 1, t: 1, level: 10 }; W.LaunchQueuedAttack(); });
  await page.waitForTimeout(3000);
});
for (let i = 1; i <= 3; i++) await step(`the attack, ${i * 4} s on`, async () => { await page.waitForTimeout(3300); });

// 6. the sweep: something left wrong on the yard, where nothing changes, is drawn over within a second, on
// the yard and on screen, without a whole frame or a whole repaint
let swept = null;
for (let i = 0; i < 4 && !swept; i++) {
  const t = await g((R) => {
    const M = window.__game.MAP, inst = M._instance || M.instance, v = inst.viewRect, bd = inst.canvas;
    // a magenta block on the yard canvas behind the renderer's back, then the screen repainted whole once
    // so that it shows there too
    const x = Math.floor(v.x + v.width * 0.3), y = Math.floor(v.y + v.height * 0.6);
    bd.$ctx.fillStyle = "#ff00ff"; bd.$ctx.fillRect(x, y, 90, 60);
    const P = window.__player; P.settings.fullRedraw = true; P.render(); P.settings.fullRedraw = false;
    // where the block's middle is on the screen's canvas (through the Bitmap that shows the yard canvas)
    let bm = null; const walk = (o) => { if (bm) return; if (o.$bitmapData === bd) { bm = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(P.stage);
    const sp = bm.localToGlobal({ x: x + 45, y: y + 30 }), cp = P.stageToClient(sp.x, sp.y);
    const sc = document.querySelector("canvas"), rc = sc.getBoundingClientRect();
    window.__junk = { x, y, sx: Math.round((cp.x - rc.left) * sc.width / rc.width), sy: Math.round((cp.y - rc.top) * sc.height / rc.height) };
    window.__onScreen = () => { const d = sc.getContext("2d").getImageData(window.__junk.sx, window.__junk.sy, 1, 1).data; return d[0] > 230 && d[1] < 30 && d[2] > 230; };
    return { x, y, full0: window.__classByName(R).ioStats.full, sfull0: P.stats.fullFrames, onScreen: window.__onScreen(), t0: performance.now() };
  }, R);
  for (let k = 0; k < 25; k++) {
    await page.waitForTimeout(100);
    const r = await g((R) => {
      const M = window.__game.MAP, inst = M._instance || M.instance, d = inst.canvas.$ctx.getImageData(window.__junk.x + 45, window.__junk.y + 30, 1, 1).data;
      return { yard: d[0] === 255 && d[1] === 0 && d[2] === 255, screen: window.__onScreen(), full: window.__classByName(R).ioStats.full, sfull: window.__player.stats.fullFrames, t: performance.now() };
    }, R);
    if (r.full !== t.full0 || r.sfull !== t.sfull0) break; // a whole frame or repaint came first: try again
    if (!r.yard && !r.screen) { swept = { ms: Math.round(r.t - t.t0), onScreenAtFirst: t.onScreen }; break; }
  }
}
check("the sweep: a wrong patch on the yard is put right on the yard and on screen within a second, with no whole frame", swept && swept.onScreenAtFirst && swept.ms <= 1300, JSON.stringify(swept));

check("no whole-yard mismatch in any step", failures === 0, `${failures} step(s) differ`);
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
