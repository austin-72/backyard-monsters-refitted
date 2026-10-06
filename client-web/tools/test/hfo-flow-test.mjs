// Hell Freezes Over, the server's rules from start to finish (services/events/hfo.ts), without a browser:
//  - when it starts: the admin switch; every Strongbox monster on pages 1-5 unlocked (each one missing, or still
//    unlocking, holds it back; Rimegrave is not asked for; the champions' Academy levels don't matter); only on
//    a load of the main yard (not an outpost, not the half-minute poll), never in admin test mode; once
//  - the days: Day 1 a day after it started, Day 2 two days, Day 3 three, each only once the day before is
//    done, one day a load (none skipped however long the player was away); the patches as the day allows
//    them (6, one more every 2 hours, 12; 5 big ones); a line dealt with every clear, try and tower, and every
//    line of a day heard before the next; a big patch's try counted once; Day 3's towers registered once, the
//    last one freed opening the waves (and a yard with no towers going straight on)
//  - the waves: none before; only the current wave or a skipped one; 3 tries; a win paid once (5, 155 for wave
//    13) and only within the tries; three losses skip it; a skipped wave replayed for nothing; a wave left
//    open settled as lost; a stale end ignored; all 13 won frees Rimegrave (a save unlocking him refused before,
//    kept after)
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... node tools/test/hfo-flow-test.mjs
// Changes the test account's locker, academy, credits and event progress, and puts them back at the end.
import { execFileSync } from "node:child_process";
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let out = {};
  try { out = await r.json(); } catch {}
  return { status: r.status, ...out };
};
const token = (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const signinCode = (await post("admin/session", "", token)).code;
const signin = await fetch(`${server}admin/signin?code=${signinCode}`, { redirect: "manual" });
const session = ((signin.headers.get("set-cookie") || "").match(/bymr_admin=([a-f0-9]{64})/) || [])[1];
const panel = async (action, body = {}) => (await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) })).json();
const q = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const state = () => JSON.parse(sql(`SELECT COALESCE(hfo::text, 'null') FROM bym."user" WHERE userid = ${uid}`));
const setState = (s) => sql(`UPDATE bym."user" SET hfo = ${s === null ? "NULL" : q(s)} WHERE userid = ${uid} RETURNING userid`);
const edit = (fn) => { const s = state(); fn(s); setState(s); return s; };
const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400;
const credits = () => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
// a load of the main yard (what starts the event and moves it on), and the half-minute poll
const loadMain = () => post("base/load", "userid=&baseid=0&type=build&mapversion=2", token);
const hfo = (action, body = "") => post(`hfo/${action}`, body, token);

