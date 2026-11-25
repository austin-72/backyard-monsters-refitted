import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { casinoErr } from "./access.js";
import { configuredAdmins } from "../admin/admin.js";
import { fairStream, hashSeed, newClientSeed, newServerSeed, wholeShiny, type FairStream } from "./rng.js";
import { luckFor, luckRoll } from "./luck.js";
import { sharedView } from "./sharedView.js";

export type Em = typeof postgres.em;

export const sqlAll = async <T = Record<string, unknown>>(em: Em, sql: string, params: unknown[] = []) =>
  (await em.getConnection().execute(sql, params, "all", em.getTransactionContext())) as T[];

export interface SeedRow {
  user_id: number;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
}

/**
 * The player's seed row, locked for the rest of the transaction (made on the first bet). Locking it
 * first puts one player's bets one after the other: two sent at once cannot both spend the same Shiny,
 * and a request sent twice finds its first answer.
 */
export const lockSeed = async (em: Em, userid: number): Promise<SeedRow> => {
  let rows = await sqlAll<SeedRow>(em, `SELECT * FROM bym.casino_seed WHERE user_id = ? FOR UPDATE`, [userid]);
  if (!rows.length) {
    const seed = newServerSeed();
    await sqlAll(em, `INSERT INTO bym.casino_seed (user_id, server_seed, server_seed_hash, client_seed, nonce) VALUES (?, ?, ?, ?, 0) ON CONFLICT (user_id) DO NOTHING RETURNING user_id`,
      [userid, seed, hashSeed(seed), newClientSeed()]);
    rows = await sqlAll<SeedRow>(em, `SELECT * FROM bym.casino_seed WHERE user_id = ? FOR UPDATE`, [userid]);
  }
  return rows[0];
};

/** The player's seed row without locking (for showing it), made if there is none. */
export const readSeed = async (userid: number): Promise<SeedRow> =>
  postgres.em.fork().transactional((em) => lockSeed(em, userid));

export interface BetResult<T> {
  outcome: T;
  stake: number;
  payout: number;
  multiplier: number;
  credits: number;
  nonce: number;
  /** True when this request_id had been played before: the first answer, nothing played again. */
  replayed: boolean;
}

/**
 * What a game returns for one bet: the multiplier paid (total, stake included) and what to show; or,
 * for a slip of several bets (Roulette), the Shiny paid in all.
 */
export interface Played<T> {
  multiplier: number;
  outcome: T;
  payout?: number;
  /**
   * A result luck never draws again, whatever it pays on its own: a jackpot (its multiplier is 0, the pool is
   * paid on top by `settle`; 8 October, the user's: "Fix it so they can jackpot").
   */
  keep?: boolean;
}

/**
 * Settles anything a bet shares with other players, inside the bet's transaction (the Slots jackpot):
 * returns Shiny paid on top of the game's own payout and the outcome to keep and show.
 */
export type Settle<T> = (em: Em, played: Played<T>, stake: number, userid: number) => Promise<{ bonus: number; outcome: T }>;

/**
 * Plays one bet of a game settled at once (Magma Drop, Scratchers, Roulette, Slots), all in one
 * transaction: the player's seed row locked; a request_id seen before answered as it was the first time;
 * the stake checked against the balance; the game played on the next nonce; the balance debited and
 * paid in one update; the bet written to the ledger; the nonce moved on. Any failure undoes it all.
 */
