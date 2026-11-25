import { noteLogin } from "../../services/admin/loginHistory.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { playingKey } from "../../middleware/auth.js";
import { chatTokenKey } from "../../chat/chatChannels.js";
import { getMaintenance, isAdmin } from "../../services/admin/admin.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { discordRequired } from "../../config/InfernoOnlyConfig.js";
import bcrypt from "bcrypt";
import JWT, { type SignOptions } from "jsonwebtoken";

import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { activeSession, isCurrentSession, saveSession } from "../../services/user/sessionStore.js";
import { agentOf, findSavedLogin, keepSavedLogin, savedLoginDays, savedLoginWhyNot } from "../../services/user/savedLogins.js";
import { BaseType } from "../../enums/Base.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { FilterFrontendKeys } from "../../utils/FrontendKey.js";
import type { KoaController } from "../../utils/KoaController.js";
import {
  emailPasswordErr,
  discordVerifyErr,
  userPermaBannedErr,
  tokenAuthFailureErr,
  tokenDeviceErr,
} from "../../errors/errors.js";
import { logger } from "../../utils/logger.js";
import { type JwtClaims, deviceForLogin, sameBrowser, verifyJwtToken } from "../../middleware/auth.js";
import { Status } from "../../enums/StatusCodes.js";
import { UserLoginSchema } from "../../schemas/AuthSchemas.js";
import { Env } from "../../enums/Env.js";
import { fetchDiscordAvatar } from "../../services/discord/fetchDiscordAvatar.js";
import { endTestMode, isTestModeOn } from "../../services/admin/testMode.js";
import { shinyLockAbove } from "./shinyLockSettings.js";

type SessionLifetime = NonNullable<SignOptions["expiresIn"]>;

/**
 * Authenticates a user using a JWT token.
 *
 * This function verifies the provided JWT token and retrieves the associated user record
 * from the database. If the token is valid and the user exists, it returns the user record.
 * If the token is invalid or the user does not exist, it throws an authentication failure error.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<User>} - A promise that resolves to the authenticated user record.
 * @throws {Error} - Throws an error if the token is invalid or the user does not exist.
 */
const authenticateWithToken = async (token: string, ctx: Parameters<KoaController>[0]) => {
  const { user } = verifyJwtToken(token);

  if (!(await isCurrentSession(user.sessionType, user.email, token))) throw tokenAuthFailureErr();

  // (13 October) only in the browser the login was made in, whatever network it is on now: a token copied to
  // another browser is refused (was: only from the network it was made on, 12 October)
  if (!sameBrowser(user, ctx)) {
    logger.warn(`Token login refused: ${user.email}'s login was made in another browser (used from ${ctx.ip})`);
    throw tokenDeviceErr();
  }

  let userRecord = await postgres.em.findOne(User, { email: user.email });
  if (!userRecord) throw emailPasswordErr();

  return userRecord;
};

/** (18 October) A bcrypt hash of nothing anyone types, compared against when no account has the email. */
const DUMMY_HASH = "$2b$10$ZHKNbjyUFha1WtLDRdTBB.JE.tMaB19TbpaXPWl71dlIYgLLOxw4.";

/**
 * Controller to handle user login.
 *
 * This controller authenticates a user based on either their email & password, or token.
 * The token is stored in Redis for each login request, to later be validated in the middleware.
 * Additionally, the controller checks if the user is banned or has verified their Discord account.
 * The token signature is then constructed with the user's email and Discord ID, along with a flag
 * indicating if the user meets the Discord age check requirement.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if authentication fails or if the request body is invalid.
 */

