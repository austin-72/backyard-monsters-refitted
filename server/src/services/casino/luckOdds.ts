import { casinoConfig } from "../../config/CasinoConfig.js";
import type { MagmaDropRules } from "./games/magmaDrop.js";
import type { ScratchPrize } from "./games/scratchers.js";
import { roulettePays, rouletteWheel, type RouletteBet, type RouletteRules } from "./games/roulette.js";
import { fortuneLines, fortuneWindow, slotsLine, type SlotsRules } from "./games/slots.js";

/**
 * Inferno-only (8 October): each instant game's chances of a win (paying back more than the stake) and of a loss
 * (less), without luck, exactly, from its rules: what luck needs to raise the chance of winning by exactly its
 * percentage (luck.ts `luckBoost`). A result paying the stake back exactly is neither. A jackpot is a win.
 */
export interface Odds {
  win: number;
  lose: number;
}

const tally = (results: [number, number, boolean?][]): Odds => {
  let win = 0;
  let lose = 0;
  for (const [chance, multiplier, jackpot] of results) {
    if (jackpot || multiplier > 1 + 1e-9) win += chance;
    else if (multiplier < 1 - 1e-9) lose += chance;
  }
  return { win, lose };
};

/** Magma Drop: cup k with the chance C(rows, k) / 2^rows. */
export const magmaDropOdds = (rules: MagmaDropRules, risk: string): Odds => {
  const table = rules.risks[risk];
  const n = rules.rows;
  const out: [number, number][] = [];
  let c = 1;
  for (let k = 0; k <= n; k++) {
    out.push([c / 2 ** n, table[k]]);
    c = (c * (n - k)) / (k + 1);
  }
  return tally(out);
};

/** Scratchers: each prize's chance; the rest of the cards lose. */
export const scratchOdds = (prizes: ScratchPrize[]): Odds => {
  const won = prizes.reduce((a, p) => a + p.chance, 0);
  return tally([...prizes.map((p) => [p.chance, p.pays] as [number, number]), [1 - won, 0]]);
};

/** Roulette: the slip's total on each segment, each as likely. */
export const rouletteOdds = (rules: RouletteRules, bets: RouletteBet[], stake: number): Odds => {
  const wheel = rouletteWheel(rules);
  return tally(wheel.map((seg) => [1 / wheel.length, bets.reduce((a, b) => a + b.amount * roulettePays(rules, b.on, seg), 0) / stake] as [number, number]));
};

const cache = new Map<string, Odds>();

/** Magma Slots (and Moloch's Favor): every set of stops. */
export const slotsOdds = (rules: SlotsRules = casinoConfig.slots): Odds => {
  const key = `slots:${JSON.stringify(rules.strips)}:${JSON.stringify(rules.pays)}:${rules.twoSpurtz}`;
  let o = cache.get(key);
  if (!o) {
    const [a, b, c] = rules.strips;
    const n = a.length * b.length * c.length;
    const out: [number, number, boolean][] = [];
    for (const x of a) for (const y of b) for (const z of c) {
      const l = slotsLine(rules, [x, y, z]);
      out.push([1 / n, l.multiplier, l.line === "jackpot"]);
    }
    o = tally(out);
    cache.set(key, o);
  }
  return o;
};

/** Korath's Fortune: every set of stops, the five lines together. */
export const fortuneOdds = (rules: SlotsRules = casinoConfig.slots): Odds => {
  const key = `fortune:${JSON.stringify(rules.strips)}:${JSON.stringify(rules.pays)}:${rules.twoSpurtz}`;
  let o = cache.get(key);
  if (!o) {
    const [a, b, c] = rules.strips;
    const n = a.length * b.length * c.length;
    const out: [number, number, boolean][] = [];
    for (let x = 0; x < a.length; x++) for (let y = 0; y < b.length; y++) for (let z = 0; z < c.length; z++) {
      const l = fortuneLines(rules, fortuneWindow(rules, [x, y, z]));
      out.push([1 / n, l.multiplier, l.line === "jackpot"]);
    }
    o = tally(out);
    cache.set(key, o);
  }
  return o;
};
