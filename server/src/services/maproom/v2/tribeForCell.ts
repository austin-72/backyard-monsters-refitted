import { Tribe, Tribes } from "../../../enums/Tribes.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { calculateTribeLevel } from "./calculateTribeLevel.js";
import { territoryCell } from "./tribeTerritories.js";

/**
 * Single source of truth for "which wild monster tribe lives on this Map Room 2 cell".
 *
 * The cell listing (wildMonsterCell) and the yard that loads when the cell is scouted or
 * attacked (tribeSaveV2) must always agree, so both call this instead of doing their own
 * coordinate maths.
 *
 * Stock behaviour: the four tribes cycle with (x + y) % 4.
 * Inferno-only: seeded tribe territories, see tribeTerritories.ts.
 */
export interface CellTribe {
  tribe: Tribe;
  /** Index into `Tribes` (0-3), or MOLOCH_INDEX. */
  tribeIndex: number;
  /** wmid sent to the client. Must match an id list in the client's TRIBES.as. */
  wmid: number;
  level: number;
  /** Moloch only: stable per-stronghold number that varies which yard loads. */
  variant: number;
}

export const MOLOCH_INDEX = 5;

/** Client-side TRIBES.M_IDS starts here. 41-48 are taken by the overworld tribes' extra ids. */
export const MOLOCH_WMID = 51;

export const tribeForCell = (worldid: string | null | undefined, cellX: number, cellY: number): CellTribe => {
  const { enabled, tribeSpawns } = infernoOnlyConfig;

  if (enabled && tribeSpawns.enabled) {
    // The world uuid is the seed; without it the listing and the yard could disagree.
    if (!worldid) throw new Error("worldid is required to resolve a Map Room 2 tribe cell.");

    const cell = territoryCell(worldid, cellX, cellY);

    if (cell.tribe === "moloch")
      return { tribe: Tribe.MOLOCH, tribeIndex: MOLOCH_INDEX, wmid: MOLOCH_WMID, level: cell.level, variant: cell.variant };

    return {
      tribe: Tribes[cell.tribe],
      tribeIndex: cell.tribe,
      wmid: cell.tribe * 10 + 1,
      level: cell.level,
      variant: 0,
    };
  }

  const tribeIndex = (cellX + cellY) % Tribes.length;
  const tribe = Tribes[tribeIndex];

  return {
    tribe,
    tribeIndex,
    wmid: tribeIndex * 10 + 1,
    level: calculateTribeLevel(cellX, cellY, tribe),
    variant: 0,
  };
};
