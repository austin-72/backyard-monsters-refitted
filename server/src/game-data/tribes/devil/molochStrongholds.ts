import type { SaveData } from "../../../types/EntityData.js";
import { molochTribes } from "../inferno/molochTribes.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { molochDefenders, molochDesign, onDesignsChanged, withStockDesign } from "../../../services/admin/designStore.js";

/**
 * Moloch strongholds - the fifth, rare tribe on an inferno-only world map.
 *
 * These reuse the native Inferno yards that shipped with the game (the late descent levels
 * and the top tier of the old Inferno map room), so unlike the four converted tribes they
 * need no building swaps: they were built out of Inferno buildings and IC monsters to begin
 * with. Ordered weakest to strongest; the cell's level picks the tier.
 */
/**
 * Descent base `number` (1-13; they ship as baseid 201-213 in molochTribes), with the layout an admin designed
 * for it if there is one (services/admin/designs.ts): Moloch's Gauntlet (gate N) and the Moloch strongholds
 * are both made from these.
 */
export const descentTemplate = (number: number): SaveData | undefined => {
  const stock = molochStock(number);
  const design = stock ? molochDesign(number) : null;
  const defenders = stock ? molochDefenders(number) : null;
  let base = stock && design ? ({ ...stock, buildingdata: design } as SaveData) : stock;
  // (and the monsters an admin put in its Compounds, with their levels)
  if (base && defenders) base = { ...base, monsters: defenders.monsters, academy: defenders.academy } as SaveData;
  return base;
};

const descentBase = descentTemplate;

/**
 * Descent base `number` as it ships: the native yard (molochTribes) with its default layout and defenders
 * (game-data/designs/defaultDesigns.ts), before any layout designed since.
 */
export function molochStock(number: number): SaveData | undefined {
  const native = molochTribes.find((tribe) => tribe.baseid === String(200 + number));
  return native ? withStockDesign("moloch", String(number), native) : undefined;
}

const cache = new Map<string, SaveData>();
// A stronghold made from a base that has been redesigned since is made again.
onDesignsChanged(() => cache.clear());

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

const underCache = new Map<string, SaveData>();
onDesignsChanged(() => underCache.clear());

/**
 * Inferno-only: an underworld stronghold (services/maproom/v2/underworld.ts). One of its level's descent bases
 * (underworldConfig.descentBases: 38 -> 6 and 7, 42 -> 8 and 9, 46 -> 10 and 11, 50 -> 12 and 13), picked by the
 * cell's fixed number, with the level's loot (underworldConfig.loot).
 *
 * @param {number} level - One of underworldConfig.levelsByDistance
 * @param {number} variant - The cell's fixed number
 */
export const underworldStronghold = (level: number, variant = 0): SaveData => {
  const { descentBases, loot, levelsByDistance } = underworldConfig;
  const candidates = (descentBases[level] ?? descentBases[levelsByDistance[levelsByDistance.length - 1]] ?? [13])
    .map(descentBase)
    .filter((tribe): tribe is SaveData => Boolean(tribe));
  if (candidates.length === 0) throw new Error(`No descent base is configured for underworld level ${level}.`);

  const pick = Math.abs(variant) % candidates.length;
  const key = `${pick}:${level}`;
  const cached = underCache.get(key);
  if (cached) return cached;

  const amounts = loot[level] ?? loot[levelsByDistance[levelsByDistance.length - 1]];
  const { baseid: _reservedBaseid, ...template } = candidates[pick];
  const stronghold = {
    ...template,
    type: "tribe",
    resources: { ...(template.resources ?? {}), r1: amounts.r1, r2: amounts.r2, r3: amounts.r3, r4: amounts.r4 },
    buildinghealthdata: {},
  } as SaveData;
  underCache.set(key, stronghold);
  return stronghold;
};
