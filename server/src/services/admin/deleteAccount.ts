import { postgres } from "../../server.js";

/**
 * Inferno-only: an account deleted from the admin panel (the user's), with everything that is the
 * player's, in one transaction (if any part fails, nothing is deleted):
 *  - their world counts one player fewer;
 *  - an alliance they lead goes to the officer (or else the member) who has been in it longest, or is
 *    deleted when nobody else is in it;
 *  - their yards: the map cells of their main yard, outposts and the Depths, and every save of theirs
 *    (main yard, outposts, event yards);
 *  - their mail both ways, pets, Map Room data, attack-violation report and admin test snapshot;
 *  - the account itself, which takes with it (ON DELETE CASCADE) their casino seeds, bets and games,
 *    quest book, Gauntlet and event claims, alliance invites and alliance chat.
 * Kept: other players' attack logs and replays (they carry the names), the admin log. The players they
 * invited keep what they were paid; their "invited by" is cleared. The jackpot's last winner is cleared
 * if it was them.
 *
 * @returns what was deleted, counted (for the admin log).
 */
export const deleteAccount = async (userid: number) =>
  postgres.em.fork().transactional(async (em) => {
    const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      (await em.getConnection().execute(sql, params, "all", em.getTransactionContext())) as T[];
    const user = (await q<{ userid: number; username: string; email: string; alliance_id: number | null }>(
      `SELECT userid, username, email, alliance_id FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]))[0];
    if (!user) return null;

    // their world: one player fewer
    await q(`UPDATE bym.world w SET player_count = GREATEST(0, w.player_count - 1)
               FROM bym.save s WHERE s.saveuserid = ? AND s.type = 'main' AND s.worldid = w.uuid RETURNING w.uuid`, [userid]);

    // an alliance they lead: to whoever has been in it longest (officers first); with nobody left, it goes
    let alliance = "";
    if (user.alliance_id != null) {
      const led = await q<{ id: number; name: string }>(`SELECT id, name FROM bym.alliance WHERE id = ? AND leader_userid = ?`, [user.alliance_id, userid]);
      if (led.length) {
        const next = (await q<{ userid: number; username: string }>(
          `SELECT userid, username FROM bym."user" WHERE alliance_id = ? AND userid <> ?
            ORDER BY (alliance_role = 'officer') DESC, userid LIMIT 1`, [user.alliance_id, userid]))[0];
        if (next) {
          await q(`UPDATE bym.alliance SET leader_userid = ?, leader_name = ? WHERE id = ? RETURNING id`, [next.userid, next.username, user.alliance_id]);
          await q(`UPDATE bym."user" SET alliance_role = 'leader' WHERE userid = ? RETURNING userid`, [next.userid]);
          alliance = `; alliance ${led[0].name} led by ${next.username} now`;
        } else {
          await q(`UPDATE bym."user" SET alliance_id = NULL, alliance_role = NULL WHERE userid = ? RETURNING userid`, [userid]);
          await q(`DELETE FROM bym.alliance WHERE id = ? RETURNING id`, [user.alliance_id]);
          alliance = `; alliance ${led[0].name} deleted (nobody left in it)`;
        }
      }
    }

    // their yards on the map and the yards themselves
    const cells = await q(`DELETE FROM bym.world_map_cell WHERE uid = ? RETURNING cellid`, [userid]);
    await q(`UPDATE bym."user" SET save_basesaveid = NULL, infernosave_basesaveid = NULL WHERE userid = ? RETURNING userid`, [userid]);
    const saves = await q(`DELETE FROM bym.save WHERE saveuserid = ? OR userid = ? RETURNING baseid`, [userid, userid]);

    // their mail, both ways
    const mail = await q(`DELETE FROM bym.message WHERE userid = ? OR targetid = ? RETURNING id`, [userid, userid]);
    await q(`DELETE FROM bym.thread WHERE userid = ? OR targetid = ? RETURNING threadid`, [userid, userid]);

    // the rest that is theirs
    await q(`DELETE FROM bym.pet WHERE user_id = ? RETURNING user_id`, [userid]);
    await q(`DELETE FROM bym.maproom WHERE userid = ? RETURNING userid`, [userid]);
    await q(`DELETE FROM bym.maproom_inferno WHERE userid = ? RETURNING userid`, [userid]);
    await q(`DELETE FROM bym.report WHERE userid = ? RETURNING userid`, [userid]);
    await q(`DELETE FROM bym.admin_test_snapshot WHERE userid = ? RETURNING userid`, [userid]);
    await q(`UPDATE bym."user" SET referred_by = NULL WHERE referred_by = ? RETURNING userid`, [userid]);
    await q(`UPDATE bym.casino_jackpot SET last_winner_user_id = NULL WHERE last_winner_user_id = ? RETURNING id`, [userid]);
    await q(`DELETE FROM bym."user" WHERE userid = ? RETURNING userid`, [userid]);

    return { username: user.username, email: user.email, details: `${saves.length} yard(s), ${cells.length} map cell(s), ${mail.length} message(s)${alliance}` };
  });
