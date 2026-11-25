import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { Status } from "../../enums/StatusCodes.js";
import type { KoaController } from "../../utils/KoaController.js";
import { authFailureErr } from "../../errors/errors.js";
import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { logger } from "../../utils/logger.js";
import { ResetPasswordSchema } from "../../schemas/AuthSchemas.js";
import { parseInput } from "../../schemas/parseInput.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { endSessions } from "../../services/user/sessionStore.js";
import { isAdminResetToken, resetTokenMatches, resetTokenUserId } from "../../services/user/passwordReset.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

/**
 * Controller to handle password reset requests.
 *
 * This controller validates the password and token provided in the request body,
 * verifies the token, retrieves the user associated with the token from the database,
 * and updates the user's password. If the token is expired, an error is returned.
 *
 * Inferno-only (16 October, QoL #244): also the links admins make in the panel (services/user/passwordReset.ts),
 * opened on the server's own page (public/docs/reset-password.html): "<userid>.<secret>", 24 hours, once. The account
 * keeps only a hash of either kind of token. The new password's rules are said as at registration (a password
 * breaking them read "Could not authenticate"). The token is never written to the log (the route has no logRequest).
 *
 * @param {Context} ctx - Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the password reset process is complete.
 */
export const resetPassword: KoaController = async (ctx) => {
  const { password, token } = parseInput(ResetPasswordSchema, ctx.request.body);
  let user: User | null = null;

  if (isAdminResetToken(token)) {
    // (QoL #244: an admin's link)
    user = await postgres.em.findOne(User, { userid: resetTokenUserId(token)! });
    if (!user || !resetTokenMatches(user.resetToken, token)) {
      logger.warn(`Reset password: an admin's reset link that is expired, used or replaced${user ? ` (account #${user.userid})` : ""}`);
      ctx.status = Status.UNAUTHORIZED;
      ctx.body = { message: "This reset link has expired, was already used, or a newer one was made. Ask an admin on Discord for a new one." };
      return;
    }
  } else {
    try {
      const decodedToken = verifyJwtToken(token);

      // Verify the token
      const { email } = decodedToken.user;

      user = await postgres.em.findOne(User, { email });
      if (!user || !resetTokenMatches(user.resetToken, token)) throw authFailureErr();
    } catch (error) {
      logger.error(`Error resetting password: ${error}`);
      if (error instanceof TokenExpiredError) {
        ctx.status = Status.UNAUTHORIZED;
        ctx.body = {
          message:
            "Password reset token has expired. Please request a new password change.",
        };
        return;
      }

      if (error instanceof JsonWebTokenError) logger.error(`Invalid token: ${error}`);
      throw authFailureErr();
    }
  }

  if (!user) throw authFailureErr();
  const account: User = user;
  const hashedPassword = await bcrypt.hash(password!, 10);

  // Update the user's password (the link used up)
  account.password = hashedPassword;
  account.resetToken = "";
  postgres.em.persist(account);
  await postgres.em.flush();
  // (13 October) a new password ends every saved login and play session of the account, on every device
  await endSessions(account.email).catch((err) => logger.warn(`Could not end ${account.email}'s logins after a password reset: ${err}`));
  logger.info(`${account.username} reset their password with a reset link`);

  ctx.status = Status.OK;
  ctx.body = {
    message: "Password has been reset successfully.",
  };
};