export const playInstant = async <T>(user: User, game: string, requestId: string, stake: number, play: (rng: FairStream) => Played<T>, settle?: Settle<T>, free = false): Promise<BetResult<T>> => {
  // (a free bet, Moloch's Favor, is played and paid at `stake` but costs nothing and is written with no stake)
  const charge = free ? 0 : stake;
  const result = await postgres.em.fork().transactional(async (em) => {
    const seed = await lockSeed(em, user.userid);
    const seen = await sqlAll<{ outcome: T; stake: number; payout: number; multiplier: string; nonce: number; game: string }>(em,
      `SELECT outcome, stake, payout, multiplier, nonce, game FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    if (seen.length) {
      if (seen[0].game !== game) throw casinoErr("That request was already used.", Status.CONFLICT);
      const bal = await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]);
      return { outcome: seen[0].outcome, stake: seen[0].stake, payout: seen[0].payout, multiplier: Number(seen[0].multiplier), credits: bal[0]?.credits ?? 0, nonce: seen[0].nonce, replayed: true };
    }
    const bal = await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!bal.length) throw casinoErr("Your yard could not be found.", Status.CONFLICT);
    if (bal[0].credits < charge) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    const rng = fairStream(seed.server_seed, seed.client_seed, seed.nonce);
    let played = play(rng);
    // luck (silent, luck.ts): a result that pays back less than the stake is drawn again, once, with the
    // bet's next numbers, with the chance of the player's luck (never a jackpot: `keep`)
    const luck = await luckFor(em, user.userid, stake);
    let lucky = false;
    if (luck > 0) {
      const back = played.payout != null ? played.payout : stake * Math.min(played.multiplier, casinoConfig.maxMultiplier);
      if (!played.keep && back < stake && luckRoll(luck, rng)) {
        played = play(rng);
        lucky = true;
      }
    }
    let multiplier = Math.min(played.multiplier, casinoConfig.maxMultiplier);
    // part of a Shiny paid by chance, from the bet's next number (wholeShiny)
    let payout = wholeShiny(played.payout != null ? Math.min(played.payout, stake * casinoConfig.maxMultiplier) : stake * multiplier, rng.next());
    if (casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
    let outcome = played.outcome;
    let bonus = 0;
    if (settle) {
      // (a jackpot is the pool's, not the stake's: it is not held to the caps)
      const s = await settle(em, played, stake, user.userid);
      bonus = s.bonus;
      payout += s.bonus;
      outcome = s.outcome;
    }
    // (Shiny and payouts are 32-bit in the database: a win, the jackpot's bonus with it, held to the most there can
    // be, and the balance too (LEAST below). One over it threw after the game was drawn, which undid it all and so
    // told the player the next spin was a big one; on Ascent and Dice it stopped the round settling; 9 October)
    payout = Math.min(payout, 2147483647);
    if (played.payout != null || bonus > 0) multiplier = Math.min(payout / stake, 99_999_999);
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = LEAST(credits::bigint - ? + ?, 2147483647) WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
      [charge, payout, user.userid, BaseType.MAIN, charge]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    await sqlAll(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, seed_hash, client_seed, nonce, status, settled_at, luck, lucky)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, 'settled', now(), ?, ?) RETURNING id`,
      [user.userid, requestId, game, charge, payout, multiplier.toFixed(2), JSON.stringify(outcome), seed.server_seed_hash, seed.client_seed, seed.nonce, luck.toFixed(4), lucky]);
    await sqlAll(em, `UPDATE bym.casino_seed SET nonce = nonce + 1 WHERE user_id = ? RETURNING nonce`, [user.userid]);
    return { outcome, stake, payout, multiplier, credits: paid[0].credits, nonce: seed.nonce, replayed: false, jackpot: bonus > 0 };
  });
  // A jackpot or a big win is announced in Global chat (once the bet is written).
  if (!result.replayed) noteCasinoWin({ userid: user.userid, game, stake: result.stake, payout: result.payout, jackpot: Boolean((result as { jackpot?: boolean }).jackpot) });
  // The request's own copy of the save (if loaded) must not later write back an older balance.
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * Inferno-only (QoL #504): the player's bets still open on round `roundId` (Magma Derby, Balthazar's Ascent, Devil's
 * Dice) paid back, in the caller's transaction, which has the round locked and has checked it hasn't started. Each is
 * kept in the ledger as 'refunded', paid back its stake ("taken_back" in its outcome; the History tab shows it as
 * given back, and refunded bets count nowhere else: luck, leaderboards, the round's players). Only bets still open
 * are touched, by the one UPDATE, so a bet is paid back once however often it is asked for.
 */
export const refundOpenBets = async (em: Em, roundId: string | number, userid: number): Promise<{ count: number; stake: number; credits: number }> => {
  const rows = await sqlAll<{ stake: number }>(em,
    `UPDATE bym.casino_bet SET status = 'refunded', payout = stake, multiplier = 1, settled_at = now(), outcome = outcome || '{"taken_back": true}'::jsonb
      WHERE round_id = ? AND user_id = ? AND status = 'open' RETURNING stake`,
    [roundId, userid]);
  const stake = rows.reduce((a, b) => a + (Number(b.stake) || 0), 0);
  if (stake > 0) {
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = LEAST(credits::bigint + ?, 2147483647) WHERE userid = ? AND type = ? RETURNING credits`, [stake, userid, BaseType.MAIN]);
    return { count: rows.length, stake, credits: paid[0]?.credits ?? 0 };
  }
  const bal = await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [userid, BaseType.MAIN]);
  return { count: rows.length, stake, credits: bal[0]?.credits ?? 0 };
};

/**
 * Changes the player's seeds: the server seed in use is shown (so every bet made on it can be checked)
 * and replaced with a new one, whose hash is shown; the client seed becomes the one given (or a new
 * random one); the count of bets starts again.
 */
export const rotateSeed = async (userid: number, clientSeed: string | null) =>
  postgres.em.fork().transactional(async (em) => {
    const old = await lockSeed(em, userid);
    // (13 October) not while a game drawn from this seed is still open (Bone Pile, Higher or Lower, the Undertaker's
    // Offer, Cinderjack): the seed shown would give away its hidden piles, cards or coffins. (A game is started under
    // the seed row's lock, as this is, so none can start between this check and the new seed.)
    const open = await sqlAll<{ game: string }>(em, `SELECT game FROM bym.casino_session WHERE user_id = ? AND status = 'open' LIMIT 1`, [userid]);
    if (open.length) throw casinoErr("Finish the game you have open first: its seed is shown when you change seeds.", Status.CONFLICT);
    await sqlAll(em, `INSERT INTO bym.casino_seed_reveal (user_id, server_seed, server_seed_hash, client_seed, nonces) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      [userid, old.server_seed, old.server_seed_hash, old.client_seed, old.nonce]);
    const seed = newServerSeed();
    const client = clientSeed || newClientSeed();
    await sqlAll(em, `UPDATE bym.casino_seed SET server_seed = ?, server_seed_hash = ?, client_seed = ?, nonce = 0, created_at = now() WHERE user_id = ? RETURNING user_id`,
      [seed, hashSeed(seed), client, userid]);
    return { revealed: { server_seed: old.server_seed, server_seed_hash: old.server_seed_hash, client_seed: old.client_seed, nonces: old.nonce }, server_seed_hash: hashSeed(seed), client_seed: client, nonce: 0 };
  });

/** Seeds rotated out, newest first. */
export const revealedSeeds = async (userid: number, limit = 10) =>
  (await postgres.em.getConnection().execute(
    `SELECT server_seed, server_seed_hash, client_seed, nonces, revealed_at FROM bym.casino_seed_reveal WHERE user_id = ? ORDER BY revealed_at DESC LIMIT ?`,
    [userid, limit], "all")) as { server_seed: string; server_seed_hash: string; client_seed: string; nonces: number; revealed_at: string }[];

/**
 * The player's last bets, newest first. (QoL #392) `before`, a bet's id: the bets before it (the History tab's Older);
 * and each bet's outcome as its short fields only (a cup, a risk, a winner, a cash-out: strings, numbers, true/false, and
 * lists of up to five of them), for the bet's details: not its paths, grids, cards or layouts.
 */
export const betHistory = async (userid: number, limit: number, before = 0) =>
  (await postgres.em.getConnection().execute(
    `SELECT id, game, stake, payout, multiplier, nonce, client_seed, seed_hash, created_at, status,
            CASE WHEN jsonb_typeof(outcome) = 'object' THEN (
              SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(outcome) e
               WHERE CASE WHEN jsonb_typeof(e.value) = 'array'
                          THEN jsonb_array_length(e.value) <= 5
                               AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(e.value) x WHERE jsonb_typeof(x) IN ('object', 'array'))
                          ELSE jsonb_typeof(e.value) IN ('string', 'number', 'boolean') END
            ) END AS outcome
       FROM bym.casino_bet WHERE user_id = ? ${before > 0 ? "AND id < ?" : ""} ORDER BY id DESC LIMIT ?`,
    before > 0 ? [userid, before, limit] : [userid, limit], "all")) as Record<string, unknown>[];

/** Whether the player's Moloch's Favor for today (UTC) is still there. */
export const favorReady = async (userid: number): Promise<boolean> => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT favor_day = (now() AT TIME ZONE 'utc')::date AS used FROM bym.casino_player WHERE user_id = ?`, [userid], "all")) as { used: boolean }[];
  return !rows[0]?.used;
};

type LiveRow = { id: string; game: string; stake: number; payout: number; multiplier: string; status: string; created_at: string; user_id: number; username: string; jackpot: boolean | null; free_bet: string | null };

/**
 * The Live tab, every player's bets but the admins' (infernoOnlyConfig.admins): the latest, newest first
 * (what it paid; nothing yet on a Derby or Ascent bet still open), the day's biggest wins (the most over
 * the stake in the last 24 hours) and the last jackpots. Names only. Read once for everyone with the tab open every
 * second and a half (sharedView.ts; 9 October): the day's biggest wins go through every winning bet of the day.
 */
export const liveBets = async (userid: number, limit: number) => {
  const admins = configuredAdmins();
  const notAdmin = admins.length ? `AND u.username NOT IN (${admins.map(() => "?").join(", ")})` : "";
  const q = async (where: string, order: string, n: number) =>
    (await postgres.em.getConnection().execute(
      `SELECT b.id, b.game, b.stake, b.payout, b.multiplier, b.status, b.created_at, b.user_id, u.username,
              (b.outcome->>'line') = 'jackpot' AS jackpot, b.outcome->>'free_bet' AS free_bet
         FROM bym.casino_bet b JOIN bym."user" u ON u.userid = b.user_id
        WHERE ${where} ${notAdmin} ORDER BY ${order} LIMIT ?`,
      [...admins, n], "all")) as LiveRow[];
  const view = (b: LiveRow) => ({
    id: Number(b.id),
    name: b.username,
    me: b.user_id === userid,
    game: b.game,
    stake: b.stake,
    free_bet: b.free_bet != null ? Number(b.free_bet) : undefined,
    payout: b.payout,
    multiplier: Number(b.multiplier),
    open: b.status === "open",
    jackpot: Boolean(b.jackpot),
    at: new Date(b.created_at).getTime(),
  });
  const rows = await sharedView(`live:${limit}`, 1500, async () => ({
    bets: await q("TRUE", "b.id DESC", limit),
    top: await q("b.created_at > now() - interval '24 hours' AND b.payout > b.stake", "b.payout - b.stake DESC, b.id DESC", 10),
    jackpots: await q("(b.outcome->>'line') = 'jackpot'", "b.id DESC", 5),
  }));
  return {
    bets: rows.bets.map(view),
    top: rows.top.map(view),
    jackpots: rows.jackpots.map(view),
  };
};

/** The Magma Slots jackpot pool. */
export const jackpotPool = async (): Promise<number> => {
  const rows = (await postgres.em.getConnection().execute(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`, [], "all")) as { pool: string }[];
  return rows.length ? Math.floor(Math.min(Number(rows[0].pool), casinoConfig.jackpotMax)) : casinoConfig.jackpotSeed;
};

