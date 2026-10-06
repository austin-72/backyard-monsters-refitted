import type { Loaded } from "@mikro-orm/core";
import { Save } from "../../../database/models/save.model.js";
import { User } from "../../../database/models/user.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { postgres } from "../../../server.js";
import { logReport } from "../../base/reportManager.js";
import { MapRoom2, MapRoomVersion } from "../../../enums/MapRoom.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { Status } from "../../../enums/StatusCodes.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { isOver, isUnder, portalAt, underworldOn, underworldReaches, type RangeYard } from "./underworld.js";

type RangeOptions = { baseid?: string; attackCell?: Loaded<WorldMapCell, never> };

const DECLARE_WAR_RANGE = 2;

/** An answer, not a failure (it was a 500, and each one a server bug report). */
const outOfRangeErr = () =>
  new ClientSafeError({
    message: "This yard is out of range of your Flingers.",
    status: Status.FORBIDDEN,
    // (Inferno: an attack refused; the game says so and goes home, bug report 66)
    data: { io_refused: "range" },
    isClientFriendly: true,
  });

const MAX_OUTPOST_RANGE = 4;

/**
 * A base's flinger range, with the Declare War allowance always included.
 *
 * @param {number} range - The base's own flinger range.
 * @returns {number} The range to validate against.
 */
const withDeclareWar = (range: number) => (range > 0 ? range + DECLARE_WAR_RANGE : 0);

/**
 * Validates if the target is within the attack range of the user's base.
 * Delegates to the appropriate version-specific handler based on map version.
 *
 * @param {User} user - The user object containing the save data
 * @param {Save} save - The save object containing the user's base and outposts
 * @param {MapRoomVersion} mapversion - The map room version
 * @param {RangeOptions} options - The options object
 * @returns {Promise<Save>} - The save object if the attack is valid
 */
export const validateRange = async (
  user: User, 
  save: Save, mapversion: MapRoomVersion | undefined, 
  options: RangeOptions) => {
  if (!mapversion) throw new Error("Map version is required for range validation.");
  
  switch (mapversion) {
    case MapRoomVersion.V1:
      return save;

    case MapRoomVersion.V2:
      return validateRangeV2(user, save, options);

    case MapRoomVersion.V3:
      return validateRangeV3(save);

    default:
      throw new Error(`validateRange: unhandled map version ${mapversion}`);
  }
};

/**
 * MR3 range validation.
 * Range is checked client-side before the attack request is sent.
 * TODO: Implement server-side validation for MR3 cost ranges. Right now we just return the save.
 *
 * @param {Save} save - The save being attacked
 * @returns {Save}
 */
const validateRangeV3 = (save: Save) => save;

/**
 * Validates if the target is within the attack range of the user's main base or any of their outposts.
 * Wiki: https://backyardmonsters.fandom.com/wiki/Flinger
 *
 * Invalidates an attack if:
 * 1| No attack cell is found
 * 2| No outposts are owned and the main base is out of range
 * 3| No outposts near attack cell
 * 4| No outposts are within attack range
 *
 * @param {User} user - The user object containing the save data
 * @param {Save} save - The save object containing the user's base and outposts
 * @param {RangeOptions} options - The options object
 *
 * @throws {Error} - attack invalidation error
 * @returns {Promise<Save>} - The save object if the attack is valid
 */
const validateRangeV2 = async (user: User, save: Save, options: RangeOptions) => {
  const { homebase, outposts, flinger } = user.save!;

  if (!homebase) throw new Error(`${user.username} has no homebase.`);
  
  let attackCell: Loaded<WorldMapCell, never> | null | undefined = options?.attackCell;

  // First, retrieve the cell under attack
  if (!attackCell && options?.baseid) {
    attackCell = await postgres.em.findOne(WorldMapCell, { baseid: options.baseid });
  }

  if (!attackCell) throw new Error("Attack cell not found.");

  const [cellX, cellY] = [attackCell.x, attackCell.y];
  const worldid = user.save!.worldid;

  // Inferno-only: the underworld (services/maproom/v2/underworld.ts). A cell there is only ever reached through
  // it (the square check below would wrap 505 to 105 and let any yard near 105 attack it); a cell up here can
  // also be reached from an underworld outpost next to a portal near it.
  const underworld = underworldOn() && Boolean(worldid);
  if (underworld && isUnder(cellX, cellY)) {
    if (portalAt(worldid!, cellX, cellY)) throw outOfRangeErr();
    if (underworldReaches(worldid!, cellX, cellY, await rangeYards(user))) return save;
    await logReport(user, `${user.username} attacked out of range underworld base: ${attackCell.baseid}`);
    throw outOfRangeErr();
  }
  if (!isOver(cellX, cellY)) throw outOfRangeErr();

  if (await stockInRange(cellX, cellY, homebase, outposts, flinger)) return save;

  if (underworld && underworldReaches(worldid!, cellX, cellY, await rangeYards(user))) return save;

  const message = `${user.username} attacked out of range base: ${attackCell.baseid}`;
  await logReport(user, message);

  throw outOfRangeErr();
};

