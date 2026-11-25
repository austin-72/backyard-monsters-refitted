import { readFileSync } from "node:fs";
import type { User } from "../../database/models/user.model.js";
import type { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";
import { anticheatRefuses, checked, flagCheat } from "./cheatReports.js";

/**
 * Inferno-only: the cheat detector's checks of a yard save (/base/save, controllers/base/save/baseSave.ts), run
 * before anything of it is written. See cheatReports.ts for the rules' principle (nothing a fair game can send is
 * reported).
 */

/**
 * Every field the game sends with a save: BASE.getOrderedSaveVariablesFromObject's list (client-web/src/game/BASE.ts)
 * and the player's handlers (Player.ts: RewardHandler "rewards", KOTHHandler "krallen", SubscriptionHandler
 * "subscriptions", BaseBuffHandler "buffs"). Nothing else in the game posts to /base/save (BASE.SaveB only).
 */
export const STOCK_SAVE_KEYS = new Set([
  "baseid", "lastupdate", "resources", "academy", "stats", "mushrooms", "basename", "baseseed", "buildingdata", "researchdata", "lockerdata",
  "quests", "basevalue", "points", "tutorialstage", "basesaveid", "clienttime", "monsters", "attacks", "monsterbaiter", "version",
  "attackreport", "over", "protect", "monsterupdate", "attackid", "aiattacks", "effects", "catapult", "flinger", "gifts", "sentgifts",
  "sentinvites", "purchase", "inventory", "timeplayed", "destroyed", "damage", "type", "attackcreatures", "attackloot", "lootreport",
  "empirevalue", "champion", "attackerchampion", "attackersiege", "purchasecomplete", "achieved", "fbpromos", "iresources", "siege",
  "buildingresources", "frontpage", "events", "buildinghealthdata", "healtime", "lootbonus", "iotest",
  "rewards", "krallen", "subscriptions", "buffs",
  // (18 October: the name of a save's resource changes, so one sent again counts once: baseSave)
  "ioseq",
]);

// ---- the game's own building tables (client-web/tools/anticheat/dump-building-props.mjs)

interface PropRow {
  name: string;
  type: string;
  levels: number;
  capacity?: number[];
  quantity?: number[];
  fortify?: number;
  produce?: boolean;
}

interface PropsFile {
  main: Record<string, PropRow>;
  outpost: Record<string, PropRow>;
  outpostCapacity: number;
}

let props: PropsFile | null = null;
export const buildingProps = (): PropsFile | null => {
  if (props) return props;
  try {
    props = JSON.parse(readFileSync(new URL("../../game-data/anticheat/buildingProps.json", import.meta.url), "utf8")) as PropsFile;
  } catch (e) {
    logger.warn(`Anticheat: the building tables could not be read (${e}): their checks are off`);
  }
  return props;
};

/**
 * The kinds of building whose level only an upgrade changes, and so never passes its table's last level. Not
 * decorations (a totem's level is the waves it has seen; stored decorations keep a level of their own), traps
 * that fire (their `l`), the Map Room (11: Map Room 2 and 3 are its levels 2 and 3, past its one-level table).
 */
const LEVELLED_TYPES = new Set(["resource", "special", "tower", "wall", "trap"]);
const NOT_TABLE_LEVELLED = new Set(["11"]);

const STORAGE_TYPE = "6"; // the Storage Silo (BUILDING6, BASE.CalcResources: the only building that adds storage)
const BASE_STORAGE = 10_000;
const MAX_PACKING = 2; // Improved Packing (BIP), ten levels of 10%: GLOBAL._upgradePacking at most 2
/** Saves a failed save's resources can ride along with: the game stops after 5 failures (BASE.handleLoadError), and an answer lost after the server took one counts it once more. */
const RESENT_SAVES = 8;
const RESOURCE_SLACK = 1_000_000;

const outpostsOf = async (userid: number) => {
  try {
    const rows = (await postgres.em.getConnection().execute(`SELECT count(*) AS n FROM bym.save WHERE saveuserid = ? AND type = ?`, [userid, BaseType.OUTPOST], "all")) as { n: string }[];
    return Number(rows[0]?.n ?? 0) || 0;
  } catch {
    return 1000;
  }
};

/** The most any of this player's yards can store of one resource (all silos at their best, packing at its best, every outpost's share). */
export const storageCeiling = async (userid: number) => {
  const p = buildingProps();
  const silo = p?.main[STORAGE_TYPE];
  if (!silo?.capacity?.length) return Infinity;
  const most = Math.max(...silo.capacity);
  const count = Math.max(...(silo.quantity ?? [0]), 0);
  return (BASE_STORAGE + most * count) * MAX_PACKING + (await outpostsOf(userid)) * Math.max(p!.outpostCapacity || 5_000_000, 5_000_000);
};

const parseObject = (v: unknown): Record<string, unknown> | null => {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v !== "string" || !v) return null;
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
};

