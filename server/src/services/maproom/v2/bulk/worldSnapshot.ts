import { createHash } from "crypto";
import { brotliCompress, constants, gzip } from "zlib";
import { promisify } from "util";

import { MapRoom2, MapRoomCell, MapRoomVersion, Terrain } from "../../../../enums/MapRoom.js";
import { BaseType } from "../../../../enums/Base.js";
import { Tribe, Tribes } from "../../../../enums/Tribes.js";
import { AllianceStance } from "../../../../enums/Alliance.js";
import { Alliance } from "../../../../database/models/alliance.model.js";
import { AllianceRelationship } from "../../../../database/models/alliancerelationship.model.js";
import { postgres } from "../../../../server.js";
import { calculateBaseLevel } from "../../../base/calculateBaseLevel.js";
import { ATTACK_TIMEOUT } from "../../../base/isAttackActive.js";
import { getLastSeen } from "../../getLastSeen.js";
import { generateBaseId } from "../../../../utils/generateBaseId.js";
import { MOLOCH_INDEX, tribeForCell } from "../tribeForCell.js";
import { getTerrainMap, lazyEncoding, type LazyEncoding } from "./terrainMap.js";
import { portalsFor, underworldOn } from "../underworld.js";
import { logger } from "../../../../utils/logger.js";

/**
 * The Map Room 2 world snapshot: everything about a world's map that is the same for every viewer, in
 * one payload, rebuilt on a fixed 5-minute clock (startSnapshotClock): each world has its own moment in
 * the five minutes, so the worlds are rebuilt one after the other through the cycle rather than all at
 * once, and every snapshot says when the next one of its world is due (`nextAt`), for the game to come back
 * then (and not before). A world asked for before it has one (after a restart, a new world) gets one at
 * once, then joins the clock.
 *
 *  - cells: every player main yard and outpost, and every wild monster yard that is damaged or
 *    destroyed (an untouched one is exactly what the coordinates say), with its level;
 *  - players: the owners, with their level and alliance;
 *  - alliances: the world's alliances, with members and the relationships they have set.
 *
 * Served to API consumers by /worldmapv2/snapshot, and to the game by /worldmapv2/mapdata, which can add
 * the world's fixed layers (terrain, and which tribe at which level lives on every cell) so the game has
 * the whole map the moment the map room opens; getarea then only fills in what is per viewer or newer
 * for the part on screen. Built with a few queries per world per 5 minutes however many players look.
 * The leaderboards (services/leaderboards/gameLeaderboards.ts) are made from every world's snapshot.
 */

export interface EncodedPayload {
  raw: Buffer;
  brotli: LazyEncoding;
  gzip: LazyEncoding;
  etag: string;
  generatedAt: number;
}

export interface WorldSnapshot extends EncodedPayload {
  /** The JSON object's members without the braces, to build the game's reply around. */
  body: string;
  /** When this world's next snapshot is due (seconds). */
  nextAt: number;
  /** The same, as objects (the leaderboards read them). */
  data: { worldid: string; players: Record<number, SnapshotPlayer>; alliances: Record<number, SnapshotAlliance>; cells: SnapshotCell[] };
}

export interface SnapshotPlayer {
  name: string;
  avatar: string | null;
  alliance: number;
  level: number;
}

export interface SnapshotAlliance {
  name: string;
  image: number;
  leader: number;
  members: number[];
  relationships: Record<number, AllianceStance>;
}

export type SnapshotCell = [
  x: number,
  y: number,
  baseType: number,
  uid: number,
  baseid: string,
  empireValue: number,
  flinger: number,
  catapult: number,
  damage: number,
  protectedUntil: number,
  destroyed: number,
  level: number,
  locked: number,
  terrain: number,
];

interface CellRow {
  x: number;
  y: number;
  base_type: number;
  uid: number;
  baseid: string;
  empirevalue: number;
  flinger: number;
  catapult: number;
  damage: number;
  protected: number;
  destroyed: number;
  locked: number;
  terrain_height: number;
  attackid: number;
  last_attack: string | null;
}

