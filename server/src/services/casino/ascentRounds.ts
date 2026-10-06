import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { casinoErr } from "./access.js";
import { hashSeed, newServerSeed, roundPayout } from "./rng.js";
import { sqlAll, type Em } from "./wallet.js";
import { ascentCrash, ascentFlightMs, ascentMultiplier } from "./games/ascent.js";

/**
 * Balthazar's Ascent: one round at a time for every player. Rounds are rows of casino_round (game
 * 'ascent'); a loop on the server (every 200 ms, one server at a time: a transaction-level advisory lock)
 * moves the latest round on: betting -> running (Balthazar flies) -> settled (shot down), pays automatic
 * cash-outs as the multiplier passes them, settles what is left at the crash, and opens the next round.
 * The crash point is drawn from the round's seed when the round is made; only the seed's hash is shown
 * until the crash (and the flight's end time never leaves the server).
 */

const rules = () => casinoConfig.ascent;
const LOCK = 1410001;

interface RoundRow {
  id: string;
  seed: string;
  seed_hash: string;
  params: { crash: number; flight_ms: number };
  result: { crash: number; seed: string } | null;
  betting_opens_at: Date;
  starts_at: Date;
  ends_at: Date | null;
  status: "betting" | "running" | "settled";
}

interface BetRow {
  id: string;
  user_id: number;
  stake: number;
  payout: number;
  multiplier: string;
  outcome: { auto?: number | null; cashed?: number; how?: string; lost?: boolean };
  status: string;
}

const ms = (d: Date | string | null) => (d == null ? 0 : new Date(d).getTime());

const createRound = async (em: Em, opensAt: number): Promise<RoundRow> => {
  const seed = newServerSeed();
  const crash = ascentCrash(rules(), seed);
  const flight = ascentFlightMs(rules(), crash);
  const starts = opensAt + rules().bettingSeconds * 1000;
  const rows = await sqlAll<RoundRow>(em,
    `INSERT INTO bym.casino_round (game, seed, seed_hash, params, betting_opens_at, starts_at, ends_at, status)
     VALUES ('ascent', ?, ?, CAST(? AS jsonb), to_timestamp(? / 1000.0), to_timestamp(? / 1000.0), to_timestamp(? / 1000.0), 'betting') RETURNING *`,
    [seed, hashSeed(seed), JSON.stringify({ crash, flight_ms: flight }), opensAt, starts, starts + flight]);
  return rows[0];
};

/** Pays a bet at a multiplier (its cash-out), in the caller's transaction. */
const payBet = async (em: Em, r: RoundRow, bet: BetRow, mult: number, how: string) => {
  let payout = roundPayout(r.seed, bet.id, bet.stake * mult);
  if (casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
  await sqlAll(em, `UPDATE bym.save SET credits = credits + ? WHERE userid = ? AND type = ? RETURNING credits`, [payout, bet.user_id, BaseType.MAIN]);
  await sqlAll(em,
    `UPDATE bym.casino_bet SET payout = ?, multiplier = ?, status = 'settled', settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
    [payout, mult.toFixed(2), JSON.stringify({ cashed: mult, how }), bet.id]);
  noteCasinoWin({ userid: bet.user_id, game: "ascent", stake: bet.stake, payout });
  return payout;
};

/** One step of the loop: the latest round moved on as far as the clock says. */
export const tickAscent = async (): Promise<void> => {
  await postgres.em.fork().transactional(async (em) => {
    const lock = await sqlAll<{ ok: boolean }>(em, `SELECT pg_try_advisory_xact_lock(?) AS ok`, [LOCK]);
    if (!lock[0]?.ok) return;
    const now = Date.now();
    const rows = await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'ascent' ORDER BY id DESC LIMIT 1 FOR UPDATE`);
    let r = rows[0];
    if (!r) {
      await createRound(em, now);
      return;
    }
    if (r.status === "betting" && now >= ms(r.starts_at)) {
      await sqlAll(em, `UPDATE bym.casino_round SET status = 'running' WHERE id = ? RETURNING id`, [r.id]);
      r = { ...r, status: "running" };
    }
    if (r.status !== "running") return;
    const crash = Number(r.params.crash);
    const ended = now >= ms(r.ends_at);
    const reached = ended ? crash : Math.min(crash, ascentMultiplier(rules(), now - ms(r.starts_at)));
    // automatic cash-outs the multiplier has passed
    const autos = await sqlAll<BetRow>(em,
      `SELECT * FROM bym.casino_bet WHERE round_id = ? AND status = 'open' AND (outcome->>'auto') IS NOT NULL AND (outcome->>'auto')::numeric <= ? FOR UPDATE`,
      [r.id, reached]);
    for (const b of autos) await payBet(em, r, b, Number(b.outcome.auto), "auto");
    if (!ended) return;
    // shot down: the rest lose
    await sqlAll(em,
      `UPDATE bym.casino_bet SET payout = 0, multiplier = 0, status = 'settled', settled_at = now(), outcome = outcome || '{"lost": true}'::jsonb WHERE round_id = ? AND status = 'open' RETURNING id`,
      [r.id]);
    await sqlAll(em, `UPDATE bym.casino_round SET status = 'settled', result = CAST(? AS jsonb) WHERE id = ? RETURNING id`,
      [JSON.stringify({ crash, seed: r.seed }), r.id]);
    await createRound(em, Math.max(now, ms(r.ends_at)) + rules().resultSeconds * 1000);
  });
};

