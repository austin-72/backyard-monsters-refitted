import { MapRoomVersion } from "../../../../enums/MapRoom.js";
import { Save } from "../../../../database/models/save.model.js";
import { User } from "../../../../database/models/user.model.js";
import { postgres } from "../../../../server.js";
import { tribeSaveHandler } from "../../../../services/maproom/tribeSaveHandler.js";
import { getCurrentDateTime } from "../../../../utils/getCurrentDateTime.js";
import { MR1_TRIBE_IDS } from "../../../../game-data/tribes/v1/index.js";

/**
 * The expiration time for a wild monster save in seconds.
 * 12 hours.
 */
export const WILD_MONSTER_EXPIRATION = 43200;

/**
 * A stored wild monster yard (Map Room 1/2) is rebuilt fresh once nobody has attacked it for 12 hours.
 * Attacks keep it (baseModeAttack moves savetime to the attack's start, and every attack save moves it
 * again), so a yard is never rebuilt, and its row deleted, under a player who is attacking it: the
 * attack's next save would find no yard.
 */
export const expireWildSave = async (
  save: Save,
  baseid: string,
  mapversion: MapRoomVersion,
  worldid: string | null | undefined,
  user: User
) => {
  if (mapversion === MapRoomVersion.V3 || save.wmid === 0) return save;
  if (getCurrentDateTime() - save.savetime <= WILD_MONSTER_EXPIRATION) return save;

  if (save.basesaveid) {
    postgres.em.remove(save);
    await postgres.em.flush();
  }
  return tribeSaveHandler(baseid, mapversion, worldid, user);
};

/**
 * Handles viewing the base mode for a given base ID.
 * If the save is outdated for a wild monster, it removes the old save and creates a new one.
 *
 * @param {string} baseid - The base identifier for the requested save.
 * @param {MapRoomVersion} mapversion - The version of the map to determine the save handling logic.
 * @param {string} worldid - The world UUID, passed through for MR3 player yard defender lookups.
 * @returns {Promise<Loaded<Save, never>>} The save object or null if no valid save is found.
 */
export const baseModeView = async (baseid: string, mapversion: MapRoomVersion = MapRoomVersion.V2, worldid: string | null | undefined, user: User) => {
  if (mapversion === MapRoomVersion.V1 && MR1_TRIBE_IDS.has(baseid))
    return tribeSaveHandler(baseid, mapversion, worldid, user);

  let save = await postgres.em.findOne(Save, { baseid });

  if (!save) save = await tribeSaveHandler(baseid, mapversion, worldid, user);

  if (save) save = await expireWildSave(save, baseid, mapversion, worldid, user);

  return save;
};
