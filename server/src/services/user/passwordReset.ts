import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";

/**
 * Inferno-only (16 October, QoL #244): one-time password-reset links, made by an admin on the player's card in the
 * admin panel and given to the player on Discord (the server sends no email by default). The player opens it, a page
 * served by the server (public/docs/reset-password.html), and chooses a new password there; it goes to the same
 * player/reset-password as the email's link (controllers/auth/resetPassword.ts), whose password rules are
 * register's, and every login of the account ends.
 *
 *  - The token is `<userid>.<43 random characters>`; the link carries it after a #, so it is never sent in an
 *    address (nor in a request log): the page reads it and sends it with the new password.
 *  - The account keeps a SHA-256 of it with its time limit, never the token (`user.resetToken`, "h1:<hash>:<ms>"):
 *    24 hours (RESET_LINK_HOURS), good once (used, it is cleared); a new link replaces the one before, and a
 *    password changed in the game clears it too (changePassword).
 *  - The email's link (forgotPassword) is kept the same way now; one sent before (the token itself) still works.
 */

export const RESET_LINK_HOURS = 24;

const PREFIX = "h1:";
const ADMIN_TOKEN = /^([1-9]\d{0,9})\.([A-Za-z0-9_-]{43})$/;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** What the account keeps of a reset token: its hash and when it stops working. */
export const storedResetToken = (token: string, expiresAt: number): string => `${PREFIX}${sha(token)}:${Math.floor(expiresAt)}`;

/** A token of an admin's link (not the email's, which is a signed JWT). */
export const isAdminResetToken = (token: string): boolean => ADMIN_TOKEN.test(String(token ?? ""));

/** The account an admin's link is for (null: not such a token). */
export const resetTokenUserId = (token: string): number | null => {
  const m = ADMIN_TOKEN.exec(String(token ?? ""));
  return m ? Number(m[1]) : null;
};

/** When the account's reset link (either kind) stops working, if it has one still good; null otherwise. */
export const resetLinkExpiry = (stored: string | null | undefined): number | null => {
  const m = /^h1:[0-9a-f]{64}:(\d{10,16})$/.exec(String(stored ?? ""));
  if (!m) return null;
  const at = Number(m[1]);
  return at > Date.now() ? at : null;
};

/**
 * Whether `token` is the account's reset token, still good. A stored hash is compared in constant time; a token stored
 * as it was (an email sent before 16 October) is matched as before, the JWT's own expiry checked by the caller.
 */
export const resetTokenMatches = (stored: string | null | undefined, token: string): boolean => {
  const s = String(stored ?? "");
  if (!s || !token) return false;
  if (s.startsWith(PREFIX)) {
    const m = /^h1:([0-9a-f]{64}):(\d{10,16})$/.exec(s);
    if (!m || Number(m[2]) <= Date.now()) return false;
    const a = Buffer.from(m[1], "hex");
    const b = Buffer.from(sha(token), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }
  // (an admin's token is never kept as it is)
  return !isAdminResetToken(token) && s === token;
};

/** A new reset link's token for the account (the one before stops working). Never written to a log. */
export const makeResetToken = async (user: User): Promise<{ token: string; expiresAt: number }> => {
  const token = `${user.userid}.${randomBytes(32).toString("base64url")}`;
  const expiresAt = Date.now() + RESET_LINK_HOURS * 3_600_000;
  await postgres.em.fork().nativeUpdate(User, { userid: user.userid }, { resetToken: storedResetToken(token, expiresAt) });
  return { token, expiresAt };
};

/** The account's reset link taken back (an admin's "Cancel the link"). */
export const cancelResetToken = async (user: User): Promise<void> => {
  await postgres.em.fork().nativeUpdate(User, { userid: user.userid }, { resetToken: "" });
};

/** Where the page is: the link is this, after the server's address, with the token after the #. */
export const RESET_PAGE_PATH = "/docs/reset-password.html";
