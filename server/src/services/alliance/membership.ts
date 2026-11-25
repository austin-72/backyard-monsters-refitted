import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { LockMode } from "@mikro-orm/core";
import { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";

import { AllianceInviteStatus, AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { AllianceInvite } from "../../database/models/allianceinvite.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { MAX_ALLIANCE_MEMBERS } from "../../config/AllianceConfig.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { disconnectAllianceChat } from "../../chat/chatControl.js";
import { allianceFullErr, mustLeaveAllianceErr, permissionErr } from "../../errors/errors.js";
import { announceShout, emitShout, type ShoutDraft } from "./allianceMessages.js";
import { ioKeepDisbanded } from "./ioDisbandKeep.js";
import { logger } from "../../utils/logger.js";

type EntryShout = AllianceMessageType.CREATED | AllianceMessageType.JOINED;
type ExitShout = AllianceMessageType.KICKED | AllianceMessageType.LEFT;

/**
 * Inferno-only (QoL #500): a member who leaves and comes back to the same alliance within a day gets their role and
 * join date back; one who was removed gets only the join date back (16 October). (QoL #501): a removal can be undone
 * for 5 minutes, role and all. Both kept in Redis only.
 */
export const IO_REJOIN_SEC = 24 * 60 * 60;
export const IO_UNDO_KICK_SEC = 5 * 60;

/** Who a member was in their alliance: its id, their role, when they joined (Unix seconds, 0 when not known). */
export interface IoMemberRecord {
  allianceId: number;
  role: string;
  joinedAt: number;
}

const rejoinKey = (userid: number) => `io:al:rejoin:${userid}`;

/** (QoL #501) The removal that can still be undone: { allianceId, role, joinedAt, by, byName }. */
export const undoKickKey = (allianceId: number, userid: number) => `io:al:kicked:${allianceId}:${userid}`;

const conflict = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

export const parseMemberRecord = (raw: unknown): IoMemberRecord | null => {
  if (!raw) return null;
  try {
    const r = JSON.parse(String(raw)) as Partial<IoMemberRecord>;
    const allianceId = Number(r.allianceId);
    if (!Number.isSafeInteger(allianceId) || allianceId <= 0) return null;
    return { allianceId, role: String(r.role || AllianceRole.MEMBER), joinedAt: Number(r.joinedAt) || 0 };
  } catch {
    return null;
  }
};

/** (QoL #500, #501) A member's role and join date (user.alliance_joined_at), read before they leave. */
export const ioMemberRecord = async (user: User, allianceId: number): Promise<IoMemberRecord> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT floor(extract(epoch FROM alliance_joined_at)) AS j FROM bym."user" WHERE userid = ?`, [user.userid])
    .catch(() => [])) as { j: string | number | null }[];
  return { allianceId, role: user.alliance_role ?? AllianceRole.MEMBER, joinedAt: Number(rows[0]?.j) || 0 };
};

/**
 * Counts the members of an alliance other than the given user. Callers that
 * need this figure before a removal should pass it into removeAllianceMember
 * rather than letting the service count a second time.
 *
 * @param {User} user - The user to exclude from the count.
 * @param {number} allianceId - The alliance being counted.
 * @returns {Promise<number>} The number of other members.
 */
export const countOtherMembers = async (user: User, allianceId: number): Promise<number> =>
  await postgres.em.count(User, { alliance_id: allianceId, userid: { $ne: user.userid } });

/**
 * Adds a user to an alliance with the given role.
 *
 * The write goes through nativeUpdate so the caller may hand in the EntityManager
 * of an open transaction, whose identity map does not hold the passed user. The
 * in-memory entity is synced to match once the write lands.
 *
 * @param {User} user - The user joining.
 * @param {Alliance} alliance - The alliance being joined.
 * @param {AllianceRole} role - The role to assign the user.
 * @param {EntryShout | null} shoutType - CREATED for a founder, JOINED for a new member, or null to raise none.
 * @param {EntityManager} em - EntityManager to write through, defaulting to the request's.
 * @param {IoMemberRecord | null} restore - (Inferno-only) the role and join date to give back; undefined: the ones
 *   kept for a day when they last left this alliance (QoL #500), if any.
 */
export const addAllianceMember = async (
  user: User,
  alliance: Alliance,
  role: AllianceRole,
  shoutType: EntryShout | null,
  em: EntityManager<PostgreSqlDriver> = postgres.em,
  restore?: IoMemberRecord | null
) => {
  const { id } = alliance;

  // (Inferno-only, QoL #500: back within 24 hours: their role and join date as they were; never the lead, which
  // someone else holds now)
  let keep: IoMemberRecord | null = null;
  if (infernoOnlyConfig.enabled && role === AllianceRole.MEMBER) {
    keep = restore !== undefined ? restore : parseMemberRecord(await redis.get(rejoinKey(user.userid)).catch(() => null));
    if (keep && keep.allianceId !== id) keep = null;
    if (keep) role = keep.role === AllianceRole.LEADER || keep.role === AllianceRole.OFFICER ? AllianceRole.OFFICER : AllianceRole.MEMBER;
  }

  // (18 October, SUSPECTED-BUGS.md) only a player in no alliance joins one: two invites accepted at once both went
  // through (the player ended in the second, the first logged a join), and two creates at once left an empty
  // alliance behind. The caller's transaction is rolled back when this refuses.
  const joined = await em.nativeUpdate(User, { userid: user.userid, alliance_id: null }, { alliance_id: id, alliance_role: role });
  if (joined !== 1) throw new ClientSafeError({ message: "That player is already in an alliance.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
  // (when they joined: the quest book's "Loyal"; migration 20261020)
  if (keep && keep.joinedAt > 0) {
    await em.getConnection().execute(`UPDATE bym."user" SET alliance_joined_at = to_timestamp(?) WHERE userid = ?`, [keep.joinedAt, user.userid], "run", em.getTransactionContext()).catch(() => undefined);
  } else {
    await em.getConnection().execute(`UPDATE bym."user" SET alliance_joined_at = now() WHERE userid = ?`, [user.userid], "run", em.getTransactionContext()).catch(() => undefined);
  }

  user.alliance_id = id;
  user.alliance_role = role;

  // (Inferno-only, QoL #167: in one alliance, the player's other invites and requests are declined: they sat in
  // other leaders' Invites tabs looking answerable)
  if (infernoOnlyConfig.enabled) {
    await em.nativeUpdate(AllianceInvite, { user_id: user.userid, status: AllianceInviteStatus.PENDING, alliance_id: { $ne: id } }, { status: AllianceInviteStatus.DECLINED, updated_at: new Date() });
  }

  if (shoutType) await emitShout({ allianceId: id, author: user, type: shoutType, body: "", em });

  // A player already in chat moves into the new alliance's channel (the gateway checks the database).
  await disconnectAllianceChat(user.userid);
};

/**
 * Removes a user from their alliance, disbanding it when no one else remains.
 *
 * @param {User} user - The user leaving or being removed.
 * @param {Alliance} alliance - The alliance they belong to.
 * @param {ExitShout} shoutType - KICKED when removed by a leader, LEFT when they chose to go.
 * @param {number} otherMembers - Members besides this user, when the caller has already counted them.
 * @param {object} extra - (Inferno-only) the shout's body (QoL #501: who removed them), and their role and join
 *   date when the caller has already read them.
 * @returns {Promise<boolean>} True if the alliance was disbanded (last member out).
 */
export const removeAllianceMember = async (
  user: User,
  alliance: Alliance,
  shoutType: ExitShout,
  otherMembers?: number,
  extra: { body?: string; record?: IoMemberRecord | null } = {}
) => {
  const remaining = otherMembers ?? await countOtherMembers(user, alliance.id);

  let disbanded = remaining === 0;

  // (Inferno-only, QoL #500: who they were, kept a day for a return; nothing to return to once it is disbanded.
  // 16 October: one removed by the leader or an officer comes back as a plain member: their join date is kept, not
  // their role. Undoing the removal (QoL #501) still gives the role back: kickMember keeps its own record for that.)
  const was = infernoOnlyConfig.enabled && !disbanded ? (extra.record ?? (await ioMemberRecord(user, alliance.id))) : null;
  const record = was && shoutType === AllianceMessageType.KICKED ? { ...was, role: AllianceRole.MEMBER } : was;

  // (18 October, SUSPECTED-BUGS.md) out only as the caller found them: in this alliance, in the role it read. A kick
  // sent beside a promotion removed the new leader (the promotion had committed first), leaving no leader.
  if (infernoOnlyConfig.enabled) {
    const out = await postgres.em.nativeUpdate(
      User,
      { userid: user.userid, alliance_id: alliance.id, ...(user.alliance_role != null && { alliance_role: user.alliance_role }) },
      { alliance_id: null, alliance_role: null }
    );
    if (out !== 1) throw new ClientSafeError({ message: "That player's place in the alliance has just changed. Look again and try once more.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
  }

  user.alliance_id = null;
  user.alliance_role = null;

  if (disbanded && infernoOnlyConfig.enabled) {
    // (18 October, SUSPECTED-BUGS.md: the last member leaving as someone joined deleted the alliance under the new
    // member, who was told they had joined) counted again under the alliance row's lock, which the joins take too
    const em = postgres.em;
    await em.begin();
    try {
      const ctx = em.getTransactionContext();
      await em.getConnection().execute(`SELECT id FROM bym.alliance WHERE id = ? FOR UPDATE`, [alliance.id], "all", ctx);
      const rows = (await em.getConnection().execute(`SELECT count(*)::int AS n FROM bym."user" WHERE alliance_id = ? AND userid <> ?`, [alliance.id, user.userid], "all", ctx)) as { n: number }[];
      if (Number(rows[0]?.n ?? 0) > 0) {
        disbanded = false;
        // (the one who joined leads it: the leader who left was the only one)
        const [heir] = (await em.getConnection().execute(
          `UPDATE bym."user" SET alliance_role = ? WHERE userid = (SELECT userid FROM bym."user" WHERE alliance_id = ? AND userid <> ? ORDER BY alliance_joined_at NULLS LAST, userid LIMIT 1) RETURNING userid, username`,
          [AllianceRole.LEADER, alliance.id, user.userid], "all", ctx)) as { userid: number; username: string }[];
        if (heir) {
          await em.getConnection().execute(`UPDATE bym.alliance SET leader_userid = ?, leader_name = ? WHERE id = ?`, [heir.userid, heir.username, alliance.id], "all", ctx);
          alliance.leader_userid = heir.userid;
          alliance.leader_name = heir.username;
        }
      } else {
        // (QoL #502: a disbanded alliance is kept 14 days, restorable by whoever disbanded it: its row and what hangs
        // off it, copied to Redis before the row goes; services/alliance/ioDisbandKeep.ts)
        await ioKeepDisbanded(alliance, user).catch((err) => logger.warn(`Alliance ${alliance.id}: not kept for restoring: ${err}`));
        em.remove(alliance);
      }
      await em.flush();
      await em.commit();
    } catch (err) {
      await em.rollback().catch(() => undefined);
      throw err;
    }
  } else {
    if (disbanded) postgres.em.remove(alliance);
    await postgres.em.flush();
  }

  if (record) {
    await redis.set(rejoinKey(user.userid), JSON.stringify(record), "EX", String(IO_REJOIN_SEC)).catch(() => null);
  }

  if (!disbanded) {
    const shout: ShoutDraft = {
      allianceId: alliance.id,
      author: user,
      type: shoutType,
      body: extra.body ?? "",
    };

    await announceShout(shout);
  }

  await disconnectAllianceChat(user.userid);

  return disbanded;
};

/**
 * Hands leadership of an alliance to one of its members.
 * 
 * Leader becomes a member, and the member becomes the leader.
 * Alliance ownership is updated to reflect the new leader's userid and username.
 *
 * @param {User} leader - The current leader, stepping down.
 * @param {User} member - The member taking over.
 * @param {Alliance} alliance - The alliance changing hands.
 */
export const promoteAllianceMember = async (leader: User, member: User, alliance: Alliance) => {
  await postgres.em.transactional(async (em) => {
    // (13 October) only while the leader still leads and the member is still in: two promotions sent at once made two
    // leaders (each read the leader's role at the start), or none with an officer change beside it. The first update
    // locks the leader's row; the second request waits for it, then finds no leader to step down, and nothing changes.
    const stepped = await em.nativeUpdate(User, { userid: leader.userid, alliance_id: alliance.id, alliance_role: AllianceRole.LEADER }, { alliance_role: AllianceRole.OFFICER });
    if (stepped !== 1) throw new ClientSafeError({ message: "You no longer lead this alliance.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
    const raised = await em.nativeUpdate(User, { userid: member.userid, alliance_id: alliance.id }, { alliance_role: AllianceRole.LEADER });
    if (raised !== 1) throw new ClientSafeError({ message: "That player is no longer in your alliance.", status: Status.CONFLICT, data: {}, isClientFriendly: true });

    await em.nativeUpdate(
      Alliance,
      { id: alliance.id },
      { leader_userid: member.userid, leader_name: member.username }
    );
  });

  member.alliance_role = AllianceRole.LEADER;
  leader.alliance_role = AllianceRole.OFFICER;

  alliance.leader_userid = member.userid;
  alliance.leader_name = member.username;

  const shout: ShoutDraft = {
    allianceId: alliance.id,
    author: member,
    type: AllianceMessageType.PROMOTED,
    body: "",
  }

  await announceShout(shout);
};

/**
 * Inferno-only (QoL #501): undoes a removal: the player goes back into the alliance with the role and join date they
 * had, while they are still in none and there is room. The alliance's row is locked, as when an invite is accepted,
 * so two of these (or one beside an acceptance) can't overfill it.
 *
 * @param {User} user - The player who was removed.
 * @param {Alliance} alliance - The alliance they were removed from.
 * @param {IoMemberRecord} record - Who they were in it.
 */
export const ioRestoreMember = async (user: User, alliance: Alliance, record: IoMemberRecord) => {
  await postgres.em.transactional(async (em) => {
    await em.findOne(Alliance, { id: alliance.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    const rows = (await em.getConnection().execute(`SELECT alliance_id FROM bym."user" WHERE userid = ? FOR UPDATE`, [user.userid], "all", em.getTransactionContext())) as { alliance_id: number | null }[];
    if (!rows.length) throw permissionErr();
    const now = Number(rows[0].alliance_id) || 0;
    if (now === alliance.id) throw conflict(`${user.username} is already back in the alliance.`);
    if (now) throw conflict(`${user.username} has joined another alliance since.`);
    const members = await em.count(User, { alliance_id: alliance.id });
    if (members >= MAX_ALLIANCE_MEMBERS) throw allianceFullErr();
    await addAllianceMember(user, alliance, AllianceRole.MEMBER, null, em, record);
  });
};

/**
 * Inferno-only (QoL #172): an officer takes the lead of an alliance whose leader hasn't been seen for a long while
 * (services/alliance/ioSuccession.ts decides who may). The old leader becomes an officer. Only while the old leader
 * still leads and the officer is still an officer: two officers asking at once can't both lead.
 *
 * @param {User} officer - The officer taking the lead.
 * @param {Alliance} alliance - Their alliance.
 * @param {User} leader - Its leader until now.
 */
export const ioTakeLead = async (officer: User, alliance: Alliance, leader: User) => {
  await postgres.em.transactional(async (em) => {
    const stepped = await em.nativeUpdate(User, { userid: leader.userid, alliance_id: alliance.id, alliance_role: AllianceRole.LEADER }, { alliance_role: AllianceRole.OFFICER });
    if (stepped !== 1) throw conflict("The alliance's leader has changed meanwhile.");
    const raised = await em.nativeUpdate(User, { userid: officer.userid, alliance_id: alliance.id, alliance_role: AllianceRole.OFFICER }, { alliance_role: AllianceRole.LEADER });
    if (raised !== 1) throw conflict("You are no longer an officer of this alliance.");
    await em.nativeUpdate(Alliance, { id: alliance.id }, { leader_userid: officer.userid, leader_name: officer.username });
  });

  officer.alliance_role = AllianceRole.LEADER;
  leader.alliance_role = AllianceRole.OFFICER;
  alliance.leader_userid = officer.userid;
  alliance.leader_name = officer.username;

  // (the alliance's feed: who took the lead, and from whom: services/alliance/shoutText.ts)
  await announceShout({ allianceId: alliance.id, author: officer, type: AllianceMessageType.PROMOTED, body: JSON.stringify({ took: leader.username }) });
};

/**
 * Inferno-only (QoL #166): a player joins an open alliance from Browse, at once. As an accepted invite: the alliance's
 * row is locked (two joining at once can't overfill it), the player must be in none, and any exchange still pending
 * between them is marked accepted.
 *
 * @param {User} user - The player joining.
 * @param {Alliance} alliance - The open alliance.
 */
export const ioJoinOpen = async (user: User, alliance: Alliance) => {
  await postgres.em.transactional(async (em) => {
    await em.findOne(Alliance, { id: alliance.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    const rows = (await em.getConnection().execute(`SELECT alliance_id FROM bym."user" WHERE userid = ? FOR UPDATE`, [user.userid], "all", em.getTransactionContext())) as { alliance_id: number | null }[];
    if (!rows.length) throw permissionErr();
    if (Number(rows[0].alliance_id) || 0) throw mustLeaveAllianceErr();
    const members = await em.count(User, { alliance_id: alliance.id });
    if (members >= MAX_ALLIANCE_MEMBERS) throw allianceFullErr();
    await em.nativeUpdate(AllianceInvite, { user_id: user.userid, alliance_id: alliance.id, status: AllianceInviteStatus.PENDING }, { status: AllianceInviteStatus.ACCEPTED, updated_at: new Date() });
    await addAllianceMember(user, alliance, AllianceRole.MEMBER, AllianceMessageType.JOINED, em);
  });
};
