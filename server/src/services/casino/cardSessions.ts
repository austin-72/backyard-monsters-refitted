import type { User } from "../../database/models/user.model.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { casinoErr } from "./access.js";
import { fairStream, hashSeed, wholeShiny } from "./rng.js";
import { lockSeed, sqlAll, type Em } from "./wallet.js";
import { act as bjAct, basicStrategy, deal, finish as bjFinish, handTotal, options as bjOptions, shuffleShoe, type Table } from "./games/blackjack.js";
import { luckFor, luckRoll } from "./luck.js";
import { chanceOf, drawCards, hiloMultiplier, wins, type Card } from "./games/hilo.js";
import { dealLayout, dealOffer, openedBy } from "./games/deal.js";

/**
 * Inferno-only (7 October, the user's picks): the Brimstone Pit's two card games, played over several requests
 * like Bone Pile (casino_session rows; one open game of each per player):
 *
 *  - Cinderjack (blackjack, config `blackjack`): the shoe is shuffled from the player's seeds when the
 *    hand is dealt and kept on the server; the game is sent the cards as they are dealt (the dealer's hole card
 *    once the hand is over) and the shoe's hash (the shoe itself at the end, to check). Doubling and splitting
 *    take the extra stake when they are played. games/blackjack.ts has the rules.
 *  - Higher or Lower (config `hilo`): the game's cards are drawn from the player's seeds at the start (secret
 *    until it is over: their hash is sent); each guess is answered with the next card. Cash out any time after a
 *    right guess. games/hilo.ts has the maths.
 *
 *  - The Undertaker's Offer (Deal or No Deal, config `deal`): the coffins' prizes are shuffled from the player's seeds at the
 *    start (secret until it is over: their hash is sent); each coffin opened shows its prize; after each round the
 *    Undertaker makes an offer. games/deal.ts has the rules.
 *
 * A win that comes to part of a Shiny pays the whole Shiny with the chance of that part (rng.ts wholeShiny,
 * from the game's own numbers). A game left alone for `idleHours` is settled: blackjack's hands stand as they
 * are and the dealer plays; Higher or Lower is cashed out (or its bet given back if nothing was guessed).
 */

interface SessionRow {
  id: string;
  user_id: number;
  game: string;
  bet_id: string;
  stake: number;
  config: Record<string, unknown> & { nonce: number; hash: string };
  layout: Record<string, unknown> & { u: number };
  revealed: unknown;
  status: string;
  updated_at: string;
}

type Game = "blackjack" | "hilo" | "deal";

const NAMES: Record<Game, string> = { blackjack: "Cinderjack", hilo: "Higher or Lower", deal: "The Undertaker's Offer" };

const balance = async (em: Em, userid: number): Promise<number> =>
  (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [userid, BaseType.MAIN]))[0]?.credits ?? 0;

