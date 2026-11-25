import z from "zod";
import { devConfig } from "../config/GameConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";
import { isAcceptedVersion } from "../config/VersionManifestConfig.js";
import { isSaveImportEnabled } from "../config/SaveTransferConfig.js";

export const InitSchema = z.object({
  apiVersion: z.string().optional().default(""),
});

export const init: KoaController = async (ctx) => {
  const { apiVersion } = InitSchema.parse(ctx.request.body);
  const acceptedVersion = isAcceptedVersion(apiVersion);

  if (!acceptedVersion) {
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: `Please update to the latest version. Visit our downloads page to get the latest client.`, versionMismatch: true };
    return;
  }

  ctx.status = Status.OK;
  // saveImport tells the register screen whether to offer the save code field
  ctx.body = { debugMode: devConfig.debugMode, saveImport: isSaveImportEnabled() };
};
