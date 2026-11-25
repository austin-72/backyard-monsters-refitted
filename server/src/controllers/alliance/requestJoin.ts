import { AllianceInviteType } from "../../enums/Alliance.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { Status } from "../../enums/StatusCodes.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { RequestJoinSchema } from "../../schemas/AllianceSchemas.js";
import { getWorldMapVersion } from "../../services/maproom/knownWorlds.js";
import { openInvite } from "../../services/alliance/allianceInvites.js";
import { getJoinPolicy, playerLevel } from "../../services/alliance/ioJoinPolicy.js";
import { ioJoinOpen } from "../../services/alliance/membership.js";
import { getAllianceData } from "../../services/alliance/allianceData.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import {
  allianceNoWorldErr,
  joinMapVersionErr,
  mustLeaveAllianceErr,
  permissionErr,
} from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";

/** (Inferno-only, QoL #166) a refusal the game shows as it is. */
const refuse = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

/**
 * Asks an alliance to take the authenticated player in, from the Browse tab's
 * Request to Join button. The request lands in the leader's Invites tab as a
 * pending row for them to accept or decline.
 *
 * Alliances can be joined from any world on the same Map Room version, which is
 * what the Browse tab lists.
 *
 * (Inferno-only, QoL #166) The alliance's join policy (services/alliance/ioJoinPolicy.ts) decides: an open alliance
 * takes the player in at once ({ error: 0, joined: 1, alliancedata }), one by invite only refuses, and a player under
 * its minimum level is refused either way.
 *
 * @param {Context} ctx - Koa context.
 */
export const requestJoin: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"], { fields: ["save.worldid"] });

  const { alliance_id, message } = RequestJoinSchema.parse(ctx.request.body);

  if (user.alliance_id) throw mustLeaveAllianceErr();

  const alliance = await postgres.em.findOne(Alliance, { id: alliance_id });
  if (!alliance) throw permissionErr();

  const worldid = user.save?.worldid;
  if (!worldid) throw allianceNoWorldErr();

  const mapVersion = await getWorldMapVersion(worldid);
  const sameMapVersion = mapVersion === alliance.map_version;

  if (!sameMapVersion) throw joinMapVersionErr();

  // (Inferno-only, QoL #166: the join policy, checked here whatever the game shows)
  if (infernoOnlyConfig.enabled) {
    const policy = await getJoinPolicy(alliance.id);
    if (policy.mode === "invite") throw refuse(`${alliance.name} takes new members by invite only: ask its leader or an officer for an invite.`);
    if (policy.min_level > 0) {
      const level = await playerLevel(user.userid);
      if (level < policy.min_level) throw refuse(`${alliance.name} takes players from level ${policy.min_level}. You are level ${level}.`);
    }
    if (policy.mode === "open") {
      await ioJoinOpen(user, alliance);
      const alliancedata = await getAllianceData(user);
      ctx.status = Status.OK;
      ctx.body = { error: 0, joined: 1, ...(alliancedata && { alliancedata }) };
      return;
    }
  }

  // (Inferno-only, QoL #169: with the player's few words, one line, at most 200 characters)
  const words = infernoOnlyConfig.enabled && message ? message.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) : "";
  await openInvite(alliance, user.userid, AllianceInviteType.REQUEST, words || null);

  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
