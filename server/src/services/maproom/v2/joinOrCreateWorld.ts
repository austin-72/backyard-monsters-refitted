import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { User } from "../../../database/models/user.model.js";
import { Save } from "../../../database/models/save.model.js";
import { logger } from "../../../utils/logger.js";
import { World } from "../../../database/models/world.model.js";
import { MapRoom2, MapRoomCell, MapRoomVersion } from "../../../enums/MapRoom.js";
import { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";
import { postgres } from "../../../server.js";
import { invalidateWorldsCache } from "../knownWorlds.js";
import { findFreeCell } from "./findFreeCell.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { ioInviteReferred } from "../../alliance/ioReferralInvite.js";

/**
 * Inferno-only (QoL #193): where the player who invited this one has their main yard on the map (Map Room 2), or null.
 */
const inviterHome = async (inviterId: number, em: EntityManager<PostgreSqlDriver>) => {
  const rows = (await em
    .getConnection()
    .execute(
      `SELECT world_id, x, y FROM bym.world_map_cell WHERE uid = ? AND base_type = ? AND map_version = ? AND destroyed_at IS NULL LIMIT 1`,
      [inviterId, MapRoomCell.HOMECELL, MapRoomVersion.V2]
    )
    .catch(() => [])) as { world_id: string; x: number; y: number }[];
  return rows[0] ? { worldid: String(rows[0].world_id), x: Number(rows[0].x), y: Number(rows[0].y) } : null;
};

/**
 * Assigns a user to a world by either joining an existing one with available space
 * or creating a new world if all are full. Optionally relocates the user to a new
 * position within the world.
 *
 * If the user is not relocating and already in the assigned world, no action is taken.
 * If relocating, a new position is found, and the user's base is updated accordingly.
 *
 * @param {User} user - The user who is joining or relocating in the world.
 * @param {Save} save - The user's save data.
 * @param {EntityManager} em - The entity manager for database operations.
 * @param {boolean} relocate - Flag indicating whether the user is relocating.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export const joinOrCreateWorld = async (
  user: User,
  save: Save,
  em: EntityManager<PostgreSqlDriver> = postgres.em,
  relocate: Boolean = false
) => {
  let world: World | null = null;

  let availableWorlds = await em.find(World, {
    playerCount: { $lt: MapRoom2.MAX_PLAYERS },
    map_version: MapRoomVersion.V2,
  });

  const shuffledWorlds = availableWorlds.sort(() => Math.random() - 0.5);

  // (Inferno-only, QoL #193: a friend someone invited goes to the inviter's world when it has room, near their yard)
  let near: { x: number; y: number } | null = null;
  if (infernoOnlyConfig.enabled && !relocate && user.referred_by) {
    const home = await inviterHome(user.referred_by, em);
    const theirs = home ? shuffledWorlds.find((w) => w.uuid === home.worldid) : undefined;
    if (home && theirs) {
      shuffledWorlds.splice(shuffledWorlds.indexOf(theirs), 1);
      shuffledWorlds.unshift(theirs);
      near = { x: home.x, y: home.y };
    }
  }

  if (shuffledWorlds.length > 0) {
    world = shuffledWorlds[0];
    logger.info(`User assigned to existing world: ${world.name}${near ? " (their inviter's)" : ""}`);
  } else {
    world = em.create(World, {});
    world.name = "New World";
    world.map_version = MapRoomVersion.V2;

    logger.info("All worlds full, created new world.");
  }

  // If not relocating, check if the user is already in the world
  if (!relocate && save.worldid === world.uuid) return;
  // A relocation follows leaveWorld, which took the player off their old world's count: they count on
  // the new one (the count was only ever made smaller by relocating).
  world.playerCount += 1;

  save.usemap = 1;
  save.worldid = world.uuid;

  // Find an available cell for the user
  const { x, y, terrainHeight } = await findFreeCell(world, em, near);

  if (relocate)
    logger.info(
      `${user.username} relocated to new cell (${x}, ${y}) in world ${world.uuid}`
    );

  // Create a new home cell for the user
  const homeCell = new WorldMapCell(world, x, y, terrainHeight);
  homeCell.uid = user.userid;
  homeCell.base_type = MapRoomCell.HOMECELL;
  homeCell.baseid = save.baseid;

  // Update the user save data with the new home cell
  save.cell = homeCell;
  save.worldid = world.uuid;
  save.homebase = [homeCell.x.toString(), homeCell.y.toString()];

  em.persist([world, homeCell, save]);
  await em.flush();

  await invalidateWorldsCache();

  // (Inferno-only, QoL #193: and an invite into the inviter's alliance, when they lead it or are its officer)
  if (infernoOnlyConfig.enabled && !relocate && user.referred_by) {
    await ioInviteReferred(user).catch((err) => logger.warn(`No alliance invite for ${user.username}: ${err}`));
  }
};
