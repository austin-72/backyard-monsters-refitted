import { infernoOnlyConfig } from "./InfernoOnlyConfig.js";
import { AllianceMessageType, AlliancePowerupType, AllianceStance } from "../enums/Alliance.js";

export interface PowerupRules {
  powerup_id: number;
  type: AlliancePowerupType;
  running_time: number;
  recharge_time: number;
  hourly_cost: number;
}

export const MAX_ALLIANCE_MEMBERS = 50;

export const ALLIANCE_NAME_MIN_LENGTH = 3;

export const ALLIANCE_NAME_MAX_LENGTH = 30;

/** Text for different types of shouts for an alliance. */
export const SHOUT_TEXT: Partial<Record<AllianceMessageType, string>> = {
  [AllianceMessageType.PROMOTED]: "has been promoted to leader.",
  [AllianceMessageType.JOINED]: "has been added to the Alliance!",
  [AllianceMessageType.KICKED]: "has been removed from the alliance.",
  [AllianceMessageType.LEFT]: "has now left the Alliance.",
  [AllianceMessageType.CREATED]: "has created the Alliance!",
};

/** The label each flag renders as. */
export const STANCE_LABEL: Record<AllianceStance, string> = {
  [AllianceStance.HOSTILE]: "Foe",
  [AllianceStance.NEUTRAL]: "Neutral",
  [AllianceStance.FRIENDLY]: "Ally",
};

/**
 * The rules governing each alliance power-up - how long it runs once started, how
 * long it takes to charge, and what an hour off that charge costs in Shiny.
 */
// Inferno-only: every power-up recharges in 4 days (stock: Armament 7, Conquest 5, Declare War 7).
export const POWERUP_RULES: PowerupRules[] = [
  {
    powerup_id: 1,
    type: AlliancePowerupType.ARMAMENT,
    running_time: 12 * 3600,
    recharge_time: (infernoOnlyConfig.enabled ? 4 : 7) * 24 * 3600,
    hourly_cost: infernoOnlyConfig.enabled ? infernoOnlyConfig.prices.powerupHour : 20,
  },
  {
    powerup_id: 2,
    type: AlliancePowerupType.CONQUEST,
    running_time: 6 * 3600,
    recharge_time: (infernoOnlyConfig.enabled ? 4 : 5) * 24 * 3600,
    hourly_cost: infernoOnlyConfig.enabled ? infernoOnlyConfig.prices.powerupHour : 20,
  },
  {
    powerup_id: 3,
    type: AlliancePowerupType.DECLARE_WAR,
    running_time: 12 * 3600,
    recharge_time: (infernoOnlyConfig.enabled ? 4 : 7) * 24 * 3600,
    hourly_cost: infernoOnlyConfig.enabled ? infernoOnlyConfig.prices.powerupHour : 20,
  },
  // Inferno-only (22 October, the user's): Harvest Moon (harvesters +25%) and Builders' Guild (builds and upgrades
  // 15% quicker), 12 hours each, on the same 4-day recharge and hourly price (the client applies them: POWERUPS)
  ...(infernoOnlyConfig.enabled
    ? [
        {
          powerup_id: 4,
          type: AlliancePowerupType.HARVEST_MOON,
          running_time: 12 * 3600,
          recharge_time: 4 * 24 * 3600,
          hourly_cost: infernoOnlyConfig.prices.powerupHour,
        },
        {
          powerup_id: 5,
          type: AlliancePowerupType.BUILDERS_GUILD,
          running_time: 12 * 3600,
          recharge_time: 4 * 24 * 3600,
          hourly_cost: infernoOnlyConfig.prices.powerupHour,
        },
      ]
    : []),
];

/** How each power-up is named in a shout - the original's ap_*_name values. */
export const POWERUP_LABEL: Record<AlliancePowerupType, string> = {
  [AlliancePowerupType.ARMAMENT]: "Armament",
  [AlliancePowerupType.CONQUEST]: "Conquest",
  [AlliancePowerupType.DECLARE_WAR]: "Declare War",
  [AlliancePowerupType.HARVEST_MOON]: "Harvest Moon",
  [AlliancePowerupType.BUILDERS_GUILD]: "Builders' Guild",
};
/**
 * Inferno-only (22 October, the user's picks from Round 2 of the proposals: "B", "C"):
 *  - Tier II: a power-up started at Tier II runs `runMul` times as long, then charges for `rechargeDays` days instead of
 *    its usual 4. Chosen when it is started (or planned), kept on its row (alliance_powerup.tier) until it is started again.
 *  - A planned start: the leader (or an officer allowed to start power-ups) sets the time a power-up starts, from
 *    `soonest` to `latest` seconds ahead; it must be charged by then. The alliance's chat is told when it's planned,
 *    `remindBefore` seconds before it starts, and when it starts (services/alliance/powerupWatch.ts).
 */
export const POWERUP_TIER2 = { runMul: 1.5, rechargeDays: 6 };

export const POWERUP_PLAN = { soonest: 5 * 60, latest: 7 * 86_400, remindBefore: 15 * 60 };

/** The tier a row may be given: 2 only in the Inferno. */
export const powerupTier = (tier: unknown): 1 | 2 => (infernoOnlyConfig.enabled && Number(tier) === 2 ? 2 : 1);

/** How long a power-up runs at a tier. */
export const runTimeOf = (rules: PowerupRules, tier: unknown): number =>
  powerupTier(tier) === 2 ? Math.round(rules.running_time * POWERUP_TIER2.runMul) : rules.running_time;

/** How long a power-up charges after a run at a tier. */
export const rechargeTimeOf = (rules: PowerupRules, tier: unknown): number =>
  powerupTier(tier) === 2 ? POWERUP_TIER2.rechargeDays * 86_400 : rules.recharge_time;
