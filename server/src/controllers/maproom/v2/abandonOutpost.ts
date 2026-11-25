import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { permissionErr } from "../../../errors/errors.js";
import { AbandonError, abandonOutpost } from "../../../services/maproom/v2/abandonOutpost.js";

/**
 * (Inferno-only, QoL #343) POST worldmapv2/abandonoutpost {baseid, confirm: "ABANDON"}: lets one of the player's
 * outposts go back to the wild (services/maproom/v2/abandonOutpost.ts). Answers {error: 0, x, y, outposts} (how many
 * are left), or {error: "why"} when it is refused.
 */
export const abandonOutpostController: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  // the player typed it (the game asks): nothing else lets an outpost go
  if (String(body.confirm ?? "").trim().toUpperCase() !== "ABANDON") {
    ctx.body = { error: "Type ABANDON to confirm." };
    return;
  }
  try {
    const result = await abandonOutpost(user, String(body.baseid ?? "").trim());
    ctx.body = { error: 0, ...result };
  } catch (err) {
    if (!(err instanceof AbandonError)) throw err;
    ctx.body = { error: err.message };
  }
};