const MUSHROOM_WINDOW = 24 * 3600;
/**
 * Warts in 24 hours, at most: 20 when a yard first grows them (MUSHROOMS.Setup with none grown yet), one every 4.8
 * hours of growth after, 3 times as fast in a Wart Bloom (MUSHROOMS.ts): 35. Three times that and more (a yard
 * open on two devices at once picking the same warts, saves resent after failures) is still short of 120.
 */
const MUSHROOM_MOST = 120;

export interface SaveCheckInput {
  user: User;
  baseSave: Save;
  body: Record<string, unknown>;
  saveData: { buildingdata?: unknown; purchase?: [string, number] | undefined; [k: string]: unknown };
  isOwner: boolean;
  isAttack: boolean;
  gauntlet: boolean;
}

/**
 * Checks a save before it is written. It leaves out of `body` / `saveData` what it refuses (fields the game never
 * sends, resources out of nowhere, a forged wart), reports what it finds, and throws nothing: an attack save with
 * no attack started is refused by the caller (`attackStarted`).
 */
export const checkSave = async (input: SaveCheckInput): Promise<void> => {
  const { user, baseSave, body, saveData, isOwner } = input;
  if (!(await checked(user))) return;
  const who = { userid: user.userid, username: user.username };
  const refuse = anticheatRefuses();
  const now = getCurrentDateTime();
  const where = { baseid: String(baseSave.baseid ?? ""), yard: String(baseSave.type ?? ""), owner: isOwner };

  // ---- fields the game never sends
  const unknown = Object.keys(body).filter((k) => !STOCK_SAVE_KEYS.has(k));
  if (unknown.length) {
    await flagCheat(who, "save_unknown_fields", { ...where, fields: unknown.slice(0, 20) }, { refused: refuse });
    if (refuse) for (const k of unknown) {
      delete body[k];
      delete saveData[k];
    }
  }

  // ---- the game's clock ahead of the server's (5 minutes: the game's starts behind the server's and keeps real time)
  const clienttime = Number(body.clienttime);
  if (Number.isFinite(clienttime) && clienttime > now + 300) {
    await flagCheat(who, "clock_ahead", { ...where, game: clienttime, server: now, ahead: clienttime - now });
  }

  if (isOwner) {
    // ---- resources out of nowhere
    const resources = parseObject(body.resources);
    if (resources) {
      let ceiling: number | null = null;
      const bad: Record<string, number> = {};
      for (const k of ["r1", "r2", "r3", "r4"]) {
        if (!(k in resources)) continue;
        const n = Number(resources[k]);
        if (!Number.isFinite(n)) {
          bad[k] = NaN;
          continue;
        }
        if (n <= RESOURCE_SLACK) continue;
        ceiling ??= await storageCeiling(user.userid);
        if (n > RESENT_SAVES * ceiling + RESOURCE_SLACK) bad[k] = n;
      }
      if (Object.keys(bad).length) {
        await flagCheat(who, "resources_from_nowhere", { ...where, added: bad, storageCeiling: ceiling, limit: ceiling != null ? RESENT_SAVES * ceiling + RESOURCE_SLACK : null }, { refused: refuse });
        if (refuse) {
          for (const k of Object.keys(bad)) delete resources[k];
          body.resources = JSON.stringify(resources);
        }
      }
    }

    // ---- a building raised past its table's last level (raised by this save: what was stored already isn't this save's)
    const p = buildingProps();
    const table = p && (baseSave.type === BaseType.MAIN ? p.main : baseSave.type === BaseType.OUTPOST ? p.outpost : null);
    const incoming = table ? parseObject(saveData.buildingdata) : null;
    if (table && incoming) {
      const stored = (parseObject(baseSave.buildingdata) ?? {}) as Record<string, Record<string, unknown> | undefined>;
      const over: unknown[] = [];
      for (const [key, b] of Object.entries(incoming)) {
        if (!b || typeof b !== "object") continue;
        const row = b as Record<string, unknown>;
        const t = String(row.t ?? "");
        const prop = table[t];
        if (!prop || NOT_TABLE_LEVELLED.has(t) || !LEVELLED_TYPES.has(prop.type) || !(prop.levels > 0)) continue;
        const level = Number(row.l);
        if (!Number.isFinite(level) || level <= prop.levels) continue;
        const before = stored[key];
        if (before && String(before.t) === t && Number(before.l) >= level) continue;
        over.push({ id: key, type: Number(t), name: prop.name, level, highest: prop.levels, before: before ? Number(before.l) : null });
        // (refusing: the building kept at its table's last level; saveData.buildingdata is what is written)
        if (refuse) row.l = prop.levels;
      }
      if (over.length) await flagCheat(who, "building_over_max_level", { ...where, buildings: over.slice(0, 10) }, { refused: refuse });

      // ---- a building calcified (the game's `fort`) past what its table offers: four levels for the main yard's
      // towers, Resource Pods and Under Hall, none anywhere else (12 November). As above: only what this save raised.
      const overFort: unknown[] = [];
      for (const [key, b] of Object.entries(incoming)) {
        if (!b || typeof b !== "object") continue;
        const row = b as Record<string, unknown>;
        if (row.fort == null) continue;
        const t = String(row.t ?? "");
        const prop = table[t];
        if (!prop) continue;
        const fort = Number(row.fort);
        const highest = Number(prop.fortify) || 0;
        if (Number.isFinite(fort) && fort <= highest) continue;
        const before = stored[key];
        const had = before && String(before.t) === t ? Number(before.fort) || 0 : 0;
        if (Number.isFinite(fort) && had >= fort) continue;
        overFort.push({ id: key, type: Number(t), name: prop.name, fort: row.fort, highest, before: had });
        if (refuse) row.fort = Math.min(Math.max(had, 0), Math.max(highest, had));
      }
      if (overFort.length) await flagCheat(who, "building_over_max_calcification", { ...where, buildings: overFort.slice(0, 10) }, { refused: refuse });
    }

    // ---- a purchase of none, or less than none (BASE.Purchase refuses a quantity that isn't more than 0; a negative
    // one took items out of the store record, so a quest's Shiny could be claimed again)
    const bought = saveData.purchase;
    if (Array.isArray(bought) && typeof bought[0] === "string" && !(Number.isFinite(Number(bought[1])) && Number(bought[1]) > 0)) {
      await flagCheat(who, "purchase_bad_quantity", { ...where, purchase: bought.slice(0, 2) }, { refused: refuse });
      if (refuse) saveData.purchase = undefined;
    }

    // ---- a wart's shiny forged
    const purchase = saveData.purchase;
    if (Array.isArray(purchase) && typeof purchase[0] === "string" && purchase[0].startsWith("MUSHROOM")) {
      const q = Number(purchase[1]);
      let reason: string | null = q !== 1 ? `${purchase[1]} warts at once` : null;
      // (18 October, SUSPECTED-BUGS.md: warts grow in the main yard only, and a Redis failure meant no count at all)
      let quiet = false;
      if (!reason && baseSave.type !== "main") reason = `a wart picked in a ${baseSave.type} yard`;
      if (!reason) {
        try {
          const key = `anticheat:warts:${user.userid}`;
          await redis.send("ZADD", [key, String(now), `${now}:${Math.random().toString(36).slice(2, 8)}`]);
          await redis.send("ZREMRANGEBYSCORE", [key, "-inf", String(now - MUSHROOM_WINDOW)]);
          await redis.expire(key, MUSHROOM_WINDOW + 3600);
          const n = Number(await redis.send("ZCARD", [key]));
          if (n > MUSHROOM_MOST) reason = `${n} warts in 24 hours`;
        } catch {
          // (no count without Redis: not paid now, nothing reported)
          reason = "warts not counted (Redis)";
          quiet = true;
        }
      }
      if (reason && quiet) saveData.purchase = undefined;
      else if (reason) {
        await flagCheat(who, "mushroom_forged", { ...where, purchase, reason }, { refused: refuse });
        if (refuse) saveData.purchase = undefined;
      }
    }
  }
};

