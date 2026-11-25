import { Status } from "../../enums/StatusCodes.js";
import { defaultTag, tagOf } from "../../services/alliance/allianceTag.js";
import { postgres } from "../../server.js";
import { listPins, playerWorld, unreadPins, worldTag } from "../../services/alliance/allianceBoard.js";
import { holdingsOf, outpostTally } from "../../services/alliance/allianceOutposts.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { User } from "../../database/models/user.model.js";
import { getUserAlliance } from "../../services/alliance/allianceAccess.js";
import { getAllianceDetails } from "../../services/alliance/allianceMember.js";
import type { KoaController } from "../../utils/KoaController.js";
import { AllianceRole } from "../../enums/Alliance.js";
import { IO_REJOIN_SEC } from "../../services/alliance/membership.js";
import { ioSuccession, SUCCESSION_DAYS } from "../../services/alliance/ioSuccession.js";
import { getJoinPolicy } from "../../services/alliance/ioJoinPolicy.js";
import { ioKeptFor } from "../../services/alliance/ioDisbandKeep.js";
import { officerPermsOf } from "../../services/alliance/ioOfficerPerms.js";

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
    // (Inferno-only, QoL #502: the alliance they disbanded in the last 14 days, which they can restore)
    const kept = infernoOnlyConfig.enabled ? await ioKeptFor(user.userid).catch(() => null) : null;
    ctx.status = Status.OK;
    ctx.body = { error: 0, alliance: null, ...(kept && { kept }) };
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
    // (QoL #500: when the player joined, for the Leave prompt: kept a day for a return)
    const joinedRows = (await postgres.em
      .getConnection()
      .execute(`SELECT floor(extract(epoch FROM alliance_joined_at)) AS j FROM bym."user" WHERE userid = ?`, [user.userid])
      .catch(() => [])) as { j: string | number | null }[];
    // (QoL #172: to an officer, when the leader hasn't been seen for 14 days: who may take the lead)
    let succession: object | undefined;
    if (user.alliance_role === AllianceRole.OFFICER) {
      const s = await ioSuccession(alliance.id);
      if (s) succession = { leader: s.leaderName, away: s.away, days: SUCCESSION_DAYS, candidate: s.candidateName, can_take: s.candidateId === user.userid };
    }
    extra = {
      outposts,
      empire,
      my_role: user.alliance_role ?? "member",
      // (13 October: the chat tag, and the one the name gives when none is set)
      tag: tagOf(alliance),
      tag_default: defaultTag(alliance.name),
      my_world: worldId,
      world_tag: worldTag(worldId),
      pins_top: pins.slice(0, 2),
      pin_count: pins.length,
      unread_pins: unread,
      week,
      my_joined: Number(joinedRows[0]?.j) || 0,
      rejoin_hours: IO_REJOIN_SEC / 3600,
      // (QoL #166: who can join: { mode: "open" | "request" | "invite", min_level })
      join_policy: await getJoinPolicy(alliance.id),
      // (16 October, QoL #174: what the leader lets officers do: { powerups, relations, description })
      officer_perms: officerPermsOf(alliance),
      ...(succession && { succession }),
    };
  }

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    alliance: {
      alliance_id: alliance.id,
      name: alliance.name,
      image: alliance.image,
      crest: alliance.crest ?? null,
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
