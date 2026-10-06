// The Brimstone Pit's Balthazar's Ascent (milestone 4), over HTTP, no browser (about two minutes: two rounds):
//  - gating (Pit level 4); bad bets refused (an automatic cash-out under 1.01x or over 1000x, a round not
//    open for bets, a second bet on a round)
//  - the round goes betting -> flying -> shot down; the state never shows the crash point before the
//    crash; after it, the seed, which hashes to the hash shown at the start and gives the crash point
//  - a round made to crash between 2.5x and 3x (its seed replaced while bets are open): an automatic
//    cash-out at 1.50x paid 1.5x the bet; a cash-out by hand pays the server's multiplier (10 sent at
//    once: paid once); a cash-out by hand after the crash: lost; an automatic 5x: lost
//  - bets during the flight refused; the balance and the ledger agree
//   EMAIL=... EMAIL2=... PASSWORD=... PGPASSWORD=... node tools/test/casino-m4-server-test.mjs
// Both accounts' yards get a Pit for the test and lose it after; their Shiny is put back.
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
const G = 0.00006;
const mult = (t) => Math.max(1, Math.floor(100 * Math.exp(G * Math.max(0, t)) + 1e-9) / 100);
const crashOf = (seed) => { const b = createHmac("sha256", seed).update("ascent:0:0").digest(); const u = b[0] / 256 + b[1] / 65536 + b[2] / 16777216 + b[3] / 4294967296; return Math.min(1000, Math.max(1, Math.floor((100 * 0.9999) / (1 - u) + 1e-9) / 100)); };
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
const flightOf = (c) => { if (c <= 1) return 0; let t = Math.max(0, Math.floor(Math.log(c) / G) - 2); while (mult(t) < c) t++; return t; };
/** Waits for the state to be in `phase` (and, for betting, with at least `left` ms to bet). */
const waitFor = async (u, phase, left = 0, timeout = 60000) => {
  const end = Date.now() + timeout;
  for (;;) {
    const s = await u.api("casino/ascent/state");
    if (s.phase === phase && (phase !== "betting" || s.starts_at - s.server_ts > left)) return s;
    if (Date.now() > end) throw new Error(`no ${phase} in time: ${s.phase}`);
    await sleep(250);
  }
};
try {
  for (const u of [A, B]) { sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${u.uid}`); sql(`UPDATE bym.save SET credits = 10000 WHERE userid = ${u.uid} AND type = 'main'`); }
  // 1. gating
  setPit(A, 3);
  let st = await waitFor(A, "betting", 3000);
  let r = await A.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 10 });
  check("Pit level 3: Ascent refused (level 4)", /level 4/.test(r.error), r.error);
  setPit(A, 4); setPit(B, 4);
  const hashShown = st.seed_hash;
  check("while bets are open the state has no crash point and no seed", st.crash === undefined && st.seed === undefined && /^[0-9a-f]{64}$/.test(hashShown));
  for (const [auto, what] of [["1.00", "an automatic cash-out at 1.00x"], ["2000", "an automatic cash-out at 2000x"]]) {
    r = await A.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 10, auto_cashout: auto });
    check(`refused: ${what}`, /automatic cash-out/.test(r.error), r.error);
  }
  r = await A.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id + 5, bet: 10 });
  check("refused: a bet on a round not open for bets", /closed/.test(r.error), r.error);
  // 2. this round, as drawn: watched to the end, its seed checked
  const round1 = st.round_id;
  const fl = await waitFor(A, "flying", 0, 30000);
  check("the round flies; still no crash point in the state", fl.round_id === round1 && fl.crash === undefined && fl.seed === undefined);
  r = await A.api("casino/ascent/bet", { request_id: rid(), round_id: round1, bet: 10 });
  check("refused: a bet during the flight", /closed/.test(r.error), r.error);
  const cr = await waitFor(A, "crashed", 0, 200000);
  check("shot down: the seed is shown, it hashes to the hash shown at the start and gives the crash point", cr.round_id === round1 && createHash("sha256").update(cr.seed).digest("hex") === hashShown && crashOf(cr.seed) === cr.crash, `${cr.crash}x`);
  check("the crash point is in the history", cr.history[0].round_id === round1 && cr.history[0].crash === cr.crash);
  // 3. the next round, made to crash between 2.5x and 3x
  st = await waitFor(A, "betting", 6000);
  let seed, crash;
  do { seed = randomBytes(32).toString("hex"); crash = crashOf(seed); } while (crash < 2.5 || crash >= 3);
  const flight = flightOf(crash);
  sql(`UPDATE bym.casino_round SET seed = '${seed}', seed_hash = '${createHash("sha256").update(seed).digest("hex")}', params = '{"crash": ${crash}, "flight_ms": ${flight}}'::jsonb, ends_at = starts_at + make_interval(secs => ${flight / 1000}) WHERE id = ${st.round_id}`);
  const cA = credits(A), cB = credits(B);
  const betA = await A.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 100, auto_cashout: "1.5" });
  const betB = await B.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 50 });
  check("bets taken: 100 with an automatic 1.50x, 50 to cash out by hand", betA.error === 0 && betB.error === 0 && betA.auto === 1.5 && credits(A) === cA - 100 && credits(B) === cB - 50, JSON.stringify([betA.error, betB.error]));
  r = await B.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 5 });
  check("refused: a second bet on the same flight", /already/.test(r.error), r.error);
  r = await B.api("casino/ascent/cashout", { round_id: st.round_id });
  check("refused: cashing out before take-off", /not taken off/.test(r.error), r.error);
  await waitFor(B, "flying", 0, 20000);
  // B cashes out by hand at about 1.2x: 10 at once
  for (;;) { const s = await B.api("casino/ascent/state"); if (mult(s.server_ts - s.starts_at) >= 1.2) break; await sleep(100); }
  const outs = await Promise.all(Array.from({ length: 10 }, () => B.api("casino/ascent/cashout", { round_id: st.round_id })));
  const first = outs.find((o) => o.replayed === false);
  check("a cash-out by hand (10 sent at once): paid once, 50 x the multiplier on the server's clock in whole Shiny (a part by the round's seed)", first && outs.filter((o) => o.replayed === false).length === 1 && first.cashed >= 1.2 && first.cashed < 1.5 && first.payout === roundPay(st.round_id, B.uid, 50 * first.cashed) && credits(B) === cB - 50 + first.payout && outs.every((o) => o.payout === first.payout), JSON.stringify(first));
  // A's automatic 1.50x, paid as the multiplier passes it
  for (;;) { const s = await A.api("casino/ascent/state"); if (mult(s.server_ts - s.starts_at) >= 1.6) break; await sleep(200); }
  await sleep(400);
  const midA = await A.api("casino/ascent/state");
  check("the automatic 1.50x paid during the flight: 150", midA.phase === "flying" && midA.my_bet.cashed === 1.5 && midA.my_bet.payout === 150 && credits(A) === cA - 100 + 150, JSON.stringify(midA.my_bet));
  check("the players' list shows both cash-outs, by name", midA.players.length === 2 && midA.players.every((p) => p.cashed != null), JSON.stringify(midA.players.map((p) => [p.name, p.cashed])));
  const cr2 = await waitFor(A, "crashed", 0, 60000);
  check(`shot down at the crash point the seed gives (${crash}x)`, cr2.crash === crash);
  const ledger = sql(`SELECT string_agg(user_id || ':' || stake || ':' || payout || ':' || status, ',' ORDER BY id) FROM bym.casino_bet WHERE round_id = ${st.round_id}`);
  check("the ledger: both bets settled with their payouts", ledger === `${A.uid}:100:150:settled,${B.uid}:50:${first.payout}:settled`, ledger);
  // 4. the round after: an automatic 5x (lost) and a cash-out by hand too late
  st = await waitFor(A, "betting", 6000);
  do { seed = randomBytes(32).toString("hex"); crash = crashOf(seed); } while (crash < 1.3 || crash >= 1.6);
  const flight2 = flightOf(crash);
  sql(`UPDATE bym.casino_round SET seed = '${seed}', seed_hash = '${createHash("sha256").update(seed).digest("hex")}', params = '{"crash": ${crash}, "flight_ms": ${flight2}}'::jsonb, ends_at = starts_at + make_interval(secs => ${flight2 / 1000}) WHERE id = ${st.round_id}`);
  const cA2 = credits(A), cB2 = credits(B);
  await A.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 20, auto_cashout: "5" });
  await B.api("casino/ascent/bet", { request_id: rid(), round_id: st.round_id, bet: 30 });
  await waitFor(A, "crashed", 0, 60000);
  r = await B.api("casino/ascent/cashout", { round_id: st.round_id });
  check(`a round shot down at ${crash}x: the automatic 5x lost, a cash-out by hand after the crash lost`, credits(A) === cA2 - 20 && credits(B) === cB2 - 30 && r.lost === true && r.payout === 0, JSON.stringify(r));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  [A, B].forEach((u, i) => sql(`UPDATE bym.save SET credits = ${saved[i]}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`));
}