const mirror = (user: User | null, credits: number) => {
  if (user?.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
};

const lockSession = async (em: Em, userid: number, sessionId: number, game: Game): Promise<SessionRow> => {
  const rows = await sqlAll<SessionRow>(em, `SELECT * FROM bym.casino_session WHERE id = ? AND user_id = ? AND game = ? FOR UPDATE`, [sessionId, userid, game]);
  if (!rows.length) throw casinoErr(`That game of ${NAMES[game]} could not be found.`, Status.NOT_FOUND);
  return rows[0];
};

/** Takes `amount` more from the player (a double, a split): false if they haven't got it. */
const takeMore = async (em: Em, userid: number, amount: number): Promise<boolean> => {
  const rows = await sqlAll<{ credits: number }>(em,
    `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`, [amount, userid, BaseType.MAIN, amount]);
  return rows.length === 1;
};

/**
 * Starts a game: the bet taken, its numbers drawn (`make`, from the player's seeds), the session kept. A
 * request sent twice answers with the same game.
 */
const startSession = async (
  user: User,
  game: Game,
  requestId: string,
  stake: number,
  make: (
    rng: ReturnType<typeof fairStream>,
    seed: { server_seed: string; client_seed: string; nonce: number },
    luck: number,
  ) => { config: Record<string, unknown>; layout: Record<string, unknown>; revealed: unknown; hash: string; lucky?: boolean },
) => {
  return postgres.em.fork().transactional(async (em) => {
    const seed = await lockSeed(em, user.userid);
    const seen = await sqlAll<{ id: string; game: string }>(em, `SELECT id, game FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    if (seen.length) {
      if (seen[0].game !== game) throw casinoErr("That request was already used.", Status.CONFLICT);
      const s = await sqlAll<SessionRow>(em, `SELECT * FROM bym.casino_session WHERE bet_id = ?`, [seen[0].id]);
      return { s: s[0], credits: await balance(em, user.userid), replayed: true };
    }
    const open = await sqlAll(em, `SELECT id FROM bym.casino_session WHERE user_id = ? AND game = ? AND status = 'open' FOR UPDATE`, [user.userid, game]);
    if (open.length) throw casinoErr(`Finish your ${NAMES[game]} game first.`, Status.CONFLICT);
    const bal = await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!bal.length) throw casinoErr("Your yard could not be found.", Status.CONFLICT);
    if (bal[0].credits < stake) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    const rng = fairStream(seed.server_seed, seed.client_seed, seed.nonce);
    // luck (silent, luck.ts): with its chance the game is dealt twice and the better deal for the player kept
    const luck = await luckFor(em, user.userid, stake);
    const made = make(rng, seed, luck);
    // the game's next number: whether a part of a Shiny won is paid
    const u = rng.next();
    if (!(await takeMore(em, user.userid, stake))) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    const bet = await sqlAll<{ id: string }>(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, seed_hash, client_seed, nonce, status, luck, lucky)
       VALUES (?, ?, ?, ?, 0, 0, CAST(? AS jsonb), ?, ?, ?, 'open', ?, ?) RETURNING id`,
      [user.userid, requestId, game, stake, JSON.stringify({ hash: made.hash }), seed.server_seed_hash, seed.client_seed, seed.nonce, luck.toFixed(4), Boolean(made.lucky)]);
    const ses = await sqlAll<SessionRow>(em,
      `INSERT INTO bym.casino_session (user_id, game, bet_id, stake, config, layout, revealed, status)
       VALUES (?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), 'open') RETURNING *`,
      [user.userid, game, bet[0].id, stake, JSON.stringify({ ...made.config, nonce: seed.nonce, hash: made.hash }), JSON.stringify({ ...made.layout, u }), JSON.stringify(made.revealed)]);
    await sqlAll(em, `UPDATE bym.casino_seed SET nonce = nonce + 1 WHERE user_id = ? RETURNING nonce`, [user.userid]);
    return { s: ses[0], credits: (await balance(em, user.userid)), replayed: false };
  });
};

/** Pays a game that is over (`paid` before rounding to whole Shiny; 0 a loss) and closes it. */
const settleSession = async (em: Em, s: SessionRow, paid: number, stake: number, outcome: Record<string, unknown>, status: "won" | "lost" | "refunded") => {
  let payout = status === "refunded" ? s.stake : paid > 0 ? wholeShiny(paid, Number(s.layout.u ?? 1)) : 0;
  if (status !== "refunded" && casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
  // (32-bit in the database: held to the most there can be, the balance too; over it, the game could never settle
  // and the player could start no other; 9 October)
  payout = Math.min(payout, 2147483647);
  stake = Math.min(stake, 2147483647);
  const credits = payout > 0
    ? (await sqlAll<{ credits: number }>(em, `UPDATE bym.save SET credits = LEAST(credits::bigint + ?, 2147483647) WHERE userid = ? AND type = ? RETURNING credits`, [payout, s.user_id, BaseType.MAIN]))[0]?.credits ?? 0
    : await balance(em, s.user_id);
  const mult = stake > 0 ? payout / stake : 0;
  await sqlAll(em,
    `UPDATE bym.casino_bet SET stake = ?, payout = ?, multiplier = ?, status = ?, settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
    [stake, payout, Math.min(mult, 99999).toFixed(2), status === "refunded" ? "refunded" : "settled", JSON.stringify(outcome), s.bet_id]);
  await sqlAll(em, `UPDATE bym.casino_session SET status = ?, stake = ?, updated_at = now() WHERE id = ? RETURNING id`, [status, stake, s.id]);
  s.status = status;
  if (status === "won" && payout > stake) noteCasinoWin({ userid: s.user_id, game: s.game, stake, payout });
  return { payout, credits };
};

const openSession = async (userid: number, game: Game): Promise<SessionRow | null> => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT * FROM bym.casino_session WHERE user_id = ? AND game = ? AND status = 'open' LIMIT 1`, [userid, game], "all")) as SessionRow[];
  return rows[0] ?? null;
};

// ---------------------------------------------------------------- Cinderjack

const bjRules = () => casinoConfig.blackjack;

/** What the game is shown: the cards dealt, never the shoe or (while the hand is on) the hole card. */
export const blackjackView = (s: SessionRow) => {
  const t = s.revealed as Table;
  const over = s.status !== "open";
  const o = bjOptions(bjRules(), t);
  const view: Record<string, unknown> = {
    session_id: Number(s.id),
    stake: s.stake,
    status: s.status,
    hands: t.hands.map((h) => ({ cards: h.cards, stake: h.stake, doubled: h.doubled, split: h.split, done: h.done, total: handTotal(h.cards).total, soft: handTotal(h.cards).soft, result: h.result ?? null, payout: h.payout ?? null })),
    at: t.at,
    dealer: over ? t.dealer : [t.dealer[0]],
    dealer_total: over ? handTotal(t.dealer).total : handTotal([t.dealer[0]]).total,
    options: over ? null : o,
    hash: s.config.hash,
    nonce: s.config.nonce,
  };
  // (the whole shoe once the hand is over: with the seeds it can be checked against the hash sent at the deal)
  if (over) view.shoe = s.layout.shoe;
  return view;
};

/** What a shoe's hand comes to for a player playing basic strategy (paid less staked, a stake of 1): luck's measure. */
const bjDealWorth = (shoe: number[]): number => {
  const t = deal(shoe, 1);
  for (let i = 0; i < 30 && t.at < t.hands.length && !t.hands[t.at].done; i++) bjAct(bjRules(), t, shoe, basicStrategy(bjRules(), t));
  const staked = t.hands.reduce((a, h) => a + h.stake, 0);
  return bjFinish(bjRules(), t, shoe) - staked;
};

const bjPlayed = (t: Table) => t.hands.reduce((a, h) => a + h.stake, 0);

/** Every hand done: the dealer plays, the hands are paid, the game closed. */
const bjSettle = async (em: Em, s: SessionRow) => {
  const t = s.revealed as Table;
  const paid = bjFinish(bjRules(), t, s.layout.shoe as number[]);
  await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb) WHERE id = ? RETURNING id`, [JSON.stringify(t), s.id]);
  const stake = bjPlayed(t);
  return settleSession(em, s, paid, stake, { dealt: (s.layout.shoe as number[]).slice(0, t.pos), hands: t.hands, dealer: t.dealer, end: "over" }, paid > 0 ? "won" : "lost");
};

export const openBlackjack = async (userid: number) => {
  const s = await openSession(userid, "blackjack");
  return s ? blackjackView(s) : null;
};

/** Deals a hand (the bet taken). A blackjack on either side settles it at once. */
export const startBlackjack = async (user: User, requestId: string, stake: number) => {
  const r = await startSession(user, "blackjack", requestId, stake, (rng, seed, luck) => {
    let shoe = shuffleShoe(bjRules(), rng);
    let lucky = false;
    if (luckRoll(luck, rng)) {
      const other = shuffleShoe(bjRules(), rng);
      if (bjDealWorth(other) > bjDealWorth(shoe)) {
        shoe = other;
        lucky = true;
      }
    }
    const t = deal(shoe, stake);
    return {
      config: {},
      layout: { shoe },
      revealed: t,
      hash: hashSeed(`${seed.server_seed}:${seed.client_seed}:${seed.nonce}:${shoe.join(",")}`),
      lucky,
    };
  });
  let credits = r.credits;
  let payout: number | null = null;
  const t = r.s.revealed as Table;
  // (a blackjack dealt: settled at once. 13 October: also when the start is sent again and the hand is still open,
  // its settling having failed the first time, which left a hand with nothing to do for 24 hours)
  if (t.hands.every((h) => h.done) && (!r.replayed || (r.s as { status?: string }).status === "open")) {
    const done = await postgres.em.fork().transactional(async (em) => {
      const s = await lockSession(em, user.userid, Number(r.s.id), "blackjack");
      // (settled already, by another request sent at the same time: not paid twice)
      if (s.status !== "open") return { credits: await balance(em, user.userid), payout: null as number | null, s };
      return { ...(await bjSettle(em, s)), s };
    });
    r.s = done.s;
    credits = done.credits;
    payout = done.payout;
  }
  mirror(user, credits);
  return { view: blackjackView(r.s), credits, payout, replayed: r.replayed };
};

/** One action (hit, stand, double, split) on the hand being played; the last hand done settles the game. */
export const actBlackjack = async (user: User, sessionId: number, action: string) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId, "blackjack");
    if (s.status !== "open") {
      const bet = await sqlAll<{ payout: number }>(em, `SELECT payout FROM bym.casino_bet WHERE id = ?`, [s.bet_id]);
      return { s, credits: await balance(em, user.userid), payout: bet[0]?.payout ?? 0 as number | null };
    }
    const t = s.revealed as Table;
    const o = bjOptions(bjRules(), t) as Record<string, boolean>;
    if (!o[action]) throw casinoErr(action === "double" || action === "split" ? `You can't ${action} that hand.` : "That can't be done now.", Status.CONFLICT);
    if (action === "double" || action === "split") {
      const more = t.hands[t.at].stake;
      if (!(await takeMore(em, user.userid, more))) throw casinoErr(`You need ${more} more Shiny to ${action}.`, Status.CONFLICT);
    }
    bjAct(bjRules(), t, s.layout.shoe as number[], action);
    const stake = bjPlayed(t);
    await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb), stake = ?, updated_at = now() WHERE id = ? RETURNING id`, [JSON.stringify(t), stake, s.id]);
    await sqlAll(em, `UPDATE bym.casino_bet SET stake = ? WHERE id = ? RETURNING id`, [stake, s.bet_id]);
    s.stake = stake;
    if (t.at >= t.hands.length) {
      const done = await bjSettle(em, s);
      return { s, credits: done.credits, payout: done.payout as number | null };
    }
    return { s, credits: await balance(em, user.userid), payout: null as number | null };
  });
  mirror(user, result.credits);
  return { view: blackjackView(result.s), credits: result.credits, payout: result.payout };
};

// ---------------------------------------------------------------- Higher or Lower

const hlRules = () => casinoConfig.hilo;

interface HiLoState {
  /** The cards shown so far (the first, then one for each guess or skip). */
  shown: Card[];
  /** Each guess: [guess "hi" | "lo" | "skip", right]. */
  guesses: [string, boolean][];
  /** The chances of the right guesses multiplied together. */
  odds: number;
  skips: number;
}

const hlNext = (st: HiLoState) => {
  const cur = st.shown[st.shown.length - 1][0];
  const cap = casinoConfig.maxMultiplier;
  const opt = (g: string) => {
    const p = chanceOf(cur, g);
    return p >= 1 ? null : { chance: p, multiplier: hiloMultiplier(hlRules(), st.odds * p, cap) };
  };
  return { hi: opt("hi"), lo: opt("lo") };
};

export const hiloView = (s: SessionRow) => {
  const st = s.revealed as HiLoState;
  const over = s.status !== "open";
  const view: Record<string, unknown> = {
    session_id: Number(s.id),
    stake: s.stake,
    status: s.status,
    shown: st.shown,
    guesses: st.guesses,
    right: st.guesses.filter((g) => g[1] && g[0] !== "skip").length,
    multiplier: hiloMultiplier(hlRules(), st.odds, casinoConfig.maxMultiplier),
    skips_left: Math.max(0, hlRules().maxSkips - st.skips),
    next: over ? null : hlNext(st),
    hash: s.config.hash,
    nonce: s.config.nonce,
  };
  if (over) view.cards = s.layout.cards;
  return view;
};

export const openHiLo = async (userid: number) => {
  const s = await openSession(userid, "hilo");
  return s ? hiloView(s) : null;
};

export const startHiLo = async (user: User, requestId: string, stake: number) => {
  const r = await startSession(user, "hilo", requestId, stake, (rng, seed, luck) => {
    let cards = drawCards(hlRules(), rng);
    let lucky = false;
    if (luckRoll(luck, rng)) {
      const other = drawCards(hlRules(), rng);
      if (hlRun(other) > hlRun(cards)) {
        cards = other;
        lucky = true;
      }
    }
    const st: HiLoState = { shown: [cards[0]], guesses: [], odds: 1, skips: 0 };
    return {
      config: {},
      layout: { cards },
      revealed: st,
      hash: hashSeed(`${seed.server_seed}:${seed.client_seed}:${seed.nonce}:${cards.map((c) => c.join(".")).join(",")}`),
      lucky,
    };
  });
  mirror(user, r.credits);
  return { view: hiloView(r.s), credits: r.credits, replayed: r.replayed };
};

/** How many guesses in a row the likelier guess wins on these cards (a sure card skipped): luck's measure. */
const hlRun = (cards: Card[]): number => {
  let run = 0;
  for (let i = 0; i + 1 < cards.length; i++) {
    const cur = cards[i][0];
    const guess = chanceOf(cur, "hi") >= chanceOf(cur, "lo") ? "hi" : "lo";
    if (chanceOf(cur, guess) >= 1) continue;
    if (!wins(cur, cards[i + 1][0], guess)) break;
    run++;
  }
  return run;
};

const hlSettle = async (em: Em, s: SessionRow, lost: boolean) => {
  const st = s.revealed as HiLoState;
  const mult = hiloMultiplier(hlRules(), st.odds, casinoConfig.maxMultiplier);
  const right = st.guesses.some((g) => g[1] && g[0] !== "skip");
  const status = lost ? "lost" : right ? "won" : "refunded";
  return settleSession(em, s, lost ? 0 : s.stake * mult, s.stake, { cards: s.layout.cards, shown: st.shown, guesses: st.guesses, end: status }, status);
};

/**
 * A guess ("hi": the same or higher, "lo": the same or lower) or a skip (a new card, nothing staked on it).
 * Wrong: the bet is lost. The Pit's most reached, or the game's cards used up: cashed out.
 */
export const guessHiLo = async (user: User, sessionId: number, guess: string) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId, "hilo");
    if (s.status !== "open") {
      const bet = await sqlAll<{ payout: number }>(em, `SELECT payout FROM bym.casino_bet WHERE id = ?`, [s.bet_id]);
      return { s, credits: await balance(em, user.userid), payout: bet[0]?.payout ?? 0 as number | null, right: null as boolean | null };
    }
    const st = s.revealed as HiLoState;
    const cards = s.layout.cards as Card[];
    const cur = st.shown[st.shown.length - 1][0];
    if (guess === "skip") {
      if (st.skips >= hlRules().maxSkips) throw casinoErr("No skips left in this game.", Status.CONFLICT);
    } else if (chanceOf(cur, guess) >= 1) {
      throw casinoErr(guess === "hi" ? "Every card is the same or higher than an Ace: skip it instead." : "Every card is the same or lower than a King: skip it instead.", Status.CONFLICT);
    }
    const next = cards[st.shown.length];
    if (!next) throw casinoErr("This game's cards are used up: cash out.", Status.CONFLICT);
    st.shown.push(next);
    let right = true;
    if (guess === "skip") {
      st.skips++;
      st.guesses.push(["skip", true]);
    } else {
      right = wins(cur, next[0], guess);
      st.guesses.push([guess, right]);
      if (right) st.odds *= chanceOf(cur, guess);
    }
    await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb), updated_at = now() WHERE id = ? RETURNING id`, [JSON.stringify(st), s.id]);
    const capped = hiloMultiplier(hlRules(), st.odds, casinoConfig.maxMultiplier) >= casinoConfig.maxMultiplier;
    if (!right || capped || st.shown.length >= cards.length) {
      const done = await hlSettle(em, s, !right);
      return { s, credits: done.credits, payout: done.payout as number | null, right };
    }
    return { s, credits: await balance(em, user.userid), payout: null as number | null, right };
  });
  mirror(user, result.credits);
  return { view: hiloView(result.s), credits: result.credits, payout: result.payout, right: result.right };
};