/**
 * An attack save on a yard this player started an attack on (its attack log, written when the yard was loaded to
 * attack: baseModeAttack / createAttackLog) within the last two hours. Moloch's Gauntlet yards keep their own
 * check (services/events/gauntlet.ts). True when it may be written.
 */
export const attackStarted = async (input: SaveCheckInput): Promise<boolean> => {
  const { user, baseSave, isAttack, gauntlet } = input;
  if (!isAttack || gauntlet || !(await checked(user))) return true;
  try {
    const rows = (await postgres.em.getConnection().execute(
      `SELECT id FROM bym.attack_logs WHERE attacker_userid = ? AND baseid = ? AND attacktime > now() - interval '2 hours' LIMIT 1`,
      [user.userid, String(baseSave.baseid)],
      "all",
    )) as unknown[];
    if (rows.length) return true;
  } catch (e) {
    logger.warn(`Anticheat: attack log not read (${e}): the save is taken`);
    return true;
  }
  const refuse = anticheatRefuses();
  await flagCheat({ userid: user.userid, username: user.username }, "attack_save_without_attack",
    { baseid: String(baseSave.baseid), yard: String(baseSave.type), attackid: String(input.body.attackid ?? ""), damage: input.body.damage ?? null }, { refused: refuse });
  return !refuse;
};
