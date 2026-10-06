import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { casinoErr } from "./access.js";
import { configuredAdmins } from "../admin/admin.js";
import { hashSeed, newServerSeed, roundPayout } from "./rng.js";
import { sqlAll, type Em } from "./wallet.js";
import { derbyRace, type DerbyRace } from "./games/derby.js";

/**
 * Magma Derby: a race every few minutes for every player (casino_round, game 'derby'). The race is
 * drawn from the round's seed when the round opens; the runners and their odds are shown for betting,
 * the finishing order and times only when the race starts, the seed when it is over. A loop on the server
 * (every 500 ms, one server at a time) starts races, settles them at the end and opens the next.
 */

const rules = () => casinoConfig.derby;
const LOCK = 1410002;

interface RoundRow {
  id: string;
  seed: string;
  seed_hash: string;
  params: DerbyRace;
  result: { order: string[]; seed: string } | null;
  betting_opens_at: Date;
  starts_at: Date;
  ends_at: Date;
  status: "betting" | "running" | "settled";
}

const ms = (d: Date | string | null) => (d == null ? 0 : new Date(d).getTime());

const createRound = async (em: Em, opensAt: number) => {
  const seed = newServerSeed();
  const race = derbyRace(rules(), seed);
  const starts = opensAt + rules().bettingSeconds * 1000;
  await sqlAll(em,
    `INSERT INTO bym.casino_round (game, seed, seed_hash, params, betting_opens_at, starts_at, ends_at, status)
     VALUES ('derby', ?, ?, CAST(? AS jsonb), to_timestamp(? / 1000.0), to_timestamp(? / 1000.0), to_timestamp(? / 1000.0), 'betting') RETURNING id`,
    [seed, hashSeed(seed), JSON.stringify(race), opensAt, starts, starts + rules().raceSeconds * 1000]);
};

/** One step of the loop. */
export const tickDerby = async (): Promise<void> => {
  await postgres.em.fork().transactional(async (em) => {
    const lock = await sqlAll<{ ok: boolean }>(em, `SELECT pg_try_advisory_xact_lock(?) AS ok`, [LOCK]);
    if (!lock[0]?.ok) return;
    const now = Date.now();
    const r = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'derby' ORDER BY id DESC LIMIT 1 FOR UPDATE`))[0];
    if (!r) {
      await createRound(em, now);
      return;
    }
    if (r.status === "betting" && now >= ms(r.starts_at)) {
      await sqlAll(em, `UPDATE bym.casino_round SET status = 'running' WHERE id = ? RETURNING id`, [r.id]);
      r.status = "running";
    }
    if (r.status !== "running" || now < ms(r.ends_at)) return;
    // the race is over: the winner's bets paid, the rest lost
    const race = r.params;
    const winner = race.order[0];
    const odds = race.runners.find((x) => x.id === winner)!.odds;
    const bets = await sqlAll<{ id: string; user_id: number; stake: number; outcome: { bets: { on: string; amount: number }[] } }>(em,
      `SELECT id, user_id, stake, outcome FROM bym.casino_bet WHERE round_id = ? AND status = 'open' FOR UPDATE`, [r.id]);
    for (const b of bets) {
      const on = b.outcome.bets.filter((x) => x.on === winner).reduce((a, x) => a + x.amount, 0);
      let payout = on > 0 ? roundPayout(r.seed, b.id, on * odds) : 0;
      if (casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
      if (payout > 0) await sqlAll(em, `UPDATE bym.save SET credits = credits + ? WHERE userid = ? AND type = ? RETURNING credits`, [payout, b.user_id, BaseType.MAIN]);
      await sqlAll(em,
        `UPDATE bym.casino_bet SET payout = ?, multiplier = ?, status = 'settled', settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
        [payout, Math.min(payout / b.stake, 99_999_999).toFixed(2), JSON.stringify({ winner, odds }), b.id]);
      if (payout > 0) noteCasinoWin({ userid: b.user_id, game: "derby", stake: b.stake, payout });
    }
    await sqlAll(em, `UPDATE bym.casino_round SET status = 'settled', result = CAST(? AS jsonb) WHERE id = ? RETURNING id`,
      [JSON.stringify({ order: race.order, seed: r.seed }), r.id]);
    await createRound(em, Math.max(now, ms(r.ends_at)) + rules().resultSeconds * 1000);
  });
};

let timer: ReturnType<typeof setInterval> | null = null;
let busy = false;

export const startDerby = () => {
  if (timer) return;
  timer = setInterval(() => {
    if (busy || !casinoConfig.enabled) return;
    busy = true;
    tickDerby()
      .catch((e) => logger.error(`Magma Derby: ${e}`))
      .finally(() => {
        busy = false;
      });
  }, 500);
  timer.unref?.();
};

