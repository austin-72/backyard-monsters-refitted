import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { deletePlayerKit, PlayerKitError, playerKits, renamePlayerKit, savePlayerKit } from "../../../services/maproom/v2/playerKits.js";
import { questBump } from "../../../services/quests/questProgress.js";

/** POST worldmapv2/playerkits: the player's own 6 kit slots (null for an empty one). */
export const getPlayerKits: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, kits: playerKits(user) };
};

/** POST worldmapv2/saveplayerkit {baseid, slot, name}: saves one of the player's outposts into a slot. */
export const saveKit: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  try {
    const kits = await savePlayerKit(user, String(body.baseid ?? ""), parseInt(String(body.slot ?? "0")), body.name);
    void questBump(user.userid, "kit_saved");
    ctx.body = { error: 0, kits };
  } catch (err) {
    if (!(err instanceof PlayerKitError)) throw err;
    ctx.body = { error: err.message };
  }
};

/** (QoL #337) POST worldmapv2/renameplayerkit {slot, name}: a new name for the kit in slot 1-6. */
export const renameKit: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  try {
    const kits = await renamePlayerKit(user, parseInt(String(body.slot ?? "0")), body.name);
    ctx.body = { error: 0, kits };
  } catch (err) {
    if (!(err instanceof PlayerKitError)) throw err;
    ctx.body = { error: err.message };
  }
};

/** (QoL #337) POST worldmapv2/deleteplayerkit {slot}: empties slot 1-6. */
export const deleteKit: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  try {
    const kits = await deletePlayerKit(user, parseInt(String(body.slot ?? "0")));
    ctx.body = { error: 0, kits };
  } catch (err) {
    if (!(err instanceof PlayerKitError)) throw err;
    ctx.body = { error: err.message };
  }
};
