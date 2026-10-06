// The Brimstone Pit's 5 October additions, on the server:
//  - Korath's Fortune (Pit level 6): refused below it; a spin's 3 x 3 window read off the reels' strips,
//    every line that pays found, the spin paid the lines over five; the jackpot pool shared with the Slots
//  - Moloch's Favor: one free Slots spin a day, nothing taken; a second refused; sent again, answered as
//    the first
//  - the Live tab: every player's bets but the admins', the day's biggest wins, the last jackpots
//  - the Magma Derby lists the race's bettors (not the admins) and what is on each runner (everyone's)
//   TARGET=<a player> EMAIL2=<another> PASSWORD=... PGPASSWORD=... node tools/test/casino-oct5-server-test.mjs
// (TARGET is named "admintester", one of the test server's admin names, for the test, and named back after)
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const login = async (email) => {
  const r = await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json();
  const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`));
  const name = sql(`SELECT username FROM bym."user" WHERE userid = ${uid}`);
  const api = async (path, body = {}) => (await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${r.token}` }, body: new URLSearchParams(body).toString() })).json();
  return { uid, name, api };
};
const ADMIN = "admintester";
const aEmail = process.env.TARGET || process.env.EMAIL;
const aName = sql(`SELECT username FROM bym."user" WHERE email = '${aEmail}'`);
sql(`UPDATE bym."user" SET username = '${ADMIN}' WHERE email = '${aEmail}'`);
const A = await login(aEmail);
const B = await login(process.env.EMAIL2);
const rid = () => randomBytes(8).toString("hex");
const credits = (u) => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${u.uid} AND type = 'main'`));
const pool = () => Number(sql(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`) || 500);
const PIT_ID = 999141;
const setPit = (u, level) => sql(`UPDATE bym.save SET buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": ${level}}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`);
const saved = [A, B].map((u) => credits(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYS = { balthazar: 250, grokus: 100, valgos: 50, zagnoid: 25, malphus: 13, spurtz: 8 };
const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
const lineOf = (s) => (s.every((x) => x === s[0]) ? (s[0] === "wormzer" ? ["jackpot", 0] : ["three", PAYS[s[0]]]) : s.filter((x) => x === "spurtz").length === 2 ? ["two_spurtz", 1] : null);
try {
  check("the first player is an admin, the second is not", A.name === ADMIN && B.name !== ADMIN, `${A.name} / ${B.name}`);
  for (const u of [A, B]) { sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${u.uid}`); sql(`UPDATE bym.save SET credits = 100000 WHERE userid = ${u.uid} AND type = 'main'`); }
  sql(`DELETE FROM bym.casino_player WHERE user_id IN (${A.uid}, ${B.uid})`);
  setPit(A, 6); setPit(B, 5);

  // ---- Korath's Fortune
  let r = await B.api("casino/fortune/spin", { request_id: rid(), bet: 10 });
  check("Pit level 5: Korath's Fortune refused (level 6)", /level 6/.test(r.error), r.error);
  const st = await A.api("casino/state");
  const tile = (st.games || []).find((g) => g.id === "fortune");
  check("casino/state at Pit level 6: Korath's Fortune in the lobby, open; its five lines; the Favor ready", st.level === 6 && st.games.length === 8 && tile && tile.unlocked && tile.level === 6 && st.rules.fortune.lines.length === 5 && st.favor.enabled && st.favor.ready && st.favor.bet === 10, JSON.stringify([st.level, tile, st.favor]));
  const strips = st.rules.slots.strips;
  let ok = true, bad = "", paidSum = 0, hits = 0, staked = 0, n = 0;
  const p0 = pool();
  let jackpots = 0;
  for (let i = 0; i < 120; i++) {
    const c0 = credits(A);
    const bet = i === 0 ? 100 : 5;
    r = await A.api("casino/fortune/spin", { request_id: rid(), bet });
    if (r.error) { ok = false; bad = r.error; break; }
    // the window from the stops: the middle row the stop, the top the stop above it (stop + 1)
    const win = [1, 0, -1].map((d) => r.stops.map((s, reel) => strips[reel][(s + d + 32) % 32]));
    const wins = LINES.map((rows, line) => ({ line, l: lineOf(rows.map((row, reel) => win[row][reel])) })).filter((x) => x.l);
    const mult = wins.reduce((a, w) => a + w.l[1], 0) / 5;
    const jp = wins.some((w) => w.l[0] === "jackpot");
    const same = JSON.stringify(win) === JSON.stringify(r.window) && JSON.stringify(wins.map((w) => [w.line, w.l[0]])) === JSON.stringify(r.wins.map((w) => [w.line, w.kind])) && Math.abs(r.multiplier - mult) < 1e-9;
    const pay = Math.abs(r.payout - jp * r.jackpot_won - bet * mult) < 1;
    const shiny = credits(A) === c0 - bet + r.payout && r.credits === credits(A);
    if (!same || !pay || !shiny) { ok = false; bad = JSON.stringify({ i, win, rwin: r.window, wins, rw: r.wins, mult, r: r.multiplier, payout: r.payout, c: [c0, credits(A)] }); break; }
    if (jp) jackpots++;
    paidSum += r.payout; staked += bet; n++;
    if (r.wins.length) hits++;
  }
  check("120 spins: each window read off the strips, every paying line found, paid the lines over five, the Shiny taken and paid", ok && n === 120, bad);
  check(`a line pays on most spins (${hits} of ${n}; about 85%)`, hits > n * 0.7, `${hits}`);
  check("the jackpot pool shared: 5% of every Fortune stake went into it", jackpots > 0 || Math.abs(pool() - Math.min(66000, p0 + staked * 0.05)) < 0.01, `${p0} -> ${pool()} on ${staked}`);
  const row = sql(`SELECT game || '|' || stake || '|' || (outcome->'window' IS NOT NULL) FROM bym.casino_bet WHERE user_id = ${A.uid} ORDER BY id DESC LIMIT 1`);
  check("the ledger: a 'fortune' bet with its window", row === "fortune|5|true", row);

  // ---- Moloch's Favor (wherever the Slots are open)
  setPit(B, 2);
  const st2b = await B.api("casino/state");
  check("Pit level 2 (no Slots yet): no Favor", st2b.favor.enabled === false, JSON.stringify(st2b.favor));
  setPit(B, 3);
  r = await B.api("casino/favor/spin", { request_id: rid() });
  const cB = credits(B);
  check("Pit level 3 (the Slots open): the Favor is a 10 Shiny spin, nothing taken", r.error === 0 && r.free === true && r.bet === 10 && r.credits === cB && Array.isArray(r.stops), JSON.stringify([r.error, r.bet, r.payout]));
  const fid = rid();
  const f1 = await A.api("casino/favor/spin", { request_id: fid });
  const cA = credits(A);
  const f2 = await A.api("casino/favor/spin", { request_id: rid() });
  const f3 = await A.api("casino/favor/spin", { request_id: fid });
  check("one a day: a second refused; the first sent again answered as it was", f1.error === 0 && /today's Favor/.test(f2.error) && f3.error === 0 && f3.replayed === true && JSON.stringify(f3.stops) === JSON.stringify(f1.stops) && credits(A) === cA, JSON.stringify([f1.error, f2.error, f3.replayed]));
  const fav = sql(`SELECT stake || '|' || payout || '|' || (outcome->>'free_bet') FROM bym.casino_bet WHERE user_id = ${A.uid} AND game = 'favor' ORDER BY id DESC LIMIT 1`);
  check("the ledger: the Favor with no stake, its bet kept with it", fav === `0|${f1.payout}|10`, fav);
  const st2 = await A.api("casino/state");
  check("casino/state: the Favor used for today", st2.favor.ready === false);
  sql(`UPDATE bym.casino_player SET favor_day = favor_day - 1 WHERE user_id = ${A.uid}`);
  const st3 = await A.api("casino/state");
  check("the next day it is back, still a 10 Shiny spin at Pit level 6", st3.favor.ready === true && st3.favor.bet === 10);

  // ---- the Live tab
  const slot = await B.api("casino/slots/spin", { request_id: rid(), bet: 7 });
  await A.api("casino/slots/spin", { request_id: rid(), bet: 9 });
  // a jackpot each (written straight into the ledger) and a big win of the player's
  sql(`INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, status) VALUES (${B.uid}, '${rid()}', 'slots', 10, 4321, 432.1, '{"line":"jackpot"}', 'settled'), (${A.uid}, '${rid()}', 'slots', 10, 9999, 999.9, '{"line":"jackpot"}', 'settled')`);
  const live = await B.api("casino/live");
  const names = new Set([...live.bets, ...live.top, ...live.jackpots].map((b) => b.name));
  check("casino/live: the player's bets, newest first, theirs marked", live.error === 0 && live.bets.length > 0 && live.bets.some((b) => b.me && b.game === "slots" && b.stake === 7 && b.payout === slot.payout) && live.bets.every((b, i) => i === 0 || b.id < live.bets[i - 1].id), JSON.stringify(live.bets.slice(0, 3)));
  check(`no admin's bet anywhere on it (${A.name})`, !names.has(A.name), [...names].join(","));
  check("the day's biggest wins (most over the stake first) and the last jackpots", live.top.some((b) => b.name === B.name && b.payout - b.stake === 4311) && live.top.every((b, i) => i === 0 || b.payout - b.stake <= live.top[i - 1].payout - live.top[i - 1].stake) && live.jackpots[0].name === B.name && live.jackpots[0].jackpot === true && live.bets.some((b) => b.game === "favor" && b.stake === 0 && b.free_bet === 10), JSON.stringify([live.top[0], live.jackpots[0]]));

  // ---- BIG WINs (10x or more) in Global chat, only when they pay more than 500 Shiny: Magma Drop's high risk,
  // until a 12x or 60.7x cup on 1 Shiny (not announced), then on 50 (600 or more: announced)
  const chat = () => execFileSync("redis-cli", ["-n", "1", "--raw", "eval", "local out = {} for _, k in ipairs(redis.call('keys', 'history:*')) do for _, m in ipairs(redis.call('lrange', k, 0, 40)) do table.insert(out, m) end end return out", "0"]).toString();
  const dropUntilBig = async (bet) => {
    for (let i = 0; i < 800; i++) {
      const d = await B.api("casino/magmadrop/play", { request_id: rid(), bet, risk: "high" });
      if (d.error === 0 && d.multiplier >= 10) return d;
    }
    return null;
  };
  const tierOf = (d) => (d.multiplier >= 200 ? "EPIC WIN" : d.multiplier >= 50 ? "MEGA WIN" : "BIG WIN");
  const lines = (text) => chat().split(text).length - 1;
  const small = await dropUntilBig(1);
  const smallText = small && `${tierOf(small)}! ${B.name} won ${small.payout} Shiny on Magma Drop`;
  const before1 = small ? lines(smallText) : 0;
  await sleep(800);
  check(`a ${small && tierOf(small)} paying ${small && small.payout} Shiny (500 or less) is not announced`, small && lines(smallText) === before1, small && JSON.stringify([small.multiplier, small.payout]));
  await sleep(10500); // (past the 10 seconds after this player's last announcement)
  const big = await dropUntilBig(50);
  await sleep(800);
  const word = big && tierOf(big);
  check(`a ${word} paying ${big && big.payout} Shiny (over 500) is announced ("${word}! ${B.name} won ${big && big.payout} Shiny on Magma Drop")`, big && big.payout > 500 && chat().includes(`${word}! ${B.name} won ${big.payout.toLocaleString("en-US")} Shiny on Magma Drop`), big && JSON.stringify([big.multiplier, big.payout]));

  // ---- the Derby's bettors
  setPit(A, 6); setPit(B, 6);
  let ds;
  for (const end = Date.now() + 240000; ; ) { ds = await B.api("casino/derby/state"); if (ds.phase === "betting" && ds.starts_at - ds.server_ts > 15000) break; if (Date.now() > end) throw new Error("no race open for bets"); await sleep(1000); }
  const on = ds.runners[0].id, on2 = ds.runners[1].id;
  const before = (ds.totals || {})[on] || 0;
  // (what the player had on them already, if the test ran before on this race)
  const had = (id) => (ds.bettors || []).filter((x) => x.me && x.on === id).reduce((a, x) => a + x.amount, 0);
  const had1 = had(on), had2 = had(on2);
  const b1 = await B.api("casino/derby/bet", { request_id: rid(), round_id: ds.round_id, bets: JSON.stringify([{ on, amount: 30 }, { on: on2, amount: 5 }]) });
  const a1 = await A.api("casino/derby/bet", { request_id: rid(), round_id: ds.round_id, bets: JSON.stringify([{ on, amount: 20 }]) });
  ds = await B.api("casino/derby/state");
  const mine = ds.bettors.filter((x) => x.name === B.name);
  const line = (id) => mine.find((x) => x.on === id);
  check("the race's bettors: the player's line per runner, biggest first, theirs marked; no admin listed", b1.error === 0 && a1.error === 0 && line(on) && line(on).amount === had1 + 30 && line(on).me && line(on2) && line(on2).amount === had2 + 5 && !ds.bettors.some((x) => x.name === A.name) && ds.bettors.every((x, i) => i === 0 || x.amount <= ds.bettors[i - 1].amount), JSON.stringify(ds.bettors));
  check("what is on each runner counts everyone's bets (the admin's too)", ds.totals[on] === before + 50 && ds.totals[on2] >= 5 && ds.players >= 2, JSON.stringify(ds.totals));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  [A, B].forEach((u, i) => sql(`UPDATE bym.save SET credits = ${saved[i]}, buildingdata = buildingdata - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`));
  sql(`UPDATE bym."user" SET username = '${aName}' WHERE userid = ${A.uid}`);
}
