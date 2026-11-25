import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { Status } from "../enums/StatusCodes.js";
import { assetMapBody, assetMapVersion } from "../services/assetMap.js";
import type { KoaController } from "../utils/KoaController.js";

/**
 * Inferno-only (23 October): GET /assetmap: each picture's version, from its content (services/assetMap.ts), for the
 * game's picture addresses (GLOBAL.ioVersioned). Asked for with the version it is (?v=, the io_assetmap flag): kept for
 * good, as a new version is a new address; asked for without, or with an old one: not kept.
 */
export const assetMap: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  const body = assetMapBody();
  const asked = String(ctx.query.v ?? "");
  ctx.set("Cache-Control", asked && asked === assetMapVersion() ? "public, max-age=31536000, immutable" : "no-cache, no-store, must-revalidate");
  ctx.type = "application/json";
  ctx.status = Status.OK;
  ctx.body = body;
};
