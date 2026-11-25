import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/** Rows older than this go (checked now and then, as rows are written), with the yards kept with them. */
const KEEP_DAYS = 90;

/**
 * Inferno-only (14 October, QoL #494): one row in bym.player_log for something a player did that the game can't
 * undo (a relocation), with what it takes to put it back. Never fails the action: a write that fails is logged.
 * Answers the row's id (0 if it couldn't be written).
 *
 * To read: SELECT id, at, action, details FROM bym.player_log WHERE userid = <id> ORDER BY at DESC;
 * and a relocation's outposts as they were: SELECT baseid, row FROM bym.player_log_save WHERE log_id = <id>;
 */
export const logPlayerAction = async (userid: number, username: string, action: string, details: Record<string, unknown>): Promise<number> => {
  try {
    const db = postgres.em.getConnection();
    const rows = await db.execute<{ id: number }[]>(`INSERT INTO bym.player_log (userid, username, action, details) VALUES (?, ?, ?, ?::jsonb) RETURNING id`, [userid, username ?? "", action, JSON.stringify(details)]);
    if (Math.random() < 0.02) {
      await db.execute(`DELETE FROM bym.player_log WHERE at < now() - interval '${KEEP_DAYS} days'`);
    }
    return Number(rows[0]?.id) || 0;
  } catch (err) {
    logger.error(`Player log (${action}) for ${username} (${userid}) failed: ${err}`);
    return 0;
  }
};

/** More for a row already written (merged into its details). */
export const addToPlayerLog = async (id: number, details: Record<string, unknown>) => {
  if (!id) return;
  try {
    await postgres.em.getConnection().execute(`UPDATE bym.player_log SET details = details || ?::jsonb WHERE id = ?`, [JSON.stringify(details), id]);
  } catch (err) {
    logger.error(`Player log ${id}: could not add to it: ${err}`);
  }
};

/** The player's outposts' save rows, kept with log row `id` before they are deleted. Answers how many. */
export const keepOutpostSaves = async (id: number, userid: number): Promise<number> => {
  if (!id) return 0;
  try {
    const rows = await postgres.em.getConnection().execute<{ n: number }[]>(
      `WITH kept AS (INSERT INTO bym.player_log_save (log_id, baseid, row) SELECT ?, s.baseid, to_jsonb(s) FROM bym.save s WHERE s.userid = ? AND s.type = 'outpost' RETURNING 1) SELECT count(*) AS n FROM kept`,
      [id, userid]
    );
    return Number(rows[0]?.n) || 0;
  } catch (err) {
    logger.error(`Player log ${id}: could not keep the outposts of ${userid}: ${err}`);
    return 0;
  }
};
