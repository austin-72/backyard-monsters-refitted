import type { FairStream } from "../rng.js";

export interface BonePileRules {
  piles: number;
  minSabnox: number;
  maxSabnox: number;
  rtp: number;
}

/**
 * The multiplier after `k` safe piles with `m` Sabnox among `piles`: rtp x C(n, k) / C(n - m, k), rounded
 * down to 2 decimals, held to `cap`. (C(n, k) / C(n - m, k) is one over the chance of k safe piles in a
 * row, so every stopping point returns rtp, a little less for the rounding.)
 */
export const bonePileMultiplier = (rules: BonePileRules, k: number, m: number, cap: number): number => {
  if (k <= 0) return 0;
  let ratio = 1;
  for (let i = 0; i < k; i++) ratio *= (rules.piles - i) / (rules.piles - m - i);
  const mult = Math.floor(rules.rtp * ratio * 100 + 1e-7) / 100;
  return Math.min(mult, cap);
};

/** The chance that the next pile is safe after k safe piles with m Sabnox. */
export const bonePileSafeChance = (rules: BonePileRules, k: number, m: number): number => (rules.piles - m - k) / (rules.piles - k);

/**
 * Where the Sabnox hide: the piles 0 to n - 1 shuffled (Fisher-Yates on the bet's numbers), the first m
 * of them. Sorted for keeping.
 */
export const bonePileLayout = (rules: BonePileRules, rng: FairStream, m: number): number[] => {
  const order = Array.from({ length: rules.piles }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, m).sort((a, b) => a - b);
};

/** The exact return of stopping after k safe piles with m Sabnox. */
export const bonePileRtp = (rules: BonePileRules, k: number, m: number, cap: number): number => {
  let survive = 1;
  for (let i = 0; i < k; i++) survive *= (rules.piles - m - i) / (rules.piles - i);
  return survive * bonePileMultiplier(rules, k, m, cap);
};
