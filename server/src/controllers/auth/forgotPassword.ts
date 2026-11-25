import path from "path";
import JWT from "jsonwebtoken";

import { Status } from "../../enums/StatusCodes.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import { promises as fs } from "fs";
import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { authFailureErr } from "../../errors/errors.js";
import { ForgotPasswordSchema } from "../../schemas/AuthSchemas.js";
import { transporter } from "../../config/MailConfig.js";
import { resetLinkExpiry, storedResetToken } from "../../services/user/passwordReset.js";
/**
 * Controller to handle forgot password functionality.
 *
 * This controller validates the email provided in the request body,
 * generates a short-lived JWT token, stores the token in the database
 * associated with the user's email, reads the HTML template for the
 * password reset email, replaces the placeholder with the reset link,
 * and sends the email using the configured SMTP transporter.
 *
 * @param {Object} ctx - Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the email is sent or an error occurs.
 */
export const forgotPassword: KoaController = async (ctx) => {
  try {
    const { email } = ForgotPasswordSchema.parse(ctx.request.body);

    // Generate a short-lived JWT token
    const token = JWT.sign({ user: { email } }, process.env.SECRET_KEY!, {
      expiresIn: "20m",
    });

    // Store the token in the database associated with the user's email
    const user = await postgres.em.findOne(User, { email });
    
    if (!user) {
      logger.error(`ForgotPassword: User not found for email: ${email}`);
      throw authFailureErr();
    }

    // (18 October, SUSPECTED-BUGS.md: anyone who knew the email could cancel the 24-hour link an admin gave the
    // player, since a request stored its own token first; with no mail set up, that token reached nobody) no mail
    // set up: nothing changes; a link from the admin panel still good for more than this one's 20 minutes is kept
    if (!process.env.SMTP_HOST) throw new Error("mail isn't set up on this server");
    const kept = resetLinkExpiry(user.resetToken);
    if (kept && kept > Date.now() + 20 * 60_000) throw new Error("an admin's reset link is still good");

    // Read the HTML template
    const templatePath = path.resolve(
      import.meta.dirname,
      "../../../public/templates/forgot-password.html"
    );
    const html = await fs.readFile(templatePath, "utf-8");

    // Send user token in email
    const resetLink = `${process.env.WEB_URL}/reset-password?token=${token}`;
    const emailHtml = html.replace("{{resetLink}}", resetLink);

    const mailOptions = {
      from: "Backyard Monsters Refitted <info@bymrefitted.com>",
      to: email,
      subject: "Password reset request | BYM Refitted",
      html: emailHtml,
    };

    // Send the email; the token is stored once it is on its way
    await transporter.sendMail(mailOptions);
    // (16 October, QoL #244: kept as a hash with its time limit, as the admin panel's links are; resetPassword checks it)
    user.resetToken = storedResetToken(token, Date.now() + 20 * 60_000);
    postgres.em.persist(user);
    await postgres.em.flush();

    ctx.status = Status.OK;
    ctx.body = { message: "Password reset email sent successfully." };
  } catch (error) {
    logger.error(`Error in forgotPassword controller: ${error}`);
    ctx.status = Status.BAD_REQUEST;
    ctx.body = {
      message: "Failed to send email. Please try again later.",
    };
  }
};
