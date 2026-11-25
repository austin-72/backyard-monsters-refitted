import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { casinoErr } from "./access.js";
import { hashSeed, newServerSeed, roundPayout } from "./rng.js";
import { refundOpenBets, sqlAll, type Em } from "./wallet.js";
import { changed, sharedView } from "./sharedView.js";
import { devilAt, diceMultiplier, diceRolls } from "./games/dice.js";

/**
 * Devil's Dice (Brimstone Pit level 3; config/CasinoConfig.ts `dice`): tables of up to four players, each
 * round the same bones for the table, each bet against the house.
 *
 * The tables and who sits at them are kept here (a seat is given up when its player has not asked for the
 * table's state for `seatSeconds`); the rounds and bets are rows of casino_round (game 'dice', params.table)
 * and casino_bet, as Balthazar's Ascent's are. A loop (every 200 ms, one server at a time: an advisory lock)
 * moves every round on: betting -> running (the throws, one every rollMs) -> settled (the Devil came, every
 * bet left on the table lost; or the last throw, what is left banked; or everyone banked). The throws are drawn
 * from the round's seed when it is made and shown only as their time comes; the seed once it is over. A table
 * with a player at it gets a new round `resultSeconds` after the last one ends.
 */

const rules = () => casinoConfig.dice;
const LOCK = 1410003;

interface RoundRow {
  id: string;
  seed: string;
  seed_hash: string;
  params: { table: number; rolls: number[][]; devil: number; max: number; first_ms: number; roll_ms: number };
  result: { devil: number; seed: string; early: boolean } | null;
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
  outcome: { auto?: number | null; cashed?: number; at?: number; how?: string; lost?: boolean };
  status: string;
}

interface Seat {
  uid: number;
  name: string;
  seen: number;
}

interface Table {
  id: number;
  seats: Seat[];
}

const tables = new Map<number, Table>();

/**
 * The table of each player's last bet (9 October): coming back to Devil's Dice (the window closed, a seat let go)
 * sits them there again, where a bet still riding can be seen and banked; it used to be any table with room.
 */
const betTable = new Map<number, number>();
let nextTable = 1;

const ms = (d: Date | string | null) => (d == null ? 0 : new Date(d).getTime());

/** When throw k (from 1) comes. */
const rollAt = (r: RoundRow, k: number) => ms(r.starts_at) + r.params.first_ms + (k - 1) * r.params.roll_ms;

/** How many throws have come by `now`. */
const rollsDone = (r: RoundRow, now: number) => {
  const first = ms(r.starts_at) + r.params.first_ms;
  if (now < first) return 0;
  return Math.min(r.params.max, Math.floor((now - first) / r.params.roll_ms) + 1);
};

const tableOf = (uid: number): Table | null => {
  for (const t of tables.values()) if (t.seats.some((s) => s.uid === uid)) return t;
  return null;
};

/** Sits a player at a table: theirs if they have one, the one asked for if it has room, else the fullest with room, else a new one. */
export const sitDice = (user: User, want: number | null) => {
  const now = Date.now();
  let mine = tableOf(user.userid);
  if (mine && want && want !== mine.id) {
    const t = tables.get(want);
    if (t && t.seats.length < rules().seats) {
      mine.seats = mine.seats.filter((s) => s.uid !== user.userid);
      mine = null;
    }
  }
  if (!mine) {
    let t = want ? tables.get(want) : undefined;
    if (!t || t.seats.length >= rules().seats) {
      const last = tables.get(betTable.get(user.userid) ?? -1);
      t = last && last.seats.length < rules().seats ? last : undefined;
    }
    if (!t || t.seats.length >= rules().seats) {
      t = [...tables.values()].filter((x) => x.seats.length > 0 && x.seats.length < rules().seats).sort((a, b) => b.seats.length - a.seats.length)[0];
    }
    if (!t) {
      t = [...tables.values()].find((x) => x.seats.length === 0);
      if (!t) {
        t = { id: nextTable++, seats: [] };
        tables.set(t.id, t);
      }
    }
    t.seats.push({ uid: user.userid, name: user.username, seen: now });
    mine = t;
  }
  const seat = mine.seats.find((s) => s.uid === user.userid);
  if (seat) seat.seen = now;
  return { table: mine.id };
};

