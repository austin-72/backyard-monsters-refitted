/**
 * The Brimstone Pit's games played many times each through the real provably fair stream (HMAC, a new
 * nonce every round), checking what they return to players against the exact figure of their tables,
 * and that every card and path they make follows the rules.
 *
 *   bun scripts/casino-rtp.ts [rounds]      (default 1,000,000 a game)
 *
 * Prints one line per check, "ok" or "FAILED"; exits 1 on any failure.
 */
import { casinoConfig } from "../src/config/CasinoConfig.js";
import { fairStream, newServerSeed, wholeShiny } from "../src/services/casino/rng.js";
import { magmaDropRtp, playMagmaDrop } from "../src/services/casino/games/magmaDrop.js";
import { playScratch, scratchRtp } from "../src/services/casino/games/scratchers.js";
import { playRoulette, rouletteRtp, rouletteTargets, rouletteWheel } from "../src/services/casino/games/roulette.js";
import { FORTUNE_LINES, fortuneLines, fortuneRtp, fortuneWindow, playFortune, playSlots, slotsRtp } from "../src/services/casino/games/slots.js";
import { derbyRace, derbyRtp } from "../src/services/casino/games/derby.js";
import { ascentCrashFor, ascentFlightMs, ascentMultiplier } from "../src/services/casino/games/ascent.js";
import { bonePileLayout, bonePileMultiplier, bonePileRtp } from "../src/services/casino/games/bonePile.js";

const rounds = Number(process.argv[2] || 1_000_000);
let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
};
const pct = (x: number) => `${(x * 100).toFixed(3)}%`;
/** Every game returns just under 100%: at least this, and never 100% or more. */
const FLOOR = 0.99;
const under = (x: number) => x < 1 - 1e-12 && x >= FLOOR;
/**
 * How far a measured return may be from the exact one: 4 standard errors of the game's own spread over
 * this many rounds, and at least 0.5% (the spec's figure). A game with a rare big prize (a Scratchers
 * crown pays 100x one card in 2,000) spreads widely: 0.32% one standard error over a million cards.
 */
const tolerance = (payouts: number[], chances: number[]) => {
  const mean = payouts.reduce((a, x, i) => a + x * chances[i], 0);
  const sq = payouts.reduce((a, x, i) => a + x * x * chances[i], 0);
  return Math.max(0.005, 4 * Math.sqrt((sq - mean * mean) / rounds));
};
const binom = (n: number) => { const c = [1]; for (let k = 1; k <= n; k++) c.push((c[k - 1] * (n - k + 1)) / k); return c.map((x) => x / 2 ** n); };
const seed = newServerSeed();

// Magma Drop, each risk
const expected: Record<string, number> = { low: 1023.8 / 1024, medium: 1023.8 / 1024, high: 1023.8 / 1024 };
for (const risk of Object.keys(casinoConfig.magmaDrop.risks)) {
  const exact = magmaDropRtp(casinoConfig.magmaDrop, risk);
  let paid = 0;
  const slots = new Array(casinoConfig.magmaDrop.rows + 1).fill(0);
  let pathOk = true;
  for (let n = 0; n < rounds; n++) {
    const o = playMagmaDrop(casinoConfig.magmaDrop, fairStream(seed, `drop-${risk}`, n), risk);
    paid += o.multiplier;
    slots[o.slot]++;
    if (o.path.length !== casinoConfig.magmaDrop.rows || o.path.reduce((a, b) => a + b, 0) !== o.slot) pathOk = false;
  }
  const measured = paid / rounds;
  check(`Magma Drop ${risk}: the table returns ${pct(exact)} (${pct(expected[risk])}), under 100%`, Math.abs(exact - expected[risk]) < 0.0001 && under(exact));
  const tol = tolerance(casinoConfig.magmaDrop.risks[risk], binom(casinoConfig.magmaDrop.rows));
  check(`Magma Drop ${risk}: measured ${pct(measured)} over ${rounds} drops, within ${pct(tol)} of ${pct(exact)}`, Math.abs(measured - exact) < tol);
  check(`Magma Drop ${risk}: every path is 10 bounces ending in its cup`, pathOk);
  // the middle cup: C(10,5)/1024
  const mid = slots[5] / rounds;
  check(`Magma Drop ${risk}: the middle cup ${pct(mid)} of drops (should be ${pct(252 / 1024)})`, Math.abs(mid - 252 / 1024) < 0.004);
}

