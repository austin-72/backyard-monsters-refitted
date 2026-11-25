import { questPromoted } from "../../services/quests/questHooks.js";
import { Status } from "../../enums/StatusCodes.js";
import { AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { MemberActionSchema } from "../../schemas/AllianceSchemas.js";
import { isAllianceStaff, requireAllianceLeader, requireAllianceMember, requireAllianceStaff } from "../../services/alliance/allianceAccess.js";
import { deletePin, listPins, markPinsSeen, MAX_PINS, movePin, PIN_DAYS, playerWorld, savePin, setPinLife } from "../../services/alliance/allianceBoard.js";
import { cancelSentInvite, INVITE_DAYS, listSentInvites } from "../../services/alliance/allianceInvites.js";
import { outpostHistory } from "../../services/alliance/allianceOutposts.js";
import { announceShout } from "../../services/alliance/allianceMessages.js";
import { cannotPromoteErr, permissionErr } from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";
import { questBump } from "../../services/quests/questProgress.js";

/**
 * Inferno-only: the Alliances window's Board and Outposts tabs, and naming officers (the user's design of
 * 2 October). Every route answers the player's own alliance only.
 */

const requireInferno = () => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
};

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) });

/** GET|POST /alliance/pins { seen? }: the board ("seen": the Board tab is open, its badge clears). */
export const getPins: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceMember(user);
  const p = params(ctx);
  if (p.seen === "1" || p.seen === 1 || p.seen === true) {
    await markPinsSeen(user.userid);
    void questBump(user.userid, "board_read");
  }
  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    pins: await listPins(alliance.id),
    can_edit: isAllianceStaff(user),
    // (QoL #177: Keep is the leader's)
    can_keep: user.alliance_role === AllianceRole.LEADER,
    max: MAX_PINS,
    days: PIN_DAYS,
    my_world: await playerWorld(user.userid),
  };
};

/** POST /alliance/savepin { id?, title, body, x?, y?, world? }: the leader or an officer. */
export const savePinController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceStaff(user);
  const p = params(ctx);
  const saved = await savePin(user, alliance.id, p);
  if (!Number(p.id)) void questBump(user.userid, "pin");
  ctx.status = Status.OK;
  ctx.body = { error: 0, id: saved.id };
};

/** POST /alliance/deletepin { id } */
export const deletePinController: KoaController = async (ctx) => {
  requireInferno();
  const alliance = await requireAllianceStaff(ctx.authUser);
  await deletePin(alliance.id, params(ctx).id);
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};

/** POST /alliance/movepin { id, dir: "up" | "down" } */
export const movePinController: KoaController = async (ctx) => {
  requireInferno();
  const alliance = await requireAllianceStaff(ctx.authUser);
  const p = params(ctx);
  await movePin(alliance.id, p.id, p.dir);
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};

/**
 * POST /alliance/pinlife { id, action: "keep" | "unkeep" | "renew" } (Inferno-only, QoL #177): the leader keeps a
 * pin for good (or stops); the leader or an officer renews one for another PIN_DAYS days from now. { error: 0 }
 */
export const pinLifeController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const p = params(ctx);
  const action: "keep" | "unkeep" | "renew" | null =
    p.action === "keep" ? "keep" : p.action === "unkeep" ? "unkeep" : p.action === "renew" ? "renew" : null;
  if (!action) throw permissionErr();
  const alliance = action === "renew" ? await requireAllianceStaff(user) : await requireAllianceLeader(user);
  await setPinLife(alliance.id, p.id, action);
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};

/**
 * GET|POST /alliance/sentinvites { cancel? } (Inferno-only, QoL #164): the leader's and officers' view of the
 * alliance's unanswered invites; `cancel` (an invite id) takes that one back first.
 * { error: 0, invites: [{ invite_id, user_id, user_name, by_name, sent, expires }], days, cancelled? }
 */
export const sentInvitesController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceStaff(user);
  const p = params(ctx);
  const cancel = Number(p.cancel);
  let cancelled: number | undefined;
  if (Number.isSafeInteger(cancel) && cancel > 0) cancelled = await cancelSentInvite(alliance.id, cancel);
  ctx.status = Status.OK;
  ctx.body = { error: 0, invites: await listSentInvites(alliance.id, alliance.leader_name ?? ""), days: INVITE_DAYS, ...(cancelled !== undefined && { cancelled }) };
};

/** GET|POST /alliance/outposts { kind?, source?, member?, world?, before? }: the outposts gained and lost. */
export const getOutposts: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceMember(user);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(await outpostHistory(alliance.id, params(ctx))), my_world: await playerWorld(user.userid) };
};

/** POST /alliance/setofficer { userid, on }: the leader names (or stops naming) a member an officer. */
export const setOfficer: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const { userid } = MemberActionSchema.parse(ctx.request.body);
  const p = params(ctx);
  const on = p.on === true || p.on === 1 || p.on === "1" || p.on === "true";
  const alliance = await requireAllianceLeader(user);
  if (userid === user.userid) throw cannotPromoteErr();
  const member = await postgres.em.findOne(User, { userid });
  if (!member || member.alliance_id !== alliance.id || member.alliance_role === AllianceRole.LEADER) throw cannotPromoteErr();
  const role = on ? AllianceRole.OFFICER : AllianceRole.MEMBER;
  if ((member.alliance_role ?? AllianceRole.MEMBER) !== role) {
    // (13 October: only while it is still so: the asker still leads, the member is still in and not made leader
    // meanwhile; a promotion sent beside it left the alliance with no leader)
    const changed = await postgres.em.getConnection().execute(
      `UPDATE bym."user" SET alliance_role = ? WHERE userid = ? AND alliance_id = ? AND alliance_role IS DISTINCT FROM ?
         AND EXISTS (SELECT 1 FROM bym."user" l WHERE l.userid = ? AND l.alliance_id = ? AND l.alliance_role = ?) RETURNING userid`,
      [role, userid, alliance.id, AllianceRole.LEADER, user.userid, alliance.id, AllianceRole.LEADER], "all") as unknown[];
    if (changed.length !== 1) throw cannotPromoteErr();
    member.alliance_role = role;
    await announceShout({ allianceId: alliance.id, author: member, type: AllianceMessageType.OFFICER, body: on ? "1" : "0" });
    if (on) void questPromoted(user.userid, member.userid);
  }
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
