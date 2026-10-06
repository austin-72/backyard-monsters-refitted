// The Brimstone Pit's Bone Pile (milestone 3), over HTTP, no browser:
//  - gating (Pit level 2) and bad input (0 or 21 Sabnox, a pile that is not there, another player's game)
//  - a game: the bet taken at the start; casino/state shows the open game but not where the Sabnox are;
//    a second game refused while one is open; the same start sent again answers with the same game
//  - safe piles raise the multiplier as the formula says; a pile opened twice changes nothing; cashing
//    out pays bet x multiplier in whole Shiny (a part by the bet's next number) and shows the layout, which is the one the seeds make and matches
//    the hash sent at the start
//  - a Sabnox loses the bet and shows the layout; cashing out after is answered as it stands (nothing paid)
//  - every safe pile opened (20 Sabnox, 5 piles) cashes out at once, held to 1000x
//  - 10 starts at once: one game; 10 cash-outs at once: paid once
//  - games left alone for a day: cashed out if a pile was opened, the bet given back if not
//   EMAIL=... EMAIL2=... PASSWORD=... PGPASSWORD=... node tools/test/casino-m3-server-test.mjs
// Both accounts' yards get a Pit for the test and lose it after; their Shiny and seeds are put back.
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
const saved = [A, B].map((u) => ({ credits: credits(u), seed: sql(`SELECT row_to_json(s) FROM bym.casino_seed s WHERE user_id = ${u.uid}`) }));
const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; return () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; };
/** The layout the player's seeds make for their next game (the test reads the secret seed from the database). */
const nextLayout = (u, m) => {
  const s = JSON.parse(sql(`SELECT row_to_json(s) FROM bym.casino_seed s WHERE user_id = ${u.uid}`));
  const next = stream(s.server_seed, s.client_seed, s.nonce);
  const order = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 24; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const mines = order.slice(0, m).sort((a, b) => a - b);
  // u: the bet's next number, whether a part of a Shiny won is paid
  return { mines, u: next(), hash: createHash("sha256").update(`${s.server_seed}:${s.client_seed}:${s.nonce}:${mines.join(",")}`).digest("hex") };
};
const mult = (k, m) => { let r = 1; for (let i = 0; i < k; i++) r *= (25 - i) / (25 - m - i); return Math.min(1000, Math.floor(0.9999 * r * 100 + 1e-7) / 100); };
/** A win of `amount` in whole Shiny: the part paid as one more Shiny when the bet's number `u` is under it. */
const pay = (amount, u) => { const w = Math.floor(amount + 1e-9), p = Math.round((amount - w) * 1e6) / 1e6; return w + (u < p ? 1 : 0); };

