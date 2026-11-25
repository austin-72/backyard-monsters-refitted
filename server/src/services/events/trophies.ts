import { postgres } from "../../server.js";

/**
 * Inferno-only (10 October): the event trophies a player has won, for good (bym.user.io_trophies). The game
 * puts each one in the player's storage (Buildings, Decorations) when it isn't in the yard or storage already,
 * at its level (com/monsters/events/IoTrophies.ts):
 *
 *   fmi1, fmi2      the Frozen Monster Invasions' totems (buildings 146 and 147): their level, 1 to 6, the
 *                   highest the player reached (waves 1, 10, 20, 30, 31 and 32 won: services/events/fmi.ts)
 *   gauntlet        Moloch's Gauntlet conquered (building 148)
 *   gauntlet_nocat  Moloch's Gauntlet conquered with no catapult fired in it that month (building 149)
 */
export type Trophies = Record<string, number>;

type Em = typeof postgres.em;

export const TROPHY_KEYS = ["fmi1", "fmi2", "gauntlet", "gauntlet_nocat"] as const;

const parse = (raw: unknown): Trophies => {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object") return {};
    const out: Trophies = {};
    for (const k of TROPHY_KEYS) {
      const n = Math.floor(Number((v as Record<string, unknown>)[k]) || 0);
      if (n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
};

export const readTrophies = async (userid: number, em: Em = postgres.em): Promise<Trophies> => {
  const rows = (await em.getConnection().execute(`SELECT io_trophies FROM bym."user" WHERE userid = ?`, [userid], "all", em.getTransactionContext())) as { io_trophies: unknown }[];
  return parse(rows[0]?.io_trophies);
};

/** Raises trophies to at least these levels (never lowers one). Returns them all. */
export const raiseTrophies = async (userid: number, levels: Trophies, em: Em = postgres.em): Promise<Trophies> => {
  const now = await readTrophies(userid, em);
  let changed = false;
  for (const [k, v] of Object.entries(levels)) {
    if ((TROPHY_KEYS as readonly string[]).includes(k) && v > (now[k] ?? 0)) {
      now[k] = v;
      changed = true;
    }
  }
  if (changed) {
    // (13 October: each raised in the row itself, never written back whole: a Frozen Invasion win and the Gauntlet's
    // last stage at once lost one of the two)
    const raise = Object.entries(levels).filter(([k]) => (TROPHY_KEYS as readonly string[]).includes(k));
    const merged = raise.reduce(
      (sql) => `${sql} || jsonb_build_object(?::text, GREATEST(COALESCE((io_trophies ->> ?)::int, 0), ?::int))`,
      `(CASE WHEN jsonb_typeof(io_trophies) = 'object' THEN io_trophies ELSE CAST(? AS jsonb) END)`
    );
    const params: unknown[] = [JSON.stringify(now)];
    for (const [k, v] of raise) params.push(k, k, Math.floor(v));
    await em.getConnection().execute(`UPDATE bym."user" SET io_trophies = ${merged} WHERE userid = ? RETURNING userid`, [...params, userid], "all", em.getTransactionContext());
  }
  return now;
};

/** QoL #607: the most players one trophies/of asks about (a Members list, a few chat names). */
export const TROPHIES_OF_MAX = 60;

/**
 * QoL #607: other players' trophies, for the icons next to their names (the chat's name menu, the alliance's
 * Members list): { userid: { fmi1: 3, ... } } for each id asked (an empty object: none, or no such player). The
 * trophies stand in their yards for anyone to see, so they are not private.
 */
export const readTrophiesOf = async (ids: number[], em: Em = postgres.em): Promise<Record<string, Trophies>> => {
  const want = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, TROPHIES_OF_MAX);
  const out: Record<string, Trophies> = {};
  if (!want.length) return out;
  for (const id of want) out[String(id)] = {};
  const rows = (await em.getConnection().execute(
    `SELECT userid, io_trophies FROM bym."user" WHERE userid IN (${want.map(() => "?").join(", ")})`, want, "all", em.getTransactionContext()
  )) as { userid: number; io_trophies: unknown }[];
  for (const r of rows) out[String(r.userid)] = parse(r.io_trophies);
  return out;
};
