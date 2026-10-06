// Hell Freezes Over balance runs: the event's waves fought for real (in the browser, against the local test server)
// by a maxed Inferno Under Hall 6 yard (layout.mjs: every building TH6 allows at its top level, the 24 defence
// towers spread among them; no walls, traps or defending monsters, so the towers alone), one wave at a time on a
// fresh yard, and a line for each: won / lost, fighting time, how much of the yard was destroyed at worst, towers
// left standing. Each result also goes to OUT as a JSON line.
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/hfo-balance/sim.mjs
//   WAVES=1,7,13   which waves (all 13 by default)
//   GAP=0          the yard packed tight (10: spread out with gaps, filling the map)
//   TOWERLEVEL=3   every tower at this level (default: each at its top level)
//   SCALE=2        every wave's monster counts multiplied (IoHfoWaves.countScale)
//   SPEED=4        the game's clock sped up (the fight itself counts simulation steps, so results don't change)
// Uses the account's main yard and event progress, and puts them back after (restore.mjs does that too after a
// run that was stopped: the account as it was before the first run is kept in account-backup-<userid>.json).
import { chromium, login, sql, server } from "./common.mjs";
import { layout } from "./layout.mjs";
import { writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs";
const OUT = process.env.OUT || "/tmp/hfosim.jsonl";
const SHOTS = process.env.SHOTS || "/tmp";
const SPEED = Number(process.env.SPEED || 4);
const waves = (process.env.WAVES || "1,2,3,4,5,6,7,8,9,10,11,12,13").split(",").map(Number);
const towerLevel = process.env.TOWERLEVEL ? Number(process.env.TOWERLEVEL) : null;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
// (kept once: a run that was killed leaves the account as it was before any run, for restore.mjs)
const BACKUP = new URL(`./account-backup-${uid}.json`, import.meta.url).pathname;
if (!existsSync(BACKUP)) writeFileSync(BACKUP, sql(`SELECT json_build_object('b', buildingdata, 'h', buildinghealthdata, 'm', monsters, 'k', lockerdata, 'a', academy, 'c', credits, 'hfo', (SELECT hfo FROM bym."user" WHERE userid = ${uid}))::text FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
const backup = readFileSync(BACKUP, "utf8");
const q = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
export const restore = () => {
  const s = JSON.parse(backup);
  sql(`UPDATE bym.save SET buildingdata = ${q(s.b)}, buildinghealthdata = ${s.h === null ? "NULL" : q(s.h)}, monsters = ${s.m === null ? "NULL" : q(s.m)}, lockerdata = ${q(s.k)}, academy = ${s.a === null ? "NULL" : q(s.a)}, credits = ${Number(s.c)} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  sql(`UPDATE bym."user" SET hfo = ${s.hfo === null ? "NULL" : q(s.hfo)} WHERE userid = ${uid} RETURNING userid`);
  sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
};
const { buildings, failed } = layout(towerLevel, Number(process.env.GAP ?? 10));
if (failed.length) console.log("not placed:", failed);
const now = () => Math.floor(Date.now() / 1000);
const prepare = (wave) => {
  sql(`UPDATE bym.save SET buildingdata = ${q(buildings)}, buildinghealthdata = '{}'::jsonb, monsters = '{}'::jsonb WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  const st = { t0: now() - 4 * 86400, day: 4, dayAt: [1, 2, 3, 4, now() - 3600], small: { spawned: 12, cleared: 12, patches: [] }, big: { spawned: 5, patches: [], tried: [] }, towers: { iced: [], thawed: [] }, decks: { d1: { left: [], heard: [1, 2, 3, 4, 5, 6] }, d2: { left: [], heard: [1, 2, 3, 4, 5] }, d3: { left: [], heard: [1, 2, 3, 4] } }, waves: {}, fight: null, last: null, done: 0, seen: { frozen: now() }, nextId: 20 };
  for (let w = 1; w < wave; w++) st.waves[String(w)] = { t: 1, won: now() };
  sql(`UPDATE bym."user" SET hfo = ${q(st)} WHERE userid = ${uid} RETURNING userid`);
  sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const token = await login();
const results = [];
try {
  for (const wave of waves) {
    prepare(wave);
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    await ctx.addInitScript(() => { const real = performance.now.bind(performance); let base = real(), virt = base; window.__speed = 1; performance.now = () => { const r = real(); virt += (r - base) * window.__speed; base = r; return virt; }; });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => { errs.push(e.message); console.log('  PAGEERROR ' + e.message); });
    page.on("response", (r) => { if (r.status() >= 400) console.log('  HTTP ' + r.status() + ' ' + r.url()); });
    page.on("console", (m) => { const t = m.text(); if (m.type() === 'error' || /halt|error|TimeHax/i.test(t)) console.log('  CONSOLE ' + m.type() + ' ' + t.slice(0, 300)); });
    await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
    await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 6; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
    const yard = await page.evaluate(() => { const B = window.__game.BASE; window.__game.WMATTACK._enabled = false; const H = window.__classByName("com.monsters.events.hfo::IoHfo"); let n = 0, towers = 0; for (const k in B._buildingsAll) { n++; } towers = H.defenceTowers().length; return { n, towers }; });
    await page.evaluate(([s, scale]) => { window.__speed = s; window.__classByName("com.monsters.events.hfo::IoHfoWaves").countScale = scale; }, [SPEED, Number(process.env.SCALE || 1)]);
    await page.evaluate((w) => window.__classByName("com.monsters.events.hfo::IoHfoWaves").Start(w), wave);
    const t0 = Date.now();
    let stragglers = null;
    let peak = 0, peakCreeps = 0, last = null, towersLost = 0, shot = false, maxSec = 0, minTowers = 99;
    const samples = [];
    while (Date.now() - t0 < 15 * 60 * 1000) {
      await page.waitForTimeout(1000);
      last = await page.evaluate(() => {
        const W = window.__classByName("com.monsters.events.hfo::IoHfoWaves"); const H = window.__classByName("com.monsters.events.hfo::IoHfo");
        const C = window.__game.CREEPS; let ice = 0; const kinds = {};
        for (const k in C._creeps) { const c = C._creeps[k]; if (c.health > 0) { ice++; kinds[c._creatureID] = (kinds[c._creatureID] || 0) + 1; } }
        let tAlive = 0, tHp = 0, tMax = 0; for (const t of H.defenceTowers()) { tMax += t.maxHealth; tHp += Math.max(0, t.health); if (t.health > 0) tAlive++; }
        const G = window.__game.GLOBAL; let halted = null; try { halted = G.isHalted; } catch (e) {}
        const lastErr = (window.__ioLastError || '');
        return { halted, frame: G._frameNumber, loops: G._loops, mapOpen: (() => { try { return window.__classByName('com.monsters.maproom_manager::MapRoomManager').instance.isOpen; } catch (e) { return null; } })(), running: W.running, sec: W.fightSeconds, destroyed: W.destroyedPercent(), creeps: ice, kinds, tAlive, towerHp: tMax ? Math.round(100 * tHp / tMax) : 0 };
      });
      peak = Math.max(peak, last.destroyed); peakCreeps = Math.max(peakCreeps, last.creeps); maxSec = Math.max(maxSec, last.sec); if (last.running) minTowers = Math.min(minTowers, last.tAlive);
      samples.push([Math.round(last.sec), last.destroyed, last.creeps, last.tAlive]);
      if (samples.length % 20 === 0) console.log(`  wave ${wave} t=${Math.round(last.sec)}s destroyed=${last.destroyed}% creeps=${last.creeps} towers=${last.tAlive} ${JSON.stringify(last.kinds)}`);
      if (!shot && last.sec > Number(process.env.SHOTAT || 40)) { shot = true; await page.screenshot({ path: `${SHOTS}/hfosim-w${wave}.png` }); }
      if (!last.straggled && last.creeps > 0 && last.creeps <= 2 && last.sec > 150 && !stragglers) {
        stragglers = await page.evaluate(() => {
          const G = window.__game, C = G.CREEPS, H = window.__classByName("com.monsters.events.hfo::IoHfo");
          const out = [];
          for (const k in C._creeps) {
            const c = C._creeps[k]; if (!(c.health > 0)) continue;
            const pos = G.GRID.FromISO(c.x, c.y);
            const t = c._targetBuilding || c._target || null;
            let near = null;
            for (const tw of H.defenceTowers()) { if (tw.health <= 0) continue; const d = Math.hypot(tw.x - c.x, tw.y - c.y); if (!near || d < near.d) near = { d: Math.round(d), type: tw._type, range: tw._range }; }
            const keys = Object.keys(c).filter((n) => /target|mode|behav|state|frozen|_atTarget/i.test(n)).slice(0, 20);
            out.push({ id: c._creatureID, hp: Math.round(c.health), pos: [Math.round(pos.x), Math.round(pos.y)], iso: [Math.round(c.x), Math.round(c.y)], target: t ? { type: t._type, hp: Math.round(t.health), x: Math.round(t.x), y: Math.round(t.y) } : null, nearestTower: near, keys: Object.fromEntries(keys.map((n) => [n, typeof c[n] === "object" ? (c[n] && c[n].constructor ? c[n].constructor.name : null) : c[n]])) });
          }
          return out;
        }).catch((e) => [String(e)]);
        console.log("  STRAGGLERS " + JSON.stringify(stragglers));
        await page.screenshot({ path: `${SHOTS}/hfosim-w${wave}-straggler.png` });
      }
      if (samples.length > 15 && samples[samples.length - 15][0] === samples[samples.length - 1][0] && last.running) {
        console.log("  STALLED", JSON.stringify(last));
        await page.screenshot({ path: `${SHOTS}/hfosim-w${wave}-stall.png` });
        break;
      }
      if (!last.running && Date.now() - t0 > 5000) break;
      if (last.sec > 600) break; // 10 minutes of fighting: stuck
    }
    const st = JSON.parse(sql(`SELECT hfo::text FROM bym."user" WHERE userid = ${uid}`));
    const ws = st.waves[String(wave)] || {};
    const r = { wave, scale: Number(process.env.SCALE || 1), gap: Number(process.env.GAP ?? 10), towerLevel, result: ws.won ? "won" : (last && last.running ? "unfinished" : "lost"), seconds: Math.round(maxSec), minTowersStanding: minTowers, realSeconds: Math.round((Date.now() - t0) / 1000), peakDestroyed: peak, endDestroyed: last ? last.destroyed : null, towersStanding: last ? last.tAlive : null, towersOf: yard.towers, towerHp: last ? last.towerHp : null, stragglers, peakCreeps, buildings: yard.n, errors: errs.slice(0, 3), samples: samples.filter((_, i) => i % 5 === 0) };
    results.push(r);
    appendFileSync(OUT, JSON.stringify(r) + "\n");
    console.log(`wave ${wave}: ${r.result} in ${r.seconds}s game time (${r.realSeconds}s real); yard destroyed peak ${peak}% end ${r.endDestroyed}%; towers standing at worst ${r.minTowersStanding}/${r.towersOf} (tower health ${r.towerHp}%); ${r.buildings} buildings; errors ${errs.length}`);
    await ctx.close();
  }
} finally {
  restore();
  await browser.close();
}
