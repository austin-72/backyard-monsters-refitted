import type { FairStream } from "../rng.js";

/**
 * Cinderjack (blackjack) rules and play, pure (no database): services/casino/cardSessions.ts plays
 * them over requests, scripts/casino-rtp.ts simulates them.
 *
 * A card is a number 0 to 51 within a deck: rank = card % 13 (0 Ace, 1-9 the twos to tens, 10 Jack, 11 Queen,
 * 12 King), suit = floor(card / 13). The shoe is `decks` decks shuffled afresh for every hand (Fisher-Yates on
 * the bet's numbers), so what was dealt before tells nothing.
 */

export interface BlackjackRules {
  decks: number;
  /** The dealer draws to 16 and stands on every 17 (false), or also hits a soft 17 (true). */
  hitSoft17: boolean;
  /** A two-card 21 (not after a split) pays this to one (1.5: 3 to 2), the stake back besides. */
  blackjackPays: number;
  /** Most hands a split makes in all (2: one split, no splitting again). */
  maxHands: number;
  doubleAfterSplit: boolean;
  idleHours: number;
}

export interface Hand {
  cards: number[];
  stake: number;
  doubled: boolean;
  /** Split from a pair (a 21 then isn't a blackjack); split Aces get one card each. */
  split: boolean;
  done: boolean;
  /** Set when the hand is over: "blackjack" | "win" | "push" | "lose" | "bust". */
  result?: string;
  payout?: number;
}

export interface Table {
  hands: Hand[];
  /** The hand being played. */
  at: number;
  dealer: number[];
  /** Where the next card comes from in the shoe. */
  pos: number;
  /** "player" while the player acts, "over" when settled. */
  phase: string;
}

export const rankOf = (card: number) => card % 13;

/** The card's value: Aces 1 (made 11 by handTotal when it helps), faces 10. */
export const cardValue = (card: number) => Math.min(10, rankOf(card) + 1);

/** The best total of a hand and whether an Ace in it counts 11 (soft). */
export const handTotal = (cards: number[]): { total: number; soft: boolean } => {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (rankOf(c) === 0) aces++;
  }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
};

export const isBlackjack = (cards: number[]) => cards.length === 2 && handTotal(cards).total === 21;

/** The shoe: `decks` x 52 cards (each card's number within its deck), shuffled. */
export const shuffleShoe = (rules: BlackjackRules, rng: FairStream): number[] => {
  const shoe: number[] = [];
  for (let d = 0; d < rules.decks; d++) for (let c = 0; c < 52; c++) shoe.push(c);
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
};

const draw = (t: Table, shoe: number[]) => shoe[t.pos++];

/** The deal: player, dealer, player, dealer (the dealer's second card face down). */
export const deal = (shoe: number[], stake: number): Table => {
  const t: Table = { hands: [{ cards: [], stake, doubled: false, split: false, done: false }], at: 0, dealer: [], pos: 0, phase: "player" };
  t.hands[0].cards.push(draw(t, shoe));
  t.dealer.push(draw(t, shoe));
  t.hands[0].cards.push(draw(t, shoe));
  t.dealer.push(draw(t, shoe));
  // a blackjack on either side ends it at once (the dealer looks at the hole card under an Ace or a ten)
  if (isBlackjack(t.hands[0].cards) || isBlackjack(t.dealer)) t.hands[0].done = true;
  return t;
};

/** What the hand being played may do now. */
export const options = (rules: BlackjackRules, t: Table): { hit: boolean; stand: boolean; double: boolean; split: boolean } => {
  const h = t.hands[t.at];
  if (t.phase !== "player" || !h || h.done) return { hit: false, stand: false, double: false, split: false };
  const two = h.cards.length === 2;
  return {
    hit: true,
    stand: true,
    double: two && (!h.split || rules.doubleAfterSplit),
    split: two && t.hands.length < rules.maxHands && rankOf(h.cards[0]) === rankOf(h.cards[1]),
  };
};

/** Moves on to the next hand not done (or the dealer's turn). */
const advance = (t: Table) => {
  while (t.at < t.hands.length && t.hands[t.at].done) t.at++;
};

/**
 * One action on the hand being played; returns the extra stake it takes (a double or a split), or throws if
 * it isn't allowed. A hand that reaches 21 or more is done.
 */
