import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (13 October): when each player was last active, for chat's online dots and Who's Online. Any request of
 * a game session counts (middleware/auth.ts, at most every 30 seconds per player; the game asks the server at least
 * every 30 seconds while it is open). Redis sorted sets, member the user id, score the epoch second:
 *  - presence:last, the last time active (or signed out);
 *  - presence:off, when the player signed out (Switch account, the tab closed): offline from then, until active again;
 * and a set, presence:hidden, of the players who chose to appear offline (Who's Online's button).
 *
 * (18 October, the user's) Appearing offline is kept on the account too (bym."user".appear_offline, migration
 * 20261110_AppearOffline), so it holds through a reload, a restart of the server and a Redis that lost its data:
 * the set is made again from the accounts when it is found gone (presence:hidden:synced, the mark that it is there).
 *
 * Online: active in the last 5 minutes, not signed out since, not appearing offline. Recently online: in the last 24
 * hours (Who's Online lists those too, with how long ago, at least a minute).
 */
const KEY = "presence:last";
const OFF = "presence:off";
const HIDDEN = "presence:hidden";
export const ONLINE_SECONDS = 5 * 60;
export const RECENT_SECONDS = 24 * 60 * 60;
/** Kept a week, then let go. */
const KEEP_SECONDS = 7 * 24 * 60 * 60;

const nowSec = () => Math.floor(Date.now() / 1000);
let lastPrune = 0;

/** The player was active just now. */
export const markActive = (userid: number): void => {
  const now = nowSec();
  void redis.send("ZADD", [KEY, String(now), String(userid)]).catch((err) => logger.warn(`Presence: not kept: ${err}`));
  if (now - lastPrune > 3600) {
    lastPrune = now;
    for (const k of [KEY, OFF]) void redis.send("ZREMRANGEBYSCORE", [k, "-inf", String(now - KEEP_SECONDS)]).catch(() => 0);
  }
};

/** The player signed out: offline from now, recently online from now (their next request makes them online again). */
export const markLeft = async (userid: number): Promise<void> => {
  const now = String(nowSec());
  await redis.send("ZADD", [KEY, now, String(userid)]).catch(() => 0);
  await redis.send("ZADD", [OFF, now, String(userid)]).catch(() => 0);
};

const SYNCED = "presence:hidden:synced";
const dbSql = <T = any>(query: string, params: unknown[] = []) => postgres.em.getConnection().execute(query, params, "all") as Promise<T[]>;
let syncedAt = 0;

/**
 * At start (server.ts): the account's column, also where the migrations are run by hand; the players who chose to
 * appear offline before it was kept on the account (Redis's set only) are written to it; then the set is made from it.
 */
export const ensureAppearOffline = async (): Promise<void> => {
  await dbSql(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS appear_offline boolean NOT NULL DEFAULT false`);
  const raw = (await redis.send("SMEMBERS", [HIDDEN]).catch(() => [])) as unknown;
  const before = (Array.isArray(raw) ? raw : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (before.length) await dbSql(`UPDATE bym."user" SET appear_offline = true WHERE userid IN (${before.map(() => "?").join(",")}) AND NOT appear_offline`, before);
  await syncHidden(true);
};

/** Redis's set made from the accounts, when it isn't there (a Redis restarted without its data), or `force`. */
const syncHidden = async (force = false): Promise<void> => {
  if (!force) {
    if (Date.now() - syncedAt < 30_000) return;
    syncedAt = Date.now();
    if (Number(await redis.send("EXISTS", [SYNCED]).catch(() => 1)) === 1) return;
  }
  syncedAt = Date.now();
  const rows = await dbSql<{ userid: number }>(`SELECT userid FROM bym."user" WHERE appear_offline`);
  // (22 October: added to and taken from, not emptied and filled: a player choosing to appear offline meanwhile (their
  // account written, then added here) was wiped by the emptying and shown online; one taken out is looked at again)
  if (rows.length) await redis.send("SADD", [HIDDEN, ...rows.map((r) => String(r.userid))]);
  const want = new Set(rows.map((r) => Number(r.userid)));
  const raw = (await redis.send("SMEMBERS", [HIDDEN]).catch(() => [])) as unknown;
  const members = (Array.isArray(raw) ? raw : []).map(String);
  const junk = members.filter((m) => !(Number.isInteger(Number(m)) && Number(m) > 0));
  if (junk.length) await redis.send("SREM", [HIDDEN, ...junk]);
  const extra = members.map(Number).filter((n) => Number.isInteger(n) && n > 0 && !want.has(n));
  if (extra.length) {
    const still = new Set((await dbSql<{ userid: number }>(`SELECT userid FROM bym."user" WHERE appear_offline AND userid IN (${extra.map(() => "?").join(",")})`, extra)).map((r) => Number(r.userid)));
    const gone = extra.filter((n) => !still.has(n));
    if (gone.length) await redis.send("SREM", [HIDDEN, ...gone.map(String)]);
  }
  await redis.send("SET", [SYNCED, "1"]);
  logger.info(`Presence: ${rows.length} player(s) appearing offline`);
};

/** Appear offline (or not): kept on the account, until changed. */
export const setHidden = async (userid: number, hidden: boolean): Promise<void> => {
  await dbSql(`UPDATE bym."user" SET appear_offline = ? WHERE userid = ?`, [hidden, userid]);
  await syncHidden().catch((err) => logger.warn(`Presence: the players appearing offline not read again: ${err}`));
  await redis.send(hidden ? "SADD" : "SREM", [HIDDEN, String(userid)]);
};

export const hiddenPlayers = async (): Promise<Set<number>> => {
  await syncHidden().catch((err) => logger.warn(`Presence: the players appearing offline not read again: ${err}`));
  const raw = (await redis.send("SMEMBERS", [HIDDEN]).catch(() => [])) as unknown;
  return new Set((Array.isArray(raw) ? raw : []).map(Number).filter((n) => Number.isInteger(n) && n > 0));
};

/** A sorted set's members scored since `sinceSec` ago, most recent first: [userid, epoch second]. */
const scoredSince = async (key: string, sinceSec: number, limit: number): Promise<[number, number][]> => {
  const raw = (await redis.send("ZREVRANGEBYSCORE", [key, "+inf", String(nowSec() - sinceSec), "WITHSCORES", "LIMIT", "0", String(limit)])) as unknown;
  const flat = Array.isArray(raw) ? raw : [];
  const out: [number, number][] = [];
  // (RESP2 answers a flat list, member then score; RESP3 pairs)
  if (flat.length && Array.isArray(flat[0])) {
    for (const pair of flat as unknown[][]) out.push([Number(pair[0]), Math.floor(Number(pair[1]))]);
  } else {
    for (let i = 0; i + 1 < flat.length; i += 2) out.push([Number(flat[i]), Math.floor(Number(flat[i + 1]))]);
  }
  return out.filter(([id, at]) => Number.isInteger(id) && id > 0 && Number.isFinite(at));
};

export interface Presence {
  id: number;
  /** Last active (or signed out), epoch second. */
  at: number;
  online: boolean;
  /** Appearing offline (shown as offline to everyone else). */
  hidden: boolean;
}

/** The players active since `sinceSec` ago, most recent first, each online or not. */
export const presenceSince = async (sinceSec: number, limit = 500): Promise<Presence[]> => {
  const now = nowSec();
  const [active, off, hidden] = await Promise.all([scoredSince(KEY, sinceSec, limit), scoredSince(OFF, sinceSec, limit * 2), hiddenPlayers()]);
  const offAt = new Map(off);
  return active.map(([id, at]) => {
    const left = (offAt.get(id) ?? -1) >= at;
    return { id, at, hidden: hidden.has(id), online: now - at <= ONLINE_SECONDS && !left && !hidden.has(id) };
  });
};

/** The ids of the players online now (as others see them). */
export const onlineNow = async (): Promise<Set<number>> => {
  try {
    return new Set((await presenceSince(ONLINE_SECONDS, 5000)).filter((p) => p.online).map((p) => p.id));
  } catch (err) {
    logger.warn(`Presence: online players not read: ${err}`);
    return new Set();
  }
};

/** Whether the player appears offline (their chat lines go out with a grey dot). */
export const isHidden = async (userid: number): Promise<boolean> => {
  await syncHidden().catch((err) => logger.warn(`Presence: the players appearing offline not read again: ${err}`));
  return Number(await redis.send("SISMEMBER", [HIDDEN, String(userid)]).catch(() => 0)) === 1;
};
