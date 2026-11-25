import { Save } from "../../../database/models/save.model.js";
import { User } from "../../../database/models/user.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres, redis } from "../../../server.js";
import { isAttackActive } from "../../base/isAttackActive.js";
import { isTestMode } from "../../admin/testMode.js";
import { addToPlayerLog, logPlayerAction } from "../../user/playerLog.js";
import { logger } from "../../../utils/logger.js";
import { forgetOutpostName } from "./outpostNames.js";

/**
 * Inferno-only (QoL #343, 15 October): Abandon one outpost. Until now the only way to let outposts go was Relocate,
 * which lets every one of them go (leaveWorld.ts). This lets one go the same way the admin's test mode makes a
 * place wild (services/admin/testMode.ts wildCell) and a takeover takes one from its owner (takeoverCell.ts):
 *  - its yard (save) and its map cell are deleted, so the place is wild again (a fresh tribe yard grows there),
 *  - it leaves the main save's outposts list, and its line in the main yard's auto-bank record (`b<baseid>`),
 *  - its name goes (outpostNames.ts).
 * Logged first like a relocation (bym.player_log "abandon", with the yard's row kept in bym.player_log_save), so
 * an admin can see what it was. Refused while the outpost is being attacked, in admin test mode (its snapshot
 * holds the place), and twice at once. The game stops saving before it asks and reloads after (IoOutpostsPopup).
 */

export class AbandonError extends Error {}

/** The outpost's save row, kept with log row `id` before it is deleted. */
const keepOutpostSave = async (id: number, userid: number, baseid: string) => {
  if (!id) return;
  try {
    await postgres.em
      .getConnection()
      .execute(
        `INSERT INTO bym.player_log_save (log_id, baseid, row) SELECT ?, s.baseid, to_jsonb(s) FROM bym.save s WHERE s.baseid = ? AND s.saveuserid = ? AND s.type = 'outpost'`,
        [id, baseid, userid]
      );
  } catch (err) {
    logger.error(`Player log ${id}: could not keep outpost ${baseid} of ${userid}: ${err}`);
  }
};

export const abandonOutpost = async (user: User, baseid: string) => {
  if (!/^\d{1,20}$/.test(baseid)) throw new AbandonError("That outpost is not yours.");

  // One at a time (a double click).
  const lock = `abandon:${user.userid}`;
  if ((await redis.set(lock, "1", "EX", "30", "NX")) !== "OK") throw new AbandonError("Already abandoning an outpost. Please wait a moment.");

  try {
    await postgres.em.populate(user, ["save"]);
    const save = user.save;
    if (!save?.worldid) throw new AbandonError("Your yard is not on the map.");

    const entry = (save.outposts ?? []).find((o) => Array.isArray(o) && String(o[2]) === baseid);
    if (!entry) throw new AbandonError("That outpost is not yours.");
    if (await isTestMode(user)) throw new AbandonError("Switch admin test mode off before abandoning an outpost.");

    const outpost = await postgres.em.findOne(Save, { baseid, type: BaseType.OUTPOST, saveuserid: user.userid });
    if (!outpost) throw new AbandonError("That outpost is not yours.");
    if (isAttackActive(outpost)) throw new AbandonError("That outpost is being attacked. Abandon it when the attack is over.");

    const worldid = save.worldid;
    const logId = await logPlayerAction(user.userid, user.username, "abandon", {
      world: worldid,
      outpost: entry as unknown,
      value: Number(outpost.empirevalue ?? 0),
    });
    await keepOutpostSave(logId, user.userid, baseid);

    await postgres.em.transactional(async (em) => {
      // the yard first (it holds the cell's key), then its cell
      await em.nativeDelete(Save, { baseid, type: BaseType.OUTPOST, saveuserid: user.userid });
      await em.nativeDelete(WorldMapCell, { baseid, uid: user.userid, world: worldid });

      save.outposts = (save.outposts ?? []).filter((o) => !(Array.isArray(o) && String(o[2]) === baseid));
      if (save.buildingresources && typeof save.buildingresources === "object") {
        const banked = { ...(save.buildingresources as Record<string, unknown>) };
        delete banked[`b${baseid}`];
        save.buildingresources = banked as Save["buildingresources"];
      }
      em.persist(save);
      await em.flush();
    });

    await forgetOutpostName(user.userid, baseid);
    await addToPlayerLog(logId, { left: save.outposts.length });
    logger.info(`Abandon: '${user.username}' let outpost ${baseid} at ${entry[0]},${entry[1]} go (${save.outposts.length} left)`);
    return { x: Number(entry[0]), y: Number(entry[1]), outposts: save.outposts.length };
  } finally {
    await redis.del(lock);
  }
};
