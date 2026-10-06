// Inferno wild tribe attacks (server config wildAttacks):
//  - the settings arrive (flag io_wildattacks) and the per-player last attack (io_wildlast)
//  - the tribe roll: Moloch about 5%, the four others evenly; the player-level bands
//  - a forced attack uses the configured monsters for the tribe and band, at the configured level; its
//    warning opens even with more than three kinds of monster
//  - after it starts, the next one is not due for 23 hours; one started on another yard stops a planned one
//  - nothing in the first minute after logging in (not even an attack already due); main yard only
//   EMAIL=... PASSWORD=... node tools/test/wild-attack-test.mjs
// Prints one line per check; every line must end in "ok". The yard is not saved (BASE._blockSave).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.click(857, 242); await page.waitForTimeout(800);
const g = (fn, arg) => page.evaluate(fn, arg);
// (any popups from logging in closed: the planner waits while one is up, e.g. "damaged buildings")
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }

const setup = await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; const w = W.ioWild(); return { wild: !!w, minHours: w && w.minHours, chance: w && w.molochChance, last: G._flags.io_wildlast, next: W._history.nextAttack, now: G.Timestamp() }; });
check("settings from the server", setup.wild && setup.minHours === 23 && setup.chance === 0.05, JSON.stringify(setup));
check("last attack flag sent", typeof setup.last === "number", String(setup.last));

// the first minute after logging in: an attack already due is neither warned about nor launched
const early = await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._queued = { type: 7, attack: { IC1: 2 }, attackTime: G.Timestamp() - 10, degrees: 0, distances: { IC1: 100 }, warned: 1, t: 1, level: 1 }; window.__creeps0 = window.__game.CREEPS._creepCount; return { settled: W.ioSettled(), since: window.__classByName("flash.utils::getTimer") ? 0 : 0 }; });
await page.waitForTimeout(3000);
const early2 = await g(() => { const W = window.__game.WMATTACK; const r = { settled: W.ioSettled(), queued: !!W._queued, spawned: window.__game.CREEPS._creepCount - window.__creeps0, warning: !!W.warningPopup }; W._queued = null; return r; });
check("first minute: a due attack waits (no warning, no monsters)", !early.settled && !early2.settled && early2.queued && early2.spawned === 0 && !early2.warning, JSON.stringify(early2));
const due = await g(() => { const W = window.__game.WMATTACK, B = window.__game.BASE; const keep = W.ioNextAttackTime, keepS = W.ioSettled; W.ioNextAttackTime = () => 0; W.ioSettled = () => true; const main = W.ioAttackDue(); const yt = B.m_yardType; B.m_yardType = 1; const outpost = W.ioAttackDue(); B.m_yardType = 3; const infernoOutpost = W.ioAttackDue(); B.m_yardType = yt; W.ioNextAttackTime = keep; W.ioSettled = keepS; return { main, outpost, infernoOutpost, yardType: yt }; });
check("main yard only: due on the main yard, never on an outpost", due.main && !due.outpost && !due.infernoOutpost, JSON.stringify(due));

// the tribe roll, 20,000 times
const roll = await g(() => { const W = window.__game.WMATTACK; W._ioPlan = null; const n = {}; for (let i = 0; i < 20000; i++) { W.ioChooseTribe(); n[W._ioPlan.tribe] = (n[W._ioPlan.tribe] || 0) + 1; } return n; });
const pct = (k) => (roll[k] || 0) / 200;
check("Moloch about 5%", Math.abs(pct("moloch") - 5) < 0.8, JSON.stringify(roll));
check("the others about 23.75% each", ["legionnaire", "kozu", "abunakki", "dreadnaut"].every((k) => Math.abs(pct(k) - 23.75) < 1.5));
const bands = await g(() => [1, 10, 11, 20, 21, 30, 31, 40, 41, 70].map((l) => window.__game.WMATTACK.ioBand(l)));
check("level bands", bands.join() === "0,0,1,1,2,2,3,3,4,4", bands.join());

