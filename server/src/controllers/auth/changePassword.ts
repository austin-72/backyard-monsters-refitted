import bcrypt from "bcrypt";

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { ChangePasswordSchema } from "../../schemas/AuthSchemas.js";
import { parseInput } from "../../schemas/parseInput.js";
import { postgres } from "../../server.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { endSessions, saveSession } from "../../services/user/sessionStore.js";
import { logger } from "../../utils/logger.js";
import { agentOf } from "../../services/user/savedLogins.js";

/**
 * Inferno-only (15 October, QoL #198): a new password, chosen in the game (the page's settings), with the current one.
 * Every other login of the account ends (other devices, saved logins), as after a reset; the game it is changed in
 * plays on. The passwords travel as `oldPassword` / `newPassword`, which the request log never prints.
 */
export const changePassword: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { oldPassword, newPassword } = parseInput(ChangePasswordSchema, ctx.request.body);
  const ok = !!user.password && (await bcrypt.compare(String(oldPassword), user.password));
  if (!ok) {
    ctx.status = Status.OK;
    ctx.body = { error: "That isn't your current password." };
    return;
  }
  if (oldPassword === newPassword) {
    ctx.status = Status.OK;
    ctx.body = { error: "The new password is the same as the current one." };
    return;
  }
  user.password = await bcrypt.hash(String(newPassword), 10);
  user.resetToken = "";
  await postgres.em.flush();
  // (this game's own login kept: ended with the rest, then put back)
  const token = String(ctx.headers.authorization || "").replace("Bearer ", "");
  const sessionType = verifyJwtToken(token).user.sessionType;
  try {
    await endSessions(user.email);
    await saveSession(sessionType, user.email, token, agentOf(ctx.get("user-agent")));
  } catch (err) {
    logger.warn(`Could not end ${user.email}'s other logins after a password change: ${err}`);
  }
  logger.info(`${user.username} changed their password`);
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
