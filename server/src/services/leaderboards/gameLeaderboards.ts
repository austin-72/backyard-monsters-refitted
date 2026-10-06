import { createHash } from "crypto";
import { brotliCompress, constants, gzip } from "zlib";
import { promisify } from "util";

import { MapRoomCell, MapRoomVersion } from "../../enums/MapRoom.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { configuredAdmins } from "../admin/admin.js";
import { lazyEncoding, type LazyEncoding } from "../maproom/v2/bulk/terrainMap.js";
import {
  getWorldSnapshot,
  onSnapshotCycle,
  snapshotWorlds,
  SNAPSHOT_CYCLE_SECONDS,
} from "../maproom/v2/bulk/worldSnapshot.js";

/**
 * Inferno-only: the game's leaderboards (the top bar's button: com/monsters/leaderboards/IoLeaderboards.as).
 * A second snapshot, made from every world's map snapshot (services/maproom/v2/bulk/worldSnapshot.ts) at the
 * start of each 5-minute cycle of their clock, plus the Brimstone Pit's ledger. One payload for every
 * player, so a cycle costs a few queries however many look; the game comes back for the next at `nextAt`.
 *
 *  - worlds:    [[id, name]]: every world with players; a world is named after the owner of its cell 0x0
 *               (the server's own name for it, or "World n", when nobody owns that cell);
 *  - players:   [[uid, name, world, alliance, outposts, empire value, home x, home y]]: every player with
 *               a yard on a world map; the empire value is the main yard's and every outpost's together;
 *  - alliances: [[id, name, image, world, [member uids]]]: the members among `players` (the game adds up
 *               their outposts and empire values);
 *  - gamblers:  [[uid, name, world, total gambled, lifetime net, bets]]: everyone with a settled bet in the
 *               Pit (refunded and unfinished bets don't count); world -1: not on a map.
 *
 * Admins (InfernoOnlyConfig.admins) are on none of the lists (the user's call, 2 October): their test mode
 * makes outposts and Shiny that aren't really theirs. World indexes are into `worlds`.
 */

interface Board {
  raw: Buffer;
  brotli: LazyEncoding;
  gzip: LazyEncoding;
  generatedAt: number;
  nextAt: number;
}

type PlayerRow = [number, string, number, number, number, number, number, number];

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

const CYCLE_MS = SNAPSHOT_CYCLE_SECONDS * 1000;

let current: Promise<Board> | null = null;

/** The admins' user ids (by their configured names). */
const adminIds = async (): Promise<Set<number>> => {
  const names = configuredAdmins();
  if (!names.length) return new Set();
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number }[]>(`SELECT userid FROM bym."user" WHERE username IN (${names.map(() => "?").join(",")})`, names);
  return new Set(rows.map((row) => Number(row.userid)));
};

/** Each world's name: the owner of its cell 0x0. */
export const worldNames = async (worlds: string[]): Promise<Map<string, string>> => {
  const names = new Map<string, string>();
  if (!worlds.length) return names;
  const connection = postgres.em.getConnection();
  const owners = await connection.execute<{ world_id: string; username: string }[]>(
    `SELECT c.world_id, u.username
       FROM bym.world_map_cell c
       JOIN bym."user" u ON u.userid = c.uid
      WHERE c.x = 0 AND c.y = 0 AND c.map_version = ${MapRoomVersion.V2} AND c.uid > 0 AND c.destroyed_at IS NULL
        AND c.world_id IN (${worlds.map(() => "?").join(",")})`,
    worlds
  );
  for (const row of owners) if (row.username) names.set(row.world_id, row.username);
  const own = await connection.execute<{ uuid: string; name: string | null }[]>(
    `SELECT uuid, name FROM bym.world WHERE uuid IN (${worlds.map(() => "?").join(",")})`,
    worlds
  );
  for (const row of own) if (!names.has(row.uuid) && row.name) names.set(row.uuid, row.name);
  worlds.forEach((worldid, i) => {
    if (!names.has(worldid)) names.set(worldid, `World ${i + 1}`);
  });
  return names;
};