/** A slip on the race open for bets: [{on: runner id, amount}], several runners; more slips allowed. */
export const betDerby = async (user: User, requestId: string, roundId: number, slip: { on: string; amount: number }[]) => {
  const stake = slip.reduce((a, b) => a + b.amount, 0);
  const result = await postgres.em.fork().transactional(async (em) => {
    const bal = async () => (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]))[0]?.credits ?? 0;
    const seen = await sqlAll<{ game: string; round_id: string; outcome: { bets: unknown } }>(em,
      `SELECT game, round_id, outcome FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    if (seen.length) {
      if (seen[0].game !== "derby") throw casinoErr("That request was already used.", Status.CONFLICT);
      return { round_id: Number(seen[0].round_id), bets: seen[0].outcome.bets, stake, credits: await bal(), replayed: true };
    }
    const r = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'derby' ORDER BY id DESC LIMIT 1 FOR UPDATE`))[0];
    const now = Date.now();
    if (!r || Number(r.id) !== roundId || r.status !== "betting" || now < ms(r.betting_opens_at) || now >= ms(r.starts_at)) {
      throw casinoErr("Bets are closed for this race. Wait for the next one.", Status.CONFLICT);
    }
    const ids = r.params.runners.map((x) => x.id);
    for (const b of slip) if (!ids.includes(b.on)) throw casinoErr("That monster is not running in this race.");
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`, [stake, user.userid, BaseType.MAIN, stake]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    await sqlAll(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, round_id, stake, payout, multiplier, outcome, seed_hash, status)
       VALUES (?, ?, 'derby', ?, ?, 0, 0, CAST(? AS jsonb), ?, 'open') RETURNING id`,
      [user.userid, requestId, r.id, stake, JSON.stringify({ bets: slip, odds: Object.fromEntries(r.params.runners.map((x) => [x.id, x.odds])) }), r.seed_hash]);
    return { round_id: Number(r.id), bets: slip, stake, credits: paid[0].credits, replayed: false };
  });
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * What every player sees: the race (runners and odds while bets are open; the order and times once it
 * starts; the seed once it is over), the player's own bets on it, the last winners, the server's clock.
 */
export const derbyState = async (userid: number) => {
  const conn = postgres.em.getConnection();
  const q = async <T>(sql: string, p: unknown[] = []) => (await conn.execute(sql, p, "all")) as T[];
  const now = Date.now();
  const rounds = await q<RoundRow>(`SELECT * FROM bym.casino_round WHERE game = 'derby' ORDER BY id DESC LIMIT 2`);
  let r = rounds[0] ?? null;
  if (r && r.status === "betting" && now < ms(r.betting_opens_at) && rounds[1]) r = rounds[1];
  const history = (await q<{ id: string; result: { order: string[] } }>(
    `SELECT id, result FROM bym.casino_round WHERE game = 'derby' AND status = 'settled' ORDER BY id DESC LIMIT ?`, [rules().history]))
    .map((h) => ({ round_id: Number(h.id), winner: h.result?.order?.[0] }));
  const pub = { betting_seconds: rules().bettingSeconds, race_seconds: rules().raceSeconds, result_seconds: rules().resultSeconds, rtp: rules().rtp };
  if (!r) return { server_ts: now, phase: "waiting", history, my_bets: [], rules: pub };
  const phase = r.status === "settled" ? "results" : r.status === "running" ? "racing" : now < ms(r.betting_opens_at) ? "waiting" : "betting";
  const race = r.params;
  const mine = await q<{ stake: number; payout: number; status: string; outcome: { bets: { on: string; amount: number }[] } }>(
    `SELECT stake, payout, status, outcome FROM bym.casino_bet WHERE round_id = ? AND user_id = ? ORDER BY id`, [r.id, userid]);
  const count = (await q<{ n: string; s: string }>(`SELECT count(DISTINCT user_id) AS n, COALESCE(sum(stake), 0) AS s FROM bym.casino_bet WHERE round_id = ?`, [r.id]))[0];
  // everyone's bets on it: what is on each runner, and the biggest bettors (a line per player and runner;
  // the admins' bets count in the totals but are not listed)
  const admins = configuredAdmins();
  const notAdmin = admins.length ? `AND u.username NOT IN (${admins.map(() => "?").join(", ")})` : "";
  const totals = await q<{ on: string; amount: string }>(
    `SELECT x->>'on' AS on, sum((x->>'amount')::bigint) AS amount FROM bym.casino_bet b, jsonb_array_elements(b.outcome->'bets') x
      WHERE b.round_id = ? GROUP BY 1`, [r.id]);
  const bettors = await q<{ username: string; user_id: number; on: string; amount: string }>(
    `SELECT u.username, b.user_id, x->>'on' AS on, sum((x->>'amount')::bigint) AS amount
       FROM bym.casino_bet b JOIN bym."user" u ON u.userid = b.user_id, jsonb_array_elements(b.outcome->'bets') x
      WHERE b.round_id = ? ${notAdmin} GROUP BY u.username, b.user_id, x->>'on' ORDER BY amount DESC, u.username LIMIT ?`, [r.id, ...admins, rules().listed]);
  return {
    server_ts: now,
    phase,
    round_id: Number(r.id),
    seed_hash: r.seed_hash,
    betting_opens_at: ms(r.betting_opens_at),
    starts_at: ms(r.starts_at),
    ends_at: ms(r.ends_at),
    runners: race.runners.map((x) => ({ id: x.id, strength: x.strength, odds: x.odds })),
    // the race itself only once it has started
    ...(r.status !== "betting" ? { order: race.order, splits: race.splits } : {}),
    ...(r.status === "settled" ? { seed: r.result?.seed } : {}),
    my_bets: mine.map((b) => ({ bets: b.outcome.bets, stake: b.stake, payout: b.payout, status: b.status })),
    players: Number(count?.n ?? 0),
    pot: Number(count?.s ?? 0),
    totals: Object.fromEntries(totals.map((t) => [t.on, Number(t.amount)])),
    bettors: bettors.map((b) => ({ name: b.username, me: b.user_id === userid, on: b.on, amount: Number(b.amount) })),
    history,
    rules: pub,
  };
};