let timer: ReturnType<typeof setInterval> | null = null;
let busy = false;

/** Starts the loop (with the server). */
export const startAscent = () => {
  if (timer) return;
  timer = setInterval(() => {
    if (busy || !casinoConfig.enabled) return;
    busy = true;
    tickAscent()
      .catch((e) => logger.error(`Balthazar's Ascent: ${e}`))
      .finally(() => {
        busy = false;
      });
  }, 200);
  timer.unref?.();
};

const latest = async (em: Em, lock: boolean): Promise<RoundRow | null> =>
  (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'ascent' ORDER BY id DESC LIMIT 1${lock ? " FOR UPDATE" : ""}`))[0] ?? null;

/** A bet on the round now open for bets (one a player a round), with an automatic cash-out or none. */
export const betAscent = async (user: User, requestId: string, roundId: number, stake: number, auto: number | null) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const seen = await sqlAll<{ id: string; game: string; round_id: string; outcome: BetRow["outcome"] }>(em,
      `SELECT id, game, round_id, outcome FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    const bal = async () => (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]))[0]?.credits ?? 0;
    if (seen.length) {
      if (seen[0].game !== "ascent") throw casinoErr("That request was already used.", Status.CONFLICT);
      return { round_id: Number(seen[0].round_id), stake, auto: seen[0].outcome.auto ?? null, credits: await bal(), replayed: true };
    }
    const r = await latest(em, true);
    const now = Date.now();
    if (!r || Number(r.id) !== roundId || r.status !== "betting" || now < ms(r.betting_opens_at) || now >= ms(r.starts_at)) {
      throw casinoErr("Bets are closed for this flight. Wait for the next one.", Status.CONFLICT);
    }
    const mine = await sqlAll(em, `SELECT id FROM bym.casino_bet WHERE round_id = ? AND user_id = ?`, [r.id, user.userid]);
    if (mine.length) throw casinoErr("You already have a bet on this flight.", Status.CONFLICT);
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`, [stake, user.userid, BaseType.MAIN, stake]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    await sqlAll(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, round_id, stake, payout, multiplier, outcome, seed_hash, status)
       VALUES (?, ?, 'ascent', ?, ?, 0, 0, CAST(? AS jsonb), ?, 'open') RETURNING id`,
      [user.userid, requestId, r.id, stake, JSON.stringify({ auto }), r.seed_hash]);
    return { round_id: Number(r.id), stake, auto, credits: paid[0].credits, replayed: false };
  });
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * Cashes out by hand, at the multiplier on the server's clock now. Too late (the flight over, or the
 * multiplier at or past the crash point): the bet stays lost. An automatic cash-out passed already: that.
 */
