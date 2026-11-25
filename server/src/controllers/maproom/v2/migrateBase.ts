import type { KoaController } from "../../../utils/KoaController.js";
import { checkPrice } from "../../../services/anticheat/requestChecks.js";
import { User } from "../../../database/models/user.model.js";
import { postgres } from "../../../server.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import { BaseType } from "../../../enums/Base.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import {
  Operation,
  updateResources,
} from "../../../services/base/updateResources.js";
import { joinOrCreateWorld } from "../../../services/maproom/v2/joinOrCreateWorld.js";
import { leaveWorld } from "../../../services/maproom/v2/leaveWorld.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { MapRoomCell } from "../../../enums/MapRoom.js";
import { permissionErr, relocateOutpostErr, shinyLockedErr, notEnoughShinyErr, underworldRelocateErr } from "../../../errors/errors.js";
import { isUnder } from "../../../services/maproom/v2/underworld.js";
import { MigrateBaseSchema } from "../../../schemas/MigrateBaseSchema.js";
import { isShinyLocked } from "../../../services/user/shinyLock.js";
import { mainYardUnderAttack, withMoveLock } from "../../../services/maproom/v2/moveGuard.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { isTestMode } from "../../../services/admin/testMode.js";
import { isAttackActive } from "../../../services/base/isAttackActive.js";

/**
 * Cooldown period for base migration.
 * @constant {number}
 */
const COOLDOWN_PERIOD = 24 * 60 * 60;

/** Inferno-only: moving the main yard onto an outpost with resources: this much of each (PopupRelocateMe). */
const MOVE_RESOURCES = 30_000_000;

/**
 * Handles user base migration.
 *
 * This controller allows a user to migrate their base to a new location.
 * It checks if the user is within the cooldown period, validates the base being migrated to
 * and relocates their home base. If the migration is successful, the user's cooldown is updated
 * and the new home base is saved.
 *
 * @param {Object} ctx - The Koa context object
 * @returns {Promise<void>} A promise that resolves once the base migration is complete.
 *
 * @throws Will throw an error if the base type is invalid, no homebase is found or if it catches an exception.
 */
export const migrateBase: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  // (13 October) one move at a time, and none while the main yard is attacked (services/maproom/v2/moveGuard.ts)
  const refuse = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });
  await withMoveLock(user.userid, refuse, async () => {
    await postgres.em.populate(user, ["save"]);
    if (user.save && mainYardUnderAttack(user.save)) throw refuse("Your yard is being attacked. Move when the attack is over.");
    await migrateBaseLocked(ctx);
  });
};