/** Cashes out at the multiplier reached (after a right guess). A game already over: as it stands. */
export const cashoutHiLo = async (user: User, sessionId: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId, "hilo");
    if (s.status !== "open") {
      const bet = await sqlAll<{ payout: number }>(em, `SELECT payout FROM bym.casino_bet WHERE id = ?`, [s.bet_id]);
      return { s, credits: await balance(em, user.userid), payout: bet[0]?.payout ?? 0, replayed: true };
    }
    const st = s.revealed as HiLoState;
    if (!st.guesses.some((g) => g[1] && g[0] !== "skip")) throw casinoErr("Make a right guess before cashing out.", Status.CONFLICT);
    const done = await hlSettle(em, s, false);
    return { s, credits: done.credits, payout: done.payout, replayed: false };
  });
  mirror(user, result.credits);
  return { view: hiloView(result.s), credits: result.credits, payout: result.payout, replayed: result.replayed };
};

// ---------------------------------------------------------------- The Undertaker's Offer

const dlRules = () => casinoConfig.deal;

interface DealState {
  /** The coffin the player keeps. */
  kept: number;
  /** The coffins opened, in order. */
  opened: number[];
  round: number;
  /** "open" (coffins to open this round), "offer" (the Undertaker's offer standing), "final" (keep or swap), "over". */
  phase: string;
  offer: number | null;
  /** The offers made and turned down. */
  offers: number[];
  /** How it ended: "deal", "keep" or "swap". */
  end?: string;
}

