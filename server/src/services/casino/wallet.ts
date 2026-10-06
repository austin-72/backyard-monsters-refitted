import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { casinoErr } from "./access.js";
import { configuredAdmins } from "../admin/admin.js";
import { fairStream, hashSeed, newClientSeed, newServerSeed, wholeShiny, type FairStream } from "./rng.js";

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
    const played = play(rng);
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
    if (played.payout != null || bonus > 0) multiplier = Math.min(payout / stake, 99_999_999);
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? + ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
      [charge, payout, user.userid, BaseType.MAIN, charge]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    await sqlAll(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, seed_hash, client_seed, nonce, status, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, 'settled', now()) RETURNING id`,
      [user.userid, requestId, game, charge, payout, multiplier.toFixed(2), JSON.stringify(outcome), seed.server_seed_hash, seed.client_seed, seed.nonce]);
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
 * Changes the player's seeds: the server seed in use is shown (so every bet made on it can be checked)
 * and replaced with a new one, whose hash is shown; the client seed becomes the one given (or a new
 * random one); the count of bets starts again.
 */
export const rotateSeed = async (userid: number, clientSeed: string | null) =>
  postgres.em.fork().transactional(async (em) => {
    const old = await lockSeed(em, userid);
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

/** The player's last bets, newest first. */
export const betHistory = async (userid: number, limit: number) =>
  (await postgres.em.getConnection().execute(
    `SELECT id, game, stake, payout, multiplier, nonce, client_seed, seed_hash, created_at FROM bym.casino_bet WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userid, limit], "all")) as Record<string, unknown>[];

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
 * the stake in the last 24 hours) and the last jackpots. Names only.
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
  return {
    bets: (await q("TRUE", "b.id DESC", limit)).map(view),
    top: (await q("b.created_at > now() - interval '24 hours' AND b.payout > b.stake", "b.payout - b.stake DESC, b.id DESC", 10)).map(view),
    jackpots: (await q("(b.outcome->>'line') = 'jackpot'", "b.id DESC", 5)).map(view),
  };
};

/** The Magma Slots jackpot pool. */
export const jackpotPool = async (): Promise<number> => {
  const rows = (await postgres.em.getConnection().execute(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`, [], "all")) as { pool: string }[];
  return rows.length ? Math.floor(Math.min(Number(rows[0].pool), casinoConfig.jackpotMax)) : casinoConfig.jackpotSeed;
};

/**
 * The Slots jackpot's part of a spin, in the spin's transaction: `jackpotRate` of the stake goes into the
 * pool (the row stays locked to the end, so spins everywhere take their turn at it); on three King
 * Wormzer the pool is paid once for every `jackpotFullBet` staked (a smaller bet wins that share of it,
 * a bigger one more than all of it) and goes back to the seed if less is left. The pool stops growing at `jackpotMax` (what goes in past it is the house's).
 * Two winners at once cannot both be paid the same pool. Korath's Fortune shares the pool: the whole stake
 * goes in at the same rate, and a jackpot line wins the share of its own bet (`lineStake`, a fifth of the
 * stake), so a Shiny bet on either machine is worth the same part of the pool.
 */
export const settleJackpot = async (em: Em, stake: number, won: boolean, userid: number, lineStake: number = stake): Promise<{ bonus: number; pool: number; share: number }> => {
  const rules = casinoConfig.slots;
  const add = stake * rules.jackpotRate;
  const rows = await sqlAll<{ pool: string }>(em,
    `INSERT INTO bym.casino_jackpot (id, pool) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET pool = LEAST(bym.casino_jackpot.pool + ?, ?), updated_at = now() RETURNING pool`,
    [Math.min(casinoConfig.jackpotSeed + add, casinoConfig.jackpotMax), add, casinoConfig.jackpotMax]);
  const pool = Number(rows[0].pool);
  if (!won) return { bonus: 0, pool: Math.floor(pool), share: 0 };
  const share = lineStake / rules.jackpotFullBet;
  const bonus = Math.floor(pool * share);
  const left = Math.max(casinoConfig.jackpotSeed, pool - bonus);
  await sqlAll(em, `UPDATE bym.casino_jackpot SET pool = ?, last_winner_user_id = ?, last_won_at = now(), updated_at = now() WHERE id = 1 RETURNING pool`, [left, userid]);
  return { bonus, pool: Math.floor(left), share };
};
