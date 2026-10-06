import { Status } from "../../enums/StatusCodes.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { postgres } from "../../server.js";
import { AllianceMembersSchema } from "../../schemas/AllianceSchemas.js";
import { getAllianceMembers } from "../../services/alliance/allianceMembers.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Inferno-only: the members of any alliance, for Browse -> Actions -> Members. Only what the
 * Browse table already shows about players (name, level, points, leader, online) is sent: no base
 * ids or attack details, which the own-alliance Members tab has.
 *
 * Answers GET (query) and POST (form): the client's URLLoaderApi always posts.
 *
 * @param {Context} ctx - Koa context.
 */
export const allianceMembers: KoaController = async (ctx) => {
  const { alliance_id } = AllianceMembersSchema.parse({ ...(ctx.query as object), ...((ctx.request.body as object) ?? {}) });

  const alliance = await postgres.em.fork().findOne(Alliance, { id: alliance_id });
  if (!alliance) {
    ctx.status = Status.OK;
    ctx.body = { error: "That alliance no longer exists.", members: [] };
    return;
  }

  const members = (await getAllianceMembers(alliance_id)).map((member) => ({
    user_id: member.user_id,
    display_name: member.display_name,
    level: member.level,
    points: member.points,
    is_leader: member.is_leader,
    online: member.status.online,
  }));

  ctx.status = Status.OK;
  ctx.body = { error: 0, members };
};
