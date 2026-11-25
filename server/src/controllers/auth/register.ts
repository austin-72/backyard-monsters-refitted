import bcrypt from "bcrypt";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { KoaController } from "../../utils/KoaController.js";
import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { FilterFrontendKeys } from "../../utils/FrontendKey.js";
import { emailUniqueErr, saveAlreadyImportedErr, usernameUniqueErr } from "../../errors/errors.js";
import { logger } from "../../utils/logger.js";
import { Status } from "../../enums/StatusCodes.js";
import { UserRegistrationSchema } from "../../schemas/AuthSchemas.js";
import { BYMR_CDN } from "../../services/discord/fetchDiscordAvatar.js";
import {
  applyImportedSave,
  readSaveCodeForRegistration,
  type ImportedSaveSummary,
} from "../../services/saveTransfer/importSave.js";

/**
 * Controller to handle user registration.
 *
 * This controller registers a new user based on the provided input. It hashes the user's
 * password, saves the user to the database, and returns the filtered user information.
 * If registration fails, it throws an authentication failure error.
 *
 * When save imports are enabled, a save code can be sent with the registration. It is
 * verified first, then the account and its imported yard are created in one transaction.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if registration fails or if the request body is invalid.
 */
export const register: KoaController = async (ctx) => {
  const { saveCode, ...registeredUser } = UserRegistrationSchema.parse(ctx.request.body);

  const importedSave = saveCode ? await readSaveCodeForRegistration(saveCode) : null;

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

  let user: User;
  let imported: ImportedSaveSummary | null;

  try {
    ({ user, imported } = await postgres.em.transactional(async (em) => {
      // Create new user record
      const created = em.create(User, {
        ...registeredUser,
        pic_square: `${BYMR_CDN}/assets/bym-refitted-assets/placeholder.jpg`,
        password: hash,
      });

      em.persist(created);
      await em.flush();

      return {
        user: created,
        imported: importedSave ? await applyImportedSave(em, created, importedSave) : null,
      };
    }));
  } catch (err) {
    if (err instanceof UniqueConstraintViolationException && err.message.includes("save_import")) {
      throw saveAlreadyImportedErr();
    }

    throw err;
  }

  const filteredUser = FilterFrontendKeys(user);
  logger.info(
    `User ${filteredUser.username} registered successfully | ID: ${filteredUser.userid} | Email: ${filteredUser.email} | IP Address: ${ctx.ip}`
  );

  if (importedSave) {
    logger.info("User {username} imported the save of {sourceUsername} (source ID {sourceUserid}) | ID: {userid}", {
      event: "save-import",
      username: user.username,
      userid: user.userid,
      sourceUsername: importedSave.account.username,
      sourceUserid: importedSave.account.userid,
      exportId: importedSave.exportId,
      keyId: importedSave.issuer.keyId,
    });
  }

  ctx.status = Status.OK;
  ctx.body = { user: filteredUser, ...(imported && { importedSave: imported }) };
};