const prizeIn = (s: SessionRow, coffin: number) => dlRules().prizes[(s.layout.layout as number[])[coffin]];

const dlSealed = (s: SessionRow, st: DealState) => {
  const out: number[] = [];
  for (let c = 0; c < dlRules().prizes.length; c++) if (!st.opened.includes(c)) out.push(prizeIn(s, c));
  return out;
};

export const dealView = (s: SessionRow) => {
  const st = s.revealed as DealState;
  const over = s.status !== "open";
  const r = dlRules();
  const view: Record<string, unknown> = {
    session_id: Number(s.id),
    stake: s.stake,
    status: s.status,
    kept: st.kept,
    opened: st.opened.map((c) => [c, prizeIn(s, c)]),
    round: st.round,
    rounds: r.rounds.length,
    phase: st.phase,
    offer: st.offer,
    offers: st.offers,
    to_open: st.phase === "open" ? openedBy(r, st.round) - st.opened.length : 0,
    // the prizes still sealed (the board), smallest first: which is where is the secret
    sealed: dlSealed(s, st).sort((a, b) => a - b),
    end: st.end ?? null,
    hash: s.config.hash,
    nonce: s.config.nonce,
  };
  if (over) view.prizes = (s.layout.layout as number[]).map((i) => r.prizes[i]);
  return view;
};

