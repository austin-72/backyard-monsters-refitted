import type { User } from "../../database/models/user.model.js";
import type { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { anticheatRefuses, checked, flagCheat } from "./cheatReports.js";
import { buildingProps } from "./saveChecks.js";

/**
 * Inferno-only: an attack's loot against what the attacked yard held (the cheat detector, cheatReports.ts).
 *
 * The game loots a yard's storage (BSTORAGE: out of the yard's resources, which never pass its storage) and its
 * harvesters (BRESOURCE: what each holds, at most its capacity), nothing else. When the yard is loaded to attack,
 * its pool is written in the attack's log (`lootPool`: all it can store, and five times what its harvesters can).
 * The attacker's loot (the positive part of `attackloot`, whatever catapults spent aside) adds up over the attack's
 * saves; past ten times the pool and 100,000 (the low-level bonus, +57% at most, and saves resent after failures,
 * a few times over), it's not loot.
 */

const POOL_FACTOR = 10;
const POOL_SLACK = 100_000;
const HARVESTER_FACTOR = 5;

const obj = (v: unknown): Record<string, unknown> | null => {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v !== "string" || !v) return null;
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
};

const openLog = async (user: User, baseid: string) =>
  ((await postgres.em.getConnection().execute(
    `SELECT id, attackreport FROM bym.attack_logs WHERE attacker_userid = ? AND baseid = ? AND attacktime > now() - interval '2 hours' ORDER BY attacktime DESC LIMIT 1`,
    [user.userid, baseid],
    "all",
  )) as { id: number; attackreport: Record<string, unknown> | null }[])[0] ?? null;

/**
 * What the yard sent to the attacker can give up, at most (baseLoad's answer, attack modes): each resource as much as
 * it holds or can hold, whichever is more (the yard's resources go on filling up to its storage while the attack
 * loads: harvesters banked, BASE.Fund, never past the storage), at least 1,000; and five times every harvester's
 * capacity, full or not. The storage is the most of: what the yard says (`r1max`...), 10,000 and every Storage
 * Silo's capacity there at its level, twice over (Improved Packing at its best: BASE.CalcResources), and an
 * outpost's own capacity.
 */
export const lootPool = (save: Save, response: Record<string, unknown>) => {
  const p = buildingProps();
  const outpost = save.type === BaseType.OUTPOST;
  const table = p ? (outpost ? p.outpost : p.main) : null;
  const resources = obj(response.resources) ?? {};
  const buildings = obj(response.buildingdata) ?? {};
  let pool = 0;
  let silos = 10_000;
  const harvested: number[] = [];
  for (const b of Object.values(buildings)) {
    const row = obj(b);
    if (!row || !table) continue;
    const prop = table[String(row.t)];
    if (!prop?.capacity?.length) continue;
    const level = Math.max(1, Math.min(prop.capacity.length, Number(row.l) || 1));
    const capacity = Number(prop.capacity[level - 1]) || 0;
    if (String(row.t) === "6") silos += capacity;
    else if (prop.type === "resource") harvested.push(HARVESTER_FACTOR * Math.max(capacity, Number(row.st) || 0));
  }
  const storage = Math.max(silos * 2, outpost ? Math.max(p?.outpostCapacity || 0, 5_000_000) : 0);
  for (const k of ["r1", "r2", "r3", "r4"]) {
    pool += Math.max(1000, Number(resources[k]) || 0, Number(resources[`${k}max`]) || 0, storage);
  }
  for (const n of harvested) pool += n;
  // (an outpost's harvesters may keep theirs here)
  const kept = obj(response.buildingresources) ?? {};
  for (const v of Object.values(kept)) {
    const row = obj(v);
    if (row) for (const n of Object.values(row)) if (typeof n === "number" && n > 0) pool += n;
  }
  return Math.round(pool);
};

/** The attack's log gets the yard's pool (baseLoad, after its answer is made). */
export const notePool = async (user: User, save: Save, response: Record<string, unknown>) => {
  if (!save.baseid || !(await checked(user))) return;
  try {
    const log = await openLog(user, String(save.baseid));
    if (!log) return;
    const pool = lootPool(save, response);
    await postgres.em.getConnection().execute(
      `UPDATE bym.attack_logs SET attackreport = COALESCE(attackreport, '{}'::jsonb) || jsonb_build_object('ac', jsonb_build_object('pool', ?::bigint, 'loot', 0)) WHERE id = ?`,
      [pool, log.id],
      "all",
    );
  } catch (e) {
    logger.warn(`Anticheat: loot pool not noted (${e})`);
  }
};

/**
 * An attack save's loot added to its attack's total; past the pool's limit, reported, and (refusing) its gains
 * left out of `attackloot` (what catapults spent stays). Returns the attackloot to apply.
 */
export const checkLoot = async (user: User, save: Save, attackloot: unknown): Promise<unknown> => {
  const loot = obj(attackloot);
  if (!loot || !save.baseid || !(await checked(user))) return attackloot;
  let gained = 0;
  for (const k of ["r1", "r2", "r3", "r4"]) {
    const n = Number(loot[k]);
    if (Number.isFinite(n) && n > 0) gained += n;
    else if (k in loot && !Number.isFinite(n)) gained = Infinity;
  }
  if (!(gained > 0)) return attackloot;
  try {
    const log = await openLog(user, String(save.baseid));
    const ac = log?.attackreport && typeof log.attackreport === "object" ? (log.attackreport as Record<string, unknown>).ac as Record<string, unknown> | undefined : undefined;
    if (!log || !ac) return attackloot;
    const pool = Number(ac.pool) || 0;
    const total = (Number(ac.loot) || 0) + (Number.isFinite(gained) ? gained : 0);
    const limit = POOL_FACTOR * pool + POOL_SLACK;
    const over = !Number.isFinite(gained) || total > limit;
    await postgres.em.getConnection().execute(
      `UPDATE bym.attack_logs SET attackreport = jsonb_set(attackreport, '{ac,loot}', to_jsonb(?::numeric)) WHERE id = ?`,
      [Math.min(total, 1e15), log.id],
      "all",
    );
    if (!over) return attackloot;
    const refuse = anticheatRefuses();
    await flagCheat({ userid: user.userid, username: user.username }, "loot_beyond_yard",
      { baseid: String(save.baseid), yard: String(save.type), thisSave: loot, attackTotal: total, yardPool: pool, limit }, { refused: refuse });
    if (!refuse) return attackloot;
    const kept: Record<string, number> = {};
    for (const k of ["r1", "r2", "r3", "r4"]) {
      const n = Number(loot[k]);
      if (Number.isFinite(n) && n < 0) kept[k] = n;
    }
    return kept;
  } catch (e) {
    logger.warn(`Anticheat: loot not checked (${e})`);
    return attackloot;
  }
};
