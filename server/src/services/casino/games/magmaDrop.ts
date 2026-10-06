import type { FairStream } from "../rng.js";

export interface MagmaDropRules {
  rows: number;
  risks: Record<string, number[]>;
}

export interface MagmaDropOutcome {
  /** One entry per row: 0 bounces left, 1 right. */
  path: number[];
  /** The cup the ball lands in, 0 to rows (the number of rights). */
  slot: number;
  risk: string;
  multiplier: number;
}

/**
 * Magma Drop (Plinko). Each row is one fair coin, so the cup is binomially distributed; the cup's
 * multiplier comes from the risk's table.
 */
export const playMagmaDrop = (rules: MagmaDropRules, rng: FairStream, risk: string): MagmaDropOutcome => {
  const table = rules.risks[risk];
  if (!table || table.length !== rules.rows + 1) throw new Error(`Magma Drop: no table for risk ${risk}`);
  const path: number[] = [];
  for (let i = 0; i < rules.rows; i++) path.push(rng.next() < 0.5 ? 0 : 1);
  const slot = path.reduce((a, b) => a + b, 0);
  return { path, slot, risk, multiplier: table[slot] };
};

/** The exact return to player of a risk's table. */
export const magmaDropRtp = (rules: MagmaDropRules, risk: string): number => {
  const n = rules.rows;
  let c = 1;
  let rtp = 0;
  for (let k = 0; k <= n; k++) {
    rtp += (c / 2 ** n) * rules.risks[risk][k];
    c = (c * (n - k)) / (k + 1);
  }
  return rtp;
};