/**
 * The stock Map Room 2 check: the main yard, or an outpost, within its range (and Declare War's) of the cell, by
 * the larger of the two axis distances across the wrapped edges.
 */
const stockInRange = async (
  cellX: number,
  cellY: number,
  homebase: string[],
  outposts: [number, number, string][],
  flinger: number,
) => {
  const [homeX, homeY] = homebase.map(Number);

  // Then, we determine if the main yard is within range
  const mainYardRange = getMainYardRange(flinger);

  const totalRange = withDeclareWar(mainYardRange);
  const distanceFromMain = getDistanceFromMain(cellX, cellY, homeX, homeY);

  if (distanceFromMain <= totalRange) return true;

  if (outposts.length === 0) return false;

  // "x,y": without the comma 1,23 and 12,3 were the same key.
  const userOutposts = new Map(outposts.map(([x, y, id]) => [`${x},${y}`, id]));
  const outpostsInRange: { baseid: string; dx: number; dy: number }[] = [];

  // Otherwise, we collect the baseid's of outposts within reach of the attack cell.
  const sweep = MAX_OUTPOST_RANGE + DECLARE_WAR_RANGE;

  for (let dx = -sweep; dx <= sweep; dx++) {
    for (let dy = -sweep; dy <= sweep; dy++) {
      const neighborX = (cellX + dx + MapRoom2.WIDTH) % MapRoom2.WIDTH;
      const neighborY = (cellY + dy + MapRoom2.HEIGHT) % MapRoom2.HEIGHT;

      const outpostId = userOutposts.get(`${neighborX},${neighborY}`);
      if (outpostId) outpostsInRange.push({ baseid: outpostId, dx, dy });
    }
  }

  if (outpostsInRange.length === 0) return false;

  // Query the database for the in-range outposts
  const outpostSaves = await postgres.em.find(
    Save,
    { baseid: { $in: outpostsInRange.map((outpost) => outpost.baseid) } },
    { fields: ["flinger"] },
  );

  for (const outpostSave of outpostSaves) {
    const outpostRange = getOutpostRange(outpostSave.flinger);
    const totalRange = withDeclareWar(outpostRange);

    for (const { dx, dy } of outpostsInRange) {
      if (Math.abs(dx) <= totalRange && Math.abs(dy) <= totalRange) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Inferno-only: all of a player's yards with their ranges, for the underworld's reach: the main yard, the
 * overworld outposts (their Flinger level) and the underworld ones (always 1).
 */
export const rangeYards = async (user: User): Promise<RangeYard[]> => {
  const { homebase, outposts, flinger, baseid } = user.save!;
  const yards: RangeYard[] = [];
  if (homebase?.length === 2) {
    yards.push({ x: Number(homebase[0]), y: Number(homebase[1]), baseid: String(baseid ?? ""), range: getMainYardRange(flinger) });
  }
  const overworld = (outposts ?? []).filter(([x, y]) => !isUnder(Number(x), Number(y)));
  const flingers = overworld.length
    ? await postgres.em.find(Save, { baseid: { $in: overworld.map(([, , id]) => String(id)) } }, { fields: ["baseid", "flinger"] })
    : [];
  const flingerOf = new Map(flingers.map((s) => [String(s.baseid), s.flinger]));
  for (const [x, y, id] of outposts ?? []) {
    const under = isUnder(Number(x), Number(y));
    yards.push({
      x: Number(x),
      y: Number(y),
      baseid: String(id),
      range: under ? underworldConfig.outpostRange : getOutpostRange(flingerOf.get(String(id)) ?? 0),
    });
  }
  return yards;
};

// TODO: This is not perfect, it creates a square range instead of a diamond range.
// Using 'Manhattan distance' seems to also not be perfect,
// as it doesn't account for the diagonal distance.
const getDistanceFromMain = (
  cellX: number,
  cellY: number,
  baseX: number,
  baseY: number
) => {
  // Calculate the straight-line distances
  const deltaX = Math.abs(baseX - cellX);
  const deltaY = Math.abs(baseY - cellY);

  // Wrap-around distances (for toroidal map)
  const wrappedDeltaX = Math.min(deltaX, MapRoom2.WIDTH - deltaX);
  const wrappedDeltaY = Math.min(deltaY, MapRoom2.HEIGHT - deltaY);

  // Use the maximum wrapped distance to calculate square range distance
  return Math.max(wrappedDeltaX, wrappedDeltaY);
};

export const getMainYardRange = (flinger: number) => {
  switch (flinger) {
    case 0:
      return 0;
    case 1:
      return 4;
    case 2:
      return 6;
    case 3:
      return 8;
    case 4:
      return 10;
    default:
      return 10;
  }
};

export const getOutpostRange = (flinger: number) => {
  switch (flinger) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    default:
      return 4;
  }
};