// Scratchers
{
  const prizes = casinoConfig.scratch.prizes;
  const exact = scratchRtp(prizes);
  let paid = 0;
  let wins = 0;
  let rulesOk = true;
  let near = 0;
  const bad: string[] = [];
  const byPrize: Record<string, number> = {};
  for (let n = 0; n < rounds; n++) {
    const o = playScratch(prizes, fairStream(seed, "scratch", n));
    paid += o.multiplier;
    const counts: Record<string, number> = {};
    for (const s of o.grid) counts[s] = (counts[s] ?? 0) + 1;
    const threes = Object.entries(counts).filter(([, c]) => c >= 3);
    if (o.grid.length !== 9 || o.grid.some((s) => !s)) rulesOk = false;
    if (o.prize) {
      wins++;
      byPrize[o.prize] = (byPrize[o.prize] ?? 0) + 1;
      if (threes.length !== 1 || threes[0][0] !== o.prize || threes[0][1] !== 3 || o.cells.length !== 3) {
        rulesOk = false;
        if (bad.length < 3) bad.push(JSON.stringify(o));
      }
    } else {
      if (threes.length) {
        rulesOk = false;
        if (bad.length < 3) bad.push(JSON.stringify(o));
      }
      if (Object.values(counts).filter((c) => c === 2).length >= 3) near++;
    }
  }
  const measured = paid / rounds;
  check(`Scratchers: the table returns ${pct(exact)} (99.990%), under 100%`, Math.abs(exact - 0.9999) < 0.00001 && under(exact));
  const tol = tolerance([...prizes.map((p) => p.pays), 0], [...prizes.map((p) => p.chance), 1 - prizes.reduce((a, p) => a + p.chance, 0)]);
  check(`Scratchers: measured ${pct(measured)} over ${rounds} cards, within ${pct(tol)} of ${pct(exact)}`, Math.abs(measured - exact) < tol);
  // each prize as often as its chance (within 4 standard errors)
  for (const p of prizes) {
    const got = (byPrize[p.symbol] ?? 0) / rounds;
    const se = Math.sqrt((p.chance * (1 - p.chance)) / rounds);
    check(`Scratchers: ${p.symbol} (${p.pays}x) on ${pct(got)} of cards (chance ${pct(p.chance)})`, Math.abs(got - p.chance) < 4 * se);
  }
  check(`Scratchers: ${pct(wins / rounds)} of cards win (33.940%)`, Math.abs(wins / rounds - 0.3394) < 0.003);
  check("Scratchers: every winning card has exactly three of its prize and no other three; no losing card has a three", rulesOk, bad.join(" | "));
  console.log(`(losing cards with three or more pairs: ${pct(near / Math.max(1, rounds - wins))}; the cells are drawn evenly, not arranged)`);
}

