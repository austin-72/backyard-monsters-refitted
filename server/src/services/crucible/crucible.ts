import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { crucibleConfig } from "../../config/CrucibleConfig.js";
import { postgres } from "../../server.js";
import { advanceBuildingTimers } from "../base/advanceBuildingTimers.js";
import { storageCeiling } from "../anticheat/saveChecks.js";
import { logger } from "../../utils/logger.js";
import type { BuildingDataMap, BuildingHealthData } from "../../types/BuildingData.js";

/**
 * Inferno-only (11 November): the Soul Crucible (config/CrucibleConfig.ts). A main-yard building, six levels, where
 * surplus bone, coal, sulfur or magma is poured into the fire and another of the four taken back, at a rate set for
 * each pair of resources that rises with the building's level (CrucibleConfig.rates).
 *
 * Every pour is worked out and written here, in one transaction on the main yard's save with its row locked (as
 * pets/grow takes its Magma): the game sends only which resource, into which, and how much. A save writes
 * resources as changes on what the database holds (services/base/freshTotals.ts), so a save on its way does not
 * undo a pour; the game shows the pour without sending it as spending (IoCrucible.ts).
 *
 * How much may be poured in a (UTC) day is a share of the yard's storage for one resource, by the Crucible's
 * level. The storage is what the game last saved as its capacity (resources.r1max...: the silos at their levels,
 * Improved Packing, each outpost's share), never more than the most any yard of this player could store
 * (anticheat's storageCeiling), so a made-up capacity gains nothing. What was poured today is kept in
 * bym.crucible_day.
 */

export class CrucibleError extends Error {}

export const RESOURCES = ["r1", "r2", "r3", "r4"] as const;
export type Resource = (typeof RESOURCES)[number];

type Em = typeof postgres.em;

const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

export const crucibleEnabled = () => infernoOnlyConfig.enabled && crucibleConfig.enabled;

/** The top level (the daily caps' list has one entry a level). */
const topLevel = () => Math.max(1, crucibleConfig.dailyCapOfStorage.length);

/** What a Crucible of this level gives back of `from` poured into `to`, as a share (0 when there is no such pour). */
export const rate = (from: Resource, to: Resource, level: number): number => {
  const pair = crucibleConfig.rates[from]?.[to];
  if (!pair) return 0;
  const lo = Number(pair[0]);
  const hi = Number(pair[1]);
  if (!(lo > 0) || !(hi > 0)) return 0;
  const top = topLevel();
  const l = Math.max(1, Math.min(top, Math.floor(level) || 1));
  const r = top > 1 ? lo + ((hi - lo) * (l - 1)) / (top - 1) : hi;
  return Math.max(0, Math.min(1, r));
};

/** `amount` of `from` poured into `to` at this level: what comes out (rounded down, never in the player's favour). */
export const poured = (from: Resource, to: Resource, amount: number, level: number): number =>
  Math.max(0, Math.floor(amount * rate(from, to, level) + 1e-9));

let ratesChecked = false;
/** Once: a warning in the log if some round of two or three pours would end with more than it began with. */
const checkRates = () => {
  if (ratesChecked) return;
  ratesChecked = true;
  const top = topLevel();
  for (const a of RESOURCES) for (const b of RESOURCES) for (const c of RESOURCES) {
    if (a === b) continue;
    const two = rate(a, b, top) * rate(b, a, top);
    const three = b !== c && c !== a ? rate(a, b, top) * rate(b, c, top) * rate(c, a, top) : 0;
    if (two >= 1 || three >= 1) logger.warn(`Soul Crucible: the rates let ${a} -> ${b}${three >= 1 ? ` -> ${c}` : ""} -> ${a} gain value (CrucibleConfig.rates)`);
  }
};

/** The share of storage a Crucible of this level may pour in a day. */
export const capShare = (level: number): number => {
  const shares = crucibleConfig.dailyCapOfStorage;
  const i = Math.max(1, Math.min(shares.length, Math.floor(level) || 1)) - 1;
  return Math.max(0, Number(shares[i]) || 0);
};

/** The daily cap for a yard that stores `capacity` of one resource. */
export const dailyCap = (level: number, capacity: number): number =>
  Math.max(crucibleConfig.dailyCapFloor, Math.floor(capShare(level) * Math.max(0, capacity)));

let tableReady: Promise<void> | null = null;
/** bym.crucible_day, made here too for a server whose migrations are run by hand (20261114_CrucibleDay). */
const ensureTable = (): Promise<void> => {
  tableReady ??= postgres.em
    .getConnection()
    .execute(
      `CREATE TABLE IF NOT EXISTS bym.crucible_day (
         user_id integer NOT NULL,
         day date NOT NULL,
         given bigint NOT NULL DEFAULT 0,
         pours integer NOT NULL DEFAULT 0,
         PRIMARY KEY (user_id, day)
       )`,
    )
    .then(() => undefined)
    .catch((e) => {
      tableReady = null;
      throw e;
    });
  return tableReady;
};

