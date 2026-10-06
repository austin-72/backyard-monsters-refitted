import { raw } from "@mikro-orm/core";

import { isUnder } from "./underworld.js";
import { User } from "../../../database/models/user.model.js";
import { World } from "../../../database/models/world.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { Message } from "../../../database/models/message.model.js";
import { Thread } from "../../../database/models/thread.model.js";
import { MapRoom2, MapRoomCell, MapRoomVersion } from "../../../enums/MapRoom.js";
import { MessageType } from "../../../enums/MessageType.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { countUnreadMessage } from "../../mail/countUnreadMessage.js";
import { invalidateWorldsCache } from "../knownWorlds.js";
import { leaveWorld } from "./leaveWorld.js";
import { postgres } from "../../../server.js";
import { logger } from "../../../utils/logger.js";

/**
 * Inferno-only: inviting an alliance member to move their main yard onto one of your outposts.
 *
 *   1. The outpost's owner picks an alliance member in the map's invite popup; the client sends an
 *      ordinary mail message of type "migraterequest" with the outpost's base id. prepareInvite()
 *      checks it and fills in what the recipient's mailbox needs (state, coordinates, world).
 *   2. The recipient accepts (base/migratetofriend) or declines (base/rejectmigratetofriend) from
 *      the mailbox. Accepting moves their main yard onto the outpost, which is removed from the
 *      inviter's empire. From another world, their old outposts are given up (the client warns).
 *   3. The inviter can revoke a pending invite (mail message type "migraterevoke").
 *
 * Both players must be in the same alliance when the invite is sent and when it is accepted.
 */

export const REQUESTED = "requested";

/** Resource price of accepting an invite: this much of each resource (the relocate popup shows the same). */
export const INVITE_RESOURCE_COST = 30_000_000;
const COOLDOWN = 24 * 60 * 60;

export class InviteError extends Error {}

const sameAlliance = (a: User, b: User) => !!a.alliance_id && a.alliance_id === b.alliance_id;

const pendingFor = (baseid: string) =>
  postgres.em.findOne(Message, {
    baseid,
    messagetype: MessageType.MIGRATE_REQUEST,
    migratestate: REQUESTED,
  });

/** The thread id of a pending invite for one of the player's outposts, or 0 (map cell field `pi`). */
export const pendingInviteThread = async (baseid: string, ownerId: number) => {
  const pending = await postgres.em.findOne(
    Message,
    { baseid, userid: ownerId, messagetype: MessageType.MIGRATE_REQUEST, migratestate: REQUESTED },
    { fields: ["threadid"] }
  );
  return pending?.threadid ?? 0;
};

/** pendingInviteThread for several outposts at once: baseid -> thread id (outposts without one are left out). */
export const pendingInviteThreads = async (baseids: string[], ownerId: number) => {
  const threads = new Map<string, number>();
  if (!baseids.length) return threads;
  const pending = await postgres.em.find(
    Message,
    { baseid: { $in: baseids }, userid: ownerId, messagetype: MessageType.MIGRATE_REQUEST, migratestate: REQUESTED },
    { fields: ["threadid", "baseid"] }
  );
  for (const message of pending) if (message.baseid && !threads.has(message.baseid)) threads.set(message.baseid, message.threadid ?? 0);
  return threads;
};

/** Alliance members that can be invited, in the shape the client's friend picker reads. */
export const inviteTargets = async (user: User) => {
  if (!user.alliance_id) return {};

  const members = await postgres.em.find(
    User,
    { alliance_id: user.alliance_id, userid: { $ne: user.userid } },
    { fields: ["userid", "username", "last_name", "pic_square"] }
  );

  return Object.fromEntries(
    members.map((member) => [
      member.userid,
      {
        friend: 1,
        mapver: MapRoomVersion.V2,
        first_name: member.username,
        last_name: member.last_name ?? "",
        pic_square: member.pic_square ?? "",
      },
    ])
  );
};

