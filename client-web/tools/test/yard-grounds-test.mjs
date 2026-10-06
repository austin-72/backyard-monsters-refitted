// Yard grounds by map cell height (the user's hell-yard-grounds pack, 30 September), in the game:
//  - the main yard keeps the lava ground
//  - an outpost stands on the ground of its cell's height (hell_sand1 100-104, hell_sand2 105-109,
//    hell_land1 110-119, hell_land2 120-139, hell_land3 140-159, hell_land4 160-169, hell_land5 170-174,
//    hell_land6 175+)
//  - all eight grounds build a 1000 x 500 tile (MAPBG.MakeTile) and draw in the yard
//  - a wild monster yard viewed from the map stands on its cell's ground
//  - no page errors
//   EMAIL=... PASSWORD=... SHOTS=dir node tools/test/yard-grounds-test.mjs
// Needs at least one outpost. Nothing is saved. Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+|MAPBG/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /hellyard/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
const pops = async (n = 6) => { for (let i = 0; i < n; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(250); } };
const state = () => g(() => { const G = window.__game, c = G.GLOBAL._currentCell; return { tex: G.MAP.texture, mode: G.GLOBAL.mode, h: c ? c._height : null, ground: c ? c.ioYardGround : null }; });
const BANDS = [[100, "hell_sand1"], [105, "hell_sand2"], [110, "hell_land1"], [120, "hell_land2"], [140, "hell_land3"], [160, "hell_land4"], [170, "hell_land5"], [175, "hell_land6"]];
const expected = (h) => { let e = null; for (const [lo, t] of BANDS) if (h >= lo) e = t; return e; };
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(5000);
  await pops();
  await g(() => { window.__game.BASE._blockSave = true; window.__game.WMATTACK._enabled = false; });

  // 1. the main yard
  const main = await state();
  check("the main yard keeps the lava ground", main.tex === "lava", JSON.stringify(main));

  // 2. an outpost
  await g(() => window.__game.BASE.LoadNext());
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await pops(4);
  await g(() => { window.__game.BASE._blockSave = true; });
  const op = await state();
  check("an outpost stands on its cell's ground", op.h != null && op.tex === expected(op.h) && op.ground === op.tex, JSON.stringify(op));
  await page.screenshot({ path: `${shots}/yard-grounds-outpost.png` });

  // 3. every ground builds and draws
  const tiles = await g(() => {
    const out = {}, M = window.__classByName("MAPBG");
    for (const t of ["hell_sand1", "hell_sand2", "hell_land1", "hell_land2", "hell_land3", "hell_land4", "hell_land5", "hell_land6"]) {
      const b = M.MakeTile(t);
      let lit = 0;
      if (b) { for (let i = 0; i < 50; i++) { const p = b.getPixel32((i * 197) % 1000, (i * 89) % 500) >>> 0; if ((p & 0xffffff) > 0x101010) lit++; } }
      out[t] = b ? `${b.width}x${b.height} ${lit}/50` : "none";
      window.__game.MAP.swapBG(t);
    }
    window.__game.MAP.swapBG(window.__game.GLOBAL._currentCell.ioYardGround);
    return out;
  });
  check("all eight grounds build a 1000 x 500 tile", Object.values(tiles).every((v) => /^1000x500 (4\d|50)\/50$/.test(v)), JSON.stringify(tiles));

  // 4. a wild monster yard
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  await pops(4);
  const wild = await g(() => { const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc; const c = (mc._cells || []).find((c) => c._updated && c._base > 0 && !c._userID && c._baseID && c._height >= 100); return c ? { X: c.X, Y: c.Y, h: c._height } : null; });
  if (!wild) check("a wild monster yard stands on its cell's ground", false, "no wild monster yard on screen");
  else {
    await g((w) => { const G = window.__game; const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc; const c = mc._cells.find((c) => c.X === w.X && c.Y === w.Y); G.GLOBAL._currentCell = c; G.BASE.LoadBase(null, 0, c._baseID, G.GLOBAL.e_BASE_MODE.WMVIEW, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD); }, wild);
    await page.waitForFunction(() => window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.WMVIEW && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    const w = await state();
    check("a wild monster yard stands on its cell's ground", w.tex === expected(wild.h), JSON.stringify({ ...w, cellHeight: wild.h }));
    await page.screenshot({ path: `${shots}/yard-grounds-wild.png` });
  }
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("run", false, String(e).slice(0, 300));
}
await browser.close();
