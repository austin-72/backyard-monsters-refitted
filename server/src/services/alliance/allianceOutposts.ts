import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { MapRoomCell, MapRoomVersion } from "../../enums/MapRoom.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { worldNames } from "../leaderboards/gameLeaderboards.js";
import { tribeForCell } from "../maproom/v2/tribeForCell.js";

/**
 * Inferno-only: the outposts an alliance's members gained and lost (the Alliances window's Outposts tab).
 * A takeover (controllers/maproom/v2/takeoverCell.ts) is written once for each side that is in an
 * alliance: "gained" for the taker's, "lost" for the previous owner's (a tribe's yard has no previous
 * owner). Kept KEEP_DAYS days. Raids that don't take the outpost are not kept (the user's call).
 */

export const KEEP_DAYS = 90;
const PAGE = 50;

const sql = <T>(query: string, params: unknown[] = []) => postgres.em.getConnection().execute<T[]>(query, params);

interface Party {
  userid: number;
  username: string;
  alliance_id?: number | null;
}

const allianceName = async (id: number | null | undefined) =>
  id ? (await sql<{ name: string }>(`SELECT name FROM bym.alliance WHERE id = ?`, [id]))[0]?.name ?? null : null;

/** A tribe's name for a cell (the yard's own tribe on the Map Room 2 map). */
export const tribeNameAt = (worldId: string, x: number, y: number) => {
  try {
    return String(tribeForCell(worldId, x, y).tribe ?? "a tribe");
  } catch {
    return "a tribe";
  }
};

/**
 * A takeover, written for the alliances on both sides. Never throws: the history must not fail the
 * takeover itself.
 */
