/**
 * Inferno-only: the Underworld (services/maproom/v2/underworld.ts). A 10 x 10 layer of the world map below the
 * Inferno, reached through portals that sit at the centres of the world's biggest lava pools. Every cell of it is
 * a Moloch stronghold until a player takes it; an outpost there has no Flinger and always a range of 1. Its
 * portals take an attack back up: an underworld outpost next to a portal reaches the overworld cells within
 * `exitRange` of that portal's overworld end. Server restart only (the client reads it from getarea).
 *
 * The underworld's cells are stored in the same world as the overworld's, at x and y from `origin` (500-509),
 * so takeovers, outposts, attacks and baseids work as they do anywhere on the map.
 */
export const underworldConfig = {
  enabled: true,

  /** The underworld's top left cell (its cells are origin .. origin + size - 1 on both axes). */
  origin: 500,

  /** Cells on each side. */
  size: 10,

  /** How many overworld cells one underworld cell stands for (a portal at X, Y pairs with X / 40, Y / 40). */
  scale: 40,

  /** Portals: the centres of the biggest lava pools. Ties for the last place are all taken, up to `maxPortals`. */
  portals: 10,
  maxPortals: 12,

  /**
   * The terrain height every underworld cell has (all the same: land). 125 is the game's average altitude
   * (GLOBAL._averageAltitude), so the cells are neutral: no resource or defence bonus or penalty (the user's,
   * 4 October; it was 130).
   */
  height: 125,

  /** An underworld outpost's range (it has no Flinger). */
  outpostRange: 1,

  /** Overworld cells within this many of a portal can be attacked by an underworld outpost next to the portal. */
  exitRange: 5,

  /**
   * The strongholds' levels, easiest first: the cells nearest a portal are the easiest quarter, the farthest the
   * hardest (services/maproom/v2/underworld.ts, underLevel); and which descent bases (1-13) each level can be.
   */
  levelsByDistance: [38, 42, 46, 50],
  descentBases: { 38: [6, 7], 42: [8, 9], 46: [10, 11], 50: [12, 13] } as Record<number, number[]>,

  /** Lootable resources at each level. */
  loot: {
    38: { r1: 30_000_000, r2: 30_000_000, r3: 30_000_000, r4: 15_000_000 },
    42: { r1: 45_000_000, r2: 45_000_000, r3: 45_000_000, r4: 22_500_000 },
    46: { r1: 60_000_000, r2: 60_000_000, r3: 60_000_000, r4: 30_000_000 },
    50: { r1: 120_000_000, r2: 120_000_000, r3: 120_000_000, r4: 60_000_000 },
  } as Record<number, { r1: number; r2: number; r3: number; r4: number }>,

  /** The most one destroyed building pays out per resource (Moloch's caps are used for 46 and 50). */
  lootCaps: {
    38: { silo: 1_000_000, hall: 2_000_000 },
    42: { silo: 1_500_000, hall: 3_000_000 },
  } as Record<number, { silo: number; hall: number }>,

  /** A takeover there costs this many times as much (kits are priced as anywhere). */
  takeoverCostMultiplier: 2,
};
