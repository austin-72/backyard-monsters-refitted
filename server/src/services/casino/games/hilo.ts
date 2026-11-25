import type { FairStream } from "../rng.js";

/**
 * Higher or Lower, pure (no database): services/casino/cardSessions.ts plays it over requests,
 * scripts/casino-rtp.ts checks it.
 *
 * The cards come from an endless deck (each card any of the 52, each as likely, whatever came before), so the
 * chance of a guess is plain: with the card's rank r from 1 (Ace, low) to 13 (King), the next card is the same
 * or higher with the chance (14 - r) / 13 and the same or lower with r / 13. A sure thing (higher on an Ace,
 * lower on a King) can't be bet; skip the card instead. After k right guesses with the chances p1 ... pk the
 * multiplier is rtp / (p1 x ... x pk), rounded down to 2 decimals and held to the Pit's most: whenever the
 * player stops, the bet has returned rtp (a little less for the rounding: 99.2% at the worst, 1.29x for 1.2999x
 * after one guess at 10 in 13).
 */

export interface HiLoRules {
  rtp: number;
  /** Cards drawn for a game (its secret, fixed at the start): the most guesses and skips together. */
  cards: number;
  /** The most skips in a game. */
  maxSkips: number;
  idleHours: number;
}

/** A card: [rank 1 (Ace) to 13 (King), suit 0 to 3]. */
export type Card = [number, number];

export const drawCards = (rules: HiLoRules, rng: FairStream): Card[] => {
  const out: Card[] = [];
  for (let i = 0; i < rules.cards; i++) {
    const c = rng.int(52);
    out.push([(c % 13) + 1, Math.floor(c / 13)]);
  }
  return out;
};

/** The chance the guess wins on this rank: "hi" the same or higher, "lo" the same or lower. */
export const chanceOf = (rank: number, guess: string): number => (guess === "hi" ? (14 - rank) / 13 : rank / 13);

/** Whether the next card wins the guess. */
export const wins = (rank: number, next: number, guess: string) => (guess === "hi" ? next >= rank : next <= rank);

/** The multiplier after right guesses whose chances multiply to `odds` (their product). */
export const hiloMultiplier = (rules: HiLoRules, odds: number, cap: number): number => {
  if (odds >= 1) return 0;
  return Math.min(Math.floor((rules.rtp / odds) * 100 + 1e-7) / 100, cap);
};