// Wormzer Roulette: the wheel, each bet's exact return, and a slip of every bet at once
{
  const rules = casinoConfig.roulette;
  const wheel = rouletteWheel(rules);
  const counts: Record<string, { lava: number; ash: number }> = {};
  let adjacent = false;
  wheel.forEach((seg, i) => {
    if (seg.monster === "wormzer") return;
    counts[seg.monster] ??= { lava: 0, ash: 0 };
    counts[seg.monster][seg.color as "lava" | "ash"]++;
    if (wheel[(i + 1) % wheel.length].monster === seg.monster) adjacent = true;
  });
  const colours = wheel.map((w) => w.color);
  check("Roulette: 29 segments, King Wormzer once, every monster on 2 Lava and 2 Ash, colours alternating",
    wheel.length === 29 && wheel.filter((w) => w.monster === "wormzer").length === 1 && rules.monsters.every((m) => counts[m].lava === 2 && counts[m].ash === 2) &&
    colours.slice(1).every((c, i) => i === 0 || c !== colours[i]) && !adjacent);
  const want = (on: string) => on === "wormzer" ? rules.pays.wormzer / 29 : on === "lava" || on === "ash" ? (14 * rules.pays.color) / 29 : (4 * rules.pays.monster) / 29;
  for (const on of ["spurtz", "lava", "wormzer"]) {
    const exact = rouletteRtp(rules, on);
    check(`Roulette: a bet on ${on} returns ${pct(exact)}, under 100%`, Math.abs(exact - want(on)) < 1e-9 && under(exact));
  }
  check("Roulette: every other bet returns the same as its kind, under 100%", rouletteTargets(rules).every((on) => Math.abs(rouletteRtp(rules, on) - want(on)) < 1e-9 && under(rouletteRtp(rules, on))));
  const slip = rouletteTargets(rules).map((on) => ({ on, amount: 1 }));
  const stake = slip.length;
  const slipRtp = slip.reduce((a, b) => a + rouletteRtp(rules, b.on), 0) / stake;
  let paid = 0;
  const seen = new Array(29).fill(0);
  let settleOk = true;
  for (let n = 0; n < rounds; n++) {
    const rng = fairStream(seed, "roulette", n);
    const o = playRoulette(rules, rng, slip);
    paid += wholeShiny(o.payout, rng.next());
    seen[o.outcome.segment]++;
    // exactly three places win on a monster segment (the monster, its colour), one on King Wormzer
    const winners = o.outcome.results.filter((r) => r.won).length;
    if (winners !== (o.outcome.monster === "wormzer" ? 1 : 2)) settleOk = false;
  }
  const measured = paid / rounds / stake;
  check(`Roulette: a slip of 1 Shiny on all ten places, paid in whole Shiny: measured ${pct(measured)} over ${rounds} spins (exact ${pct(slipRtp)})`, Math.abs(measured - slipRtp) < 0.005);
  check("Roulette: every segment comes up about as often (1 in 29)", seen.every((c) => Math.abs(c / rounds - 1 / 29) < 4 * Math.sqrt((1 / 29) * (28 / 29) / rounds)), seen.join(" "));
  check("Roulette: every slip settled on the segment drawn", settleOk);
}

