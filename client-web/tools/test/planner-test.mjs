// Yard Planner on a yard with a ring of 220 walls (added in the page, not saved):
//  - the yard is not drawn while the planner covers it, and is drawn again once it closes
//  - moving 60 selected walls together: a free spot keeps them there, a taken spot sends them back
//  - frame rate while dragging them, with the CPU slowed down like a phone (CPU_SLOWDOWN, default 4)
//   EMAIL=... PASSWORD=... node tools/test/planner-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.click(857, 242); await page.waitForTimeout(800);
await page.evaluate(() => {
  const B = window.__game.BASE; B._blockSave = true;
  let id = 1000;
  const add = (X, Y) => { const b = B.addBuildingC(17); if (b) b.Setup({ X, Y, t: 17, l: 1, id: id++ }); };
  for (let x = -300; x <= 300; x += 10) { add(x, -250); add(x, 250); }
  for (let y = -240; y < 250; y += 10) { add(-300, y); add(300, y); }
});
// the walls raise the yard's level: close the "Congratulations" popups, they would sit over the planner
await page.waitForTimeout(1500);
await page.evaluate(() => { for (let i = 0; i < 5; i++) try { window.__game.POPUPS.Next(); } catch (e) {} });
await page.waitForTimeout(800);
const yardVersion = () => page.evaluate(() => window.__game.MAP._canvas.$version);
const v0 = await yardVersion(); await page.waitForTimeout(500);
check("yard drawn before", (await yardVersion()) > v0);
await page.evaluate(() => window.__game.PLANNER.Show());
await page.waitForTimeout(3000);
const v1 = await yardVersion(); await page.waitForTimeout(1000);
check("yard not drawn behind the planner", (await yardVersion()) === v1);

const pick = (n, inner = false) => page.evaluate(([n, inner]) => {
  const dv = window.__game.PLANNER.basePlanner.popup.designView;
  dv.ioClearSelection();
  const walls = []; for (const it of dv.displayInventory) if (it.node && it.node.type === 17) walls.push(it);
  if (inner) { // the middle of the top row: moving it inward touches nothing
    const top = Math.min(...walls.map((w) => w.y)), xs = walls.filter((w) => w.y === top).map((w) => w.x);
    const lo = Math.min(...xs), hi = Math.max(...xs), q = (hi - lo) / 4;
    walls.splice(0, walls.length, ...walls.filter((w) => w.y === top && w.x > lo + q && w.x < hi - q));
  }
  walls.sort((a, b) => a.y - b.y || a.x - b.x);
  const sel = walls.slice(0, n);
  for (const it of sel) dv._ioSelection.push(it);
  window.__sel = sel; window.__start = sel.map((it) => [it.x, it.y]);
  const r = sel[0].getBounds(window.__player.stage);
  return { n: sel.length, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2), scale: dv._canvas.scaleX };
}, [n, inner]).then(async (p) => {
  // the pointer on the building, then pick the group up (what clicking a selected building does)
  await page.mouse.move(p.at.x, p.at.y);
  await page.evaluate(() => window.__game.PLANNER.basePlanner.popup.designView.ioGroupPickUp(window.__sel[0]));
  return p;
});
const drop = () => page.evaluate(() => { window.__game.PLANNER.basePlanner.popup.designView.ioGroupDrop(); return window.__sel.map((it, i) => [it.x - window.__start[i][0], it.y - window.__start[i][1]]); });

// 1. a free spot: the middle of the top row, 40 planner units inward
let p = await pick(60, true);
await page.mouse.move(p.at.x, p.at.y + 40 * p.scale, { steps: 8 });
let moved = await drop();
check("group move to a free spot stays", moved.every(([dx, dy]) => dx === moved[0][0] && dy === moved[0][1]) && moved[0][1] !== 0, JSON.stringify(moved[0]));

// 2. onto the town hall: everything goes back
p = await pick(20);
const th = await page.evaluate(() => { const dv = window.__game.PLANNER.basePlanner.popup.designView; for (const it of dv.displayInventory) if (it.node && it.node.type === 14) { const r = it.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); } return null; });
await page.mouse.move(th.x, th.y, { steps: 8 });
moved = await drop();
check("group move onto a building goes back", moved.every(([dx, dy]) => dx === 0 && dy === 0), JSON.stringify(moved[0]));

// 3. the quick distance check gives the same answers as testing every building, at a few offsets
p = await pick(60);
const same = await page.evaluate(() => {
  const dv = window.__game.PLANNER.basePlanner.popup.designView, sel = window.__sel, start = window.__start;
  const HT = window.__classByName("com.monsters.baseplanner.components::HitTestBitmap");
  const members = new Set(sel);
  const full = (it) => { for (const o of dv.displayInventory) if (o !== it && !members.has(o) && HT.complexHitTestObject(it.mc, o.mc)) return false; return dv.ioInsideYard(it); };
  let checked = 0, differ = 0, invalid = 0;
  for (const [dx, dy] of [[0, 0], [0, 5], [0, 245], [5, 250], [150, 250], [-5, 480]]) {
    sel.forEach((it, i) => { it.x = start[i][0] + dx; it.y = start[i][1] + dy; });
    for (const it of sel) { const a = dv.ioValidateInGroup(it), b = full(it); checked++; if (a !== b) differ++; if (!b) invalid++; }
  }
  sel.forEach((it, i) => { it.x = start[i][0]; it.y = start[i][1]; });
  return { checked, differ, invalid };
});
check("quick check matches the full check", same.differ === 0 && same.invalid > 0, JSON.stringify(same));

// 4. frame rate while dragging 60 walls, phone-like CPU
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU_SLOWDOWN || 4) });
await page.evaluate(() => { const s = window.__player.stats; s.frames = s.scriptMs = s.renderMs = 0; window.__t0 = performance.now(); });
for (let i = 0; i < 240; i++) { const a = i / 40; await page.mouse.move(p.at.x + Math.sin(a) * 120, p.at.y + Math.cos(a * 0.7) * 80); }
const perf = await page.evaluate(() => { const s = window.__player.stats, secs = (performance.now() - window.__t0) / 1000; return { fps: +(s.frames / secs).toFixed(1), script: +(s.scriptMs / s.frames).toFixed(1), render: +(s.renderMs / s.frames).toFixed(1) }; });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
check("dragging 60 walls at 1/" + (process.env.CPU_SLOWDOWN || 4) + " CPU", perf.fps >= 10, JSON.stringify(perf));
await drop();

await page.evaluate(() => window.__game.PLANNER.Hide());
await page.waitForTimeout(800);
const v2 = await yardVersion(); await page.waitForTimeout(500);
check("yard drawn again after closing", (await yardVersion()) > v2);
check("no page errors", errors.length === 0, errors.join("; "));
await browser.close();
