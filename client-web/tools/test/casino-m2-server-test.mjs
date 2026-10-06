// The Brimstone Pit's Wormzer Roulette and Magma Slots (milestone 2), over HTTP, no browser:
//  - gating by the Pit's level: Roulette from level 2, Slots from level 3
//  - Roulette: bad slips refused (an unknown place, a bet of 0, an empty slip); a slip on every
//    place settled on the segment drawn, as the wheel in casino/state says (pays with decimals: the
//    slip's total paid in whole Shiny, its part by chance); the balance and the ledger move by the stake
//    and the payout; the same place twice is one bet
//  - Slots: every spin pays what its line says; the jackpot rate of every stake goes into the pool; the
//    balance and the ledger agree
//  - the jackpot: two players on seeds that hit three King Wormzer, spinning at the same moment: the
//    pool is paid once, the other wins what was left (the seed and their own share); a smaller bet wins
//    its share and leaves the rest; a bigger bet wins the pool more than once over; the pool stops at
//    its most
//  - provably fair: every spin recomputed from the revealed seed comes out the same, Roulette's payout too
//   EMAIL=... EMAIL2=... PASSWORD=... PGPASSWORD=... node tools/test/casino-m2-server-test.mjs
// Both accounts' yards get a Pit for the test (in the database) and lose it after; their Shiny, seeds and
// the pool are put back as they were. Prints one line per check.
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
const savedPool = sql(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`);
const pool = () => Number(sql(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`));
const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; return () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; };
try {
  for (const u of [A, B]) { sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${u.uid}`); sql(`UPDATE bym.save SET credits = 20000 WHERE userid = ${u.uid} AND type = 'main'`); }
  // 1. gating
  setPit(A, 1);
  let r = await A.api("casino/roulette/spin", { request_id: rid(), bets: JSON.stringify([{ on: "lava", amount: 5 }]) });
  check("Pit level 1: Roulette refused (level 2)", /level 2/.test(r.error), r.error);
  setPit(A, 2);
  r = await A.api("casino/slots/spin", { request_id: rid(), bet: 5 });
  check("Pit level 2: Slots refused (level 3)", /level 3/.test(r.error), r.error);
  setPit(A, 3);
  setPit(B, 3);
  const st = await A.api("casino/state");
  const wheel = st.rules.roulette.wheel;
  check("casino/state: the wheel (29 segments) and the reels (3 of 32), Roulette, Bone Pile and Slots open at level 3",
    wheel.length === 29 && wheel[0].monster === "wormzer" && st.rules.slots.strips.length === 3 && st.rules.slots.strips.every((s) => s.length === 32) &&
    st.games.filter((g) => g.unlocked).map((g) => g.id).join() === "magmadrop,scratch,roulette,bonepile,slots", st.games.filter((g) => g.unlocked).map((g) => g.id).join());
  // 2. Roulette: bad slips
  const bad = [
    [[{ on: "moloch", amount: 5 }], "an unknown place"], [[{ on: "lava", amount: 0 }], "a bet of 0"], [[{ on: "ash", amount: 1.5 }], "half a Shiny"],
    [[], "an empty slip"], ["not json", "a slip that is not a list"],
  ];
  for (const [slip, what] of bad) {
    r = await A.api("casino/roulette/spin", { request_id: rid(), bets: typeof slip === "string" ? slip : JSON.stringify(slip) });
    check(`Roulette refused: ${what}`, typeof r.error === "string" && r.error.length > 3, r.error);
  }
  // 3. Roulette: slips on every place
  const places = "spurtz zagnoid valgos malphus balthazar grokus sabnox lava ash wormzer".split(" ");
  const P = st.rules.roulette.pays;
  const pays = (on, seg) => on === "wormzer" ? (seg.monster === "wormzer" ? P.wormzer : 0) : on === "lava" || on === "ash" ? (seg.color === on ? P.color : 0) : seg.monster === on ? P.monster : 0;
  let before = credits(A), stake = 0, paid = 0, ok = true;
  const spins = [];
  for (let i = 0; i < 30; i++) {
    const slip = places.map((on, k) => ({ on, amount: 1 + ((i + k) % 3) }));
    const s = await A.api("casino/roulette/spin", { request_id: rid(), bets: JSON.stringify(slip) });
    if (s.error !== 0) { ok = false; console.log(s); break; }
    const seg = wheel[s.segment];
    const want = Math.round(slip.reduce((a, b) => a + b.amount * pays(b.on, seg), 0) * 1e6) / 1e6;
    if ((s.payout !== Math.floor(want) && s.payout !== Math.ceil(want)) || s.monster !== seg.monster || s.color !== seg.color || s.bet !== slip.reduce((a, b) => a + b.amount, 0)) { ok = false; console.log("mismatch", s, want); }
    stake += s.bet; paid += s.payout; spins.push({ game: "roulette", want, ...s });
  }
  check(`30 slips on every place: each settled on the segment drawn, as the wheel says (pays ${P.monster}, ${P.color}, ${P.wormzer}: the whole Shiny of it, the part by chance)`, ok);
  check("Roulette: the balance moved by exactly the stakes and the payouts", credits(A) === before - stake + paid, `${before} - ${stake} + ${paid} = ${credits(A)}`);
  r = await A.api("casino/roulette/spin", { request_id: rid(), bets: JSON.stringify([{ on: "lava", amount: 3 }, { on: "lava", amount: 4 }]) });
  check("the same place twice on a slip is one bet of both", r.error === 0 && r.results.length === 1 && r.results[0].amount === 7 && r.bet === 7, JSON.stringify(r.results));
  spins.push({ game: "roulette", want: r.segment !== undefined && wheel[r.segment].color === "lava" ? 7 * P.color : 0, ...r });
  // 4. Slots
  before = credits(A); stake = 0; paid = 0; ok = true;
  const pool0 = pool();
  const strips = st.rules.slots.strips;
  for (let i = 0; i < 40; i++) {
    const s = await A.api("casino/slots/spin", { request_id: rid(), bet: 10 });
    if (s.error !== 0) { ok = false; console.log(s); break; }
    const sym = s.stops.map((x, k) => strips[k][x]);
    const three = sym.every((x) => x === sym[0]);
    const want = three && sym[0] !== "wormzer" ? 10 * st.rules.slots.pays[sym[0]] : sym.filter((x) => x === "spurtz").length === 2 ? 10 : 0;
    if (sym.join() !== s.symbols.join() || (s.line !== "jackpot" && s.payout !== want)) { ok = false; console.log("mismatch", s, want); }
    stake += 10; paid += s.payout; spins.push({ game: "slots", ...s });
  }
  check("40 spins: each pays what its line says (three of a kind, two Spurtz, nothing)", ok);
  check("Slots: the balance moved by exactly the stakes and the payouts", credits(A) === before - stake + paid, `${before} - ${stake} + ${paid} = ${credits(A)}`);
  const rate = st.rules.slots.jackpot_rate;
  check(`${rate * 100}% of every stake went into the pool (40 x 10 Shiny: ${400 * rate})`, Math.abs(pool() - pool0 - 400 * rate) < 1e-6 || spins.some((s) => s.line === "jackpot"), `${pool0} -> ${pool()}`);
  const ledger = sql(`SELECT count(*), sum(stake), sum(payout) FROM (SELECT * FROM bym.casino_bet WHERE user_id = ${A.uid} AND game = 'slots' ORDER BY id DESC LIMIT 40) b`).split("|").map(Number);
  check("the ledger has each spin", ledger[0] === 40 && ledger[1] === stake && ledger[2] === paid, ledger.join(" "));
  // 5. provably fair: rotate, recompute every spin
  const rot = await A.api("casino/seed/rotate", {});
  let fair = 0;
  for (const s of spins) {
    const next = stream(rot.revealed.server_seed, rot.revealed.client_seed, s.nonce);
    if (s.game === "roulette") {
      // the segment, then the bet's next number: one more Shiny for the part of the slip's total
      const whole = Math.floor(s.want + 1e-9), part = Math.round((s.want - whole) * 1e6) / 1e6;
      if (Math.floor(next() * 29) === s.segment && s.payout === whole + (next() < part ? 1 : 0)) fair++;
    }
    else if ([0, 1, 2].map(() => Math.floor(next() * 32)).join() === s.stops.join()) fair++;
  }
  check("every spin recomputed from the revealed seed, client seed and nonce comes out the same", fair === spins.length, `${fair} of ${spins.length}`);
  // 6. the jackpot, two winners at once: seeds found that hit three King Wormzer on their next spin
  const findJackpot = (tag) => {
    const seed = createHash("sha256").update("jackpot-test-" + tag).digest("hex");
    for (let n = 0; ; n++) {
      const client = `${tag}${n}`;
      const next = stream(seed, client, 0);
      const stops = [0, 1, 2].map(() => Math.floor(next() * 32));
      if (stops.every((x, k) => strips[k][x] === "wormzer")) return { seed, client };
    }
  };
  const ja = findJackpot("a"), jb = findJackpot("b");
  for (const [u, j] of [[A, ja], [B, jb]]) sql(`UPDATE bym.casino_seed SET server_seed = '${j.seed}', server_seed_hash = '${createHash("sha256").update(j.seed).digest("hex")}', client_seed = '${j.client}', nonce = 0 WHERE user_id = ${u.uid}`);
  // (B may have no seed row yet)
  sql(`INSERT INTO bym.casino_seed (user_id, server_seed, server_seed_hash, client_seed, nonce) VALUES (${B.uid}, '${jb.seed}', '${createHash("sha256").update(jb.seed).digest("hex")}', '${jb.client}', 0) ON CONFLICT (user_id) DO UPDATE SET server_seed = EXCLUDED.server_seed, server_seed_hash = EXCLUDED.server_seed_hash, client_seed = EXCLUDED.client_seed, nonce = 0`);
  sql(`UPDATE bym.casino_jackpot SET pool = 10000 WHERE id = 1`);
  const cA = credits(A), cB = credits(B);
  const [wa, wb] = await Promise.all([A.api("casino/slots/spin", { request_id: rid(), bet: 100 }), B.api("casino/slots/spin", { request_id: rid(), bet: 100 })]);
  const wins = [wa.jackpot_won, wb.jackpot_won].sort((x, y) => y - x);
  check("two players hit the jackpot at the same moment: both three King Wormzer", wa.line === "jackpot" && wb.line === "jackpot", JSON.stringify([wa.symbols, wb.symbols, wa.error, wb.error]));
  const add = 100 * rate;
  check(`... the 10,000 pool is paid once (${10000 + add} with the first spin's ${add}), the other wins the reset pool (500 + ${add})`, wins[0] === 10000 + add && wins[1] === 500 + add, JSON.stringify(wins));
  check("... each balance moved by the bet and the win; the pool is back at 500", credits(A) === cA - 100 + wa.payout && credits(B) === cB - 100 + wb.payout && wa.payout === wa.jackpot_won && pool() === 500, `pool ${pool()}`);
  // a smaller bet wins its share
  const jc = findJackpot("c");
  sql(`UPDATE bym.casino_seed SET server_seed = '${jc.seed}', client_seed = '${jc.client}', nonce = 0 WHERE user_id = ${A.uid}`);
  sql(`UPDATE bym.casino_jackpot SET pool = 10000 WHERE id = 1`);
  const small = await A.api("casino/slots/spin", { request_id: rid(), bet: 10 });
  check("a 10 Shiny jackpot wins a tenth of the pool (1,000) and leaves the rest", small.line === "jackpot" && small.jackpot_won === 1000 && Math.abs(pool() - (9000 + 10 * rate)) < 1e-6 && small.pool === 9000, JSON.stringify({ won: small.jackpot_won, pool: pool() }));
  const st2 = await A.api("casino/state");
  check("casino/state shows the pool in whole Shiny", st2.jackpot === 9000, String(st2.jackpot));
  // a bigger bet wins the pool more than once over (the house pays what the pool lacks)
  const jd = findJackpot("d");
  sql(`UPDATE bym.casino_seed SET server_seed = '${jd.seed}', client_seed = '${jd.client}', nonce = 0 WHERE user_id = ${A.uid}`);
  sql(`UPDATE bym.casino_jackpot SET pool = 10000 WHERE id = 1`);
  const cBig = credits(A);
  const big = await A.api("casino/slots/spin", { request_id: rid(), bet: 250 });
  const wantBig = Math.floor((10000 + 250 * rate) * 2.5);
  check(`a 250 Shiny jackpot wins the pool two and a half times over (${wantBig}); the pool starts again at 500`, big.line === "jackpot" && big.jackpot_won === wantBig && credits(A) === cBig - 250 + big.payout && pool() === 500, JSON.stringify({ won: big.jackpot_won, pool: pool() }));
  // the pool stops at its most
  const max = st.rules.slots.jackpot_max;
  sql(`UPDATE bym.casino_jackpot SET pool = ${max - 1} WHERE id = 1`);
  for (let i = 0; i < 3; i++) { const s = await A.api("casino/slots/spin", { request_id: rid(), bet: 100 }); if (s.line === "jackpot") break; }
  const st3 = await A.api("casino/state");
  check(`the pool stops growing at its most (${max})`, typeof max === "number" && max > 1000 && (pool() === max || pool() === 500) && st3.jackpot <= max, `${pool()} ${st3.jackpot}`);
} finally {
  sql(`UPDATE bym.casino_jackpot SET pool = ${savedPool} WHERE id = 1`);
  [A, B].forEach((u, i) => {
    sql(`UPDATE bym.save SET credits = ${saved[i].credits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${u.uid} AND type = 'main'`);
    if (saved[i].seed) { const s = JSON.parse(saved[i].seed); sql(`UPDATE bym.casino_seed SET server_seed = '${s.server_seed}', server_seed_hash = '${s.server_seed_hash}', client_seed = '${s.client_seed}', nonce = ${s.nonce} WHERE user_id = ${u.uid}`); }
    else sql(`DELETE FROM bym.casino_seed WHERE user_id = ${u.uid}`);
  });
}
