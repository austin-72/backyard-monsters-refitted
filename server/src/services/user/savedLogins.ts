import { createHash, randomBytes } from "node:crypto";
import type { Context } from "koa";
import { postgres } from "../../server.js";

/**
 * Inferno-only (13 October): saved logins, so a player picks their name on the login page instead of typing the
 * password again.
 *
 *  - One per account and browser, up to 5 per browser (the login page's "Who's playing?" holds 5); a sixth pushes
 *    out the one used least recently.
 *  - Each lasts 14 days from its last use (SAVED_LOGIN_DAYS): used, it is good for 14 more.
 *  - Kept in the browser as an HttpOnly cookie per account, `bymr_login_<12 hex of the email's hash>`, holding
 *    `<id>.<secret>`, sent only to the API (path /api/); the game's scripts cannot read them. The server keeps
 *    each one's SHA-256 (`bym.user_login`), never the secret, so a password change (resetPassword) or a deleted
 *    account ends them all (sessionStore.endSessions), and forgetting a name on the login page ends that one.
 *  - A saved login only signs in: what plays is the session token the sign-in gives (sessionStore), one at a time.
 */

export const SAVED_LOGIN_MAX = 5;
export const savedLoginDays = (): number => Math.max(1, Number(process.env.SAVED_LOGIN_DAYS) || 14);

const PREFIX = "bymr_login_";
const PATH = "/api/";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const cookieName = (email: string) => PREFIX + sha(`bymr-login:${email.trim().toLowerCase()}`).slice(0, 12);
const sql = <T = any>(query: string, params: unknown[] = []) =>
  postgres.em.getConnection().execute(query, params, "all") as Promise<T[]>;

/** The saved-login cookies this request carries: [{name, id, secret}]. */
const cookiesOf = (ctx: Context): { name: string; id: number; secret: string }[] => {
  const out: { name: string; id: number; secret: string }[] = [];
  for (const part of String(ctx.headers.cookie ?? "").split(";")) {
    const m = /^\s*(bymr_login_[0-9a-f]{12})=(\d{1,15})\.([A-Za-z0-9_-]{32,64})\s*$/.exec(part);
    if (m) out.push({ name: m[1], id: Number(m[2]), secret: m[3] });
  }
  return out;
};

// (days null: a session cookie, gone when the browser closes; QoL #516)
const setCookie = (ctx: Context, name: string, value: string, days: number | null) =>
  ctx.cookies.set(name, value, { httpOnly: true, sameSite: "lax", path: PATH, ...(days != null ? { maxAge: days * 864e5 } : {}), secure: ctx.secure, overwrite: true });

const dropCookie = (ctx: Context, name: string) =>
  ctx.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: PATH, maxAge: 0, secure: ctx.secure, overwrite: true });

/**
 * This browser's saved login for `email`, if it has a good one (not expired, not ended): the account's email as
 * stored, or null. A bad or expired one's cookie is taken away.
 */
export const findSavedLogin = async (ctx: Context, email: string): Promise<{ id: number; email: string } | null> => {
  const name = cookieName(email);
  const c = cookiesOf(ctx).find((x) => x.name === name);
  if (!c) return null;
  const rows = await sql<{ email: string; secret_hash: string }>(
    `SELECT email, secret_hash FROM bym.user_login WHERE id = ? AND expires_at > now()`,
    [c.id]
  );
  if (!rows.length || rows[0].secret_hash !== sha(c.secret) || rows[0].email.toLowerCase() !== email.trim().toLowerCase()) {
    dropCookie(ctx, name);
    return null;
  }
  return { id: c.id, email: rows[0].email };
};

/**
 * Inferno-only (QoL #517): why this browser has no good saved login for `email`: "none" (it never had one, or the
 * name was forgotten), "expired" (unused for savedLoginDays()), or "ended" (a password change, or signed out
 * everywhere). For the login page's words; asked only after findSavedLogin said no.
 */
export const savedLoginWhyNot = async (ctx: Context, email: string): Promise<"none" | "expired" | "ended"> => {
  const c = cookiesOf(ctx).find((x) => x.name === cookieName(email));
  if (!c) return "none";
  const rows = await sql<{ expired: boolean }>(`SELECT expires_at <= now() AS expired FROM bym.user_login WHERE id = ?`, [c.id]);
  if (rows.length && rows[0].expired) return "expired";
  return "ended";
};

/**
 * After a sign-in to `email` (any kind): this browser's saved login for it, renewed for 14 more days if it has one
 * (the one used, or one from before), a new one if not; then at most 5 kept in the browser.
 *
 * Inferno-only (QoL #516): `keep` false ("Keep me signed in on this computer" left unticked): its cookie a session
 * cookie, which the browser forgets when it closes, and good on the server for 1 day from its last use (a reload of
 * the game, which signs in again, renews it), not 14.
 */
