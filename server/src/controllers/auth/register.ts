import { recordReferral } from "../../services/user/referrals.js";
import bcrypt from "bcrypt";
import type { KoaController } from "../../utils/KoaController.js";
import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { FilterFrontendKeys } from "../../utils/FrontendKey.js";
import { emailUniqueErr, usernameUniqueErr } from "../../errors/errors.js";
import { logger } from "../../utils/logger.js";
import { Status } from "../../enums/StatusCodes.js";
import { UserRegistrationSchema } from "../../schemas/AuthSchemas.js";
import { BYMR_CDN } from "../../services/discord/fetchDiscordAvatar.js";

/**
 * Controller to handle user registration.
 *
 * This controller registers a new user based on the provided input. It hashes the user's
 * password, saves the user to the database, and returns the filtered user information.
 * If registration fails, it throws an authentication failure error.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if registration fails or if the request body is invalid.
 */
const defaultAvatarHost = () => {
  const base = (process.env.BASE_URL ?? "").replace(/\/+$/, "");
  // Local installs are reached on BASE_URL:PORT; a public one sits behind a proxy on BASE_URL itself.
  return /localhost|127\.0\.0\.1/.test(base) ? `${base}:${process.env.PORT ?? 3001}` : base || BYMR_CDN;
};

export const register: KoaController = async (ctx) => {
  const { ref, ...registeredUser } = UserRegistrationSchema.parse(ctx.request.body);

  // Find user by username or email
  const existingUser = await postgres.em.findOne(User, {
    $or: [
      { username: registeredUser.username },
      { email: registeredUser.email },
    ],
  });

  // If user exists, check if username or email is already taken
  if (existingUser) {
    const isUsernameTaken = existingUser.username === registeredUser.username;
    const isEmailTaken = existingUser.email === registeredUser.email;

    if (isUsernameTaken) throw usernameUniqueErr();
    if (isEmailTaken) throw emailUniqueErr();
  }

  const hash = await bcrypt.hash(registeredUser.password!, 10);

  // Create new user record
  const user = postgres.em.create(User, {
    ...registeredUser,
    // Served by this server (public/assets), so a private server does not lean on the upstream project's CDN.
    pic_square: `${defaultAvatarHost()}/assets/bym-refitted-assets/placeholder.jpg`,
    password: hash,
    registration_ip: ctx.ip,
  });

  postgres.em.persist(user);
  await postgres.em.flush();
  await recordReferral(user, ref);
  const filteredUser = FilterFrontendKeys(user);
  logger.info(
    `User ${filteredUser.username} registered successfully | ID: ${filteredUser.userid} | Email: ${filteredUser.email} | IP Address: ${ctx.ip}`
  );

  ctx.status = Status.OK;
  ctx.body = { user: filteredUser };
};
