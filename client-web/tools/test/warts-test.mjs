// Warts in place of the yard's mushrooms (the user's art, 30 September), in the game:
//  - one wart of each of the six frames is drawn from the embedded art (_assets/warts/wartN.png), each bitmap its
//    frame's size and at its frame's offset, not smoothed; its shadow (wartN_shadow.jpg) likewise, drawn MULTIPLY
//  - the building is called "Wart" (#b_wart#) and its thumbnail is buildingthumbs/7_inferno.png
//  - the worker's lines when picking one are the warts' (pop_wart_msg2-4)
//  - a golden wart shows "Your worker struck gold!", the golden wart line and popups/goldwart.png
//  - the spawn picks frames 1 to 6 (the tall sixth wart as well)
//  - new warts grow on the yard or just past its edge (up to 200 out, as in the stock game: still on screen and
//    picked like any other), never further
//  - a wild monster yard grows no warts when visited (it sprouted a fresh patch every time)
//  - no page errors, no missing wart art
//   EMAIL=... PASSWORD=... SHOTS=dir node tools/test/warts-test.mjs
// Saving is blocked; the golden pick is paid as usual (3 or 8 Shiny). Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [], loaded = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (/wart|7_inferno/i.test(r.url())) { loaded.push(r.url()); if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`); } });
const g = (fn, arg) => page.evaluate(fn, arg);
const SPRITE = [[48, 42, -27, -18.5], [48, 29, -19, -5.5], [41, 38, -20.5, -21.5], [43, 39, -22.5, -12], [49, 44, -24.5, -20.5], [48, 70, -24, -45.5]];
const SHADOW = [[57, 33, -28, 0], [58, 36, -18.5, -1], [58, 36, -17, -5], [59, 37, -21, -0.5], [58, 37, -17, 2.5], [73, 41, -17.5, 3]];
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
  await g(() => { window.__game.BASE._blockSave = true; window.__game.WMATTACK._enabled = false; });

  // 1. six warts, one per frame, and how each is drawn
  const drawn = await g(() => {
    const G = window.__game, BF = window.__classByName("BFOUNDATION");
    window.__warts = [];
    const out = [];
    for (let n = 1; n <= 6; n++) {
      const m = G.BASE.addBuildingC(7);
      m.Setup({ X: -200 + n * 45, Y: 250, id: 990 + n, t: 7, frame: n });
      window.__warts.push(m);
      const layer = (i) => {
        const rd = m._rasterData[i]; const mc = rd ? rd.data : null; const b = mc && mc.numChildren ? mc.getChildAt(0) : null;
        return b && b.bitmapData ? { w: b.bitmapData.width, h: b.bitmapData.height, x: b.x, y: b.y, smooth: !!b.smoothing, blend: rd._blendMode ?? rd.renderer_friend$_blendMode ?? null, mcBlend: mc.blendMode } : null;
      };
      out.push({ frame: m._mushroomFrame, top: layer(BF._RASTERDATA_TOP), shadow: layer(BF._RASTERDATA_SHADOW) });
    }
    return out;
  });
  let artOk = drawn.length === 6, detail = [];
  drawn.forEach((d, i) => {
    const s = SPRITE[i], h = SHADOW[i];
    const ok = d.top && d.shadow && d.top.w === s[0] && d.top.h === s[1] && d.top.x === s[2] && d.top.y === s[3] && !d.top.smooth
      && d.shadow.w === h[0] && d.shadow.h === h[1] && d.shadow.x === h[2] && d.shadow.y === h[3] && d.shadow.mcBlend === "multiply";
    if (!ok) { artOk = false; detail.push(`frame ${i + 1}: ${JSON.stringify(d)}`); }
  });
  check("six warts drawn from the embedded art, sizes and offsets per frame", artOk, detail.join("; "));
  check("the wart art is loaded", loaded.filter((u) => /_assets\/warts\/wart\d(_shadow)?\.(png|jpg)/.test(u)).length >= 12, `${loaded.length} requests`);
  const mid = await g(() => { const w = window.__warts; return [(w[0].x + w[5].x) / 2, (w[0].y + w[5].y) / 2]; });
  await g((p) => window.__game.MAP.Focus(p[0], p[1]), mid);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${shots}/warts-yard.png` });

  // 2. its name, thumbnail and the worker's lines
  const words = await g(() => {
    const G = window.__game, p = G.GLOBAL._buildingProps[6];
    return { name: G.KEYS.Get(p.name), thumb: p.thumbImgData.baseurl + p.thumbImgData[1].img, lines: ["pop_wart_msg2", "pop_wart_msg3", "pop_wart_msg4"].map((k) => G.KEYS.Get(k)) };
  });
  check("called Wart, with the Inferno thumbnail", words.name === "Wart" && words.thumb === "buildingthumbs/7_inferno.png", JSON.stringify(words));
  const thumb = await fetch(`${server}assets/buildingthumbs/7_inferno.png`);
  check("the thumbnail is served", thumb.status === 200, String(thumb.status));
  const said = await g(async () => {
    const G = window.__game, Rndm = window.__classByName("com.gskinner.utils::Rndm"), W = window.__classByName("WORKERS");
    const m = window.__warts[0];
    for (let dx = 0; dx < 400; dx++) { const x = m.x + dx; if (Math.floor(new Rndm(((x * m.y) | 0) >>> 0).random() * 4) != 0) { m.x = x; break; } }
    const said = []; const keep = W.Say; W.Say = function (t, ...r) { said.push(t); return keep.call(this, t, ...r); };
    G.MUSHROOMS.Pick(m); W.Say = keep;
    return said;
  });
  check("the worker's line is a wart's", said.length === 1 && words.lines.includes(said[0]), JSON.stringify(said));

  // 3. a golden wart
  const gold = await g(async () => {
    const G = window.__game, Rndm = window.__classByName("com.gskinner.utils::Rndm");
    const m = window.__warts[2];
    for (let dx = 0; dx < 400; dx++) { const x = m.x + dx; if (Math.floor(new Rndm(((x * m.y) | 0) >>> 0).random() * 4) == 0) { m.x = x; break; } }
    G.MUSHROOMS.Pick(m);
    await new Promise((r) => setTimeout(r, 1500));
    const texts = []; const T = window.__classByName("flash.text::TextField");
    const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) texts.push(o.text); for (const ch of o.$children ?? []) walk(ch); };
    walk(window.__player.stage);
    return texts.filter((t) => /gold|wart/i.test(t));
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${shots}/warts-golden.png` });
  check("a golden wart's popup and words", gold.some((t) => /struck gold/.test(t)) && gold.some((t) => /golden wart worth \d+ Shiny/.test(t) && /Warts grow back/.test(t)), JSON.stringify(gold));
  check("the golden wart's picture is loaded", loaded.some((u) => /popups\/goldwart\.png/.test(u)));
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });

  // 4. the spawn uses all six frames
  const frames = await g(() => {
    const G = window.__game, keep = Math.random, seen = {};
    const list = () => Object.values(G.BASE._buildingsMushrooms || {});
    for (const r of [0, 0.5, 0.99]) {
      const before = new Set(list());
      let first = true;
      Math.random = () => (first ? ((first = false), r) : keep());
      try { G.MUSHROOMS.Spawn(1); } finally { Math.random = keep; }
      for (const b of list()) if (!before.has(b)) { seen[b._mushroomFrame] = 1; window.__warts.push(b); }
    }
    return Object.keys(seen).map(Number).sort();
  });
  check("the spawn can pick the sixth wart", frames.includes(6), JSON.stringify(frames));

  // 5. new warts stay on the map
  const placed = await g(() => {
    const G = window.__game, before = new Set(Object.values(G.BASE._buildingsMushrooms || {}));
    for (let i = 0; i < 40; i++) G.MUSHROOMS.Spawn(1);
    const fresh = Object.values(G.BASE._buildingsMushrooms || {}).filter((b) => !before.has(b));
    const GRID = window.__classByName("GRID");
    const off = fresh.filter((b) => { const p = GRID.FromISO(b.x, b.y); return Math.abs(p.x) > G.GLOBAL._mapWidth * 0.5 + 200 || Math.abs(p.y) > G.GLOBAL._mapHeight * 0.5 + 200; });
    for (const b of fresh) window.__warts.push(b);
    return { n: fresh.length, off: off.length, half: [G.GLOBAL._mapWidth * 0.5, G.GLOBAL._mapHeight * 0.5] };
  });
  check("new warts grow on the yard or up to 200 past its edge, never further", placed.n >= 30 && placed.off === 0, JSON.stringify(placed));

  await g(() => { for (const m of window.__warts) { try { if (m._mc && m._mc.parent) m.RecycleC(); } catch (e) {} } });

  // 6. a wild monster yard visited from the map grows none
  await g(() => window.__game.BASE.LoadNext());
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await g(() => { window.__game.BASE._blockSave = true; for (let i = 0; i < 4; i++) { try { window.__game.POPUPS.Next(); } catch (e) {} } });
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  const wild = await g(() => { const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc; const c = (mc._cells || []).find((c) => c._updated && c._base > 0 && !c._userID && c._baseID && c._height >= 100); if (!c) return null; const G = window.__game; G.GLOBAL._currentCell = c; G.BASE.LoadBase(null, 0, c._baseID, G.GLOBAL.e_BASE_MODE.WMVIEW, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD); return [c.X, c.Y]; });
  if (!wild) check("a wild monster yard grows no warts", false, "no wild monster yard on screen");
  else {
    await page.waitForFunction(() => window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.WMVIEW && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    const n = await g(() => window.__game.BASE.buildings.filter((b) => b._type == 7).length + Object.keys(window.__game.BASE._buildingsMushrooms || {}).length);
    check("a wild monster yard grows no warts", n === 0, `${n} on ${wild}`);
  }
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("run", false, String(e).slice(0, 300));
}
await browser.close();
