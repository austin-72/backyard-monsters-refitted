import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { arcadeConfig } from "../../config/ArcadeConfig.js";
import { ArcadeError, arcadeStatus, board, ghosts, rank, startRun, submitRun } from "../../services/arcade/scores.js";
import { arcadeCounts, issueTicket } from "../../services/arcade/hub.js";
import { SiegeError, siegeAction } from "../../services/arcade/siege.js";
import { logger } from "../../utils/logger.js";

/**
 * POST arcade (from the game, logged in): the Devil's Arcade (services/arcade/).
 * Body: action = status | board (game, mode, period) | rank (game, mode, period) | start (game, mode) | submit (run, score, score2, ghost)
 *       | ghosts | ticket | counts | siege (op, ...: services/arcade/siege.ts).
 * Answers {error: 0, ...} or {error: "message"} (shown in the game).
 */
export const arcade: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const action = String(body.action ?? "status");
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled || !arcadeConfig.enabled) {
    ctx.body = { error: "The Devil's Arcade isn't open on this server." };
    return;
  }
  try {
    switch (action) {
      case "status":
        ctx.body = { error: 0, ...(await arcadeStatus(user)), ...arcadeCounts() };
        return;
      case "board":
        ctx.body = { error: 0, ...(await board(user, body.game, body.mode, body.period)) };
        return;
      case "rank":
        // (QoL #371: the player's place and record on a board, for a live match's result)
        ctx.body = { error: 0, ...(await rank(user, body.game, body.mode, body.period)) };
        return;
      case "start":
        ctx.body = { error: 0, ...(await startRun(user, body.game, body.mode)) };
        return;
      case "submit":
        ctx.body = { error: 0, ...(await submitRun(user, body.run, body.score, body.score2, body.ghost)) };
        return;
      case "ghosts":
        ctx.body = { error: 0, ...(await ghosts(user)) };
        return;
      case "ticket":
        ctx.body = { error: 0, ...(await issueTicket(user)) };
        return;
      case "counts":
        ctx.body = { error: 0, ...arcadeCounts() };
        return;
      case "siege":
        ctx.body = { error: 0, ...(await siegeAction(user, body)) };
        return;
      default:
        ctx.body = { error: `Unknown action: ${action}.` };
    }
  } catch (err) {
    if (err instanceof ArcadeError || err instanceof SiegeError) {
      ctx.body = { error: err.message };
      return;
    }
    logger.error(`Arcade ${action} failed for ${user.username}: ${err}`);
    ctx.body = { error: "The Devil's Arcade: something went wrong. Please try again." };
  }
};