/** Checks an invite before it is sent and returns the fields the recipient's mailbox shows. */
export const prepareInvite = async (sender: User, recipient: User, baseid?: string) => {
  if (!baseid) throw new InviteError("No outpost was given.");
  if (recipient.userid === sender.userid) throw new InviteError("You cannot invite yourself.");
  if (!sameAlliance(sender, recipient)) {
    throw new InviteError("You can only invite members of your alliance.");
  }

  const cell = await postgres.em.findOne(WorldMapCell, { baseid }, { populate: ["world"] });
  if (!cell || cell.uid !== sender.userid || cell.base_type !== MapRoomCell.OUTPOST) {
    throw new InviteError("You can only invite players to your own outposts.");
  }
  if (isUnder(cell.x, cell.y)) throw new InviteError("Nobody can be invited to move to an outpost in the Depths of Hell.");

  if (await pendingFor(baseid)) {
    throw new InviteError("There is already an invitation pending for this outpost.");
  }

  return { migratestate: REQUESTED, baseid, coords: [cell.x, cell.y], worldid: cell.world.uuid };
};

/** The inviter takes back a pending invite on this thread. */
export const revokeInvite = async (sender: User, threadid: number) => {
  const pending = await postgres.em.findOne(Message, {
    threadid,
    userid: sender.userid,
    messagetype: MessageType.MIGRATE_REQUEST,
    migratestate: REQUESTED,
  });
  if (!pending) throw new InviteError("There is no pending invitation to revoke.");
  pending.migratestate = "revoked";
};

/** Adds a note from one player to the other on the invite's thread and updates their unread count. */
const addThreadNote = async (thread: Thread, from: number, to: number, subject: string, text: string) => {
  const note = postgres.em.create(Message, {
    threadid: thread.threadid,
    userid: from,
    targetid: to,
    messagetype: MessageType.MESSAGE,
    userUnread: 0,
    targetUnread: 1,
    subject,
    message: text,
    updatetime: getCurrentDateTime(),
  });
  thread.messagecount++;
  thread.lastMessage = note;
  await postgres.em.flush();

  const recipient = await postgres.em.findOne(User, { userid: to }, { populate: ["save"] });
  if (recipient?.save) {
    recipient.save.unreadmessages = await countUnreadMessage(to);
    await postgres.em.flush();
  }
};

const findInvite = async (user: User, baseid: string, threadid: number) => {
  const invite = await postgres.em.findOne(Message, {
    threadid,
    baseid,
    targetid: user.userid,
    messagetype: MessageType.MIGRATE_REQUEST,
    migratestate: REQUESTED,
  });
  if (!invite) throw new InviteError("This invitation is no longer available.");

  const thread = await postgres.em.findOne(Thread, { threadid });
  if (!thread) throw new InviteError("This invitation is no longer available.");

  return { invite, thread };
};

/**
 * Before the invitee sees the price popup: is the invite still good, and would accepting it move them
 * to another world? Only a move to another world gives up their outposts (the client warns first);
 * within the same world their outposts stay theirs.
 */
export const checkInvite = async (user: User, baseid: string, threadid: number) => {
  const { invite } = await findInvite(user, baseid, threadid);

  const inviter = await postgres.em.findOne(User, { userid: invite.userid });
  if (!inviter || !sameAlliance(user, inviter)) {
    throw new InviteError("You and the player who invited you are no longer in the same alliance.");
  }

  const outpost = await postgres.em.findOne(WorldMapCell, { baseid }, { populate: ["world"] });
  if (!outpost || outpost.uid !== inviter.userid || outpost.base_type !== MapRoomCell.OUTPOST) {
    throw new InviteError("That outpost no longer belongs to the player who invited you.");
  }

  await postgres.em.populate(user, ["save"]);
  const crossWorld = user.save?.worldid !== outpost.world.uuid;
  const outposts = crossWorld ? (user.save?.outposts?.length ?? 0) : 0;

  return { crossWorld: crossWorld ? 1 : 0, outposts };
};

export const declineInvite = async (user: User, baseid: string, threadid: number) => {
  const { invite, thread } = await findInvite(user, baseid, threadid);
  invite.migratestate = "rejected";
  await addThreadNote(thread, user.userid, invite.userid, invite.subject, `${user.username} declined your invitation.`);
};

/**
 * The recipient accepts: their main yard moves onto the inviter's outpost. Returns the new coordinates,
 * or { cantMoveTill, currenttime } when they moved too recently (the client explains the wait).
 */