/** Up from the table (the game closed). */
export const leaveDice = (user: User) => {
  const t = tableOf(user.userid);
  if (t) t.seats = t.seats.filter((s) => s.uid !== user.userid);
  return { left: Boolean(t) };
};

/** The tables with players (the lobby's line). */
export const diceTables = () => [...tables.values()].filter((t) => t.seats.length).map((t) => ({ id: t.id, players: t.seats.length }));

const createRound = async (em: Em, table: number, opensAt: number): Promise<void> => {
  const r = rules();
  const seed = newServerSeed();
  const rolls = diceRolls(seed, r.maxRolls);
  const params = { table, rolls, devil: devilAt(rolls), max: r.maxRolls, first_ms: r.firstRollMs, roll_ms: r.rollMs };
  const starts = opensAt + r.bettingSeconds * 1000;
  await sqlAll(em,
    `INSERT INTO bym.casino_round (game, seed, seed_hash, params, betting_opens_at, starts_at, status)
     VALUES ('dice', ?, ?, CAST(? AS jsonb), to_timestamp(? / 1000.0), to_timestamp(? / 1000.0), 'betting') RETURNING id`,
    [seed, hashSeed(seed), JSON.stringify(params), opensAt, starts]);
};

/** Pays a bet banked after k throws, in the caller's transaction. */
const payBet = async (em: Em, r: RoundRow, bet: BetRow, k: number, how: string) => {
  const mult = diceMultiplier(rules(), k, casinoConfig.maxMultiplier);
  let payout = roundPayout(r.seed, bet.id, bet.stake * mult);
  if (casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
  await sqlAll(em, `UPDATE bym.save SET credits = LEAST(credits::bigint + ?, 2147483647) WHERE userid = ? AND type = ? RETURNING credits`, [payout, bet.user_id, BaseType.MAIN]);
  await sqlAll(em,
    `UPDATE bym.casino_bet SET payout = ?, multiplier = ?, status = 'settled', settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
    [payout, mult.toFixed(2), JSON.stringify({ cashed: mult, at: k, how }), bet.id]);
  noteCasinoWin({ userid: bet.user_id, game: "dice", stake: bet.stake, payout });
  return { payout, mult };
};

const settle = async (em: Em, r: RoundRow, endsAt: number, early: boolean) => {
  await sqlAll(em, `UPDATE bym.casino_round SET status = 'settled', ends_at = to_timestamp(? / 1000.0), result = CAST(? AS jsonb) WHERE id = ? RETURNING id`,
    [endsAt, JSON.stringify({ devil: r.params.devil, seed: r.seed, early }), r.id]);
};

/** A round moved on as far as the clock says; whether anything was written. */
const advance = async (em: Em, r: RoundRow, now: number): Promise<boolean> => {
  let wrote = false;
  if (r.status === "betting") {
    if (now < ms(r.starts_at)) return false;
    wrote = true;
    await sqlAll(em, `UPDATE bym.casino_round SET status = 'running' WHERE id = ? RETURNING id`, [r.id]);
  }
  const done = rollsDone(r, now);
  const devil = r.params.devil;
  const open = await sqlAll<BetRow>(em, `SELECT * FROM bym.casino_bet WHERE round_id = ? AND status = 'open' FOR UPDATE`, [r.id]);
  // banks set for a throw now passed (and not past the Devil)
  const left: BetRow[] = [];
  for (const b of open) {
    const auto = b.outcome.auto;
    if (auto != null && auto <= done && (devil === 0 || devil > auto)) {
      wrote = true;
      await payBet(em, r, b, auto, "auto");
    } else left.push(b);
  }
  if (devil > 0 && done >= devil) {
    await sqlAll(em,
      `UPDATE bym.casino_bet SET payout = 0, multiplier = 0, status = 'settled', settled_at = now(), outcome = outcome || '{"lost": true}'::jsonb WHERE round_id = ? AND status = 'open' RETURNING id`,
      [r.id]);
    await settle(em, r, rollAt(r, devil), false);
    return true;
  }
  if (done >= r.params.max) {
    for (const b of left) await payBet(em, r, b, r.params.max, "end");
    await settle(em, r, rollAt(r, r.params.max), false);
    return true;
  }
  if (done >= 1 && !left.length) {
    // everyone who bet has banked: no need to wait for the Devil (a table nobody bet at plays on to him)
    // (QoL #504: a bet taken back is no bet)
    const any = await sqlAll(em, `SELECT id FROM bym.casino_bet WHERE round_id = ? AND status <> 'refunded' LIMIT 1`, [r.id]);
    if (any.length) {
      await settle(em, r, now, true);
      return true;
    }
  }
  return wrote;
};

/** One step of the loop: seats not heard from given up, every open round moved on, tables with players dealt a round. */
// (9 October) The last step found no round open and nobody at a table: until someone sits down (seats are kept
// here, sitDice), there is nothing to move on, and the loop asks the database every 2 seconds, not five times a
// second (a round made some other way is still found).
let quiet = false;
let checked = 0;

export const tickDice = async (): Promise<void> => {
  const now = Date.now();
  for (const t of tables.values()) t.seats = t.seats.filter((s) => now - s.seen < rules().seatSeconds * 1000);
  const seated = [...tables.values()].some((t) => t.seats.length > 0);
  if (quiet && !seated && now - checked < 2000) return;
  checked = now;
  let wrote = false;
  let openRounds = -1;
  try {
    await postgres.em.fork().transactional(async (em) => {
      const lock = await sqlAll<{ ok: boolean }>(em, `SELECT pg_try_advisory_xact_lock(?) AS ok`, [LOCK]);
      if (!lock[0]?.ok) return;
      const open = await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'dice' AND status <> 'settled' ORDER BY id FOR UPDATE`);
      openRounds = open.length;
      for (const r of open) if (await advance(em, r, now)) wrote = true;
      for (const t of tables.values()) {
        if (!t.seats.length) continue;
        const last = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE game = 'dice' AND (params->>'table')::int = ? ORDER BY id DESC LIMIT 1`, [t.id]))[0];
        if (!last || (last.status === "settled" && now >= ms(last.ends_at) + rules().resultSeconds * 1000)) {
          wrote = true;
          await createRound(em, t.id, now);
        }
      }
    });
  } finally {
    if (wrote) changed("dice");
  }
  quiet = openRounds === 0 && !seated;
};

let timer: ReturnType<typeof setInterval> | null = null;
let busy = false;

/** Starts the loop (with the server). */
export const startDice = () => {
  if (timer) return;
  timer = setInterval(() => {
    if (busy || !casinoConfig.enabled) return;
    busy = true;
    tickDice()
      .catch((e) => logger.error(`Devil's Dice: ${e}`))
      .finally(() => {
        busy = false;
      });
  }, 200);
  timer.unref?.();
};

