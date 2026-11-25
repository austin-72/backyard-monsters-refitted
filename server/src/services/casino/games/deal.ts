import type { FairStream } from "../rng.js";

/**
 * The Undertaker's Offer (Deal or No Deal; 7 October, the user's pick), pure (no database): services/casino/cardSessions.ts
 * plays it over requests, scripts/casino-rtp.ts checks it.
 *
 * Twelve sealed coffins hold the twelve prizes of `prizes` (multipliers of the bet), shuffled from the player's
 * seeds when the game starts. The player keeps one (unopened) and opens the others in rounds (`rounds`: how many
 * a round); after each round the Undertaker offers to buy the kept coffin for `offers[round]` times the average of the
 * prizes still sealed (the kept one among them). Deal: paid the offer. No deal: on. When only the kept coffin and
 * one more are left, the player keeps it or swaps it for the other.
 *
 * Keeping (or swapping) to the end returns the prizes' average (`prizes` sum to 12 x rtp); every offer is below
 * the average of what is left, so a deal returns a little less than going on would (the Undertaker's price for
 * certainty). The Undertaker's offers are worked out the same way every time: he doesn't know what is in the coffin.
 */

export interface DealRules {
  /** The twelve prizes, as multipliers of the bet. */
  prizes: number[];
  /** Coffins opened in each round (they add up to the number of prizes less 2). */
  rounds: number[];
  /** The Undertaker's offer after each round, as a share of the average of the prizes still sealed. */
  offers: number[];
  idleHours: number;
}

/** prizes[i] is in coffin layout[i]: layout is a shuffle of the prizes' indexes, one for each coffin. */
export const dealLayout = (rules: DealRules, rng: FairStream): number[] => {
  const order = rules.prizes.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  // coffin c holds prizes[order[c]]
  return order;
};

/** The Undertaker's offer (a multiplier of the bet, 2 decimals, rounded down) after `round` (0-based) with these prizes still sealed. */
export const dealOffer = (rules: DealRules, round: number, sealed: number[]): number => {
  const avg = sealed.reduce((a, b) => a + b, 0) / Math.max(1, sealed.length);
  return Math.floor(rules.offers[Math.min(round, rules.offers.length - 1)] * avg * 100 + 1e-7) / 100;
};

/** How many coffins are opened by the end of `round` (0-based). */
export const openedBy = (rules: DealRules, round: number): number => rules.rounds.slice(0, round + 1).reduce((a, b) => a + b, 0);
