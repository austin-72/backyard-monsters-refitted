import type { FairStream } from "../rng.js";

export interface ScratchPrize {
  symbol: string;
  pays: number;
  chance: number;
}

export interface ScratchOutcome {
  /** The 9 cells, row by row. */
  grid: string[];
  /** The winning symbol, or null. */
  prize: string | null;
  /** The cells (0-8) of the three winning symbols. */
  cells: number[];
  multiplier: number;
}

/**
 * Brimstone Scratchers. The card's result is drawn first, from the prize table; then its 9 cells are
 * filled at random within the rules that make it read as that result: a winning card has exactly three
 * of its prize symbol and no other symbol three times; a losing card has no symbol more than twice.
 * The other cells are chosen evenly among the symbols still allowed, and placed evenly, so a loss is not
 * made to look like a near win on purpose.
 */
export const playScratch = (prizes: ScratchPrize[], rng: FairStream): ScratchOutcome => {
  const symbols = prizes.map((p) => p.symbol);
  let u = rng.next();
  let win: ScratchPrize | null = null;
  for (const p of prizes) {
    if (u < p.chance) {
      win = p;
      break;
    }
    u -= p.chance;
  }
  const counts: Record<string, number> = {};
  for (const s of symbols) counts[s] = 0;
  const cells: string[] = [];
  if (win) {
    cells.push(win.symbol, win.symbol, win.symbol);
    counts[win.symbol] = 3;
  }
  while (cells.length < 9) {
    const allowed = symbols.filter((s) => counts[s] < 2);
    const s = allowed[rng.int(allowed.length)];
    counts[s]++;
    cells.push(s);
  }
  // shuffle (Fisher-Yates)
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = 8; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const grid: string[] = new Array(9);
  order.forEach((to, from) => {
    grid[to] = cells[from];
  });
  const winCells = win ? grid.map((s, i) => (s === win!.symbol ? i : -1)).filter((i) => i >= 0) : [];
  return { grid, prize: win ? win.symbol : null, cells: winCells, multiplier: win ? win.pays : 0 };
};

/** The exact return to player of a prize table. */
export const scratchRtp = (prizes: ScratchPrize[]): number => prizes.reduce((a, p) => a + p.pays * p.chance, 0);
