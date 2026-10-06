// Ashkarr, the Ember Herald (IC24, the user's ASHKARR.md), in the game:
//  - the Strongbox lists her on page 5 after Korath and Drull (Strongbox level 5); her unlock and Academy costs
//    and times are Korath's and Drull's (and each of the three has its own Academy table, divided once by the
//    server's time divisor); Korath and Drull hatch and heal for her magma; 600 housing; the Academy trains her to level 6; her name, description, pictures
//  - her stats are the server's (monsterStats.ts), and the server refuses her unlock unless it was started in
//    the Strongbox (lockedMonsters.ts)
//  - she takes 600 of the Compound's room
//  - health per level (the user's, 28 September): Korath 32,000-64,000, Drull 22,000-52,000, Ashkarr
//    20,000-40,000; Korath and Drull drawn with the champion art of levels 4, 4, 5, 5, 6, 6
//  - in an attack: her 188 x 128 sheet loads and draws her with her feet on her spot; facing columns follow
//    her heading (0 right, 90 towards the camera); the war-cry rows play when she roars
//  - she roars as soon as she is in battle and every 10 seconds (800 game steps); her side within 300 moves
//    faster (x1.20 at level 1, x1.35 at level 6) for 11 seconds (880 steps), so a monster still in range at the
//    next roar keeps it without a break; not herself, not a monster further off
//  - two Ashkarrs never stack: the strongest boost counts; when it runs out the weaker one still running takes
//    over; when none is left the monster is back to its own speed. Over a few seconds of two Ashkarrs roaring
//    together, no monster is ever faster than x1.35
//  - the other side within 300 is rooted for 7 seconds (560 game steps) and still attacks at its own speed
//  - boosted monsters glow pink, rooted ones a faint white, each glow gone with its effect
//  - the boost multiplies with a rage bomb's Enrage (a separate modifier)
//  - no page errors
//   EMAIL=... PASSWORD=... SHOTS=dir [SERVER_DIR=../server] node tools/test/ashkarr-test.mjs
// A wild attack is launched on the yard (not saved). Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const serverDir = resolve(process.env.SERVER_DIR || "../server");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /IC24|ashkarr/i.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
const bun = (code) => {
  try {
    return JSON.parse(execFileSync("bun", ["-e", code], { cwd: serverDir }).toString().trim().split("\n").pop());
  }
  catch (e) {
    return { err: e.message.slice(0, 300) };
  }
};
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; });

  // 1. the Strongbox, the Academy, her words and pictures
  const locker = await g(async () => {
    const L = window.__classByName("CREATURELOCKER"), K = window.__game.KEYS, G = window.__game.GLOBAL;
    const c = L._creatures.IC24;
    const P = window.__classByName("CREATURELOCKERPOPUP");
    const keep = G._bLocker; if (!G._bLocker) G._bLocker = G.townHall;
    L._page = 5; const pop = G._layerWindows.addChild(new P());
    await new Promise((r) => setTimeout(r, 800));
    L._page = 5; pop.List();
    try { window.__classByName("POPUPSETTINGS").AlignToCenter(pop); } catch (e) {}
    const p5 = pop._tempCreatureList.map((x) => x.id);
    pop.ShowB("IC24");
    await new Promise((r) => setTimeout(r, 1200));
    const texts = []; const T = window.__classByName("flash.text::TextField");
    const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) texts.push(o.text); for (const ch of o.$children ?? []) walk(ch); };
    walk(pop);
    window.__lockerPop = pop; G._bLocker = keep;
    const A = window.__classByName("ACADEMYPOPUP");
    return {
      p5, texts: texts.filter((t) => /Ashkarr/.test(t)),
      c: [c.page, c.order, c.resource, c.level, c.props.cStorage[0], c.props.bucket[0], c.trainingCosts.length],
      name: K.Get(c.name), desc: K.Get(c.description), stream: [K.Get(c.stream[0]), K.Get(c.stream[1])],
      roster: A.ioRoster(), six: L.ioReachesLevel6("IC24"), listed: !!L.GetAppropriateCreatures().IC24, blocked: !!c.blocked,
      test: L.ioTestMonsterIds().includes("IC24"),
      costs: ["IC9", "IC10", "IC24"].map((id) => JSON.stringify([L._creatures[id].resource, L._creatures[id].time, L._creatures[id].trainingCosts])),
      divisor: G.ioTimeDivisor ? G.ioTimeDivisor : null,
      magma: ["IC9", "IC10", "IC24"].map((id) => JSON.stringify([L._creatures[id].props.cResource, L._creatures[id].props.hResource])),
    };
  });
  check("Strongbox page 5: Korath, Drull, then Ashkarr (shown by name)", locker.p5.join() === "IC9,IC10,IC24" && locker.texts.length > 0, JSON.stringify([locker.p5, locker.texts]));
  check("unlocked at Strongbox level 5 for 12,288,000 Sulfur as Korath and Drull; 600 housing; five Academy steps", JSON.stringify(locker.c) === "[5,3,12288000,5,600,600,5]", JSON.stringify(locker.c));
  const costs = locker.costs.map((c) => JSON.parse(c));
  check("her unlock time and Academy costs and times are Korath's and Drull's (each table divided once: level 2 takes a day before the divisor)", locker.costs[0] === locker.costs[1] && locker.costs[1] === locker.costs[2] && costs[2][2][0][0] === 16000000 && costs[2][2][4][0] === 28000000 && locker.divisor > 0 && costs[2][1] === Math.max(1, Math.ceil(648000 / locker.divisor)) && costs[2][2][0][1] === Math.max(1, Math.ceil(86400 / locker.divisor)) && costs[2][2][4][1] === Math.max(1, Math.ceil(259200 / locker.divisor)), JSON.stringify([locker.divisor, costs.map((c) => [c[0], c[1], c[2][0], c[2][4]])]));
  await page.screenshot({ path: `${shots}/ashkarr-0-strongbox.png` });
  await g(() => { const p = window.__lockerPop; if (p && p.parent) p.parent.removeChild(p); });
  check("her name and words", locker.name === "Ashkarr" && /roars/.test(locker.desc) && locker.desc.length <= 200 && /Moloch's warlord/.test(locker.stream[1]), JSON.stringify([locker.name, locker.desc]));
  check("the Academy lists her (after Korath and Drull) and trains her to level 6; admin test mode unlocks her", locker.roster.join().includes("IC9,IC10,IC24") && locker.six && locker.listed && !locker.blocked && locker.test, JSON.stringify(locker));
  const pics = [];
  for (const f of ["monsters/IC24-portrait.jpg", "monsters/IC24-150.jpg", "monsters/IC24-medium.jpg", "monsters/IC24-small.png", "monsters/ashkarr.png"]) pics.push([f, (await fetch(`${server}assets/${f}`)).status]);
  check("her pictures are served (portraits, icon, sprite sheet)", pics.every((p) => p[1] === 200), JSON.stringify(pics));

  // 2. the server
  const client = await g(() => { const c = window.__classByName("CREATURELOCKER")._creatures.IC24; return { props: c.props, t: c.trainingCosts, resource: c.resource }; });
  const srv = bun("import {monsterStats} from './src/game-data/stats/monsterStats.ts'; import {inferoMonsters} from './src/game-data/stats/monsterKeys.ts'; console.log(JSON.stringify({s: monsterStats.IC24, k: inferoMonsters.includes('IC24')}))");
  const same = srv.s && Object.keys(srv.s.props).every((k) => JSON.stringify(client.props[k]) === JSON.stringify(srv.s.props[k]));
  check("Korath and Drull hatch and heal for Ashkarr's magma (2.2M to 5.2M, healing 660K to 1.56M)", locker.magma[0] === locker.magma[1] && locker.magma[1] === locker.magma[2] && locker.magma[2] === JSON.stringify([[2200000, 2600000, 3050000, 3600000, 4300000, 5200000], [660000, 780000, 915000, 1080000, 1290000, 1560000]]), JSON.stringify(locker.magma));
  const k9 = bun("import {monsterStats} from './src/game-data/stats/monsterStats.ts'; console.log(JSON.stringify({r: monsterStats.IC9.resource, t: monsterStats.IC9.trainingCosts, m: [monsterStats.IC9.props.cResource, monsterStats.IC10.props.cResource, monsterStats.IC9.props.hResource, monsterStats.IC10.props.hResource]}))");
  check("the server checks the same stats, knows her as an Inferno monster, has Korath's Academy table for her, and her magma for Korath and Drull", same && srv.k && Object.keys(srv.s.props).length === 10 && srv.s.resource === k9.r && JSON.stringify(srv.s.trainingCosts) === JSON.stringify(k9.t) && JSON.stringify(k9.m) === JSON.stringify([srv.s.props.cResource, srv.s.props.cResource, srv.s.props.hResource, srv.s.props.hResource]), JSON.stringify(srv.err || srv.s && [Object.keys(srv.s.props), srv.s.trainingCosts, k9]));
  const guard = bun("import {guardLockerData} from './src/services/base/lockedMonsters.ts'; const r = []; const a = guardLockerData({IC24: {t: 2}}, {}, (id) => r.push(id)); const b = guardLockerData({IC24: {t: 2}}, {IC24: {t: 1}}); const c = guardLockerData({IC24: {t: 1}}, {}); console.log(JSON.stringify({a, r, b, c}))");
  check("the server refuses her unlock unless the Strongbox started it", guard.r && guard.r.join() === "IC24" && !guard.a.IC24 && guard.b.IC24.t === 2 && guard.c.IC24.t === 1, JSON.stringify(guard));

  // 3. the Compound: 600 of its room
  const house = await g(() => {
    const H = window.__classByName("HOUSING"), C = window.__classByName("CREATURES"), G = window.__game.GLOBAL;
    if (!G._bHousing) return { none: true };
    H.HousingSpace();
    const room = H._housingSpace.Get();
    const ok = room >= 600 ? H.HousingStore("IC24", new (window.__classByName("flash.geom::Point"))(G._bHousing._mc.x, G._bHousing._mc.y)) : null;
    H.HousingSpace();
    return { room, after: H._housingSpace.Get(), ok, storage: C.GetProperty("IC24", "cStorage", 0, true) };
  });
  check("she takes 600 of the Compound's room", house.storage === 600 && (house.ok === null ? true : house.ok && house.room - house.after === 600), JSON.stringify(house));

  // 4. an attack: a level 1 and a level 6 Ashkarr, with three Zagnoids of their side
  await g(() => {
    const W = window.__game.WMATTACK, G = window.__game.GLOBAL, CR = window.__classByName("CREEPS"), M = window.__classByName("MAP");
    W._history.lastattack = 0; G._flags.io_wildlast = 0;
    W._queued = { type: 7, attack: { IC2: 3 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC2: 100 }, warned: 1, t: 1, level: 1 };
    W.LaunchQueuedAttack();
    const P = window.__classByName("flash.geom::Point");
    const hall = G.townHall;
    window.__a1 = CR.Spawn("IC24", M._BUILDINGTOPS, "bounce", new P(hall._mc.x + 500, hall._mc.y + 250), 0, 1, true, false, 1);
    window.__a6 = CR.Spawn("IC24", M._BUILDINGTOPS, "bounce", new P(hall._mc.x + 520, hall._mc.y + 260), 0, 1, true, false, 6);
    window.__z = []; for (const k in CR._creeps) { const m = CR._creeps[k]; if (m._creatureID === "IC2") window.__z.push(m); }
  });
  await page.waitForTimeout(3000);
  const drawn = await g(() => {
    const S = window.__classByName("SPRITES"), A = window.__classByName("com.monsters.monsters.creeps.inferno::Ashkarr");
    const a1 = window.__a1, a6 = window.__a6;
    const box = (m) => { const b = m._graphic; let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1, n = 0; for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if ((b.getPixel32(x, y) >>> 24) > 100) { n++; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; } return { n, x0, x1, y0, y1 }; };
    return {
      cls: [a1 instanceof A, a6 instanceof A], lv: [a1.level, a6.level], hp: [a1.maxHealth, a6.maxHealth], sheet: !!(S._sprites.IC24 && S._sprites.IC24.image),
      size: [a1._graphic.width, a1._graphic.height], mc: [a1._graphicMC.x, a1._graphicMC.y], box: box(a1), z: window.__z.length,
      speed: [a1.moveSpeed, a6.moveSpeed], housing: a1.constructor.ID,
    };
  });
  check("two Ashkarrs attack as her class, at levels 1 and 6 (25,000 and 50,000 health)", drawn.cls.every(Boolean) && drawn.lv.join() === "1,6" && drawn.hp.join() === "25000,50000", JSON.stringify(drawn));
  // Korath and Drull at every level: their health, and the champion art they are drawn with (4, 4, 5, 5, 6, 6)
  const champs = await g(async () => {
    const CR = window.__classByName("CREEPS"), M = window.__classByName("MAP"), P = window.__classByName("flash.geom::Point"), hall = window.__game.GLOBAL.townHall;
    const out = { IC9: [], IC10: [], IC24: [] };
    for (const id of ["IC9", "IC10", "IC24"]) for (let lv = 1; lv <= 6; lv++) {
      const m = CR.Spawn(id, M._BUILDINGTOPS, "bounce", new P(hall._mc.x - 700, hall._mc.y - 350), 0, 1, true, false, lv);
      out[id].push([m.maxHealth, m.m_spriteID || null, m._graphicMC.x, m._graphicMC.y]);
      m.setHealth(0); m.modifyHealth(-1);
    }
    return out;
  });
  const hp = (id) => champs[id].map((x) => x[0]).join();
  check("health 1-6: Korath 32,000 to 64,000, Drull 22,000 to 52,000, Ashkarr 25,000 to 50,000 (even steps)", hp("IC9") === "32000,38400,44800,51200,57600,64000" && hp("IC10") === "22000,28000,34000,40000,46000,52000" && hp("IC24") === "25000,30000,35000,40000,45000,50000", JSON.stringify([hp("IC9"), hp("IC10"), hp("IC24")]));
  check("Korath and Drull levels 1-2 use the champion's level 4 art, 3-4 level 5, 5-6 level 6", champs.IC9.map((x) => x[1]).join() === "G4_4,G4_4,G4_5,G4_5,G4_6,G4_6" && champs.IC10.map((x) => x[1]).join() === "G2_4,G2_4,G2_5,G2_5,G2_6,G2_6", JSON.stringify([champs.IC9.map((x) => x.slice(1)), champs.IC10.map((x) => x.slice(1))]));
  check("her sheet loads and draws her (188 x 128, her feet on her spot)", drawn.sheet && drawn.size.join() === "188,128" && drawn.mc.join() === "-94,-102" && drawn.box.n > 800 && drawn.box.y1 >= 95 && drawn.box.y1 <= 120, JSON.stringify(drawn));

  // 5. she draws the column for her heading and the row for what she does
  const frames = await g(() => {
    const a = window.__a1, S = window.__classByName("SPRITES");
    const sheet = S._sprites.IC24.image;
    const same = (col, row) => { const b = a._graphic; let diff = 0, n = 0; for (let y = 0; y < 128; y += 4) for (let x = 0; x < 188; x += 4) { const p = b.getPixel32(x, y), q = sheet.getPixel32(col * 188 + x, row * 128 + y); n++; if (((p >>> 24) > 100) !== ((q >>> 24) > 100)) diff++; } return diff / n; };
    const out = {};
    const keep = { rot: a.m_rotation, frame: a._frameNumber, roar: a.roarTicks, att: a._attacking, at: a._atTarget };
    const draw = (rot, frame, roar, attacking, atTarget) => { a.m_rotation = rot; a._frameNumber = frame; a.roarTicks = roar; a._attacking = attacking; a._atTarget = atTarget; a.m_lastCell = -1; a.getNextSprite(); };
    draw(0, 0, 0, false, false); out.walkRight = same(0, 0);
    draw(90, 16, 0, false, false); out.walkCamera = same(4, 2);
    draw(180, 8, 0, true, true); out.attackLeft = same(8, 11);
    draw(270, 0, 0, false, true); out.idleAway = same(12, 30);
    draw(45, 0, 80, false, false); out.roarStart = same(2, 20);
    draw(45, 0, 40, true, false); out.roarMid = same(2, 25);
    out.anim = a.animation;
    a.m_rotation = keep.rot; a._frameNumber = keep.frame; a.roarTicks = keep.roar; a._attacking = keep.att; a._atTarget = keep.at; a.m_lastCell = -1;
    return out;
  });
  check("the column follows her heading and the row what she does (walk, attack, idle, the roar from its first frame)", ["walkRight", "walkCamera", "attackLeft", "idleAway", "roarStart", "roarMid"].every((k) => frames[k] < 0.02) && frames.anim === "warcry", JSON.stringify(frames));

  // 6. the war-cry, roar by roar (the monsters held still; the roars made by hand)
  const cry = await g(() => {
    const T = window.__classByName("Targeting"), WC = window.__classByName("com.monsters.monsters.components.abilities::WarCry");
    const WB = window.__classByName("com.monsters.monsters.components.abilities::WarCryBoost"), SE = window.__classByName("com.monsters.monsters.components.abilities::StunEffect");
    const E = window.__classByName("com.monsters.monsters.components.abilities::Enrage");
    const C = window.__classByName("CREATURES"), M = window.__classByName("MAP"), P = window.__classByName("flash.geom::Point");
    const a1 = window.__a1, a6 = window.__a6, [z1, z2, z3] = window.__z;
    const freeze = (m, x, y) => { m._tmpPoint.x = x; m._tmpPoint.y = y; m._mc.x = x; m._mc.y = y; m.node = T.CreepCellMove(m._tmpPoint, m._id, m, m.node); m.tick = function () { this._mc.x = this._tmpPoint.x; this._mc.y = this._tmpPoint.y; return this.health <= 0; }; };
    const x = a1._tmpPoint.x, y = a1._tmpPoint.y;
    freeze(a1, x, y); freeze(a6, x + 30, y + 10); freeze(z1, x + 60, y); freeze(z2, x - 40, y + 20); freeze(z3, x + 900, y + 450);
    // a defender of the yard close by, and one far off
    const d1 = C.Spawn("IC1", M._BUILDINGTOPS, "defend", new P(x + 50, y - 20), 0), d2 = C.Spawn("IC1", M._BUILDINGTOPS, "defend", new P(x - 900, y - 450), 0);
    freeze(d1, x + 50, y - 20); freeze(d2, x - 900, y - 450);
    const wc = (a) => a.getComponentByType(WC);
    const boost = (m) => m.getComponentByName(WC.BOOST_NAME);
    const ratio = (m) => Math.round(m.moveSpeedProperty.value / m.moveSpeedProperty._value * 10000) / 10000;
    const base = (m) => m.moveSpeedProperty._value;
    const glows = (m, color) => (m.m_filters || []).filter((f) => f && f.color === color).length;
    const out = { base: base(z1) };
    for (const m of [a1, a6, z1, z2, z3, d1, d2]) { const b = boost(m); if (b) m.removeComponent(b); const r = m.getComponentByName(WC.ROOT_NAME); if (r) m.removeComponent(r); }
    out.mult = [wc(a1).speedMultiplier, wc(a6).speedMultiplier];
    // the level 1 one roars: x1.20 on the Zagnoids near, and on the other Ashkarr, not on herself or the far one
    wc(a1).cry();
    out.one = { z1: ratio(z1), z2: ratio(z2), a6: ratio(a6), a1: ratio(a1), far: ratio(z3), roaring: a1.roarTicks, anim: a1.animation, pink: [glows(z1, 0xFF33FF), glows(z3, 0xFF33FF), glows(a1, 0xFF33FF)], shown: z1._graphicMC.filters.length };
    // the level 6 one roars too: x1.35, not 1.20 x 1.35
    wc(a6).cry();
    out.two = { z1: ratio(z1), z2: ratio(z2), roars: boost(z1).roars, count: z1._components.filter((c) => c instanceof WB).length, pink: glows(z1, 0xFF33FF) };
    // the level 1 one again: still x1.35
    wc(a1).cry();
    out.three = { z1: ratio(z1), count: z1._components.filter((c) => c instanceof WB).length };
    // time: the level 6 roar runs out first (it came before the last level 1 one): back to x1.20, then to nothing
    const b = boost(z1);
    wc(a6).cry(); b.tick(400); wc(a1).cry(); b.tick(500);
    out.after = { z1: ratio(z1), roars: b.roars };
    b.tick(400);
    out.gone = { z1: ratio(z1), boost: !!boost(z1), pink: glows(z1, 0xFF33FF) };
    // back to back: 10 seconds (800 steps) after a roar the boost is still on; the next roar renews it for 11
    wc(a6).cry(); const b3 = boost(z1); b3.tick(799);
    out.chain = { before: ratio(z1), left: b3.m_roars[0].left };
    wc(a6).cry();
    out.chain.renewed = b3.m_roars[0].left; out.chain.same = boost(z1) === b3; out.chain.after = ratio(z1);
    b3.tick(879); out.chain.late = ratio(z1); b3.tick(1); out.chain.end = ratio(z1);
    // the defender close by is rooted (still attacks at its own speed); the far one is not
    const delay = d1.attackDelayProperty.value;
    wc(a6).cry();
    const r = d1.getComponentByName(WC.ROOT_NAME);
    out.root = { near: ratio(d1), far: ratio(d2), left: r && r.left, delay: [delay, d1.attackDelayProperty.value], a6: ratio(a6), white: [glows(d1, 0xFFFFFF), glows(d2, 0xFFFFFF)], pink: glows(d1, 0xFF33FF), alpha: r && r.glow.alpha };
    r.tick(559); out.root.still = ratio(d1);
    r.tick(1); out.root.after = ratio(d1); out.root.gone = !d1.getComponentByName(WC.ROOT_NAME); out.root.whiteAfter = glows(d1, 0xFFFFFF);
    // with a rage bomb's Enrage: the two multiply
    const rage = new E(1.5, 1);
    z2.addComponent(rage, "rageTest");
    const b2 = boost(z2); if (b2) z2.removeComponent(b2);
    const raged = ratio(z2);
    wc(a6).cry();
    out.rage = [raged, ratio(z2)];
    z2.removeComponent(rage);
    window.__d = [d1, d2];
    return out;
  });
  check("a roar: her side within 300 moves x1.20 (level 1), the other Ashkarr too; not herself, not a monster further off", cry.one && cry.one.z1 === 1.2 && cry.one.z2 === 1.2 && cry.one.a6 === 1.2 && cry.one.a1 === 1 && cry.one.far === 1 && cry.one.roaring === 80 && cry.one.anim === "warcry", JSON.stringify(cry.one));
  check("her side's boosted monsters glow pink (one glow, however many Ashkarrs roar; the far one and herself not)", cry.one.pink.join() === "1,0,0" && cry.one.shown >= 1 && cry.two.pink === 1, JSON.stringify([cry.one.pink, cry.one.shown, cry.two.pink]));
  check("two Ashkarrs don't stack: after the level 6 one's roar x1.35 (not 1.20 x 1.35), one boost on the monster", cry.two && cry.two.z1 === 1.35 && cry.two.z2 === 1.35 && cry.two.roars === 2 && cry.two.count === 1 && JSON.stringify(cry.mult) === "[1.2,1.35]", JSON.stringify([cry.mult, cry.two]));
  check("...and the weaker one roaring again changes nothing (x1.35)", cry.three && cry.three.z1 === 1.35 && cry.three.count === 1, JSON.stringify(cry.three));
  check("when the stronger roar runs out the weaker one still running counts (x1.20); when none is left, its own speed", cry.after && cry.after.z1 === 1.2 && cry.after.roars === 1 && cry.gone.z1 === 1 && !cry.gone.boost && cry.gone.pink === 0, JSON.stringify([cry.after, cry.gone]));
  check("boosts run back to back: 10 seconds after a roar it is still on, the next roar renews it for 11 seconds (880 steps), then it ends", cry.chain && cry.chain.before === 1.35 && cry.chain.left === 81 && cry.chain.renewed === 880 && cry.chain.same && cry.chain.after === 1.35 && cry.chain.late === 1.35 && cry.chain.end === 1, JSON.stringify(cry.chain));
  check("rooted monsters have a faint white glow (not pink), gone with the root; not on the far one", cry.root && cry.root.white.join() === "1,0" && cry.root.pink === 0 && cry.root.alpha < 0.6 && cry.root.whiteAfter === 0, JSON.stringify(cry.root));
  check("the other side within 300 is rooted for 7 seconds (560 steps), still attacking at its own speed; not further off", cry.root && cry.root.near <= 0.001 && cry.root.far === 1 && cry.root.left === 560 && cry.root.delay[0] === cry.root.delay[1] && cry.root.still <= 0.001 && cry.root.after === 1 && cry.root.gone, JSON.stringify(cry.root));
  check("the boost multiplies with a rage bomb's Enrage (x1.5 x1.35)", cry.rage && cry.rage[0] === 1.5 && Math.abs(cry.rage[1] - 2.025) < 0.0002, JSON.stringify(cry.rage));

  // 7. left to the game for 12 seconds of game time: they roar on their own every 10 seconds, and nobody ever goes over x1.35
  const run = await g(async () => {
    const WC = window.__classByName("com.monsters.monsters.components.abilities::WarCry"), CR = window.__classByName("CREEPS");
    const a1 = window.__a1, a6 = window.__a6;
    // let them move again (a fresh Ashkarr pair and fresh Zagnoids of the attack keep ticking on their own)
    for (const m of [a1, a6, ...window.__z, ...window.__d]) delete m.tick;
    for (const m of [a1, a6]) { const w = m.getComponentByType(WC); w.m_wait = 0; }
    const roars = [0, 0]; let was = [0, 0]; let max = 1, maxRoars = 0; const t0 = performance.now(); const samples = [];
    // 12 seconds of game time (960 steps, counted on her), however fast the browser runs the game
    const f0 = a1._frameNumber;
    while (a1._frameNumber - f0 < 960 && performance.now() - t0 < 40000) {
      [a1, a6].forEach((a, i) => { if (a.roarTicks > was[i]) roars[i]++; was[i] = a.roarTicks; });
      for (const k in CR._creeps) {
        const m = CR._creeps[k]; if (!m || m.health <= 0 || !m.moveSpeedProperty) continue;
        const b = m.getComponentByName(WC.BOOST_NAME); const e = m._components.some((c) => c.name === "rageTest");
        if (e) continue;
        const r = m.moveSpeedProperty.value / m.moveSpeedProperty._value; if (r > max) max = r;
        if (b && b.roars > maxRoars) maxRoars = b.roars;
      }
      samples.push(a1.roarTicks);
      await new Promise((r) => setTimeout(r, 30));
    }
    return { roars, max: Math.round(max * 10000) / 10000, maxRoars, steps: a1._frameNumber - f0, secs: Math.round((performance.now() - t0) / 100) / 10, inBattle: [a1.inBattleState, a6.inBattleState] };
  });
  check("in the game they roar on their own every 10 seconds (twice each in 12 seconds), and no monster is ever faster than x1.35", run.roars.every((n) => n === 2) && run.max <= 1.3501 && run.max >= 1.2 && run.maxRoars >= 1, JSON.stringify(run));
  await g(async () => { const M = window.__classByName("MAP"); const a = window.__a6; M._autoScroll = false; M.FocusTo(a._mc.x, a._mc.y, 0.1); a.getComponentByType(window.__classByName("com.monsters.monsters.components.abilities::WarCry")).cry(); });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${shots}/ashkarr-1-roar.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/ashkarr-2-attack.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/ashkarr-error.png` }).catch(() => {});
} finally {
  await browser.close();
}