export const openDeal = async (userid: number) => {
  const s = await openSession(userid, "deal");
  return s ? dealView(s) : null;
};

/** Starts a game with the coffin the player keeps (the bet taken, the prizes sealed in the coffins). */
export const startDeal = async (user: User, requestId: string, stake: number, coffin: number) => {
  if (!Number.isInteger(coffin) || coffin < 0 || coffin >= dlRules().prizes.length) throw casinoErr("Pick a coffin.");
  const r = await startSession(user, "deal", requestId, stake, (rng, seed, luck) => {
    let layout = dealLayout(dlRules(), rng);
    let lucky = false;
    // (the coffin the player keeps is known: luck's measure is its prize)
    if (luckRoll(luck, rng)) {
      const other = dealLayout(dlRules(), rng);
      if (dlRules().prizes[other[coffin]] > dlRules().prizes[layout[coffin]]) {
        layout = other;
        lucky = true;
      }
    }
    const st: DealState = { kept: coffin, opened: [], round: 0, phase: "open", offer: null, offers: [] };
    return {
      config: {},
      layout: { layout },
      revealed: st,
      hash: hashSeed(`${seed.server_seed}:${seed.client_seed}:${seed.nonce}:${layout.join(",")}`),
      lucky,
    };
  });
  mirror(user, r.credits);
  return { view: dealView(r.s), credits: r.credits, replayed: r.replayed };
};

