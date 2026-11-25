import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (13 October, the user's): the Basilisk (IC32) joins a player's side after many battles: hidden in the
 * Strongbox, the Compound, the Hatchery, the Incubation Control Station and the Academy until the player has won 200
 * (the quest book's attack_win counter, the one "Win 200 battles" counts: services/quests/questBook.ts, its quest
 * "m_basilisk"). The game is told by the player flag io_basilisk; saves are guarded (services/base/lockedMonsters.ts).
 */
export const BASILISK_WINS = 200;

export const basiliskFree = async (userid: number): Promise<boolean> => {
  try {
    const rows = await postgres.em
      .getConnection()
      .execute<{ wins: string | null }[]>(`SELECT counters->>'attack_win' AS wins FROM bym.quest_progress WHERE userid = ?`, [userid]);
    return Number(rows[0]?.wins ?? 0) >= BASILISK_WINS;
  } catch (err) {
    logger.warn(`Basilisk: wins not read for ${userid}: ${err}`);
    return false;
  }
};
