import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { getGameLeaderboards } from "../../services/leaderboards/gameLeaderboards.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Inferno-only: the game's leaderboards (services/leaderboards/gameLeaderboards.ts): every world's players by
 * outposts and empire value, its alliances, and the Brimstone Pit's gamblers. The same payload for everyone,
 * made once every 5 minutes; `nextAt` says when the next one is out (the game doesn't ask before).
 *
 * Reply: { error: 0, generatedAt, nextAt, worlds, players, alliances, gamblers }, compressed (brotli or gzip)
 * when the request says it accepts that.
 */
export const getGameLeaderboardsController: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "There are no leaderboards here." };
    return;
  }
  const board = await getGameLeaderboards();
  ctx.type = "application/json";
  ctx.set("Cache-Control", "no-store");
  ctx.set("Vary", "Accept-Encoding");
  const acceptEncoding = ctx.headers["accept-encoding"];
  if (acceptEncoding && ctx.acceptsEncodings("br") === "br") {
    ctx.set("Content-Encoding", "br");
    ctx.body = await board.brotli();
    return;
  }
  if (acceptEncoding && ctx.acceptsEncodings("gzip") === "gzip") {
    ctx.set("Content-Encoding", "gzip");
    ctx.body = await board.gzip();
    return;
  }
  ctx.body = board.raw;
};