const dlSettle = async (em: Em, s: SessionRow, mult: number, end: string) => {
  const st = s.revealed as DealState;
  st.phase = "over";
  st.end = end;
  await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb) WHERE id = ? RETURNING id`, [JSON.stringify(st), s.id]);
  const prizes = (s.layout.layout as number[]).map((i) => dlRules().prizes[i]);
  return settleSession(em, s, s.stake * mult, s.stake, { prizes, kept: st.kept, opened: st.opened, offers: st.offers, end, multiplier: mult }, mult > 0 ? "won" : "lost");
};

/** Opens a coffin (not the kept one); the round's last makes the Undertaker's offer. */
export const openDealCoffin = async (user: User, sessionId: number, coffin: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId, "deal");
    const st = s.revealed as DealState;
    if (s.status !== "open") return { s, credits: await balance(em, user.userid) };
    if (st.phase !== "open") throw casinoErr(st.phase === "offer" ? "Answer the Undertaker first: deal or no deal?" : "Keep your coffin or swap it.", Status.CONFLICT);
    if (!Number.isInteger(coffin) || coffin < 0 || coffin >= dlRules().prizes.length || coffin === st.kept || st.opened.includes(coffin)) throw casinoErr("Open one of the other sealed coffins.", Status.CONFLICT);
    st.opened.push(coffin);
    if (st.opened.length >= openedBy(dlRules(), st.round)) {
      st.phase = "offer";
      st.offer = dealOffer(dlRules(), st.round, dlSealed(s, st));
    }
    await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb), updated_at = now() WHERE id = ? RETURNING id`, [JSON.stringify(st), s.id]);
    return { s, credits: await balance(em, user.userid) };
  });
  mirror(user, result.credits);
  return { view: dealView(result.s), credits: result.credits };
};

