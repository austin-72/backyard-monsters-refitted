import { Save } from "../../../database/models/save.model.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { Status } from "../../../enums/StatusCodes.js";
import { postgres } from "../../../server.js";
import { Tribe, Tribes } from "../../../enums/Tribes.js";
import { minimumTribeLevels } from "./calculateTribeLevel.js";
import { MOLOCH_INDEX, tribeForCell } from "./tribeForCell.js";
import { molochStronghold, underworldStronghold } from "../../../game-data/tribes/devil/molochStrongholds.js";
import { abunaki } from "../../../game-data/tribes/v2/abunaki.js";
import { dreadnaught } from "../../../game-data/tribes/v2/dreadnaught.js";
import { kozu } from "../../../game-data/tribes/v2/kozu.js";
import { legionnaire } from "../../../game-data/tribes/v2/legionnaire.js";
import { devilify } from "../../../game-data/tribes/devil/devilify.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { tribeDefenders, tribeDesign, withStockDesign } from "../../admin/designStore.js";

/**
 * Generates a save for a wild monster on Map Room 2 based on the given base ID.
 *
 * The base ID is used to calculate the cell coordinates (`cellX`, `cellY`)
 * and derive a tribe index from the combined coordinates. Based on the tribe index,
 * it fetches tribe-specific save data and generates a `Save` object for a wild monster.
 *
 * @param {string} baseid - The base ID as a string, which will be converted to an integer.
 * @returns {Save} - A new `Save` object for the wild monster, with tribe-specific data.
 */
export const tribeSaveV2 = (baseid: string, worldid: string | null | undefined) => {
  const cellX = parseInt(baseid.slice(-6, -3));
  const cellY = parseInt(baseid.slice(-3));

  // (a base id that is not one: a 400, not a crash in the territory maths)
  if (!Number.isInteger(cellX) || !Number.isInteger(cellY)) {
    throw new ClientSafeError({ message: "That yard does not exist.", status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
  }

  const { tribeIndex, wmid, level, variant, under } = tribeForCell(worldid, cellX, cellY);

  const tribeSave = under
    ? underworldStronghold(level, variant)
    : tribeIndex === MOLOCH_INDEX
    ? molochStronghold(level, variant)
    : fetchTribeData(tribeIndex, level).tribeSave;

  // Return a new save for the wild monster.
  return postgres.em.create(Save, {
    ...tribeSave,
    baseid,
    level,
    wmid,
    worldid,
    // A new yard starts fresh now (the templates carry an old or 0 savetime, which would make the
    // 12-hour rebuild in baseModeView take it straight away).
    savetime: getCurrentDateTime(),
  }, { partial: true });
};

/**
 * Fetches the tribe data based on the given tribe index.
 *
 * @param {number} tribeIndex - The tribe index.
 * @param {number} level - The level of the wild monster.
 * @returns {object} - An object containing the tribe save data.
 */
const fetchTribeData = (tribeIndex: number, level: number) => {
  const tribeSave = tribeTemplate(tribeIndex, level);
  // Inferno-only: a layout an admin designed for this tribe and level (services/admin/designs.ts) replaces
  // the stock buildings, and the monsters the admin put in its Compounds (with their levels) the stock ones;
  // everything else (the yard's settings) stays the template's.
  const design = tribeDesign(tribeIndex, level);
  const defenders = tribeDefenders(tribeIndex, level);
  let save = design ? { ...tribeSave, buildingdata: design, buildinghealthdata: {} } : tribeSave;
  if (defenders) save = { ...save, monsters: defenders.monsters, academy: defenders.academy };
  return { tribeSave: save };
};

/**
 * The stock yard of a tribe at a level (the devil version on an inferno-only server), before any layout
 * designed since: the hand-made template whose slot of the tribe's level range the level falls in, with the
 * level's shipped default layout on it (game-data/designs/defaultDesigns.ts) where there is one.
 */
export const tribeTemplate = (tribeIndex: number, level: number) => {
  const tribeData = [legionnaire, kozu, abunaki, dreadnaught];

  // Get the selected tribe
  const selectedTribe = tribeData[tribeIndex];
  const tribe = Tribes[tribeIndex] as Tribe;

  // Sort keys from selected tribe
  const keys = Object.keys(selectedTribe);
  const sortedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));

  // Get level range for this tribe
  const lowerLimit = minimumTribeLevels[tribe];
  const higherLimit = 45;
  const levelRange = higherLimit - lowerLimit;

  // Find the appropriate key based on the level
  const levelsPerKey = Math.ceil(levelRange / sortedKeys.length);
  let keyIndex = Math.floor((level - lowerLimit) / levelsPerKey);

  // Safety bounds
  keyIndex = Math.max(0, Math.min(keyIndex, sortedKeys.length - 1));

  const selectedKey = parseInt(sortedKeys[keyIndex]);
  const template = selectedTribe[selectedKey];

  // Inferno-only: wild monsters are the devil versions of the overworld tribes, and their layouts the ones
  // designed for each level of the ladder (the defaults).
  return infernoOnlyConfig.enabled ? withStockDesign("tribe", `${tribeIndex}-${level}`, devilify(template)) : template;
};
