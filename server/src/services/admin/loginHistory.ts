import type { Context } from "koa";
import { createHash } from "crypto";
import { redis } from "../../server.js";
import { DEVICE_COOKIE } from "../../middleware/auth.js";
import { agentOf } from "../user/savedLogins.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (QoL #246): each player's logins for the admin panel's player card, 90 days: when, how it went
 * (signed in; wrong password; signed in and signed the other device out; refused: banned, maintenance), from which
 * address and browser. Written by the login controller (controllers/auth/login.ts: noteLogin), nothing else.
 *
 * "Same browser" accounts: each browser has its own key (the HttpOnly cookie bymr_device, middleware/auth.ts). A
 * hash of it, never the key, is kept with each login, and per browser the accounts that logged in with it, so the
 * card can list the other accounts used in the same browser (alts, or a shared family computer). A browser's very
 * first login on this server has no key yet (it is given one with that login's answer): it is listed without one.
 *
 *   loginhist:<userid>          a list, newest first, at most MAX_KEPT logins (JSON), gone 90 days after the last
 *   loginhist:browser:<hash>    a sorted set: userid -> the last login with that browser (ms), gone after 90 days
 */

export type LoginResult = "ok" | "wrong-password" | "kicked" | "banned" | "maintenance";

const DAYS = 90;
const TTL = DAYS * 86_400;
const MAX_KEPT = 300;

const listKey = (userid: number) => `loginhist:${userid}`;
const browserKey = (hash: string) => `loginhist:browser:${hash}`;

/** A short id for the browser (a hash of its key, salted for this list; null without a key). */
const browserOf = (ctx: Context): string | null => {
  const key = ctx.cookies.get(DEVICE_COOKIE);
  if (!key || !/^[A-Za-z0-9_-]{32,64}$/.test(key)) return null;
  return createHash("sha256").update(`bymr-loginhist:${key}`).digest("base64url").slice(0, 16);
};

interface Entry {
  at: number;
  r: LoginResult;
  ip: string;
  b: string | null;
  a: string;
}

/** A login, noted without waiting and never failing the login. */
export const noteLogin = (ctx: Context, userid: number | null | undefined, result: LoginResult): void => {
  if (!userid) return;
  const entry: Entry = { at: Date.now(), r: result, ip: String(ctx.ip ?? "").slice(0, 64), b: browserOf(ctx), a: agentOf(ctx.get("user-agent")) };
  void (async () => {
    const key = listKey(userid);
    await redis.send("LPUSH", [key, JSON.stringify(entry)]);
    await redis.send("LTRIM", [key, "0", String(MAX_KEPT - 1)]);
    await redis.expire(key, TTL);
    if (entry.b) {
      const bk = browserKey(entry.b);
      await redis.send("ZADD", [bk, String(entry.at), String(userid)]);
      await redis.send("ZREMRANGEBYSCORE", [bk, "-inf", String(entry.at - TTL * 1000)]);
      await redis.expire(bk, TTL);
    }
  })().catch((err) => logger.warn(`Login history: not kept: ${err}`));
};

/** A sorted set's members and scores (RESP2 answers a flat list, RESP3 pairs), as in services/user/presence.ts. */
const pairs = (raw: unknown): [string, number][] => {
  const flat = Array.isArray(raw) ? raw : [];
  const out: [string, number][] = [];
  if (flat.length && Array.isArray(flat[0])) for (const p of flat as unknown[][]) out.push([String(p[0]), Number(p[1])]);
  else for (let i = 0; i + 1 < flat.length; i += 2) out.push([String(flat[i]), Number(flat[i + 1])]);
  return out;
};

/**
 * A player's logins of the last 90 days (newest first), and the other accounts that logged in in the same
 * browsers: [{id, last (ms), browsers (how many of this player's browsers)}], most recent first.
 */
export const loginHistory = async (userid: number) => {
  const since = Date.now() - TTL * 1000;
  const raw = ((await redis.send("LRANGE", [listKey(userid), "0", String(MAX_KEPT - 1)]).catch(() => [])) as string[] | null) ?? [];
  const logins: Entry[] = [];
  for (const line of raw) {
    try {
      const e = JSON.parse(line) as Entry;
      if (Number(e.at) >= since) logins.push(e);
    } catch {
      // (unreadable: skipped)
    }
  }
  const browsers = [...new Set(logins.map((e) => e.b).filter((b): b is string => !!b))].slice(0, 50);
  const others = new Map<number, { last: number; browsers: number }>();
  for (const b of browsers) {
    const members = pairs(await redis.send("ZRANGEBYSCORE", [browserKey(b), String(since), "+inf", "WITHSCORES"]).catch(() => []));
    for (const [member, at] of members) {
      const id = Number(member);
      if (!Number.isInteger(id) || id <= 0 || id === userid) continue;
      const o = others.get(id) ?? { last: 0, browsers: 0 };
      o.last = Math.max(o.last, at);
      o.browsers++;
      others.set(id, o);
    }
  }
  return {
    logins: logins.map((e) => ({ at: e.at, result: e.r, ip: e.ip, browser: e.b, agent: e.a })),
    sameBrowser: [...others.entries()].map(([id, o]) => ({ id, ...o })).sort((a, b) => b.last - a.last).slice(0, 50),
  };
};