const saved = sql(`SELECT json_build_object('locker', lockerdata, 'academy', academy, 'credits', credits)::text FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const savedHfo = sql(`SELECT COALESCE(hfo::text, '') FROM bym."user" WHERE userid = ${uid}`);
const restore = () => {
  const s = JSON.parse(saved);
  sql(`UPDATE bym.save SET lockerdata = ${q(s.locker)}, academy = ${s.academy === null ? "NULL" : q(s.academy)}, credits = ${Number(s.credits)} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  sql(`UPDATE bym."user" SET hfo = ${savedHfo ? `'${savedHfo.replace(/'/g, "''")}'::jsonb` : "NULL"} WHERE userid = ${uid} RETURNING userid`);
  sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
};
const QUALIFY = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC15", "IC12", "IC14", "IC20", "C19", "IC9", "IC10", "IC24"];
const setLocker = (ids, extra = {}) => sql(`UPDATE bym.save SET lockerdata = ${q({ ...Object.fromEntries(ids.map((k) => [k, { t: 2 }])), ...extra })} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
const setAcademy = (levels) => sql(`UPDATE bym.save SET academy = ${q(Object.fromEntries(Object.entries(levels).map(([k, l]) => [k, { level: l }])))} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
const fresh = () => { setState(null); sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`); };

try {
  sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
  await post("admin/testmode", "action=off", token);
  setLocker(QUALIFY);
  setAcademy({ IC9: 2, IC10: 1, IC24: 1 });

  // ---- 1. when it starts
  await panel("hfo", { state: "off" });
  fresh();
  await loadMain();
  check("switched off: a player who qualifies doesn't start", state() === null);
  await panel("hfo", { state: "on" });
  const blockers = [];
  for (const id of QUALIFY) {
    setLocker(QUALIFY.filter((k) => k !== id));
    await loadMain();
    if (state() !== null) blockers.push(id);
    fresh();
  }
  check("every one of the 16 Strongbox monsters (pages 1-5) is needed: any one missing holds it back", blockers.length === 0, blockers.length ? `started without: ${blockers.join(",")}` : "");
  setLocker(QUALIFY.filter((k) => k !== "IC7"), { IC7: { t: 1, e: now() + 3600 } });
  await loadMain();
  check("...one still unlocking holds it back too", state() === null);
  fresh();
  setLocker(QUALIFY);
  setAcademy({ IC9: 1, IC10: 1, IC24: 1 });
  await loadMain();
  check("every monster unlocked, every champion still at Academy level 1: it starts (Rimegrave is not asked for)", state() !== null && state().day === 0);
  fresh();
  setAcademy({ IC9: 1, IC10: 6, IC24: 1 });
  const outpost = sql(`SELECT baseid FROM bym.save WHERE userid = ${uid} AND type = 'outpost' ORDER BY baseid LIMIT 1`);
  if (outpost) {
    await post("base/load", `userid=&baseid=${outpost}&type=build&mapversion=2`, token);
    check("an outpost's load doesn't start it", state() === null);
  }
  await post("base/updatesaved", "baseid=0", token);
  check("...nor does the half-minute poll", state() === null);
  await post("admin/testmode", "action=on", token);
  await loadMain();
  check("...nor a load in admin test mode (every monster is unlocked for the test)", state() === null);
  await post("admin/testmode", "action=off", token);
  setLocker(QUALIFY);
  setAcademy({ IC9: 1, IC10: 6, IC24: 1 });
  const t0 = now();
  const first = await loadMain();
  const s0 = state();
  check("a load of the main yard starts it: day 0, the time kept, the game told (io_hfo)", s0 && s0.day === 0 && Math.abs(s0.t0 - t0) <= 2 && first.flags && /"day":0/.test(String(first.flags.io_hfo)), JSON.stringify(s0 && { day: s0.day, t0: s0.t0 }));
  await loadMain();
  check("...once: the next load leaves it as it was", state().t0 === s0.t0 && state().day === 0);

  // ---- 2. the days
  edit((s) => { s.t0 = now() - DAY + 60; });
  await loadMain();
  check("Day 1 not before a day has passed (23h59m)", state().day === 0);
  edit((s) => { s.t0 = now() - DAY - 5; });
  await loadMain();
  check("...a day after: Day 1", state().day === 1 && Math.abs(state().dayAt[1] - now()) <= 2);
  const spot = (n, from = 0) => JSON.stringify(Array.from({ length: n }, (_, i) => [(-300 + (from + i) * 40), 100, 1 + (i % 5)]));
  const sp1 = await hfo("spawn", `kind=small&patches=${encodeURIComponent(spot(12))}`);
  check("Day 1's patches: 6 at first (12 asked for)", sp1.hfo && sp1.hfo.small.spawned === 6 && sp1.hfo.small.patches.length === 6, JSON.stringify(sp1.hfo && sp1.hfo.small.spawned));
  check("...no big patches yet", (await hfo("spawn", `kind=big&patches=${encodeURIComponent(spot(5))}`)).status !== 200);
  edit((s) => { s.dayAt[1] = now() - 2 * 3600 - 5; });
  const sp2 = await hfo("spawn", `kind=small&patches=${encodeURIComponent(spot(12, 6))}`);
  check("...2 hours on: one more (7)", sp2.hfo.small.spawned === 7);
  edit((s) => { s.dayAt[1] = now() - 30 * 3600; });
  const sp3 = await hfo("spawn", `kind=small&patches=${encodeURIComponent(spot(12, 7))}`);
  check("...however long: 12 in all, never more", sp3.hfo.small.spawned === 12 && (await hfo("spawn", `kind=small&patches=${encodeURIComponent(spot(3, 19))}`)).hfo.small.spawned === 12);
  const ids1 = state().small.patches.map((p) => p[0]);
  const lines1 = [];
  for (const id of ids1.slice(0, 11)) lines1.push((await hfo("clear", `id=${id}`)).line);
  check("...a cleared patch deals a Day 1 line every time", lines1.every((l) => l >= 1 && l <= 6), lines1.join(","));
  check("...one cleared twice counts once (no line)", (await hfo("clear", `id=${ids1[0]}`)).line === 0 && state().small.cleared === 11);
  edit((s) => { s.t0 = now() - 10 * DAY; });
  await loadMain();
  check("11 of 12 cleared, ten days on: still Day 1 (its tasks first)", state().day === 1);
  await hfo("clear", `id=${ids1[11]}`);
  const heard1 = state().decks.d1.heard;
  check("...the 12th: every one of the 6 Day 1 lines heard (the deck, no repeats until all are)", new Set(heard1).size === 6, heard1.join(","));
  await loadMain();
  check("...then one day a load: Day 2 (not 3, though the time for it passed long ago)", state().day === 2);
  // the time rule for Day 2: two days after the start
  edit((s) => { s.day = 1; s.t0 = now() - 2 * DAY + 60; });
  await loadMain();
  check("Day 2 not before two days after the start, even with Day 1 done", state().day === 1);
  edit((s) => { s.t0 = now() - 2 * DAY - 5; });
  await loadMain();
  check("...then Day 2", state().day === 2);
  const sb = await hfo("spawn", `kind=big&patches=${encodeURIComponent(spot(8))}`);
  check("Day 2's big patches: 5 (8 asked for)", sb.hfo.big.spawned === 5 && sb.hfo.big.patches.length === 5);
  const ids2 = state().big.patches.map((p) => p[0]);
  const l2 = [];
  for (const id of ids2.slice(0, 4)) l2.push((await hfo("try", `id=${id}`)).line);
  const again = await hfo("try", `id=${ids2[0]}`);
  check("...a try deals a Day 2 line every time; the same patch again still says one but counts once", l2.every((l) => l >= 1 && l <= 5) && again.line >= 1 && state().big.tried.length === 4 && state().big.patches.length === 5, JSON.stringify({ l2, again: again.line, tried: state().big.tried }));
  edit((s) => { s.t0 = now() - 3 * DAY - 5; });
  await loadMain();
  check("4 of 5 tried (the time come): still Day 2", state().day === 2);
  await hfo("try", `id=${ids2[4]}`);
  check("...the 5th: every one of the 5 Day 2 lines heard", new Set(state().decks.d2.heard).size === 5, state().decks.d2.heard.join(","));
  await loadMain();
  check("...then Day 3", state().day === 3);
  check("Day 3: a tower can't be freed before the game says which are sealed", (await hfo("thaw", "id=101")).line === 0 && state().towers.thawed.length === 0);
  await hfo("towers", `ids=${encodeURIComponent(JSON.stringify([101, 102, 103, 104, 105]))}`);
  await hfo("towers", `ids=${encodeURIComponent(JSON.stringify([101, 999]))}`);
  check("...the towers there when Day 3 began, registered once", JSON.stringify(state().towers.iced) === "[101,102,103,104,105]");
  check("...a tower that isn't one of them: nothing", (await hfo("thaw", "id=999")).line === 0);
  const l3 = [];
  for (const id of [101, 102, 103]) l3.push((await hfo("thaw", `id=${id}`)).line);
  const gone = await hfo("thaw", "id=104&gone=1");
  check("...each freed tower deals a Day 3 line (one recycled since counts as freed, with none)", l3.every((l) => l >= 1 && l <= 4) && gone.line === 0 && state().towers.thawed.length === 4 && state().day === 3, JSON.stringify({ l3, gone: gone.line }));
  check("...the waves can't be started on Day 3", (await hfo("wavestart", "wave=1")).status !== 200);
  const last = await hfo("thaw", "id=105");
  check("...the last: the waves open (day 4, \"Hell has frozen over!\")", last.frozen === true && state().day === 4 && last.line >= 1);
  // a yard with no defence towers
  edit((s) => { s.day = 3; s.towers = { iced: null, thawed: [] }; });
  const none = await hfo("towers", `ids=${encodeURIComponent("[]")}`);
  check("a yard with no defence towers on Day 3: the waves open at once", none.frozen === true && state().day === 4);
  edit((s) => { s.day = 3; s.towers = { iced: [], thawed: [] }; });
  await loadMain();
  check("...and on a load if it got stuck there", state().day === 4);

  // ---- 3. the waves
  check("only the current wave: not wave 2 yet, not 0 or 14", (await hfo("wavestart", "wave=2")).status !== 200 && (await hfo("wavestart", "wave=0")).status !== 200 && (await hfo("wavestart", "wave=14")).status !== 200);
  const c0 = credits();
  const w1 = await hfo("wavestart", "wave=1");
  check("wave 1 starts: a try counted", w1.fight && w1.fight.wave === 1 && state().waves["1"].t === 1);
  const stale = await hfo("waveend", `wave=1&id=${w1.fight.id + 1}&won=1`);
  check("...an end for another fight is ignored", stale.paid === 0 && !state().waves["1"].won && state().fight);
  const e1 = await hfo("waveend", `wave=1&id=${w1.fight.id}&won=1`);
  check("...won: 5 shiny paid into the main yard, once", e1.paid === 5 && credits() - c0 === 5 && Number(e1.credits) === credits());
  const e1b = await hfo("waveend", `wave=1&id=${w1.fight.id}&won=1`);
  check("...the same end again pays nothing; a won wave can't be fought again", (e1b.paid || 0) === 0 && credits() - c0 === 5 && (await hfo("wavestart", "wave=1")).status !== 200);
  for (let i = 0; i < 3; i++) {
    const f = await hfo("wavestart", "wave=2");
    await hfo("waveend", `wave=2&id=${f.fight.id}&won=0`);
  }
  check("wave 2 lost three times: skipped, nothing paid, wave 3 next", state().waves["2"].skipped === true && state().waves["2"].t === 3 && credits() - c0 === 5 && (await hfo("status")).hfo.current === 3);
  const r2 = await hfo("wavestart", "wave=2");
  check("...a skipped wave can be fought again: a replay, no try counted", r2.fight && r2.fight.replay === true && state().waves["2"].t === 3);
  // left in the middle (the game closed): the next start settles it as lost
  const w3 = await hfo("wavestart", "wave=3");
  check("starting another wave settles the one left open (the replay: lost, no try)", w3.fight && w3.fight.wave === 3 && !state().waves["2"].won);
  const w3b = await hfo("wavestart", "wave=3");
  check("...wave 3 left open and started again: the first counted as a lost try", state().waves["3"].t === 2 && w3b.fight.id !== w3.fight.id);
  const e3 = await hfo("waveend", `wave=3&id=${w3b.fight.id}&won=1`);
  check("...won on its 2nd try: paid", e3.paid === 5);
  for (let w = 4; w <= 12; w++) {
    const f = await hfo("wavestart", `wave=${w}`);
    await hfo("waveend", `wave=${w}&id=${f.fight.id}&won=1`);
  }
  const [forged, mainBase, points, basevalue] = sql(`SELECT basesaveid || '|' || baseid || '|' || points || '|' || basevalue FROM bym.save WHERE userid = ${uid} AND type = 'main'`).split("|");
  const unlockRimegrave = () => post("base/save", `basesaveid=${forged}&baseid=${mainBase}&points=${points}&basevalue=${basevalue}&lockerdata=${encodeURIComponent(JSON.stringify({ ...Object.fromEntries(QUALIFY.map((k) => [k, { t: 2 }])), IC25: { t: 1, s: now(), e: now() + 60 } }))}`, token);
  const sv1 = await unlockRimegrave();
  check("12 waves won (one skipped): Rimegrave can't be unlocked (the server puts the save's IC25 back)", sv1.status === 200 && sql(`SELECT COALESCE(lockerdata->'IC25'->>'t', 'none') FROM bym.save WHERE userid = ${uid} AND type = 'main'`) === "none" && !state().done, String(sv1.status));
  const w13 = await hfo("wavestart", "wave=13");
  const c13 = credits();
  const e13 = await hfo("waveend", `wave=13&id=${w13.fight.id}&won=1`);
  check("wave 13 won: 155 shiny", e13.paid === 155 && credits() - c13 === 155);
  check("...with wave 2 still skipped: not done yet", !state().done && (await hfo("status")).hfo.current === 14);
  const r2b = await hfo("wavestart", "wave=2");
  const e2 = await hfo("waveend", `wave=2&id=${r2b.fight.id}&won=1`);
  check("the skipped wave replayed and won: no shiny, and all 13 are won: done", e2.paid === 0 && state().done > 0 && state().waves["2"].won > 0);
  check("...paid in all: 5 x 11 + 155 (wave 2's 5 lost by skipping it)", credits() - c0 === 5 * 11 + 155 && Number(sql(`SELECT SUM(shiny) FROM bym.hfo_claim WHERE userid = ${uid}`)) === 210, String(credits() - c0));
  const sv2 = await unlockRimegrave();
  check("...now a save unlocking Rimegrave is kept", sv2.status === 200 && sql(`SELECT COALESCE(lockerdata->'IC25'->>'t', 'none') FROM bym.save WHERE userid = ${uid} AND type = 'main'`) === "1");
  check("...and no wave can be started any more", (await hfo("wavestart", "wave=13")).status !== 200 && (await hfo("wavestart", "wave=1")).status !== 200);
  await loadMain();
  check("...a load after: it stays done (day 4)", state().day === 4 && state().done > 0);
} catch (e) {
  check("the test ran", false, String(e.stack || e).slice(0, 600));
} finally {
  await post("admin/testmode", "action=off", token);
  restore();
  await panel("hfo", { state: "off" });
}
