import { statSync } from "fs";
import path from "path";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";

/**
 * Inferno-only: the login page's "What's different?" button (2 October) opens this in a new page. It
 * sends the browser on to the overview of every change to the base game, public/docs/<PDF>, with the
 * file's modified time on the end, so a new copy of the document is never served from a cache (the
 * browser's or the CDN's) and the button's link never has to change.
 *
 * To publish a new version: replace server/public/docs/Inferno-Maproom-2-changes.pdf.
 */
export const WHATS_DIFFERENT_PDF = "Inferno-Maproom-2-changes.pdf";

export const whatsDifferent: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  let version: number;
  try {
    version = Math.floor(statSync(path.join("public", "docs", WHATS_DIFFERENT_PDF)).mtimeMs / 1000);
  } catch {
    ctx.status = Status.NOT_FOUND;
    ctx.body = "The overview isn't on the server yet.";
    return;
  }
  ctx.set("Cache-Control", "no-store");
  ctx.redirect(`/docs/${WHATS_DIFFERENT_PDF}?v=${version}`);
};
