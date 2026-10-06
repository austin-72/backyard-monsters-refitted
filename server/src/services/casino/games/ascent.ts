import { fairStream } from "../rng.js";

export interface AscentRules {
  growth: number;
  rtp: number;
  maxCrash: number;
}

/** The multiplier `ms` into the flight: floor(100 x e^(growth x ms)) / 100, from 1.00. */
export const ascentMultiplier = (rules: AscentRules, ms: number): number => Math.max(1, Math.floor(100 * Math.exp(rules.growth * Math.max(0, ms)) + 1e-9) / 100);

/** The crash point for a number u in [0, 1): floor(100 x rtp / (1 - u)) / 100, from 1.00 to maxCrash. */
export const ascentCrashFor = (rules: AscentRules, u: number): number => {
  const c = Math.floor((100 * rules.rtp) / (1 - u) + 1e-9) / 100;
  return Math.min(rules.maxCrash, Math.max(1, c));
};

/** A round's crash point, from its seed (HMAC-SHA256(seed, "ascent:0:0"), the first four bytes). */
export const ascentCrash = (rules: AscentRules, seed: string): number => ascentCrashFor(rules, fairStream(seed, "ascent", 0).next());

/** How long the flight lasts: the first millisecond at which the multiplier reaches the crash point. */
export const ascentFlightMs = (rules: AscentRules, crash: number): number => {
  if (crash <= 1) return 0;
  let t = Math.max(0, Math.floor(Math.log(crash) / rules.growth) - 2);
  while (ascentMultiplier(rules, t) < crash) t++;
  return t;
};
