import { MapRoom2, MapRoomCell, Terrain } from "../../../enums/MapRoom.js";
import { World } from "../../../database/models/world.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";
import { logger } from "../../../utils/logger.js";
import { generateNoise, getTerrainHeight } from "./generateMap.js";
import { Tribe } from "../../../enums/Tribes.js";
import { tribeForCell } from "./tribeForCell.js";
import { isOver } from "./underworld.js";
import { molochStrongholds } from "./tribeTerritories.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";

/**
 * Interface representing a single cell
 */
interface Cell {
  x: number;
  y: number;
  terrainHeight: number;
}

/**
 * Cells between two cells the way Map Room 2 measures attack range: the larger of the two
 * axis distances, across the map's wrapped edges (validateRange.ts).
 */
export const mapDistance = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return Math.max(Math.min(dx, MapRoom2.WIDTH - dx), Math.min(dy, MapRoom2.HEIGHT - dy));
};

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/**
 * Finds a free cell in a given world for a player's main yard: land, not taken, not a Moloch stronghold.
 *
 * Inferno-only placement rules (infernoOnlyConfig.spawn), so newcomers land among other players
 * without being on top of them or next to a stronghold:
 *  - within `nearPlayers` cells of some player's main yard or outpost,
 *  - more than `awayFromMainYards` cells from every main yard,
 *  - more than `awayFromMoloch` cells from every Moloch stronghold.
 * Candidates are rolled around the players' yards. After `attempts` rolls that break a rule (or
 * when the world has no players yet) any free land cell will do, as before.
 *
 * @param {World} world - The world in which to find a free cell.
 * @param {EntityManager<PostgreSqlDriver>} em - The entity manager for database operations.
 * @returns {Promise<Cell>} - The coordinates and terrain height of the free cell.
 * @throws {Error} - If no free cell is found at all.
 */
export const findFreeCell = async (world: World, em: EntityManager<PostgreSqlDriver>): Promise<Cell> => {
  const noise = generateNoise(world.uuid);
  const taken = new Set<string>();
  const players: { x: number; y: number; base_type: number }[] = [];

  for (const cell of await em.find(WorldMapCell, { world }, { fields: ["x", "y", "uid", "base_type"] })) {
    taken.add(`${cell.x},${cell.y}`);
    // (the underworld's outposts are not near anywhere up here: services/maproom/v2/underworld.ts)
    if (cell.uid > 0 && isOver(cell.x, cell.y) && (cell.base_type === MapRoomCell.HOMECELL || cell.base_type === MapRoomCell.OUTPOST)) players.push(cell);
  }

  /** The basic rules: land, not the origin (tribe conquest), not taken, not a stronghold. */
  const usable = (x: number, y: number): Cell | null => {
    if (x === 0 && y === 0) return null;
    const terrainHeight = getTerrainHeight(noise, x, y);
    if (terrainHeight <= Terrain.WATER3) return null;
    if (taken.has(`${x},${y}`)) return null;
    if (tribeForCell(world.uuid, x, y).tribe === Tribe.MOLOCH) return null;
    return { x, y, terrainHeight };
  };

  const rules = infernoOnlyConfig.spawn;
  if (infernoOnlyConfig.enabled && rules.enabled && players.length > 0) {
    const mainYards = players.filter((cell) => cell.base_type === MapRoomCell.HOMECELL);
    const molochs = molochStrongholds(world.uuid);

    for (let attempt = 0; attempt < rules.attempts; attempt++) {
      // Roll around a random player's yard, so the "near players" rule is usually met.
      const anchor = players[Math.floor(Math.random() * players.length)];
      const reach = rules.nearPlayers;
      const x = wrap(anchor.x + Math.floor(Math.random() * (2 * reach + 1)) - reach, MapRoom2.WIDTH);
      const y = wrap(anchor.y + Math.floor(Math.random() * (2 * reach + 1)) - reach, MapRoom2.HEIGHT);

      const cell = usable(x, y);
      if (!cell) continue;
      if (!players.some((p) => mapDistance(x, y, p.x, p.y) <= rules.nearPlayers)) continue;
      if (mainYards.some((p) => mapDistance(x, y, p.x, p.y) <= rules.awayFromMainYards)) continue;
      if (molochs.some(([mx, my]) => mapDistance(x, y, mx, my) <= rules.awayFromMoloch)) continue;

      logger.info(`Spawn (${x}, ${y}) found on roll ${attempt + 1}.`);
      return cell;
    }
    logger.info(`No spawn met the placement rules in ${rules.attempts} rolls; placing anywhere.`);
  }

  // Anywhere: random free land.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const cell = usable(Math.floor(Math.random() * MapRoom2.WIDTH), Math.floor(Math.random() * MapRoom2.HEIGHT));
    if (cell) return cell;
  }

  // TODO: Should not fail, put on another world?
  throw new Error("Failed to find land position after several attempts");
};