/**
 * The Slots jackpot's part of a spin that wins it, in the spin's transaction: the spin's `jackpotRate` of the
 * stake goes into the pool, and the pool is paid once for every `jackpotFullBet` staked (a smaller bet wins that
 * share of it, a bigger one more than all of it) and goes back to the seed if less is left. The row stays locked
 * to the end, so two winners at once cannot both be paid the same pool. Korath's Fortune shares the pool: the whole
 * stake goes in at the same rate, and a jackpot line wins the share of its own bet (`lineStake`, a fifth of the
 * stake), so a Shiny bet on either machine is worth the same part of the pool.
 *
 * A spin that does not win it adds its part after its bet is written (`feedJackpot`), not here: every spin on
 * the server used to lock the pool's row from here to the end of its transaction, so spins everywhere waited
 * their turn at it, each holding one of the database's connections, and with a few players on the slots the rest
 * of the server waited for connections too (9 October, the user's: "Make gambling not slow the server down for
 * other users").
 */
export const settleJackpot = async (em: Em, stake: number, won: boolean, userid: number, lineStake: number = stake): Promise<{ bonus: number; pool: number; share: number }> => {
  if (!won) return { bonus: 0, pool: 0, share: 0 };
  const rules = casinoConfig.slots;
  const add = stake * rules.jackpotRate;
  const rows = await sqlAll<{ pool: string }>(em,
    `INSERT INTO bym.casino_jackpot (id, pool) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET pool = LEAST(bym.casino_jackpot.pool + ?, ?), updated_at = now() RETURNING pool`,
    [Math.min(casinoConfig.jackpotSeed + add, casinoConfig.jackpotMax), add, casinoConfig.jackpotMax]);
  const pool = Number(rows[0].pool);
  const share = lineStake / rules.jackpotFullBet;
  const bonus = Math.floor(pool * share);
  const left = Math.max(casinoConfig.jackpotSeed, pool - bonus);
  await sqlAll(em, `UPDATE bym.casino_jackpot SET pool = ?, last_winner_user_id = ?, last_won_at = now(), updated_at = now() WHERE id = 1 RETURNING pool`, [left, userid]);
  return { bonus, pool: Math.floor(left), share };
};

/**
 * A spin's part of the pool (`jackpotRate` of `stake`) added once its bet is written, in one statement of its own
 * (its lock on the pool's row lasts only that statement); the pool after it. The pool stops growing at `jackpotMax`
 * (what goes in past it is the house's). Should the statement fail, the bet stands and the pool is only shown.
 */
export const feedJackpot = async (stake: number): Promise<number> => {
  const add = stake * casinoConfig.slots.jackpotRate;
  if (!(add > 0)) return jackpotPool();
  try {
    const rows = (await postgres.em.getConnection().execute(
      `INSERT INTO bym.casino_jackpot (id, pool) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET pool = LEAST(bym.casino_jackpot.pool + ?, ?), updated_at = now() RETURNING pool`,
      [Math.min(casinoConfig.jackpotSeed + add, casinoConfig.jackpotMax), add, casinoConfig.jackpotMax], "all")) as { pool: string }[];
    return Math.floor(Math.min(Number(rows[0].pool), casinoConfig.jackpotMax));
  } catch (e) {
    return jackpotPool();
  }
};
