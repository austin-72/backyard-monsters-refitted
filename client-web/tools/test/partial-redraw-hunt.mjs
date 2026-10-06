// Looks for anything the partial redraw gets wrong (redraw-watch.mjs checks every frame against drawing it
// whole) while the game does as much as it can:
//  - the player's yard: idle, hovering and clicking buildings, the building menu, the store, moving and
//    placing buildings, a wild attack with monsters under a Sulfur Bomb (the glow) and a jarred tower
//  - an attack on a tribe yard: the Catapult menu opened, hovered, a shot picked, dropped (Sulfur Bomb,
//    Candy Jars), monsters flung in, towers firing, buildings burning and falling
//   EMAIL=... PASSWORD=... node tools/test/partial-redraw-hunt.mjs
// env: ONLY (yard,attack), SLOW (CPU slowdown, default 1)
// Prints one line per step (and what was drawn where it differed); ends with a check line per part.
// Nothing is saved: the yard is not saved, and the attack is made in admin test mode (turned on for it and off
// after; the account must be an admin), which attacks any yard for practice with free Catapult shots.
import { createRequire } from "node:module";
import { installWatch, watchLabel, watchTake, summarize } from "./redraw-watch.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const only = (process.env.ONLY || "yard,attack").split(",");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const { token } = await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const g = (fn, a) => page.evaluate(fn, a);
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await wait(6000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(300); }
await g(() => { window.__game.BASE._blockSave = true; window.__game.WMATTACK._enabled = false; });
if (Number(process.env.SLOW || 1) > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.SLOW) }); }
await installWatch(page);
await wait(500); await watchTake(page);

const totals = {};
const renStats = () => g(() => { const R = window.__classByName("com.monsters.rendering::Renderer"); return { ...R.ioStats }; });
const step = async (part, label, run, settle = 800) => {
  await watchLabel(page, label);
  const s0 = await renStats();
  await run();
  await wait(settle);
  const f = await watchTake(page);
  const s1 = await renStats();
  console.log(summarize(label, f) + `  [yard frames: ${s1.partial - s0.partial} in parts, ${s1.full - s0.full} whole, ${s1.idle - s0.idle} unchanged]`);
  const t = totals[part] || (totals[part] = { yard: 0, screen: 0, steps: [] });
  t.yard += f.yard.length;
  if (f.yard.length) t.steps.push(label);
};
/** Screen point (client) of a yard point. */
const yardToClient = (x, y) => g(([x, y]) => { const p = window.__game.MAP._GROUND.localToGlobal({ x, y }); return window.__player.stageToClient(p.x, p.y); }, [x, y]);
/** Screen point (client) of the middle of a display object found by fn in the page. */
const centreOf = (src) => g((src) => { const o = (0, eval)(src)(); if (!o || !o.stage) return null; const r = o.getBounds(o.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, src);
const circle = async (cx, cy, rx, ry, turns = 1, stepA = 0.15) => { for (let a = 0; a < Math.PI * 2 * turns; a += stepA) await page.mouse.move(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); };

// ---------------------------------------------------------------- the player's yard
if (only.includes("yard")) {
  await step("yard", "idle", () => wait(1500));
  await step("yard", "pointer over the buildings", () => circle(640, 420, 330, 200, 2, 0.08));
  const bld = await g(() => {
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION");
    const all = IM.getInstancesByClass(BF).filter((b) => b._type !== 17 && b._type !== 14 && b._class !== "decoration" && b._class !== "mushroom" && b._mc);
    all.sort((a, b) => Math.abs(a._mc.x) + Math.abs(a._mc.y) - (Math.abs(b._mc.x) + Math.abs(b._mc.y)));
    window.__A = all[0]; window.__from = [all[0]._mc.x, all[0]._mc.y];
    return window.__from;
  });
  const pa = await yardToClient(bld[0], bld[1]);
  await step("yard", "a building clicked (selected, its menu)", async () => { await page.mouse.click(pa.x, pa.y); await wait(1200); await page.mouse.move(pa.x + 30, pa.y + 10); });
  await step("yard", "menu closed", async () => { await g(() => { try { window.__game.BASE.BuildingDeselect(); } catch (e) {} try { window.__game.POPUPS.Next(); } catch (e) {} }); });
  await step("yard", "the store opened and closed", async () => { await g(() => { try { window.__game.STORE.ShowB(1, 0); } catch (e) {} }); await wait(1500); await g(() => { try { window.__game.STORE.Hide(); } catch (e) {} }); });
  await step("yard", "building highlighted and back", async () => { await g(() => { window.__A.highlight(0xffffff); }); await wait(400); await g(() => { window.__A.disableHighlight(); }); });
  await page.mouse.move(pa.x, pa.y);
  await step("yard", "a building dragged in move mode", async () => { await g(() => window.__A.StartMove()); await circle(640, 400, 220, 130, 1, 0.1); });
  await step("yard", "put back", async () => { await g(() => { const a = window.__A; a._mc.x = window.__from[0]; a._mc.y = window.__from[1]; a._ioFollowKey = "x"; a.StopMoveB(); window.__game.BASE._blockSave = true; }); });
  await step("yard", "a new building placed and cancelled", async () => {
    await g(() => { const B = window.__game.BASE; const t = [6, 3, 4, 21, 5].find((t) => !B.CanBuild(t, false).error); window.__P = t ? B.addBuildingB(t) : null; });
    await circle(640, 400, 200, 110, 1, 0.12);
    await g(() => { try { window.__P.Cancel(); } catch (e) {} });
  });
  // a wild attack: monsters under a Sulfur Bomb, walking and fighting
  await step("yard", "a wild attack, monsters under a Sulfur Bomb (red glow)", async () => {
    await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._history.lastattack = 0; G._flags.io_wildlast = 0; W._queued = { type: 7, attack: { IC2: 6, IC1: 8 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC2: 60, IC1: 60 }, warned: 1, t: 1, level: 10 }; W.LaunchQueuedAttack(); });
    await wait(2500);
    await g(() => {
      const CR = window.__classByName("CREEPS"), Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield");
      window.__shielded = 0;
      for (const k in CR._creeps) { const c = CR._creeps[k]; if (c && !c._dead) { c.addComponent(new Sh(1.5, 3, 12), "puttyBombEnrage"); window.__shielded++; } }
    });
  }, 3000);
  await step("yard", "the glow turning orange, then yellow", () => wait(6000));
  await step("yard", "a tower jarred", async () => {
    await g(() => {
      const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION");
      const t = IM.getInstancesByClass(BF).find((b) => b._class === "tower" && b.ApplyJar);
      if (t) { window.__jt = t; try { t.ApplyJar(0, 4); } catch (e) {} }
    });
  }, 5000);
  await step("yard", "the attack goes on", () => wait(5000));
}

