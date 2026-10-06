import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { WorldMapCell } from "../../database/models/worldmapcell.model.js";
import { MapRoomCell, MapRoomVersion } from "../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { gauntletStatus } from "../../services/events/gauntlet.js";
import { isTestMode } from "../../services/admin/testMode.js";
import { userCell } from "../maproom/v2/cells/userCell.js";

/**
 * POST /gauntlet/status: Moloch's Gauntlet for the game's window: when, the ladder, the player's progress,
 * and their main yard as the map describes it (`home`): the game attacks from there, with the monsters
 * housed in it and its flinger, the way an attack from the map uses a yard in range.
 */
export const getGauntletStatus: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled || !infernoOnlyConfig.gauntlet.enabled) {
    ctx.body = { error: 0, enabled: false };
    return;
  }
  await postgres.em.populate(user, ["save"]);
  const worldid = user.save?.worldid;
  const cell = worldid
    ? await postgres.em.findOne(
        WorldMapCell,
        { uid: user.userid, base_type: MapRoomCell.HOMECELL, world: worldid, map_version: MapRoomVersion.V2 },
        { populate: ["save"] }
      )
    : null;
  let home: Record<string, unknown> | null = null;
  if (cell) {
    ctx.state.lastSeen = new Map();
    const data = await userCell(ctx, cell as never, new Map());
    if (data) home = { ...data, x: cell.x, y: cell.y };
  }
  ctx.body = { error: 0, enabled: true, ...(await gauntletStatus(user, await isTestMode(user))), home };
};