export const act = (rules: BlackjackRules, t: Table, shoe: number[], action: string): number => {
  const o = options(rules, t);
  const h = t.hands[t.at];
  let extra = 0;
  if (action === "hit" && o.hit) {
    h.cards.push(draw(t, shoe));
    if (handTotal(h.cards).total >= 21) h.done = true;
  } else if (action === "stand" && o.stand) {
    h.done = true;
  } else if (action === "double" && o.double) {
    extra = h.stake;
    h.stake *= 2;
    h.doubled = true;
    h.cards.push(draw(t, shoe));
    h.done = true;
  } else if (action === "split" && o.split) {
    extra = h.stake;
    const second: Hand = { cards: [h.cards.pop() as number], stake: h.stake, doubled: false, split: true, done: false };
    h.split = true;
    t.hands.splice(t.at + 1, 0, second);
    h.cards.push(draw(t, shoe));
    second.cards.push(draw(t, shoe));
    // split Aces: one card each, and done
    if (rankOf(h.cards[0]) === 0) {
      h.done = true;
      second.done = true;
    }
    for (const x of [h, second]) if (handTotal(x.cards).total >= 21) x.done = true;
  } else {
    throw new Error(`"${action}" can't be done now.`);
  }
  advance(t);
  return extra;
};

/** Whether the dealer still draws on these cards. */
export const dealerDraws = (rules: BlackjackRules, cards: number[]) => {
  const { total, soft } = handTotal(cards);
  return total < 17 || (total === 17 && soft && rules.hitSoft17);
};

/**
 * Every hand done: the dealer plays (unless every hand busted, or a blackjack ended it), and each hand is paid:
 * a blackjack 1 + blackjackPays times its stake, a win twice, a push its stake back, a loss nothing. Returns the
 * total paid (before rounding to whole Shiny).
 */
export const finish = (rules: BlackjackRules, t: Table, shoe: number[]): number => {
  advance(t);
  const natural = t.hands.length === 1 && isBlackjack(t.hands[0].cards) && !t.hands[0].split;
  const dealerNatural = isBlackjack(t.dealer);
  const live = t.hands.some((h) => handTotal(h.cards).total <= 21);
  if (!natural && !dealerNatural && live) {
    while (dealerDraws(rules, t.dealer)) t.dealer.push(draw(t, shoe));
  }
  const d = handTotal(t.dealer).total;
  let paid = 0;
  for (const h of t.hands) {
    const p = handTotal(h.cards).total;
    h.done = true;
    if (p > 21) {
      h.result = "bust";
      h.payout = 0;
    } else if (natural && !dealerNatural) {
      h.result = "blackjack";
      h.payout = h.stake * (1 + rules.blackjackPays);
    } else if (dealerNatural) {
      h.result = natural ? "push" : "lose";
      h.payout = natural ? h.stake : 0;
    } else if (d > 21 || p > d) {
      h.result = "win";
      h.payout = h.stake * 2;
    } else if (p === d) {
      h.result = "push";
      h.payout = h.stake;
    } else {
      h.result = "lose";
      h.payout = 0;
    }
    paid += h.payout;
  }
  t.phase = "over";
  t.at = t.hands.length;
  return paid;
};

/**
 * Basic strategy for these rules (dealer stands on soft 17, double after split, one split): for the
 * simulation in scripts/casino-rtp.ts and for the game's hint. `up` is the dealer's up card's value (Ace 11).
 */
export const basicStrategy = (rules: BlackjackRules, t: Table): string => {
  const h = t.hands[t.at];
  const o = options(rules, t);
  const up = cardValue(t.dealer[0]) === 1 ? 11 : cardValue(t.dealer[0]);
  if (o.split) {
    const v = cardValue(h.cards[0]) === 1 ? 11 : cardValue(h.cards[0]);
    const splitIt =
      v === 11 || v === 8 ||
      (v === 9 && up !== 7 && up !== 10 && up !== 11) ||
      ((v === 7 || v === 3 || v === 2) && up <= 7) ||
      (v === 6 && up <= 6) ||
      (v === 4 && (up === 5 || up === 6));
    if (splitIt) return "split";
  }
  const { total, soft } = handTotal(h.cards);
  if (soft) {
    if (total >= 20) return "stand";
    if (total === 19) return o.double && up === 6 ? "double" : "stand";
    if (total === 18) {
      if (o.double && up >= 2 && up <= 6) return "double";
      return up <= 8 ? "stand" : "hit";
    }
    if (total === 17) return o.double && up >= 3 && up <= 6 ? "double" : "hit";
    if (total >= 15) return o.double && up >= 4 && up <= 6 ? "double" : "hit";
    return o.double && up >= 5 && up <= 6 ? "double" : "hit";
  }
  if (total >= 17) return "stand";
  if (total >= 13) return up <= 6 ? "stand" : "hit";
  if (total === 12) return up >= 4 && up <= 6 ? "stand" : "hit";
  if (total === 11) return o.double ? "double" : "hit";
  if (total === 10) return o.double && up <= 9 ? "double" : "hit";
  if (total === 9) return o.double && up >= 3 && up <= 6 ? "double" : "hit";
  return "hit";
};
