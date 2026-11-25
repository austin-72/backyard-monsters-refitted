import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { buildSaveExport } from "../../services/saveTransfer/exportSave.js";
import { logger } from "../../utils/logger.js";

/**
 * Controller to export the authenticated player's yard as a signed save code.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {ClientSafeError} If exports are not configured or the player has no yard yet.
 */
export const exportSave: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { code, payload } = await buildSaveExport(user);

  logger.info("User {username} exported their save | ID: {userid}", {
    event: "save-export",
    username: user.username,
    userid: user.userid,
    exportId: payload.exportId,
    keyId: payload.issuer.keyId,
  });

  ctx.status = Status.OK;
  ctx.body = { error: 0, code, exportedAt: payload.exportedAt };
};