const migrateBaseLocked: KoaController = async (ctx) => {
  const { baseid, resources, shiny, type } = MigrateBaseSchema.parse(ctx.request.body);

  const currentUser: User = ctx.authUser;
  const shinyLocked = isShinyLocked(currentUser);

  if (shiny && shinyLocked) throw shinyLockedErr();
  // (Inferno-only: a negative price would add resources: services/anticheat)
  if (!(await checkPrice(currentUser, "migrate", resources, shiny))) throw permissionErr();

  await postgres.em.populate(currentUser, ["save"]);

  const userSave = currentUser.save!;
  const currentTime = getCurrentDateTime();

  // Check if the user is within the cooldown period.
  if (userSave.cantmovetill && userSave.cantmovetill > currentTime) {
    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      cantMoveTill: userSave.cantmovetill,
      currenttime: currentTime,
    };
    return;
  }

  // User is relocating due to their empire being overrun.
  if (type === BaseType.RANDOM) {
    if (userSave.outposts.length > 0) throw relocateOutpostErr();
    // (18 October, SUSPECTED-BUGS.md: free and unchecked, as often as liked) only when the game offers it: no
    // outposts, no alliance, the main yard 90% or more destroyed (BASE: PopupLostMainBase); not in admin test mode;
    // and then the usual wait before the next move
    if (infernoOnlyConfig.enabled) {
      const refuse = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });
      if (await isTestMode(currentUser)) throw refuse("Switch admin test mode off before relocating.");
      if (currentUser.alliance_id) throw refuse("A free move is only for a yard that's been overrun with no alliance to help.");
      if ((Number(userSave.damage) || 0) < 90) throw refuse("A free move is only for a yard that's been overrun (90% or more destroyed).");
      userSave.cantmovetill = currentTime + COOLDOWN_PERIOD;
    }

    // Inferno-only: bookmarks are places on a map, so they only go when the new home is on another
    // map. leaveWorld clears them; put them back if the relocation landed in the same world.
    const oldWorld = userSave.worldid;
    const oldBookmarks = currentUser.bookmarks;

    await leaveWorld(currentUser, userSave);
    await joinOrCreateWorld(currentUser, userSave, postgres.em, true);

    if (infernoOnlyConfig.enabled && oldWorld && userSave.worldid === oldWorld && oldBookmarks) {
      currentUser.bookmarks = oldBookmarks;
      await postgres.em.persist(currentUser).flush();
    }

    ctx.status = Status.OK;
    ctx.body = { error: 0 };
    return;
  }

  // Otherwise, fetch the outpost cell (destination) and the user's homeCell (origin) for migration.
  const cells = await postgres.em.find(
    WorldMapCell,
    {
      baseid: { $in: [baseid, userSave.baseid] }
    },
    { populate: ["save"] }
  );

  const outpostCell = cells.find((cell) => cell.baseid === baseid);

  const homeCell = cells.find(
    (cell) =>
      cell.baseid === userSave.baseid &&
      cell.base_type === MapRoomCell.HOMECELL
  );

  if (!outpostCell || !outpostCell.save) {
    throw new Error(`Invalid base or base type. Base ID: ${baseid}`);
  }

  // The destination has to be one of the mover's own outposts. Without this check any player could
  // move their main yard onto someone else's outpost by its base id, deleting that outpost.
  if (outpostCell.uid !== currentUser.userid || outpostCell.base_type !== MapRoomCell.OUTPOST) {
    throw permissionErr();
  }

  // Inferno-only: not into the underworld.
  if (infernoOnlyConfig.enabled && isUnder(outpostCell.x, outpostCell.y)) throw underworldRelocateErr();
  // (18 October, SUSPECTED-BUGS.md) not onto an outpost being attacked: the attack's saves would write into the yard
  if (infernoOnlyConfig.enabled && isAttackActive(outpostCell.save))
    throw new ClientSafeError({ message: "That outpost is being attacked right now. Move once the attack is over.", status: Status.CONFLICT, data: {}, isClientFriendly: true });

  if (!homeCell) throw new Error("Invalid home cell");

  // Store outpost details before removing it
  const [outpostX, outpostY] = [outpostCell.x, outpostCell.y];
  const outpostHeight = outpostCell.terrainHeight;
  const outpostBaseId = outpostCell.save.baseid;

  // Update the user's homecell coordinates to the outpost cell
  homeCell.x = outpostX;
  homeCell.y = outpostY;
  homeCell.terrainHeight = outpostHeight;

  // Update user's homebase coordinates to the outpost cell
  userSave.homebase = [outpostX.toString(), outpostY.toString()];

  // Set the migration cooldown period before the user can move again
  userSave.cantmovetill = currentTime + COOLDOWN_PERIOD;

  // Remove the outpost from the user's save, 3rd element in the array is the baseid
  userSave.outposts = userSave.outposts.filter(
    (outpost) => outpost[2] !== baseid
  )

  // Remove baseid from building resources object
  if (userSave.buildingresources) {
    delete userSave.buildingresources[`b${outpostBaseId}`];
  }

  // (18 October, SUSPECTED-BUGS.md: the price was taken as sent, so no price or 1 of each moved the yard.)
  // Inferno-only: the server's own price, as the game shows it (PopupRelocateMe): prices.moveOutpost Shiny, or
  // MOVE_RESOURCES of each resource, which the player must have.
  if (infernoOnlyConfig.enabled) {
    if (Number(shiny) > 0) {
      const price = Math.max(1, Number(infernoOnlyConfig.prices?.moveOutpost ?? 1500));
      if ((userSave.credits ?? 0) < price) throw notEnoughShinyErr();
      userSave.credits -= price;
    } else {
      const have = (userSave.resources ?? {}) as Record<string, unknown>;
      if (["r1", "r2", "r3", "r4"].some((k) => (Number(have[k]) || 0) < MOVE_RESOURCES))
        throw new ClientSafeError({ message: "You don't have the resources to move here.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
      userSave.resources = updateResources({ r1: MOVE_RESOURCES, r2: MOVE_RESOURCES, r3: MOVE_RESOURCES, r4: MOVE_RESOURCES }, userSave.resources ?? {}, Operation.SUBTRACT);
    }
  } else {
    // Shiny can't go below 0 (the database refuses it, which failed the whole request with a 500).
    if (shiny) {
      if (!(shiny > 0) || (userSave.credits ?? 0) < shiny) throw notEnoughShinyErr();
      userSave.credits -= shiny;
    }
    if (resources)
      userSave.resources = updateResources(resources, userSave.resources ?? {}, Operation.SUBTRACT);
  }

  await postgres.em.transactional(async (em) => {
    em.persist([homeCell, userSave]);
    em.remove([outpostCell.save, outpostCell]);
    await em.flush();
  });

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    coords: [outpostX, outpostY],
  };
};
