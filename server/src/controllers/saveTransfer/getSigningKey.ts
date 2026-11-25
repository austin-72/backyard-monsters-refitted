import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { SAVE_CODE_ALGORITHM, SAVE_CODE_PREFIX, SAVE_CODE_VERSION } from "../../config/SaveTransferConfig.js";
import { getSigningKey } from "../../services/saveTransfer/saveSigningKeys.js";
import { getIssuerName } from "../../services/saveTransfer/exportSave.js";

/**
 * Public controller returning the key this server signs save codes with.
 *
 * Operators of servers that import from this one put the public key in their
 * SAVE_IMPORT_SOURCE_KEYS, so they only accept codes this server made.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 */
export const getSaveSigningKey: KoaController = async (ctx) => {
  const key = getSigningKey();

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    format: SAVE_CODE_PREFIX,
    version: SAVE_CODE_VERSION,
    enabled: key !== null,
    ...(key && {
      issuer: getIssuerName(),
      algorithm: SAVE_CODE_ALGORITHM,
      keyId: key.keyId,
      publicKey: key.publicKeyBase64,
    }),
  };
};
