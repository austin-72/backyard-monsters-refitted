// Moving a building in the yard (move mode), after making it fast (BFOUNDATION.FollowMouseB, Renderer):
//  - the building held is drawn see-through without the alpha-mask copy (that made the browser draw out
//    the whole frame once for every layer of it: most of the time a move took)
//  - nothing is worked out again while the pointer stands still; it is when the building lands on another
//    snap step, and when the view scrolls under it
//  - the footprint says whether the spot under the building now is free (red over another building, green
//    on free ground; it used to show the spot before, a step behind), and putting it down follows that:
//    a taken spot sends it back, a free one keeps it
//  - what is on screen matches a full redraw while moving
//  - building shadows are drawn, but not while a building is held (moved, or a new one being placed):
//    server config yardShadows / yardShadowsWhileMoving
//   EMAIL=... PASSWORD=... node tools/test/move-test.mjs
// The yard is not saved (the building is put back where it was). Prints one line per check.
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

// two buildings of the yard: the one to move (A) and one to try to put it on (B); counters on the work done
const setup = await g(() => {
  const B = window.__game.BASE; B._blockSave = true; window.__game.WMATTACK._enabled = false;
  const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION");
  const all = IM.getInstancesByClass(BF).filter((b) => b._type !== 17 && b._type !== 14 && b._class !== "decoration" && b._class !== "mushroom" && b._mc);
  all.sort((a, b) => Math.abs(a._mc.x) + Math.abs(a._mc.y) - (Math.abs(b._mc.x) + Math.abs(b._mc.y)));
  window.__A = all[0]; window.__B = all.find((b) => b !== all[0]);
  window.__from = [window.__A._mc.x, window.__A._mc.y];
  window.__n = { blockers: 0, masked: 0, seeThrough: 0 };
  const blockers = B.BuildBlockers; B.BuildBlockers = function () { window.__n.blockers++; return blockers.apply(this, arguments); };
  const BD = window.__classByName("flash.display::BitmapData"); const cp = BD.prototype.copyPixels, dr = BD.prototype.draw;
  BD.prototype.copyPixels = function (s, r, d, a) { if (a) window.__n.masked++; return cp.apply(this, arguments); };
  BD.prototype.draw = function (s, m, ct) { if (ct && ct.alphaMultiplier > 0 && ct.alphaMultiplier < 1) window.__n.seeThrough++; return dr.apply(this, arguments); };
  return { a: window.__A && window.__A._type, b: window.__B && window.__B._type, from: window.__from };
});
check("two buildings to try it with", !!setup.a && !!setup.b, JSON.stringify(setup));
const toClient = (which, dx = 0, dy = 0) => g(([which, dx, dy]) => { const b = window[which]; const p = window.__game.MAP._GROUND.localToGlobal({ x: b._mc.x + dx, y: b._mc.y + dy }); return window.__player.stageToClient(p.x, p.y); }, [which, dx, dy]);
const counts = () => g(() => ({ ...window.__n }));
const reset = () => g(() => { for (const k in window.__n) window.__n[k] = 0; });
const footprint = () => g(() => window.__A._mcFootprint.currentFrame);
const where = () => g(() => [window.__A._mc.x, window.__A._mc.y]);
/** Whether the yard's last frame was drawn with the buildings' shadows. */
const shadows = () => g(() => { const M = window.__game.MAP; return !!(M._instance || M.instance)._renderer._shadows; });
check("shadows are drawn in the yard", await shadows());

// pick A up
let p = await toClient("__A");
await page.mouse.move(p.x, p.y);
await g(() => window.__A.StartMove());
await page.waitForTimeout(500);
await reset();
await page.waitForTimeout(1500);
let n = await counts();
check("held still: nothing is worked out again", n.blockers === 0, JSON.stringify(n));
check("held: the shadows are hidden", !(await shadows()));
check("the building held is drawn see-through, without the alpha-mask copy", n.seeThrough > 0 && n.masked === 0, JSON.stringify(n));

