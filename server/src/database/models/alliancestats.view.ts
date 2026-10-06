import { BigIntType } from "@mikro-orm/core";
import { Entity, OneToOne, Property } from "@mikro-orm/decorators/es";

import { Alliance } from "./alliance.model.js";

/**
 * The bym.alliance_stats view: an alliance's standing, derived from its members.
 *
 * Nothing is stored on the alliance row, because these totals move whenever any member
 * builds, upgrades or is raided - none of which is an alliance event. A cached column
 * could only be refreshed on joins and leaves, the rare half of what changes it, so it
 * would drift from the day it was written.
 *
 * The totals are gathered in an inner query so the ranks can order by the alias rather
 * than repeat the sum: a window function cannot see a select alias from its own level.
 *
 * save_basesaveid already points at a member's main yard, but the type filter stays -
 * nothing enforces that invariant, and an outpost slipping in would inflate every total.
 *
 * Inferno-only alliances rank by empire value instead (migration 20261007_AllianceEmpireValue): the value
 * of every member's main yard and outposts on the alliance's map, as the leaderboards count it. The stock
 * game keeps empire_points and its ranks.
 */

const ALLIANCE_STATS_VIEW = `
  SELECT
    alliance_id,
    member_count,
    empire_points,
    rank() over (PARTITION BY world_id    ORDER BY empire_points DESC)::int AS world_rank,
    rank() over (PARTITION BY map_version ORDER BY empire_points DESC)::int AS global_rank,
    empire_value,
    rank() over (PARTITION BY world_id    ORDER BY empire_value DESC)::int AS value_world_rank,
    rank() over (PARTITION BY map_version ORDER BY empire_value DESC)::int AS value_global_rank
  FROM (
    SELECT
      a.id AS alliance_id,
      a.world_id,
      a.map_version,
      count(u.userid)::int AS member_count,
      coalesce(sum(s.points::numeric + s.basevalue::numeric), 0)::bigint AS empire_points,
      coalesce(sum(v.value), 0)::bigint AS empire_value
    FROM bym.alliance a
    LEFT JOIN bym."user" u ON u.alliance_id = a.id
    LEFT JOIN bym.save s ON u.save_basesaveid = s.basesaveid AND s.type = 'main'
    LEFT JOIN LATERAL (
      SELECT sum(cs.empirevalue::numeric) AS value
        FROM bym.world_map_cell c
        JOIN bym.save cs ON cs.cell_cellid = c.cellid
       WHERE c.uid = u.userid AND c.map_version = a.map_version AND c.destroyed_at IS NULL AND c.base_type >= 2
    ) v ON true
    GROUP BY a.id, a.world_id, a.map_version
  ) totals
`;

@Entity({ tableName: "alliance_stats", view: true, expression: ALLIANCE_STATS_VIEW })
export class AllianceStats {
  @OneToOne({ entity: () => Alliance, primary: true, fieldName: "alliance_id", owner: true })
  alliance!: Alliance;

  @Property({ type: "number" })
  member_count!: number;

  @Property({ type: new BigIntType("number") })
  empire_points!: number;

  @Property({ type: "number" })
  world_rank!: number;

  @Property({ type: "number" })
  global_rank!: number;

  /** Inferno: the members' main yards and outposts on the map, by save.empirevalue. */
  @Property({ type: new BigIntType("number") })
  empire_value!: number;

  @Property({ type: "number" })
  value_world_rank!: number;

  @Property({ type: "number" })
  value_global_rank!: number;
}