// Magma Slots
{
  const rules = casinoConfig.slots;
  const weights = { wormzer: 1, balthazar: 2, grokus: 3, valgos: 4, zagnoid: 5, malphus: 6, spurtz: 11 } as Record<string, number>;
  const stripsOk = rules.strips.every((st) => st.length === 32 && Object.entries(weights).every(([k, w]) => st.filter((x) => x === k).length === w));
  check("Slots: each reel has 32 stops with the spec's weights", stripsOk);
  const exact = slotsRtp(rules);
  check(`Slots: without the jackpot the machine returns ${pct(exact.rtp)} (32,104 / 32,768)`, Math.abs(exact.rtp - 32104 / 32768) < 1e-9);
  // a spin's jackpot is worth pool x stake / full bet x its chance: pool / (32,768 x full bet) of the
  // stake, the most with the pool at jackpotMax
  const most = exact.rtp + (casinoConfig.jackpotMax * exact.jackpot) / rules.jackpotFullBet;
  check(`Slots: a spin returns at most ${pct(most)} (${pct(exact.rtp)} + the jackpot at its most, ${casinoConfig.jackpotMax}), under 100%`, under(most));
  check(`Slots: the jackpot comes once in ${Math.round(1 / exact.jackpot)} spins (spec 32,768)`, Math.abs(1 / exact.jackpot - 32768) < 0.5);
  let paid = 0;
  let jackpots = 0;
  let two = 0;
  const reelCounts = rules.strips.map(() => new Array(32).fill(0));
  const pays = Object.values(rules.pays);
  for (let n = 0; n < rounds; n++) {
    const o = playSlots(rules, fairStream(seed, "slots", n));
    paid += o.multiplier;
    if (o.line === "jackpot") jackpots++;
    if (o.line === "two_spurtz") two++;
    o.stops.forEach((s, r) => reelCounts[r][s]++);
  }
  const p3 = (w: number) => (w / 32) ** 3;
  const tol = tolerance([...pays, rules.twoSpurtz, 0], [...Object.keys(rules.pays).map((k) => p3(weights[k])), 3 * (11 / 32) ** 2 * (21 / 32), 0]);
  check(`Slots: measured ${pct(paid / rounds)} over ${rounds} spins, within ${pct(tol)} of ${pct(exact.rtp)}`, Math.abs(paid / rounds - exact.rtp) < tol);
  check(`Slots: exactly two Spurtz on ${pct(two / rounds)} of spins (spec 23.26%)`, Math.abs(two / rounds - 0.2326) < 0.003);
  check(`Slots: ${jackpots} jackpots in ${rounds} spins (about ${(rounds / 32768).toFixed(1)} expected)`, Math.abs(jackpots - rounds / 32768) < 5 * Math.sqrt(rounds / 32768) + 1);
  check("Slots: every stop of every reel about as likely", reelCounts.every((c) => c.every((x) => Math.abs(x / rounds - 1 / 32) < 4 * Math.sqrt((1 / 32) * (31 / 32) / rounds))));
  // the jackpot pool: 2% of every spin in, paid in full from the full bet (a simulation of the pool
  // with bets of 1 to 500 Shiny, each spin's share won when it hits)
  let pool = casinoConfig.jackpotSeed, stakes = 0, won = 0, made = 0;
  const r = fairStream(seed, "pool", 0);
  const N = 5_000_000;
  for (let i = 0; i < N; i++) {
    const bet = [1, 5, 10, 25, 50, 100, 250, 500][r.int(8)];
    stakes += bet;
    pool = Math.min(casinoConfig.jackpotMax, pool + bet * rules.jackpotRate);
    if (r.int(32768) === 0) {
      const share = bet / rules.jackpotFullBet;
      const w = Math.floor(pool * share);
      won += w;
      pool -= w;
      if (pool < casinoConfig.jackpotSeed) { made += casinoConfig.jackpotSeed - pool; pool = casinoConfig.jackpotSeed; }
    }
  }
  console.log(`(the pool, simulated over ${N} spins of 1 to 500 Shiny: ${pct(won / stakes)} of stakes won from it, ${Math.round(pool)} left, ${Math.round(made)} Shiny made new by resets)`);
  check(`Slots: the pool, filled by ${pct(rules.jackpotRate)} of stakes up to ${casinoConfig.jackpotMax}, pays back more than 1% of stakes (${pct(won / stakes)}; the machine ${pct(exact.rtp + won / stakes)} in all, under 100%)`, won / stakes > 0.01 && under(exact.rtp + won / stakes));
}

