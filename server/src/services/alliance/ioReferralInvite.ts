import { AllianceInviteStatus, AllianceInviteType, AllianceRole } from "../../enums/Alliance.js";
import { AllianceInvite } from "../../database/models/allianceinvite.model.js";
import { alliancesEnabled, infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { MapRoomVersion } from "../../enums/MapRoom.js";
import { openInvite } from "./allianceInvites.js";

/**
 * Inferno-only (QoL #193): a friend who came through a player's invite link gets an invite into that player's alliance
 * when their first yard is made (services/maproom/v2/joinOrCreateWorld.ts), if the inviter leads it or is one of its
 * officers. An ordinary invite, sent by the inviter (the Invites tab says so, QoL #165), which lapses after 14 days
 * as any other. Nothing when the friend is already in an alliance, the alliance is full (openInvite refuses), or an
 * invite between them is already waiting.
 *
 * @param {User} user - The new player, whose `referred_by` names the inviter.
 */
export const ioInviteReferred = async (user: User): Promise<void> => {
  if (!infernoOnlyConfig.enabled || !alliancesEnabled() || !user.referred_by || user.alliance_id) return;
  const inviter = await postgres.em.findOne(User, { userid: user.referred_by }, { fields: ["userid", "username", "alliance_id", "alliance_role"] });
  if (!inviter?.alliance_id) return;
  if (inviter.alliance_role !== AllianceRole.LEADER && inviter.alliance_role !== AllianceRole.OFFICER) return;
  const alliance = await postgres.em.findOne(Alliance, { id: inviter.alliance_id });
  // (the friend's yard is on a Map Room 2 world: joinOrCreateWorld)
  if (!alliance || alliance.map_version !== MapRoomVersion.V2) return;
  // (checked first: a refused write would stay in the request's unit of work, and the yard's own save after it fail)
  if (await postgres.em.count(AllianceInvite, { alliance_id: alliance.id, user_id: user.userid, status: AllianceInviteStatus.PENDING })) return;
  try {
    await openInvite(alliance, user.userid, AllianceInviteType.INVITE, null, inviter.userid);
    logger.info(`${user.username}, invited by ${inviter.username}, has an invite into ${alliance.name}.`);
  } catch (err) {
    // (full, or an invite already waiting: nothing to send)
    logger.info(`${user.username}: no invite into ${alliance.name} (${err instanceof Error ? err.message : err}).`);
  }
};