const safeTiles = (mines) => Array.from({ length: 25 }, (_, i) => i).filter((t) => !mines.includes(t));
const clearOpen = () => sql(`UPDATE bym.casino_session SET status = 'refunded' WHERE user_id IN (${A.uid}, ${B.uid}) AND status = 'open'`);
try {
  clearOpen();
  for (const u of [A, B]) { sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${u.uid}`); sql(`UPDATE bym.save SET credits = 10000 WHERE userid = ${u.uid} AND type = 'main'`); }
  // make sure both have seeds
  for (const u of [A, B]) await u.api("casino/state");
  // 1. gating, bad input
  setPit(A, 1);
  let r = await A.api("casino/bonepile/start", { request_id: rid(), bet: 10, sabnox: 3 });
  check("Pit level 1: Bone Pile refused (level 2)", /level 2/.test(r.error), r.error);
  setPit(A, 2); setPit(B, 2);
  for (const [body, what] of [[{ bet: 10, sabnox: 0 }, "0 Sabnox"], [{ bet: 10, sabnox: 21 }, "21 Sabnox"], [{ bet: 0, sabnox: 3 }, "a bet of 0"], [{ bet: 99999999, sabnox: 3 }, "more than the balance"]]) {
    r = await A.api("casino/bonepile/start", { request_id: rid(), ...body });
    check(`refused: ${what}`, typeof r.error === "string" && r.error.length > 3, r.error);
  }
  // 2. a game, cashed out
  let c0 = credits(A);
  const lay = nextLayout(A, 3);
  const startId = rid();
  const g = await A.api("casino/bonepile/start", { request_id: startId, bet: 50, sabnox: 3 });
  check("a game starts: 50 taken, no pile open, the layout's hash sent, not the layout", g.error === 0 && credits(A) === c0 - 50 && g.credits === c0 - 50 && g.revealed.length === 0 && g.layout === undefined && g.layout_hash === lay.hash, JSON.stringify({ err: g.error, hash: g.layout_hash === lay.hash }));
  const again = await A.api("casino/bonepile/start", { request_id: startId, bet: 50, sabnox: 3 });
  check("the same start sent again: the same game, not charged again", again.session_id === g.session_id && again.replayed === true && credits(A) === c0 - 50);
  r = await A.api("casino/bonepile/start", { request_id: rid(), bet: 5, sabnox: 3 });
  check("a second game while one is open: refused", /Finish/.test(r.error), r.error);
  const st = await A.api("casino/state");
  check("casino/state shows the open game (to resume it), not where the Sabnox are", st.bonepile && st.bonepile.session_id === g.session_id && st.bonepile.layout === undefined && JSON.stringify(st).indexOf('"mines"') < 0);
  r = await B.api("casino/bonepile/reveal", { session_id: g.session_id, tile: 0 });
  check("another player cannot open piles in it", /could not be found/.test(r.error), r.error);
  r = await A.api("casino/bonepile/reveal", { session_id: g.session_id, tile: 25 });
  check("refused: a pile that is not there", typeof r.error === "string", r.error);
  r = await A.api("casino/bonepile/cashout", { session_id: g.session_id });
  check("cashing out before opening a pile: refused", /Open a pile/.test(r.error), r.error);
  const safe = safeTiles(lay.mines);
  let ok = true;
  for (let k = 0; k < 4; k++) {
    r = await A.api("casino/bonepile/reveal", { session_id: g.session_id, tile: safe[k] });
    if (!(r.safe && r.status === "open" && r.revealed.length === k + 1 && r.multiplier === mult(k + 1, 3) && r.next_multiplier === mult(k + 2, 3) && r.layout === undefined)) { ok = false; console.log(r); }
  }
  check("four safe piles: the multiplier goes up as the formula says (0.9999 x C(25,k) / C(22,k)), the layout still hidden", ok, `${r.multiplier}`);
  r = await A.api("casino/bonepile/reveal", { session_id: g.session_id, tile: safe[0] });
  check("a pile opened twice changes nothing", r.revealed.length === 4 && r.multiplier === mult(4, 3));
  const cash = await Promise.all(Array.from({ length: 10 }, () => A.api("casino/bonepile/cashout", { session_id: g.session_id })));
  const want = pay(50 * mult(4, 3), lay.u);
  check(`10 cash-outs at once: paid once, 50 x ${mult(4, 3)} = ${50 * mult(4, 3)} in whole Shiny (${want})`, cash.every((c) => c.payout === want) && cash.filter((c) => c.replayed === false).length === 1 && credits(A) === c0 - 50 + want, `${c0} - 50 + ${want} = ${credits(A)}`);
  check("the layout shown at the end is the one the seeds make, and matches the hash", JSON.stringify(cash[0].layout) === JSON.stringify(lay.mines) && cash[0].status === "won");
  const bet = sql(`SELECT status || '|' || payout || '|' || multiplier FROM bym.casino_bet WHERE user_id = ${A.uid} AND request_id = '${startId}'`);
  check("the ledger: the bet settled with its payout", bet === `settled|${want}|${mult(4, 3).toFixed(2)}`, bet);
  // 3. a Sabnox
  c0 = credits(A);
  const lay2 = nextLayout(A, 5);
  const g2 = await A.api("casino/bonepile/start", { request_id: rid(), bet: 20, sabnox: 5 });
  r = await A.api("casino/bonepile/reveal", { session_id: g2.session_id, tile: safeTiles(lay2.mines)[0] });
  r = await A.api("casino/bonepile/reveal", { session_id: g2.session_id, tile: lay2.mines[0] });
  check("a Sabnox: the bet lost, the layout shown", r.safe === false && r.status === "lost" && JSON.stringify(r.layout) === JSON.stringify(lay2.mines) && credits(A) === c0 - 20, JSON.stringify({ safe: r.safe, status: r.status }));
  r = await A.api("casino/bonepile/cashout", { session_id: g2.session_id });
  check("cashing out after: nothing paid", r.payout === 0 && r.replayed === true && credits(A) === c0 - 20);
  // 4. every safe pile: cashed out at once, held to 1000x
  c0 = credits(A);
  const lay3 = nextLayout(A, 20);
  const g3 = await A.api("casino/bonepile/start", { request_id: rid(), bet: 3, sabnox: 20 });
  for (const t of safeTiles(lay3.mines)) r = await A.api("casino/bonepile/reveal", { session_id: g3.session_id, tile: t });
  check("20 Sabnox, all 5 safe piles: cashed out at once at 1000x (the cap), 3,000", r.status === "won" && r.payout === 3000 && r.multiplier === 1000 && credits(A) === c0 - 3 + 3000, JSON.stringify({ status: r.status, payout: r.payout, mult: r.multiplier }));
  // 5. 10 starts at once
  const starts = await Promise.all(Array.from({ length: 10 }, () => B.api("casino/bonepile/start", { request_id: rid(), bet: 7, sabnox: 2 })));
  const started = starts.filter((s) => s.error === 0);
  check("10 starts at once: one game, one bet taken", started.length === 1 && credits(B) === 10000 - 7, `${started.length} started, ${credits(B)}`);
  // 6. left alone for a day
  const bs = started[0];
  const layB = sql(`SELECT layout FROM bym.casino_session WHERE id = ${bs.session_id}`);
  const safeB = safeTiles(JSON.parse(layB).mines);
  await B.api("casino/bonepile/reveal", { session_id: bs.session_id, tile: safeB[0] });
  sql(`UPDATE bym.casino_session SET updated_at = now() - interval '25 hours' WHERE id = ${bs.session_id}`);
  const stB = await B.api("casino/state");
  const wantB = pay(7 * mult(1, 2), JSON.parse(layB).u);
  check("a game left for a day with a pile open: cashed out when the player comes back", stB.bonepile === null && credits(B) === 10000 - 7 + wantB && sql(`SELECT status FROM bym.casino_session WHERE id = ${bs.session_id}`) === "won", `${credits(B)}`);
  const g4 = await A.api("casino/bonepile/start", { request_id: rid(), bet: 40, sabnox: 4 });
  c0 = credits(A);
  sql(`UPDATE bym.casino_session SET updated_at = now() - interval '25 hours' WHERE id = ${g4.session_id}`);
  await A.api("casino/state");
  check("a game left for a day with no pile open: the bet given back", credits(A) === c0 + 40 && sql(`SELECT status FROM bym.casino_bet WHERE id = (SELECT bet_id FROM bym.casino_session WHERE id = ${g4.session_id})`) === "refunded");
} finally {
  clearOpen();
  [A, B].forEach((u, i) => {
    sql(`UPDATE bym.save SET credits = ${saved[i].credits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`);
    if (saved[i].seed) { const s = JSON.parse(saved[i].seed); sql(`UPDATE bym.casino_seed SET server_seed = '${s.server_seed}', server_seed_hash = '${s.server_seed_hash}', client_seed = '${s.client_seed}', nonce = ${s.nonce} WHERE user_id = ${u.uid}`); }
  });
}
