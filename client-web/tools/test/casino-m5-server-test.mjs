// The Brimstone Pit's Magma Derby (milestone 5), over HTTP, no browser (the round's clock is moved on by
// the test, so it takes under a minute instead of five):
//  - gating (Pit level 5); bad slips refused (a monster not running, a bet of 0, an empty slip)
//  - while bets are open: six runners with odds, no order, no times, no seed
//  - two slips from one player, one from another (on the winner, read from the database); bets refused
//    once the race has started
//  - racing: the order and every runner's checkpoint times, ending in that order
//  - over: the seed shown hashes to the hash shown at the start, and the whole race (runners, odds, order,
//    times) recomputed from it is the one run; the winner's bets paid amount x odds in whole Shiny (a
//    part by the round's seed and the bet), the rest lost;
//    the balances and the ledger agree
//   EMAIL=... EMAIL2=... PASSWORD=... PGPASSWORD=... node tools/test/casino-m5-server-test.mjs
import { execFileSync } from "node:child_process";
import { createHmac, createHash, randomBytes } from "node:crypto";
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const login = async (email) => {
  const r = await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json();
  const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`));
  const api = async (path, body = {}) => (await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${r.token}` }, body: new URLSearchParams(body).toString() })).json();
  return { uid, api };
};
const A = await login(process.env.EMAIL);
const B = await login(process.env.EMAIL2);
const rid = () => randomBytes(8).toString("hex");
const credits = (u) => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${u.uid} AND type = 'main'`));
const PIT_ID = 999141;
const setPit = (u, level) => sql(`UPDATE bym.save SET buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": ${level}}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`);
const saved = [A, B].map((u) => credits(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bet = (u, round, slip) => u.api("casino/derby/bet", { request_id: rid(), round_id: round, bets: JSON.stringify(slip) });
const waitFor = async (u, test, timeout = 60000) => { const end = Date.now() + timeout; for (;;) { const s = await u.api("casino/derby/state"); if (test(s)) return s; if (Date.now() > end) throw new Error("timed out: " + s.phase); await sleep(300); } };
// the race from its seed, as the server makes it (services/casino/games/derby.ts)
/**
 * What a win of `amount` on a round pays in whole Shiny: the part paid as one more Shiny when the first
 * number of HMAC(round seed, "pay:<bet id>:0:0") is under it (the seed and bet read from the database).
 */
const roundPay = (roundId, userid, amount) => {
  const [seed, id] = sql(`SELECT r.seed || '|' || b.id FROM bym.casino_round r JOIN bym.casino_bet b ON b.round_id = r.id WHERE r.id = ${roundId} AND b.user_id = ${userid}`).split("|");
  const h = createHmac("sha256", seed).update(`pay:${id}:0:0`).digest();
  const u = h[0] / 256 + h[1] / 65536 + h[2] / 16777216 + h[3] / 4294967296;
  const w = Math.floor(amount + 1e-9), p = Math.round((amount - w) * 1e6) / 1e6;
  return w + (u < p ? 1 : 0);
};
const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; const next = () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; return { next, int: (n) => Math.floor(next() * n) }; };
const raceOf = (seed) => {
  const R = { monsters: ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox", "wormzer"], runners: 6, min: 1, max: 6, rtp: 0.9999, minOdds: 1.05, raceMs: 40000, n: 10 };
  const rng = stream(seed, "derby", 0);
  const pool = [...R.monsters];
  for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const ids = pool.slice(0, R.runners);
  const s = ids.map(() => R.min + rng.next() * (R.max - R.min));
  const tot = s.reduce((a, b) => a + b, 0);
  const runners = ids.map((id, i) => ({ id, strength: Math.round(s[i] * 100) / 100, odds: Math.max(R.minOdds, Math.floor((100 * R.rtp) / (s[i] / tot) + 1e-9) / 100) }));
  const left = ids.map((id, i) => ({ id, s: s[i] }));
  const order = [];
  while (left.length) { const sum = left.reduce((a, b) => a + b.s, 0); let u = rng.next() * sum; let k = 0; while (k < left.length - 1 && u >= left[k].s) { u -= left[k].s; k++; } order.push(left[k].id); left.splice(k, 1); }
  let finish = R.raceMs * (0.6 + rng.next() * 0.12);
  const splits = {};
  for (const id of order) {
    const w = Array.from({ length: R.n }, () => 0.75 + rng.next() * 0.5);
    const stumble = rng.next() < 0.25 ? 1 + rng.int(R.n - 2) : -1;
    if (stumble >= 0) w[stumble] *= 1.9;
    const sum = w.reduce((a, b) => a + b, 0);
    let t = 0;
    const times = w.map((x) => (t += (x / sum) * finish));
    times[R.n - 1] = Math.round(finish);
    splits[id] = { times: times.map((x) => Math.round(x)), stumble };
    finish += 250 + rng.next() * 1200;
  }
  return { runners, order, splits };
};
try {
  for (const u of [A, B]) { sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${u.uid}`); sql(`UPDATE bym.save SET credits = 10000 WHERE userid = ${u.uid} AND type = 'main'`); }
  setPit(A, 4);
  let st = await waitFor(A, (s) => s.phase === "betting" && s.starts_at - s.server_ts > 20000, 120000);
  let r = await bet(A, st.round_id, [{ on: st.runners[0].id, amount: 5 }]);
  check("Pit level 4: Derby refused (level 5)", /level 5/.test(r.error), r.error);
  setPit(A, 5); setPit(B, 5);
  check("bets open: six runners with odds; no order, no times, no seed", st.runners.length === 6 && st.runners.every((x) => x.odds >= 1.05) && st.order === undefined && st.splits === undefined && st.seed === undefined && /^[0-9a-f]{64}$/.test(st.seed_hash));
  const running = st.runners.map((x) => x.id);
  const notRunning = ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox", "wormzer"].find((m) => !running.includes(m));
  for (const [slip, what] of [[[{ on: notRunning, amount: 5 }], "a monster not running"], [[{ on: running[0], amount: 0 }], "a bet of 0"], [[], "an empty slip"]]) {
    r = await bet(A, st.round_id, slip);
    check(`refused: ${what}`, typeof r.error === "string" && r.error.length > 3, r.error);
  }
  // the winner, read from the database
  const race = JSON.parse(sql(`SELECT params FROM bym.casino_round WHERE id = ${st.round_id}`));
  const winner = race.order[0], loser = race.order[5];
  const odds = Object.fromEntries(race.runners.map((x) => [x.id, x.odds]));
  const cA = credits(A), cB = credits(B);
  const a1 = await bet(A, st.round_id, [{ on: loser, amount: 30 }, { on: race.order[1], amount: 10 }]);
  const a2 = await bet(A, st.round_id, [{ on: loser, amount: 5 }, { on: loser, amount: 5 }]);
  const b1 = await bet(B, st.round_id, [{ on: winner, amount: 20 }]);
  check("two slips from one player, one from another: taken", a1.error === 0 && a2.error === 0 && b1.error === 0 && credits(A) === cA - 50 && credits(B) === cB - 20 && a2.bets.length === 1 && a2.bets[0].amount === 10, JSON.stringify([a1.error, a2.error, b1.error, a2.bets]));
  st = await A.api("casino/derby/state");
  check("the state lists the player's slips and the count of players", st.my_bets.length === 2 && st.players === 2 && st.pot === 70, JSON.stringify({ n: st.my_bets.length, players: st.players, pot: st.pot }));
  // the race starts in 2 seconds (and ends 5 later), instead of in minutes
  sql(`UPDATE bym.casino_round SET starts_at = now() + interval '2 seconds', ends_at = now() + interval '7 seconds' WHERE id = ${st.round_id}`);
  const rc = await waitFor(A, (s) => s.phase === "racing", 15000);
  r = await bet(B, st.round_id, [{ on: winner, amount: 5 }]);
  check("refused: a bet once the race has started", /closed/.test(r.error), r.error);
  const fin = rc.order.map((id) => rc.splits[id].times[9]);
  check("racing: the order and every runner's ten checkpoint times, ending in that order", rc.order.join() === race.order.join() && fin.every((t, i) => i === 0 || t > fin[i - 1]) && rc.order.every((id) => rc.splits[id].times.length === 10) && rc.seed === undefined);
  const res = await waitFor(A, (s) => s.phase === "results" && s.round_id === st.round_id, 20000);
  const again = raceOf(res.seed);
  check("over: the seed hashes to the hash shown at the start, and gives this very race (runners, odds, order, times)",
    createHash("sha256").update(res.seed).digest("hex") === st.seed_hash && JSON.stringify(again.runners.map((x) => [x.id, x.odds])) === JSON.stringify(res.runners.map((x) => [x.id, x.odds])) && again.order.join() === res.order.join() && again.order.every((id) => again.splits[id].times.join() === res.splits[id].times.join() && again.splits[id].stumble === res.splits[id].stumble));
  const wantB = roundPay(st.round_id, B.uid, 20 * odds[winner]);
  check(`the winner (${winner} at ${odds[winner]}): 20 on it paid ${wantB}; everything else lost`, credits(B) === cB - 20 + wantB && credits(A) === cA - 50, `${credits(B)} ${credits(A)}`);
  const ledger = sql(`SELECT string_agg(user_id || ':' || stake || ':' || payout || ':' || status, ',' ORDER BY id) FROM bym.casino_bet WHERE round_id = ${st.round_id}`);
  check("the ledger: three slips settled", ledger === `${A.uid}:40:0:settled,${A.uid}:10:0:settled,${B.uid}:20:${wantB}:settled`, ledger);
  check("the winner is in the history", res.history[0].round_id === st.round_id && res.history[0].winner === winner);
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  [A, B].forEach((u, i) => sql(`UPDATE bym.save SET credits = ${saved[i]}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`));
}
