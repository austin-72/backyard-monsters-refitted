import { fairStream, type FairStream } from "../rng.js";

export interface DerbyRules {
  monsters: string[];
  runners: number;
  minStrength: number;
  maxStrength: number;
  rtp: number;
  minOdds: number;
  raceSeconds: number;
  checkpoints: number;
}

export interface DerbyRunner {
  id: string;
  strength: number;
  chance: number;
  odds: number;
}

export interface DerbyRace {
  runners: DerbyRunner[];
  /** Runner ids, first to last. */
  order: string[];
  /** Each runner's time at each checkpoint (ms from the start), the last its finish; `stumble` a checkpoint slowed down, or -1. */
  splits: Record<string, { times: number[]; stumble: number }>;
}

/** The odds for a chance of winning: max(minOdds, floor(100 x rtp / chance) / 100). */
export const derbyOdds = (rules: DerbyRules, chance: number): number => Math.max(rules.minOdds, Math.floor((100 * rules.rtp) / chance + 1e-9) / 100);

/**
 * A race from its seed (HMAC-SHA256(seed, "derby:0:<block>"), read in turn): the runners (six of the
 * monsters, shuffled), their strengths and odds, the finishing order (the winner drawn with the chances,
 * then the next from those left...), and times at each checkpoint that end in that order.
 */
export const derbyRace = (rules: DerbyRules, seed: string): DerbyRace => {
  const rng = fairStream(seed, "derby", 0);
  const pool = [...rules.monsters];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const ids = pool.slice(0, rules.runners);
  const strengths = ids.map(() => rules.minStrength + rng.next() * (rules.maxStrength - rules.minStrength));
  const total = strengths.reduce((a, b) => a + b, 0);
  const runners = ids.map((id, i) => {
    const chance = strengths[i] / total;
    return { id, strength: Math.round(strengths[i] * 100) / 100, chance, odds: derbyOdds(rules, chance) };
  });
  // the finishing order (Plackett-Luce)
  const left = runners.map((r, i) => ({ id: r.id, s: strengths[i] }));
  const order: string[] = [];
  while (left.length) {
    const sum = left.reduce((a, b) => a + b.s, 0);
    let u = rng.next() * sum;
    let k = 0;
    while (k < left.length - 1 && u >= left[k].s) {
      u -= left[k].s;
      k++;
    }
    order.push(left[k].id);
    left.splice(k, 1);
  }
  return { runners, order, splits: derbySplits(rules, rng, order) };
};

/**
 * Checkpoint times that finish in `order`: the winner at 60-72% of the race's time, each next a little
 * later; the way there varies (a runner may lead early and fade, or stumble), but never changes the finish.
 */
const derbySplits = (rules: DerbyRules, rng: FairStream, order: string[]) => {
  const span = rules.raceSeconds * 1000;
  let finish = span * (0.6 + rng.next() * 0.12);
  const splits: Record<string, { times: number[]; stumble: number }> = {};
  for (const id of order) {
    const n = rules.checkpoints;
    const w = Array.from({ length: n }, () => 0.75 + rng.next() * 0.5);
    const stumble = rng.next() < 0.25 ? 1 + rng.int(n - 2) : -1;
    if (stumble >= 0) w[stumble] *= 1.9;
    const sum = w.reduce((a, b) => a + b, 0);
    let t = 0;
    const times = w.map((x) => (t += (x / sum) * finish));
    times[n - 1] = Math.round(finish);
    splits[id] = { times: times.map((x) => Math.round(x)), stumble };
    finish += 250 + rng.next() * 1200;
  }
  return splits;
};

/** The exact return of a bet on each runner of a race (chance x odds). */
export const derbyRtp = (race: DerbyRace): number[] => race.runners.map((r) => r.chance * r.odds);