export const recordTakeover = async (take: {
  worldId: string;
  x: number;
  y: number;
  baseid: string;
  taker: Party;
  previous: Party | null;
  tribeName?: string | null;
}) => {
  if (!infernoOnlyConfig.enabled) return;
  try {
    const { worldId, x, y, baseid, taker, previous } = take;
    const takerAlliance = taker.alliance_id ?? null;
    const previousAlliance = previous?.alliance_id ?? null;
    const [takerAllianceName, previousAllianceName] = await Promise.all([allianceName(takerAlliance), allianceName(previousAlliance)]);
    const insert = (allianceId: number, kind: string, source: string, user: Party, other: { id: number | null; name: string | null; allianceId: number | null; allianceName: string | null }) =>
      sql(
        `INSERT INTO bym.alliance_outpost_event (alliance_id, kind, source, user_id, user_name, other_user_id, other_name, other_alliance_id, other_alliance_name, world_id, x, y, baseid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [allianceId, kind, source, user.userid, user.username, other.id, other.name, other.allianceId, other.allianceName, worldId, x, y, baseid]
      );
    if (takerAlliance) {
      await insert(
        takerAlliance,
        "gained",
        previous ? "player" : "tribe",
        taker,
        previous
          ? { id: previous.userid, name: previous.username, allianceId: previousAlliance, allianceName: previousAllianceName }
          : { id: null, name: take.tribeName ?? tribeNameAt(worldId, x, y), allianceId: null, allianceName: null }
      );
    }
    if (previous && previousAlliance) {
      await insert(previousAlliance, "lost", "player", previous, {
        id: taker.userid,
        name: taker.username,
        allianceId: takerAlliance,
        allianceName: takerAllianceName,
      });
    }
    const touched = [takerAlliance, previousAlliance].filter((a): a is number => !!a);
    if (touched.length) {
      await sql(
        `DELETE FROM bym.alliance_outpost_event WHERE alliance_id IN (${touched.map(() => "?").join(",")}) AND created_at < now() - interval '${KEEP_DAYS} days'`,
        touched
      );
    }
  } catch (err) {
    logger.warn(`Alliance outpost history: the takeover at ${take.x},${take.y} could not be written: ${err}`);
  }
};

interface EventRow {
  id: string;
  kind: string;
  source: string;
  user_id: number | null;
  user_name: string;
  other_user_id: number | null;
  other_name: string | null;
  other_alliance_id: number | null;
  other_alliance_name: string | null;
  world_id: string | null;
  x: number;
  y: number;
  created_at: Date;
}

/**
 * The history, newest first, a page at a time (`before`: the last id of the page before), filtered by
 * kind (gained / lost), source (player / tribe), member (user id) and world. With it: gained, lost and
 * net for the last 7 and 30 days, and the members and worlds there are to filter by.
 */
export const outpostHistory = async (
  allianceId: number,
  q: { kind?: unknown; source?: unknown; member?: unknown; world?: unknown; before?: unknown }
) => {
  const where = ["alliance_id = ?", `created_at > now() - interval '${KEEP_DAYS} days'`];
  const params: unknown[] = [allianceId];
  if (q.kind === "gained" || q.kind === "lost") {
    where.push("kind = ?");
    params.push(q.kind);
  }
  if (q.source === "player" || q.source === "tribe") {
    where.push("source = ?");
    params.push(q.source);
  }
  const member = Number(q.member);
  if (Number.isSafeInteger(member) && member > 0) {
    where.push("user_id = ?");
    params.push(member);
  }
  if (typeof q.world === "string" && /^[0-9a-zA-Z-]{1,64}$/.test(q.world)) {
    where.push("world_id = ?");
    params.push(q.world);
  }
  const before = Number(q.before);
  if (Number.isSafeInteger(before) && before > 0) {
    where.push("id < ?");
    params.push(before);
  }
  const rows = await sql<EventRow>(
    `SELECT id, kind, source, user_id, user_name, other_user_id, other_name, other_alliance_id, other_alliance_name, world_id, x, y, created_at
       FROM bym.alliance_outpost_event WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ${PAGE + 1}`,
    params
  );
  const more = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const summary = await sql<{ days: number; gained: string; lost: string }>(
    `SELECT d.days,
            count(*) FILTER (WHERE e.kind = 'gained')::bigint AS gained,
            count(*) FILTER (WHERE e.kind = 'lost')::bigint AS lost
       FROM (VALUES (7), (30)) AS d(days)
       LEFT JOIN bym.alliance_outpost_event e ON e.alliance_id = ? AND e.created_at > now() - make_interval(days => d.days)
      GROUP BY d.days`,
    [allianceId]
  );
  const members = await sql<{ user_id: number; user_name: string }>(
    `SELECT DISTINCT ON (user_id) user_id, user_name FROM bym.alliance_outpost_event WHERE alliance_id = ? AND user_id IS NOT NULL ORDER BY user_id, id DESC`,
    [allianceId]
  );
  const worldIds = (await sql<{ world_id: string }>(`SELECT DISTINCT world_id FROM bym.alliance_outpost_event WHERE alliance_id = ? AND world_id IS NOT NULL`, [allianceId])).map((r) => r.world_id);
  const names = await worldNames(worldIds);
  const sum = (days: number) => {
    const r = summary.find((s) => Number(s.days) === days);
    const gained = Number(r?.gained ?? 0);
    const lost = Number(r?.lost ?? 0);
    return { gained, lost, net: gained - lost };
  };
  return {
    events: page.map((r) => ({
      id: Number(r.id),
      kind: r.kind,
      source: r.source,
      user_id: r.user_id,
      user_name: r.user_name,
      other_id: r.other_user_id,
      other_name: r.other_name,
      other_alliance: r.other_alliance_name,
      world_id: r.world_id,
      x: r.x,
      y: r.y,
      ts: Math.floor(new Date(r.created_at).getTime() / 1000),
    })),
    more,
    summary: { d7: sum(7), d30: sum(30) },
    members: members.map((m) => ({ id: Number(m.user_id), name: m.user_name })).sort((a, b) => a.name.localeCompare(b.name)),
    worlds: worldIds.map((id) => ({ id, name: names.get(id) ?? id })),
  };
};

/** Gained, lost and net over the last `days` days (the Overview tab's week). */
export const outpostTally = async (allianceId: number, days: number) => {
  const r = (
    await sql<{ gained: string; lost: string }>(
      `SELECT count(*) FILTER (WHERE kind = 'gained')::bigint AS gained, count(*) FILTER (WHERE kind = 'lost')::bigint AS lost
         FROM bym.alliance_outpost_event WHERE alliance_id = ? AND created_at > now() - make_interval(days => ?)`,
      [allianceId, days]
    )
  )[0];
  const gained = Number(r?.gained ?? 0);
  const lost = Number(r?.lost ?? 0);
  return { gained, lost, net: gained - lost };
};

/** Each player's outposts and empire value (their main yard's and outposts' together), from the map. */
export const holdingsOf = async (userIds: number[]): Promise<Map<number, { outposts: number; empire: number }>> => {
  const out = new Map<number, { outposts: number; empire: number }>();
  if (!userIds.length) return out;
  const rows = await sql<{ uid: number; outposts: string; empire: string }>(
    `SELECT c.uid,
            count(*) FILTER (WHERE c.base_type = ${MapRoomCell.OUTPOST})::bigint AS outposts,
            coalesce(sum(s.empirevalue), 0)::bigint AS empire
       FROM bym.world_map_cell c
       JOIN bym.save s ON s.cell_cellid = c.cellid
      WHERE c.uid IN (${userIds.map(() => "?").join(",")}) AND c.map_version = ${MapRoomVersion.V2}
        AND c.destroyed_at IS NULL AND c.base_type >= ${MapRoomCell.HOMECELL}
      GROUP BY c.uid`,
    userIds
  );
  for (const r of rows) out.set(Number(r.uid), { outposts: Number(r.outposts), empire: Number(r.empire) });
  return out;
};