export const login: KoaController = async (ctx) => {
  // A mistyped email the game's form lets through (john..doe@x.com) or a password that breaks the rules for
  // new ones is a failed login, not a server error (it answered 500 "Something went wrong").
  // (Inferno-only, QoL #196, 14 October: a username works as well as the email: players are told the email
  // needn't be real, and then forget which one they typed. The account's own email is used from here on.)
  const raw = (ctx.request.body ?? {}) as Record<string, unknown>;
  if (infernoOnlyConfig.enabled && typeof raw.email === "string" && raw.email.trim() && !raw.email.includes("@")) {
    const name = raw.email.trim();
    const byName = /^[a-zA-Z0-9_]{2,12}$/.test(name)
      ? ((await postgres.em.getConnection().execute(`SELECT email FROM bym."user" WHERE lower(username) = lower(?) LIMIT 2`, [name], "all")) as { email: string }[])
      : [];
    if (byName.length === 1) ctx.request.body = { ...raw, email: byName[0].email };
  }
  const parsed = UserLoginSchema.safeParse(ctx.request.body);
  if (!parsed.success) throw emailPasswordErr();
  let { email, password, token, sessionType } = parsed.data;
  let user: User | null = null;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  // (13 October) this game asks before signing another device out (a game from before signs it out at once)
  const asks = String(body.ioask ?? "") === "1";
  // ...and the player answered Yes to that question
  const kick = String(body.kick ?? "") === "1";
  // ...a sign-in with this browser's saved login for `email` (a name picked on the login page, or the next visit)
  const withSaved = String(body.saved ?? "") === "1";
  // the current play session itself, signing in again (a reload of the same tab, the reload after an update):
  // nothing else to sign out
  let sameSession = false;

  if (token) {
    try {
      user = await authenticateWithToken(token, ctx);
      sameSession = true;
    } catch (err) {
      if (!(email && (password || withSaved))) throw err;
      logger.warn(`Token login failed: ${(err as Error).message}`);
    }
  }

  if (!user && withSaved && email && !password) {
    const saved = await findSavedLogin(ctx, email);
    user = saved ? await postgres.em.findOne(User, { email: saved.email }) : null;
    if (!user) {
      // (none, expired, or ended: the login page asks for the password, and, QoL #517, says why)
      ctx.status = Status.OK;
      ctx.body = { error: "Please type your password to sign in.", ionosaved: 1, ioreason: await savedLoginWhyNot(ctx, email), iodays: savedLoginDays() };
      return;
    }
  }

  if (!user) {
    if (!email || !password) throw emailPasswordErr();
    user = await postgres.em.findOne(User, { email });
    // (18 October, SUSPECTED-BUGS.md: an unknown email answered at once, a known one after bcrypt, so the time told
    // which emails have an account) a comparison against a fixed hash first, so both take as long
    if (!user) {
      await bcrypt.compare(password!, DUMMY_HASH).catch(() => false);
      throw emailPasswordErr();
    }

    const isMatch = await bcrypt.compare(password!, user.password);
    if (!isMatch) {
      noteLogin(ctx, user.userid, "wrong-password"); // (QoL #246)
      throw emailPasswordErr();
    }
  }

  if (user.banned) {
    noteLogin(ctx, user.userid, "banned"); // (18 October: the panel's login history shows refused logins too)
    // Inferno-only: a ban from the admin panel carries the reason the player is shown.
    if (user.ban_reason) {
      throw new ClientSafeError({ message: `Your account has been banned: ${user.ban_reason}`, status: Status.FORBIDDEN, data: {}, isClientFriendly: true });
    }
    throw userPermaBannedErr();
  }

  // Maintenance mode from the admin panel: nobody but admins logs in, and they are told why.
  const maintenance = await getMaintenance();
  if (maintenance && !isAdmin(user)) {
    noteLogin(ctx, user.userid, "maintenance");
    throw new ClientSafeError({ message: maintenance, status: Status.FORBIDDEN, data: {}, isClientFriendly: true });
  }

  // One play session at a time (13 October): another device or window playing as this account now (a yard loaded
  // or saved in the last 2 minutes) is asked about first; Yes signs it out (its next request is refused), No
  // leaves it playing and this one on the login page.
  if (asks && !kick && !sameSession && sessionType === "game") {
    const seen = await Promise.all([...[BaseType.MAIN, BaseType.INFERNO].map((t) => `last-seen:${t}:${user!.userid}`), playingKey(user!.userid)].map((k) => redis.get(k).catch(() => null)));
    const last = Math.max(0, ...seen.map((v) => Number(v) || 0));
    // (a session signed out by its own player, Switch account, is not playing)
    const active = last > 0 ? await activeSession(sessionType, user.email).catch(() => null) : null;
    if (active) {
      const where = active.agent || "another device";
      ctx.status = Status.OK;
      // (QoL #523: whether it is this same browser, another tab or window, by how the browser names itself)
      const sameBrowser = !!where && where === agentOf(ctx.get("user-agent"));
      ctx.body = { error: "This account is playing somewhere else.", iokick: 1, iowhere: where, ioago: Math.max(0, getCurrentDateTime() - last), iosamebrowser: sameBrowser ? 1 : 0, email: user.email };
      return;
    }
  }

  // Admin test mode ends with the session it was switched on in: a new login puts the account back (13 October:
  // after the question above, so a No leaves the other device's test mode on).
  // A failure here must not stop the login (it is tried again at the next one).
  try {
    if (await isTestModeOn(user.userid)) await endTestMode(user, "logged in again");
  } catch (err) {
    logger.error(`Test mode: could not put ${user.username}'s account back at login: ${err}`);
  }

  // Generate and set the token
  const sessionLifeTime = process.env.SESSION_LIFETIME || "30d";
  let discordId: string | null | undefined;

  // Check if the user has verified their Discord account
  if (process.env.ENV === Env.PROD && discordRequired()) {
    if (!user.discord_verified) throw discordVerifyErr();
    discordId = user.discord_id;

    if (discordId) fetchDiscordAvatar(user.userid, discordId);
  }

  // (13 October) bound to this browser when the game says it keeps the browser's key (a client from before then
  // sends no cookies: its login stays bound to its network, as on 12 October, until it reloads into a new build)
  const keepsDeviceKey = String((ctx.request.body as Record<string, unknown> | undefined)?.iodevice ?? "") === "1";

  const newToken = JWT.sign(
    {
      user: {
        email: user.email,
        discordId,
        sessionType,
        // (the browser's key, its cookie set or renewed with this reply)
        ...(keepsDeviceKey ? { device: deviceForLogin(ctx) } : { ip: ctx.ip }),
      },
    } satisfies JwtClaims,
    process.env.SECRET_KEY!,
    {
      expiresIn: sessionLifeTime as SessionLifetime,
    }
  );

  // (kept on disk as well as in Redis, so a restart signs nobody out: services/user/sessionStore.ts). The session
  // before it, on any device, ends here.
  const agent = agentOf(ctx.get("user-agent"));
  await saveSession(sessionType, user.email, newToken, agent);
  // (13 October) chat has its own sign-in, a token per account: a new game session gets a new one, so the session it
  // replaced can't go on chatting (the next yard load hands this one out)
  if (sessionType === "game" && !sameSession) await redis.del(chatTokenKey(user.userid)).catch(() => 0);
  // this browser's saved login for the account, made or renewed for 14 days (services/user/savedLogins.ts)
  // (Inferno-only, QoL #516: "Keep me signed in on this computer" left unticked at sign-in, `iokeep` "0": only until
  // the browser closes, its cookie a session cookie)
  const keep = String(body.iokeep ?? "1") !== "0";
  if (sessionType === "game") {
    try {
      await keepSavedLogin(ctx, user.email, agent, keep);
    } catch (err) {
      logger.warn(`Saved login for ${user.email} not kept: ${err}`);
    }
  }
  postgres.em.persist(user);
  await postgres.em.flush();

  const filteredUser = FilterFrontendKeys(user);
  const userAgent = ctx.get("user-agent") || "none";

  user.last_ip = ctx.ip;
  await postgres.em.flush();

  logger.info("User {username} logged in | ID: {userid} | IP: {ip}", {
    event: "login",
    username: filteredUser.username,
    userid: filteredUser.userid,
    email: filteredUser.email,
    ip: ctx.ip,
    userAgent,
  });
  if (!sameSession) noteLogin(ctx, user.userid, kick ? "kicked" : "ok"); // (QoL #246)

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    userId: filteredUser.userid,
    ...filteredUser,
    version: 128,
    token: newToken,
    mapversion: 2,
    mailversion: 1,
    soundversion: 1,
    languageversion: 8,
    sendinvite: 1,
    app_id: "",
    tpid: "",
    currency_url: "",
    language: "en",
    settings: {},
    // (Inferno-only, QoL #197: the Shiny lock's amount, 0 when off; the game asks for the password above it)
    ...(infernoOnlyConfig.enabled ? { ioshinylock: await shinyLockAbove(user.userid) } : {}),
    // TODO: add remaining keys that the client expects
  };
};