export interface CrucibleBuilding {
  /** Its level (1-6), or 0 when there is none that can be used. */
  level: number;
  /** Why it cannot be used, if it cannot. */
  closed: string | null;
}

/**
 * The player's Soul Crucible as it is now (the stored yard's countdowns brought forward, as the Brimstone Pit's
 * are: services/casino/access.ts pitState). Only the one building and its health are read.
 */
export const crucibleBuilding = async (user: User, em: Em = postgres.em): Promise<CrucibleBuilding> => {
  const rows = await sql<{ savetime: number; key: string | null; b: BuildingDataMap[string] | null; hurt: boolean | null; health: unknown }>(
    em,
    `SELECT s.savetime, p.key, p.value AS b, jsonb_exists(COALESCE(s.buildinghealthdata, '{}'::jsonb), p.value->>'id') AS hurt,
            s.buildinghealthdata -> (p.value->>'id') AS health
       FROM bym.save s
       LEFT JOIN LATERAL (SELECT key, value FROM jsonb_each(CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN s.buildingdata ELSE '{}'::jsonb END)
                           WHERE jsonb_typeof(value) = 'object' AND (value->>'t') ~ '^[0-9.]+$' AND (value->>'t')::numeric = ? LIMIT 1) p ON true
      WHERE s.userid = ? AND s.type = ? LIMIT 1`,
    [crucibleConfig.buildingType, user.userid, BaseType.MAIN],
  );
  const save = rows[0];
  const none: CrucibleBuilding = { level: 0, closed: "Build a Soul Crucible first." };
  if (!save || !save.b || save.key == null) return none;
  const health: BuildingHealthData = save.hurt ? ({ [String(save.b.id)]: save.health } as BuildingHealthData) : {};
  const now = Math.floor(Date.now() / 1000);
  const buildings = advanceBuildingTimers({ [save.key]: save.b } as BuildingDataMap, health, now - (save.savetime || now));
  const b = Object.values(buildings).find((x) => x && Number(x.t) === crucibleConfig.buildingType);
  if (!b) return none;
  if (b.cB && b.cB > 0) return { level: 0, closed: "The Soul Crucible is still being built." };
  const level = Math.max(1, Math.min(crucibleConfig.dailyCapOfStorage.length, Number(b.l) || 1));
  const damaged = Boolean(b.rE) || b.hp != null || String(b.id) in health;
  if (damaged) return { level, closed: "The Soul Crucible is damaged. Repair it to use it." };
  return { level, closed: null };
};

export interface CrucibleState {
  level: number;
  closed: string | null;
  /** The yard's storage for one resource, as counted here. */
  capacity: number;
  /** The most that may be poured today, and how much of it has been. */
  cap: number;
  given: number;
  left: number;
  resources: Record<Resource, number>;
  room: Record<Resource, number>;
}

const num = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
};

/** The state from a (locked or not) save row's resources. */
const stateFrom = async (user: User, em: Em, building: CrucibleBuilding, stored: Record<string, unknown>): Promise<CrucibleState> => {
  const ceiling = await storageCeiling(user.userid);
  const resources = {} as Record<Resource, number>;
  const room = {} as Record<Resource, number>;
  let capacity = 0;
  for (const r of RESOURCES) {
    resources[r] = Math.max(0, num(stored[r]));
    const max = Math.max(0, Math.min(num(stored[`${r}max`]), Number.isFinite(ceiling) ? ceiling : Number.MAX_SAFE_INTEGER));
    room[r] = Math.max(0, max - resources[r]);
    capacity = Math.max(capacity, max);
  }
  const day = await sql<{ given: string | number | null }>(em, `SELECT given FROM bym.crucible_day WHERE user_id = ? AND day = (now() AT TIME ZONE 'utc')::date`, [user.userid]);
  const given = Math.max(0, num(day[0]?.given));
  const cap = building.level > 0 ? dailyCap(building.level, capacity) : 0;
  return { level: building.level, closed: building.closed, capacity, cap, given, left: Math.max(0, cap - given), resources, room };
};

