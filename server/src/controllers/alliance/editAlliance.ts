import { parseCrest } from "../../services/alliance/allianceCrest.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { EditAllianceSchema } from "../../schemas/AllianceSchemas.js";
import { requireAlliancePerm } from "../../services/alliance/ioOfficerPerms.js";
import { assertDescriptionAllowed, assertNameAllowed } from "../../services/alliance/textFilter.js";
import { defaultTag, parseTag, tagOf } from "../../services/alliance/allianceTag.js";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { allianceNameTakenErr } from "../../errors/errors.js";
import { announceShout } from "../../services/alliance/allianceMessages.js";
import { AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { refreshChatUser } from "../../chat/chatControl.js";
import { logger } from "../../utils/logger.js";

/** Each member's chat connection works out its alliance tag again (chat/chatIdentity.ts). */
const refreshMembersInChat = async (allianceId: number) => {
  const rows = await postgres.em.getConnection().execute<{ userid: number }[]>(`SELECT userid FROM bym."user" WHERE alliance_id = ?`, [allianceId]).catch(() => []);
  for (const r of rows) await refreshChatUser(Number(r.userid));
};
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Updates the shield image and description of the authenticated user's alliance, and (Inferno-only, 13 October)
 * its name and chat tag. Only the alliance leader may edit.
 *
 * A new name follows the rules a new alliance's does (3 to 30 characters, starting with a letter or digit, not
 * another alliance's in any capitals). The tag is 1 to 5 letters or digits; the one the name gives by default
 * (its first 3) is kept as the default, so it follows a later rename.
 *
 * Inferno-only (QoL #174): an officer the leader allows may change the description, and only that: the shield, crest,
 * name and tag sent are left as they are (services/alliance/ioOfficerPerms.ts).
 *
 * @param {Context} ctx - Koa context.
 */
export const editAlliance: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  // (Inferno-only, QoL #174: or an officer the leader lets edit the description)
  const alliance = await requireAlliancePerm(user, "description");

  const data = EditAllianceSchema.parse(ctx.request.body);

  assertDescriptionAllowed(data.alliance_desc);

  // (QoL #174: an officer's edit: the description alone)
  if (user.alliance_role !== AllianceRole.LEADER) {
    data.alliance_image = alliance.image;
    data.alliance_name = undefined;
    data.alliance_tag = undefined;
    data.alliance_crest = undefined;
  }

  const oldName = alliance.name;
  const name = data.alliance_name !== undefined && data.alliance_name !== alliance.name ? data.alliance_name : null;
  if (name !== null) assertNameAllowed(name);
  const nameNow = name ?? alliance.name;
  let tag: string | null | undefined;
  if (data.alliance_tag !== undefined) {
    const typed = parseTag(data.alliance_tag);
    tag = typed === defaultTag(nameNow) ? null : typed;
  }
  const tagBefore = tagOf(alliance);
  const crest = parseCrest(data.alliance_crest);

  alliance.image = data.alliance_image;
  alliance.description = data.alliance_desc;
  if (name !== null) alliance.name = name;
  if (tag !== undefined) alliance.tag = tag;
  if (crest !== undefined) alliance.crest = crest;

  try {
    await postgres.em.flush();
  } catch (error) {
    if (error instanceof UniqueConstraintViolationException) {
      alliance.name = oldName;
      throw allianceNameTakenErr();
    }
    throw error;
  }

  if (name !== null) {
    void announceShout({ allianceId: alliance.id, author: user, type: AllianceMessageType.RENAMED, body: JSON.stringify({ from: oldName, to: name }) })
      .catch((err) => logger.warn(`Alliance ${alliance.id}: rename not announced: ${err}`));
  }
  // (the members' chat lines show the new tag at once, not within 10 seconds)
  if (tagOf(alliance) !== tagBefore) void refreshMembersInChat(alliance.id);

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    alliance: {
      alliance_id: alliance.id,
      name: alliance.name,
      image: alliance.image,
      crest: alliance.crest ?? null,
      description: alliance.description,
      tag: tagOf(alliance),
      tag_default: defaultTag(alliance.name),
      leader: alliance.leader_name,
      world_id: alliance.world_id,
    },
  };
};
