// Yard Planner toolbar: Store on a selection (with confirmation), Flip on a selection only, Undo / Redo.
//   EMAIL=... PASSWORD=... node tools/test/planner-tools-test.mjs
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
await page.waitForTimeout(5000);
await page.mouse.click(857, 242); await page.waitForTimeout(600);
// (every popup waiting: the welcome, a repairman, a level-up ... any one left covers the planner)
await page.evaluate(() => { for (let i = 0; i < 8; i++) try { window.__game.POPUPS.Next(); } catch (e) {} });
await page.waitForTimeout(400);
await page.evaluate(() => window.__game.PLANNER.Show());
await page.waitForTimeout(2500);
const popup = () => "window.__game.PLANNER.basePlanner.popup";
const tile = async (id) => { const p = await page.evaluate((id) => { const t = window.__game.PLANNER.basePlanner.popup._ioButtons[id]; const r = t.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, id); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); };
const state = () => page.evaluate(() => { const t = window.__game.PLANNER.basePlanner.popup._plannerTemplate; return { placed: t.displayData.map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" "), stored: t.inventoryData.length }; });
const select = (types) => page.evaluate((types) => { const dv = window.__game.PLANNER.basePlanner.popup.designView; dv.ioClearSelection(); for (const it of dv.displayInventory) if (types.includes(it.node.type)) dv._ioSelection.push(it); return dv._ioSelection.length; }, types);
const clickButton = (label) => page.evaluate((label) => { const B = window.__game.Button; let hit = null; const w = (o) => { if (hit || !o.visible) return; if (o instanceof B && o._txt && o._txt.text === label) hit = o; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); if (!hit) return false; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, label);

// The two buildings stacked at x 60 (types 1 and 2) flipped T-B. The test yard was made by tests and its
// Town Hall (0,0, 160 square) overlaps them, and a flip that leaves anything overlapping is refused
// ("Nothing was moved"): so the Town Hall is first moved clear on the plan (where nothing is), as a change of
// its own (in the undo history), then the flip is tried.
await page.evaluate(() => {
  const pop = window.__game.PLANNER.basePlanner.popup, dv = pop.designView;
  const th = dv.displayInventory.find((it) => it.node.type === 14);
  const others = dv.displayInventory.filter((it) => it !== th && !dv.validateBuilding(it));
  if (!th || !others.length) return;
  for (const [x, y] of [[-400, -400], [-400, 200], [200, -400], [300, 300], [-600, 0]]) {
    th.x = x; th.y = y;
    if (dv.validateBuilding(th)) break;
  }
  th.setPositionReference(); dv.updateNodeReference(th);
  pop.ioHistoryRecord();
});
await page.waitForTimeout(300);
const pair = [1, 2];
const P = pair.map((t) => `${t}@`), others = (x) => !P.some((p) => x.startsWith(p));
const s0 = await state();
// Flip T-B with the two buildings selected: they swap, nothing else moves
await select(pair);
await tile("flipy"); await page.waitForTimeout(700);
const s1 = await state();
const moved = (a, b) => { const A = new Set(a.placed.split(" ")); return b.placed.split(" ").filter((x) => !A.has(x)); };
check("flip moves only the selection", moved(s0, s1).length > 0 && moved(s0, s1).every((x) => !others(x)) && s0.placed.split(" ").filter(others).every((x) => s1.placed.includes(x)), JSON.stringify([pair, moved(s0, s1)]));

// Store with a selection: confirmation first
await select(pair);
await tile("store");
const yes = await clickButton("Yes");
check("store asks to confirm", !!yes);
if (yes) { await page.mouse.click(yes.x, yes.y); await page.waitForTimeout(800); }
const s2 = await state();
check("selection stored", s2.stored === s1.stored + 2 && !s2.placed.split(" ").some((x) => !others(x)), `${s1.stored} -> ${s2.stored}`);

// Undo twice: store undone, then flip undone; Redo twice brings both back
await tile("undo"); await page.waitForTimeout(500);
const u1 = await state();
check("undo brings the stored buildings back", u1.placed === s1.placed && u1.stored === s1.stored);
await tile("undo"); await page.waitForTimeout(500);
const u2 = await state();
check("undo again undoes the flip", u2.placed === s0.placed);
await tile("redo"); await page.waitForTimeout(500);
await tile("redo"); await page.waitForTimeout(500);
const r2 = await state();
check("redo twice restores both", r2.placed === s2.placed && r2.stored === s2.stored);
check("items on the plan match the data", await page.evaluate(() => { const p = window.__game.PLANNER.basePlanner.popup; return p.designView.displayInventory.length === p._plannerTemplate.displayData.length; }));
// a new change after an undo drops the redo
await tile("undo"); await page.waitForTimeout(500);             // back to s1: 1 and 2 on the plan
await select([6]); await tile("store");
const yes2 = await clickButton("Yes"); if (yes2) { await page.mouse.click(yes2.x, yes2.y); await page.waitForTimeout(800); }
const n1 = await state();
await tile("redo"); await page.waitForTimeout(500);
const n2 = await state();
await tile("undo"); await page.waitForTimeout(500);
check("a new change clears redo, undo still works", n1.stored === s1.stored + 2 && n2.placed === n1.placed && (await state()).placed === s1.placed);
check("no page errors", errors.length === 0, errors.join("; "));
await page.screenshot({ path: process.env.OUT || "/tmp/planner-tools.png" });
await browser.close();