// Korath's Fortune: the same strips and pays on five lines, each a fifth of the stake
{
  const rules = casinoConfig.slots;
  const lines = FORTUNE_LINES.length;
  const exact = fortuneRtp(rules);
  check(`Fortune: without the jackpot the machine returns ${pct(exact.rtp)}, the same as one Magma Slots line (32,104 / 32,768)`, Math.abs(exact.rtp - 32104 / 32768) < 1e-9);
  check(`Fortune: a jackpot line once in ${Math.round(1 / exact.jackpot)} spins (5 lines, 1 in 6,553.6)`, Math.abs(exact.jackpot - lines / 32768) < 1e-12);
  // a jackpot line wins pool x (stake / lines) / full bet: the same part of the pool per Shiny as the Magma Slots
  const most = exact.rtp + (casinoConfig.jackpotMax * exact.jackpot) / lines / rules.jackpotFullBet;
  check(`Fortune: a spin returns at most ${pct(most)} (the jackpot at its most, ${casinoConfig.jackpotMax}), under 100%`, under(most));
  let paid = 0;
  let jackpots = 0;
  let twoJackpots = 0;
  for (let n = 0; n < rounds; n++) {
    const o = playFortune(rules, fairStream(seed, "fortune", n));
    paid += o.multiplier;
    const j = o.wins.filter((w) => w.kind === "jackpot").length;
    if (j) jackpots++;
    if (j > 1) twoJackpots++;
  }
  // the spread of one spin's pay, exactly, over every set of stops
  let sq = 0;
  for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) for (let z = 0; z < 32; z++) sq += fortuneLines(rules, fortuneWindow(rules, [x, y, z])).multiplier ** 2;
  const tol = Math.max(0.005, 4 * Math.sqrt((sq / 32768 - exact.rtp ** 2) / rounds));
  check(`Fortune: measured ${pct(paid / rounds)} over ${rounds} spins, within ${pct(tol)} of ${pct(exact.rtp)}`, Math.abs(paid / rounds - exact.rtp) < tol);
  check(`Fortune: ${jackpots} jackpot spins in ${rounds} (about ${(rounds * exact.jackpot).toFixed(1)} expected), never two lines at once`, twoJackpots === 0 && Math.abs(jackpots - rounds * exact.jackpot) < 5 * Math.sqrt(rounds * exact.jackpot) + 1);
}

