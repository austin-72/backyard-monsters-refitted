import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only alliances rank by empire value (the user's call, 2 October), as the leaderboards do: the
 * value of every member's main yard and outposts on the alliance's map, not their empire points.
 *
 * bym.alliance_stats keeps its columns and gains three at the end (Postgres replaces a view only when
 * the old columns stay where they were): empire_value, and the two ranks by it. The stock game still reads
 * empire_points and its ranks.
 *
 * The value is what services/alliance/allianceOutposts.ts holdingsOf adds up: save.empirevalue of every
 * live cell (main yard or outpost) the member owns on the alliance's map version.
 *
 * Kept in step with database/models/alliancestats.view.ts (its expression is this same SELECT).
 */
const VIEW = `
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

const OLD_VIEW = `
  SELECT
    alliance_id,
    member_count,
    empire_points,
    rank() over (PARTITION BY world_id    ORDER BY empire_points DESC)::int AS world_rank,
    rank() over (PARTITION BY map_version ORDER BY empire_points DESC)::int AS global_rank
  FROM (
    SELECT
      a.id AS alliance_id,
      a.world_id,
      a.map_version,
      count(u.userid)::int AS member_count,
      coalesce(sum(s.points::numeric + s.basevalue::numeric), 0)::bigint AS empire_points
    FROM bym.alliance a
    LEFT JOIN bym."user" u ON u.alliance_id = a.id
    LEFT JOIN bym.save s ON u.save_basesaveid = s.basesaveid AND s.type = 'main'
    GROUP BY a.id, a.world_id, a.map_version
  ) totals
`;

export class AllianceEmpireValue extends Migration {
  async up(): Promise<void> {
    await this.execute(`CREATE OR REPLACE VIEW bym.alliance_stats AS ${VIEW}`);
  }

  async down(): Promise<void> {
    // (a view can't lose columns in place)
    await this.execute(`DROP VIEW IF EXISTS bym.alliance_stats`);
    await this.execute(`CREATE VIEW bym.alliance_stats AS ${OLD_VIEW}`);
  }
}
