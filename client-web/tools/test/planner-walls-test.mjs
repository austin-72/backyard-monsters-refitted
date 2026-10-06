// Yard Planner wall line (PlannerDesignView.ioPlaceWallLine), 1 October: lines of walls placed from storage.
// Before, each wall placed went through the hand-placing path, which took the last wall off the storage list
// (not the one placed) and put another wall on the mouse, so a wall already placed came up again and was
// placed twice: two walls on one spot and a gap in the line.
//  - five lines (straight, sloped, upright, one partly blocked, one that runs storage out): each places as
//    many walls as it says, each wall its own, none on another's spot, each drawn where its data says
//  - nothing left on the mouse; the storage list counts what is left (and empties when it runs out)
//  - drawn again from its data (as reopening the planner does) the walls are where they were
//  - after a line, a wall taken from the storage list by hand still places (one left in storage less)
//  - no page errors
//   EMAIL=... PASSWORD=... node tools/test/planner-walls-test.mjs
// Puts 60 walls in the test yard in the game only (saving blocked) and stores them in the planner; the plan
// is not applied. Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }
  const made = await g(() => { const B = window.__game.BASE; B._blockSave = true; window.__game.WMATTACK._enabled = false; let n = 0; for (let i = 0; i < 60; i++) { const b = B.addBuildingC(17); b.Setup({ X: -480 + (i % 20) * 20, Y: 300 + Math.floor(i / 20) * 20, id: 8000 + i, t: 17, l: 1 }); n++; } return n; });
  await g(() => window.__game.PLANNER.Show());
  await page.waitForTimeout(2500);
  const stored = await g(() => { const pop = window.__game.PLANNER.basePlanner.popup, dv = pop.designView; dv.ioClearSelection(); for (const it of [...dv.displayInventory]) if (it.node.type === 17) dv._ioSelection.push(it); dv.ioStoreSelection(); return pop.ioWallsLeft(); });
  check("60 walls in storage", made === 60 && stored >= 60, `${made} made, ${stored} in storage`);

  // the storage list's number for walls ("" when the walls' row is gone)
  const listCount = `(() => { const pop = window.__game.PLANNER.basePlanner.popup, T = window.__classByName("flash.text::TextField"); let n = ""; const walk = (o) => { if (!o || !o.visible || o.alpha === 0) return; if (o instanceof T && /^\\d+$/.test(o.text)) n = o.text; for (const c of o.$children ?? []) walk(c); }; walk(pop.buildingExplorer); return n; })()`;
  const lines = await g(([listCount]) => {
    const pop = window.__game.PLANNER.basePlanner.popup, dv = pop.designView, P = window.__classByName("flash.geom::Point");
    const said = []; const keep = dv.ioSay; dv.ioSay = function (m) { said.push(m); };
    const out = [];
    for (const [a, b] of [[[-400, -200], [-100, -200]], [[-400, -150], [-100, -60]], [[0, -300], [0, -50]], [[100, 100], [300, 260]], [[200, -300], [460, -300]]]) {
      const before = new Set(dv.displayInventory), left0 = pop.ioWallsLeft();
      dv.ioPlaceWallLine(new P(a[0], a[1]), new P(b[0], b[1]));
      const fresh = dv.displayInventory.filter((it) => !before.has(it));
      const m = /Placed (\d+) wall/.exec(said[said.length - 1] || "");
      out.push({ said: said[said.length - 1], placed: m ? Number(m[1]) : 0, added: fresh.length, taken: left0 - pop.ioWallsLeft(), left: pop.ioWallsLeft(), list: eval(listCount), onMouse: dv._isAddingBuilding });
    }
    dv.ioSay = keep;
    return out;
  }, [listCount]);
  check("each line places as many walls as it says, and storage gives up exactly those", lines.every((l) => l.placed > 0 && l.added === l.placed && l.taken === l.placed), JSON.stringify(lines.map((l) => [l.said, l.added, l.taken])));
  check("...nothing left on the mouse after a line", lines.every((l) => !l.onMouse), JSON.stringify(lines.map((l) => l.onMouse)));
  check("...the storage list counts what is left (gone once storage runs out)", lines.every((l) => (l.left > 0 ? l.list === String(l.left) : l.list === "")), JSON.stringify(lines.map((l) => [l.left, l.list])));
  check("...one line partly blocked, the last one runs storage out", /blocked/.test(lines[3].said) && /out of walls/.test(lines[4].said), `${lines[3].said} | ${lines[4].said}`);

  const plan = await g(() => {
    const pop = window.__game.PLANNER.basePlanner.popup, dv = pop.designView;
    const items = dv.displayInventory.filter((it) => it.node.type === 17);
    const spots = items.map((it) => it.x + "," + it.y);
    const data = pop._plannerTemplate.displayData.filter((n) => n.type === 17);
    const before = spots.slice().sort().join(" ");
    pop.redraw();
    const after = dv.displayInventory.filter((it) => it.node.type === 17).map((it) => it.x + "," + it.y).sort().join(" ");
    return { items: items.length, data: data.length, sharedNodes: items.length - new Set(items.map((it) => it.node)).size, sameSpot: spots.length - new Set(spots).size, offData: items.filter((it) => it.x !== it.node.x || it.y !== it.node.y).length, redrawSame: before === after };
  });
  check("every wall its own (no two walls sharing one wall of the data), none on another's spot", plan.items === 60 && plan.data === 60 && plan.sharedNodes === 0 && plan.sameSpot === 0, JSON.stringify(plan));
  check("...each drawn where its data says, and drawn again from the data (reopening) in the same places", plan.offData === 0 && plan.redrawSame, JSON.stringify(plan));

  // a wall stored again and placed by hand from the storage list
  const hand = await g(() => {
    const pop = window.__game.PLANNER.basePlanner.popup, dv = pop.designView;
    const it = dv.displayInventory.find((x) => x.node.type === 17);
    dv.storeBuilding(it);
    const left0 = pop.ioWallsLeft();
    const node = pop._plannerTemplate.inventoryData.find((n) => n.type === 17 && pop._plannerTemplate.displayData.indexOf(n) === -1);
    dv.addInventoryItem(node);
    const carried = dv._selectMoveTarget;
    carried.x = 400; carried.y = 300;
    dv.stopDragBuilding(carried, true);
    return { left0, left: pop.ioWallsLeft(), placed: pop._plannerTemplate.displayData.indexOf(carried.node) !== -1, at: [carried.node.x, carried.node.y] };
  });
  check("after the lines a wall placed by hand from the storage list still places", hand.left0 === 1 && hand.left === 0 && hand.placed, JSON.stringify(hand));
  await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/planner-walls.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("the test ran", false, String(e.stack || e).slice(0, 400));
}
await browser.close();
