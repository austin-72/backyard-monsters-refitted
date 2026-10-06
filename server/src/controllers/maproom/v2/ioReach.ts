import type { KoaController } from "../../../utils/KoaController.js";
import { User } from "../../../database/models/user.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { postgres } from "../../../server.js";
import { Status } from "../../../enums/StatusCodes.js";
import { MapRoomVersion } from "../../../enums/MapRoom.js";
import { permissionErr } from "../../../errors/errors.js";
import { userCell } from "./cells/userCell.js";
import { rangeYards } from "../../../services/maproom/v2/validateRange.js";
import { openEntries, openExits, portalsFor, underworldOn } from "../../../services/maproom/v2/underworld.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";

const SAVE_FIELDS = [
  "*",
  "save.basesaveid",
  "save.locked",
  "save.empirevalue",
  "save.flinger",
  "save.catapult",
  "save.protected",
  "save.resources",
  "save.monsters",
  "save.damage",
  "save.destroyed",
  "save.points",
  "save.basevalue",
  "save.attackid",
  "save.attacks",
] as const;

/**
 * Inferno-only: what the player's yards reach through the underworld's portals (services/maproom/v2/underworld.ts),
 * for the map to work out range with (the yards it uses are on the other layer, so never on screen).
 *
 *  - `portals`: every portal, [overworld x, y, underworld x, y];
 *  - `entry`: by portal number, the player's overworld yards that may have it in range: [baseid, cells away] (the
 *    game checks their range, Declare War included);
 *  - `exit`: by portal number, the player's underworld outposts next to its underworld end: [baseid, cells away];
 *  - `cells`: those yards as getarea sends them (their monsters to attack with), by baseid.
 */
export const ioReach: KoaController = async (ctx) => {
  if (!underworldOn()) throw permissionErr();

  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const save = user.save!;
  const worldid = save.worldid;

  if (!worldid) {
    ctx.status = Status.OK;
    ctx.body = { error: 0, portals: [], entry: {}, exit: {}, cells: {} };
    return;
  }

  const yards = await rangeYards(user);
  const entries = openEntries(worldid, yards);
  const exits = openExits(worldid, yards);

  const entry: Record<number, [string, number][]> = {};
  const exit: Record<number, [string, number][]> = {};
  const wanted = new Set<string>();
  for (const [i, list] of entries) {
    entry[i] = list.map(({ yard, d }) => [yard.baseid, d]);
    list.forEach(({ yard }) => wanted.add(yard.baseid));
  }
  for (const [i, list] of exits) {
    exit[i] = list.map(({ yard, d }) => [yard.baseid, d]);
    list.forEach(({ yard }) => wanted.add(yard.baseid));
  }

  const cells: Record<string, { x: number; y: number; data: unknown }> = {};
  if (wanted.size) {
    const rows = await postgres.em.find(
      WorldMapCell,
      { baseid: { $in: [...wanted] }, world: worldid, map_version: MapRoomVersion.V2, uid: user.userid },
      { populate: ["save"], fields: SAVE_FIELDS },
    );
    ctx.state.lastSeen = new Map();
    ctx.state.pendingInvites = new Map();
    for (const row of rows) {
      const data = await userCell(ctx, row as never, new Map());
      if (data && row.baseid) cells[row.baseid] = { x: row.x, y: row.y, data };
    }
  }

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    origin: underworldConfig.origin,
    size: underworldConfig.size,
    portals: portalsFor(worldid).map((p) => [p.x, p.y, p.ux, p.uy]),
    entry,
    exit,
    cells,
  };
};