// onto B: red at once, and putting it down there sends it back
p = await toClient("__B");
await page.mouse.move(p.x, p.y, { steps: 8 });
await page.waitForTimeout(400);
const overB = { frame: await footprint(), blocked: await g(() => window.__game.BASE.BuildBlockers(window.__A, false)), at: await where() };
check("over another building: the footprint is red where it is now", overB.frame === 2 && overB.blocked === "overlap", JSON.stringify(overB));
const snap1 = await g(() => { window.__player.render(); return window.__player.verifyRedraw(); });
// (up to 4 pixels: a text field's clip on a half pixel is smoothed a shade differently when drawn in parts)
check("while moving, the screen matches a full redraw", !(snap1.diff > 4), JSON.stringify(snap1));
await page.screenshot({ path: (process.env.SHOTS || "/tmp") + "/move-over.png" });
await g(() => window.__A.StopMoveB());
check("put down on it: back where it was", JSON.stringify(await where()) === JSON.stringify(setup.from), JSON.stringify(await where()));

// onto free ground: green at once, and it stays there
await g(() => window.__A.StartMove());
let free = null;
for (const [dx, dy] of [[0, 260], [0, -260], [-300, 0], [300, 0], [-260, 200], [260, -200], [200, 200], [-200, -200]]) {
  p = await toClient("__A", dx, dy);
  await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.waitForTimeout(300);
  if ((await footprint()) === 1 && (await g(() => window.__game.BASE.BuildBlockers(window.__A, false))) === "") { free = await where(); break; }
}
check("on free ground: the footprint is green where it is now", !!free, JSON.stringify(free));
// the view scrolls under the held building: it follows
const before = await g(() => [window.__A._rasterPt[1] ? window.__A._rasterPt[1].x : null, window.__game.MAP._GROUND.x]);
await g(() => { window.__game.MAP._GROUND.x -= 40; });
await page.waitForTimeout(300);
const after = await g(() => [window.__A._rasterPt[1] ? window.__A._rasterPt[1].x : null, window.__game.MAP._GROUND.x]);
check("the view scrolled while holding it: it is drawn where it now is", before[0] !== after[0], JSON.stringify([before, after]));
await g(() => { window.__game.MAP._GROUND.x += 40; });
await page.waitForTimeout(300);
const landed = await where();
await g(() => window.__A.StopMoveB());
check("put down there: it stays", free && JSON.stringify(await where()) === JSON.stringify(landed) && JSON.stringify(landed) !== JSON.stringify(setup.from), JSON.stringify([landed, await where()]));

// back where it was (nothing saved)
await g(() => { const a = window.__A; a.StartMove(); a._mc.x = window.__from[0]; a._mc.y = window.__from[1]; a._ioFollowKey = "stop"; a._mouseOffset.x = window.__game.MAP._GROUND.mouseX - a._mc.x; a._mouseOffset.y = window.__game.MAP._GROUND.mouseY - a._mc.y; a.StopMoveB(); });
check("put back", JSON.stringify(await where()) === JSON.stringify(setup.from), JSON.stringify(await where()));
await page.waitForTimeout(300);
check("put down: the shadows are back", await shadows());
// a new building on the pointer: no shadows until it is placed or cancelled
const placedType = await g(() => { const B = window.__game.BASE; const t = [6, 3, 4, 21, 5].find((t) => !B.CanBuild(t, false).error); return (window.__placing = t ? B.addBuildingB(t) : null) ? t : 0; });
await g(() => { window.__P = window.__placing; });
await page.mouse.move(640, 400, { steps: 4 });
await page.waitForTimeout(400);
const placing = { type: placedType, onPointer: await g(() => !!window.__game.GLOBAL._newBuilding) };
check("placing a new building: the shadows are hidden", placing.onPointer && !(await shadows()), JSON.stringify(placing));
await g(() => { try { window.__P.Cancel(); } catch (e) {} });
await page.waitForTimeout(400);
check("cancelled: the shadows are back", await shadows() && !(await g(() => !!window.__game.GLOBAL._newBuilding)));
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
