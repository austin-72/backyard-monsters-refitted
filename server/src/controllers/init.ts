import { isOutdated } from "../services/clientBuild.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import z from "zod";
import { devConfig } from "../config/GameConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";
import { getAndroidVersion, getGameVersion } from "../config/VersionManifestConfig.js";

/** The last Flash game built (9 October, 21:04): every browser build is newer. */
const LAST_FLASH_BUILD = 202610092104;

export const InitSchema = z.object({
  apiVersion: z.string().optional().default(""),
  /** Inferno-only: the client's build stamp (see services/clientBuild.ts). Clients from before version control send none. */
  build: z.string().optional().default("0"),
  /** Inferno-only (13 October): sent by the browser game, never by the Flash one. */
  web: z.string().optional().default(""),
});

export const init: KoaController = async (ctx) => {
  const { apiVersion, build, web } = InitSchema.parse(ctx.request.body);

  // The Flash game is no longer made (its last build, 9 October, is older than every browser one): starting it again
  // brings the same old one back (bug report 88), so it is told where the game is now. (Whatever build is published:
  // asked only when the published one was newer, a server with an older stamp let it in.)
  const flash = web !== "1" && Number(build) > 0 && Number(build) <= LAST_FLASH_BUILD && infernoOnlyConfig.enabled;
  if (flash || isOutdated(build)) {
    ctx.status = Status.INTERNAL_SERVER_ERROR;
    const site = infernoOnlyConfig.seo?.siteUrl || infernoOnlyConfig.referral?.inviteUrl || "";
    ctx.body = {
      error: flash
        ? `The Flash version of the game has been retired. Play in your web browser instead${site ? `: ${site}` : ""} (same account, same yard).`
        : "A newer version of the game has been published. Close this window and start the game again to get it.",
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
