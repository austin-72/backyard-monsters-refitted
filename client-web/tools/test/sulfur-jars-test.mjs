// Sulfur Bombs and Candy Jars (Catapult ammunition, Inferno):
//  - the bug: a Zagnoid on its last hit points under a Sulfur Bomb, hit by a Quake tower, never died (the
//    Quake tower hits for no more than the health left, the armour shrank that below half a point, and
//    health is kept in whole points, so it was rounded away). It dies now; small hits add up.
//  - the Sulfur Bomb numbers: damage removed 40 / 55 / 70 / 85%, fading to 0, after 0 / 4 / 8 / 12 s of
//    invulnerability; the bomb gives the monster that shield
//  - the bug: a Quake tower's blow on a monster under a Sulfur Bomb was cut to the monster's health left
//    before the shield took its share, so a monster that had lost some health never died (200 hp under
//    50%: 100, 50, 25, ...). The shield now takes its share of the whole blow: 50% of 2,000 is 1,000.
//  - Candy Jars last 15 / 25 / 40 / 55 s, whatever the tower shoots at them; the glass cracks at half and
//    a quarter left, shakes in the last two seconds, then breaks
//  - a jarred tower shoots the glass, never a monster: every kind of tower (the blast tower fired through)
//   EMAIL=... PASSWORD=... node tools/test/sulfur-jars-test.mjs
// Prints one line per check; every line must end in "ok". A wild attack is launched on the yard (not saved).
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
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }

// 1. the numbers from the server
const ammo = await g(() => { const b = window.__classByName("com.monsters.effects::ResourceBombs")._bombs; return { pu: [0, 1, 2, 3].map((i) => [b["pu" + i].invuln, b["pu" + i].armor, b["pu" + i].speedlength]), pb: [0, 1, 2, 3].map((i) => [b["pb" + i].seconds, b["pb" + i].durability || 0]) }; });
check("Sulfur Bomb: invulnerable 0/4/8/12 s, then 40/55/70/85% damage removed", JSON.stringify(ammo.pu) === JSON.stringify([[0, 40, 15], [4, 55, 25], [8, 70, 40], [12, 85, 55]]), JSON.stringify(ammo.pu));
check("Candy Jars: 15/25/40/55 seconds, no durability", JSON.stringify(ammo.pb) === JSON.stringify([[15, 0], [25, 0], [40, 0], [55, 0]]), JSON.stringify(ammo.pb));

// 2. a Zagnoid from a wild attack, and a Quake tower where it stands
const setup = await g(() => {
  const W = window.__game.WMATTACK, G = window.__game.GLOBAL; window.__game.BASE._blockSave = true;
  W._history.lastattack = 0; G._flags.io_wildlast = 0;
  W._queued = { type: 7, attack: { IC2: 4 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC2: 100 }, warned: 1, t: 1, level: 10 };
  W.LaunchQueuedAttack();
  const CR = window.__classByName("CREEPS"); window.__z = [];
  for (const k in CR._creeps) { const c = CR._creeps[k]; if (c && c._creatureID === "IC2") window.__z.push(c); }
  return { zagnoids: window.__z.length, hp: window.__z[0] && window.__z[0].health };
});
check("four Zagnoids to try it on", setup.zagnoids === 4, JSON.stringify(setup));
await page.waitForTimeout(2500);
const quake = await g(() => {
  const m = window.__z[0]; const Q = window.__classByName("INFERNOQUAKETOWER"); const q = new Q(); window.__q = q;
  q._range = 300; q._position = new m._tmpPoint.constructor(m._tmpPoint.x, m._tmpPoint.y - q._footprint[0].height / 2);
  const Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield");
  const inRange = q.GetCreepsInRange().some((c) => c.creep === m);
  m.setHealth(3);
  m.addComponent(new Sh(1, 0, 60, 70), "puttyBombEnrage");
  const hp = [];
  for (let i = 0; i < 10 && m.health > 0; i++) { q.Quake(500); hp.push(m.health); }
  return { inRange, hp, armor: m.armor };
});
check("the Quake tower reaches it", quake.inRange);
check("on 3 hit points under 70% sulfur armour, the Quake tower kills it", quake.hp[quake.hp.length - 1] <= 0 && quake.hp.length <= 8, JSON.stringify(quake));
const small = await g(() => {
  const m = window.__z[1]; const Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield");
  m.addComponent(new Sh(1, 0, 600, 85), "puttyBombEnrage");
  const h0 = m.health; const a = m.armor || 0;
  const sh = m.getComponentByName("puttyBombEnrage");
  const armor = sh.armorPercent;
  for (let i = 0; i < 20; i++) m.modifyHealth(-2);
  return { lost: h0 - m.health, want: 20 * 2 * (1 - armor / 100) * (1 - a), armor };
});
check("hits smaller than a hit point add up (20 x 2 under 85%)", Math.abs(small.lost - small.want) <= 1 && small.lost > 0, JSON.stringify(small));

