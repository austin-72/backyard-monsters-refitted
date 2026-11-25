import { fairStream } from "../rng.js";

export interface DiceRules {
  rtp: number;
  maxRolls: number;
}

/** A bone shows 1 to 5 pips, or the Devil (6). */
export const DEVIL = 6;

/** The chance of one safe throw (no Devil on either bone). */
export const SAFE = 25 / 36;

/** A round's throws, from its seed (HMAC-SHA256(seed, "dice:0:<block>"), two numbers a throw). */
export const diceRolls = (seed: string, max: number): number[][] => {
  const rng = fairStream(seed, "dice", 0);
  const out: number[][] = [];
  for (let k = 0; k < max; k++) out.push([1 + rng.int(6), 1 + rng.int(6)]);
  return out;
};

/** The throw (1 to max) the Devil comes on, or 0 if he doesn't. */
export const devilAt = (rolls: number[][]): number => {
  const i = rolls.findIndex(([a, b]) => a === DEVIL || b === DEVIL);
  return i < 0 ? 0 : i + 1;
};

/** The multiplier after k safe throws: floor(100 x rtp / SAFE^k) / 100 (1 before any throw), held to `cap`. */
export const diceMultiplier = (rules: DiceRules, k: number, cap = 1000): number => {
  if (k <= 0) return 1;
  return Math.min(cap, Math.floor((100 * rules.rtp) / Math.pow(SAFE, k) + 1e-9) / 100);
};

/** What banking after k safe throws returns, on average (the chance of getting there times the multiplier). */
export const diceRtp = (rules: DiceRules, k: number, cap = 1000) => Math.pow(SAFE, k) * diceMultiplier(rules, k, cap);
