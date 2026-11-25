import { discordRequired, infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "./clientSafeError.js";
import { Status } from "../enums/StatusCodes.js";
import { postgres, redis } from "../server.js";
import { User } from "../database/models/user.model.js";
import type { Context, Next } from "koa";
import {
  authFailureErr,
  discordAgeErr,
  tokenAuthFailureErr,
  tokenDeviceErr,
  sessionReplacedErr,
} from "../errors/errors.js";
import JWT from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { Env } from "../enums/Env.js";
import { isDiscordAccountOldEnough } from "../services/discord/discordAccountStatus.js";
import type { SessionType } from "../enums/SessionType.js";
import { logger } from "../utils/logger.js";
import { isCurrentSession, sessionWhere } from "../services/user/sessionStore.js";
import { markActive, markLeft } from "../services/user/presence.js";

export interface JwtClaims {
  user: {
    email: string;
    discordId: string | null | undefined;
    sessionType: SessionType.GAME | SessionType.LAUNCHER;
    /**
     * The browser the login was made in (13 October): a hash of its key, the HttpOnly cookie `bymr_device`
     * (sameBrowser). The token is good only from that browser, whatever its network.
     */
    device?: string;
    /** Logins made before 13 October: the address they were made from, bound to its network (sameNetwork). */
    ip?: string;
  };
}

export interface AuthTokenPayload {
  user: JwtClaims["user"] & { meetsDiscordAgeCheck: boolean };
}

/**
 * Middleware to enforce authentication for protected routes.
 *
 * This middleware checks for the presence of a valid Bearer token in the
 * Authorization header, verifies the token's authenticity, and loads the
 * associated user from the database.
 *
 * @param {Context} ctx - The Koa context object.
 * @param {Next} next - The Koa next middleware function.
 * @throws Will throw an error if the Authorization header is missing or invalid, or if the user cannot be found.
 */
export const verifyUserAuth = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) throw authFailureErr();

  const token = authHeader.replace("Bearer ", "");
  const decodedToken = verifyJwtToken(token);

  const sessionType = decodedToken.user.sessionType;
  const email = decodedToken.user.email;

  // (the account's newest login: Redis first, then the copy on disk, services/user/sessionStore.ts)
  // (not it: a newer session, on another device or window, signed this one out)
  if (!(await isCurrentSession(sessionType, email, token))) throw sessionReplacedErr(await sessionWhere(sessionType, email).catch(() => null));

  if (!sameBrowser(decodedToken.user, ctx)) {
    logger.warn(`Token refused: ${email}'s login was made in another browser (used from ${ctx.ip})`);
    throw tokenDeviceErr();
  }

  const user = await postgres.em.findOne(User, { email });

  // (Inferno-only, QoL #201: a ban that comes mid-game says so, with its reason; it read "logged in somewhere else")
  if (user?.banned && infernoOnlyConfig.enabled)
    throw new ClientSafeError({ message: `Banned: ${user.ban_reason || "no reason given"}`, status: Status.UNAUTHORIZED, data: {}, isClientFriendly: true });
  if (!user || user.banned) throw authFailureErr();

  ctx.authUser = user;
  ctx.meetsDiscordAgeCheck = decodedToken.user.meetsDiscordAgeCheck;

  if (!ctx.authUser) throw authFailureErr();
  if (sessionType === "game") markPlaying(user.userid);
  await next();
};

/**
 * (13 October) A game session in use, for the question a new login asks ("playing somewhere else?", login.ts):
 * any request of its counts, at most every 30 seconds. The yard's last-seen (written by its loads and saves) left
 * out a player on the map or in an attack for more than 2 minutes, who was then signed out without a question.
 */
const playingMarked = new Map<number, number>();
export const playingKey = (userid: number) => `session-active:${userid}`;
const markPlaying = (userid: number) => {
  const now = Date.now();
  if (now - (playingMarked.get(userid) ?? 0) < 30_000) return;
  playingMarked.set(userid, now);
  if (playingMarked.size > 50_000) playingMarked.clear();
  void redis.setex(playingKey(userid), 120, String(Math.floor(now / 1000))).catch(() => 0);
  // (and for chat's online dots and Who's Online: services/user/presence.ts)
  markActive(userid);
};
/** Signed out by its own player: the next login asks nothing (logout.ts). */
export const unmarkPlaying = async (userid: number) => {
  playingMarked.delete(userid);
  await redis.del(playingKey(userid)).catch(() => 0);
  await markLeft(userid);
};

/**
 * Middleware to enforce the Discord account age requirement for Map Room access.
 * Depends on verifyUserAuth middleware to have already set ctx.meetsDiscordAgeCheck.
 *
 * @param {Context} ctx - The Koa context object.
 * @param {Next} next - The Koa next middleware function.
 * @throws {Error} Throws `discordAgeErr` if the user's Discord account does not meet the 7-day age requirement.
 */
export const verifyAccountStatus = async (ctx: Context, next: Next) => {
  if (ctx.meetsDiscordAgeCheck === undefined)
    throw new Error("meetsDiscordAgeCheck not set in context");

  if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();
  await next();
};