// 2b. the whole blow meets the shield: a monster with health to spare under 50%
const blow = await g(() => {
  const m = window.__z[3]; const q = window.__q; const Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield");
  m.addComponent(new Sh(1, 0, 6000, 50), "puttyBombEnrage");
  // (the blows reach every monster in range: the others are kept out of it meanwhile)
  const guards = window.__z.filter((c) => c !== m && c.health > 0).map((c) => { const s = new Sh(1, 600, 601, 0); c.addComponent(s, "ioTestGuard"); return [c, s]; });
  q._position = new m._tmpPoint.constructor(m._tmpPoint.x, m._tmpPoint.y - q._footprint[0].height / 2);
  const d = q.GetCreepsInRange().find((c) => c.creep === m).dist;
  const share = (1 - m.getComponentByName("puttyBombEnrage").armorPercent / 100) * (1 - (m.armor || 0));
  const reach = Math.max((q._range - d) / q._range, 1 / 5);
  const max = m.maxHealth; m.setHealth(max);
  // a blow the shield halves to 80% of its health: before, it was cut to its health first (50% of it)
  const P1 = Math.round((0.8 * max) / share / reach);
  q.Quake(P1);
  const after1 = m.health;
  // then one that, halved, is more than it has left: it dies
  const P2 = Math.round((1.5 * after1) / share / reach);
  q.Quake(P2);
  guards.forEach(([c]) => c.removeComponent(c.getComponentByName("ioTestGuard")));
  return { max, share, reach, lost1: max - after1, want1: Math.round(0.8 * max), after2: m.health };
});
check("a Quake blow under a 50% shield takes half of the whole blow (not half of the health left)", Math.abs(blow.lost1 - blow.want1) <= 2, JSON.stringify(blow));
check("a monster that has lost health dies to a blow that, halved, is more than it has left", blow.after2 <= 0, JSON.stringify(blow));

