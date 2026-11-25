import { AllianceMessageType } from "../../enums/Alliance.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { AlliancePowerup } from "../../database/models/alliancepowerup.model.js";
import { User } from "../../database/models/user.model.js";
import { POWERUP_RULES, rechargeTimeOf } from "../../config/AllianceConfig.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";
import { announceShout } from "./allianceMessages.js";
import { runPlannedPowerups } from "./powerups.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

/** Events older than this when first seen (a server down a while, the first start) are not announced. */
const FRESH_SECONDS = 15 * 60;

/**
 * Inferno-only (15 October, QoL #180): a line in the alliance's chat when one of its power-ups runs out, and when one
 * is charged again. A power-up's row is only brought up to date when someone reads it, so both are worked out from
 * the row as it is: running with its end passed (ended then), resting with its charge done (ready then), or resting
 * after a run read since (ended at its end less the recharge time). Each event once (Redis), within 15 minutes.
 */
export const checkPowerups = async (): Promise<number> => {
  const now = getCurrentDateTime();
  const em = postgres.orm.em.fork();
  const longest = Math.max(...POWERUP_RULES.map((r) => rechargeTimeOf(r, 2)));
  const rows = await em.find(AlliancePowerup, { end_time: { $gt: now - FRESH_SECONDS, $lte: now + longest } });
  let told = 0;
  for (const row of rows) {
    const rules = POWERUP_RULES.find((r) => r.type === row.powerup);
    if (!rules) continue;
    let state = "";
    let at = 0;
    if (row.active && row.end_time <= now) {
      state = "ended";
      at = row.end_time;
    } else if (!row.active && row.end_time <= now) {
      state = "ready";
      at = row.end_time;
    } else if (!row.active && row.end_time - rechargeTimeOf(rules, row.tier) <= now) {
      // (Inferno-only, 22 October: a Tier II run charges longer after)
      state = "ended";
      at = row.end_time - rechargeTimeOf(rules, row.tier);
    }
    if (!state || at <= now - FRESH_SECONDS) continue;
    const key = `alliance:pwnote:${row.alliance_id}:${row.powerup}:${state}:${at}`;
    // (a resting row's charge started from creation: no "ended" before it ever ran)
    if (state === "ended" && !row.active && (await redis.get(`alliance:pwran:${row.alliance_id}:${row.powerup}`)) == null) continue;
    const first = (await redis.set(key, "1", "EX", String(2 * 86_400), "NX")) === "OK";
    if (!first) continue;
    const alliance = await em.findOne(Alliance, { id: row.alliance_id });
    const leader = alliance?.leader_userid ? await em.findOne(User, { userid: alliance.leader_userid }) : null;
    if (!alliance || !leader) continue;
    await announceShout({ allianceId: alliance.id, author: leader, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: row.powerup, state }), em });
    told++;
  }
  return told;
};

/** Notes that a power-up was started (so its end, seen later from the resting row, is announced). */
export const notePowerupRan = async (allianceId: number, powerup: string, until: number): Promise<void> => {
  await redis.set(`alliance:pwran:${allianceId}:${powerup}`, String(until), "EX", String(30 * 86_400)).catch(() => null);
};

export const startPowerupWatch = (): void => {
  setInterval(() => {
    checkPowerups().catch((err) => logger.warn(`Alliance power-up notices: ${err}`));
  }, 60_000).unref();
  // (Inferno-only, 22 October: planned starts, due ones started within 15 seconds; their reminders)
  if (infernoOnlyConfig.enabled) {
    setInterval(() => {
      runPlannedPowerups().catch((err) => logger.warn(`Alliance planned power-ups: ${err}`));
    }, 15_000).unref();
  }
};
