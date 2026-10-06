import type { KoaController } from "../../../utils/KoaController.js";
import { User } from "../../../database/models/user.model.js";
import { postgres, redis } from "../../../server.js";
import { Status } from "../../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { joinOrCreateWorld } from "../../../services/maproom/v2/joinOrCreateWorld.js";
import { leaveWorld } from "../../../services/maproom/v2/leaveWorld.js";
import { isTestMode } from "../../../services/admin/testMode.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { permissionErr } from "../../../errors/errors.js";
import { logger } from "../../../utils/logger.js";

/** An attack on the main yard this recent is still running (its saves are taken for 30 minutes). */
const ATTACK_WINDOW = 30 * 60;

const refuse = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

/**
 * POST /base/relocate: Inferno-only "Relocate" in the map room. The player starts again somewhere else
 * on the map, the way a new player is placed (joinOrCreateWorld: the spawn rules, near other players),
 * and pays for it with everything out there:
 *  - bone, coal, sulfur and magma in the main yard go to 0 (storage stays as it is),
 *  - every outpost is let go: its yard and map cell are removed, so the place is wild again (a fresh
 *    tribe yard grows there, as for any empty cell).
 * No cooldown: that price is the limit. Refused while the main yard is being attacked (no running away
 * mid-attack), in admin test mode (its snapshot holds the old place), and twice at once.
 */
export const relocateAnywhere: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const save = user.save;
  if (!save) throw refuse("No main yard to relocate.");

  // One at a time: a double click must not place the yard twice. Taken before the checks below, so a
  // second request sent with the first is always told this (it used to read the yard half moved by the
  // first and was refused with "not on the map yet").
  const lock = `relocate:${user.userid}`;
  if ((await redis.set(lock, "1", "EX", "60", "NX")) !== "OK") throw refuse("Already relocating. Please wait a moment.");

  try {
    if (!save.worldid) throw refuse("Your yard is not on the map yet.");
    if (await isTestMode(user)) throw refuse("Switch admin test mode off before relocating.");

    const last = save.attacks?.at(-1);
    if (save.attackid && last && getCurrentDateTime() - (last.starttime ?? 0) < ATTACK_WINDOW)
      throw refuse("Your yard is being attacked. Relocate when the attack is over.");

    const from = save.homebase ? save.homebase.join(",") : "?";
    const outposts = save.outposts?.length ?? 0;
    const oldWorld = save.worldid;
    const oldBookmarks = user.bookmarks;

    // Resources to 0 (the storage limits stay); written with the rest by leaveWorld.
    const resources = { ...((save.resources ?? {}) as Record<string, number>) };
    for (const key of ["r1", "r2", "r3", "r4"]) resources[key] = 0;
    save.resources = resources as never;

    // Outposts and home cell go (leaveWorld), then a new home the way a new player gets one.
    await leaveWorld(user, save);
    await joinOrCreateWorld(user, save, postgres.em, true);

    // Bookmarks are places on a map: kept when the new home is on the same world (as the stock relocation).
    if (oldWorld && save.worldid === oldWorld && oldBookmarks) {
      user.bookmarks = oldBookmarks;
      await postgres.em.persist(user).flush();
    }

    const coords = (save.homebase ?? []).map(Number);
    logger.info(`Relocate: '${user.username}' moved from ${from} to ${coords.join(",")}, ${outposts} outpost(s) let go, resources to 0`);
    ctx.status = Status.OK;
    ctx.body = { error: 0, coords, outposts };
  } finally {
    await redis.del(lock);
  }
};