// 3. the shield's phases with the new numbers (1 s invulnerable, 55% after, 5 s in all)
await g(() => { const m = window.__z[1]; m.removeComponent(m.getComponentByName("puttyBombEnrage")); const Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield"); window.__sh = new Sh(1, 1, 5, 55); m.addComponent(window.__sh, "puttyBombEnrage"); });
const phase = [];
for (const wait of [300, 1000, 1800, 2400]) { await page.waitForTimeout(wait); phase.push(await g(() => window.__sh.owner ? window.__sh.armorPercent : null)); }
check("invulnerable first", phase[0] === 100, JSON.stringify(phase));
check("then 55% damage removed at most, fading", phase[1] <= 55 && phase[1] >= 45 && phase[2] < phase[1] && phase[2] > 0, JSON.stringify(phase));
check("then gone", phase[3] === null, JSON.stringify(phase));

// 4. the bomb gives that shield (Medium: 4 s invulnerable, then 55%)
const bomb = await g(() => {
  const m = window.__z[2];
  const RB = window.__classByName("com.monsters.effects::ResourceBomb"), RBs = window.__classByName("com.monsters.effects::ResourceBombs"), P = window.__classByName("com.monsters.effects::ResourceBombParticle");
  const fake = { resourceid: P ? P.k_TYPE_PUTTY : "putty", targets: [[m]], bomb: RBs._bombs.pu1 };
  try { RB.prototype.Damage.call(fake, new m._tmpPoint.constructor(0, 0)); } catch (e) { return { err: e.message }; }
  const sh = m.getComponentByName(RB.k_PUTTY_BOMB_ENRAGE);
  return sh ? { armor: sh.armorPercent, invulnMs: sh.m_invulnMs, start: sh.m_armor, totalMs: sh.m_totalMs } : { none: true, resourceid: fake.resourceid };
});
check("the Medium bomb: 4 s invulnerable, then 55%, 25 s in all", bomb.armor === 100 && bomb.invulnMs === 4000 && bomb.start === 55 && bomb.totalMs === 25000, JSON.stringify(bomb));

// 5. a Candy Jar that lasts 3 s (the tower's shots don't matter)
const jar = await g(() => {
  const T = window.__classByName("INFERNOQUAKETOWER"); const t = new T(); window.__t = t;
  try { t.ApplyJar(0, 3); } catch (e) { return { err: e.message }; }
  window.__jarLog = []; const t0 = performance.now();
  window.__jarTimer = setInterval(() => {
    const a = t._jarAnimation;
    if (a && t._jarHealth) t._jarHealth.Add(-5000000); // the tower shooting at the glass
    try { if (a) t.TickJar(); } catch (e) { window.__jarLog.push({ err: e.message }); }
    window.__jarLog.push({ t: Math.round(performance.now() - t0), jard: t.isJard, frame: a ? a.currentFrame : -1, x: a ? a.x : null, gone: !t._jarAnimation });
  }, 50);
  return { ok: true };
});
check("a jar can be dropped on a tower", jar.ok, JSON.stringify(jar));
await page.waitForTimeout(6000);
const log = await g(() => { clearInterval(window.__jarTimer); return window.__jarLog; });
const landed = log.find((e) => e.jard);
const at = (ms) => log.filter((e) => landed && e.t >= landed.t + ms).shift() || {};
const errs = log.filter((e) => e.err);
check("it holds, whatever the tower shoots at it", !!landed && at(1200).jard && at(2800).jard, JSON.stringify([landed, at(1200), at(2800)]));
check("whole, then cracked at half, badly cracked at a quarter", at(1200).frame === 0 && at(1700).frame === 1 && at(2400).frame === 2, JSON.stringify([at(1200).frame, at(1700).frame, at(2400).frame]));
const shake = log.filter((e) => landed && e.t > landed.t + 1100 && e.t < landed.t + 2900 && e.jard).map((e) => e.x);
check("it shakes in the last two seconds", new Set(shake.map((x) => Math.round(x * 10))).size >= 2, JSON.stringify([...new Set(shake)].slice(0, 4)));
check("it breaks when the time is up", at(3200).jard === false && log[log.length - 1].gone, JSON.stringify([at(3200), log[log.length - 1]]));
check("no errors while jarred", errs.length === 0, JSON.stringify(errs.slice(0, 2)));

// 6. every kind of tower, jarred, shoots the glass and never a monster (and unjarred does shoot)
// (the Spurtz Cannon is not built in the Inferno; it shoots its glass too)
const TOWERS = ["BUILDING20", "BUILDING21", "BUILDING23", "BUILDING25", "BUILDING115", "BUILDING118", "INFERNOQUAKETOWER", "INFERNO_MAGMA_TOWER", "INFERNO_CANNON_TOWER"];
const build = (jarred) => g(([TOWERS, jarred]) => {
  const target = window.__z.find((c) => c.health > 0) || window.__z[2];
  window.__towers = {};
  for (const name of TOWERS) {
    try {
      const T = window.__classByName(name); const t = new T();
      t._lvl.Set(1); t.Props();
      // (a tower on the ground: full health; its shots scale with it)
      t.maxHealthProperty.value = 1000; t.setHealth(1000); t._range = 400; t._position = new target._tmpPoint.constructor(target._tmpPoint.x, target._tmpPoint.y); t._mc.x = target.x; t._mc.y = target.y;
      if (jarred) t.ApplyJar(0, 60);
      window.__towers[name] = t;
    } catch (e) { window.__towers[name] = { err: e.message }; }
  }
  return Object.keys(window.__towers).length;
}, [TOWERS, jarred]);
const shoot = () => g((TOWERS) => {
  const target = window.__z.find((c) => c.health > 0) || window.__z[2];
  const PR = window.__classByName("PROJECTILES"), FB = window.__classByName("FIREBALLS"), FX = window.__classByName("EFFECTS");
  const out = {};
  for (const name of TOWERS) {
    const t = window.__towers[name];
    if (!t || t.err) { out[name] = { err: t && t.err }; continue; }
    let shots = 0; const hurt = [];
    const spawn = PR.Spawn, spawn2 = FB.Spawn2, laser = FX.Laser, bolt = FX.Lightning;
    PR.Spawn = function () { shots++; return spawn.apply(this, arguments); };
    FB.Spawn2 = function () { shots++; return spawn2.apply(this, arguments); };
    FX.Laser = function () { shots++; return laser.apply(this, arguments); };
    FX.Lightning = function () { shots++; return bolt.apply(this, arguments); };
    const saved = window.__z.map((c) => c.modifyHealth);
    window.__z.forEach((c, i) => { c.modifyHealth = function (v, s) { if (v < 0) hurt.push(v); return saved[i].call(this, v, s); }; });
    const jar0 = t._jarHealth ? t._jarHealth.Get() : null;
    try {
      t._hasTargets = true; t._targetCreeps = [{ creep: target, dist: 1 }];
      if (name === "BUILDING25") { t.Fire(target); t._fireStage = 2; t._laserTarget = target; for (let i = 0; i < 12; i++) t.TickFast(); }
      else if (name === "SpurtzCannon") { t._target = target; t.shoot(); }
      else if (name === "INFERNOQUAKETOWER") { t.Fire(target); t.DelayedFire(); }
      else t.Fire(target);
    } catch (e) { out[name] = { err: e.message }; }
    PR.Spawn = spawn; FB.Spawn2 = spawn2; FX.Laser = laser; FX.Lightning = bolt;
    if (name === "BUILDING118" && t._spawnCount > 0) shots++; // the railgun's slug
    window.__z.forEach((c, i) => { delete c.modifyHealth; if (c.modifyHealth !== saved[i]) c.modifyHealth = saved[i]; });
    if (!out[name]) out[name] = { shots, hurt: hurt.length, jar: jar0 === null ? null : jar0 - (t._jarHealth ? t._jarHealth.Get() : 0) };
  }
  return out;
}, TOWERS);
await build(true);
await page.waitForTimeout(1800); // the jars land
const jarred = await shoot();
const leaks = TOWERS.filter((n) => jarred[n].err || jarred[n].shots > 0 || jarred[n].hurt > 0);
check("jarred, no tower shoots a monster (every kind)", leaks.length === 0, JSON.stringify(leaks.map((n) => [n, jarred[n]])));
check("...each shoots the glass instead", TOWERS.every((n) => jarred[n].jar > 0), JSON.stringify(TOWERS.map((n) => [n, jarred[n].jar])));
await build(false);
const free = await shoot();
const silent = TOWERS.filter((n) => free[n].err || free[n].shots + free[n].hurt === 0);
check("...and unjarred, every one does shoot (the check can see a shot)", silent.length === 0, JSON.stringify(silent.map((n) => [n, free[n]])));

check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
