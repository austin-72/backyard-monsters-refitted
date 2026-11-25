import { LockMode, UniqueConstraintViolationException, type FilterQuery } from "@mikro-orm/core";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { Status } from "../../enums/StatusCodes.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";

import type { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";

import { AllianceInviteStatus, AllianceInviteType, AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { MAX_ALLIANCE_MEMBERS } from "../../config/AllianceConfig.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { AllianceInvite } from "../../database/models/allianceinvite.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { addAllianceMember } from "./membership.js";
import { worldNames } from "../leaderboards/gameLeaderboards.js";
import {
  allianceFullErr,
  inviteNotPendingErr,
  invitePendingErr,
  mustLeaveAllianceToAcceptErr,
  permissionErr,
  requestPendingErr,
  userAlreadyInAllianceErr,
} from "../../errors/errors.js";

interface InviteMessage {
  invite_id: number;
  type: AllianceInviteType;
  status: AllianceInviteStatus;
  alliance_name: string;
  alliance_image: number;
  /** Inferno-only (14 October): its designed crest, or null for the preset shield. */
  alliance_crest: string | null;
  leader_name: string;
  invited_by_name: string;
  user_id: number;
  user_name: string;
  user_pic_square: string | null;
  base_id: string | null;
  update_at_formatted: string;
  /**
   * Inferno-only (QoL #169), on a pending join request: the player's few words, and what a leader wants to know
   * before answering: level, world, outposts, when last seen (Unix seconds).
   */
  message?: string | null;
  user_level?: number;
  user_world?: string;
  user_outposts?: number;
  user_last_seen?: number;
}

/**
 * Inferno-only (QoL #164): an unanswered invite lapses INVITE_DAYS days after it was sent (its created_at): the
 * invited player no longer sees it nor can take it, and it leaves the alliance's sent invites.
 */
export const INVITE_DAYS = 14;

export const inviteCutoff = (): Date => new Date(Date.now() - INVITE_DAYS * 24 * 60 * 60 * 1000);

const inviteExpiredErr = () =>
  new ClientSafeError({ message: "This invite has expired.", status: Status.CONFLICT, data: {}, isClientFriendly: true });

/**
 * Rows the given player should see in their Invites tab.
 *
 * The inbox is one table read from two sides. A pending row belongs to whoever
 * has to answer it, and resolving it hands the row to whoever opened it, so the
 * status change doubles as the "accepted"/"declined" notice. A leader therefore
 * sees incoming requests plus the outcomes of invites they sent; an ordinary
 * player sees incoming invites plus the outcomes of requests they made.
 *
 * @param {User} user - The player whose inbox is being read.
 * @returns {FilterQuery<AllianceInvite>} The visibility clause for that player.
 */
const inboxScope = (user: User): FilterQuery<AllianceInvite> => {
  const asPlayer = {
    user_id: user.userid,
    $or: [
      // (Inferno-only, QoL #164: not once it has lapsed)
      infernoOnlyConfig.enabled
        ? { type: AllianceInviteType.INVITE, status: AllianceInviteStatus.PENDING, created_at: { $gt: inviteCutoff() } }
        : { type: AllianceInviteType.INVITE, status: AllianceInviteStatus.PENDING },
      { type: AllianceInviteType.REQUEST, status: { $ne: AllianceInviteStatus.PENDING } },
    ],
  };

  // (Inferno-only: officers answer join requests too)
  const leads = (user.alliance_role === AllianceRole.LEADER || (infernoOnlyConfig.enabled && user.alliance_role === AllianceRole.OFFICER)) && user.alliance_id;

  if (!leads) return asPlayer;

  const asLeader = {
    alliance_id: user.alliance_id,
    $or: [
      { type: AllianceInviteType.REQUEST, status: AllianceInviteStatus.PENDING },
      { type: AllianceInviteType.INVITE, status: { $ne: AllianceInviteStatus.PENDING } },
    ],
  };

  return { $or: [asPlayer, asLeader] };
};

/**
 * Formats a timestamp the way the Invites table expects it.
 *
 * @param {Date} date - The timestamp to format.
 * @returns {string} MM/DD/YYYY.
 */
const formatInviteDate = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${month}/${day}/${date.getFullYear()}`;
};

/**
 * Builds the Invites tab payload for a player, resolving the alliance and player
 * named on each row. Both sides are batched rather than fetched per row.
 *
 * @param {User} user - The player whose inbox is being read.
 * @returns {Promise<InviteMessage[]>} Newest first, as the original listed them.
 */
export const getInviteMessages = async (user: User): Promise<InviteMessage[]> => {
  const invites = await postgres.em.find(AllianceInvite, inboxScope(user), { orderBy: { updated_at: "DESC" }});

  if (invites.length === 0) return [];

  const allianceIds = invites.map((invite) => invite.alliance_id);
  const userIds = invites.map((invite) => invite.user_id);

  const [alliances, players] = await Promise.all([
    postgres.em.find(Alliance, { id: { $in: allianceIds } }),
    postgres.em.find(
      User,
      { userid: { $in: userIds } },
      { fields: ["userid", "username", "pic_square", "save.baseid", "save.level", "save.worldid", "save.savetime"] }
    ),
  ]);

  // (Inferno-only, QoL #169: for pending join requests, the asker's outposts and world's name)
  const asking = infernoOnlyConfig.enabled
    ? [...new Set(invites.filter((i) => i.type === AllianceInviteType.REQUEST && i.status === AllianceInviteStatus.PENDING).map((i) => i.user_id))]
    : [];
  const outpostCounts = new Map<number, number>();
  let worldNamesById = new Map<string, string>();
  if (asking.length) {
    const rows: { saveuserid: number; n: string }[] = await postgres.em
      .getConnection()
      .execute(`SELECT saveuserid, count(*) AS n FROM bym.save WHERE type = 'outpost' AND saveuserid IN (${asking.map(() => "?").join(", ")}) GROUP BY saveuserid`, asking);
    for (const r of rows) outpostCounts.set(Number(r.saveuserid), Number(r.n));
    const worldIds = [...new Set(players.filter((p) => asking.includes(p.userid)).map((p) => p.save?.worldid).filter((w): w is string => !!w))];
    worldNamesById = await worldNames(worldIds);
  }

  // (Inferno-only, QoL #165: the one who sent each invite, when it wasn't the leader)
  const senderIds = [...new Set(invites.map((i) => Number(i.invited_by ?? 0)).filter((id) => id > 0))];
  const senderNames = new Map<number, string>();
  if (senderIds.length) {
    const senders = await postgres.em.find(User, { userid: { $in: senderIds } }, { fields: ["userid", "username"] });
    for (const s of senders) senderNames.set(s.userid, s.username);
  }

  const alliancesById = new Map(alliances.map((alliance) => [alliance.id, alliance]));
  const playersById = new Map(players.map((player) => [player.userid, player]));

  const messages: InviteMessage[] = [];

  for (const invite of invites) {
    const alliance = alliancesById.get(invite.alliance_id);
    const player = playersById.get(invite.user_id);

    if (!alliance || !player) continue;

    const message: InviteMessage = {
      invite_id: invite.id,
      type: invite.type,
      status: invite.status,
      alliance_name: alliance.name,
      alliance_image: alliance.image,
      alliance_crest: alliance.crest ?? null,
      leader_name: alliance.leader_name,
      invited_by_name: senderNames.get(Number(invite.invited_by ?? 0)) ?? alliance.leader_name,
      user_id: player.userid,
      user_name: player.username,
      user_pic_square: player.pic_square ?? null,
      base_id: player.save?.baseid ?? null,
      update_at_formatted: formatInviteDate(invite.updated_at),
    };
    if (asking.includes(invite.user_id) && invite.type === AllianceInviteType.REQUEST && invite.status === AllianceInviteStatus.PENDING) {
      message.message = invite.message ?? null;
      message.user_level = Number(player.save?.level ?? 0);
      message.user_world = player.save?.worldid ? worldNamesById.get(player.save.worldid) ?? "" : "";
      message.user_outposts = outpostCounts.get(invite.user_id) ?? 0;
      message.user_last_seen = Number(player.save?.savetime ?? 0);
    }

    messages.push(message);
  }

  return messages;
};

/**
 * Clears rows from a player's inbox, scoped through the same visibility clause
 * the listing uses, so ids from another inbox match nothing.
 *
 * An unanswered row is declined rather than destroyed: deleting one is a
 * refusal, and the other side is owed the outcome notice. It still leaves the
 * deleter's view, since a resolved row belongs to the counterparty's. Each
 * statement carries its own status predicate, so a row answered mid-request
 * keeps its outcome.
 *
 * @param {User} user - The player clearing their inbox.
 * @param {number[]} inviteIds - The rows they selected.
 * @returns {Promise<number>} How many rows left their inbox.
 */
export const deleteInviteMessages = async (user: User, inviteIds: number[]) => {
  if (inviteIds.length === 0) return 0;

  const scope = { $and: [inboxScope(user), { id: { $in: inviteIds } }] };

  const deleted = await postgres.em.nativeDelete(AllianceInvite, {
    $and: [scope, { status: { $ne: AllianceInviteStatus.PENDING } }],
  });

  const declined = await postgres.em.nativeUpdate(
    AllianceInvite,
    { $and: [scope, { status: AllianceInviteStatus.PENDING }] },
    { status: AllianceInviteStatus.DECLINED, updated_at: new Date() }
  );

  return deleted + declined;
};

/**
 * Drops every pending exchange a player is part of - requests they sent and invites
 * sent to them.
 *
 * Called when their base changes Map Room version, which makes all of them moot:
 * the accept would be refused anyway, and the row would otherwise sit in a leader's
 * Invites tab looking actionable while failing with a message about someone else's
 * map room. Deleted rather than declined, because nobody decided anything.
 *
 * @param {number} userId - The player whose pending rows are being dropped.
 * @returns {Promise<number>} How many rows were removed.
 */
export const clearPendingInvites = async (userId: number): Promise<number> =>
  await postgres.em.nativeDelete(AllianceInvite, {
    user_id: userId,
    status: AllianceInviteStatus.PENDING,
  });

/**
 * Refuses an alliance that has no room left.
 *
 * @param {EntityManager} em - EntityManager to count through, so a caller inside a transaction counts within it.
 * @param {number} allianceId - The alliance being filled.
 */
const checkAllianceSpace = async (em: EntityManager<PostgreSqlDriver>, allianceId: number) => {
  const members = await em.count(User, { alliance_id: allianceId });

  if (members >= MAX_ALLIANCE_MEMBERS) throw allianceFullErr();
};

/**
 * Opens an exchange between an alliance and a player.
 *
 * @param {Alliance} alliance - The alliance being joined or doing the inviting.
 * @param {number} userId - The player being invited, or making the request.
 * @param {AllianceInviteType} type - Which side opened it.
 * @returns {Promise<AllianceInvite>} The pending row.
 */
export const openInvite = async (alliance: Alliance, userId: number, type: AllianceInviteType, message: string | null = null, invitedBy: number | null = null): Promise<AllianceInvite> => {
  await checkAllianceSpace(postgres.em, alliance.id);

  // (Inferno-only, QoL #164: a lapsed invite between the two is dropped first, else it would block a new invite or
  // request as still pending)
  if (infernoOnlyConfig.enabled) {
    await postgres.em.nativeDelete(AllianceInvite, {
      alliance_id: alliance.id,
      user_id: userId,
      type: AllianceInviteType.INVITE,
      status: AllianceInviteStatus.PENDING,
      created_at: { $lte: inviteCutoff() },
    });
  }

  const invite = new AllianceInvite();
  invite.alliance_id = alliance.id;
  invite.user_id = userId;
  invite.type = type;
  invite.message = message;
  invite.invited_by = invitedBy;

  try {
    postgres.em.persist(invite);
    await postgres.em.flush();
  } catch (err) {
    if (!(err instanceof UniqueConstraintViolationException)) throw err;
    throw type === AllianceInviteType.REQUEST ? requestPendingErr() : invitePendingErr();
  }

  return invite;
};

/**
 * Answers a pending exchange.
 *
 * Only the side being asked may answer: an invite is the invited player's to
 * take, a request is the leader's. Accepting joins the player through the
 * membership service inside a transaction, so the row cannot resolve without the
 * membership landing with it.
 *
 * @param {User} user - The player answering.
 * @param {number} inviteId - The row being answered.
 * @param {AllianceInviteStatus} status - Accepted or declined.
 * @returns {Promise<AllianceInvite>} The resolved row.
 */
export const answerInvite = async (user: User, inviteId: number, status: AllianceInviteStatus): Promise<AllianceInvite> => {
  const invite = await postgres.em.findOne(AllianceInvite, { id: inviteId });

  if (!invite) throw permissionErr();

  if (invite.status !== AllianceInviteStatus.PENDING) throw inviteNotPendingErr();

  const isLeader = user.alliance_role === AllianceRole.LEADER || (infernoOnlyConfig.enabled && user.alliance_role === AllianceRole.OFFICER);
  const leadsAlliance = isLeader && user.alliance_id === invite.alliance_id;

  const isInvite = invite.type === AllianceInviteType.INVITE;
  const canAnswer = isInvite ? invite.user_id === user.userid : leadsAlliance;

  if (!canAnswer) throw permissionErr();

  // (Inferno-only, QoL #164: an invite can't be taken once it has lapsed)
  if (infernoOnlyConfig.enabled && isInvite && new Date(invite.created_at).getTime() <= inviteCutoff().getTime()) throw inviteExpiredErr();

  if (status === AllianceInviteStatus.DECLINED) {
    // (18 October, SUSPECTED-BUGS.md: only while it is still waiting: a decline sent beside an accept marked a
    // player who had joined as "declined")
    const declined = await postgres.em.nativeUpdate(AllianceInvite, { id: invite.id, status: AllianceInviteStatus.PENDING }, { status, updated_at: new Date() });
    if (declined !== 1) throw inviteNotPendingErr();
    invite.status = status;

    return invite;
  }

  const alliance = await postgres.em.findOne(Alliance, { id: invite.alliance_id });

  if (!alliance) throw permissionErr();

  const player = await postgres.em.findOne(User, { userid: invite.user_id });

  if (!player) throw permissionErr();

  const isAnswerer = player.userid === user.userid;

  if (player.alliance_id) {
    throw isAnswerer ? mustLeaveAllianceToAcceptErr() : userAlreadyInAllianceErr();
  }

  // The transaction locks the alliance row to prevent two simultaneous acceptances from both sides
  await postgres.em.transactional(async (em) => {
    await em.findOne(Alliance, { id: alliance.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    await checkAllianceSpace(em, alliance.id);

    // (18 October: still waiting (an accept by the leader and an officer at once both went through: two "joined"
    // lines), and the player in no alliance (addAllianceMember refuses otherwise: the whole answer is undone))
    const taken = await em.nativeUpdate(AllianceInvite, { id: invite.id, status: AllianceInviteStatus.PENDING }, { status, updated_at: new Date() });
    if (taken !== 1) throw inviteNotPendingErr();
    await addAllianceMember(player, alliance, AllianceRole.MEMBER, AllianceMessageType.JOINED, em);
  });

  invite.status = status;

  return invite;
};

/**
 * Inferno-only (QoL #164): the alliance's invites still waiting on an answer, newest first, for the leader and
 * officers: who, when (Unix seconds), by whom, and when it lapses. Lapsed ones are dropped as it is read (nobody
 * decided anything, so no notice is owed).
 *
 * @param {number} allianceId - The alliance that sent them.
 * @param {string} leaderName - Named as the sender of the rows that don't say who sent them.
 */
export const listSentInvites = async (allianceId: number, leaderName = "") => {
  await postgres.em.nativeDelete(AllianceInvite, {
    alliance_id: allianceId,
    type: AllianceInviteType.INVITE,
    status: AllianceInviteStatus.PENDING,
    created_at: { $lte: inviteCutoff() },
  });
  const invites = await postgres.em.find(
    AllianceInvite,
    { alliance_id: allianceId, type: AllianceInviteType.INVITE, status: AllianceInviteStatus.PENDING },
    { orderBy: { created_at: "DESC" }, limit: 200 }
  );
  if (invites.length === 0) return [];
  const ids = [...new Set(invites.flatMap((i) => [i.user_id, Number(i.invited_by ?? 0)]).filter((id) => id > 0))];
  const users = await postgres.em.find(User, { userid: { $in: ids } }, { fields: ["userid", "username"] });
  const names = new Map(users.map((u) => [u.userid, u.username]));
  const seconds = (d: Date) => Math.floor(new Date(d).getTime() / 1000);
  return invites.map((i) => ({
    invite_id: i.id,
    user_id: i.user_id,
    user_name: names.get(i.user_id) ?? "",
    // (older rows don't say who sent them: the leader, as the Invites tab says)
    by_name: names.get(Number(i.invited_by ?? 0)) ?? leaderName,
    sent: seconds(i.created_at),
    expires: seconds(i.created_at) + INVITE_DAYS * 24 * 60 * 60,
  }));
};

/**
 * Inferno-only (QoL #164): takes back one of the alliance's unanswered invites. Deleted rather than declined: the
 * invited player didn't refuse anything, and the leader's Invites tab would show it as a refusal.
 *
 * @returns {Promise<number>} 1 when it was still there.
 */
export const cancelSentInvite = async (allianceId: number, inviteId: number): Promise<number> =>
  await postgres.em.nativeDelete(AllianceInvite, {
    id: inviteId,
    alliance_id: allianceId,
    type: AllianceInviteType.INVITE,
    status: AllianceInviteStatus.PENDING,
  });

/**
 * Inferno-only: the invite table's newer columns (the request's words, QoL #169; who sent it, QoL #165), also where
 * the migrations are not run at start (production), before any invite is read.
 */
export const ensureInviteColumns = async (): Promise<void> => {
  await postgres.em.getConnection().execute(`ALTER TABLE bym.alliance_invite ADD COLUMN IF NOT EXISTS message varchar(200) NULL`);
  await postgres.em.getConnection().execute(`ALTER TABLE bym.alliance_invite ADD COLUMN IF NOT EXISTS invited_by integer NULL`);
};