/**
 * Verifies a JWT token and returns the decoded payload.
 *
 * For local development, we return a basic payload with the user's email.
 * In production, we introduce discord authentication.
 *
 * @param {string} token - The JWT token to verify.
 * @returns {AuthTokenPayload} The decoded JWT payload.
 * @throws Will throw an error if the token is invalid or verification fails.
 */
export const verifyJwtToken = (token: string): AuthTokenPayload => {
  if (process.env.ENV === Env.LOCAL) {
    // Local mode used to decode the token without checking its signature, which let anyone who knew
    // a player's email forge a login for that account. Harmless on a laptop, not on a server that
    // players can reach, and local mode is what a fresh install runs in. The signature is checked
    // here too; local mode still skips everything Discord-related.
    let decoded: AuthTokenPayload;

    try {
      decoded = <AuthTokenPayload>JWT.verify(token, process.env.SECRET_KEY!);
    } catch (err) {
      const { name, message } = err as Error;
      logger.warn(`JWT verification failed: ${name} - ${message}`);
      throw tokenAuthFailureErr();
    }

    return {
      user: {
        email: decoded.user?.email,
        discordId: null,
        meetsDiscordAgeCheck: true,
        sessionType: decoded.user?.sessionType,
        device: decoded.user?.device,
        ip: decoded.user?.ip,
      },
    };
  }

  try {
    const decoded = <AuthTokenPayload>JWT.verify(token, process.env.SECRET_KEY!);
    
    const { discordId } = decoded.user;
    const meetsDiscordAgeCheck = !discordRequired() || (discordId ? isDiscordAccountOldEnough(discordId) : false);

    return {
      user: { ...decoded.user, meetsDiscordAgeCheck },
    };
  } catch (err) {
    const { name, message } = err as Error;
    logger.warn(`JWT verification failed: ${name} - ${message}`);
    throw tokenAuthFailureErr();
  }
};

/**
 * Whether a login works only in the browser it was made in (13 October; was: only on the network it was made
 * on, which logged out players on a VPN or mobile data whenever their address changed). On unless the server is
 * started with SESSION_BIND_DEVICE=0.
 */
export const bindsTokensToDevice = (): boolean => process.env.SESSION_BIND_DEVICE !== "0";

/**
 * The browser's key: a random value the server gives each browser at its first login, kept in an HttpOnly
 * cookie (the game's scripts cannot read it, so a token copied out of the browser's saved data is no use
 * anywhere else). A browser keeps it however its network changes; a new browser, a private window or cleared
 * cookies means logging in again.
 */
export const DEVICE_COOKIE = "bymr_device";
const DEVICE_COOKIE_MS = 400 * 24 * 60 * 60 * 1000;

/** What a token holds of the key (a hash: a token's contents can be read by anyone holding it). */
const deviceHash = (key: string): string => createHash("sha256").update(`bymr-device:${key}`).digest("base64url").slice(0, 32);

const deviceKeyOf = (ctx: Context): string | null => {
  const key = ctx.cookies.get(DEVICE_COOKIE);
  return key && /^[A-Za-z0-9_-]{32,64}$/.test(key) ? key : null;
};

/** At a login: this browser's key (a new one if it has none), its cookie renewed, and the hash for the token. */
export const deviceForLogin = (ctx: Context): string => {
  const key = deviceKeyOf(ctx) ?? randomBytes(32).toString("base64url");
  ctx.cookies.set(DEVICE_COOKIE, key, { httpOnly: true, sameSite: "lax", path: "/", maxAge: DEVICE_COOKIE_MS, secure: ctx.secure, overwrite: true });
  return deviceHash(key);
};

/**
 * A token may be used by this request: sent by the browser it was made in. A token from before 13 October
 * (no browser in it) keeps its old rule, the network it was made on, until the game's next login replaces it.
 */
export const sameBrowser = (claims: JwtClaims["user"], ctx: Context): boolean => {
  if (!bindsTokensToDevice()) return true;
  if (claims.device) {
    const key = deviceKeyOf(ctx);
    return key !== null && deviceHash(key) === claims.device;
  }
  return sameNetwork(claims.ip, ctx.ip);
};

/**
 * The part of an address a token is bound to: the whole of an IPv4 address; the first 64 bits (the home
 * network) of an IPv6 one, whose last 64 bits most devices change by themselves every day or so.
 */
export const networkOf = (ip: string | null | undefined): string => {
  let a = String(ip ?? "").trim().toLowerCase();
  if (a.startsWith("::ffff:") && a.includes(".")) a = a.slice(7);
  if (!a.includes(":")) return a;
  a = a.split("%")[0];
  const [head, tail] = a.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const groups = tail !== undefined ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  return groups.slice(0, 4).map((g) => (parseInt(g || "0", 16) || 0).toString(16)).join(":") + "::/64";
};

/** A token from before 13 October, made at `madeAt`, may be used from `usedFrom`. */
export const sameNetwork = (madeAt: string | null | undefined, usedFrom: string | null | undefined): boolean => {
  if (!madeAt || !usedFrom) return false;
  return networkOf(madeAt) === networkOf(usedFrom);
};