/** crucible/status: the building, today's cap and what is left of it, the yard's resources and room. */
export const crucibleStatus = async (user: User): Promise<CrucibleState> => {
  if (!crucibleEnabled()) throw new CrucibleError("The Soul Crucible isn't here.");
  await ensureTable();
  const em = postgres.em.fork();
  const building = await crucibleBuilding(user, em);
  const save = await sql<{ resources: Record<string, unknown> | null }>(em, `SELECT resources FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]);
  if (!save.length) throw new CrucibleError("Your yard could not be found.");
  return stateFrom(user, em, building, save[0].resources ?? {});
};

export interface PourResult extends CrucibleState {
  from: Resource;
  to: Resource;
  /** Taken from `from`, and put into `to`. */
  took: number;
  gave: number;
}

/**
 * crucible/pour: `amount` of `from` poured into `to`. One transaction: the main save's row locked first (so two
 * pours sent at once queue, and neither spends the other's stock or the other's share of the cap), the amounts
 * checked against what the row holds now, both resources and the day's total written together.
 */
export const pour = async (user: User, from: string, to: string, amount: number): Promise<PourResult> => {
  if (!crucibleEnabled()) throw new CrucibleError("The Soul Crucible isn't here.");
  if (!RESOURCES.includes(from as Resource) || !RESOURCES.includes(to as Resource)) throw new CrucibleError("Pick what to pour and what to take.");
  if (from === to) throw new CrucibleError("Pour one resource to take another.");
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) throw new CrucibleError("Pick how much to pour.");
  if (amount < crucibleConfig.minPour) throw new CrucibleError(`The least you can pour is ${crucibleConfig.minPour.toLocaleString("en-US")}.`);
  if (amount > 2_000_000_000) throw new CrucibleError("That is too much to pour at once.");
  const f = from as Resource;
  const t = to as Resource;
  checkRates();
  await ensureTable();
  const result = await postgres.em.fork().transactional(async (em) => {
    const save = await sql<{ resources: Record<string, unknown> | null }>(em, `SELECT resources FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!save.length) throw new CrucibleError("Your yard could not be found.");
    const building = await crucibleBuilding(user, em);
    if (building.closed) throw new CrucibleError(building.closed);
    const before = await stateFrom(user, em, building, save[0].resources ?? {});
    if (amount > before.resources[f]) throw new CrucibleError(`Your yard has ${before.resources[f].toLocaleString("en-US")} of that to pour.`);
    if (amount > before.left) {
      throw new CrucibleError(
        before.left > 0
          ? `You can pour ${before.left.toLocaleString("en-US")} more today (${before.cap.toLocaleString("en-US")} a day at this level).`
          : `Today's ${before.cap.toLocaleString("en-US")} is poured. Come back tomorrow, or upgrade the Soul Crucible.`,
      );
    }
    const gave = poured(f, t, amount, building.level);
    if (gave <= 0) throw new CrucibleError("That is too little to pour.");
    if (gave > before.room[t]) {
      throw new CrucibleError(
        before.room[t] > 0 ? `Your storage has room for ${before.room[t].toLocaleString("en-US")} more of that. Pour less.` : "Your storage of that is full.",
      );
    }
    // (the row is locked: these are the amounts just read; the WHERE is a last guard, as pets/grow has)
    const wrote = await sql<{ resources: Record<string, unknown> }>(
      em,
      `UPDATE bym.save
          SET resources = jsonb_set(jsonb_set(COALESCE(resources, '{}'::jsonb), ?::text[], to_jsonb(FLOOR(COALESCE((resources->>?)::numeric, 0)) - ?)),
                                    ?::text[], to_jsonb(FLOOR(COALESCE((resources->>?)::numeric, 0)) + ?))
        WHERE userid = ? AND type = ? AND COALESCE((resources->>?)::numeric, 0) >= ?
        RETURNING resources`,
      [`{${f}}`, f, amount, `{${t}}`, t, gave, user.userid, BaseType.MAIN, f, amount],
    );
    if (wrote.length !== 1) throw new CrucibleError("Your yard no longer has that much to pour.");
    await sql(
      em,
      `INSERT INTO bym.crucible_day (user_id, day, given, pours) VALUES (?, (now() AT TIME ZONE 'utc')::date, ?, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET given = bym.crucible_day.given + EXCLUDED.given, pours = bym.crucible_day.pours + 1`,
      [user.userid, amount],
    );
    const after = await stateFrom(user, em, building, wrote[0].resources ?? {});
    return { ...after, from: f, to: t, took: amount, gave };
  });
  // The request's own copy of the save (if loaded) must not later write back the amounts from before the pour.
  const own = user.save && typeof user.save === "object" ? ((user.save as unknown as { resources?: Record<string, unknown> }).resources ?? null) : null;
  if (own && typeof own === "object") {
    own[f] = result.resources[f];
    own[t] = result.resources[t];
  }
  logger.info(`Soul Crucible: ${user.username} poured ${result.took} ${f} for ${result.gave} ${t} (level ${result.level}, ${result.given}/${result.cap} today)`);
  return result;
};
