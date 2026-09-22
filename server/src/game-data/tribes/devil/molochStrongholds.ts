import type { SaveData } from "../../../types/EntityData.js";
import { molochTribes } from "../inferno/molochTribes.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";

/**
 * Moloch strongholds - the fifth, rare tribe on an inferno-only world map.
 *
 * These reuse the native Inferno yards that shipped with the game (the late descent levels
 * and the top tier of the old Inferno map room), so unlike the four converted tribes they
 * need no building swaps: they were built out of Inferno buildings and IC monsters to begin
 * with. Ordered weakest to strongest; the cell's level picks the tier.
 */
/** The descent bases ship as baseid 201-213 in molochTribes. */
const descentBase = (number: number) => molochTribes.find((tribe) => tribe.baseid === String(200 + number));

const cache = new Map<string, SaveData>();

/**
 * @param {number} level - One of infernoOnlyConfig.moloch.levels
 * @param {number} variant - Stable per-stronghold number; picks among the yards of that tier
 * @returns {SaveData} The stronghold template for that level with its loot applied
 */
export const molochStronghold = (level: number, variant = 0): SaveData => {
  const { levels, loot } = infernoOnlyConfig.moloch;

  const rung = Math.max(0, levels.indexOf(level));
  const progress = levels.length > 1 ? rung / (levels.length - 1) : 1;

  // The level decides which descent bases are possible; the stronghold's variant (fixed by its
  // seat) picks one of them, so neighbouring strongholds differ but each one never changes.
  const { descentBases } = infernoOnlyConfig.moloch;
  const candidates = (descentBases[level] ?? descentBases[levels[rung]] ?? [13])
    .map(descentBase)
    .filter((tribe): tribe is SaveData => Boolean(tribe));

  if (candidates.length === 0) throw new Error(`No descent base is configured for Moloch level ${level}.`);

  // The seat's variant already decided the level (variant % levels.length), so that part of the
  // number is spent: using it again would give every level-46 stronghold the same base. The rest
  // of the number is independent of it.
  const tier = Math.floor(Math.abs(variant) / Math.max(1, levels.length)) % candidates.length;

  const key = `${tier}:${level}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Loot grows linearly from `loot.min` at the lowest level to `loot.max` at the highest.
  const amount = (resource: "r1" | "r2" | "r3" | "r4") =>
    Math.round(loot.min[resource] + (loot.max[resource] - loot.min[resource]) * progress);

  const { baseid: _reservedBaseid, ...template } = candidates[tier];

  const stronghold = {
    ...template,
    type: "tribe",
    resources: {
      ...(template.resources ?? {}),
      r1: amount("r1"),
      r2: amount("r2"),
      r3: amount("r3"),
      r4: amount("r4"),
    },
    buildinghealthdata: {},
  } as SaveData;

  cache.set(key, stronghold);
  return stronghold;
};