export const acceptInvite = async (
  user: User,
  baseid: string,
  threadid: number,
  payWithShiny: boolean
) => {
  const { invite, thread } = await findInvite(user, baseid, threadid);

  await postgres.em.populate(user, ["save"]);
  const save = user.save!;
  const now = getCurrentDateTime();

  if (save.cantmovetill && save.cantmovetill > now) {
    return { cantMoveTill: save.cantmovetill, currenttime: now };
  }

  const inviter = await postgres.em.findOne(User, { userid: invite.userid }, { populate: ["save"] });
  if (!inviter?.save) throw new InviteError("The player who invited you no longer exists.");
  if (!sameAlliance(user, inviter)) {
    throw new InviteError("You and the player who invited you are no longer in the same alliance.");
  }

  const outpost = await postgres.em.findOne(WorldMapCell, { baseid }, { populate: ["world", "save"] });
  if (!outpost || !outpost.save || outpost.uid !== inviter.userid || outpost.base_type !== MapRoomCell.OUTPOST) {
    invite.migratestate = "revoked";
    await postgres.em.flush();
    throw new InviteError("That outpost no longer belongs to the player who invited you.");
  }
  if (isUnder(outpost.x, outpost.y)) throw new InviteError("Nobody can move to an outpost in the Depths of Hell.");

  // Price: the same as moving your main yard onto one of your own outposts.
  if (payWithShiny) {
    const price = infernoOnlyConfig.prices.moveMainYard;
    if ((save.credits ?? 0) < price) throw new InviteError("You don't have enough shiny.");
    save.credits -= price;
  } else {
    const resources = { ...(save.resources ?? {}) } as Record<string, number>;
    for (const key of ["r1", "r2", "r3", "r4"]) {
      if (Number(resources[key] ?? 0) < INVITE_RESOURCE_COST) throw new InviteError("You don't have enough resources to move.");
    }
    for (const key of ["r1", "r2", "r3", "r4"]) resources[key] = Number(resources[key] ?? 0) - INVITE_RESOURCE_COST;
    save.resources = resources;
  }

  const world = outpost.world;
  const { x, y, terrainHeight } = outpost;
  const crossWorld = save.worldid !== world.uuid;

  if (crossWorld && world.playerCount >= MapRoom2.MAX_PLAYERS) {
    throw new InviteError("That world is full.");
  }

  // Moving between worlds gives up the old empire: home cell and every outpost there.
  if (crossWorld) await leaveWorld(user, save);

  await postgres.em.transactional(async (em) => {
    let home = crossWorld
      ? null
      : await em.findOne(WorldMapCell, { uid: user.userid, base_type: MapRoomCell.HOMECELL, world: world.uuid });

    if (!home) {
      home = new WorldMapCell(world, x, y, terrainHeight);
      home.uid = user.userid;
      home.base_type = MapRoomCell.HOMECELL;
      home.baseid = save.baseid;
      save.cell = home;
    }

    home.x = x;
    home.y = y;
    home.terrainHeight = terrainHeight;

    save.worldid = world.uuid;
    save.usemap = 1;
    save.homebase = [x.toString(), y.toString()];
    save.cantmovetill = now + COOLDOWN;

    // The outpost leaves the inviter's empire.
    const inviterSave = inviter.save!;
    inviterSave.outposts = inviterSave.outposts.filter((entry) => entry[2] !== baseid);
    if (inviterSave.buildingresources) delete inviterSave.buildingresources[`b${outpost.save!.baseid}`];

    if (crossWorld) {
      await em.nativeUpdate(World, { uuid: world.uuid }, { playerCount: raw("player_count + 1") });
    }

    invite.migratestate = "accepted";

    em.persist([home, save, inviterSave, invite]);
    em.remove([outpost.save!, outpost]);
    await em.flush();
  });

  if (crossWorld) await invalidateWorldsCache();

  await addThreadNote(thread, user.userid, inviter.userid, invite.subject, `${user.username} accepted your invitation and moved in.`);
  logger.info(`'${user.username}' moved onto '${inviter.username}''s outpost ${baseid}${crossWorld ? " (from another world)" : ""}`);

  return { coords: [x, y] };
};

