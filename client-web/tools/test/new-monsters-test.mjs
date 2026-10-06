// The Inferno's two new monsters, Clinkerjaw (IC12) and Flickerfiend (IC14), in the game:
//  - the Strongbox lists Clinkerjaw on page 2 after Malphus and Flickerfiend on page 3 after Sabnox, with
//    their unlock costs; the Academy pages include them; their pictures load
//  - their stats are the server's (server/src/game-data/stats/monsterStats.ts checks every attack's)
//  - in an attack: their sprite sheets load and draw; a Clinkerjaw that dies cracks open into Spurtz (2 at
//    levels 1-3) that are small ones: 3/4 the size and 3/4 the speed, every other stat a Spurtz's; it leaves
//    a pool of magma that gives a hurt monster of its side close by 100 health, once, not one further off,
//    and dries up after 6 seconds
//  - a Flickerfiend does not set a trap off (a Clinkerjaw does), though the blast still catches it
//  - a Flickerfiend's third strike on a building makes it shimmer: it cannot be targeted, nothing hurts it,
//    it fades out over 0.4 s showing its four shimmer frames (slow enough to see), is gone (not drawn at all)
//    for a full second (80 game steps), fades back in over 0.3 s, and comes back beside
//    another building up to 400 away (twice the old 200), then walks on
//  - no page errors
//   EMAIL=... PASSWORD=... SHOTS=dir [SERVER_DIR=../server] node tools/test/new-monsters-test.mjs
// A wild attack is launched on the yard (not saved). Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
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
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /IC12|IC14|clinkerjaw|flickerfiend/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; });

  // 1. the Strongbox
  const locker = await g(async () => {
    const L = window.__classByName("CREATURELOCKER"), K = window.__game.KEYS;
    const c = L._creatures;
    // (the test yard has no Strongbox building: its window is opened on its own)
    const P = window.__classByName("CREATURELOCKERPOPUP");
    const G = window.__game.GLOBAL; const keepLocker = G._bLocker; if (!G._bLocker) G._bLocker = G.townHall;
    L._page = 2; const pop = G._layerWindows.addChild(new P());
    await new Promise((r) => setTimeout(r, 800));
    L._page = 2; pop.List();
    const p2 = pop._tempCreatureList.map((x) => x.id);
    L._page = 3; pop.List();
    const p3 = pop._tempCreatureList.map((x) => x.id);
    const texts = [];
    const T = window.__classByName("flash.text::TextField");
    const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) texts.push(o.text); for (const ch of o.$children ?? []) walk(ch); };
    walk(pop);
    window.__lockerPop = pop; G._bLocker = keepLocker;
    return {
      p2, p3, texts: texts.filter((t) => /Flickerfiend|Clinkerjaw/.test(t)),
      ic12: [c.IC12.page, c.IC12.order, c.IC12.resource, c.IC12.level, K.Get(c.IC12.name), c.IC12.props.cStorage[0]],
      ic14: [c.IC14.page, c.IC14.order, c.IC14.resource, c.IC14.level, K.Get(c.IC14.name), c.IC14.props.cStorage[0]],
      desc: [K.Get(c.IC12.description), K.Get(c.IC14.description)],
    };
  });
  check("Strongbox page 2: Valgos, Malphus, then Clinkerjaw", locker.p2.join() === "IC4,IC3,IC12", locker.p2.join());
  check("Strongbox page 3: Balthazar, Grokus, Sabnox, then Flickerfiend (shown by name)", locker.p3.join() === "IC5,IC6,IC7,IC14" && locker.texts.some((t) => /Flickerfiend/.test(t)), JSON.stringify([locker.p3, locker.texts]));
  check("Clinkerjaw: 96,000 to unlock at Strongbox level 2, 40 housing; Flickerfiend: 819,200 at level 3, 35 housing", JSON.stringify(locker.ic12.slice(0, 4)) === "[2,3,96000,2]" && locker.ic12[5] === 40 && JSON.stringify(locker.ic14.slice(0, 4)) === "[3,4,819200,3]" && locker.ic14[5] === 35, JSON.stringify([locker.ic12, locker.ic14]));
  await page.screenshot({ path: `${shots}/monsters-0-strongbox.png` });
  await g(() => { const p = window.__lockerPop; if (p && p.parent) p.parent.removeChild(p); });
  check("their names and descriptions", locker.ic12[4] === "Clinkerjaw" && locker.ic14[4] === "Flickerfiend" && /Spurtz/.test(locker.desc[0]) && /third strike/.test(locker.desc[1]), JSON.stringify(locker.desc));
  const other = await g(() => {
    const A = window.__classByName("ACADEMYPOPUP"); const roster = A.ioRoster();
    return { roster };
  }).catch((e) => ({ err: e.message }));
  check("the Academy pages include them (after Valgos and after Sabnox)", other.roster && other.roster.join().includes("IC4,IC12,IC5,IC6,IC7,IC14,IC8"), JSON.stringify(other));
  const pics = [];
  for (const f of ["monsters/IC12-portrait.jpg", "monsters/IC12-150.jpg", "monsters/IC12-medium.jpg", "monsters/IC12-small.png", "popups/IC12-150.png", "monsters/clinkerjaw.png", "monsters/IC14-portrait.jpg", "monsters/IC14-150.jpg", "monsters/IC14-medium.jpg", "monsters/IC14-small.png", "popups/IC14-150.png", "monsters/flickerfiend.png"]) {
    pics.push([f, (await fetch(`${server}assets/${f}`)).status]);
  }
  check("their pictures are served (portraits, icons, the unlock picture, the sprite sheets)", pics.every((p) => p[1] === 200), JSON.stringify(pics.filter((p) => p[1] !== 200)));

  // 2. the server's table is the client's
  const client = await g(() => { const c = window.__classByName("CREATURELOCKER")._creatures; return { IC12: c.IC12.props, IC14: c.IC14.props, t12: c.IC12.trainingCosts, t14: c.IC14.trainingCosts }; });
  let srv = null;
  try {
    srv = JSON.parse(execFileSync("bun", ["-e", "import {monsterStats} from './src/game-data/stats/monsterStats.ts'; console.log(JSON.stringify({IC12: monsterStats.IC12, IC14: monsterStats.IC14}))"], { cwd: resolve(process.env.SERVER_DIR || "../server") }).toString().trim().split("\n").pop());
  }
  catch (e) { srv = { err: e.message.slice(0, 200) }; }
  const same = (a, b) => Object.keys(b).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
  // (the props are what an attack sends and the server compares; the Academy's times are divided by the
  // server's time divisor on the client, as for every monster)
  check("the server checks the same stats (every prop the server lists)", srv && srv.IC12 && same(client.IC12, srv.IC12.props) && same(client.IC14, srv.IC14.props) && Object.keys(srv.IC12.props).length === 11, JSON.stringify(srv && (srv.err || Object.keys(srv.IC12.props))));

  // 3. an attack: two of each
  await g(() => {
    const W = window.__game.WMATTACK, G = window.__game.GLOBAL;
    W._history.lastattack = 0; G._flags.io_wildlast = 0;
    W._queued = { type: 7, attack: { IC12: 2, IC14: 2 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC12: 100, IC14: 100 }, warned: 1, t: 1, level: 1 };
    W.LaunchQueuedAttack();
    const CR = window.__classByName("CREEPS"); window.__cj = []; window.__ff = [];
    for (const k in CR._creeps) { const m = CR._creeps[k]; if (m._creatureID === "IC12") window.__cj.push(m); if (m._creatureID === "IC14") window.__ff.push(m); }
  });
  await page.waitForTimeout(4000);
  const drawn = await g(() => {
    const S = window.__classByName("SPRITES");
    const opaque = (m) => { const b = m._graphic; let n = 0; for (let y = 0; y < b.height; y += 2) for (let x = 0; x < b.width; x += 2) if ((b.getPixel32(x, y) >>> 24) > 100) n++; return n; };
    const C = window.__classByName("com.monsters.monsters.creeps.inferno::Clinkerjaw"), F = window.__classByName("com.monsters.monsters.creeps.inferno::Flickerfiend");
    return { n: [window.__cj.length, window.__ff.length], classes: [window.__cj[0] instanceof C, window.__ff[0] instanceof F], sheets: [!!S._sprites.IC12.image, !!S._sprites.IC14.image], pixels: [opaque(window.__cj[0]), opaque(window.__ff[0])], hp: [window.__cj[0].health, window.__ff[0].health], moving: window.__ff[0]._frameNumber };
  });
  check("two Clinkerjaws and two Flickerfiends attack, as their classes", drawn.n.join() === "2,2" && drawn.classes.every(Boolean), JSON.stringify(drawn));
  check("their sprite sheets load and they are drawn", drawn.sheets.every(Boolean) && drawn.pixels.every((p) => p > 40), JSON.stringify(drawn));
  check("level 1 health: Clinkerjaw 1,800 (x1.2, balance pass 30 September), Flickerfiend 2,200", drawn.hp.join() === "1800,2200", JSON.stringify(drawn.hp));
  await g(() => { const M = window.__classByName("MAP"); const m = window.__cj[0]; M._autoScroll = false; M.FocusTo(m._mc.x, m._mc.y, 0.1); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${shots}/monsters-1-attack.png` });

  // 4. a Clinkerjaw cracks open: small Spurtz, and a pool of magma
  const split = await g(async () => {
    const CR = window.__classByName("CREEPS"), T = window.__classByName("Targeting"), MP = window.__classByName("com.monsters.monsters.creeps.inferno::MagmaPuddle");
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const freeze = (m, x, y) => { m._tmpPoint.x = x; m._tmpPoint.y = y; m._mc.x = x; m._mc.y = y; m.node = T.CreepCellMove(m._tmpPoint, m._id, m, m.node); m.tick = function () { this._mc.x = this._tmpPoint.x; this._mc.y = this._tmpPoint.y; return this.health <= 0; }; };
    const spy = (m) => { m.__heals = []; const orig = m.modifyHealth.bind(m); m.modifyHealth = (a, src) => { if (a > 0) m.__heals.push(a); return orig(a, src); }; };
    const spurtz = () => { const out = []; for (const k in CR._creeps) { const m = CR._creeps[k]; if (m && m._creatureID === "IC1" && m.health > 0) out.push(m); } return out; };
    const before = spurtz().length;
    const cj = window.__cj[0], near = window.__cj[1], far = window.__ff[1];
    // a hurt Clinkerjaw right beside it, a hurt Flickerfiend well away; both held still
    freeze(near, cj._tmpPoint.x + 20, cj._tmpPoint.y + 8);
    freeze(far, cj._tmpPoint.x + 400, cj._tmpPoint.y + 200);
    spy(near); spy(far);
    near.setHealth(500); far.setHealth(1000);
    MP.ClearAll();
    cj.modifyHealth(-100000);
    window.__dropAt = performance.now();
    for (let i = 0; i < 100 && spurtz().length === before; i++) await sleep(50);
    await sleep(400);
    const born = spurtz().filter((m) => m.ioHatchling);
    const all = spurtz();
    const dist = born.map((m) => Math.hypot(m._tmpPoint.x - cj._tmpPoint.x, m._tmpPoint.y - cj._tmpPoint.y));
    // a regular Spurtz, hatched the same way, to compare with
    const reg = CR.Spawn("IC1", window.__classByName("MAP")._BUILDINGTOPS, "bounce", new cj._tmpPoint.constructor(cj._tmpPoint.x + 30, cj._tmpPoint.y), 0, 1, false, true);
    await sleep(600);
    const h = born[0];
    const box = (m) => { const b = m._graphic; let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1; for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if ((b.getPixel32(x, y) >>> 24) > 100) { if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; } return [x1 - x0 + 1, y1 - y0 + 1]; };
    const puddles = MP.puddles.slice();
    const p = puddles[0];
    const out = {
      before, hatched: born.length, allNew: all.length - before, near: dist.every((d) => d < 100), dead: cj.health <= 0,
      skin: born.map((m) => m._currentSkinOverride), sheet: !!window.__classByName("SPRITES")._sprites.IC1s.image,
      stats: h && { hp: [h.maxHealth, reg.maxHealth], dmg: [h.damage, reg.damage], speed: [Math.round(h.moveSpeed * 1000) / 1000, Math.round(reg.moveSpeed * 1000) / 1000], target: [h._targetGroup, reg._targetGroup] },
      size: h && [box(h), box(reg)],
      puddles: puddles.length, at: p && [Math.round(p._x - cj._tmpPoint.x), Math.round(p._y - cj._tmpPoint.y)],
      raster: p && p._raster ? { depth: p._raster.depth, alpha: p._raster._alpha >>> 24 } : null,
      nearHeals: near.__heals.slice(), nearHp: near.health, farHeals: far.__heals.slice(), healed: p && p.healedCount,
    };
    window.__puddle = p; window.__reg = reg;
    return out;
  });
  check("a Clinkerjaw that dies cracks open into 2 Spurtz, where it fell", split.dead && split.hatched === 2 && split.near, JSON.stringify(split));
  check("they are small ones: their own 3/4-size sprite sheet, drawn about 3/4 the size of a Spurtz", split.skin.every((k) => k === "IC1s") && split.sheet && split.size && split.size[0][1] <= Math.round(split.size[1][1] * 0.8) && split.size[0][1] >= Math.round(split.size[1][1] * 0.65), JSON.stringify([split.skin, split.size]));
  check("...at 3/4 of a Spurtz's speed, with a Spurtz's health, damage and targets", split.stats && split.stats.hp[0] === split.stats.hp[1] && split.stats.dmg[0] === split.stats.dmg[1] && split.stats.target[0] === split.stats.target[1] && Math.abs(split.stats.speed[0] - split.stats.speed[1] * 0.75) < 0.002, JSON.stringify(split.stats));
  check("it leaves a pool of magma where it fell, on the ground under the monsters", split.puddles === 1 && Math.abs(split.at[0]) < 30 && Math.abs(split.at[1]) < 30 && split.raster && split.raster.depth < 2 && split.raster.alpha > 150, JSON.stringify(split));
  check("the pool gives the hurt Clinkerjaw beside it 100 health, and not the Flickerfiend further off", split.nearHeals.join() === "100" && split.farHeals.length === 0, JSON.stringify([split.nearHeals, split.nearHp, split.farHeals]));
  await g(() => { const M = window.__classByName("MAP"); const p = window.__puddle; M._autoScroll = false; M.FocusTo(p._x, p._y, 0.1); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/monsters-2-puddle.png` });
  const again = await g(async () => {
    const near = window.__cj[1], p = window.__puddle, MP = window.__classByName("com.monsters.monsters.creeps.inferno::MagmaPuddle");
    near.setHealth(400);
    await new Promise((r) => setTimeout(r, 1500));
    const once = { heals: near.__heals.slice(), healed: p.healedCount, still: MP.puddles.indexOf(p) >= 0 };
    for (let i = 0; i < 150 && MP.puddles.length; i++) await new Promise((r) => setTimeout(r, 100));
    return { once, gone: MP.puddles.length === 0, raster: p._raster === null, lasted: Math.round((performance.now() - window.__dropAt) / 100) / 10, life: MP.LIFE_TICKS };
  });
  check("once only: hurt again while it stands in the pool, it gets nothing more", again.once.heals.join() === "100" && again.once.healed === 1 && again.once.still, JSON.stringify(again));
  check("the pool dries up after 6 seconds (480 game steps) and is taken off the ground", again.gone && again.raster && again.life === 480 && again.lasted >= 5 && again.lasted <= 10, JSON.stringify(again));

  // 4b. traps: a Flickerfiend does not set one off; a Clinkerjaw does; the blast catches both
  const traps = await g(() => {
    const f = window.__ff[1], c = window.__cj[1], T = window.__classByName("Targeting");
    const put = (m, x, y) => { m._tmpPoint.x = x; m._tmpPoint.y = y; m._mc.x = x; m._mc.y = y; m.node = T.CreepCellMove(m._tmpPoint, m._id, m, m.node); };
    const spot = new f._tmpPoint.constructor(f._tmpPoint.x, f._tmpPoint.y);
    put(c, spot.x + 900, spot.y + 600);
    const Trap = window.__classByName("BUILDING24");
    const t = new Trap(); t._position = spot; t._mc.x = spot.x; t._mc.y = spot.y;
    t.FindTargets();
    const byFlicker = t._hasTargets;
    put(c, spot.x + 4, spot.y + 2);
    t.FindTargets();
    const byClinker = t._hasTargets && t._targetCreeps.every((x) => x.creep !== f);
    f.setHealth(1000000); c.setHealth(1000000);
    let err = null; try { t.Explode(); } catch (e) { err = e.message; }
    return { byFlicker, byClinker, blastF: 1000000 - f.health, blastC: 1000000 - c.health, err };
  });
  check("a Flickerfiend alone on a trap does not set it off (too nimble)", traps.byFlicker === false, JSON.stringify(traps));
  check("a Clinkerjaw does (and the trap goes for it)", traps.byClinker, JSON.stringify(traps));
  check("the blast catches the Flickerfiend too, standing by it", traps.blastF > 0 && traps.blastC > 0, JSON.stringify(traps));

  // 5. a Flickerfiend's third strike
  const blink = await g(async () => {
    const f = window.__ff[0]; const B = window.__game.BASE;
    const buildings = []; for (const k in B._buildingsMain) buildings.push(B._buildingsMain[k]);
    // it is put beside the Under Hall and made to strike it three times
    const hall = window.__game.GLOBAL.townHall;
    f._tmpPoint.x = hall._mc.x + 60; f._tmpPoint.y = hall._mc.y + hall._middle + 30;
    f._targetBuilding = hall; f._hasTarget = true; f._atTarget = true;
    const start = { x: f._tmpPoint.x, y: f._tmpPoint.y };
    f.attacked(hall, 10); f.attacked(hall, 10);
    const afterTwo = f.blinking;
    f.attacked(hall, 10);
    const during = { blinking: f.blinking, targetable: f.isTargetable, sprite: f.spriteAction };
    const h0 = f.health; const took = f.modifyHealth(-500); const h1 = f.health;
    const to = f._blinkTo;
    let frames = [];
    const t0 = performance.now(); let goneFrom = -1, goneTo = -1, ticks = [];
    for (let i = 0; i < 200 && f.blinking; i++) {
      await new Promise((r) => setTimeout(r, 20));
      const a = f._rasterData ? (f._rasterData._alpha >>> 24) : -1; frames.push(a);
      if (a === 0) { const t = performance.now() - t0; if (goneFrom < 0) goneFrom = t; goneTo = t; ticks.push(f._blink); }
    }
    const end = { x: f._tmpPoint.x, y: f._tmpPoint.y };
    const dTo = to ? Math.hypot(to._mc.x - end.x, to._mc.y + to._middle - end.y) : -1;
    return { afterTwo, during, h0, h1, took, to: to && to._type, toSame: to === hall, moved: Math.round(Math.hypot(end.x - start.x, end.y - start.y)), dTo: Math.round(dTo), after: { blinking: f.blinking, targetable: f.isTargetable, sprite: f.spriteAction, target: f._targetBuilding && f._targetBuilding._type }, alphaMin: Math.min(...frames.filter((a) => a >= 0)), gone: Math.round(goneTo - goneFrom), goneTicks: ticks.length ? [Math.min(...ticks), Math.max(...ticks)] : null, n: buildings.length, fp: to ? to._footprint[0].width : 0 };
  });
  check("two strikes: nothing yet; the third: it shimmers (the blink sprite), and cannot be targeted", blink.afterTwo === false && blink.during.blinking && blink.during.targetable === false && blink.during.sprite === "blink", JSON.stringify(blink.during));
  check("nothing hurts it while it shimmers (500 fired at it: 0 taken)", blink.took === 0 && blink.h1 === blink.h0, JSON.stringify([blink.h0, blink.h1, blink.took]));
  check("it fades out, is gone (not drawn at all) for a full second, and fades back", blink.alphaMin === 0 && blink.gone >= 850 && blink.gone <= 1700 && blink.goneTicks && blink.goneTicks[0] >= 32 && blink.goneTicks[0] <= 36 && blink.goneTicks[1] >= 108, JSON.stringify([blink.alphaMin, blink.gone, blink.goneTicks]));
  check("it comes back beside another building (not the Under Hall), and goes for it", blink.to && !blink.toSame && blink.dTo <= blink.fp * 1.1 + 20 && blink.after.target === blink.to && blink.after.blinking === false && blink.after.targetable && blink.after.sprite === "walking", JSON.stringify(blink));
  const exact = await g(() => {
    // the other Flickerfiend (held still, so the game does not tick its blink): its blink ticked by hand
    const f = window.__ff[1], hall = window.__game.GLOBAL.townHall, T = window.__classByName("Targeting");
    f._tmpPoint.x = hall._mc.x + 60; f._tmpPoint.y = hall._mc.y + hall._middle + 30; f.node = T.CreepCellMove(f._tmpPoint, f._id, f, f.node);
    f._targetBuilding = hall;
    f.startBlink();
    const a = []; const rows = [];
    for (let i = 0; i < 250 && f.blinking; i++) { f.tickBlink(); f._frameNumber++; a.push(f.blinking ? (f._rasterData._alpha >>> 24) : 255); if (f.blinking) { f.getNextSprite(); rows.push(Math.floor(f._lastFrame / 30)); } }
    // its reach: stood 300 away from the Under Hall (beyond the old 200), and 460 away (beyond 400)
    const reach = (dist) => { f._tmpPoint.x = hall._mc.x + dist; f._tmpPoint.y = hall._mc.y + hall._middle; f._targetBuilding = null; const d = []; for (let i = 0; i < 300; i++) { const b = f.pickTarget(); if (b) d.push(Math.round(Math.hypot(b._mc.x - f._tmpPoint.x, b._mc.y + b._middle - f._tmpPoint.y))); } return d; };
    const at300 = reach(300), at460 = reach(460);
    const out32 = rows.slice(0, 31);
    return { zero: a.filter((x) => x === 0).length, fadingOut: a.slice(0, 32).filter((x) => x > 0 && x < 255).length, fadingIn: a.slice(112).filter((x) => x > 0 && x < 255).length, total: a.length, shimmer: [...new Set(out32)], perRow: [9, 10, 11, 12].map((k) => out32.filter((x) => x === k).length), at300: at300.length ? [Math.min(...at300), Math.max(...at300), at300.length] : [], at460: at460.length ? [Math.min(...at460), Math.max(...at460)] : [] };
  });
  check("tick by tick: fading out over 32 steps (0.4 s), 80 steps (one second) gone, then fading back in over 24 (0.3 s)", exact.zero === 80 && exact.fadingOut === 31 && exact.fadingIn >= 22 && exact.total >= 135 && exact.total <= 137, JSON.stringify(exact));
  check("its shimmer can be seen: the four shimmer frames (rows 9-12) in turn from the first, each for 8 steps (a tenth of a second)", exact.shimmer.join() === "9,10,11,12" && exact.perRow[0] >= 7 && exact.perRow[1] === 8 && exact.perRow[2] === 8, JSON.stringify([exact.shimmer, exact.perRow]));
  check("it blinks to buildings up to 400 away (twice as far as before): 300 from the Under Hall it can reach it, and never anything beyond 400", exact.at300.length && exact.at300[1] > 200 && exact.at300[1] <= 400 && exact.at460.every((x) => x <= 400), JSON.stringify(exact));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/monsters-3-after-blink.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/monsters-error.png` }).catch(() => {});
} finally {
  await browser.close();
}
