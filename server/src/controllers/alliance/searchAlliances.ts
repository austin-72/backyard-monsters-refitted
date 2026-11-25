import { QueryOrder, type FilterQuery, type QueryOrderMap } from "@mikro-orm/core";

import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { AllianceStance } from "../../enums/Alliance.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { SearchAlliancesSchema } from "../../schemas/AllianceSchemas.js";
import { findRelationships, findStancesToward, type RelationshipLookup } from "../../services/alliance/relationships.js";
import { getLeaderBaseIds } from "../../services/alliance/allianceLeaders.js";
import { getWorldMapVersion } from "../../services/maproom/knownWorlds.js";
import type { KoaController } from "../../utils/KoaController.js";
import { allianceNoWorldErr, unknownWorldErr } from "../../errors/errors.js";
import { tagOf } from "../../services/alliance/allianceTag.js";
import { MAX_ALLIANCE_MEMBERS } from "../../config/AllianceConfig.js";
import { BaseType } from "../../enums/Base.js";
import { getLastSeenVisible } from "../../services/maproom/getLastSeen.js";
import { getJoinPolicies, DEFAULT_JOIN_POLICY, type JoinPolicy } from "../../services/alliance/ioJoinPolicy.js";

const PAGE_SIZE = 10;

/**
 * Search alliances for the Browse tab - a leaderboard the client
 * paginates 10 rows at a time.
 *
 * "This World" narrows to the player's own world; "All" spans every world on their
 * Map Room version. Neither ever crosses versions.
 *
 * @param {Context} ctx - Koa context.
 */
export const searchAlliances: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { search, page, world } = SearchAlliancesSchema.parse(ctx.request.body);

  const where: FilterQuery<Alliance> = {};

  // (Inferno-only, QoL #170: by name or by its chat tag)
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    if (infernoOnlyConfig.enabled) where.$or = [{ name: { $ilike: like } }, { tag: { $ilike: like } }];
    else where.name = { $ilike: `%${search}%` };
  }

  await postgres.em.populate(user, ["save"], { fields: ["save.worldid"] });

  const worldid = user.save?.worldid;

  if (!worldid) throw allianceNoWorldErr();

  if (world) {
    where.world_id = worldid;
  } else {
    const mapVersion = await getWorldMapVersion(worldid);

    if (mapVersion === undefined) throw unknownWorldErr();

    where.map_version = mapVersion;
  }

  // (Inferno: by empire value, as the leaderboards rank players)
  const orderBy: QueryOrderMap<Alliance> = infernoOnlyConfig.enabled
    ? { stats: { empire_value: QueryOrder.DESC }, id: QueryOrder.ASC }
    : { stats: { empire_points: QueryOrder.DESC }, id: QueryOrder.ASC };

  const searchOptions = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    orderBy,
    populate: ["stats"],
  } as const;

  const [alliances, totalResults] = await postgres.em.findAndCount(Alliance, where, searchOptions);

  const leaderIds = alliances.map((alliance) => alliance.leader_userid);
  const leaders = await getLeaderBaseIds(leaderIds);

  const allianceIds = alliances.map((alliance) => alliance.id);
  const relationships: RelationshipLookup = await findRelationships(user.alliance_id, allianceIds);
  // (Inferno-only, QoL #176: and how each has flagged the player's own alliance)
  const theirs: RelationshipLookup = infernoOnlyConfig.enabled ? await findStancesToward(user.alliance_id, allianceIds) : new Map();

  // (Inferno-only, QoL #170: how many of each are online now: one read of the page's members (50 at most each) and
  // one Redis MGET, as the Members tab counts them, without those who chose to appear offline)
  const onlineBy = new Map<number, number>();
  if (infernoOnlyConfig.enabled && allianceIds.length) {
    const members = await postgres.em.find(User, { alliance_id: { $in: allianceIds } }, { fields: ["userid", "alliance_id"] });
    const seen = await getLastSeenVisible(members.map((m) => m.userid), BaseType.MAIN);
    for (const m of members) {
      if (m.alliance_id && seen.has(m.userid)) onlineBy.set(m.alliance_id, (onlineBy.get(m.alliance_id) ?? 0) + 1);
    }
  }

  // (Inferno-only, QoL #166: each one's join policy, in one Redis MGET)
  const policies = infernoOnlyConfig.enabled ? await getJoinPolicies(allianceIds) : new Map<number, JoinPolicy>();

  const rankField = infernoOnlyConfig.enabled ? (world ? "value_world_rank" : "value_global_rank") : world ? "world_rank" : "global_rank";

  const results = alliances.map((alliance) => ({
    alliance_id: alliance.id,
    name: alliance.name,
    image: alliance.image,
    crest: alliance.crest ?? null,
    members: alliance.stats?.member_count,
    leader_name: alliance.leader_name,
    leader_baseid: leaders.get(alliance.leader_userid),
    rank: alliance.stats?.[rankField],
    relationship: relationships.get(alliance.id) ?? AllianceStance.NEUTRAL,
    ep: infernoOnlyConfig.enabled ? alliance.stats?.empire_value : alliance.stats?.empire_points,
    // (Inferno-only, QoL #170: its tag, and the most members it can have)
    // (and, QoL #170, members online and the start of its description)
    ...(infernoOnlyConfig.enabled && {
      tag: tagOf(alliance),
      max_members: MAX_ALLIANCE_MEMBERS,
      online: onlineBy.get(alliance.id) ?? 0,
      description: String(alliance.description ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
      their_stance: theirs.get(alliance.id) ?? AllianceStance.NEUTRAL,
      join_mode: (policies.get(alliance.id) ?? DEFAULT_JOIN_POLICY).mode,
      min_level: (policies.get(alliance.id) ?? DEFAULT_JOIN_POLICY).min_level,
    }),
  }));

  ctx.status = Status.OK;
  ctx.body = { error: 0, alliances: results, pageSize: PAGE_SIZE, totalResults };
};
