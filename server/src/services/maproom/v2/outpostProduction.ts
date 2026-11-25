import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";

/**
 * Inferno-only (QoL #322, 15 October): what an outpost's harvesters make, worked out on the server for an outpost
 * whose auto-bank line the game has never written (it is written when the outpost is open: the game's
 * AutoBankManager.updateBuildingResources). The Outposts list showed "?" for those.
 *
 * The game's own sum, per harvester (types 1-4, bone / coal / sulfur / magma) still standing:
 *   produce[level - 1] * 125 / the cell's height (rounded down, at least 1), every 10 seconds,
 * where the level counts an upgrade under way as done (the game does so), and `produce` is the Inferno table
 * (INFERNOYARDPROPS: the same for the four harvesters) times the server's multipliers (GLOBAL.ioTuneProps:
 * io_resmult for bone, coal and sulfur, io_magmamult for magma), each level rounded.
 *
 * The time since the outpost was last saved: an upgrade still under way then is finished by now or still counted as
 * finished (the game counts it either way), so it does not change the sum; a destroyed harvester (health 0) makes
 * nothing until the outpost is opened and it is repaired.
 */

/** INFERNOYARDPROPS' `produce` for the harvesters (types 1-4), per level, before the multipliers. */
const PRODUCE = [2, 4, 7, 11, 16, 22, 29, 37, 46, 56];

/** GLOBAL._averageAltitude. */
const AVERAGE_ALTITUDE = 125;

/** The cell height the game uses for an auto-bank line that doesn't say (BASE's load: 100). */
const DEFAULT_HEIGHT = 100;

const positive = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** The harvester's output each 10 s at a level (1-10), after the multipliers. */
const producedAt = (type: number, level: number) => {
  const multiplier = type === 4 ? positive(infernoOnlyConfig.magmaMultiplier, 4) : positive(infernoOnlyConfig.resourceMultiplier, 2);
  const base = PRODUCE[Math.max(0, Math.min(PRODUCE.length - 1, level - 1))];
  return Math.round(base * multiplier);
};

/** A harvester as myOutposts reads it from the outpost's buildingdata: [type, l, prefab, cU, hp (null: whole)]. */
export type HarvesterRow = [unknown, unknown, unknown, unknown, unknown];

/**
 * The outpost's rates each 10 seconds ({r1..r4}, the shape of an auto-bank line), from its harvesters and the
 * height of its cell.
 */
export const harvesterRates = (harvesters: HarvesterRow[], height: number) => {
  const rates: Record<string, number> = { r1: 0, r2: 0, r3: 0, r4: 0 };
  const cellHeight = positive(height, DEFAULT_HEIGHT);
  for (const row of Array.isArray(harvesters) ? harvesters : []) {
    if (!Array.isArray(row)) continue;
    const type = Math.trunc(Number(row[0]));
    if (!(type >= 1 && type <= 4)) continue;
    // (BFOUNDATION.Setup: health from the save; 0 is destroyed)
    if (row[4] !== null && row[4] !== undefined && Number(row[4]) <= 0) continue;
    // (BFOUNDATION.Setup: `l` when set, else 1; a prefab building takes the prefab's level)
    let level = Math.trunc(positive(row[1], 1));
    if (Number(row[2]) > 0) level = Math.trunc(Number(row[2]));
    // (an upgrade under way counts as done: AutoBankManager.updateBuildingResources)
    if (Number(row[3]) > 0) level++;
    level = Math.max(1, Math.min(PRODUCE.length, level));
    rates[`r${type}`] += Math.max(Math.floor((producedAt(type, level) * AVERAGE_ALTITUDE) / cellHeight), 1);
  }
  return rates;
};
