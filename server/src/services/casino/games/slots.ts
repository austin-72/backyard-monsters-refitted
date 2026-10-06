import type { FairStream } from "../rng.js";

export interface SlotsRules {
  strips: string[][];
  pays: Record<string, number>;
  twoSpurtz: number;
}

export interface SlotsOutcome {
  /** The stop drawn on each reel (the symbol on the line is strips[reel][stop]). */
  stops: number[];
  symbols: string[];
  /** "three" (three of a kind), "two_spurtz", "jackpot" or "none". */
  line: string;
  /** What the line pays times the stake (0 for the jackpot: it pays the pool). */
  multiplier: number;
}

/** One spin: a stop on each reel, each as likely, and what the line pays. */
export const playSlots = (rules: SlotsRules, rng: FairStream): SlotsOutcome => {
  const stops = rules.strips.map((strip) => rng.int(strip.length));
  const symbols = stops.map((s, r) => rules.strips[r][s]);
  return { stops, symbols, ...slotsLine(rules, symbols) };
};

export const slotsLine = (rules: SlotsRules, symbols: string[]): { line: string; multiplier: number } => {
  if (symbols.every((s) => s === symbols[0])) {
    if (symbols[0] === "wormzer") return { line: "jackpot", multiplier: 0 };
    return { line: "three", multiplier: rules.pays[symbols[0]] ?? 0 };
  }
  if (symbols.filter((s) => s === "spurtz").length === 2) return { line: "two_spurtz", multiplier: rules.twoSpurtz };
  return { line: "none", multiplier: 0 };
};

/** The exact return without the jackpot, and the chance of the jackpot, from the strips. */
export const slotsRtp = (rules: SlotsRules): { rtp: number; jackpot: number } => {
  let rtp = 0;
  let jackpot = 0;
  const [a, b, c] = rules.strips;
  const n = a.length * b.length * c.length;
  for (const x of a) for (const y of b) for (const z of c) {
    const l = slotsLine(rules, [x, y, z]);
    rtp += l.multiplier;
    if (l.line === "jackpot") jackpot++;
  }
  return { rtp: rtp / n, jackpot: jackpot / n };
};

/**
 * Korath's Fortune: the Magma Slots' reels (the same strips and pays) seen through a 3 x 3 window, paid on
 * five lines: the three rows and the two diagonals. Row 0 is the top (the stop above the middle one,
 * stop + 1), row 1 the middle (the stop drawn), row 2 the bottom (stop - 1). Each line is bet a fifth of the
 * stake and pays the Magma Slots table on it. Each line on its own is three stops each as likely as any
 * other, so each returns what the Magma Slots line does (97.97%), and the five together the same; three
 * King Wormzer on a line win the line's share of the jackpot pool (each reel has one Wormzer, so at most
 * one line can).
 */
export const FORTUNE_LINES: number[][] = [
  [1, 1, 1],
  [0, 0, 0],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0],
];

export interface FortuneLine {
  /** Which of FORTUNE_LINES. */
  line: number;
  symbols: string[];
  /** "three", "two_spurtz" or "jackpot". */
  kind: string;
  /** What it pays times the line's bet (a fifth of the stake; 0 for the jackpot). */
  multiplier: number;
}

export interface FortuneOutcome {
  /** The stop drawn on each reel (the middle row). */
  stops: number[];
  /** The window, rows top to bottom, each the three reels' symbols. */
  window: string[][];
  /** The lines that pay. */
  wins: FortuneLine[];
  /** "jackpot" when a line has three King Wormzer, "win" when any line pays, else "none". */
  line: string;
  /** What the spin pays times the whole stake (the lines' pays over five). */
  multiplier: number;
}

const ROW_OFFSET = [1, 0, -1];

/** The window for a set of stops (rows top to bottom). */
export const fortuneWindow = (rules: SlotsRules, stops: number[]): string[][] =>
  ROW_OFFSET.map((d) => stops.map((s, r) => {
    const strip = rules.strips[r];
    return strip[(((s + d) % strip.length) + strip.length) % strip.length];
  }));

export const fortuneLines = (rules: SlotsRules, window: string[][]): { wins: FortuneLine[]; line: string; multiplier: number } => {
  const wins: FortuneLine[] = [];
  FORTUNE_LINES.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => window[row][reel]);
    const l = slotsLine(rules, symbols);
    if (l.line !== "none") wins.push({ line, symbols, kind: l.line, multiplier: l.multiplier });
  });
  const total = wins.reduce((a, w) => a + w.multiplier, 0) / FORTUNE_LINES.length;
  return { wins, line: wins.some((w) => w.kind === "jackpot") ? "jackpot" : wins.length ? "win" : "none", multiplier: total };
};

/** One spin: a stop on each reel, each as likely; every line read off the window. */
export const playFortune = (rules: SlotsRules, rng: FairStream): FortuneOutcome => {
  const stops = rules.strips.map((strip) => rng.int(strip.length));
  const window = fortuneWindow(rules, stops);
  return { stops, window, ...fortuneLines(rules, window) };
};

/** The exact return without the jackpot, and the chance of a jackpot line, over every set of stops. */
export const fortuneRtp = (rules: SlotsRules): { rtp: number; jackpot: number } => {
  let rtp = 0;
  let jackpot = 0;
  const [a, b, c] = rules.strips;
  for (let x = 0; x < a.length; x++) for (let y = 0; y < b.length; y++) for (let z = 0; z < c.length; z++) {
    const l = fortuneLines(rules, fortuneWindow(rules, [x, y, z]));
    rtp += l.multiplier;
    if (l.line === "jackpot") jackpot++;
  }
  const n = a.length * b.length * c.length;
  return { rtp: rtp / n, jackpot: jackpot / n };
};
