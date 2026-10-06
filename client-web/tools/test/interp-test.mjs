// Frame interpolation (4 October): made-up frames between the game's 40 a second (?interp=N, or the page's
// "Frame interpolation" setting). Checks:
//  - off by default: one drawing per game frame
//  - interp=2: about three drawings per game frame; the game still at 40 frames a second
//  - a display object the game moves 30 px a frame is drawn in between (10 and 20 px on), and the game itself
//    only ever sees its own values
//  - something that jumps (more than 400 px) is not slid across
//  - a monster in the yard (drawn by the game's own renderer) is drawn in between too, and is back where it
//    is after each drawing
//  - under load (CPU slowed 6x) made-up frames that don't fit are left out, and the game's frames are not slowed
//  - the page's settings: the "Frame interpolation" choice is there, saved, and turns it on and off
//   EMAIL=... PASSWORD=... node tools/test/interp-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
async function open(query, shell = "0") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+|interpolation/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login()}&language=english&shell=${shell}${query}`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; try { window.__game.WMATTACK.HideWarning(); } catch (e) {} window.__game.BASE._blockSave = true; });
  return page;
}
const rates = (page, ms = 3000) => page.evaluate(async (ms) => {
  const P = window.__player, s = P.interp.stats; const r0 = s.real, v0 = s.shown, k0 = s.skipped, f0 = P.stats.frames, t0 = performance.now();
  await new Promise((r) => setTimeout(r, ms));
  const t = (performance.now() - t0) / 1000;
  return { game: (P.stats.frames - f0) / t, shown: (s.shown - v0) / t, real: (s.real - r0) / t, skipped: (s.skipped - k0) / t };
}, ms);
// a square the game moves 30 px every frame (and sends back after 600 px); its drawn x is logged
const mover = (page, jump = false) => page.evaluate((jump) => {
  const SH = window.__classByName("flash.display::Shape"), EV = window.__classByName("flash.events::Event");
  const sq = new SH(); sq.graphics.beginFill(0xff00ff); sq.graphics.drawRect(0, 0, 20, 20); sq.graphics.endFill();
  sq.x = 100; sq.y = 120;
  window.__game.GLOBAL._layerTop.addChild(sq);
  window.__drawn = []; window.__seen = [];
  const draw = sq.$drawSelf;
  sq.$drawSelf = function (ctx, m, a) { window.__drawn.push(Math.round(m[4] * 100) / 100); return draw.call(this, ctx, m, a); };
  sq.addEventListener(EV.ENTER_FRAME, () => { window.__seen.push(sq.x); sq.x = jump ? (sq.x > 300 ? 100 : 700) : (sq.x >= 700 ? 100 : sq.x + 30); });
  window.__sq = sq;
}, jump);
try {
  // ---- off by default
  let page = await open("");
  const off = await rates(page);
  check("off by default: no made-up frames, the game at 40 a second", (await page.evaluate(() => window.__player.interp.frames)) === 0 && off.shown === 0 && off.game > 36, JSON.stringify(off));
  await mover(page);
  await page.waitForTimeout(1500);
  const offDrawn = await page.evaluate(() => { const d = window.__drawn.slice(-30); window.__game.GLOBAL._layerTop.removeChild(window.__sq); return d; });
  const offSteps = offDrawn.map((x, i) => i ? Math.round((x - offDrawn[i - 1]) * 100) / 100 : null).slice(1).filter((d) => d > 0);
  check("...a square moved 30 px a frame is drawn only where the game puts it (30 px steps)", offSteps.length > 10 && offSteps.every((d) => Math.abs(d - 30) < 0.01), JSON.stringify(offDrawn));
  await page.close();

  // ---- two made-up frames
  page = await open("&interp=2");
  const on = await rates(page);
  check("interp=2: about three drawings per game frame, the game still at 40 a second", on.game > 36 && on.shown > on.real * 2.5, JSON.stringify(on));
  await mover(page);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ drawn: window.__drawn.slice(-40), seen: window.__seen.slice(-40) }));
  const steps = r.drawn.map((x, i) => i ? Math.round((x - r.drawn[i - 1]) * 100) / 100 : null).slice(1).filter((d) => d > 0 && d < 40);
  check("...the square is drawn in between: 10 px steps, not 30", steps.length > 10 && steps.filter((d) => Math.abs(d - 10) < 0.6).length >= steps.length * 0.7, JSON.stringify({ steps: steps.slice(0, 20), drawn: r.drawn.slice(0, 12) }));
  check("...the game only sees its own values (whole 30 px steps)", r.seen.length > 10 && r.seen.every((x) => (x - 100) % 30 === 0), JSON.stringify(r.seen.slice(0, 12)));
  await page.evaluate(() => window.__game.GLOBAL._layerTop.removeChild(window.__sq));
  await mover(page, true);
  await page.waitForTimeout(1200);
  const jumps = await page.evaluate(() => { const d = window.__drawn.slice(-30); window.__game.GLOBAL._layerTop.removeChild(window.__sq); return d; });
  const lo = Math.min(...jumps);
  check("...a jump of 600 px is not slid across (drawn only at its two places)", jumps.length > 5 && jumps.every((x) => Math.abs(x - lo) < 0.01 || Math.abs(x - lo - 600) < 0.01), JSON.stringify(jumps));

  // a monster walking in the yard: its raster point at each yard drawing, and after
  const yard = await page.evaluate(async () => {
    const G = window.__game, PT = window.__classByName("flash.geom::Point");
    const p = G.GRID.ToISO(-300, 200, 0);
    const c = G.CREEPS.Spawn("IC1", G.MAP._BUILDINGTOPS, "bounce", new PT(p.x, p.y), 0, 1, true, false, 1);
    const R = window.__classByName("com.monsters.rendering::Renderer");
    const draws = [], after = [];
    const orig = R.prototype.ioDraw;
    R.prototype.ioDraw = function () { if (c._rasterData && c._rasterData._pt) draws.push([c._rasterData._pt.x, c._rasterData._pt.y]); return orig.call(this); };
    const EV = window.__classByName("flash.events::Event");
    const seen = () => after.push([c._rasterPt.x, c._rasterPt.y]);
    window.__game.GLOBAL._layerTop.addEventListener(EV.ENTER_FRAME, seen);
    await new Promise((r) => setTimeout(r, 3000));
    R.prototype.ioDraw = orig;
    window.__game.GLOBAL._layerTop.removeEventListener(EV.ENTER_FRAME, seen);
    try { c.setHealth(0); } catch (e) {}
    return { draws: draws.slice(-60), after: after.slice(-20) };
  });
  const frac = yard.draws.filter(([x, y]) => Math.abs(x - Math.round(x)) > 0.05 || Math.abs(y - Math.round(y)) > 0.05).length;
  check("a monster in the yard is drawn in between (its point part of the way: not whole pixels)", yard.draws.length > 30 && frac >= 10, JSON.stringify({ n: yard.draws.length, frac, sample: yard.draws.slice(0, 8) }));
  check("...and the game sees it back where it is (whole pixels)", yard.after.length > 10 && yard.after.every(([x, y]) => x === Math.round(x) && y === Math.round(y)), JSON.stringify(yard.after.slice(0, 8)));

  // under load
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.evaluate(() => window.__player.applySettings({ interpolate: 0 }));
  const slowOff = await rates(page, 4000);
  await page.evaluate(() => window.__player.applySettings({ interpolate: 3 }));
  await page.waitForTimeout(2500); // (it notices within a second or two)
  const slowOn = await rates(page, 4000);
  await page.evaluate(() => window.__player.applySettings({ interpolate: 0 }));
  const slowOff2 = await rates(page, 4000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const offGame = (slowOff.game + slowOff2.game) / 2;
  check("under load (CPU 6x slower) made-up frames that don't fit are left out, the game's frames not slowed", slowOn.skipped > 0 && slowOn.game >= offGame * 0.9, JSON.stringify({ slowOff, slowOn, slowOff2 }));
  await page.close();

  // ---- the page's settings
  page = await open("", "1");
  const panel = await page.evaluate(async () => {
    const gear = [...document.querySelectorAll(".bw-btn")].find((b) => /Settings|settings/.test(b.title || "")) || document.querySelectorAll(".bw-btn")[1];
    gear && gear.click();
    await new Promise((r) => setTimeout(r, 300));
    const sel = document.querySelector("#bw-ip");
    if (!sel) return null;
    const options = [...sel.options].map((o) => o.textContent);
    sel.value = "2"; sel.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 1500));
    const now = { frames: window.__player.interp.frames, setting: window.__player.settings.interpolate, saved: JSON.parse(localStorage.getItem("bymr-web-settings") || "{}").interpolate };
    sel.value = "0"; sel.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 300));
    return { options, now, off: window.__player.interp.frames };
  });
  check("the page's settings: \"Frame interpolation\" Off / 1-4 frames between; choosing 2 turns it on and is saved; Off turns it off", panel && panel.options.length === 5 && panel.now.frames === 2 && panel.now.saved === 2 && panel.off === 0, JSON.stringify(panel));
  await page.close();
  check("no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
