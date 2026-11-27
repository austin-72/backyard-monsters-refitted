import { casinoConfig } from "../../config/CasinoConfig.js";
import { fortuneOdds, magmaDropOdds, scratchOdds, slotsOdds } from "./luckOdds.js";
import { rouletteWheel } from "./games/roulette.js";

/**
 * Inferno-only (27 November, 72's suggestion: "Give an info button that publishes the odds for each game, a small (i)
 * in the top left of each game"): every Pit game's odds, worked out from the same rules the games are played by
 * (config/CasinoConfig.ts), so they can't drift from what is paid. Sent with casino/state (`odds`); the game draws
 * it in its (i) window (CasinoWindow.ioOdds), in the player's language: each row is a key (io_t3c_odds_<k>) with its
 * values, what it pays (times the bet, the bet included) and its chance. The odds without luck: luck only ever
 * redraws a loss (luck.ts), and the Fairness tab says so.
 */
export interface OddsRow {
  /** The row's words: io_t3c_odds_<k>. */
  k: string;
  /** Its values (a symbol, a number, a risk...). */
  a?: Record<string, string | number>;
  /** Pays this many times the bet (the bet included), or [least, most]; null: shown without. */
  pays: number | [number, number] | null;
  /** Its chance (0 to 1), or null. */
  chance: number | null;
}

export interface OddsSheet {
  /** What it pays back of everything bet, over time: [least, most] (the same twice when one number). */
  rtp: [number, number];
  /** The chance a play pays back more than its bet, or null (it depends on how it's played). */
  win: number | null;
  rows: OddsRow[];
}

const down2 = (x: number) => Math.floor(x * 100 + 1e-9) / 100;
const choose = (n: number, k: number) => {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
};

const magmaDropSheet = (): OddsSheet => {
  const r = casinoConfig.magmaDrop;
  const rows: OddsRow[] = [];
  const rtps: number[] = [];
  for (const risk of Object.keys(r.risks)) {
    const table = r.risks[risk];
    let rtp = 0;
    for (let k = 0; k <= r.rows; k++) rtp += (choose(r.rows, k) / 2 ** r.rows) * table[k];
    rtps.push(rtp);
    rows.push({ k: "risk", a: { risk }, pays: [Math.min(...table), Math.max(...table)], chance: magmaDropOdds(r, risk).win });
  }
  return { rtp: [Math.min(...rtps), Math.max(...rtps)], win: null, rows };
};

const scratchSheet = (): OddsSheet => {
  const p = casinoConfig.scratch.prizes;
  const rtp = p.reduce((a, x) => a + x.chance * x.pays, 0);
  return { rtp: [rtp, rtp], win: scratchOdds(p).win, rows: p.map((x) => ({ k: "three", a: { sym: x.symbol }, pays: x.pays, chance: x.chance })) };
};

const hiloSheet = (): OddsSheet => {
  const rtp = casinoConfig.hilo.rtp;
  // (higher or the same on rank r, 1 Ace to 13 King: (14 - r) / 13; the lower guesses mirror them)
  const rows: OddsRow[] = [3, 5, 7, 9, 11, 13].map((r) => {
    const chance = (14 - r) / 13;
    return { k: "guess", a: { card: r }, pays: Math.min(casinoConfig.maxMultiplier, down2(rtp / chance)), chance };
  });
  return { rtp: [0.992, rtp], win: null, rows };
};

const rouletteSheet = (): OddsSheet => {
  const r = casinoConfig.roulette;
  const wheel = rouletteWheel(r);
  const n = wheel.length;
  const monster = wheel.filter((s) => s.monster === r.monsters[0]).length / n;
  const color = wheel.filter((s) => s.color === "lava").length / n;
  const wormzer = wheel.filter((s) => s.monster === "wormzer").length / n;
  const rows: OddsRow[] = [
    { k: "rl_monster", pays: r.pays.monster, chance: monster },
    { k: "rl_color", pays: r.pays.color, chance: color },
    { k: "rl_wormzer", pays: r.pays.wormzer, chance: wormzer },
  ];
  const rtps = rows.map((x) => (x.pays as number) * (x.chance as number));
  return { rtp: [Math.min(...rtps), Math.max(...rtps)], win: null, rows };
};

const bonePileSheet = (): OddsSheet => {
  const b = casinoConfig.bonePile;
  const rows: OddsRow[] = [1, 3, 5, 10, 15, 20]
    .filter((m) => m >= b.minSabnox && m <= b.maxSabnox)
    .map((m) => ({ k: "bp_sabnox", a: { n: m }, pays: Math.min(casinoConfig.maxMultiplier, down2((b.rtp * choose(b.piles, 1)) / choose(b.piles - m, 1))), chance: (b.piles - m) / b.piles }));
  return { rtp: [0.992, b.rtp], win: null, rows };
};

