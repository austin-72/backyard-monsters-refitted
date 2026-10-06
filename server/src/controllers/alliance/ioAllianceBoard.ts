import { Status } from "../../enums/StatusCodes.js";
import { AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { MemberActionSchema } from "../../schemas/AllianceSchemas.js";
import { isAllianceStaff, requireAllianceLeader, requireAllianceMember, requireAllianceStaff } from "../../services/alliance/allianceAccess.js";
import { deletePin, listPins, markPinsSeen, MAX_PINS, movePin, PIN_DAYS, playerWorld, savePin } from "../../services/alliance/allianceBoard.js";
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
    await postgres.em.nativeUpdate(User, { userid }, { alliance_role: role });
    member.alliance_role = role;
    await announceShout({ allianceId: alliance.id, author: member, type: AllianceMessageType.OFFICER, body: on ? "1" : "0" });
  }
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
