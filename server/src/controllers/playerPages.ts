import { statSync } from "fs";
import path from "path";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";

/**
 * Inferno-only (QoL #644-#646): short addresses for the players' help pages in public/docs, served there by
 * koa-static like the "What's different?" PDF (controllers/whatsDifferent.ts):
 *
 *   /faq       public/docs/faq.html       questions players ask (written by hand)
 *   /shiny     public/docs/shiny.html     Shiny earned and spent (made from InfernoOnlyConfig by scripts/shinyPage.ts)
 *   /schedule  public/docs/schedule.html  when the recurring events happen (written by hand)
 *   /changes   public/docs/changelog.html the Change Log as a page (QoL #649: it reads /changelog, the game's own)
 *
 * Each sends the browser on to the file with its modified time on the end, so a new copy is never served from a
 * cache (the browser's or the CDN's keep public/ files an hour) and the short address never has to change.
 */
export const PLAYER_PAGES = { faq: "faq.html", shiny: "shiny.html", schedule: "schedule.html", changelog: "changelog.html" } as const;

export const playerPage = (file: (typeof PLAYER_PAGES)[keyof typeof PLAYER_PAGES]): KoaController => async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  let version: number;
  try {
    version = Math.floor(statSync(path.join("public", "docs", file)).mtimeMs / 1000);
  } catch {
    ctx.status = Status.NOT_FOUND;
    ctx.body = "That page isn't on the server yet.";
    return;
  }
  ctx.set("Cache-Control", "no-store");
  // (22 October: the page's own choices go along, "/changes?topic=yard": the Change Log's, from the game)
  const own = new URLSearchParams(ctx.querystring || "");
  own.delete("v");
  const rest = own.toString();
  ctx.redirect(`/docs/${file}?v=${version}${rest ? `&${rest}` : ""}`);
};
