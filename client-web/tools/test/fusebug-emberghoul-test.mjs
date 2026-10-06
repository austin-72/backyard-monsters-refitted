// The Fusebug (IC15) and the Emberghoul (IC20) (the user's FUSEBUG_EMBERGHOUL.md), and the new monsters'
// standing frames, in the game:
//  - the Strongbox: the Fusebug on page 1 after Zagnoid (Strongbox level 1, 19,200, housing 10), the
//    Emberghoul on page 4 after King Wormzer (level 4, 5,120,000, housing 100); the Academy lists them; their
//    names, words and pictures (portraits, icons, the unlock picture, the sheets); Ashkarr's unlock picture
//  - the Hatchery's numbers: 15 is the Fusebug, 19 still Rezghul (why the Fusebug is not IC19)
//  - their stats are the server's (monsterStats.ts; the Fusebug's "explode" too), and the server knows them
//  - the Fusebug: runs at a defence, creeps on in (walking) to within 12 of the building's middle and blows up:
//    the tower takes nearly the whole blast (500 at level 1), the Fusebug gone, its own line in the attack log
//  - the Emberghoul: heals 8% (level 1) to 12% (level 6) of the damage each hit does, never above its
//    maximum; in a real fight against a building it heals as it hits; drawn on its own 66 x 45 canvas
//  - standing frames: the Fusebug, Clinkerjaw, Flickerfiend and Emberghoul walk only when they move; at their
//    target the Emberghoul shows its attack rows (9-16) and the others their standing frame (row 0); held
//    still (not at a target) they stand too; the Flickerfiend's shimmer is left alone; Korath and Ashkarr
//    stand when held still
//  - their names and words also come from the game itself when the language file is an old copy without
//    them; the language file is fetched fresh each session
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir [SERVER_DIR=../server] node tools/test/fusebug-emberghoul-test.mjs
// The yard gets a Magma Tower for the test (in the database; the Under Hall made level 6), both put back after;
// a wild attack is launched on the yard (not saved). Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const serverDir = resolve(process.env.SERVER_DIR || "../server");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const bun = (code) => {
  try {
    return JSON.parse(execFileSync("bun", ["-e", code], { cwd: serverDir }).toString().trim().split("\n").pop());
  }
  catch (e) {
    return { err: e.message.slice(0, 300) };
  }
};
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const TOWER = 999132;
const hall = sql(`SELECT buildingdata->'0' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym.save SET buildingdata = jsonb_set(COALESCE(buildingdata, '{}'::jsonb) || '{"${TOWER}": {"X": 320, "Y": 260, "t": 132, "id": ${TOWER}, "l": 1}}'::jsonb, '{0,l}', '6'), buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${TOWER}' WHERE userid = ${uid} AND type = 'main'`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /IC15|IC20|IC24|fusebug|emberghoul/i.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
const langUrls = [];
page.on("request", (q) => { if (/gamestage\/assets\/english\.json/.test(q.url())) langUrls.push(q.url()); });
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; });

  // 1. the Strongbox, the Academy, words, pictures
  const locker = await g(async () => {
    const L = window.__classByName("CREATURELOCKER"), K = window.__game.KEYS, G = window.__game.GLOBAL;
    const P = window.__classByName("CREATURELOCKERPOPUP");
    const keep = G._bLocker; if (!G._bLocker) G._bLocker = G.townHall;
    L._page = 1; const pop = G._layerWindows.addChild(new P());
    await new Promise((r) => setTimeout(r, 800));
    const page = (n) => { L._page = n; pop.List(); return pop._tempCreatureList.map((x) => x.id); };
    const p1 = page(1), p4 = page(4);
    L._page = 1; pop.List(); try { window.__classByName("POPUPSETTINGS").AlignToCenter(pop); } catch (e) {}
    pop.ShowB("IC15");
    window.__lockerPop = pop; G._bLocker = keep;
    const c = L._creatures, f = c.IC15, e = c.IC20;
    const A = window.__classByName("ACADEMYPOPUP"), H = window.__classByName("HATCHERYPOPUP");
    return {
      p1, p4,
      f: [f.page, f.order, f.resource, f.level, f.props.cStorage[0], f.props.targetGroup[0], f.props.explode[0], !f.classType || f.classType.name],
      e: [e.page, e.order, e.resource, e.level, e.props.cStorage[0], e.props.targetGroup[0]],
      names: [K.Get(f.name), K.Get(e.name)], desc: [K.Get(f.description), K.Get(e.description)], log: K.Get("attack_log_fusebug"),
      roster: A.ioRoster(), test: ["IC15", "IC20"].every((id) => L.ioTestMonsterIds().includes(id)),
      hatch: [H.ioMonsterId(15), H.ioMonsterId(19), H.ioMonsterId(20)],
    };
  });
  check("Strongbox page 1: Spurtz, Zagnoid, then the Fusebug; page 4: King Wormzer, Rezghul, then the Emberghoul", locker.p1.join() === "IC1,IC2,IC15" && locker.p4[0] === "IC8" && locker.p4[locker.p4.length - 1] === "IC20", JSON.stringify([locker.p1, locker.p4]));
  check("the Fusebug: Strongbox level 1, 19,200, housing 10, goes for defences, explodes; the Emberghoul: level 4, 5,120,000, housing 100, anything", JSON.stringify(locker.f.slice(0, 7)) === "[1,3,19200,1,10,4,1]" && JSON.stringify(locker.e) === "[4,3,5120000,4,100,1]", JSON.stringify([locker.f, locker.e]));
  await page.screenshot({ path: `${shots}/fe-0-strongbox.png` });
  await g(() => { const p = window.__lockerPop; if (p && p.parent) p.parent.removeChild(p); });
  check("their names, words and attack-log line", locker.names.join() === "Fusebug,Emberghoul" && /blows itself up/.test(locker.desc[0]) && /heals itself/.test(locker.desc[1]) && /Fusebug/.test(locker.log), JSON.stringify([locker.names, locker.log]));
  check("the Academy lists them (the Fusebug after Zagnoid, the Emberghoul after King Wormzer and Rezghul); admin test mode has them", locker.roster.join().includes("IC2,IC15,IC3") && locker.roster.join().includes("IC8,C19,IC20") && locker.test, JSON.stringify(locker.roster));
  check("the Hatchery's numbers: 15 is the Fusebug, 19 is still Rezghul, 20 the Emberghoul", locker.hatch.join() === "IC15,C19,IC20", JSON.stringify(locker.hatch));
  // the words even from an old copy of the language file (one without them): the game's own English
  const stale = await g(() => {
    const K = window.__game.KEYS, J = K.languageFileJson, keep = {};
    for (const k of ["#m_fusebug#", "mi_Fusebug_desc", "#m_emberghoul#", "mi_Emberghoul_desc", "#m_ashkarr#"]) { keep[k] = J[k]; delete J[k]; }
    const got = ["#m_fusebug#", "mi_Fusebug_desc", "#m_emberghoul#", "mi_Emberghoul_desc", "#m_ashkarr#"].map((k) => K.Get(k));
    for (const k in keep) J[k] = keep[k];
    return got;
  });
  check("the names and words show even from an old language file without them, and the file is fetched fresh (no stale copy)", stale[0] === "Fusebug" && /blows itself up/.test(stale[1]) && stale[2] === "Emberghoul" && /heals itself/.test(stale[3]) && stale[4] === "Ashkarr" && langUrls.length > 0 && langUrls.every((u) => /english\.json\?t=\d+/.test(u)), JSON.stringify([stale, langUrls]));
  const pics = [];
  for (const f of ["monsters/IC15-portrait.jpg", "monsters/IC15-150.jpg", "monsters/IC15-medium.jpg", "monsters/IC15-small.png", "popups/IC15-150.png", "monsters/fusebug.png", "monsters/IC20-portrait.jpg", "monsters/IC20-150.jpg", "monsters/IC20-medium.jpg", "monsters/IC20-small.png", "popups/IC20-150.png", "monsters/emberghoul.png", "popups/IC24-150.png"]) pics.push([f, (await fetch(`${server}assets/${f}`)).status]);
  check("their pictures are served (portraits, icons, unlock pictures, sheets; and Ashkarr's unlock picture)", pics.every((p) => p[1] === 200), JSON.stringify(pics.filter((p) => p[1] !== 200)));

  // 2. the server
  const client = await g(() => { const c = window.__classByName("CREATURELOCKER")._creatures; return { IC15: c.IC15.props, IC20: c.IC20.props }; });
  const srv = bun("import {monsterStats} from './src/game-data/stats/monsterStats.ts'; import {inferoMonsters} from './src/game-data/stats/monsterKeys.ts'; console.log(JSON.stringify({a: monsterStats.IC15, b: monsterStats.IC20, k: ['IC15', 'IC20'].every((id) => inferoMonsters.includes(id)), r: monsterStats.C19 && !!monsterStats.C19.props}))");
  const same = (a, b) => b && Object.keys(b).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
  check("the server checks the same stats (the Fusebug's explode too) and knows both as Inferno monsters", srv.a && same(client.IC15, srv.a.props) && same(client.IC20, srv.b.props) && srv.a.props.explode && srv.k && srv.r, JSON.stringify(srv.err || [Object.keys(srv.a.props), Object.keys(srv.b.props)]));

  // 3. an attack: Fusebugs, Emberghouls at levels 1 and 6, a Clinkerjaw and a Flickerfiend
  await g(() => {
    const W = window.__game.WMATTACK, G = window.__game.GLOBAL, CR = window.__classByName("CREEPS"), M = window.__classByName("MAP"), P = window.__classByName("flash.geom::Point");
    W._history.lastattack = 0; G._flags.io_wildlast = 0;
    W._queued = { type: 7, attack: { IC12: 1, IC14: 1 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC12: 100, IC14: 100 }, warned: 1, t: 1, level: 1 };
    W.LaunchQueuedAttack();
    const B = window.__game.BASE; let tower = null; for (const k in B._buildingsAll) if (B._buildingsAll[k]._id == 999132) tower = B._buildingsAll[k];
    window.__tower = tower;
    const h = G.townHall;
    window.__e1 = CR.Spawn("IC20", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 400, h._mc.y + 200), 0, 1, true, false, 1);
    window.__e6 = CR.Spawn("IC20", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 420, h._mc.y + 210), 0, 1, true, false, 6);
    window.__fb = CR.Spawn("IC15", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 600, h._mc.y - 300), 0, 1, true, false, 1);
    const CRx = window.__classByName("CREEPS"); for (const k in CRx._creeps) { const m = CRx._creeps[k]; if (m._creatureID === "IC12") window.__cj = m; if (m._creatureID === "IC14") window.__ff = m; }
  });
  await page.waitForTimeout(2500);
  const made = await g(() => {
    const E = window.__classByName("com.monsters.monsters.creeps.inferno::Emberghoul"), LS = window.__classByName("com.monsters.monsters.components.abilities::LifestealOnAttack"), S = window.__classByName("SPRITES");
    const ls = (m) => m.getComponentByType(LS);
    const opaque = (m) => { const b = m._graphic; let n = 0; for (let y = 0; y < b.height; y += 2) for (let x = 0; x < b.width; x += 2) if ((b.getPixel32(x, y) >>> 24) > 100) n++; return n; };
    const e1 = window.__e1, e6 = window.__e6, fb = window.__fb;
    return {
      cls: [e1 instanceof E, e6 instanceof E], lv: [e1.level, e6.level], hp: [e1.maxHealth, e6.maxHealth, fb.maxHealth], steal: [ls(e1) && ls(e1).ratio, ls(e6) && ls(e6).ratio],
      canvas: [e1._graphic.width, e1._graphic.height, e1._graphicMC.x, e1._graphicMC.y], sheets: [!!S._sprites.IC15.image, !!S._sprites.IC20.image], px: [opaque(e1), opaque(fb)], tower: !!window.__tower,
    };
  });
  check("Emberghouls at levels 1 and 6 (3,680 and 6,500 health) heal 8% and 12% of their hits; a Fusebug (270 health)", made.cls.every(Boolean) && made.lv.join() === "1,6" && made.hp.join() === "3680,6500,270" && made.steal.join() === "0.08,0.12", JSON.stringify(made));
  check("their sheets load and they are drawn (the Emberghoul on its own 66 x 45 canvas, its feet on its spot)", made.sheets.every(Boolean) && made.px.every((n) => n > 40) && made.canvas.join() === "66,45,-33,-38", JSON.stringify(made));

  // 4. the Emberghoul's heal, hit by hit
  const heal = await g(() => {
    const LS = window.__classByName("com.monsters.monsters.components.abilities::LifestealOnAttack");
    const e1 = window.__e1, e6 = window.__e6, h = window.__game.GLOBAL.townHall;
    const c1 = e1.getComponentByType(LS), c6 = e6.getComponentByType(LS);
    e1.setHealth(2000); c1.onAttack(h, 1000); const a = e1.health;
    e6.setHealth(3000); c6.onAttack(h, -1000); const b = e6.health; // (a monster hit reports its loss as negative)
    e1.setHealth(3650); c1.onAttack(h, 1000); const cap = e1.health;
    e1.setHealth(3680); c1.onAttack(h, 1000); const full = e1.health;
    c1.onAttack(h, 0); const none = e1.health;
    return { a, b, cap, full, none };
  });
  check("a hit of 1,000 heals a level 1 Emberghoul 80 and a level 6 one 120; never above its maximum; nothing at full health or for a hit that did nothing", heal.a === 2080 && heal.b === 3120 && heal.cap === 3680 && heal.full === 3680 && heal.none === 3680, JSON.stringify(heal));
  // in a real fight: the level 6 one, hurt, clawing at the Under Hall
  const fight = await g(async () => {
    const LS = window.__classByName("com.monsters.monsters.components.abilities::LifestealOnAttack"), T = window.__classByName("Targeting");
    const e = window.__e6, h = window.__game.GLOBAL.townHall, c = e.getComponentByType(LS);
    e._tmpPoint.x = h._mc.x + 40; e._tmpPoint.y = h._mc.y + h._middle + 40; e.node = T.CreepCellMove(e._tmpPoint, e._id, e, e.node);
    e.setHealth(2000); c.healed = 0;
    e._targetBuilding = h; e._hasTarget = true; e._atTarget = true; e._waypoints = []; e._hasPath = false;
    const hall0 = h.health; const rows = new Set(); let max = 0;
    for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 50)); if (e.health > max) max = e.health; if (e._atTarget) rows.add(Math.floor(e._lastFrame / 30)); }
    return { healed: Math.round(c.healed), hallLost: hall0 - h.health, health: e.health, max: e.maxHealth, highest: max, rows: [...rows].sort((a, b) => a - b), at: e._atTarget };
  });
  check("in a fight it heals as it hits (about 12% of what the Under Hall loses), never over its maximum", fight.healed > 0 && fight.hallLost > 0 && Math.abs(fight.healed - fight.hallLost * 0.12) <= fight.hallLost * 0.02 + 2 && fight.highest <= fight.max, JSON.stringify(fight));
  check("while it fights it shows its attack rows (9-16), not the walk", fight.rows.length > 0 && fight.rows.every((r) => r >= 9 && r <= 16), JSON.stringify(fight.rows));

  // 5. the Fusebug: at the Magma Tower it blows up on its first attack
  const boom = await g(async () => {
    const fb = window.__fb, t = window.__tower, T = window.__classByName("Targeting"), A = window.__classByName("ATTACK");
    if (!t) return { noTower: true };
    const logs = []; const origLog = A.Log; A.Log = function (id, text) { logs.push(String(text)); return origLog.apply(this, arguments); };
    t.setHealth(t.maxHealth); const t0 = t.health;
    // just outside the tower's footprint (70 across): 45 from its middle, where a creep stops
    const PA = window.__classByName("com.monsters.pathing::PATHING"), Pt = fb._tmpPoint.constructor;
    const mid = PA.FromISO(new Pt(t._mc.x, t._mc.y + t._middle)); const start = PA.ToISO(new Pt(mid.x + 45, mid.y), 0);
    fb._tmpPoint.x = start.x; fb._tmpPoint.y = start.y; fb.node = T.CreepCellMove(fb._tmpPoint, fb._id, fb, fb.node);
    fb._targetBuilding = t; fb._hasTarget = true; fb._atTarget = true; fb._waypoints = []; fb._hasPath = false;
    fb.setHealth(100000); // (so the tower can't shoot it down first: it has to go off by itself)
    // (explode() is where it creeps in, a step a call, then goes off: count the steps and where it went off)
    let exploded = 0, calls = 0, startD = -1, endD = -1, walking = 0; const origX = fb.explode.bind(fb);
    fb.explode = function () { calls++; if (startD < 0) startD = fb.distanceTo(t); const r = origX(); if (fb.approaching && fb.ioAction() === "walking") walking++; if (fb.health <= 0 && !exploded) { exploded = 1; endD = fb.distanceTo(t); } return r; };
    let gone = false;
    for (let i = 0; i < 120 && !gone; i++) { await new Promise((r) => setTimeout(r, 50)); if (fb.health <= 0) gone = true; }
    A.Log = origLog;
    return { gone, exploded, approach: calls - 1, walking, from: Math.round(startD), at: Math.round(endD), lost: t0 - t.health, target: fb._targetBuilding && fb._targetBuilding._type, line: logs.find((l) => /Fusebug|self-destructed/.test(l)) || null };
  });
  check("a Fusebug at the Magma Tower creeps on in (walking) to within 12 of its middle before it goes off: the tower takes nearly all 500, the Fusebug gone, its own line in the attack log", boom.gone && boom.exploded === 1 && boom.from > 20 && boom.at <= 12 && boom.approach > 0 && boom.walking > 0 && boom.lost >= 440 && boom.lost <= 500 && boom.line && /Fusebug/.test(boom.line), JSON.stringify(boom));

  // 6. standing frames: walk only when moving
  const frames = await g(() => {
    const out = {};
    const row = (m) => Math.floor(m._lastFrame / 30);
    const reset = (m) => { m._ioStillFor = 0; m._ioLastX = NaN; m._ioLastY = NaN; };
    for (const [key, m] of [["IC12", window.__cj], ["IC14", window.__ff], ["IC20", window.__e1]]) {
      if (!m) { out[key] = null; continue; }
      const keep = { at: m._atTarget, att: m._attacking, x: m._tmpPoint.x, f: m._frameNumber, sa: m.spriteAction };
      m.spriteAction = "walking";
      // fighting: at its target
      m._atTarget = true; m._attacking = true; m._frameNumber = 16; reset(m); m._lastFrame = -1; m.getNextSprite(); const fight = row(m);
      // walking: moving each drawn frame
      m._atTarget = false; m._attacking = false; reset(m); const walk = []; for (let i = 0; i < 4; i++) { m._tmpPoint.x += 2; m._frameNumber += 8; m._lastFrame = -1; m.getNextSprite(); walk.push(row(m)); }
      // held still, not at a target (a root)
      reset(m); const held = []; for (let i = 0; i < 5; i++) { m._frameNumber += 8; m._lastFrame = -1; m.getNextSprite(); held.push(row(m)); }
      out[key] = { fight, walk, held: held.slice(-2) };
      m._atTarget = keep.at; m._attacking = keep.att; m._tmpPoint.x = keep.x; m._frameNumber = keep.f; m.spriteAction = keep.sa; m._lastFrame = -1;
    }
    // the Flickerfiend's shimmer is its own
    const ff = window.__ff; if (ff) { ff.spriteAction = "blink"; ff._atTarget = true; ff._lastFrame = -1; ff._frameNumber = 0; ff.getNextSprite(); out.blink = row(ff); ff.spriteAction = "walking"; ff._atTarget = false; }
    // a Fusebug (a fresh one: the first went up)
    const CR = window.__classByName("CREEPS"), M = window.__classByName("MAP"), P = window.__classByName("flash.geom::Point"), h = window.__game.GLOBAL.townHall;
    const fb = CR.Spawn("IC15", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 900, h._mc.y - 450), 0, 1, true, false, 1);
    fb._atTarget = true; fb._lastFrame = -1; fb.getNextSprite(); const fbFight = row(fb);
    fb._atTarget = false; reset(fb); const fbWalk = []; for (let i = 0; i < 3; i++) { fb._tmpPoint.x += 2; fb._frameNumber += 8; fb._lastFrame = -1; fb.getNextSprite(); fbWalk.push(row(fb)); }
    out.IC15 = { fight: fbFight, walk: fbWalk };
    fb.setHealth(0);
    return out;
  });
  const walks = (w) => w && w.every((r) => r >= 1 && r <= 8);
  check("fighting: the Emberghoul shows its attack rows, the Clinkerjaw, Flickerfiend and Fusebug their standing frame (no running on the spot)", frames.IC20 && frames.IC20.fight >= 9 && frames.IC20.fight <= 16 && frames.IC12.fight === 0 && frames.IC14.fight === 0 && frames.IC15.fight === 0, JSON.stringify(frames));
  check("moving they walk (rows 1-8); held still, not at a target, they stand (row 0); the Flickerfiend's shimmer is its own (rows 9-12)", ["IC12", "IC14", "IC20"].every((k) => walks(frames[k].walk) && frames[k].held.every((r) => r === 0)) && walks(frames.IC15.walk) && frames.blink >= 9 && frames.blink <= 12, JSON.stringify(frames));
  // the champions: held still, they stand
  const champs = await g(() => {
    const CR = window.__classByName("CREEPS"), M = window.__classByName("MAP"), P = window.__classByName("flash.geom::Point"), h = window.__game.GLOBAL.townHall, S = window.__classByName("SPRITES");
    const out = {};
    const k = CR.Spawn("IC9", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 900, h._mc.y + 450), 0, 1, true, false, 1);
    const calls = []; const orig = S.GetSprite; S.GetSprite = function (bmd, id, action) { calls.push(action); return orig.apply(this, arguments); };
    k._atTarget = false; k._attacking = false; k._ioStillFor = 0; k._ioLastX = NaN;
    for (let i = 0; i < 5; i++) k.getNextSprite();
    S.GetSprite = orig; out.korath = calls.slice(-2);
    const a = CR.Spawn("IC24", M._BUILDINGTOPS, "bounce", new P(h._mc.x - 850, h._mc.y + 450), 0, 1, true, false, 1);
    a._atTarget = false; a._attacking = false; a.roarTicks = 0; a._ioStillFor = 0; a._ioLastX = NaN;
    for (let i = 0; i < 5; i++) a.getNextSprite();
    out.ashkarr = a.animation;
    k.setHealth(0); a.setHealth(0);
    return out;
  });
  check("Korath and Ashkarr held still stand too (not walking on the spot)", champs.korath.every((x) => x === "idle") && champs.ashkarr === "idle", JSON.stringify(champs));
  await g(() => { const M = window.__classByName("MAP"); const e = window.__e6; M._autoScroll = false; M.FocusTo(e._mc.x, e._mc.y, 0.1); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${shots}/fe-1-fight.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/fe-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET buildingdata = jsonb_set(buildingdata - '${TOWER}', '{0}', '${hall}'::jsonb), buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${TOWER}' WHERE userid = ${uid} AND type = 'main'`);
}
