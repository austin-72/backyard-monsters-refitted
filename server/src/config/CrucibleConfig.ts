/**
 * Inferno-only: the Soul Crucible (services/crucible/crucible.ts; 11 November). A main-yard building (type 172,
 * six levels, the game's SOULCRUCIBLE.ts) where surplus bone, coal, sulfur or magma is poured into the fire and
 * another of the four taken back, at a rate that depends on the two resources and rises with the building's level.
 * How much may be poured in a day is a share of the yard's storage that grows with the level too. Every pour is worked out and written here, on the yard's save. Sent to the
 * game with every base load (flag io_crucible). Server restart only.
 */
export const crucibleConfig = {
  enabled: true,
  /** The building's id in the game's INFERNOYARDPROPS. */
  buildingType: 172,
  /**
   * What a pour gives back, as a share of what is poured (the owner's table, 11 November): for each resource poured
   * (r1 bone, r2 coal, r3 sulfur, r4 magma) and each one taken, [at level 1, at the top level]. The levels between
   * rise in equal steps (bone into coal: 25, 30, 35, 40, 45, 50%). Poured `n` of A into B at level L:
   * floor(n x rate(A, B, L)). Keep every rate under 1, and every round of pours under 1 when multiplied together,
   * or a round trip would end with more than it began with (the service warns at its first use if one does).
   */
  rates: {
    r1: { r2: [0.25, 0.5], r3: [0.325, 0.65], r4: [0.4, 0.8] },
    r2: { r1: [0.25, 0.5], r3: [0.325, 0.65], r4: [0.4, 0.8] },
    r3: { r1: [0.2, 0.4], r2: [0.2, 0.4], r4: [0.35, 0.7] },
    r4: { r1: [0.15, 0.3], r2: [0.15, 0.3], r3: [0.225, 0.45] },
  } as Record<string, Record<string, [number, number]>>,
  /**
   * The most that may be poured in a (UTC) day, counted on what is given, all four resources together: this share
   * of the yard's storage for one resource (what the top bar shows as its capacity), by the Crucible's level 1-6.
   */
  dailyCapOfStorage: [0.2, 0.3, 0.4, 0.5, 0.65, 0.8],
  /** The daily cap is never less than this (a new yard stores very little). */
  dailyCapFloor: 50_000,
  /** The least one pour may give. */
  minPour: 1_000,
};
