import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { permissionErr } from "../../../errors/errors.js";
import { postgres } from "../../../server.js";
import { OutpostNameError, setOutpostName } from "../../../services/maproom/v2/outpostNames.js";

/**
 * (Inferno-only, QoL #326) POST worldmapv2/outpostname {baseid, name}: names one of the player's outposts ("" removes
 * the name). Answers {error: 0, baseid, name} with the name as kept (cleaned), or {error: "why"}.
 */
export const outpostName: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const baseid = String(body.baseid ?? "").trim();
  await postgres.em.populate(user, ["save"]);
  ctx.status = Status.OK;
  try {
    const name = await setOutpostName(user.userid, (user.save?.outposts ?? []) as [number, number, string][], baseid, body.name);
    ctx.body = { error: 0, baseid, name };
  } catch (err) {
    if (!(err instanceof OutpostNameError)) throw err;
    ctx.body = { error: err.message };
  }
};
