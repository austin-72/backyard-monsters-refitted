import { createHash } from "node:crypto";
import { postgres, redis } from "../../server.js";
import { SessionType } from "../../enums/SessionType.js";
import { logger } from "../../utils/logger.js";
import { pruneSavedLogins } from "./savedLogins.js";
import { chatTokenKey } from "../../chat/chatChannels.js";

/**
 * Inferno-only (12 October): each player's current login, kept where it survives a restart.
 *
 * A login is good while it is the newest one for that account and kind of session (game or launcher): a new
 * login replaces the one before. That newest token used to live only in Redis (`user-token:<type>:<email>`),
 * which in the Docker install keeps nothing on disk between its hourly snapshots and loses everything when its
 * container is made again, so a Redis restart signed every player out. Now it is also kept in Postgres
 * (`bym.user_session`, as a SHA-256 of the token, never the token itself), and Postgres decides:
 *
 *  - Redis is still asked first (no database query on most requests);
 *  - a token Redis does not hold (lost, or an older snapshot) is checked against Postgres, and Redis filled again;
 *  - at startup, logins only in Redis (made before this) are copied to Postgres, and any Redis holds that
 *    Postgres has a newer one for (an old snapshot brought back) are dropped.
 */

const key = (sessionType: string, email: string) => `user-token:${sessionType}:${email}`;
/** How long Redis answers for a session before Postgres is asked again. */
const CACHE_SECONDS = 600;
/** A session row whose session was ended: no token hashes to it. */
const ENDED = "-".repeat(64);
const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");
const sql = <T = any>(query: string, params: unknown[] = []) =>
  postgres.em.getConnection().execute(query, params, "all") as Promise<T[]>;

/**
 * The tables (also made by migrations 20261030_UserSessions and 20261031_SavedLogins; made here for an install
 * that has not run them). `user_login`: the saved logins (services/user/savedLogins.ts).
 */
