// The Brimstone Pit's server (server/src/services/casino, controllers/casino), over HTTP, no browser:
//  - gating: no Pit, a Pit still being built, a damaged Pit, a game or ticket not open at the Pit's
//    level, a player whose Shiny is turned off: all refused with a message
//  - bad input refused: bets below the minimum, not whole, an unknown risk or ticket
//  - Magma Drop and Scratchers: the balance moves by the stake and the payout, exactly as the ledger says;
//    the path, cup, card and prize agree with the rules sent in casino/state
//  - the same request_id sent again is answered as the first time, and not charged again
//  - 20 bets sent at once on a 10 Shiny balance: none spends Shiny it does not have; the balance at the
//    end is what the ledger says, bet by bet
//  - a win with part of a Shiny (7 x 1.1 = 7.7) pays the whole part or not (7 or 8)
//  - provably fair: after the seed is rotated, the revealed seed gives back every drop made on it, and
//    its payout (the bet's next number deciding the part of a Shiny)
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/test/casino-server-test.mjs
// The account's yard gets a Brimstone Pit for the test (in the database) and loses it after; its Shiny is
// put back as it was. Prints one line per check.
import { execFileSync } from "node:child_process";
import { createHmac, createHash, randomBytes } from "node:crypto";
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const { token, userid } = await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json();
const uid = userid || Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const api = async (path, body = {}) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` }, body: new URLSearchParams(body).toString() });
  return r.json();
};
const rid = () => randomBytes(8).toString("hex");
const credits = () => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
const startCredits = credits();
const PIT_ID = 999141;
const setPit = (fields) => sql(`UPDATE bym.save SET buildingdata = COALESCE(buildingdata, '{}'::jsonb) || jsonb_build_object('${PIT_ID}', '${JSON.stringify({ X: 300, Y: 300, t: 141, id: PIT_ID, l: 1, ...fields })}'::jsonb) WHERE userid = ${uid} AND type = 'main'`);
const removePit = () => {
  sql(`UPDATE bym.save SET buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
};
try {
  removePit();
  sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
  // 1. no Pit
  let st = await api("casino/state");
  check("no Pit: the lobby says to build it", st.error === 0 && st.level === 0 && /Build the Brimstone Pit/.test(st.closed), JSON.stringify({ level: st.level, closed: st.closed }));
  let r = await api("casino/magmadrop/play", { request_id: rid(), bet: 5, risk: "low" });
  check("no Pit: a drop is refused", /Build the Brimstone Pit/.test(r.error), r.error);
  // 2. still being built (countdown left as of the last save)
  sql(`UPDATE bym.save SET savetime = extract(epoch from now())::int WHERE userid = ${uid} AND type = 'main'`);
  setPit({ cB: 3600 });
  r = await api("casino/magmadrop/play", { request_id: rid(), bet: 5, risk: "low" });
  check("a Pit still being built: refused", /still being built/.test(r.error), r.error);
  // 3. damaged
  setPit({});
  sql(`UPDATE bym.save SET buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) || '{"${PIT_ID}": 100}'::jsonb WHERE userid = ${uid} AND type = 'main'`);
  r = await api("casino/magmadrop/play", { request_id: rid(), bet: 5, risk: "low" });
  check("a damaged Pit: refused until repaired", /damaged/.test(r.error), r.error);
  sql(`UPDATE bym.save SET buildinghealthdata = buildinghealthdata - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
  // 4. open, level 1
  st = await api("casino/state");
  const open = st.games.filter((g) => g.unlocked).map((g) => g.id);
  check("a Pit at level 1: open, Magma Drop and Scratchers unlocked, the rest not", st.level === 1 && !st.closed && open.join() === "magmadrop,scratch", JSON.stringify({ level: st.level, closed: st.closed, open }));
  check("the rules come with it (tables, tickets, limits, seed hash)", st.rules.magmadrop.risks.high.length === 11 && st.rules.scratch.tiers.bone.price === 5 && st.limits.min_bet === 1 && /^[0-9a-f]{64}$/.test(st.seed.server_seed_hash), JSON.stringify(st.limits));
  const shownHash = st.seed.server_seed_hash, clientSeed = st.seed.client_seed;
  // 5. bad input
  const bad = [
    [{ request_id: rid(), bet: 0, risk: "low" }, "a bet of 0"], [{ request_id: rid(), bet: 2.5, risk: "low" }, "half a Shiny"],
    [{ request_id: rid(), bet: 5, risk: "insane" }, "an unknown risk"], [{ request_id: "x", bet: 5, risk: "low" }, "a bad request id"],
    [{ request_id: rid(), bet: 99999999, risk: "low" }, "more than the balance"],
  ];
  for (const [body, what] of bad) { r = await api("casino/magmadrop/play", body); check(`refused: ${what}`, typeof r.error === "string" && r.error.length > 3, r.error); }
  r = await api("casino/scratch/buy", { request_id: rid(), tier: "magma" });
  check("refused: a Magma ticket at Pit level 1 (needs level 3)", /level 3/.test(r.error), r.error);
  // 6. Magma Drop: balance and ledger
  sql(`UPDATE bym.save SET credits = 5000 WHERE userid = ${uid} AND type = 'main'`);
  let before = credits(), sums = { stake: 0, payout: 0 }, drops = [], ok = true;
  for (let i = 0; i < 30; i++) {
    const risk = ["low", "medium", "high"][i % 3];
    const d = await api("casino/magmadrop/play", { request_id: rid(), bet: 7, risk });
    if (d.error !== 0) { ok = false; console.log(d); break; }
    const mult = st.rules.magmadrop.risks[risk][d.slot];
    if (d.path.length !== 10 || d.path.reduce((a, b) => a + b, 0) !== d.slot || d.multiplier !== mult || (d.payout !== Math.floor(7 * mult + 1e-9) && d.payout !== Math.ceil(7 * mult - 1e-9))) { ok = false; console.log("mismatch", d); }
    sums.stake += 7; sums.payout += d.payout; drops.push(d);
  }
  check("30 drops: every path ends in its cup and pays that cup's multiplier (a part of a Shiny: the whole of it or none)", ok);
  check("the balance moved by exactly the stakes and the payouts", credits() === before - sums.stake + sums.payout, `${before} - ${sums.stake} + ${sums.payout} = ${credits()}`);
  check("the last answer's balance is the balance", drops[drops.length - 1].credits === credits());
  const ledger = sql(`SELECT count(*), sum(stake), sum(payout) FROM (SELECT * FROM bym.casino_bet WHERE user_id = ${uid} AND game = 'magmadrop' ORDER BY id DESC LIMIT 30) b`).split("|").map(Number);
  check("the ledger has each drop, with its stake and payout", ledger[0] === 30 && ledger[1] === sums.stake && ledger[2] === sums.payout, ledger.join(" "));
  // 7. the same request again
  const again = rid();
  const first = await api("casino/magmadrop/play", { request_id: again, bet: 9, risk: "medium" });
  const c1 = credits();
  const second = await api("casino/magmadrop/play", { request_id: again, bet: 9, risk: "medium" });
  check("the same request sent again: the first answer, not played or charged again", second.replayed === true && second.slot === first.slot && second.payout === first.payout && credits() === c1, JSON.stringify({ first: first.slot, second: second.slot, c1, now: credits() }));
  drops.push(first);
  // 8. Scratchers
  let sOk = true, sStake = 0, sPay = 0; before = credits();
  for (let i = 0; i < 40; i++) {
    const c = await api("casino/scratch/buy", { request_id: rid(), tier: i % 2 ? "bone" : "obsidian" });
    if (c.error !== 0) { sOk = false; console.log(c); break; }
    const counts = {}; for (const s of c.grid) counts[s] = (counts[s] || 0) + 1;
    const threes = Object.entries(counts).filter(([, n]) => n >= 3);
    const prize = st.rules.scratch.prizes.find((p) => p.symbol === c.prize);
    if (c.prize ? !(threes.length === 1 && threes[0][0] === c.prize && threes[0][1] === 3 && c.payout === c.price * prize.pays) : !(threes.length === 0 && c.payout === 0)) { sOk = false; console.log("bad card", c); }
    sStake += c.price; sPay += c.payout;
  }
  check("40 cards: a winning card has three of its prize and pays it; a losing card has no three", sOk);
  check("Scratchers: the balance moved by exactly the prices and the prizes", credits() === before - sStake + sPay, `${before} - ${sStake} + ${sPay} = ${credits()}`);
  // 9. 20 bets at once on 10 Shiny
  sql(`UPDATE bym.save SET credits = 10 WHERE userid = ${uid} AND type = 'main'`);
  const lastId = Number(sql(`SELECT COALESCE(max(id), 0) FROM bym.casino_bet WHERE user_id = ${uid}`));
  const burst = await Promise.all(Array.from({ length: 20 }, () => api("casino/magmadrop/play", { request_id: rid(), bet: 10, risk: "high" })));
  const accepted = burst.filter((b) => b.error === 0).length;
  const rows = sql(`SELECT stake, payout FROM bym.casino_bet WHERE user_id = ${uid} AND id > ${lastId} ORDER BY id`).split("\n").filter(Boolean).map((l) => l.split("|").map(Number));
  let bal = 10, never = true;
  for (const [s, p] of rows) { if (bal < s) never = false; bal = bal - s + p; }
  check("20 bets at once on 10 Shiny: each accepted bet had the Shiny when it was played", never && rows.length === accepted, `${accepted} accepted`);
  check("... and the balance is exactly what the ledger says", credits() === bal && credits() >= 0, `ledger ${bal}, balance ${credits()}`);
  // 10. provably fair: rotate, recompute every drop on the old seed
  const rot = await api("casino/seed/rotate", { client_seed: "my-own-seed" });
  const rev = rot.revealed;
  check("rotating shows the old server seed, and it hashes to what was shown before play", rev && createHash("sha256").update(rev.server_seed).digest("hex") === shownHash && rev.client_seed === clientSeed, rev && rev.server_seed_hash);
  check("the new seed: a new hash, the chosen client seed, the count from 0", rot.server_seed_hash !== shownHash && rot.client_seed === "my-own-seed" && rot.nonce === 0);
  const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; return () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; };
  let fair = 0, total = 0;
  for (const d of drops) {
    const next = stream(rev.server_seed, rev.client_seed, d.nonce);
    const path = Array.from({ length: 10 }, () => (next() < 0.5 ? 0 : 1));
    // the payout: the whole Shiny of the bet x the cup, and one more with the chance of the part left over
    const amount = (d.bet ?? 7) * d.multiplier, whole = Math.floor(amount + 1e-9), part = Math.round((amount - whole) * 1e6) / 1e6;
    total++; if (path.join("") === d.path.join("") && d.payout === whole + (next() < part ? 1 : 0)) fair++;
  }
  check("every drop recomputed from the revealed seed, client seed and nonce comes out the same, its payout too", fair === total && total > 0, `${fair} of ${total}`);
  const hist = await api("casino/history", { limit: 10 });
  check("History: the last bets, and the revealed seed", hist.bets.length === 10 && hist.revealed_seeds.some((s) => s.server_seed === rev.server_seed));
  // 11. Shiny turned off
  sql(`UPDATE bym."user" SET shiny_locked = true WHERE userid = ${uid}`);
  r = await api("casino/magmadrop/play", { request_id: rid(), bet: 1, risk: "low" });
  check("a player whose Shiny is turned off: refused", /Shiny is turned off/.test(r.error), r.error);
  sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
} finally {
  removePit();
  sql(`UPDATE bym.save SET credits = ${startCredits} WHERE userid = ${uid} AND type = 'main'`);
  sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
}
