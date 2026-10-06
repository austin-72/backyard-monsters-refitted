import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { listPins, playerWorld, unreadPins, worldTag } from "../../services/alliance/allianceBoard.js";
import { holdingsOf, outpostTally } from "../../services/alliance/allianceOutposts.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { User } from "../../database/models/user.model.js";
import { getUserAlliance } from "../../services/alliance/allianceAccess.js";
import { getAllianceDetails } from "../../services/alliance/allianceMember.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Returns the authenticated user's alliance for the My Alliance tab, or
 * `alliance: null` when they are unaffiliated.
 *
 * Rank is the alliance's standing across its whole map version by empire points (Inferno: empire value),
 * not within its own world.
 *
 * @param {Context} ctx - Koa context.
 */
export const myAlliance: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const alliance = await getUserAlliance(user, { withStats: true });

  if (!alliance) {
    ctx.status = Status.OK;
    ctx.body = { error: 0, alliance: null };
    return;
  }

  const { online, avgLevel } = await getAllianceDetails(alliance.id);

  // Inferno-only (the window's header): the alliance's outposts and empire value on the map, the
  // player's role and world.
  let extra = {};
  if (infernoOnlyConfig.enabled) {
    const worldId = await playerWorld(user.userid);
    const members = await postgres.em.find(User, { alliance_id: alliance.id }, { fields: ["userid"] });
    const holdings = await holdingsOf(members.map((m) => m.userid));
    let outposts = 0;
    for (const h of holdings.values()) outposts += h.outposts;
    // (the same total Browse ranks by)
    const empire = Number(alliance.stats?.empire_value ?? 0);
    const [pins, unread, week] = await Promise.all([listPins(alliance.id), unreadPins(alliance.id, user.userid), outpostTally(alliance.id, 7)]);
    extra = {
      outposts,
      empire,
      my_role: user.alliance_role ?? "member",
      my_world: worldId,
      world_tag: worldTag(worldId),
      pins_top: pins.slice(0, 2),
      pin_count: pins.length,
      unread_pins: unread,
      week,
    };
  }

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    alliance: {
      alliance_id: alliance.id,
      name: alliance.name,
      image: alliance.image,
      description: alliance.description,
      rank: infernoOnlyConfig.enabled ? alliance.stats?.value_global_rank : alliance.stats?.global_rank,
      avg_level: avgLevel,
      leader_name: alliance.leader_name,
      number_of_members: alliance.stats?.member_count,
      online_members: online,
      ...extra,
    },
  };
};