// ---------------------------------------------------------------- an attack on a tribe yard, with the Catapult
if (only.includes("attack")) {
  // admin test mode (the account must be an admin): any yard can be attacked for practice, nothing written,
  // every Catapult shot free; the home yard is loaded again so the game knows
  const testMode = (action) => g(async ([server, action]) => { const r = await fetch(server + "admin/testmode", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body: `action=${action}` }); try { return await r.json(); } catch (e) { return { status: r.status }; } }, [server, action]);
  console.log(`admin test mode: ${JSON.stringify(await testMode("on"))}`);
  await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0));
  await wait(3000);
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && window.__game.BASE._buildingCount > 5, null, { timeout: 60000 });
  await wait(3000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(300); }
  // a tribe yard near home (from the map's cells), attacked the way the Attack button does it
  const started = await g(async (server) => {
    const G = window.__game, home = [G.GLOBAL._mapHome.x, G.GLOBAL._mapHome.y];
    const r = await fetch(server + "worldmapv2/getarea", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body: `x=${Math.max(0, home[0] - 5)}&y=${Math.max(0, home[1] - 5)}` });
    const area = await r.json();
    let tribe = null;
    for (const x in area.data || {}) for (const y in area.data[x]) { const c = area.data[x][y]; if (!tribe && c.b == 1 && c.i > 99) tribe = [Number(x), Number(y), c.bid, c.l]; }
    if (!tribe) return "no tribe yard near home";
    G.BASE.LoadBase(null, 0, tribe[2], "wmattack", false, G.EnumYardType.MAIN_YARD);
    return `attacking tribe yard ${tribe[2]} at ${tribe[0]},${tribe[1]} (level ${tribe[3]})`;
  }, server);
  console.log(started);
  await page.waitForFunction(() => window.__game.GLOBAL.mode === "wmattack" && window.__game.BASE._buildingCount > 5, null, { timeout: 60000 });
  await wait(5000);
  for (let i = 0; i < 3; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(300); }
  await watchTake(page);
  await step("attack", "the tribe yard, idle", () => wait(1500));
  await step("attack", "pointer over the tribe yard", () => circle(640, 430, 330, 200, 1, 0.08));
  const catBtn = await centreOf(`() => { const t = window.__classByName("UI2")._top; return t && t._catapult; }`);
  console.log(`catapult button: ${JSON.stringify(catBtn)}`);
  if (catBtn) {
    const itemAt = async (i) => centreOf(`() => { const c = window.__classByName("UI2")._top._catapult; const items = []; const walk = (o) => { if (o instanceof window.__classByName("CATAPULTITEM") && o.visible) items.push(o); for (const k of o.$children ?? []) walk(k); }; walk(c); items.sort((a, b) => a.getBounds(a.stage).y - b.getBounds(b.stage).y || a.getBounds(a.stage).x - b.getBounds(b.stage).x); return items[${i}]; }`);
    await step("attack", "the Catapult menu opened", async () => { await page.mouse.move(catBtn.x, catBtn.y); await page.mouse.click(catBtn.x, catBtn.y); await wait(600); });
    const n = await g(() => { const c = window.__classByName("UI2")._top._catapult; let n = 0; const walk = (o) => { if (o instanceof window.__classByName("CATAPULTITEM") && o.visible) n++; for (const k of o.$children ?? []) walk(k); }; walk(c); return n; });
    console.log(`catapult items: ${n}`);
    await step("attack", "the Catapult menu: pointer over every shot", async () => {
      for (let i = 0; i < n; i++) { const p = await itemAt(i); if (!p) continue; await page.mouse.move(p.x, p.y, { steps: 3 }); await wait(250); }
      for (let i = n - 1; i >= 0; i -= 2) { const p = await itemAt(i); if (!p) continue; await page.mouse.move(p.x, p.y, { steps: 2 }); await wait(120); }
    });
    await step("attack", "the Catapult menu closed (pointer away)", async () => { await page.mouse.move(640, 600, { steps: 6 }); await wait(1200); });
    // a shot: Sulfur Bomb (pu), then Candy Jars (pb), each picked and dropped on the yard
    for (const [label, id] of [["a Sulfur Bomb", "pu3"], ["Candy Jars", "pb3"], ["a Twig bomb", "tw3"]]) {
      await step("attack", `the Catapult menu opened again, ${label} picked`, async () => {
        await page.mouse.move(catBtn.x, catBtn.y); await page.mouse.click(catBtn.x, catBtn.y); await wait(500);
        const p = await centreOf(`() => { const c = window.__classByName("UI2")._top._catapult; let hit = null; const walk = (o) => { if (!hit && o instanceof window.__classByName("CATAPULTITEM") && o._bombid === "${id}") hit = o; for (const k of o.$children ?? []) walk(k); }; walk(c); return hit; }`);
        if (p) { await page.mouse.move(p.x, p.y, { steps: 3 }); await wait(200); await page.mouse.click(p.x, p.y); }
        else console.log(`   (no ${id} in the menu)`);
        await circle(640, 420, 200, 120, 1, 0.12); // the drop zone following the pointer
      });
      await step("attack", `${label} dropped`, async () => { await page.mouse.click(640, 420); }, 3500);
    }
  }
  await step("attack", "monsters flung in", async () => {
    await g(() => {
      const G = window.__game, Point = window.__classByName("flash.geom::Point");
      const types = ["IC1", "IC2", "IC4"];
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, r = 520; const p = G.GRID.ToISO(Math.cos(a) * r, Math.sin(a) * r, 0); G.CREEPS.Spawn(types[i % 3], G.MAP._BUILDINGTOPS, "bounce", new Point(p.x, p.y), Math.random() * 360); }
    });
  }, 4000);
  for (let i = 1; i <= 4; i++) await step("attack", `the battle, ${i * 5} s on`, () => wait(5000), 0);
  console.log(`admin test mode off: ${JSON.stringify(await testMode("off"))}`);
}

for (const [part, t] of Object.entries(totals)) check(`${part}: the yard drawn in parts is the yard drawn whole in every frame`, t.yard === 0, `${t.yard} frame(s) differ${t.steps.length ? " in: " + t.steps.join("; ") : ""}`);
check("no page errors", errors.length === 0, [...new Set(errors)].slice(0, 3).join("; "));
await browser.close();