const blackjackSheet = (): OddsSheet => {
  const bj = casinoConfig.blackjack;
  // (a blackjack: an Ace and a ten-card, from a shoe of `decks` decks)
  const cards = 52 * bj.decks;
  const natural = 2 * ((4 * bj.decks) / cards) * ((16 * bj.decks) / (cards - 1));
  return {
    rtp: [0.996, 0.996],
    win: null,
    rows: [
      { k: "bj_blackjack", pays: 1 + bj.blackjackPays, chance: natural },
      { k: "bj_win", pays: 2, chance: null },
      { k: "bj_push", pays: 1, chance: null },
    ],
  };
};

/** Magma Slots, and Korath's Fortune (the same strips and pays on five lines, each a fifth of the bet). */
const slotsSheet = (fortune: boolean): OddsSheet => {
  const s = casinoConfig.slots;
  const [a, b, c] = s.strips;
  const count = (strip: string[], sym: string) => strip.filter((x) => x === sym).length / strip.length;
  const three = (sym: string) => count(a, sym) * count(b, sym) * count(c, sym);
  // exactly two Spurtz on the line
  const p = [a, b, c].map((st) => count(st, "spurtz"));
  const two = p[0] * p[1] * (1 - p[2]) + p[0] * (1 - p[1]) * p[2] + (1 - p[0]) * p[1] * p[2];
  const syms = Object.keys(s.pays).sort((x, y) => s.pays[y] - s.pays[x]);
  const base = syms.reduce((acc, sym) => acc + three(sym) * s.pays[sym], 0) + two * s.twoSpurtz;
  const jp = three("wormzer");
  const share = (pool: number) => (jp * pool) / s.jackpotFullBet;
  const lineK = fortune ? "three_line" : "three";
  const rows: OddsRow[] = [
    { k: fortune ? "jackpot_line" : "jackpot", a: { sym: "wormzer" }, pays: null, chance: jp },
    ...syms.map((sym) => ({ k: lineK, a: { sym }, pays: s.pays[sym], chance: three(sym) })),
    { k: fortune ? "two_spurtz_line" : "two_spurtz", a: { sym: "spurtz" }, pays: s.twoSpurtz, chance: two },
  ];
  return { rtp: [base + share(casinoConfig.jackpotSeed), base + share(casinoConfig.jackpotMax)], win: fortune ? fortuneOdds().win : slotsOdds().win, rows };
};

const diceSheet = (): OddsSheet => {
  const d = casinoConfig.dice;
  const safe = 25 / 36;
  const rows: OddsRow[] = [1, 2, 3, 4, 6, 8, 10, 12].filter((k) => k <= d.maxRolls).map((k) => ({ k: k === 1 ? "dice_throw1" : "dice_throws", a: { n: k }, pays: down2(d.rtp / safe ** k), chance: safe ** k }));
  return { rtp: [0.9931, d.rtp], win: null, rows };
};

const dealSheet = (): OddsSheet => {
  const d = casinoConfig.deal;
  const avg = d.prizes.reduce((a, x) => a + x, 0) / d.prizes.length;
  const rows: OddsRow[] = [...d.prizes].reverse().map((x) => ({ k: "deal_prize", a: { x }, pays: x, chance: 1 / d.prizes.length }));
  return { rtp: [avg, avg], win: d.prizes.filter((x) => x > 1).length / d.prizes.length, rows };
};

const ascentSheet = (): OddsSheet => {
  const a = casinoConfig.ascent;
  const rows: OddsRow[] = [
    { k: "asc_instant", pays: 1, chance: 1 - a.rtp / 1.01 },
    ...[1.5, 2, 3, 5, 10, 100, a.maxCrash].map((x) => ({ k: "asc_reach", a: { x }, pays: x, chance: Math.min(1, a.rtp / x) })),
  ];
  return { rtp: [a.rtp, a.rtp], win: null, rows };
};

const derbySheet = (): OddsSheet => {
  const d = casinoConfig.derby;
  const rows: OddsRow[] = [0.5, 1 / 3, 0.25, 1 / 6, 0.1, 0.05].map((c) => ({ k: "derby_odds", a: { pct: Math.round(c * 1000) / 10 }, pays: Math.max(d.minOdds, down2(d.rtp / c)), chance: c }));
  return { rtp: [0.995, d.rtp], win: null, rows };
};

let cached: { at: number; sheets: Record<string, OddsSheet> } | null = null;

/** Every game's odds (worked out once a minute: the rules change only with a restart, the jackpot's share with the pool's limits). */
export const oddsSheets = (): Record<string, OddsSheet> => {
  if (cached && Date.now() - cached.at < 60_000) return cached.sheets;
  const sheets: Record<string, OddsSheet> = {
    magmadrop: magmaDropSheet(),
    scratch: scratchSheet(),
    hilo: hiloSheet(),
    roulette: rouletteSheet(),
    bonepile: bonePileSheet(),
    blackjack: blackjackSheet(),
    slots: slotsSheet(false),
    dice: diceSheet(),
    deal: dealSheet(),
    ascent: ascentSheet(),
    derby: derbySheet(),
    fortune: slotsSheet(true),
  };
  cached = { at: Date.now(), sheets };
  return sheets;
};
