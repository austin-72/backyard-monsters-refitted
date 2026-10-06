import { Save } from "../../../database/models/save.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { BaseType } from "../../../enums/Base.js";
import { MapRoomCell } from "../../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { WILD_MONSTER_EXPIRATION } from "../../../controllers/base/load/modes/baseModeView.js";
import { isGauntletBaseId } from "../../events/gauntlet.js";
import { postgres } from "../../../server.js";
import { logger } from "../../../utils/logger.js";

/**
 * Inferno-only (3 October): every Map Room 2 tribe yard (the four tribes and Moloch's strongholds) goes back
 * to fresh 12 hours after its most recent attack, by itself.
 *
 * A stored tribe yard is one shared Save row (type tribe) plus its world_map_cell; its savetime is moved to
 * the start of every attack and again at every attack save, so it is the time of the last attack. Before,
 * a yard was only made fresh when somebody next opened it (expireWildSave): until then the world map went on
 * showing it damaged or destroyed. This sweep, every 5 minutes, deletes the rows of yards whose last attack
 * is more than 12 hours ago; the next view or attack builds the yard fresh from its template (tribeSaveV2),
 * and the world map (getarea, and the snapshot at its next turn) shows it untouched.
 *
 * Left alone: Moloch's Gauntlet yards (each player's own), and yards taken over (they are outposts, not
 * tribe saves). A yard under attack is never 12 hours old (its savetime moves with the attack).
 */
export const resetExpiredTribeYards = async (now = Math.floor(Date.now() / 1000)): Promise<number> => {
  const em = postgres.em.fork();
  const expired = await em.find(
    Save,
    { type: BaseType.TRIBE, wmid: { $ne: 0 }, savetime: { $lt: now - WILD_MONSTER_EXPIRATION }, worldid: { $ne: null } },
    { fields: ["basesaveid", "baseid"] }
  );
  const baseids = expired.map((s) => s.baseid).filter((b) => b && !isGauntletBaseId(b));
  if (!baseids.length) return 0;
  let done = 0;
  // (in batches: a world left alone for a while has many)
  for (let i = 0; i < baseids.length; i += 500) {
    const batch = baseids.slice(i, i + 500);
    // (the save first, as the admin's reset does: it holds the link to its cell)
    done += await em.nativeDelete(Save, {
      type: BaseType.TRIBE,
      baseid: { $in: batch },
      savetime: { $lt: now - WILD_MONSTER_EXPIRATION },
    });
    await em.nativeDelete(WorldMapCell, { base_type: MapRoomCell.WM, baseid: { $in: batch } });
  }
  return done;
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every 5 minutes (started with the server, Inferno-only servers only). */
export const startTribeReset = () => {
  if (timer || !infernoOnlyConfig.enabled) return;
  const run = () =>
    resetExpiredTribeYards()
      .then((n) => {
        if (n) logger.info(`Tribe yards: ${n} made fresh (12 hours after their last attack)`);
      })
      .catch((e) => logger.error(`Tribe yards: the 12-hour reset failed: ${e}`));
  timer = setInterval(run, 5 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 60 * 1000).unref?.();
};
