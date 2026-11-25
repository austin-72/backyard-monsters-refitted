import { unmarkPlaying } from "../../middleware/auth.js";
import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { BaseType } from "../../enums/Base.js";
import { redis } from "../../server.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { endSession } from "../../services/user/sessionStore.js";

/**
 * Inferno-only (13 October): Switch account ends the play session it leaves (after verifyUserAuth: it is the
 * current one), so signing in again, as this account or another, asks nothing about "another device". The saved
 * login stays: the account's name on the login page signs it in again.
 */
export const logout: KoaController = async (ctx) => {
  const token = String(ctx.headers.authorization ?? "").replace("Bearer ", "");
  const { user } = verifyJwtToken(token);
  await endSession(user.sessionType, user.email, token);
  await Promise.all([BaseType.MAIN, BaseType.INFERNO].map((t) => redis.del(`last-seen:${t}:${ctx.authUser.userid}`).catch(() => 0)));
  await unmarkPlaying(ctx.authUser.userid);
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};

/**
 * Inferno-only (15 October, QoL #212): a save sent as the page closes (`io_close=1`, sent with keepalive) ends the play
 * session once it is saved, as the page's own sign-out would have (that one isn't sent with it: it could reach the
 * server first and the save be refused). Runs after the save's controller; nothing on a refused save.
 */
export const endAfterClosingSave = async (ctx: Parameters<KoaController>[0], next: () => Promise<unknown>) => {
  // (taken off the save first: the save's own checks refuse fields they don't know, anticheat save_unknown_fields)
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const closing = String(body.io_close ?? "") === "1";
  if ("io_close" in body) delete body.io_close;
  await next();
  if (!closing || ctx.status !== Status.OK || !ctx.authUser) return;
  try {
    const token = String(ctx.headers.authorization ?? "").replace("Bearer ", "");
    const { user } = verifyJwtToken(token);
    await endSession(user.sessionType, user.email, token);
    await unmarkPlaying(ctx.authUser.userid);
  } catch {
    // (the save is what mattered)
  }
};

