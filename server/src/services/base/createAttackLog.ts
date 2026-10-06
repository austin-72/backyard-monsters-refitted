import { AttackLogs } from "../../database/models/attacklogs.model.js";
import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import type { JsonObject } from "../../types/JsonObject.js";

/** The four tribes by wmid / 10 (wmid 1, 11, 21, 31: tribeForCell.ts); Moloch's strongholds are wmid 51. */
const TRIBE_NAMES = ["Legionnaire", "Kozu", "Abunakki", "Dreadnaut"];
const INFERNO_TRIBE_NAMES = ["Hellionnaire", "Kozmodeus", "Abaddonakki", "Beelzenaut"];
const MOLOCH_WMID = 51;

/** An attack's saves only add to a log started this long ago at most (an attack lasts minutes). */
const OPEN_LOG_WINDOW_MS = 2 * 60 * 60 * 1000;

/** The name a tribe yard is logged under: its tribe ("Kozmodeus"), or "Moloch". */
export const tribeLogName = (save: Save) => {
  if (save.wmid === MOLOCH_WMID) return "Moloch";
  const names = infernoOnlyConfig.enabled ? INFERNO_TRIBE_NAMES : TRIBE_NAMES;
  return names[Math.floor((save.wmid || 0) / 10)] ?? save.name ?? "Wild monsters";
};

/** Walls and traps are not counted as buildings destroyed. */
const NOT_COUNTED = new Set([17, 24, 117]);

/** The buildings at 0 health in the yard's health data (only damaged ones are in it), walls and traps aside. */
const destroyedCount = (save: Save) => {
  const health = (save.buildinghealthdata ?? {}) as Record<string, unknown>;
  const data = (save.buildingdata ?? {}) as Record<string, { t?: number } | undefined>;
  let n = 0;
  for (const [id, hp] of Object.entries(health)) {
    if (Number(hp) > 0) continue;
    const t = Number(data[id]?.t);
    if (!NOT_COUNTED.has(t)) n++;
  }
  return n;
};

/**
 * Creates a new attack log entry in the database
 *
 * Records information about an attack including attacker and defender details,
 * base type, map coordinates, loot obtained, and attack result data.
 *
 * Inferno-only (3 October): a tribe or Moloch yard is logged too (no defender: defender_userid 0, its
 * tribe's name), with the yard's baseid and level; the attack's saves then fill in its damage, loot and
 * report (updateAttackLog), and the game shows the logs (the top bar's Attack Logs button).
 *
 * @param {User} attacker - The user who initiated the attack
 * @param {User | null} defender - The user who was attacked (null: a tribe yard)
 * @param {Save} save - The save data for the attacked base
 * @returns {Promise<void>}
 */
export const createAttackLog = async (attacker: User, defender: User | null, save: Save) => {
  const attackLog = postgres.em.create(AttackLogs, {
    attacker_userid: attacker.userid,
    attacker_username: attacker.username,
    attacker_pic_square: attacker.pic_square,

    defender_userid: defender?.userid ?? 0,
    defender_username: defender?.username ?? tribeLogName(save),
    defender_pic_square: defender?.pic_square,

    type: save.type,
    x: save.cell?.x ?? null,
    y: save.cell?.y ?? null,

    baseid: save.baseid ?? null,
    level: save.level ?? null,
    damage: 0,
    destroyed: 0,
    ended: false,

    loot: {},
    // (the buildings already down when it starts: a yard keeps an earlier attack's damage)
    attackreport: { start: destroyedCount(save) },
    attacktime: new Date(),
  });

  if (defender) save.lastattackername = attacker.username;

  postgres.em.persist(attackLog);
  await postgres.em.flush();
};

const lootKeys = ["r1", "r2", "r3", "r4"] as const;

/** The longest report kept (the client's text; a big yard's log of walls knocked down is long). */
const REPORT_MAX = 40000;

/**
 * A report over REPORT_MAX keeps its first lines, whole, and its end (the loot looted, after the list):
 * cut in the middle, it lost the loot and left a tag open.
 */
export const capReport = (html: string) => {
  if (html.length <= REPORT_MAX) return html;
  const listEnd = html.lastIndexOf("</ul>");
  const tail = listEnd >= 0 ? html.slice(listEnd) : "";
  const room = Math.max(0, REPORT_MAX - tail.length - 40);
  const head = html.slice(0, room);
  const lastItem = head.lastIndexOf("</li>");
  return (lastItem >= 0 ? head.slice(0, lastItem + 5) : "") + "<li>...</li>" + (tail || "</ul>");
};

const parseObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.length) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Inferno-only: an attack save (baseSave / infernoSave) brings the attacker's open log up to date: the
 * yard's damage and the buildings it has knocked down so far (at 0 health, walls and traps aside, less
 * those already down when it started), the loot (the
 * game's own "Resources Looted": the attack's lootreport, the total so far), the attack's report (the battle
 * log the client writes, ATTACK.LogRead) and, with the last save (`over`), that it ended. A save with no open
 * log (one started before logs were kept, or practice) changes nothing. It never fails the save.
 */
export const updateAttackLog = async (attacker: User, save: Save, data: { over?: unknown; lootreport?: unknown }) => {
  if (!infernoOnlyConfig.enabled || !save.baseid) return;
  try {
    const log = await postgres.em.findOne(
      AttackLogs,
      {
        attacker_userid: attacker.userid,
        baseid: save.baseid,
        ended: false,
        attacktime: { $gt: new Date(Date.now() - OPEN_LOG_WINDOW_MS) },
      },
      { orderBy: { attacktime: "DESC" } }
    );
    if (!log) return;

    log.damage = Math.max(0, Math.min(100, Math.round(Number(save.damage) || 0)));
    const before = Number(((log.attackreport ?? {}) as Record<string, unknown>).start) || 0;
    log.destroyed = Math.max(log.destroyed || 0, destroyedCount(save) - before);

    // (the totals so far: never less than the last save's)
    const report = parseObject(data.lootreport);
    if (report) {
      const loot: JsonObject = { ...(log.loot ?? {}) };
      for (const key of lootKeys) {
        const n = Math.min(1e13, Math.max(0, Math.round(Number(report[key]) || 0)));
        if (n > (Number(loot[key]) || 0)) loot[key] = n;
      }
      log.loot = loot;
    }

    const html = save.attackreport as unknown;
    if (typeof html === "string" && html.length) {
      log.attackreport = { ...(log.attackreport ?? {}), html: capReport(html) };
    }

    if (data.over) {
      log.ended = true;
      log.endtime = new Date();
    }

    if (save.type === BaseType.TRIBE && !log.level && save.level) log.level = save.level;

    postgres.em.persist(log);
    await postgres.em.flush();
  } catch (e) {
    logger.error(`Attack log ${attacker.userid} / ${save.baseid}: not updated: ${e}`);
  }
};