// Bone Pile
{
  const rules = casinoConfig.bonePile;
  const cap = casinoConfig.maxMultiplier;
  // rtp over the chance of k safe piles, C(25 - m, k) / C(25, k), rounded down to 2 decimals
  const C = (n: number, k: number) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
  const table = [1, 3, 5, 10].map((m) => [1, 3, 5, 7].map((k) => Math.floor(rules.rtp * (C(25, k) / C(25 - m, k)) * 100 + 1e-7) / 100));
  const got = [1, 3, 5, 10].map((m) => [1, 3, 5, 7].map((k) => bonePileMultiplier(rules, k, m, cap)));
  check(`Bone Pile: the multipliers are rtp / the chance, rounded down (1, 3, 5, 10 Sabnox after 1, 3, 5, 7 piles: ${JSON.stringify(got)})`,
    JSON.stringify(got) === JSON.stringify(table) && got[0][0] === 1.04 && got[3][3] === 74.69);
  let lo = 1, hi = 0, capped = 0;
  for (let m = rules.minSabnox; m <= rules.maxSabnox; m++) {
    for (let k = 1; k <= rules.piles - m; k++) {
      const r = bonePileRtp(rules, k, m, cap);
      if (bonePileMultiplier(rules, k, m, Infinity) > cap) { capped++; continue; }
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
  }
  check(`Bone Pile: every stopping point returns ${pct(rules.rtp)} or a little less for the rounding (${pct(lo)} to ${pct(hi)}; ${capped} points past the 1000x cap pay less), under 100%`, hi <= rules.rtp + 1e-12 && under(hi) && under(lo));
  // the layout: m different piles, every pile as likely to hide one
  const hits = new Array(rules.piles).fill(0);
  let layoutOk = true;
  const N = 200_000;
  for (let n = 0; n < N; n++) {
    const m = 1 + (n % 20);
    const l = bonePileLayout(rules, fairStream(seed, "bonepile", n), m);
    if (new Set(l).size !== m || l.some((t) => t < 0 || t >= rules.piles)) layoutOk = false;
    for (const t of l) hits[t]++;
  }
  const mean = hits.reduce((a, b) => a + b, 0) / rules.piles;
  check("Bone Pile: every layout has that many different piles", layoutOk);
  check("Bone Pile: every pile as likely to hide a Sabnox", hits.every((h) => Math.abs(h / mean - 1) < 0.02), hits.join(" "));
  // played: 3 Sabnox, stopping after 4 piles (C(25,4) / C(22,4))
  let paid = 0, paidWhole = 0;
  for (let n = 0; n < rounds; n++) {
    const l = bonePileLayout(rules, fairStream(seed, "bp-play", n), 3);
    // the player opens piles 0, 1, 2, 3 in turn
    if (![0, 1, 2, 3].some((t) => l.includes(t))) paid += bonePileMultiplier(rules, 4, 3, cap);
    // (a 1 Shiny game paid in whole Shiny: its part by chance)
    if (![0, 1, 2, 3].some((t) => l.includes(t))) paidWhole += wholeShiny(bonePileMultiplier(rules, 4, 3, cap), fairStream(seed, "bp-play", n + rounds).next());
  }
  const exact = bonePileRtp(rules, 4, 3, cap);
  check(`Bone Pile: 3 Sabnox, cashing out after 4 piles: measured ${pct(paid / rounds)} over ${rounds} games (exact ${pct(exact)})`, Math.abs(paid / rounds - exact) < 0.005);
  check(`Bone Pile: the same with 1 Shiny, paid in whole Shiny: measured ${pct(paidWhole / rounds)} (exact ${pct(exact)})`, Math.abs(paidWhole / rounds - exact) < 0.006);
}

// Balthazar's Ascent
{
  const rules = casinoConfig.ascent;
  const m = [10_000, 20_000, 60_000].map((t) => ascentMultiplier(rules, t));
  check(`Ascent: the multiplier is 1.82x at 10 s, 3.32x at 20 s, 36.59x at 60 s (the spec's "36.6") (${m.join(", ")})`, m[0] === 1.82 && m[1] === 3.32 && m[2] === 36.59);
  let flightOk = true;
  for (const c of [1.01, 1.5, 2, 3.33, 10, 99.99, 1000]) {
    const t = ascentFlightMs(rules, c);
    if (!(ascentMultiplier(rules, t) >= c && ascentMultiplier(rules, t - 1) < c)) flightOk = false;
  }
  check("Ascent: a flight lasts until the multiplier first reaches the crash point", flightOk);
  const targets = [1.01, 1.5, 2, 5, 10, 50, 100];
  const won = targets.map(() => 0);
  let instant = 0;
  for (let n = 0; n < rounds; n++) {
    const c = ascentCrashFor(rules, fairStream(seed, "ascent-sim", n).next());
    if (c === 1) instant++;
    targets.forEach((t, i) => { if (c >= t) won[i]++; });
  }
  targets.forEach((t, i) => {
    const rtp = (won[i] / rounds) * t;
    const tol = Math.max(0.005, 4 * t * Math.sqrt((rules.rtp / t) * (1 - rules.rtp / t) / rounds));
    check(`Ascent: cashing out at ${t}x returns ${pct(rtp)} over ${rounds} rounds (${pct(rules.rtp)}, within ${pct(tol)})`, Math.abs(rtp - rules.rtp) < tol);
  });
  // (under 1.00 made 1.00, and 1.00 itself, rounded down from under 1.01)
  check(`Ascent: every cash-out target returns ${pct(rules.rtp)} exactly (the chance of reaching x is rtp / x), under 100%`, under(rules.rtp));
  check(`Ascent: shot down at once (1.00x) in ${pct(instant / rounds)} of rounds (1 - rtp / 1.01 = ${pct(1 - rules.rtp / 1.01)})`, Math.abs(instant / rounds - (1 - rules.rtp / 1.01)) < 0.002);
  // a cash-out's part of a Shiny paid by chance: 1 Shiny at 1.5x, a million times, pays 1.5 on average
  let part = 0;
  for (let n = 0; n < rounds; n++) part += wholeShiny(1.5, fairStream(seed, `pay:${n}`, 0).next());
  check(`Ascent and Derby: a win of 1.5 Shiny pays 1 or 2, ${pct(part / rounds / 1.5)} of 1.5 on average`, Math.abs(part / rounds - 1.5) < 0.004);
}

// Magma Derby
{
  const rules = casinoConfig.derby;
  const N = Math.min(rounds, 300_000);
  let paid = 0, staked = 0, maxRtp = 0, minRtp = 1, raceOk = true, sumRtp = 0, sq = 0;
  // winners against their chances, runners grouped by chance (0-5%, 5-10%, ...)
  const bins = Array.from({ length: 12 }, () => ({ wins: 0, chance: 0, v: 0, n: 0 }));
  const firsts: Record<string, number> = {};
  for (let n = 0; n < N; n++) {
    const race = derbyRace(rules, `${seed}-derby-${n}`);
    const rtps = derbyRtp(race);
    maxRtp = Math.max(maxRtp, ...rtps);
    minRtp = Math.min(minRtp, ...rtps);
    sumRtp += rtps.reduce((a, b) => a + b, 0);
    const winner = race.order[0];
    for (const r of race.runners) {
      staked += 1;
      if (r.id === winner) { paid += r.odds; sq += r.odds * r.odds; }
      const bin = bins[Math.min(11, Math.floor(r.chance * 20))];
      bin.wins += r.id === winner ? 1 : 0;
      bin.chance += r.chance;
      bin.v += r.chance * (1 - r.chance);
      bin.n++;
    }
    firsts[winner] = (firsts[winner] ?? 0) + 1;
    // the race's times end in the order drawn, and go forward
    const fin = race.order.map((id) => race.splits[id].times[rules.checkpoints - 1]);
    if (new Set(race.order).size !== rules.runners || race.runners.length !== rules.runners || fin.some((t, i) => i > 0 && t <= fin[i - 1]) || fin[fin.length - 1] >= rules.raceSeconds * 1000 ||
      race.order.some((id) => race.splits[id].times.some((t, k, a) => k > 0 && t <= a[k - 1])) || race.runners.some((r) => r.strength < rules.minStrength || r.strength > rules.maxStrength || r.odds < rules.minOdds)) raceOk = false;
  }
  check(`Derby: every runner returns at most ${pct(rules.rtp)} (from ${pct(minRtp)} to ${pct(maxRtp)}), under 100%`, maxRtp <= rules.rtp + 1e-12 && under(maxRtp) && under(minRtp));
  const tolD = (4 * Math.sqrt((sq / N - (paid / N) ** 2) / N)) / rules.runners;
  check(`Derby: a bet on every runner of ${N} races returned ${pct(paid / staked)} (exact ${pct(sumRtp / staked)}, within ${pct(tolD)})`, Math.abs(paid / staked - sumRtp / staked) < tolD);
  const zs = bins.filter((b) => b.n > 1000).map((b) => (b.wins - b.chance) / Math.sqrt(b.v));
  check(`Derby: runners win as often as their chances say, grouped by chance (at most ${Math.max(...zs.map(Math.abs)).toFixed(2)} standard errors off)`, zs.every((z) => Math.abs(z) < 4), bins.filter((b) => b.n > 1000).map((b) => `${(b.chance / b.n * 100).toFixed(1)}%:${(b.wins / b.n * 100).toFixed(1)}%`).join(" "));
  check("Derby: six different runners; strengths 1 to 6; finishing times in the order drawn, within the race; every runner's times go forward", raceOk);
  check("Derby: every monster wins races", Object.keys(firsts).length === rules.monsters.length, JSON.stringify(firsts));
}

// The stream: the same seed, client seed and nonce give the same numbers; its numbers are even
{
  const a = fairStream(seed, "x", 7), b = fairStream(seed, "x", 7);
  let same = true;
  for (let i = 0; i < 50; i++) if (a.next() !== b.next()) same = false;
  check("the stream is the same for the same seeds and nonce", same);
  const s = fairStream(seed, "even", 0);
  const buckets = new Array(10).fill(0);
  const N = 200_000;
  for (let i = 0; i < N; i++) buckets[Math.floor(s.next() * 10)]++;
  check("the stream's numbers are spread evenly", buckets.every((c) => Math.abs(c / N - 0.1) < 0.005), buckets.join(" "));
}

console.log(failed ? `${failed} check(s) FAILED` : "all ok");
process.exit(failed ? 1 : 0);
