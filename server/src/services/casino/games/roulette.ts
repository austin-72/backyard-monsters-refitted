import type { FairStream } from "../rng.js";

export interface RouletteRules {
  segments: number;
  monsters: string[];
  pays: { monster: number; color: number; wormzer: number };
}

export interface Segment {
  /** A monster's id, or "wormzer" for segment 0. */
  monster: string;
  color: "lava" | "ash" | "wormzer";
}

/**
 * The wheel, segment by segment: 0 is King Wormzer; 1 to 28 go round the monsters in order, Lava on odd
 * segments and Ash on even ones. (The game draws it from the same rules, so both agree.)
 */
export const rouletteWheel = (rules: RouletteRules): Segment[] => {
  const wheel: Segment[] = [{ monster: "wormzer", color: "wormzer" }];
  for (let i = 1; i < rules.segments; i++) {
    wheel.push({ monster: rules.monsters[(i - 1) % rules.monsters.length], color: i % 2 === 1 ? "lava" : "ash" });
  }
  return wheel;
};

/** What a bet is on: a monster's id, "lava", "ash" or "wormzer". */
export const rouletteTargets = (rules: RouletteRules) => [...rules.monsters, "lava", "ash", "wormzer"];

export interface RouletteBet {
  on: string;
  amount: number;
}

export interface RouletteOutcome {
  segment: number;
  monster: string;
  color: string;
  results: { on: string; amount: number; won: boolean; payout: number }[];
}

/** What a bet on `on` pays per Shiny when `seg` comes up (0: lost). */
export const roulettePays = (rules: RouletteRules, on: string, seg: Segment): number => {
  if (on === "wormzer") return seg.monster === "wormzer" ? rules.pays.wormzer : 0;
  if (on === "lava" || on === "ash") return seg.color === on ? rules.pays.color : 0;
  return seg.monster === on ? rules.pays.monster : 0;
};

/** One spin: one segment, each as likely; every bet on the slip settled on it. */
export const playRoulette = (rules: RouletteRules, rng: FairStream, bets: RouletteBet[]): { outcome: RouletteOutcome; payout: number } => {
  const wheel = rouletteWheel(rules);
  const segment = rng.int(wheel.length);
  const seg = wheel[segment];
  let payout = 0;
  const results = bets.map((b) => {
    // (pays may have decimals: the slip's total is paid in whole Shiny by the wallet, a part by chance)
    const p = Math.round(b.amount * roulettePays(rules, b.on, seg) * 1e6) / 1e6;
    payout += p;
    return { on: b.on, amount: b.amount, won: p > 0, payout: p };
  });
  return { outcome: { segment, monster: seg.monster, color: seg.color, results }, payout: Math.round(payout * 1e6) / 1e6 };
};

/** The exact return of a bet on `on`. */
export const rouletteRtp = (rules: RouletteRules, on: string): number => {
  const wheel = rouletteWheel(rules);
  return wheel.reduce((a, seg) => a + roulettePays(rules, on, seg), 0) / wheel.length;
};
