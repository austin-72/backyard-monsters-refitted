import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { readTrophiesOf, TROPHIES_OF_MAX } from "../../services/events/trophies.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (QoL #607): trophies/of (ids: player ids with commas between, at most TROPHIES_OF_MAX): the event
 * trophies of those players (services/events/trophies.ts), for the icons next to their names in the chat's name menu
 * and the alliance's Members list (the game: IoTrophies.iconsFor). Answers { error: 0, trophies: { "<id>": {
 * fmi1: 3, gauntlet: 1 } } } or { error: "message" } (status 200).
 */
export const trophiesOf: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "Trophies aren't here." };
    return;
  }
  const p = { ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) } as Record<string, unknown>;
  const ids = String(p.ids ?? "")
    .split(",")
    .slice(0, TROPHIES_OF_MAX)
    .map((s) => Math.floor(Number(s)))
    .filter((n) => Number.isInteger(n) && n > 0);
  try {
    ctx.body = { error: 0, trophies: await readTrophiesOf(ids) };
  } catch (e) {
    logger.error(`Trophies of: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};
