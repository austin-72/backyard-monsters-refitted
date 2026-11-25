import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { MemberActionSchema } from "../../schemas/AllianceSchemas.js";
import { requireAllianceLeader, requireAllianceStaff } from "../../services/alliance/allianceAccess.js";
import { IO_UNDO_KICK_SEC, ioMemberRecord, removeAllianceMember, undoKickKey } from "../../services/alliance/membership.js";
import { cannotKickErr } from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";
import { sendMail } from "../../services/mail/sendMail.js";

/**
 * Removes a member from the leader's alliance, from the Members tab.
 *
 * Inferno-only (QoL #501): the feed says who removed them, and for IO_UNDO_KICK_SEC seconds the remover (or the
 * leader) can undo it (POST /alliance/undokick, controllers/alliance/ioAllianceRoster.ts): { error: 0, undo: 300 }.
 *
 * @param {Context} ctx - Koa context.
 */
export const kickMember: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { userid } = MemberActionSchema.parse(ctx.request.body);

  // (Inferno-only: officers kick too, but only members: not the leader or another officer)
  const alliance = infernoOnlyConfig.enabled ? await requireAllianceStaff(user) : await requireAllianceLeader(user);

  if (userid === user.userid) throw cannotKickErr();

  const member = await postgres.em.findOne(User, { userid });

  if (!member || member.alliance_id !== alliance.id) throw cannotKickErr();

  if (user.alliance_role === AllianceRole.OFFICER && (member.alliance_role === AllianceRole.LEADER || member.alliance_role === AllianceRole.OFFICER)) throw cannotKickErr();

  if (!infernoOnlyConfig.enabled) {
    await removeAllianceMember(member, alliance, AllianceMessageType.KICKED);

    ctx.status = Status.OK;
    ctx.body = { error: 0 };
    return;
  }

  // (QoL #501: who they were, for the undo; the feed's line names who removed them)
  const record = await ioMemberRecord(member, alliance.id);
  await removeAllianceMember(member, alliance, AllianceMessageType.KICKED, undefined, { body: JSON.stringify({ by: user.username }), record });
  const kept =
    (await redis
      .set(undoKickKey(alliance.id, member.userid), JSON.stringify({ ...record, by: user.userid, byName: user.username }), "EX", String(IO_UNDO_KICK_SEC))
      .catch(() => null)) === "OK";

  // (Inferno-only, QoL #168: the player is told, by a letter from whoever removed them; they found out by noticing)
  void sendMail(user.userid, member.userid, `Removed from ${alliance.name}`, `${user.username} removed you from the alliance ${alliance.name}. You can join another, or start your own, from the Alliances window.`);

  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(kept && { undo: IO_UNDO_KICK_SEC }) };
};
