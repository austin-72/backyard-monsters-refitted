// The Inferno's two new towers (newtowers.md), in the game:
//  - the Cinder Coil (144) and the Obsidian Mortar (145) load as their classes, level 6, with their art
//    (the Coil's 32 aim frames and 12-frame charge overlay, the Mortar's 32 aim frames); their build menu
//    buttons and names; a damaged tower shows its damaged strips
//  - the Coil: a swarm of Spurtz round it; a shot is a cycle (28 September): it spins for 0.5 s speeding up
//    while it charges (the overlay's frames 1-8), turns smoothly to the target for 0.25 s and stops on it,
//    shocks from the orb's prong on the target's side (the flash, 9), rests 0.25 s (10, 11), and goes again
//    at once while it has a target: one shot a second; no jumps in its turning. The arc: the first monster
//    650, then leaping to the next closest not yet hit within 70, 20% less each time, up to 6 more (7 in all)
//  - the Mortar: nothing inside 100 is a target; a monster at 200 is: the shell is lobbed (not homing; 0.6 to
//    1 s, a smooth parabola, the shadow shrinking under it, turning over once), lands
//    where the monster stood, and hurts everything within the splash, full at the middle and down to half
//    at the edge; a shell in the air when the tower falls still lands
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/new-towers-test.mjs
// The account's yard gets the two towers for the test (in the database, the yard's saving blocked) and
// loses them after. A wild attack is launched on the yard (not saved). Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const COIL = 999144, MORTAR = 999145;
const add = (id, t, x, y) => `'{"${id}": {"X": ${x}, "Y": ${y}, "t": ${t}, "id": ${id}, "l": 6}}'::jsonb`;
// (the yard's Under Hall made level 6 for the test, so both are allowed: the game takes away buildings
// over the Under Hall's limits when a yard loads)
const hall = sql(`SELECT buildingdata->'0' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym.save SET buildingdata = jsonb_set(COALESCE(buildingdata, '{}'::jsonb) || ${add(COIL, 144, -260, -120)} || ${add(MORTAR, 145, 240, -140)}, '{0,l}', '6'), buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${COIL}' - '${MORTAR}' WHERE userid = ${uid} AND type = 'main'`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /icindercoil|iobsidianmortar|cinder_coil|obsidian_mortar/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(([c, m]) => {
    window.__game.BASE._blockSave = true;
    const B = window.__game.BASE;
    const find = (id) => { for (const k in B._buildingsAll) if (B._buildingsAll[k]._id == id) return B._buildingsAll[k]; return null; };
    window.__coil = find(c); window.__mortar = find(m);
  }, [COIL, MORTAR]);
  // 1. loaded
  const loaded = await g(() => {
    const c = window.__coil, m = window.__mortar, K = window.__game.KEYS;
    const C = window.__classByName("INFERNO_CINDER_COIL"), M = window.__classByName("INFERNO_OBSIDIAN_MORTAR");
    return {
      coil: c && c instanceof C, mortar: m && m instanceof M, lv: [c && c._lvl.Get(), m && m._lvl.Get()],
      names: [K.Get(c._buildingProps.name), K.Get(m._buildingProps.name)], desc: K.Get(c._buildingProps.description),
      coilAnim: [c._animLoaded, c._animFrames, c._anim2Loaded, c._anim2Frames, c._anim2Tick], mortarAnim: [m._animLoaded, m._animFrames],
      stats: [c._range, c.damage, c._rate, m._range, m.damage, m._rate, m._splash, m._speed],
    };
  });
  check("the Cinder Coil and the Obsidian Mortar load as their classes, level 6", loaded.coil && loaded.mortar && loaded.lv.join() === "6,6", JSON.stringify(loaded.lv));
  check("their names and description", loaded.names.join() === "Cinder Coil,Obsidian Mortar" && /arcs of fire/.test(loaded.desc), JSON.stringify(loaded.names));
  check("the Coil: 32 aim frames and the 12-frame charge overlay, resting on its empty frame", loaded.coilAnim.join() === "true,32,true,12,0", JSON.stringify(loaded.coilAnim));
  check("the Mortar: 32 aim frames", loaded.mortarAnim.join() === "true,32", JSON.stringify(loaded.mortarAnim));
  check("level 6: Coil range 240, 650 a hit, every 1.5 s; Mortar range 385, 1,238, every 4.5 s, splash 56, shell speed 8", loaded.stats.join() === "240,650,30,385,1238,90,56,8", JSON.stringify(loaded.stats));
  // the build menu: both under Defenses, with their buttons
  const menu = await g(() => { const P = window.__game.GLOBAL._buildingProps; return [143, 144].map((i) => [P[i].group, P[i].buildingbuttons[0], P[i].quantity.join(), P[i].costs[0].re[0].join()]); });
  check("in the build menu under Defenses from Under Hall 3 (1 of each, 3 Coils and 2 Mortars at Under Hall 6)", JSON.stringify(menu) === JSON.stringify([[3, "cinder_coil", "0,0,0,1,2,2,3", "14,1,3"], [3, "obsidian_mortar", "0,0,0,1,1,2,2", "14,1,3"]]), JSON.stringify(menu));
  // a look at them (the view on each)
  await g(() => { const M = window.__classByName("MAP"); const c = window.__mortar; M.FocusTo && M.FocusTo(c._mc.x, c._mc.y, 0.1); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/towers-2-mortar.png` });
  // (the view stays on the Coil for the attack)
  await g(() => { const M = window.__classByName("MAP"); const c = window.__coil; M.FocusTo && M.FocusTo(c._mc.x + 150, c._mc.y, 0.1); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/towers-1-coil.png` });

  // 2. a swarm round the Coil
  await g(() => {
    const W = window.__game.WMATTACK, G = window.__game.GLOBAL;
    W._history.lastattack = 0; G._flags.io_wildlast = 0;
    W._queued = { type: 7, attack: { IC1: 9, IC6: 1 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC1: 100, IC6: 100 }, warned: 1, t: 1, level: 1 };
    W.LaunchQueuedAttack();
    const CR = window.__classByName("CREEPS"); window.__sw = []; window.__big = null;
    for (const k in CR._creeps) { const m = CR._creeps[k]; if (m._creatureID === "IC1") window.__sw.push(m); else if (m._creatureID === "IC6") window.__big = m; }
    // (held where the test puts them: no walking, no attacking; drawn where they are)
    const T = window.__classByName("Targeting");
    for (const m of window.__sw.concat([window.__big])) m.tick = function () { this._mc.x = this._tmpPoint.x; this._mc.y = this._tmpPoint.y; this.node = T.CreepCellMove(this._tmpPoint, this._id, this, this.node); return this.health <= 0; };
  });
  // (nine Spurtz in a line 40 apart, the first 60 from the Coil; the Grokus out of everyone's reach)
  const placed = await g(() => {
    const c = window.__coil, P = window.__classByName("com.monsters.pathing::PATHING");
    const at = c._position.add(new c._position.constructor(0, c._footprint[0].height / 2));
    const g0 = P.FromISO(at);
    window.__place = () => {
      window.__sw.forEach((m, i) => {
        const iso = P.ToISO(new g0.constructor(g0.x + 60 + i * 40, g0.y), 0);
        m._tmpPoint.x = iso.x; m._tmpPoint.y = iso.y; m._mc.x = iso.x; m._mc.y = iso.y; m.node = window.__classByName("Targeting").CreepCellMove(m._tmpPoint, m._id, m, m.node); m._waypoints = []; m._hasPath = false; m._atTarget = true; m._speed = 0;
        m.setHealth(100000);
      });
      const b = window.__big; b._tmpPoint.x = at.x + 2000; b._tmpPoint.y = at.y + 2000; b._speed = 0; b._hasPath = false;
    };
    window.__place();
    return { n: window.__sw.length, iso: !!P.ToISO };
  });
  check("nine Spurtz lined up 40 apart from the Coil", placed.n === 9 && placed.iso, JSON.stringify(placed));
  // watch a shot, step by step as the Coil ticks: its phase, heading and overlay frame, the arcs and the hits
  const shot = await g(async () => {
    const c = window.__coil, E = window.__classByName("EFFECTS");
    window.__place();
    const before = window.__sw.map((m) => m.health);
    let n = 0; const arcs = []; const origL = E.Lightning; E.Lightning = function (x1, y1, x2, y2) { arcs.push({ x1, y1, x2, y2, step: n }); return origL.apply(this, arguments); };
    const trace = []; const orig = c.TickAttack.bind(c);
    c.TickAttack = () => { n++; orig(); trace.push({ phase: c.phase, angle: c.angle, frame: c._anim2Tick, aim: c._animTick }); };
    c._fireTick = 1; c.FindTargets(1, 1);
    for (let i = 0; i < 400; i++) { await new Promise((r) => setTimeout(r, 10)); const f = trace.findIndex((t) => t.frame === 9); if (f >= 0 && trace.findIndex((t, k) => k > f && t.phase === 1) > 0) break; }
    c.TickAttack = orig; E.Lightning = origL;
    const lost = window.__sw.map((m, k) => before[k] - m.health);
    const start = trace.findIndex((t) => t.phase === 1);
    const flash = trace.findIndex((t) => t.frame === 9);
    const again = trace.findIndex((t, i) => i > flash && t.phase === 1);
    const spin = trace.filter((t, i) => i >= start && i < flash && t.phase === 1);
    const aim = trace.filter((t, i) => i >= start && i <= flash && t.phase === 2);
    const step = (a, b) => { let d = b - a; if (d < -16) d += 32; if (d > 16) d -= 32; return d; };
    const deltas = trace.slice(start, flash + 1).map((t, i, arr) => i ? step(arr[i - 1].angle, t.angle) : 0).slice(1);
    const first = window.__sw[0], P = window.__classByName("com.monsters.pathing::PATHING"), Pt = first._tmpPoint.constructor;
    const it = P.FromISO(first._tmpPoint), me = P.FromISO(new Pt(c._mc.x, c._mc.y)).add(new Pt(35, 35));
    let want = Math.atan2(it.y - me.y, it.x - me.x) * 57.2957795; if (want < 0) want += 360; want /= 11.25;
    const a0 = arcs.find((a) => a.step >= flash) || arcs[0] || null; const orb = { x: c._mc.x, y: c._mc.y + c._top };
    const pr = c.prong();
    return {
      start, flash, again, spinSteps: spin.length, aimSteps: aim.length,  period: again - start, restFrames: [...new Set(trace.slice(flash, again).map((t) => t.frame))],
      spinFrames: [...new Set(spin.map((t) => t.frame))], spinTurn: Math.round(spin.reduce((s, t, i, arr) => s + (i ? step(arr[i - 1].angle, t.angle) : 0), 0) * 10) / 10,
      speedUp: spin.length > 10 && step(spin[1].angle, spin[2].angle) < step(spin[spin.length - 2].angle, spin[spin.length - 1].angle),
      maxStep: Math.round(Math.max(...deltas.map(Math.abs)) * 100) / 100, aimSpeedUps: deltas.slice(-20).filter((d, i, arr) => i && d > arr[i - 1] + 0.01).length, backwards: deltas.filter((d) => d < -0.01).length, lastAimStep: Math.round(Math.abs(deltas[deltas.length - 1]) * 100) / 100,
      heading: Math.round(trace[flash].angle * 10) / 10, want: Math.round(want * 10) / 10, aimFrame: trace[flash].aim,
      arc: a0 && { fromProng: Math.abs(a0.x1 - pr.x) <= 1 && Math.abs(a0.y1 - pr.y) <= 1, facing: ((a0.x1 - orb.x) * (a0.x2 - orb.x) + (a0.y1 - orb.y) * (a0.y2 - orb.y)) > 0, step: a0.step, at: [a0.x1, a0.y1], prong: [pr.x, pr.y] }, arcs: arcs.length,
      lost,
    };
  });
  check("the shot's cycle: 0.5 s spin (40 steps, speeding up, most of a turn or more, the charge frames 1-8), 0.25 s aim (20 steps), the flash 60 steps in, 0.25 s rest (10, 11), then again: one shot every 80 steps (1 s)", shot.spinSteps === 40 && shot.aimSteps === 20 && shot.flash - shot.start === 60 && shot.period === 80 && shot.spinFrames.join() === "1,2,3,4,5,6,7,8" && shot.speedUp && shot.spinTurn >= 20 && shot.restFrames.join() === "9,10,11", JSON.stringify(shot));
  check("its turning is smooth: never more than 2.1 aim frames a step, never backwards, slowing evenly to a stop on the target's heading at the flash", shot.maxStep <= 2.1 && shot.aimSpeedUps === 0 && shot.backwards === 0 && shot.lastAimStep <= 0.2 && Math.abs(((shot.heading - shot.want + 48) % 32) - 16) <= 0.6, JSON.stringify(shot));
  check("the shock comes from the orb's prong, on the side facing the target", shot.arc && shot.arc.fromProng && shot.arc.facing, JSON.stringify(shot.arc));
  const lostSorted = shot.lost.slice().sort((a, b) => b - a);
  const want = [650, 520, 416, 332, 266, 212, 170];
  // (sampled every 10 ms: the first frame or two may have gone by already)
  check("the arc hits 7 Spurtz (the target and 6 leaps), none of the other two", shot.lost.filter((x) => x > 0).length === 7, JSON.stringify(shot.lost));
  check("650 on the first, then 20% less each leap (the tower at full health)", lostSorted.slice(0, 7).every((x, i) => Math.abs(x - want[i]) <= 2), JSON.stringify(lostSorted));
  check("the leaps go down the line in order (each to the closest not yet hit)", shot.lost.slice(0, 7).every((x, i) => i === 0 || x < shot.lost[i - 1]), JSON.stringify(shot.lost));
  // (another shot, to see it: the picture taken at the flash; the attack had moved the view)
  await g(() => { const M = window.__classByName("MAP"); const c = window.__coil; M._autoScroll = false; M.FocusTo(c._mc.x + 150, c._mc.y, 0.1); });
  await page.waitForTimeout(1500);
  await g(() => { const c = window.__coil; window.__place(); c._fireTick = 1; c.FindTargets(1, 1); });
  await page.waitForFunction(() => window.__coil._anim2Tick >= 9, null, { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: `${shots}/towers-3-arc.png` });

  // 3. the Mortar: its dead zone, then a shell
  const mortar = await g(() => {
    const m = window.__mortar, P = window.__classByName("com.monsters.pathing::PATHING");
    const at = m._position.add(new m._position.constructor(0, m._footprint[0].height / 2));
    const g0 = P.FromISO(at);
    const T = window.__classByName("Targeting");
    const put = (mon, d, dy = 0) => { const iso = P.ToISO(new g0.constructor(g0.x + d, g0.y + dy), 0); mon._tmpPoint.x = iso.x; mon._tmpPoint.y = iso.y; mon._mc.x = iso.x; mon._mc.y = iso.y; mon.node = T.CreepCellMove(mon._tmpPoint, mon._id, mon, mon.node); mon._waypoints = []; mon._hasPath = false; mon._speed = 0; };
    window.__put = put; window.__mg0 = g0;
    // all nine Spurtz close in (60 away): nothing to shoot
    window.__sw.forEach((s) => put(s, 60));
    m.FindTargets(1, 1);
    const none = m._hasTargets;
    // one at 200, two more within 40 and 70 of it, one at 150 beyond the splash (80)
    put(window.__sw[0], 200); put(window.__sw[1], 200, 40); put(window.__sw[2], 200, 70); put(window.__sw[3], 200, 150);
    window.__sw.slice(0, 4).forEach((s) => s.setHealth(100000));
    m.FindTargets(1, 1);
    return { none, target: m._hasTargets && m._targetCreeps[0].creep === window.__sw[0], dist: m._hasTargets && Math.round(m._targetCreeps[0].dist) };
  });
  check("nothing inside 100 is a target (nine Spurtz at 60)", mortar.none === false, JSON.stringify(mortar));
  check("a Spurtz at 200 is", mortar.target && Math.abs(mortar.dist - 200) < 3, JSON.stringify(mortar));
  const shell = await g(async () => {
    const m = window.__mortar; const s = window.__sw;
    const before = s.slice(0, 4).map((x) => x.health);
    const aim = { x: s[0]._tmpPoint.x, y: s[0]._tmpPoint.y };
    m.Fire(s[0]);
    const flying = m._shells.length;
    const sh = m._shells[0];
    const shellTicks = sh ? sh._ticks : 0;
    // its flight, sampled as it goes: the rock's height over its shadow and the shadow's size
    const path = []; const rock = sh && sh._rock, shadow = sh && sh._shadow;
    const keepFire = m._fireTick; m._fireTick = 100000; // (no shell of its own meanwhile)
    const origTick = sh.tick.bind(sh); sh.tick = () => { const done = origTick(); if (!done && rock) path.push({ x: rock.x, y: rock.y, sy: shadow.y, ss: shadow.scaleX, rot: rock.rotation }); return done; };
    // the target walks off after the shell has gone (the shell does not follow)
    const P = window.__classByName("com.monsters.pathing::PATHING");
    let landed = false, ticks = 0;
    for (let i = 0; i < 400 && !landed; i++) { await new Promise((r) => setTimeout(r, 10)); if (i === 5) window.__put(s[1], 200, 40); if (m._shells.length === 0) landed = true; ticks = i; }
    m._fireTick = keepFire;
    const lost = s.slice(0, 4).map((x, k) => before[k] - x.health);
    // height above the straight line from the first point to the last (the ground under a thrown thing)
    const hts = path.map((q, i) => (path[0].y + (path[path.length - 1].y - path[0].y) * i / Math.max(1, path.length - 1)) - q.y + (path[0].sy - path[0].y) * 0);
    const dx = path.map((q, i) => i ? Math.hypot(q.x - path[i - 1].x, q.sy - path[i - 1].sy) : 0).slice(1);
    const top = hts.indexOf(Math.max(...hts));
    return { flying, shellTicks, landed, lost, steps: path.length, apex: Math.round(Math.max(...hts)), top, even: dx.length ? Math.round((Math.max(...dx) - Math.min(...dx)) * 100) / 100 : -1, shadowMin: path.length ? Math.round(Math.min(...path.map((q) => q.ss)) * 100) / 100 : -1, spin: Math.round(path.reduce((t, q, i) => { if (!i) return 0; let d = q.rot - path[i - 1].rot; if (d < -180) d += 360; if (d > 180) d -= 360; return t + d; }, 0)) };
  });
  check("the Mortar fires a shell, lobbed: 0.6 to 1 s in the air (48 to 80 steps at 80 a second)", shell.flying === 1 && shell.shellTicks >= 48 && shell.shellTicks <= 80, JSON.stringify(shell));
  check("...smoothly: even across the ground, rising and falling as a thrown thing (highest in the middle), the shadow smaller under it, turning over once", shell.even >= 0 && shell.even <= 0.6 && Math.abs(shell.top - shell.steps / 2) <= 2 && shell.apex >= 60 && shell.shadowMin <= 0.6 && Math.abs(shell.spin) >= 340, JSON.stringify(shell));
  check("it lands", shell.landed, JSON.stringify(shell));
  check("the target takes 1,238 (the middle), one 40 away about 796, one 70 away (outside the splash of 56) and one 150 away nothing", Math.abs(shell.lost[0] - 1238) <= 2 && Math.abs(shell.lost[1] - 796) <= 30 && shell.lost[2] === 0 && shell.lost[3] === 0, JSON.stringify(shell.lost));
  const late = await g(async () => {
    const m = window.__mortar; const s = window.__sw[0];
    window.__put(s, 250); s.setHealth(100000);
    const h0 = s.health; m.Fire(s);
    m.setHealth(0); // destroyed while the shell is up
    for (let i = 0; i < 400 && m._shells.length; i++) await new Promise((r) => setTimeout(r, 10));
    return { lost: h0 - s.health, left: m._shells.length };
  });
  check("a shell in the air still lands when the Mortar falls", late.left === 0 && late.lost > 500, JSON.stringify(late));
  await page.waitForTimeout(1500);
  const dmg = await g(() => { const c = window.__coil; c.setHealth(c.maxHealth * 0.3); c.Update(true); return c._renderState; });
  await page.waitForTimeout(2500);
  const dmg2 = await g(() => { const c = window.__coil; return { state: c._renderState, anim: c._animLoaded, anim2: c._anim2Loaded, url: c._animBMD && c._animBMD.width }; });
  check("damaged, the Coil shows its damaged strips", dmg2.state === "damaged" && dmg2.anim && dmg2.anim2, JSON.stringify([dmg, dmg2]));
  await g(() => { const M = window.__classByName("MAP"); const c = window.__coil; M.FocusTo && M.FocusTo(c._mc.x, c._mc.y, 0.1); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/towers-4-damaged.png` });
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/towers-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET buildingdata = jsonb_set(buildingdata - '${COIL}' - '${MORTAR}', '{0}', '${hall}'::jsonb), buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${COIL}' - '${MORTAR}' WHERE userid = ${uid} AND type = 'main'`);
}
