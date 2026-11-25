import { isTestMode } from "../admin/testMode.js";
import type { User } from "../../database/models/user.model.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";
import { advanceBuildingTimers } from "../base/advanceBuildingTimers.js";
import { isShinyLocked } from "../user/shinyLock.js";
import type { BuildingDataMap, BuildingHealthData } from "../../types/BuildingData.js";

/**
 * A casino refusal the player reads ("The Brimstone Pit is damaged...": sent as { error: message }
 * with status 200, which the game shows; not a server failure).
 */
export const casinoErr = (message: string, status: number = Status.BAD_REQUEST) =>
  new ClientSafeError({ message, status, data: {}, isClientFriendly: false });

export interface PitState {
  /** The Pit's level (1-6), or 0 when there is none that can be played in. */
  level: number;
  /** Why it cannot be played in, if it cannot. */
  closed: string | null;
}

/**
 * The player's Brimstone Pit as it is now: the stored yard's countdowns brought forward to now (the
 * client keeps its yard as a snapshot plus the time it was saved; services/base/advanceBuildingTimers).
 */
export const pitState = async (user: User): Promise<PitState> => {
  // Only the Pit and its health are read (9 October): every bet asks, and the whole yard (some 300 buildings,
  // 15 KB and more) was sent over and gone through each time.
  const rows = (await postgres.em.getConnection().execute(
    `SELECT s.savetime, p.key, p.value AS pit, jsonb_exists(COALESCE(s.buildinghealthdata, '{}'::jsonb), p.value->>'id') AS hurt,
            s.buildinghealthdata -> (p.value->>'id') AS health
       FROM bym.save s
       LEFT JOIN LATERAL (SELECT key, value FROM jsonb_each(CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN s.buildingdata ELSE '{}'::jsonb END)
                           WHERE jsonb_typeof(value) = 'object' AND (value->>'t') ~ '^[0-9.]+$' AND (value->>'t')::numeric = ? LIMIT 1) p ON true
      WHERE s.userid = ? AND s.type = ? LIMIT 1`,
    [casinoConfig.buildingType, user.userid, BaseType.MAIN],
    "all",
  )) as { savetime: number; key: string | null; pit: BuildingDataMap[string] | null; hurt: boolean | null; health: unknown }[];
  const save = rows[0];
  if (!save) return { level: 0, closed: "Build the Brimstone Pit first." };
  if (!save.pit || save.key == null) return { level: 0, closed: "Build the Brimstone Pit first." };
  const health: BuildingHealthData = save.hurt ? ({ [String(save.pit.id)]: save.health } as BuildingHealthData) : {};
  const now = Math.floor(Date.now() / 1000);
  const buildings = advanceBuildingTimers({ [save.key]: save.pit } as BuildingDataMap, health, now - (save.savetime || now));
  const pit = Object.values(buildings).find((b) => b && Number(b.t) === casinoConfig.buildingType);
  if (!pit) return { level: 0, closed: "Build the Brimstone Pit first." };
  if (pit.cB && pit.cB > 0) return { level: 0, closed: "The Brimstone Pit is still being built." };
  const level = Math.max(1, Math.min(6, Number(pit.l) || 1));
  const damaged = Boolean(pit.rE) || pit.hp != null || String(pit.id) in health;
  if (damaged) return { level, closed: "The Brimstone Pit is damaged. Repair it to play." };
  return { level, closed: null };
};

/**
 * Everything a bet needs checked before it is played: the Pit is open, the game is open at its level,
 * and the player's Shiny is not turned off.
 *
 * @returns the Pit's level.
 */
export const requireCasino = async (user: User, game: string): Promise<number> => {
  if (!casinoConfig.enabled) throw casinoErr("The Brimstone Pit is closed.", Status.FORBIDDEN);
  if (isShinyLocked(user)) throw casinoErr("Shiny is turned off on your account, so you cannot play in the Brimstone Pit.", Status.FORBIDDEN);
  // Inferno-only (14 October, QoL #278): admin test mode gives 9,999,999 Shiny, and switching it off restores
  // the yard but not the Pit's bets, ledger, luck or the shared slots jackpot. No bets while testing.
  if (await isTestMode(user)) throw casinoErr("The Brimstone Pit is closed in admin test mode: its bets and the shared jackpot would not be undone when you switch it off.", Status.FORBIDDEN);
  const pit = await pitState(user);
  if (pit.closed) throw casinoErr(pit.closed, Status.CONFLICT);
  const opens = casinoConfig.unlockLevel[game];
  if (opens == null) throw casinoErr("That game is not open yet.", Status.CONFLICT);
  if (pit.level < opens) throw casinoErr(`That game opens at Brimstone Pit level ${opens}.`, Status.CONFLICT);
  return pit.level;
};

/** A stake is a whole number of Shiny within the limits. */
export const checkStake = (stake: number) => {
  if (!Number.isInteger(stake) || stake < casinoConfig.minBet) throw casinoErr(`The smallest bet is ${casinoConfig.minBet} Shiny.`);
  if (casinoConfig.maxBet > 0 && stake > casinoConfig.maxBet) throw casinoErr(`The largest bet is ${casinoConfig.maxBet} Shiny.`);
  if (stake > 1_000_000_000) throw casinoErr("That bet is too large.");
  // (9 October: Shiny and payouts are whole numbers under 2,147,483,647 in the database; a bet whose biggest win
  // would not fit failed after its result was drawn, without moving the seeds on: the player then knew that
  // result and could bet on it again, smaller)
  const most = Math.floor(2_147_483_647 / Math.max(1, casinoConfig.maxMultiplier));
  if (stake > most) throw casinoErr(`The largest bet is ${most.toLocaleString("en-US")} Shiny.`);
};
