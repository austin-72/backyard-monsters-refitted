import { isOutdated } from "../services/clientBuild.js";
import z from "zod";
import { devConfig } from "../config/GameConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";
import { getAndroidVersion, getGameVersion } from "../config/VersionManifestConfig.js";

export const InitSchema = z.object({
  apiVersion: z.string().optional().default(""),
  /** Inferno-only: the client's build stamp (see services/clientBuild.ts). Clients from before version control send none. */
  build: z.string().optional().default("0"),
});

export const init: KoaController = async (ctx) => {
  const { apiVersion, build } = InitSchema.parse(ctx.request.body);

  if (isOutdated(build)) {
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = {
      error: "A newer version of the game has been published. Close this window and start the game again to get it.",
      versionMismatch: true,
    };
    return;
  }

  const validVersions = [getGameVersion(), getAndroidVersion()].filter(Boolean);

  if (validVersions.length > 0 && !validVersions.includes(apiVersion)) {
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: `Please update to the latest version. Visit our downloads page to get the latest client.`, versionMismatch: true };
    return;
  }

  ctx.status = Status.OK;
  ctx.body = { debugMode: devConfig.debugMode };
};
