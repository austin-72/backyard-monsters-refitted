import type { Save } from "../../database/models/save.model.js";

/**
 * Defender health (inferno-only).
 *
 * While a yard is under attack, the attacker's client saves it with the health of every defender
 * that is still alive, so monsters wounded in one attack are still wounded in the next:
 *
 *   monsters.housed   { IC1: 12 }                    ->  { IC1: [{ health: 310 }, { health: 2147483647 }, ...] }
 *   a Monster Bunker  { t: 22, m: { IC2: 5 } }       ->  { t: 22, m: { IC2: 4 }, mh: { IC2: [820, 150] } }
 *
 * Everything that only needs to know how many monsters there are (the world map, which hands a
 * player their own monsters to attack with; the owner's yard) keeps getting plain counts through
 * the helpers here.
 */

type Housed = Record<string, unknown>;

/** `housed` as plain counts, whatever form it is stored in. */
export const housedCounts = (housed: unknown): Record<string, number> => {
  const counts: Record<string, number> = {};

  if (!housed || typeof housed !== "object") return counts;

  for (const [id, value] of Object.entries(housed as Housed)) {
    const count = Array.isArray(value) ? value.length : Number(value);

    if (Number.isFinite(count) && count > 0) counts[id] = Math.floor(count);
  }

  return counts;
};

/** The monsters block with `housed` as counts. Returns the same object when nothing had to change. */
export const withHousedCounts = <T>(monsters: T): T => {
  const block = monsters as unknown as { housed?: Housed } | null;

  if (!block || typeof block !== "object" || !block.housed) return monsters;
  if (!Object.values(block.housed).some(Array.isArray)) return monsters;

  return { ...block, housed: housedCounts(block.housed) } as unknown as T;
};

/**
 * The owner is home: the survivors of whatever raids happened are healed. Their health records
 * become plain counts again and bunkers forget their wounded. Returns true when the save changed.
 */
export const healDefenders = (save: Save): boolean => {
  let changed = false;

  const healed = withHousedCounts(save.monsters);
  if (healed !== save.monsters) {
    save.monsters = healed;
    changed = true;
  }

  const buildings = save.buildingdata as Record<string, Record<string, unknown>> | null;
  if (buildings) {
    let stripped = false;
    const next: Record<string, Record<string, unknown>> = {};

    for (const [key, building] of Object.entries(buildings)) {
      if (building && typeof building === "object" && "mh" in building) {
        const { mh: _wounded, ...rest } = building;
        next[key] = rest;
        stripped = true;
      } else {
        next[key] = building;
      }
    }

    if (stripped) {
      save.buildingdata = next as unknown as Save["buildingdata"];
      changed = true;
    }
  }

  return changed;
};

const MONSTER_BUNKER = 22;

/**
 * What an attack may change inside a Monster Bunker: defenders can die and survivors can be hurt.
 * Counts only ever go down, and there are never more wounded than monsters. Anything else the
 * attacker's client claims about the building is ignored, as it always was.
 */
export const applyBunkerLosses = (stored: Record<string, unknown>, reported: Record<string, unknown> | undefined) => {
  if (!reported || stored.t !== MONSTER_BUNKER || reported.t !== MONSTER_BUNKER) return stored;

  const before = housedCounts(stored.m);
  const claimed = housedCounts(reported.m);
  const wounded = (reported.mh ?? {}) as Record<string, unknown>;

  const after: Record<string, number> = {};
  const hurt: Record<string, number[]> = {};

  for (const [id, had] of Object.entries(before)) {
    // A bunker that was destroyed exports no "m" at all: everybody inside is gone.
    const left = Math.min(had, claimed[id] ?? 0);
    if (left <= 0) continue;

    after[id] = left;

    const list = Array.isArray(wounded[id]) ? (wounded[id] as unknown[]) : [];
    const valid = list
      .map(Number)
      .filter((health) => Number.isFinite(health) && health >= 1)
      .slice(0, left)
      .map(Math.ceil);

    if (valid.length > 0) hurt[id] = valid;
  }

  const { m: _m, mh: _mh, ...rest } = stored;
  const next: Record<string, unknown> = { ...rest };

  if (Object.keys(after).length > 0) next.m = after;
  if (Object.keys(hurt).length > 0) next.mh = hurt;

  return next;
};
