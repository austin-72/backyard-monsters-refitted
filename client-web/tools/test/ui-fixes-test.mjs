// Smaller fixes of 27 September:
//  - Moloch's Gauntlet's button sits in the workers' column on the right, centred under the fifth worker
//    with a gap (it was the last of the icons on the left)
//  - clicking buildings: each building's hit area is made from its own pictures (and its footprint), so
//    its art clicks and the empty ground beside it does not; the building under the mouse glows white,
//    and only while the mouse is on it
//  - the register form says "We recommend a fake email and a password you do not use elsewhere!" in a
//    dark red glow that pulses (not on the login form)
//  - Balthazar does not set off traps (their blast still hurts him if something else sets one off near
//    him); Quake towers neither fire at him nor hurt him; ground monsters still set both off
//  - a Sulfur Bomb reaches a monster that is burrowed
//  - no page errors
//   EMAIL=... PASSWORD=... SHOTS=dir node tools/test/ui-fixes-test.mjs
// A wild attack is launched on the yard (not saved). Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
};
try {
  // 1. the register form (logged out)
  const auth = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(auth);
  await auth.goto(server);
  await auth.waitForFunction(() => window.__player, null, { timeout: 30000 });
  await auth.waitForTimeout(3000);
  const warning = () => auth.evaluate(() => { let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === "ioRegisterWarning") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const f = hit.filters && hit.filters[0]; let v = hit.visible, p = hit.parent; while (p) { v = v && p.visible; p = p.parent; } return { visible: v, text: hit.text, glow: f ? { color: f.color, blur: Math.round(f.blurX * 10) / 10, strength: Math.round(f.strength * 100) / 100, alpha: Math.round(f.alpha * 100) / 100 } : null }; });
  const onLogin = await warning();
  check("the login form has no warning", onLogin && onLogin.visible === false, JSON.stringify(onLogin));
  const link = await auth.evaluate(() => { let hit = null; const walk = (o) => { if (hit || !o || o.$visible === false) return; if (/Register here/.test(o.$text || "")) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
  await auth.mouse.click(link.x, link.y);
  await auth.waitForTimeout(600);
  const w1 = await warning();
  await auth.waitForTimeout(290);
  const w2 = await warning();
  await auth.waitForTimeout(290);
  const w3 = await warning();
  await auth.screenshot({ path: `${shots}/ui-1-register.png` });
  check("the register form shows it", w1 && w1.visible && w1.text === "We recommend a fake email and a password you do not use elsewhere!", JSON.stringify(w1));
  check("in a dark red glow", w1.glow && w1.glow.color === 0x8b0000, JSON.stringify(w1.glow));
  check("that pulses (its glow changes over time)", JSON.stringify(w1.glow) !== JSON.stringify(w2.glow) && JSON.stringify(w2.glow) !== JSON.stringify(w3.glow), JSON.stringify([w1.glow, w2.glow, w3.glow]));
  await auth.close();

  // 2. the yard
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  const g = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; });

  // the Gauntlet button
  const gb = await g(() => {
    const U = window.__classByName("UI_WORKERS"); const top = window.__game.GLOBAL._layerUI;
    let btn = null; const walk = (o) => { if (btn || !o) return; if (o.name === "ioGauntlet") { btn = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage);
    if (!btn) return null;
    const w5 = U._workers[4].mc.getBounds(window.__player.stage), w4 = U._workers[3].mc.getBounds(window.__player.stage);
    const b = btn.getBounds(window.__player.stage);
    const ring = btn.localToGlobal({ x: 20.75, y: 20.75 - 25 });
    const mid = btn.localToGlobal({ x: 20.75, y: 20.75 });
    return { visible: btn.visible, parentIsWorkers: btn.parent === U._mc, w5: [w5.x + w5.width / 2, w5.y + w5.height], mid: [mid.x, mid.y], ringTop: ring.y, pitch: w5.y - w4.y };
  });
  check("the Gauntlet button is in the workers' column", gb && gb.parentIsWorkers && gb.visible, JSON.stringify(gb));
  check("centred under the fifth worker", gb && Math.abs(gb.mid[0] - gb.w5[0]) < 1.5, JSON.stringify(gb));
  check("with a gap below it (about 14 pixels to its gold ring)", gb && gb.ringTop - gb.w5[1] >= 10 && gb.ringTop - gb.w5[1] <= 18, JSON.stringify(gb));
  // its tip, from the left
  const tipAt = await g(() => { let btn = null; const walk = (o) => { if (btn || !o) return; if (o.name === "ioGauntlet") { btn = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); const p = btn.localToGlobal({ x: 20.75, y: 20.75 }); return window.__player.stageToClient(p.x, p.y); });
  await page.mouse.move(tipAt.x, tipAt.y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${shots}/ui-2-gauntlet.png` });
  const tip = await g(() => { const T = window.__classByName("flash.text::TextField"); const out = []; const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T && /Gauntlet/.test(o.text)) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__game.GLOBAL._layerUI); return out; });
  check("hovering it shows its tip", tip.length > 0, JSON.stringify(tip));

  // clicking and hovering buildings: the Under Hall
  const hall = await g(() => {
    const h = window.__game.GLOBAL.townHall; const hit = h._ioHit;
    if (!hit) return null;
    // a solid pixel of its top picture near the very top, and a point 30 above the picture (empty ground)
    const top = h._rasterData[2]; const bmd = top.data; const off = h._offsets[2];
    let solid = null;
    for (let y = 0; y < bmd.height && !solid; y++) for (let x = 0; x < bmd.width; x++) if ((bmd.getPixel32(x, y) >>> 24) > 200) { solid = { x: off.x + x, y: off.y + y + 3 }; break; }
    // (the hit clip sits at the corner of the picture its old shape was drawn for)
    const ho = h._offsets[h.m_hitOffsetIndex];
    const toClient = (lx, ly) => { const p = h._mcHit.localToGlobal({ x: lx - ho.x, y: ly - ho.y }); return window.__player.stageToClient(p.x, p.y); };
    const hitAt = (lx, ly) => { const p = h._mcHit.localToGlobal({ x: lx - ho.x, y: ly - ho.y }); return h._mcHit.hitArea === hit && hit.hitTestPoint(p.x, p.y, true); };
    const mid = { x: off.x + bmd.width / 2, y: off.y + bmd.height * 0.6 };
    return { hitArea: h._mcHit.hitArea === hit, rects: hit.graphics ? true : false, solid: toClient(solid.x, solid.y), solidHit: hitAt(solid.x, solid.y), air: toClient(solid.x, off.y - 30), airHit: hitAt(solid.x, off.y - 30), mid: toClient(mid.x, mid.y), midHit: hitAt(mid.x, mid.y) };
  });
  check("the Under Hall's hit area is made from its pictures", hall && hall.hitArea, JSON.stringify(hall));
  check("it covers its art (the top of its roof, its middle), not the empty ground above it", hall && hall.solidHit && hall.midHit && !hall.airHit, JSON.stringify(hall));
  // (on its roof: lower down, the Coal building stands in front of it and takes the mouse)
  await page.mouse.move(hall.solid.x, hall.solid.y + 10);
  await page.waitForTimeout(500);
  const hov = await g(() => { const h = window.__game.GLOBAL.townHall; const B = window.__classByName("BFOUNDATION"); return { hover: h._ioHover, glow: !!h._ioGlow, filter: h._ioGlow && h._ioGlow._filter && h._ioGlow._filter.color, current: B.s_ioHovered === h }; });
  await page.screenshot({ path: `${shots}/ui-3-hover.png` });
  check("the building under the mouse glows white", hov.hover && hov.glow && hov.filter === 0xffffff && hov.current, JSON.stringify(hov));
  await page.mouse.move(hall.air.x, hall.air.y - 60);
  await page.waitForTimeout(500);
  const off = await g(() => { const h = window.__game.GLOBAL.townHall; return { hover: h._ioHover, glow: !!h._ioGlow }; });
  check("and stops when the mouse leaves it", !off.hover && !off.glow, JSON.stringify(off));
  // a click on empty ground just above it does nothing; on its roof it opens it
  await page.mouse.click(hall.air.x, hall.air.y);
  await page.waitForTimeout(700);
  const miss = await g(() => window.__game.GLOBAL._selectedBuilding === window.__game.GLOBAL.townHall);
  await page.mouse.click(hall.solid.x, hall.solid.y);
  await page.waitForTimeout(900);
  const sel = await g(() => window.__game.GLOBAL._selectedBuilding === window.__game.GLOBAL.townHall);
  await page.screenshot({ path: `${shots}/ui-4-selected.png` });
  check("a click on the ground just above its roof does not select it; a click on its roof does", !miss && sel, JSON.stringify([miss, sel]));
  await g(() => { try { window.__game.BASE.BuildingDeselect(); } catch (e) {} });
  // the hit clips are kept in drawing order (the one in front takes the click)
  const order = await g(() => { const M = window.__classByName("MAP"), B = window.__classByName("BFOUNDATION"); M.SortDepth(); const d = []; for (let i = 0; i < M._BUILDINGTOPS.numChildren; i++) { const v = B.ioHitDepth(M._BUILDINGTOPS.getChildAt(i)); if (!isNaN(v)) d.push(v); } return { n: d.length, sorted: d.every((v, i) => i === 0 || v >= d[i - 1]) }; });
  check("the buildings' hit clips are in drawing order", order.n >= 6 && order.sorted, JSON.stringify(order));

  // 3. Balthazar, traps and Quake towers; a Sulfur Bomb on a burrowed Valgos
  await g(() => {
    const W = window.__game.WMATTACK, G = window.__game.GLOBAL;
    W._history.lastattack = 0; G._flags.io_wildlast = 0;
    W._queued = { type: 7, attack: { IC5: 1, IC2: 1, IC4: 1 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC5: 100, IC2: 100, IC4: 100 }, warned: 1, t: 1, level: 1 };
    W.LaunchQueuedAttack();
    const CR = window.__classByName("CREEPS"); window.__m = {};
    for (const k in CR._creeps) { const m = CR._creeps[k]; window.__m[m._creatureID] = m; }
  });
  await page.waitForTimeout(3000);
  const traps = await g(() => {
    const B = window.__m.IC5, Z = window.__m.IC2, T = window.__classByName("Targeting");
    const pt = (m) => new m._tmpPoint.constructor(m._tmpPoint.x, m._tmpPoint.y);
    const freeze = (m, p) => { m._tmpPoint.x = p.x; m._tmpPoint.y = p.y; m._mc.x = p.x; m._mc.y = p.y; m.node = T.CreepCellMove(m._tmpPoint, m._id, m, m.node); m.tick = function () { this._mc.x = this._tmpPoint.x; this._mc.y = this._tmpPoint.y; return this.health <= 0; }; };
    const spot = pt(B);
    freeze(B, spot); freeze(Z, new spot.constructor(spot.x + 900, spot.y + 600));
    const Trap = window.__classByName("BUILDING24");
    const t = new Trap(); t._position = spot; t._mc.x = spot.x; t._mc.y = spot.y;
    t.FindTargets();
    const byBalthazar = t._hasTargets;
    freeze(Z, new spot.constructor(spot.x + 4, spot.y + 2));
    t.FindTargets();
    const byZagnoid = t._hasTargets && t._targetCreeps.every((c) => c.creep !== B);
    const hb = B.health, hz = Z.health;
    B.setHealth(1000000); Z.setHealth(1000000);
    let err = null; try { t.Explode(); } catch (e) { err = e.message; }
    return { flyer: B._movement, byBalthazar, byZagnoid, blastB: 1000000 - B.health, blastZ: 1000000 - Z.health, err };
  });
  check("Balthazar alone on a trap does not set it off", traps.byBalthazar === false, JSON.stringify(traps));
  check("a Zagnoid does (and the trap goes for it, not him)", traps.byZagnoid, JSON.stringify(traps));
  check("the blast hurts Balthazar too, standing by it", traps.blastB > 0 && traps.blastZ > 0, JSON.stringify(traps));
  const quake = await g(() => {
    const B = window.__m.IC5, Z = window.__m.IC2, T = window.__classByName("Targeting");
    const Q = window.__classByName("INFERNOQUAKETOWER"); const q = new Q();
    q._range = 200; q._position = new B._tmpPoint.constructor(B._tmpPoint.x, B._tmpPoint.y - q._footprint[0].height / 2);
    // Balthazar alone in range
    Z._tmpPoint.x += 2000; Z._mc.x = Z._tmpPoint.x; Z.node = T.CreepCellMove(Z._tmpPoint, Z._id, Z, Z.node);
    q.FindTargets(1, 1);
    const alone = q._hasTargets;
    Z._tmpPoint.x -= 1990; Z._mc.x = Z._tmpPoint.x; Z.node = T.CreepCellMove(Z._tmpPoint, Z._id, Z, Z.node);
    q.FindTargets(1, 1);
    const withZ = q._hasTargets && q._targetCreeps[0].creep === Z;
    const hb = B.health, hz = Z.health;
    q.Quake(2000);
    return { alone, withZ, lostB: hb - B.health, lostZ: hz - Z.health };
  });
  check("a Quake tower does not fire at Balthazar", quake.alone === false, JSON.stringify(quake));
  check("it fires at a Zagnoid beside him", quake.withZ, JSON.stringify(quake));
  check("its quake hurts the Zagnoid, not Balthazar", quake.lostZ > 0 && quake.lostB === 0, JSON.stringify(quake));
  const burrow = await g(async () => {
    const V = window.__m.IC4;
    for (let i = 0; i < 100 && V._visible; i++) await new Promise((r) => setTimeout(r, 100));
    const RB = window.__classByName("com.monsters.effects::ResourceBomb"), RBs = window.__classByName("com.monsters.effects::ResourceBombs"), P = window.__classByName("com.monsters.effects::ResourceBombParticle");
    const fake = { resourceid: P ? P.k_TYPE_PUTTY : "putty", targets: [[V]], bomb: RBs._bombs.pu1 };
    const before = !!V.getComponentByName(RB.k_PUTTY_BOMB_ENRAGE);
    RB.prototype.Damage.call(fake, new V._tmpPoint.constructor(0, 0));
    return { burrowed: !V._visible, movement: V._movement, before, after: !!V.getComponentByName(RB.k_PUTTY_BOMB_ENRAGE) };
  });
  check("a Sulfur Bomb reaches a burrowed Valgos", burrow.burrowed && !burrow.before && burrow.after, JSON.stringify(burrow));
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  await browser.close();
}
