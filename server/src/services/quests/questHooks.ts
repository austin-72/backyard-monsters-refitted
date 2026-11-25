import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { questBest, questBump } from "./questProgress.js";

/**
 * Inferno-only (8 October, the quest book doubled): what the server sees for the new quests, counted where it
 * happens. Each never throws and is called without waiting (`void`): a quest must not slow or fail what it counts.
 */

const on = () => infernoOnlyConfig.enabled;

const sql = <T = Record<string, unknown>>(query: string, params: unknown[] = []) =>
  postgres.em.getConnection().execute<T[]>(query, params, "all");

/** The game's victory line: an attack that destroys this much of a yard is won (BYMConfig.k_sVICTORY_THRESHOLD). */
const WON = 90;

/**
 * (24 October, SUSPECTED-BUGS.md "Battle quest counters ... are the attack save's word") The least an attack lasts to
 * count as won: one save of damage 100 sent right after the yard's load counted, so "Win 200 battles" (and the
 * Basilisk) could be had in minutes.
 */
export const WIN_MIN_SECONDS = 15;

/**
 * An attack that counts as won for the quest book: past the victory line, at least one building knocked down by this
 * attack (a yard left in ruins by an earlier one stays at its damage: attacking it again counted another win), and
 * lasting at least WIN_MIN_SECONDS from the load to the last save.
 */
export const isWin = (log: { damage?: number | null; destroyed?: number | null; attacktime?: Date | null; endtime?: Date | null }) => {
  if ((Number(log.damage) || 0) < WON) return false;
  if ((Number(log.destroyed) || 0) < 1) return false;
  const start = log.attacktime ? new Date(log.attacktime).getTime() : 0;
  const end = log.endtime ? new Date(log.endtime).getTime() : Date.now();
  return start > 0 && end - start >= WIN_MIN_SECONDS * 1000;
};

/** A player's attack on a yard held off: less than half of it destroyed. */
const HELD = 50;

/**
 * A player's attack on another player's yard or outpost ended (services/base/createAttackLog.ts updateAttackLog):
 * - the defender was attacked by a player (reveals "Revenge")
 * - won on a player who had attacked the attacker before: "Revenge"
 * - won on a member of an alliance the attacker's alliance is hostile with (either way): "Feud"
 * - held off: the defender's "Stand firm" (a main yard) or "Holdout" (an outpost)
 */
export const questPlayerAttackEnded = async (log: {
  attacker_userid: number;
  defender_userid?: number | null;
  type?: string | null;
  damage?: number | null;
  attacktime?: Date | null;
}) => {
  if (!on()) return;
  try {
    const attacker = Number(log.attacker_userid) || 0;
    const defender = Number(log.defender_userid) || 0;
    if (!attacker || !defender || attacker === defender) return;
    if (log.type !== "main" && log.type !== "outpost") return;
    const damage = Number(log.damage) || 0;
    await questBump(defender, "attacked_by_player");
    if (damage >= WON) {
      const before = await sql<{ n: number }>(
        `SELECT 1 AS n FROM bym.attack_logs WHERE attacker_userid = ? AND defender_userid = ? AND attacktime < ? LIMIT 1`,
        [defender, attacker, log.attacktime ?? new Date()]
      );
      if (before.length) await questBump(attacker, "revenge");
      const hostile = await sql<{ n: number }>(
        `SELECT 1 AS n FROM bym."user" a, bym."user" d, bym.alliance_relationship r
          WHERE a.userid = ? AND d.userid = ? AND a.alliance_id IS NOT NULL AND d.alliance_id IS NOT NULL AND r.relationship = -1
            AND ((r.alliance_id = a.alliance_id AND r.target_alliance_id = d.alliance_id) OR (r.alliance_id = d.alliance_id AND r.target_alliance_id = a.alliance_id))
          LIMIT 1`,
        [attacker, defender]
      );
      if (hostile.length) await questBump(attacker, "feud");
    } else if (damage < HELD) {
      await questBump(defender, log.type === "outpost" ? "outpost_defended" : "defended_player");
    }
  } catch (err) {
    logger.warn(`Quests: an attack's end (${log.attacker_userid} on ${log.defender_userid}): ${err}`);
  }
};