// a forced attack: the planner, then launch it
await g(() => { window.__game.BASE._blockSave = true; const W = window.__game.WMATTACK; W._history.lastattack = 0; window.__game.GLOBAL._flags.io_wildlast = 0; Math.__r = Math.random; Math.random = () => 0.01; });
await g(() => window.__game.WMATTACK.Trigger(true));
await page.waitForFunction(() => window.__game.WMATTACK._queued, null, { timeout: 30000 }).catch(() => {});
await g(() => { Math.random = Math.__r; });
const q = await g(() => { const W = window.__game.WMATTACK, w = W.ioWild(), B = window.__game.BASE; const band = W.ioBand(B.BaseLevel().level); return { queued: W._queued && { t: W._queued.t, level: W._queued.level, attack: W._queued.attack }, expected: w.tribes.moloch[band], band }; });
check("roll 0.01 is Moloch", q.queued && q.queued.t === 51, JSON.stringify(q.queued && q.queued.t));
check("Moloch's monsters for this level band", q.queued && JSON.stringify(q.queued.attack) === JSON.stringify(q.expected.monsters), JSON.stringify(q.queued && q.queued.attack));
check("at the configured level", q.queued && q.queued.level === q.expected.level, `${q.queued && q.queued.level}`);
// the warning has three places for monsters; Moloch brings four or five kinds from level 11 (bug reports:
// "Raid planning failed ... reading 'Setup'"): the strongest three are shown, the third says how many more
const warn = await g(() => { const W = window.__game.WMATTACK, L = window.__classByName("CREATURELOCKER"), T = window.__classByName("flash.text::TextField"); W.HideWarning(); let err = null; try { W.ShowWarning(); } catch (e) { err = e.message; } const P = W.warningPopup, texts = []; const walk = (o) => { if (!o.visible) return; if (o instanceof T) texts.push(o.text); for (const c of o.$children ?? []) walk(c); }; if (P) walk(P); const kinds = Object.keys(W._queued.attack).filter((k) => W._queued.attack[k] > 0); const names = kinds.map((k) => window.__game.KEYS.Get(L._creatures[k].name)); const shown = names.filter((n) => texts.includes(n)); const r = { err, kinds: kinds.length, shown, more: texts.filter((t) => / more$/.test(t)), also: P && P.d3 ? P.d3.mcText.text : "" }; W.HideWarning(); return r; });
check("the warning opens with every attack size", !warn.err && warn.shown.length === Math.min(3, warn.kinds), JSON.stringify(warn));
check("more than three kinds: the third place says how many more, its note lists them", warn.kinds <= 3 || (warn.more.length === 1 && warn.more[0].endsWith(`+${warn.kinds - 3} more`) && /Also coming/.test(warn.also)), JSON.stringify([warn.more, warn.also.slice(-120)]));
// launched here directly: the game itself waits out the first minute after logging in (checked above)
await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._history.lastattack = 0; G._flags.io_wildlast = 0; W.LaunchQueuedAttack(); });
const spawned = await g(() => { const C = window.__game.CREEPS, L = window.__classByName("CREATURELOCKER"); const out = {}; for (const k in C._creeps) { const m = C._creeps[k]; if (!m || m._friendly) continue; const id = m._creatureID; out[id] = out[id] || { n: 0, hp: m.maxHealth, want: 0 }; out[id].n++; } return out; });
const lvl = q.expected.level;
const stats = await g((lvl) => { const L = window.__classByName("CREATURELOCKER"); const r = {}; for (const id of ["IC1", "IC2", "IC4", "IC6", "IC7", "IC8", "C19", "IC9", "IC10"]) { const h = L._creatures[id].props.health; r[id] = h[Math.min(h.length, lvl) - 1]; } return r; }, lvl);
const counts = Object.fromEntries(Object.entries(spawned).map(([k, v]) => [k, v.n]));
check("the monsters that came", JSON.stringify(Object.keys(q.expected.monsters).sort().map((k) => [k, counts[k]])) === JSON.stringify(Object.keys(q.expected.monsters).sort().map((k) => [k, q.expected.monsters[k]])), JSON.stringify(counts));
check("full health at that level", Object.entries(spawned).every(([id, v]) => v.hp === stats[id]), JSON.stringify(Object.fromEntries(Object.entries(spawned).map(([k, v]) => [k, [v.hp, stats[k]]]))));
const after = await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; return { last: W._history.lastattack, next: W.ioNextAttackTime(), now: G.Timestamp() }; });
check("next one not before 23 hours", after.next - after.now >= 23 * 3600 - 5 && after.next - after.last === 23 * 3600, JSON.stringify(after));

// an attack started on another yard (io_wildlast) cancels one planned here
const guard = await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._history.lastattack = G.Timestamp() - 30 * 3600; G._flags.io_wildlast = G.Timestamp() - 3600; W._queued = { type: 7, attack: { IC1: 1 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC1: 100 }, warned: 1, t: 1, level: 1 }; const before = window.__game.CREEPS._creepCount; W.LaunchQueuedAttack(); return { queued: W._queued, creeps: window.__game.CREEPS._creepCount - before }; });
check("attack on another yard within 23 hours: planned one dropped", guard.queued === null && guard.creeps === 0, JSON.stringify(guard));
// Kozmodeus attack in a swarm formation (groups of three): exactly the listed numbers
await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; W._queued = null; W._history.lastattack = 0; G._flags.io_wildlast = 0; Math.__r = Math.random; Math.random = () => 0.3; W.Trigger(true); });
await page.waitForFunction(() => window.__game.WMATTACK._queued, null, { timeout: 30000 }).catch(() => {});
await g(() => { Math.random = Math.__r; });
const swarm = await g(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; const want = Object.values(W._queued.attack).reduce((a, b) => a + b, 0); W._history.lastattack = 0; G._flags.io_wildlast = 0; const before = window.__game.CREEPS._creepCount; W.LaunchQueuedAttack(); return { tribe: W._ioPlan.tribe, want, got: window.__game.CREEPS._creepCount - before }; });
check("swarm formation sends exactly the listed monsters", swarm.tribe === "kozu" && swarm.want === swarm.got, JSON.stringify(swarm));
// after the first minute
await page.waitForFunction(() => window.__game.WMATTACK.ioSettled(), null, { timeout: 90000 }).catch(() => {});
const late = await g(() => { const W = window.__game.WMATTACK; return { settled: W.ioSettled(), since: window.__player ? Math.round((performance.now()) / 1000) : 0 }; });
check("after the first minute attacks may come", late.settled, JSON.stringify(late));
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