export const cashoutAscent = async (user: User, roundId: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const rows = await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE id = ? AND game = 'ascent' FOR UPDATE`, [roundId]);
    const r = rows[0];
    if (!r) throw casinoErr("That flight could not be found.", Status.NOT_FOUND);
    const bets = await sqlAll<BetRow>(em, `SELECT * FROM bym.casino_bet WHERE round_id = ? AND user_id = ? FOR UPDATE`, [r.id, user.userid]);
    const bet = bets[0];
    if (!bet) throw casinoErr("You have no bet on this flight.", Status.CONFLICT);
    const bal = async () => (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]))[0]?.credits ?? 0;
    if (bet.status !== "open") {
      return { cashed: bet.outcome.cashed ?? null, payout: bet.payout, lost: Boolean(bet.outcome.lost), credits: await bal(), replayed: true };
    }
    const now = Date.now();
    if (r.status !== "running" || now < ms(r.starts_at)) throw casinoErr("Balthazar has not taken off yet.", Status.CONFLICT);
    const crash = Number(r.params.crash);
    const m = ascentMultiplier(rules(), now - ms(r.starts_at));
    if (now >= ms(r.ends_at) || m >= crash) {
      // too late: settled with the round
      return { cashed: null, payout: 0, lost: true, credits: await bal(), replayed: false };
    }
    const at = bet.outcome.auto != null && Number(bet.outcome.auto) <= m ? Number(bet.outcome.auto) : m;
    const payout = await payBet(em, r, bet, at, at === m ? "hand" : "auto");
    return { cashed: at, payout, lost: false, credits: await bal(), replayed: false };
  });
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * What every player sees: the round (betting, flying, or shot down with its crash point and seed), the
 * last crash points, the players on it and their cash-outs, the player's own bet, and the server's clock.
 */
export const ascentState = async (userid: number) => {
  const conn = postgres.em.getConnection();
  const q = async <T>(sql: string, p: unknown[] = []) => (await conn.execute(sql, p, "all")) as T[];
  const now = Date.now();
  const rounds = await q<RoundRow>(`SELECT * FROM bym.casino_round WHERE game = 'ascent' ORDER BY id DESC LIMIT 2`);
  let r = rounds[0] ?? null;
  // between rounds: the last one's result is shown until the next opens
  if (r && r.status === "betting" && now < ms(r.betting_opens_at) && rounds[1]) r = rounds[1];
  const history = (await q<{ id: string; result: { crash: number } }>(
    `SELECT id, result FROM bym.casino_round WHERE game = 'ascent' AND status = 'settled' ORDER BY id DESC LIMIT ?`, [rules().history]))
    .map((h) => ({ round_id: Number(h.id), crash: Number(h.result?.crash) }));
  if (!r) return { server_ts: now, phase: "waiting", history, players: [], my_bet: null, rules: publicRules() };
  const phase = r.status === "settled" ? "crashed" : r.status === "running" ? "flying" : now < ms(r.betting_opens_at) ? "waiting" : "betting";
  const bets = await q<BetRow & { username: string }>(
    `SELECT b.id, b.user_id, b.stake, b.payout, b.multiplier, b.outcome, b.status, u.username FROM bym.casino_bet b JOIN bym."user" u ON u.userid = b.user_id
     WHERE b.round_id = ? ORDER BY b.stake DESC, b.id LIMIT ?`, [r.id, rules().listed]);
  const mine = (await q<BetRow>(`SELECT * FROM bym.casino_bet WHERE round_id = ? AND user_id = ?`, [r.id, userid]))[0];
  const count = (await q<{ n: string }>(`SELECT count(*) AS n FROM bym.casino_bet WHERE round_id = ?`, [r.id]))[0];
  return {
    server_ts: now,
    phase,
    round_id: Number(r.id),
    seed_hash: r.seed_hash,
    betting_opens_at: ms(r.betting_opens_at),
    starts_at: ms(r.starts_at),
    ...(r.status === "settled" ? { crash: Number(r.result?.crash), seed: r.result?.seed, ended_at: ms(r.ends_at) } : {}),
    history,
    players: bets.map((b) => ({
      name: b.username,
      stake: b.stake,
      cashed: b.outcome.cashed ?? null,
      payout: b.status === "settled" ? b.payout : null,
      lost: Boolean(b.outcome.lost),
      me: b.user_id === userid,
    })),
    player_count: Number(count?.n ?? 0),
    my_bet: mine ? { stake: mine.stake, auto: mine.outcome.auto ?? null, cashed: mine.outcome.cashed ?? null, payout: mine.payout, status: mine.status, lost: Boolean(mine.outcome.lost) } : null,
    rules: publicRules(),
  };
};

const publicRules = () => ({ growth: rules().growth, rtp: rules().rtp, max_crash: rules().maxCrash, min_auto: rules().minAuto, betting_seconds: rules().bettingSeconds, result_seconds: rules().resultSeconds });
