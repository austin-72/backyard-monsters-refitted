import type { SaveData } from "../../../types/EntityData.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";

/**
 * Devil tribes
 * ====================================================================
 * Inferno-only servers have no overworld, so the four wild monster tribes that populate
 * Map Room 2 (Legionnaire, Kozu, Abunakki, Dreadnaut) are converted into "devil" versions:
 * the same hand-made yard layouts, rebuilt out of Inferno buildings and defended by
 * Inferno monsters.
 *
 * The conversion is a pure function of the overworld template, so the 20k lines of tribe
 * data stay the single source of truth - edit a layout there and its devil twin follows.
 * Results are memoised per template object.
 * ====================================================================
 */

/** Highest level each building id supports in INFERNOYARDPROPS (length of its `hp` table). */
const INFERNO_MAX_LEVEL: Record<number, number> = {
  1: 10, 2: 10, 3: 10, 4: 10, 5: 4, 6: 10, 8: 4, 9: 3, 10: 1, 11: 2, 12: 1, 13: 3, 14: 6,
  15: 6, 16: 1, 17: 5, 18: 1, 19: 7, 20: 10, 21: 7, 22: 4, 23: 6, 24: 1, 25: 6, 26: 4,
  51: 4, 113: 1, 114: 1, 115: 6, 116: 4, 117: 1, 118: 6, 119: 1, 127: 5, 128: 6, 129: 6,
  130: 7, 131: 6, 132: 6, 133: 6, 134: 6,
};

/** Highest level of the overworld building, used to keep relative strength when remapping. */
const OVERWORLD_MAX_LEVEL: Record<number, number> = {
  // Measured from YARD_PROPS.as (length of each building's hp table).
  14: 10, 15: 10, 17: 5, 20: 10, 21: 10, 22: 5, 23: 8, 25: 8, 115: 8, 117: 1, 118: 8,
};

/**
 * Overworld building id -> Inferno building id.
 * Anything not listed keeps its id (harvesters, silos, hatcheries, walls and traps share
 * ids between the two prop tables and already pick up Inferno art and stats).
 */
const DEVIL_BUILDING: Record<number, number> = {
  15: 128,  // Housing          -> Compound (housing bunker)
  18: 17,   // Stone blocks     -> Bone walls
  20: 130,  // Cannon tower     -> Inferno cannon tower
  23: 129,  // Laser tower      -> Quake tower
  25: 132,  // Tesla tower      -> Magma tower
  115: 132, // Aerial defense   -> Magma tower
  117: 24,  // Heavy trap       -> Booby trap
  118: 129, // Railgun          -> Quake tower
};

/** Overworld monster id -> Inferno monster id, matched roughly by tier and role. */
const DEVIL_MONSTER: Record<string, string> = {
  C1: "IC1", C2: "IC1", C3: "IC2", C4: "IC2", C5: "IC4", C6: "IC3", C7: "IC4", C8: "IC5",
  C9: "IC5", C10: "IC6", C11: "IC6", C12: "IC7", C13: "IC3", C14: "IC5", C15: "IC8",
  C16: "IC7", C17: "IC8", C18: "IC7", C19: "IC8",
};

/**
 * Footprint edge lengths (yard units) of every building a devil tribe yard can contain, as the
 * Inferno client sizes them (each building class's _footprint). Needed to turn a yard around:
 * a building's X / Y is the corner of its footprint, not its centre.
 */
const FOOTPRINT: Record<number, number> = {
  1: 70, 2: 70, 3: 70, 4: 70, 5: 90, 6: 80, 7: 30, 8: 100, 9: 80, 10: 100, 11: 90, 12: 70, 13: 100,
  14: 160, 16: 100, 17: 20, 19: 80, 21: 70, 22: 90, 24: 20, 26: 80, 51: 90, 52: 40, 113: 80,
  114: 160, 116: 100, 119: 100, 128: 160, 129: 70, 130: 70, 132: 70,
};

/**
 * Rotates a building half a turn around the middle of the yard. The footprint [X, X + size] ends up
 * as [-X - size, -X], so the new corner is -X - size (same for Y). Every distance between buildings
 * is preserved: the yard plays exactly the same, approached from the opposite side.
 */
const rotateHalfTurn = (building: Record<string, unknown>) => {
  const size = FOOTPRINT[Number(building.t)] ?? 70;

  if (typeof building.X === "number") building.X = -building.X - size;
  if (typeof building.Y === "number") building.Y = -building.Y - size;
};

const scaleLevel = (level: number, fromType: number, toType: number) => {
  const max = INFERNO_MAX_LEVEL[toType];
  if (!max) return level;

  const fromMax = OVERWORLD_MAX_LEVEL[fromType];
  const scaled = fromMax && fromMax > max ? Math.ceil((level * max) / fromMax) : level;

  return Math.max(1, Math.min(scaled, max));
};

/** Renames C* monster keys to IC* keys, merging counts that land on the same monster. */
const devilifyMonsters = (monsters: unknown): unknown => {
  if (Array.isArray(monsters)) return monsters.map(devilifyMonsters);
  if (!monsters || typeof monsters !== "object") {
    return typeof monsters === "string" && DEVIL_MONSTER[monsters] ? DEVIL_MONSTER[monsters] : monsters;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(monsters)) {
    const devilKey = DEVIL_MONSTER[key] ?? key;
    const devilValue = devilifyMonsters(value);

    if (typeof devilValue === "number" && typeof result[devilKey] === "number")
      result[devilKey] = (result[devilKey] as number) + devilValue;
    else result[devilKey] = devilValue;
  }
  return result;
};

const devilifyBuilding = (building: Record<string, unknown>) => {
  const type = Number(building.t);
  const devilType = DEVIL_BUILDING[type] ?? type;
  const devil: Record<string, unknown> = { ...building, t: devilType };

  if (typeof building.l === "number") devil.l = scaleLevel(building.l, type, devilType);

  // Inferno buildings have no fortification tiers.
  delete devil.fort;

  // Bunkered defenders
  if (building.m) devil.m = devilifyMonsters(building.m);

  if (infernoOnlyConfig.flipTribeYards) rotateHalfTurn(devil);

  return devil;
};

const cache = new WeakMap<object, SaveData>();

/**
 * Converts an overworld tribe template into its devil version.
 *
 * @param {SaveData} tribeSave - The overworld tribe template
 * @returns {SaveData} A converted copy; the template is never mutated
 */
export const devilify = (tribeSave: SaveData): SaveData => {
  const cached = cache.get(tribeSave);
  if (cached) return cached;

  const buildingdata: Record<string, unknown> = {};

  for (const [id, building] of Object.entries(tribeSave.buildingdata ?? {}))
    buildingdata[id] = devilifyBuilding(building as Record<string, unknown>);

  const devil = {
    ...tribeSave,
    buildingdata,
    // Health snapshots are keyed by building id and were taken against overworld hp tables.
    buildinghealthdata: {},
    monsters: devilifyMonsters(tribeSave.monsters ?? {}),
    champion: [],
  } as SaveData;

  cache.set(tribeSave, devil);
  return devil;
};