interface OwnerRow {
  userid: number;
  username: string;
  pic_square: string | null;
  alliance_id: number;
  points: string | null;
  basevalue: string | null;
}

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

/** Rebuilt once every 5 minutes: the map may be 5 minutes behind; getarea brings the part on screen up to date. */
export const SNAPSHOT_CYCLE_SECONDS = 300;

const CYCLE_MS = SNAPSHOT_CYCLE_SECONDS * 1000;

export const SNAPSHOT_MAX_AGE_SECONDS = SNAPSHOT_CYCLE_SECONDS;

const encode = (raw: Buffer, etag: string, generatedAt: number): EncodedPayload => ({
  raw,
  brotli: lazyEncoding(() => compressBrotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })),
  gzip: lazyEncoding(() => compressGzip(raw, { level: 6 })),
  etag,
  generatedAt,
});

const integerList = (ids: number[]) => ids.filter((id) => Number.isInteger(id) && id > 0).join(",");

const buildSnapshot = async (worldid: string, nextAt: number): Promise<WorldSnapshot> => {
  const connection = postgres.em.getConnection();
  const now = Math.floor(Date.now() / 1000);

  const rows = await connection.execute<CellRow[]>(
    `SELECT c.x, c.y, c.base_type, c.uid, c.baseid, c.terrain_height,
            coalesce(s.empirevalue, 0) AS empirevalue, coalesce(s.flinger, 0) AS flinger,
            coalesce(s.catapult, 0) AS catapult, coalesce(s.damage, 0) AS damage,
            coalesce(s.protected, 0) AS protected, coalesce(s.destroyed, 0) AS destroyed,
            coalesce(s.locked, 0) AS locked, coalesce(s.attackid, 0) AS attackid,
            CASE WHEN jsonb_typeof(s.attacks) = 'array' THEN s.attacks -> -1 ->> 'starttime' END AS last_attack
       FROM bym.world_map_cell c
       JOIN bym.save s ON s.cell_cellid = c.cellid
      WHERE c.world_id = ? AND c.map_version = ${MapRoomVersion.V2} AND c.destroyed_at IS NULL
        AND c.base_type >= ${MapRoomCell.WM}
        AND (c.base_type >= ${MapRoomCell.HOMECELL} OR s.damage > 0 OR s.destroyed > 0)
      ORDER BY c.x, c.y`,
    [worldid]
  );

  const ownerIds = [...new Set(rows.map((row) => row.uid).filter((uid) => uid > 0))];
  const owners = ownerIds.length
    ? await connection.execute<OwnerRow[]>(
        `SELECT u.userid, u.username, u.pic_square, coalesce(u.alliance_id, 0) AS alliance_id, m.points, m.basevalue
           FROM bym."user" u
           LEFT JOIN bym.save m ON m.basesaveid = u.save_basesaveid
          WHERE u.userid IN (${integerList(ownerIds)})`
      )
    : [];

  const players: Record<number, SnapshotPlayer> = {};
  for (const owner of owners) {
    players[owner.userid] = {
      name: owner.username,
      avatar: owner.pic_square,
      alliance: owner.alliance_id || 0,
      level: calculateBaseLevel(owner.points ?? "0", owner.basevalue ?? "0"),
    };
  }

  // A main yard whose owner is playing, or under attack, can't be attacked: "locked", as getarea says.
  const homeOwners = rows.filter((row) => row.base_type === MapRoomCell.HOMECELL).map((row) => row.uid);
  const lastSeen = await getLastSeen([...new Set(homeOwners)], BaseType.MAIN);

  const cells: SnapshotCell[] = rows.map((row) => {
    const isPlayer = row.base_type >= MapRoomCell.HOMECELL;
    let locked = row.locked || 0;
    if (row.base_type === MapRoomCell.HOMECELL) {
      const online = (lastSeen.get(row.uid) ?? 0) >= now - 60;
      const lastAttack = Number(row.last_attack) || 0;
      const underAttack = row.attackid !== 0 && lastAttack > 0 && now - lastAttack < ATTACK_TIMEOUT;
      if (online || underAttack) locked = 1;
    }
    const level = isPlayer ? players[row.uid]?.level ?? 1 : tribeForCell(worldid, row.x, row.y).level;
    return [
      row.x, row.y, row.base_type, row.uid, row.baseid,
      row.empirevalue, row.flinger, row.catapult, row.damage, row.protected, row.destroyed,
      level, locked, row.terrain_height,
    ];
  });

  // The world's alliances, with members and the relationships they have set.
  const alliances: Record<number, SnapshotAlliance> = {};
  const allianceRows = await postgres.em
    .createQueryBuilder(Alliance, "a")
    .select(["a.id", "a.name", "a.image", "a.leader_userid"])
    .where({ world_id: worldid, map_version: MapRoomVersion.V2 })
    .execute<{ id: number; name: string; image: number; leader_userid: number }[]>("all");
  for (const row of allianceRows) {
    alliances[row.id] = { name: row.name, image: row.image, leader: row.leader_userid, members: [], relationships: {} };
  }
  const allianceIds = allianceRows.map((row) => row.id);
  if (allianceIds.length) {
    const members = await connection.execute<{ userid: number; alliance_id: number }[]>(
      `SELECT userid, alliance_id FROM bym."user" WHERE alliance_id IN (${integerList(allianceIds)}) ORDER BY alliance_id, userid`
    );
    for (const member of members) alliances[member.alliance_id]?.members.push(member.userid);
    const flags = await postgres.em
      .createQueryBuilder(AllianceRelationship, "r")
      .select(["r.alliance", "r.targetAlliance", "r.relationship"])
      .where({ alliance: { $in: allianceIds } })
      .execute<{ alliance: number; targetAlliance: number; relationship: AllianceStance }[]>("all");
    for (const flag of flags) {
      const alliance = alliances[flag.alliance];
      if (alliance) alliance.relationships[flag.targetAlliance] = flag.relationship;
    }
  }

  const body = `"worldid":${JSON.stringify(worldid)},"nextAt":${nextAt},"width":${MapRoom2.WIDTH},"height":${MapRoom2.HEIGHT},` +
    `"players":${JSON.stringify(players)},"alliances":${JSON.stringify(alliances)},"cells":${JSON.stringify(cells)}`;
  const etag = `"snapshot-${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;
  const generatedAt = now;
  const raw = Buffer.from(`{"generatedAt":${generatedAt},${body}}`);

  return { ...encode(raw, etag, generatedAt), body: `"generatedAt":${generatedAt},${body}`, nextAt, data: { worldid, players, alliances, cells } };
};

interface CachedSnapshot {
  builtAt: number;
  snapshot: Promise<WorldSnapshot>;
  /** The game's replies built from it: with and without the fixed layers. */
  game: Map<string, Promise<EncodedPayload>>;
}

const snapshotCache = new Map<string, CachedSnapshot>();

// ---------------------------------------------------------------------------------------------
// The 5-minute clock
// ---------------------------------------------------------------------------------------------

/** Each world's moment in the cycle (ms after the cycle starts), spread evenly over the five minutes. */
const slots = new Map<string, number>();

const cycleStartOf = (ms: number) => Math.floor(ms / CYCLE_MS) * CYCLE_MS;

/** When the world's next scheduled snapshot is due after `afterMs` (seconds). */
const nextSlotAt = (worldid: string, afterMs: number) => {
  let at = cycleStartOf(afterMs) + (slots.get(worldid) ?? CYCLE_MS / 2);
  if (at <= afterMs) at += CYCLE_MS;
  return Math.ceil(at / 1000);
};

const cachedSnapshot = (worldid: string): CachedSnapshot => {
  const cached = snapshotCache.get(worldid);
  if (cached) return cached;

  // A world without one yet (after a restart, or a new world): made now, then kept up by the clock.
  const fresh: CachedSnapshot = { builtAt: Date.now(), snapshot: buildSnapshot(worldid, nextSlotAt(worldid, Date.now())), game: new Map() };
  fresh.snapshot.catch(() => {
    if (snapshotCache.get(worldid) === fresh) snapshotCache.delete(worldid);
  });
  snapshotCache.set(worldid, fresh);
  return fresh;
};

/** The clock's rebuild of one world: the old snapshot is served until the new one is ready. */
const rebuild = async (worldid: string, nextAt: number) => {
  try {
    const snapshot = await buildSnapshot(worldid, nextAt);
    snapshotCache.set(worldid, { builtAt: Date.now(), snapshot: Promise.resolve(snapshot), game: new Map() });
  } catch (err) {
    logger.warn(`Map snapshot of world ${worldid} could not be rebuilt: ${err}`);
  }
};

/** The worlds with players (Map Room 2), the order their moments in the cycle go in. */
export const snapshotWorlds = async (): Promise<string[]> =>
  (
    await postgres.em.getConnection().execute<{ uuid: string }[]>(
      `SELECT uuid FROM bym.world WHERE map_version = ${MapRoomVersion.V2} AND player_count > 0 ORDER BY created_at, uuid`
    )
  ).map((row) => row.uuid);

const cycleListeners: ((cycleStart: number) => void)[] = [];

/** Told at the start of every cycle (ms), with the snapshots of the cycle before in hand. */
export const onSnapshotCycle = (listener: (cycleStart: number) => void) => {
  cycleListeners.push(listener);
};

const planSlots = (worlds: string[]) => {
  slots.clear();
  worlds.forEach((worldid, i) => slots.set(worldid, Math.floor(((i + 0.5) * CYCLE_MS) / Math.max(1, worlds.length))));
};

const runCycle = async (cycleStart: number) => {
  setTimeout(() => runCycle(cycleStart + CYCLE_MS), Math.max(0, cycleStart + CYCLE_MS - Date.now()));
  let worlds: string[] = [];
  try {
    worlds = await snapshotWorlds();
  } catch (err) {
    logger.warn(`Map snapshots: the worlds could not be listed: ${err}`);
    return;
  }
  planSlots(worlds);
  for (const listener of cycleListeners) {
    try {
      listener(cycleStart);
    } catch (err) {
      logger.warn(`Map snapshot cycle listener failed: ${err}`);
    }
  }
  for (const worldid of worlds) {
    const at = cycleStart + (slots.get(worldid) ?? 0);
    setTimeout(() => rebuild(worldid, Math.ceil((at + CYCLE_MS) / 1000)), Math.max(0, at - Date.now()));
  }
};

/**
 * Startup: the clock. The worlds' moments are planned at once (for the `nextAt` of a snapshot made on
 * demand before the first cycle); the first cycle starts at the next 5-minute mark.
 */
export const startSnapshotClock = async () => {
  try {
    planSlots(await snapshotWorlds());
  } catch (err) {
    logger.warn(`Map snapshots: the worlds could not be listed: ${err}`);
  }
  const next = cycleStartOf(Date.now()) + CYCLE_MS;
  setTimeout(() => runCycle(next), next - Date.now());
};

/** A world's snapshot (API consumers, the leaderboards): the clock's latest. */
export const getWorldSnapshot = (worldid: string): Promise<WorldSnapshot> => cachedSnapshot(worldid).snapshot;

// ---------------------------------------------------------------------------------------------
// The world's fixed layers, for the game
// ---------------------------------------------------------------------------------------------

/**
 * Terrain and tribes never change for a world, so they are built once per world per process. Each layer
 * is a string with one character per cell, index x * height + y, character code 48 + value:
 *  - t: the terrain height (0-255; 99 and below is lava, "water");
 *  - w: 128 * tribe + level for land cells: tribe 0-3 as in `tribes`, 5 Moloch; level 0-127.
 * JSON keeps these characters as they are (UTF-8), and they compress well.
 */
const CODE_BASE = 48;

const staticCache = new Map<string, Promise<string>>();

const buildStatic = async (worldid: string): Promise<string> => {
  const terrain = (await getTerrainMap(worldid)).raw;
  const width = MapRoom2.WIDTH;
  const height = MapRoom2.HEIGHT;
  const t: string[] = new Array(width);
  const w: string[] = new Array(width);
  for (let x = 0; x < width; x++) {
    const tRow: number[] = new Array(height);
    const wRow: number[] = new Array(height);
    for (let y = 0; y < height; y++) {
      const h = terrain[x * height + y];
      tRow[y] = CODE_BASE + h;
      if (h <= Terrain.WATER3) {
        wRow[y] = CODE_BASE;
      } else {
        const { tribeIndex, level } = tribeForCell(worldid, x, y);
        wRow[y] = CODE_BASE + tribeIndex * 128 + Math.max(0, Math.min(127, level));
      }
    }
    t[x] = String.fromCharCode(...tRow);
    w[x] = String.fromCharCode(...wRow);
    // A world is 160,000 tribe lookups: let other requests in now and then.
    if (x % 20 === 19) await new Promise((resolve) => setImmediate(resolve));
  }
  const tribes: string[] = [...Tribes.map(String)];
  while (tribes.length < MOLOCH_INDEX) tribes.push("");
  tribes[MOLOCH_INDEX] = Tribe.MOLOCH;
  const bidPrefix = generateBaseId(worldid, 0, 0).slice(0, -6);
  // Inferno-only: the portals to the Depths of Hell ([overworld x, y, underworld x, y], fixed for a world), for
  // the zoomed-out world map and the minimap
  const portals = underworldOn() ? portalsFor(worldid).map((p) => [p.x, p.y, p.ux, p.uy]) : [];
  return JSON.stringify({ worldid, bidPrefix, tribes, t: t.join(""), w: w.join(""), portals });
};

const getStatic = (worldid: string): Promise<string> => {
  let layers = staticCache.get(worldid);
  if (!layers) {
    layers = buildStatic(worldid);
    layers.catch(() => staticCache.delete(worldid));
    staticCache.set(worldid, layers);
  }
  return layers;
};

/**
 * The game's reply for /worldmapv2/mapdata: { error: 0, ...snapshot, static?: fixed layers }. The fixed
 * layers are sent when the game asks for them (once per world per session).
 */
export const getGameMapData = (worldid: string, withLayers: boolean): Promise<EncodedPayload> => {
  const cached = cachedSnapshot(worldid);
  const key = withLayers ? "layers" : "plain";
  let reply = cached.game.get(key);
  if (!reply) {
    reply = (async () => {
      const snapshot = await cached.snapshot;
      const layers = withLayers ? `,"static":${await getStatic(worldid)}` : "";
      const raw = Buffer.from(`{"error":0,${snapshot.body}${layers}}`);
      return encode(raw, snapshot.etag, snapshot.generatedAt);
    })();
    reply.catch(() => cached.game.delete(key));
    cached.game.set(key, reply);
  }
  return reply;
};

/**
 * Startup: builds the fixed layers of every world with players (about a second each), one after the
 * other in the background, so the first player to open the map after a restart doesn't wait for it.
 */
export const prewarmMapLayers = async () => {
  const worlds = await postgres.em.getConnection().execute<{ uuid: string }[]>(
    `SELECT uuid FROM bym.world WHERE map_version = ${MapRoomVersion.V2} AND player_count > 0 ORDER BY player_count DESC LIMIT 50`
  );
  for (const world of worlds) await getStatic(world.uuid);
};