export const ensureSessionTable = async () => {
  await sql(`CREATE TABLE IF NOT EXISTS bym.user_session (
    email varchar(255) NOT NULL,
    session_type varchar(16) NOT NULL,
    token_hash char(64) NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (email, session_type)
  )`);
  await sql(`ALTER TABLE bym.user_session ADD COLUMN IF NOT EXISTS agent varchar(80) NULL`);
  await sql(`CREATE TABLE IF NOT EXISTS bym.user_login (
    id bigserial PRIMARY KEY,
    email varchar(255) NOT NULL,
    secret_hash char(64) NOT NULL,
    agent varchar(80) NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
  )`);
  await sql(`CREATE INDEX IF NOT EXISTS user_login_email_idx ON bym.user_login (email)`);
  // (16 October, QoL #261: the account's admin role, migration 20261109_AdminRoles; the User entity reads it, so it
  // must be there before the first request, also where the migrations are run by hand)
  await sql(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS admin_role varchar(16) NULL`);
};

const store = (sessionType: string, email: string, token: string, agent: string | null) =>
  sql(
    `INSERT INTO bym.user_session (email, session_type, token_hash, agent, updated_at) VALUES (?, ?, ?, ?, now())
     ON CONFLICT (email, session_type) DO UPDATE SET token_hash = EXCLUDED.token_hash, agent = EXCLUDED.agent, updated_at = now()`,
    [email, sessionType, hashOf(token), agent]
  );

/**
 * A new play session: it replaces the one before (one at a time per account and kind), in Postgres and in Redis.
 * `agent`: where it is played ("Chrome on Windows"), for the question another device is asked (login.ts).
 */
export const saveSession = async (sessionType: string, email: string, token: string, agent: string | null = null): Promise<void> => {
  await store(sessionType, email, token, agent);
  // (13 October: kept 10 minutes, Postgres asked again after: Redis brought back from an old snapshot, or a sign-out
  // whose Redis delete failed, could otherwise keep an ended token working)
  await redis.setex(key(sessionType, email), CACHE_SECONDS, token);
};

/** The account's current play session, if it has one: where it is played ("Chrome on Windows", or null). */
export const activeSession = async (sessionType: string, email: string): Promise<{ agent: string | null } | null> => {
  const rows = await sql<{ agent: string | null }>(`SELECT agent FROM bym.user_session WHERE email = ? AND session_type = ? AND token_hash <> ?`, [email, sessionType, ENDED]);
  return rows.length ? { agent: rows[0].agent } : null;
};

/**
 * A play session ended by its own player (Switch account, its tab closed): only if `token` is still the current
 * one (a logout arriving after a newer sign-in ends nothing). Its row stays, with no token (ENDED), so neither
 * Redis nor an old Redis snapshot can bring it back. Redis is cleared either way: a miss asks Postgres.
 */
export const endSession = async (sessionType: string, email: string, token: string): Promise<void> => {
  await sql(`UPDATE bym.user_session SET token_hash = ?, updated_at = now() WHERE email = ? AND session_type = ? AND token_hash = ?`, [ENDED, email, sessionType, hashOf(token)]);
  await redis.del(key(sessionType, email)).catch(() => 0);
};

/** QoL #524: where and when the account's current play session started (null: none, or signed out). */
export const sessionWhere = async (sessionType: string, email: string): Promise<{ agent: string | null; at: Date } | null> => {
  const rows = await sql<{ agent: string | null; updated_at: Date | string }>(
    `SELECT agent, updated_at FROM bym.user_session WHERE email = ? AND session_type = ? AND token_hash <> ?`, [email, sessionType, ENDED]);
  return rows.length ? { agent: rows[0].agent, at: new Date(rows[0].updated_at) } : null;
};

/** Whether `token` is this account's current login (its signature, expiry and network are checked elsewhere). */
export const isCurrentSession = async (sessionType: string, email: string, token: string): Promise<boolean> => {
  if (!sessionType || !email || !token) return false;
  let cached: string | null = null;
  try {
    cached = await redis.get(key(sessionType, email));
  } catch (err) {
    logger.warn(`Sessions: Redis not answering, asking the database: ${err}`);
  }
  if (cached === token) return true;
  const rows = await sql<{ token_hash: string }>(
    `SELECT token_hash FROM bym.user_session WHERE email = ? AND session_type = ?`,
    [email, sessionType]
  );
  if (!rows.length || rows[0].token_hash !== hashOf(token)) return false;
  // (Redis lost it, or holds an older one: put the current one back, for a while; and if a sign-out ended it meanwhile,
  // taken out again, so the refill can't bring back a token just ended)
  await redis.setex(key(sessionType, email), CACHE_SECONDS, token).catch(() => 0);
  const again = await sql<{ token_hash: string }>(`SELECT token_hash FROM bym.user_session WHERE email = ? AND session_type = ?`, [email, sessionType]);
  if (!again.length || again[0].token_hash !== hashOf(token)) {
    await redis.del(key(sessionType, email)).catch(() => 0);
    return false;
  }
  return true;
};

/** Signed out everywhere (an account deleted, its password changed): its play sessions and saved logins. */
export const endSessions = async (email: string): Promise<void> => {
  await sql(`UPDATE bym.user_session SET token_hash = ?, updated_at = now() WHERE email = ?`, [ENDED, email]);
  await sql(`DELETE FROM bym.user_login WHERE email = ?`, [email]);
  await Promise.all([SessionType.GAME, SessionType.LAUNCHER].map((t) => redis.del(key(t, email)).catch(() => 0)));
  // (13 October: chat's own sign-in too, or a session signed out by a new password could go on chatting)
  const [who] = await sql<{ userid: number }>(`SELECT userid FROM bym."user" WHERE email = ?`, [email]);
  if (who) await redis.del(chatTokenKey(who.userid)).catch(() => 0);
  // (18 October, SUSPECTED-BUGS.md: and the admin panel's sessions: a staff account's panel cookie kept working for
  // up to 12 hours after its password was changed or reset)
  if (who) {
    const { endPanelSessionsOf } = await import("../admin/admin.js");
    await endPanelSessionsOf(Number(who.userid)).catch(() => undefined);
  }
};

/**
 * Inferno-only (16 October, QoL #200, #244): the account's play sessions now (one per kind: the game, the launcher),
 * with where each is played and since when; ended ones left out.
 */
export const playSessionsOf = async (email: string): Promise<{ sessionType: string; agent: string | null; since: Date }[]> => {
  const rows = await sql<{ session_type: string; agent: string | null; updated_at: Date | string }>(
    `SELECT session_type, agent, updated_at FROM bym.user_session WHERE email = ? AND token_hash <> ? ORDER BY updated_at DESC`, [email, ENDED]);
  return rows.map((r) => ({ sessionType: r.session_type, agent: r.agent, since: new Date(r.updated_at) }));
};

/** (QoL #200) One kind of the account's play sessions ended, whichever token it has (another device's). */
export const endSessionOfType = async (sessionType: string, email: string): Promise<boolean> => {
  const rows = await sql<{ n: number }>(
    `WITH e AS (UPDATE bym.user_session SET token_hash = ?, updated_at = now() WHERE email = ? AND session_type = ? AND token_hash <> ? RETURNING 1) SELECT count(*)::int AS n FROM e`,
    [ENDED, email, sessionType, ENDED]);
  await redis.del(key(sessionType, email)).catch(() => 0);
  return Number(rows[0]?.n ?? 0) > 0;
};

/** At startup: the table, Redis's logins copied to it where it has none, and old ones Redis brought back dropped. */
export const startSessions = async (): Promise<void> => {
  await ensureSessionTable();
  // (saved logins past their 14 days taken out, now and once a day)
  const prune = () => pruneSavedLogins().catch((err) => logger.warn(`Saved logins: could not prune: ${err}`));
  await prune();
  setInterval(prune, 24 * 60 * 60 * 1000).unref?.();
  let cursor = "0", copied = 0, dropped = 0, seen = 0;
  do {
    const [next, keys] = (await redis.send("SCAN", [cursor, "MATCH", "user-token:*", "COUNT", "500"])) as [string, string[]];
    cursor = String(next);
    for (const k of keys ?? []) {
      const m = /^user-token:([^:]+):(.+)$/.exec(k);
      if (!m) continue;
      const token = await redis.get(k);
      if (!token) continue;
      seen++;
      const [, sessionType, email] = m;
      const rows = await sql<{ token_hash: string }>(
        `SELECT token_hash FROM bym.user_session WHERE email = ? AND session_type = ?`,
        [email, sessionType]
      );
      if (!rows.length) {
        await store(sessionType, email, token, null);
        copied++;
      } else if (rows[0].token_hash !== hashOf(token)) {
        await redis.del(k);
        dropped++;
      }
    }
  } while (cursor !== "0");
  const [{ n }] = await sql<{ n: string }>(`SELECT count(*) AS n FROM bym.user_session`);
  logger.info(`Sessions: ${n} logins kept on disk (${seen} in Redis, ${copied} copied from it, ${dropped} out of date dropped)`);
};
