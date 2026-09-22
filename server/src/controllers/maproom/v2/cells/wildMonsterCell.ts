import type { Loaded } from "@mikro-orm/core";
import { WorldMapCell } from "../../../../database/models/worldmapcell.model.js";
import { tribeForCell } from "../../../../services/maproom/v2/tribeForCell.js";
import { MapRoomCell } from "../../../../enums/MapRoom.js";
import { generateBaseId } from "../../../../utils/generateBaseId.js";

export type WildMonsterCellFields = "*" | "save.damage" | "save.destroyed";

type Cell = Loaded<WorldMapCell, "save", WildMonsterCellFields>;

export const wildMonsterCell = async (cell: Cell, worldId: string) => {
  const [cellX, cellY] = [cell.x, cell.y];

  const { tribe, level } = tribeForCell(worldId, cellX, cellY);

  const baseid = generateBaseId(worldId, cellX, cellY);
  
  return {
    uid: 0,
    b: MapRoomCell.WM,
    i: cell.terrainHeight,
    bid: baseid,
    n: tribe,
    l: level,
    dm: cell?.save?.damage || 0,
    d: cell?.save?.destroyed || 0,
  };
};