/** A bet on the table's round open for bets (one a player a round), banked by hand or after `auto` throws. */
export const betDice = async (user: User, requestId: string, roundId: number, stake: number, auto: number | null) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const seen = await sqlAll<{ id: string; game: string; round_id: string; outcome: BetRow["outcome"] }>(em,
      `SELECT id, game, round_id, outcome FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    const bal = async () => (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]))[0]?.credits ?? 0;
    if (seen.length) {
      if (seen[0].game !== "dice") throw casinoErr("That request was already used.", Status.CONFLICT);
      return { round_id: Number(seen[0].round_id), stake, auto: seen[0].outcome.auto ?? null, credits: await bal(), replayed: true };
    }
    const r = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE id = ? AND game = 'dice' FOR UPDATE`, [roundId]))[0];
    const now = Date.now();
    if (!r || r.status !== "betting" || now < ms(r.betting_opens_at) || now >= ms(r.starts_at)) {
      throw casinoErr("Bets are closed for this throw. Wait for the next round.", Status.CONFLICT);
    }
    const t = tableOf(user.userid);
    if (!t || t.id !== r.params.table) throw casinoErr("Sit at the table first.", Status.CONFLICT);
    betTable.set(user.userid, t.id);
    // (Inferno-only, QoL #504: a bet taken back doesn't count: another can be placed)
    const mine = await sqlAll(em, `SELECT id FROM bym.casino_bet WHERE round_id = ? AND user_id = ? AND status <> 'refunded'`, [r.id, user.userid]);
    if (mine.length) throw casinoErr("You already have a bet on this round.", Status.CONFLICT);
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`, [stake, user.userid, BaseType.MAIN, stake]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    await sqlAll(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, round_id, stake, payout, multiplier, outcome, seed_hash, status)
       VALUES (?, ?, 'dice', ?, ?, 0, 0, CAST(? AS jsonb), ?, 'open') RETURNING id`,
      [user.userid, requestId, r.id, stake, JSON.stringify({ auto }), r.seed_hash]);
    return { round_id: Number(r.id), stake, auto, credits: paid[0].credits, replayed: false };
  });
  if (!result.replayed) changed("dice");
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * Inferno-only (15 October, QoL #504): the player's bet on the table's round taken back while it still takes bets
 * (the bones not thrown): the stake paid back once (wallet.refundOpenBets), in one transaction with the round locked,
 * as the loop locks it to start throwing, so the throws can't start in between. A new bet can be placed after.
 */
export const takeBackDice = async (user: User, roundId: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const r = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE id = ? AND game = 'dice' FOR UPDATE`, [roundId]))[0];
    if (!r) throw casinoErr("That round could not be found.", Status.NOT_FOUND);
    if (r.status !== "betting" || Date.now() >= ms(r.starts_at)) throw casinoErr("Too late: the bones are being thrown.", Status.CONFLICT);
    const back = await refundOpenBets(em, r.id, user.userid);
    if (!back.count) throw casinoErr("You have no bet on this round.", Status.CONFLICT);
    return { round_id: Number(r.id), refunded: back.stake, credits: back.credits };
  });
  changed("dice");
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * Banks by hand, after the throws done by the server's clock now. The Devil already come: the bet stays lost.
 * A bank set for a throw already passed: that.
 */
export const bankDice = async (user: User, roundId: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const r = (await sqlAll<RoundRow>(em, `SELECT * FROM bym.casino_round WHERE id = ? AND game = 'dice' FOR UPDATE`, [roundId]))[0];
    if (!r) throw casinoErr("That round could not be found.", Status.NOT_FOUND);
    // (QoL #504: not a bet taken back)
    const bet = (await sqlAll<BetRow>(em, `SELECT * FROM bym.casino_bet WHERE round_id = ? AND user_id = ? AND status <> 'refunded' FOR UPDATE`, [r.id, user.userid]))[0];
    if (!bet) throw casinoErr("You have no bet on this round.", Status.CONFLICT);
    const bal = async () => (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]))[0]?.credits ?? 0;
    if (bet.status !== "open") {
      return { cashed: bet.outcome.cashed ?? null, at: bet.outcome.at ?? null, payout: bet.payout, lost: Boolean(bet.outcome.lost), credits: await bal(), replayed: true };
    }
    const now = Date.now();
    const done = r.status === "betting" ? 0 : rollsDone(r, now);
    if (done < 1) throw casinoErr("The bones haven't been thrown yet.", Status.CONFLICT);
    const devil = r.params.devil;
    if (devil > 0 && devil <= done) return { cashed: null, at: null, payout: 0, lost: true, credits: await bal(), replayed: false };
    const auto = bet.outcome.auto;
    const k = auto != null && auto <= done ? auto : done;
    const { payout, mult } = await payBet(em, r, bet, k, k === done ? "hand" : "auto");
    return { cashed: mult, at: k, payout, lost: false, credits: await bal(), replayed: false };
  });
  if (!result.replayed) changed("dice");
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return result;
};

/**
 * What the table shows: its seats, the round (betting, rolling, over: the throws come so far, the Devil once
 * he has come, the seed once it is over), the bets on it, the player's own, the table's last rounds.
 */
export const diceState = async (user: User, tableId: number) => {
  const now = Date.now();
  const t = tables.get(tableId);
  const seat = t?.seats.find((s) => s.uid === user.userid);
  if (seat) seat.seen = now;
  const conn = postgres.em.getConnection();
  const q = async <T>(sql: string, p: unknown[] = []) => (await conn.execute(sql, p, "all")) as T[];
  const table = { id: tableId, seats: (t?.seats ?? []).map((s) => ({ name: s.name, me: s.uid === user.userid })) };
  // (the table's round, its history and everyone's bets are the same for every player at it: read once for all
  // every quarter second, sharedView.ts)
  // (18 October, SUSPECTED-BUGS.md: any table id was read, and each kept a cached view for good) a table that isn't
  // open is shown waiting, without a read or a cache entry
  const { r, history } = !t ? { r: undefined as RoundRow | undefined, history: [] as { round_id: number; devil: number }[] } : await sharedView(`dice:t${tableId}`, 250, async () => ({
    r: (await q<RoundRow>(`SELECT * FROM bym.casino_round WHERE game = 'dice' AND (params->>'table')::int = ? ORDER BY id DESC LIMIT 1`, [tableId]))[0],
    history: (await q<{ id: string; result: { devil: number; early: boolean } }>(
      `SELECT id, result FROM bym.casino_round WHERE game = 'dice' AND (params->>'table')::int = ? AND status = 'settled' ORDER BY id DESC LIMIT ?`, [tableId, rules().history]))
      .map((h) => ({ round_id: Number(h.id), devil: Number(h.result?.devil ?? 0) })),
  }));
  const mults: number[] = [];
  for (let k = 1; k <= rules().maxRolls; k++) mults.push(diceMultiplier(rules(), k, casinoConfig.maxMultiplier));
  const base = { server_ts: now, table, seated: Boolean(seat), history, mults, max: rules().maxRolls, rules: { betting_seconds: rules().bettingSeconds, roll_ms: rules().rollMs, first_ms: rules().firstRollMs, rtp: rules().rtp } };
  if (!r) return { ...base, phase: "waiting", players: [], my_bet: null, rolls: [] };
  const settled = r.status === "settled";
  const done = settled ? 0 : r.status === "betting" ? 0 : rollsDone(r, now);
  // the throws shown: those come so far; once it is over, all of them up to the Devil (or the last)
  const shown = settled ? r.params.rolls.slice(0, r.params.devil > 0 ? r.params.devil : r.params.max) : r.params.rolls.slice(0, done);
  const devilShown = settled || (r.params.devil > 0 && done >= r.params.devil) ? r.params.devil : null;
  const phase = settled ? "over" : r.status === "betting" ? "betting" : "rolling";
  const roundId = r.id;
  const bets = await sharedView(`dice:round${roundId}`, 250, () => q<BetRow & { username: string }>(
    `SELECT b.id, b.user_id, b.stake, b.payout, b.multiplier, b.outcome, b.status, u.username FROM bym.casino_bet b JOIN bym."user" u ON u.userid = b.user_id
     WHERE b.round_id = ? AND b.status <> 'refunded' ORDER BY b.stake DESC, b.id`, [roundId]));
  const mine = bets.find((b) => b.user_id === user.userid);
  const view = (b: BetRow & { username?: string }) => ({
    name: b.username,
    stake: b.stake,
    auto: b.outcome.auto ?? null,
    cashed: b.outcome.cashed ?? null,
    at: b.outcome.at ?? null,
    payout: b.status === "settled" ? b.payout : null,
    lost: Boolean(b.outcome.lost),
    me: b.user_id === user.userid,
  });
  return {
    ...base,
    phase,
    round_id: Number(r.id),
    seed_hash: r.seed_hash,
    betting_opens_at: ms(r.betting_opens_at),
    starts_at: ms(r.starts_at),
    first_ms: r.params.first_ms,
    roll_ms: r.params.roll_ms,
    rolls: shown,
    devil: devilShown,
    ...(settled ? { seed: r.result?.seed, ended_at: ms(r.ends_at), early: Boolean(r.result?.early) } : {}),
    players: bets.map(view),
    my_bet: mine ? { ...view(mine), status: mine.status } : null,
  };
};
