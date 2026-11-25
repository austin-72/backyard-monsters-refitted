import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { finishRun, HellgateError, openRun, runStatus } from "../../services/td/hellgate.js";
import { buyPerk, finishRun2, forgetRun2, openRun2, respecPerks, status2 } from "../../services/td/hellgate2.js";
import { logger } from "../../utils/logger.js";
import { saveCheckpoint, settleAbandoned } from "../../services/td/checkpoint.js";

/**
 * POST td (from the game, logged in): Hellgate Defense, the tower defense minigame (services/td/hellgate.ts).
 * Body: action = status | open | finish (wave, kills; linked: 1 for an arcade Versus or Co-op run, not recorded).
 * Hellgate Defense 2 (services/td/hellgate2.ts): status2 | open2 (map, difficulty, daily) | finish2 (wave, kills, victory) |
 * perk (id) | respec (QoL #498: the weekly free respec of the Hellforge's perks). finish and finish2 take `run` (QoL #459:
 * io_td.started; the same run finished again is answered as the first time). checkpoint (wave, kills): a wave cleared (services/td/checkpoint.ts); a run left open with one is
 * recorded by the next status, open, status2 or open2, which then also answer `recovered: {wave, v2}`.
 * Answers {error: 0, ...} or {error: "message"} (shown in the game).
 */
export const hellgate: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const action = String(body.action ?? "status");
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "Hellgate Defense isn't on this server." };
    return;
  }
  try {
    // (a run left open by a reload or a closed tab, recorded at its last checkpoint; QoL #289)
    const recovered = ["status", "open", "status2", "open2"].includes(action) ? await settleAbandoned(user) : null;
    const extra = recovered ? { recovered } : {};
    switch (action) {
      case "checkpoint":
        ctx.body = { error: 0, ...(await saveCheckpoint(user, body.wave, body.kills)) };
        return;
      case "status":
        ctx.body = { error: 0, ...(await runStatus(user)), ...extra };
        return;
      case "open":
        await forgetRun2(user.userid);
        ctx.body = { error: 0, ...(await openRun(user)), ...extra };
        return;
      case "finish":
        ctx.body = { error: 0, ...(await finishRun(user, body.wave, body.kills, body.linked, body.run)) };
        return;
      case "status2":
        ctx.body = { error: 0, ...(await status2(user)), ...extra };
        return;
      case "open2":
        ctx.body = { error: 0, ...(await openRun2(user, body.map, body.difficulty, body.daily)), ...extra };
        return;
      case "finish2":
        ctx.body = { error: 0, ...(await finishRun2(user, body.wave, body.kills, body.victory, body.run)) };
        return;
      case "perk":
        ctx.body = { error: 0, ...(await buyPerk(user, body.id)) };
        return;
      case "respec":
        // (QoL #498: once in 7 days, checked by the server)
        ctx.body = { error: 0, ...(await respecPerks(user)) };
        return;
      default:
        ctx.body = { error: `Unknown action: ${action}.` };
    }
  } catch (err) {
    if (err instanceof HellgateError) {
      ctx.body = { error: err.message };
      return;
    }
    logger.error(`Hellgate ${action} failed for ${user.username}: ${err}`);
    ctx.body = { error: "Hellgate Defense: something went wrong. Please try again." };
  }
};