/** The player's answer: "deal" or "nodeal" to an offer; "keep" or "swap" at the end. */
export const decideDeal = async (user: User, sessionId: number, choice: string) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId, "deal");
    const st = s.revealed as DealState;
    if (s.status !== "open") {
      const bet = await sqlAll<{ payout: number }>(em, `SELECT payout FROM bym.casino_bet WHERE id = ?`, [s.bet_id]);
      return { s, credits: await balance(em, user.userid), payout: bet[0]?.payout ?? 0 as number | null };
    }
    if (st.phase === "offer" && (choice === "deal" || choice === "nodeal")) {
      if (choice === "deal") {
        const done = await dlSettle(em, s, Number(st.offer), "deal");
        return { s, credits: done.credits, payout: done.payout as number | null };
      }
      st.offers.push(Number(st.offer));
      st.offer = null;
      st.round++;
      st.phase = st.round < dlRules().rounds.length ? "open" : "final";
      await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb), updated_at = now() WHERE id = ? RETURNING id`, [JSON.stringify(st), s.id]);
      return { s, credits: await balance(em, user.userid), payout: null as number | null };
    }
    if (st.phase === "final" && (choice === "keep" || choice === "swap")) {
      let coffin = st.kept;
      if (choice === "swap") {
        for (let c = 0; c < dlRules().prizes.length; c++) if (c !== st.kept && !st.opened.includes(c)) coffin = c;
        st.kept = coffin;
      }
      const done = await dlSettle(em, s, prizeIn(s, coffin), choice);
      return { s, credits: done.credits, payout: done.payout as number | null };
    }
    throw casinoErr(st.phase === "offer" ? "Deal or no deal?" : st.phase === "final" ? "Keep your coffin or swap it." : "Open the coffins first.", Status.CONFLICT);
  });
  mirror(user, result.credits);
  return { view: dealView(result.s), credits: result.credits, payout: result.payout };
};

// ---------------------------------------------------------------- left alone

/**
 * Settles card games left alone for their game's `idleHours` (all players', or one player's): blackjack's hands
 * stand and the dealer plays; Higher or Lower is cashed out if a guess was right, its bet given back if none
 * was made, lost never (a wrong guess has already ended it); The Undertaker's Offer pays the kept coffin's prize. A game being played at that moment is skipped.
 */
export const settleIdleCardGames = async (userid: number | null = null): Promise<number> => {
  let settled = 0;
  for (const game of ["blackjack", "hilo", "deal"] as Game[]) {
    const hours = game === "blackjack" ? bjRules().idleHours : game === "hilo" ? hlRules().idleHours : dlRules().idleHours;
    const ids = (await postgres.em.getConnection().execute(
      `SELECT id FROM bym.casino_session WHERE game = ? AND status = 'open' AND updated_at < now() - make_interval(hours => ?)${userid != null ? " AND user_id = ?" : ""} LIMIT 500`,
      userid != null ? [game, hours, userid] : [game, hours], "all")) as { id: string }[];
    for (const { id } of ids) {
      try {
        await postgres.em.fork().transactional(async (em) => {
          const rows = await sqlAll<SessionRow>(em,
            `SELECT * FROM bym.casino_session WHERE id = ? AND status = 'open' AND updated_at < now() - make_interval(hours => ?) FOR UPDATE SKIP LOCKED`, [id, hours]);
          if (!rows.length) return;
          const s = rows[0];
          if (game === "blackjack") {
            const t = s.revealed as Table;
            for (const h of t.hands) h.done = true;
            await bjSettle(em, s);
          } else if (game === "hilo") {
            await hlSettle(em, s, false);
          } else {
            // (the kept coffin is opened: as if the player had kept it to the end)
            await dlSettle(em, s, prizeIn(s, (s.revealed as DealState).kept), "keep");
          }
          settled++;
        });
      } catch (e) {
        logger.error(`Card games: could not settle idle ${game} game ${id}: ${e}`);
      }
    }
  }
  return settled;
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every 10 minutes, settles idle card games (started with the server, with startCasinoJobs). */
export const startCardGameJobs = () => {
  if (timer) return;
  const run = () =>
    settleIdleCardGames()
      .then((n) => {
        if (n) logger.info(`Card games: ${n} idle game(s) settled`);
      })
      .catch((e) => logger.error(`Card games: idle settlement failed: ${e}`));
  timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 40 * 1000).unref?.();
};
