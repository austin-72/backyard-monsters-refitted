import bcrypt from "bcrypt";
import JWT, { type SignOptions } from "jsonwebtoken";
import { RateLimit } from "koa2-ratelimit";
import type { Context } from "koa";
import { UniqueConstraintViolationException } from "@mikro-orm/core";

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { ChangeEmailSchema } from "../../schemas/AuthSchemas.js";
import { parseInput } from "../../schemas/parseInput.js";
import { postgres } from "../../server.js";
import { type JwtClaims, verifyJwtToken } from "../../middleware/auth.js";
import { endSessions, saveSession } from "../../services/user/sessionStore.js";
import { agentOf, forgetSavedLogin, keepSavedLogin } from "../../services/user/savedLogins.js";
import { logger } from "../../utils/logger.js";

type SessionLifetime = NonNullable<SignOptions["expiresIn"]>;

/**
 * Inferno-only (QoL #199): email changes while logged in - 5 an hour per player (a wrong password counts), as the
 * password's (changePasswordLimiter). Kept here, with the route it guards.
 */
export const changeEmailLimiter = RateLimit.middleware({
  interval: { min: 60 },
  max: 5,
  prefixKey: "changeemail",
  // (by account, as rateLimiters.ts's byUser: the prefix in the key keeps its counts apart from other limiters')
  keyGenerator: async (ctx: Context) => `changeemail|${ctx.authUser?.userid ?? ctx.ip}`,
  handler: async (ctx: Context) => {
    ctx.status = Status.TOO_MANY_REQUESTS;
    ctx.body = { error: "Too many email change attempts. Please try again in an hour." };
  },
});

/**
 * Inferno-only (15 October, QoL #199): a new email (the login) chosen in the game (the page's settings, Account),
 * for the logged-in player's own account only, with the current password.
 *
 * Sessions and saved logins are kept by email (sessionStore.ts, savedLogins.ts), and the game's token names it, so:
 *  - every login of the account ends, as after a password change (other devices, other browsers' saved logins);
 *  - this game gets a new token for the new email, handed back as `token`, and plays on (its old one ends);
 *  - this browser's saved login is made again for the new email (`iokeep` "0": until the browser closes, as at
 *    sign-in, QoL #516).
 * The password travels as `password`, which the request log never prints.
 */
export const changeEmail: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { email, password } = parseInput(ChangeEmailSchema, ctx.request.body);
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const keep = String(body.iokeep ?? "1") !== "0";
  const ok = !!user.password && (await bcrypt.compare(String(password), user.password));
  if (!ok) {
    ctx.status = Status.OK;
    ctx.body = { error: "That isn't your current password." };
    return;
  }
  const oldEmail = user.email;
  if (email === String(oldEmail).toLowerCase()) {
    ctx.status = Status.OK;
    ctx.body = { error: "That is already your email." };
    return;
  }
  const conn = postgres.em.getConnection();
  const taken = (await conn.execute(`SELECT 1 FROM bym."user" WHERE lower(email) = lower(?) AND userid <> ? LIMIT 1`, [email, user.userid], "all")) as unknown[];
  if (taken.length) {
    ctx.status = Status.OK;
    ctx.body = { error: "That email already has an account." };
    return;
  }

  const token = String(ctx.headers.authorization || "").replace("Bearer ", "");
  const claims = verifyJwtToken(token).user;
  const agent = agentOf(ctx.get("user-agent"));

  // (this browser's saved login is found by the old email: ended while it still can be)
  try {
    await forgetSavedLogin(ctx, oldEmail);
  } catch (err) {
    logger.warn(`Could not end ${oldEmail}'s saved login in this browser before an email change: ${err}`);
  }
  // every login of the old email ended (sessions, saved logins elsewhere, chat's sign-in)
  try {
    await endSessions(oldEmail);
  } catch (err) {
    logger.warn(`Could not end ${oldEmail}'s logins before an email change: ${err}`);
  }

  user.email = email;
  try {
    await postgres.em.flush();
  } catch (err) {
    // (taken in the meantime: the account and this game's login put back as they were)
    user.email = oldEmail;
    await saveSession(claims.sessionType, oldEmail, token, agent).catch(() => undefined);
    if (err instanceof UniqueConstraintViolationException) {
      ctx.status = Status.OK;
      ctx.body = { error: "That email already has an account." };
      return;
    }
    throw err;
  }

  // this game's new login, for the new email, bound as its old one was (the same browser key, or network)
  const newToken = JWT.sign(
    {
      user: {
        email,
        discordId: claims.discordId ?? null,
        sessionType: claims.sessionType,
        ...(claims.device ? { device: claims.device } : claims.ip ? { ip: claims.ip } : {}),
      },
    } satisfies JwtClaims,
    process.env.SECRET_KEY!,
    { expiresIn: (process.env.SESSION_LIFETIME || "30d") as SessionLifetime }
  );
  await saveSession(claims.sessionType, email, newToken, agent);
  if (claims.sessionType === "game") {
    try {
      await keepSavedLogin(ctx, email, agent, keep);
    } catch (err) {
      logger.warn(`Saved login for ${email} not kept after an email change: ${err}`);
    }
  }
  logger.info(`${user.username} changed their email`);
  ctx.status = Status.OK;
  ctx.body = { error: 0, email, token: newToken };
};
