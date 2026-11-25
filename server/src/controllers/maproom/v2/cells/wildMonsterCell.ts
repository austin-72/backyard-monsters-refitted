import type { Loaded } from "@mikro-orm/core";
import { WorldMapCell } from "../../../../database/models/worldmapcell.model.js";
import { tribeForCell } from "../../../../services/maproom/v2/tribeForCell.js";
import { MapRoomCell } from "../../../../enums/MapRoom.js";
import { generateBaseId } from "../../../../utils/generateBaseId.js";
import { WILD_MONSTER_EXPIRATION } from "../../../base/load/modes/baseModeView.js";

export type WildMonsterCellFields = "*" | "save.damage" | "save.destroyed" | "save.savetime";

type Cell = Loaded<WorldMapCell, "save", WildMonsterCellFields>;

export const wildMonsterCell = async (cell: Cell, worldId: string) => {
  const [cellX, cellY] = [cell.x, cell.y];

  const { tribe, level, under } = tribeForCell(worldId, cellX, cellY);

  const baseid = generateBaseId(worldId, cellX, cellY);
  
  return {
    ...(under && { u: 1 }),
    uid: 0,
    b: MapRoomCell.WM,
    i: cell.terrainHeight,
    bid: baseid,
    n: tribe,
    l: level,
    dm: cell?.save?.damage || 0,
    d: cell?.save?.destroyed || 0,
    // (QoL #64, 14 October: when a damaged yard goes back to fresh: 12 hours after its last attack, tribeReset.ts)
    ...(((cell?.save?.damage || 0) > 0 || (cell?.save?.destroyed || 0) > 0) && Number(cell?.save?.savetime) > 0
      ? { rs: Number(cell.save!.savetime) + WILD_MONSTER_EXPIRATION }
      : {}),
  };
};