const build = async (generatedAt: number, nextAt: number): Promise<Board> => {
  const worlds = await snapshotWorlds();
  const names = await worldNames(worlds);
  const admins = await adminIds();
  const worldIndex = new Map<string, number>(worlds.map((worldid, i) => [worldid, i]));

  const players: PlayerRow[] = [];
  const alliances: [number, string, number, number, number[]][] = [];
  for (const [w, worldid] of worlds.entries()) {
    let snapshot;
    try {
      snapshot = await getWorldSnapshot(worldid);
    } catch (err) {
      logger.warn(`Leaderboards: world ${worldid} has no map snapshot: ${err}`);
      continue;
    }
    const { players: owners, alliances: groups, cells } = snapshot.data;
    const totals = new Map<number, { outposts: number; empire: number; x: number; y: number }>();
    for (const cell of cells) {
      const [x, y, baseType, uid, , empireValue] = cell;
      if (baseType < MapRoomCell.HOMECELL || uid <= 0 || admins.has(uid)) continue;
      const entry = totals.get(uid) ?? { outposts: 0, empire: 0, x: -1, y: -1 };
      entry.empire += Number(empireValue) || 0;
      if (baseType === MapRoomCell.OUTPOST) entry.outposts += 1;
      else {
        entry.x = x;
        entry.y = y;
      }
      totals.set(uid, entry);
    }
    for (const [uid, entry] of totals) {
      const owner = owners[uid];
      if (!owner) continue;
      players.push([uid, owner.name, w, owner.alliance || 0, entry.outposts, entry.empire, entry.x, entry.y]);
    }
    for (const [id, group] of Object.entries(groups)) {
      const members = group.members.filter((uid) => totals.has(uid) && owners[uid]);
      if (members.length) alliances.push([Number(id), group.name, group.image, w, members]);
    }
  }

  const bets = await postgres.em.getConnection().execute<{ user_id: number; username: string; worldid: string | null; wagered: string; net: string; bets: string }[]>(
    `SELECT b.user_id, u.username, s.worldid,
            SUM(b.stake)::bigint AS wagered, SUM(b.payout - b.stake)::bigint AS net, COUNT(*)::bigint AS bets
       FROM bym.casino_bet b
       JOIN bym."user" u ON u.userid = b.user_id
       LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
      WHERE b.status = 'settled'
      GROUP BY b.user_id, u.username, s.worldid`
  );
  const gamblers = bets
    .filter((row) => !admins.has(Number(row.user_id)))
    .map((row) => [Number(row.user_id), row.username, row.worldid ? worldIndex.get(String(row.worldid)) ?? -1 : -1, Number(row.wagered), Number(row.net), Number(row.bets)]);

  const body =
    `{"error":0,"generatedAt":${generatedAt},"nextAt":${nextAt},` +
    `"worlds":${JSON.stringify(worlds.map((worldid) => [worldid, names.get(worldid) ?? worldid]))},` +
    `"players":${JSON.stringify(players)},"alliances":${JSON.stringify(alliances)},"gamblers":${JSON.stringify(gamblers)}}`;
  const raw = Buffer.from(body);
  logger.info(
    `Leaderboards: ${players.length} players, ${alliances.length} alliances, ${gamblers.length} gamblers on ${worlds.length} worlds (${createHash("sha1").update(raw).digest("hex").slice(0, 8)}, ${raw.length} bytes)`
  );
  return {
    raw,
    brotli: lazyEncoding(() => compressBrotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })),
    gzip: lazyEncoding(() => compressGzip(raw, { level: 6 })),
    generatedAt,
    nextAt,
  };
};

/** The leaderboards now: the last cycle's (made at once when there are none yet, after a restart). */
export const getGameLeaderboards = (): Promise<Board> => {
  if (!current) {
    const now = Date.now();
    const next = Math.floor(now / CYCLE_MS) * CYCLE_MS + CYCLE_MS;
    const made = build(Math.floor(now / 1000), Math.ceil(next / 1000));
    made.catch(() => {
      if (current === made) current = null;
    });
    current = made;
  }
  return current;
};

/** Startup: made again at the start of every cycle of the map snapshots' clock (the old one is served meanwhile). */
export const startLeaderboards = () => {
  onSnapshotCycle((cycleStart) => {
    build(Math.floor(cycleStart / 1000), Math.ceil((cycleStart + CYCLE_MS) / 1000))
      .then((board) => {
        current = Promise.resolve(board);
      })
      .catch((err) => logger.warn(`Leaderboards could not be made: ${err}`));
  });
};