export const keepSavedLogin = async (ctx: Context, email: string, agent: string | null, keep: boolean = true): Promise<void> => {
  const days = keep ? savedLoginDays() : 1;
  const cookieDays = keep ? days : null;
  const name = cookieName(email);
  const mine = await findSavedLogin(ctx, email);
  if (mine) {
    await sql(`UPDATE bym.user_login SET last_used_at = now(), expires_at = now() + (? || ' days')::interval, agent = ? WHERE id = ?`, [String(days), agent, mine.id]);
    const c = cookiesOf(ctx).find((x) => x.name === name)!;
    setCookie(ctx, name, `${c.id}.${c.secret}`, cookieDays);
  } else {
    const secret = randomBytes(32).toString("base64url");
    const [{ id }] = await sql<{ id: string }>(
      `INSERT INTO bym.user_login (email, secret_hash, agent, expires_at) VALUES (?, ?, ?, now() + (? || ' days')::interval) RETURNING id`,
      [email, sha(secret), agent, String(days)]
    );
    setCookie(ctx, name, `${id}.${secret}`, cookieDays);
    // (13 October) at most 20 browsers per account: each private window or cleared browser left a row for 14 days
    await sql(
      `DELETE FROM bym.user_login WHERE email = ? AND id NOT IN (SELECT id FROM bym.user_login WHERE email = ? ORDER BY last_used_at DESC NULLS LAST, id DESC LIMIT 20)`,
      [email, email]
    );
  }
  // at most 5 in this browser: the others it carries, most recently used first, the rest let go
  const others = cookiesOf(ctx).filter((x) => x.name !== name);
  if (!others.length) return;
  const rows = await sql<{ id: string; email: string; secret_hash: string; last_used_at: Date }>(
    `SELECT id, email, secret_hash, last_used_at FROM bym.user_login WHERE id IN (${others.map(() => "?").join(",")}) AND expires_at > now()`,
    others.map((o) => o.id)
  );
  // (only a cookie that is the saved login it names counts, and only its own row is ever let go: a made-up cookie
  // with someone else's id deletes nothing)
  const byId = new Map(others.map((o) => [o.id, o]));
  const used = new Map(
    rows
      .filter((r) => { const o = byId.get(Number(r.id)); return !!o && o.name === cookieName(r.email) && r.secret_hash === sha(o.secret); })
      .map((r) => [Number(r.id), new Date(r.last_used_at).getTime()])
  );
  const live = others.filter((o) => used.has(o.id)).sort((a, b) => used.get(b.id)! - used.get(a.id)!);
  const kept = new Set(live.slice(0, SAVED_LOGIN_MAX - 1).map((o) => o.name));
  const gone = others.filter((o) => !kept.has(o.name));
  for (const o of gone) dropCookie(ctx, o.name);
  const goneIds = gone.filter((o) => used.has(o.id)).map((o) => o.id);
  if (goneIds.length) await sql(`DELETE FROM bym.user_login WHERE id IN (${goneIds.map(() => "?").join(",")})`, goneIds);
};

/** A name forgotten on the login page: this browser's saved login for it ended. */
export const forgetSavedLogin = async (ctx: Context, email: string): Promise<boolean> => {
  const mine = await findSavedLogin(ctx, email);
  dropCookie(ctx, cookieName(email));
  if (!mine) return false;
  await sql(`DELETE FROM bym.user_login WHERE id = ?`, [mine.id]);
  return true;
};

/**
 * Inferno-only (16 October, QoL #200, #244): the account's saved logins still good, most recently used first (one per
 * browser: where, made when, last used). Their secrets are never read out.
 */
export const savedLoginsOf = async (email: string): Promise<{ id: number; agent: string | null; created: Date; lastUsed: Date; expires: Date }[]> => {
  const rows = await sql<{ id: string; agent: string | null; created_at: Date | string; last_used_at: Date | string; expires_at: Date | string }>(
    `SELECT id, agent, created_at, last_used_at, expires_at FROM bym.user_login WHERE email = ? AND expires_at > now() ORDER BY last_used_at DESC, id DESC LIMIT 20`,
    [email]
  );
  return rows.map((r) => ({ id: Number(r.id), agent: r.agent, created: new Date(r.created_at), lastUsed: new Date(r.last_used_at), expires: new Date(r.expires_at) }));
};

/**
 * (QoL #200) The account's own saved logins ended from its settings: one (`id`), or every one but `keepId` (this
 * browser's). Only rows of that account: an id of someone else's ends nothing. How many ended.
 */
export const endSavedLogins = async (email: string, which: { id: number } | { allBut: number | null }): Promise<number> => {
  const rows = "id" in which
    ? await sql<{ n: number }>(`WITH d AS (DELETE FROM bym.user_login WHERE email = ? AND id = ? RETURNING 1) SELECT count(*)::int AS n FROM d`, [email, which.id])
    : await sql<{ n: number }>(`WITH d AS (DELETE FROM bym.user_login WHERE email = ? AND id <> ? RETURNING 1) SELECT count(*)::int AS n FROM d`, [email, which.allBut ?? 0]);
  return Number(rows[0]?.n ?? 0);
};

/** Expired saved logins taken out of the table (at startup and once a day). */
export const pruneSavedLogins = () => sql(`DELETE FROM bym.user_login WHERE expires_at <= now()`);

/** "Chrome on Windows": a short name for where a browser is, from its User-Agent (for the question asked). */
export const agentOf = (ua: string | undefined): string => {
  const s = String(ua ?? "");
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\/|Opera/.test(s) ? "Opera" : /SamsungBrowser/.test(s) ? "Samsung Internet"
    : /Firefox\//.test(s) ? "Firefox" : /Chrome\/|CriOS\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "a browser";
  const os = /iPhone/.test(s) ? "iPhone" : /iPad/.test(s) ? "iPad" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows"
    : /Mac OS X|Macintosh/.test(s) ? "Mac" : /CrOS/.test(s) ? "Chromebook" : /Linux/.test(s) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
};