/**
 * (18 October, SUSPECTED-BUGS.md: the battle counters came only from what the game reported) An attack ended, any
 * yard's (services/base/createAttackLog.ts updateAttackLog): a win (the victory line reached), the loot the server
 * paid for it (checked), and the buildings it knocked down, from the attack's own log. The game no longer reports
 * these (questBook.ts CLIENT_EVENTS). The Basilisk reads the wins (services/events/basilisk.ts).
 */
export const questAttackEnded = async (log: { attacker_userid: number; damage?: number | null; destroyed?: number | null; attackreport?: unknown; attacktime?: Date | null; endtime?: Date | null }) => {
  if (!on()) return;
  try {
    const attacker = Number(log.attacker_userid) || 0;
    if (!attacker) return;
    if (isWin(log)) await questBump(attacker, "attack_win");
    const paid = Math.min(2e9, Math.floor(Number((log.attackreport as { paid?: unknown } | null)?.paid) || 0));
    if (paid > 0) await questBump(attacker, "loot", paid);
    const destroyed = Math.min(2000, Math.floor(Number(log.destroyed) || 0));
    if (destroyed > 0) await questBump(attacker, "buildings_destroyed", destroyed);
  } catch (err) {
    logger.warn(`Quests: an attack's end (${log.attacker_userid}): ${err}`);
  }
};

const lostKey = (userid: number) => `quest:lost:${userid}`;

/**
 * A map cell taken (controllers/maproom/v2/takeoverCell.ts): from a tribe yard of level 40 or more ("Tribal
 * conquest"); in the Depths of Hell ("Secret of the Depths"); from a player, who has lost it ("Lost and found" is
 * revealed for them, the cell remembered); one the taker had lost before, taken back ("Lost and found").
 */
export const questCellTaken = async (taker: number, cell: { x: number; y: number }, from: { tribe: boolean; level: number; owner: number }, depths: boolean) => {
  if (!on() || !taker) return;
  try {
    const where = `${cell.x},${cell.y}`;
    if (from.tribe && from.level >= 40) await questBump(taker, "capture_tribe40");
    if (depths) await questBump(taker, "capture_depths");
    if (!from.tribe && from.owner && from.owner !== taker) {
      await questBump(from.owner, "outpost_lost");
      await redis.sadd(lostKey(from.owner), where);
      await redis.expire(lostKey(from.owner), 90 * 86400);
    }
    if (Number(await redis.send("SISMEMBER", [lostKey(taker), where])) === 1) {
      await redis.send("SREM", [lostKey(taker), where]);
      await questBump(taker, "outpost_retaken");
    }
  } catch (err) {
    logger.warn(`Quests: a cell taken by #${taker}: ${err}`);
  }
};

/** A member made an officer, or the leadership handed over: "Right hand", for both. */
export const questPromoted = async (by: number, member: number) => {
  if (!on()) return;
  await questBump(by, "promote_any");
  await questBump(member, "promote_any");
};

/** A Brimstone Pit win announced in Global chat: "Headliner". */
export const questHeadline = (userid: number) => {
  if (!on()) return;
  void questBump(userid, "pit_headline");
};

/**
 * An arcade result recorded (services/arcade/scores.ts): a run's best second number ("ars_<game>_<mode>_s2":
 * Smash's chain, Breakout's level, Stack's rows...) and score ("_s1"), whatever its score was; a live match won
 * against a real player ("Rival").
 */
export const questArcadeRun = (userid: number, game: string, mode: string, score: number, score2: number) => {
  if (!on() || !(userid > 0)) return;
  void questBest(userid, `ars_${game}_${mode}_s1`, score);
  void questBest(userid, `ars_${game}_${mode}_s2`, score2);
};

export const questArcadeWin = (userid: number, vsPlayer: boolean) => {
  if (!on() || !(userid > 0) || !vsPlayer) return;
  void questBump(userid, "arcade_pvp_win");
};
