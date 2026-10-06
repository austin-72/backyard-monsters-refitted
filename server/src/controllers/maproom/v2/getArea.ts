import { z } from "zod";
import { gzip } from "zlib";
import { promisify } from "util";

import type { KoaController } from "../../../utils/KoaController.js";
import { User } from "../../../database/models/user.model.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { postgres } from "../../../server.js";
import { devConfig } from "../../../config/GameConfig.js";
import { Status } from "../../../enums/StatusCodes.js";
import { createCellData } from "../../../services/maproom/v2/createCellData.js";
import { generateNoise, getTerrainHeight } from "../../../services/maproom/v2/generateMap.js";
import { isUnder, portalsFor, underworldOn } from "../../../services/maproom/v2/underworld.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { MapRoom2, MapRoomCell, MapRoomVersion } from "../../../enums/MapRoom.js";
import { pendingInviteThreads } from "../../../services/maproom/v2/relocateInvites.js";
import { getLastSeen } from "../../../services/maproom/getLastSeen.js";
import { BaseType } from "../../../enums/Base.js";
import { mapRoomDisabledErr } from "../../../errors/errors.js";
import { getAllianceRoster } from "../../../services/alliance/allianceData.js";
import { visibleCredits } from "../../../services/user/shinyLock.js";

/**
 * Schema for validating the request body when getting area data.
 */
const getAreaSchema = z.object({
  // (a zone outside the world is answered with no cells, not refused: bug report #49, x=-320 y=-90 was a 500)
  x: z.coerce.number().int(),
  y: z.coerce.number().int(),
  sendresources: z.coerce.number().optional().default(0),
});

/**
 * Fields loaded off the requesting player's own save.
 */
const OWN_SAVE_FIELDS = [
  "save.basesaveid",
  "save.worldid",
  "save.credits",
  "save.resources",
  "save.points",
  "save.basevalue",
] as const;

/**
 * User fields fetched alongside each WorldMapCell in the DB query for cell owners.
 * Restricted to only what the cell handlers need.
 */
const CELL_OWNER_FIELDS = [
  "userid",
  "username",
  "pic_square",
  "save.points",
  "save.basevalue",
  "alliance_id",
] as const;

/**
 * Save fields fetched alongside each WorldMapCell in the DB query.
 * Restricted to only what the cell handlers need.
 */
const CELL_SAVE_FIELDS = [
  "*",
  "save.basesaveid",
  "save.locked",
  "save.empirevalue",
  "save.flinger",
  "save.catapult",
  "save.protected",
  "save.resources",
  "save.monsters",
  "save.damage",
  "save.destroyed",
  "save.points",
  "save.basevalue",
  "save.attackid",
  "save.attacks",
] as const;

/** A zone is 10 x 10 cells (the game's MapRoom._zoneWidth/_zoneHeight); x + 10 is the next zone's. */
const ZONE = 10;

/** The most zones one request may ask for (the game sends the ones it is waiting for, up to 12). */
const MAX_ZONES = 16;

/** Replies bigger than this are gzipped when the request says it accepts that. */
const COMPRESS_OVER = 1500;

const compressGzip = promisify(gzip);

/**
 * The zones a request asks for: `zones=x,y;x,y;...` (Inferno-only game, several zones in one request), or
 * the one at x, y. Each is the top left cell of a zone on the map; repeats are dropped.
 */
// (Inferno-only: and the underworld's one zone, services/maproom/v2/underworld.ts)
const inWorld = (x: number, y: number) =>
  (x >= 0 && y >= 0 && x < MapRoom2.WIDTH && y < MapRoom2.HEIGHT) ||
  (underworldOn() && x === underworldConfig.origin && y === underworldConfig.origin);

const requestedZones = (raw: unknown, x: number, y: number): { x: number; y: number }[] => {
  const fallback = inWorld(x, y) ? [{ x, y }] : [];
  if (typeof raw !== "string" || !raw) return fallback;

  const zones = new Map<number, { x: number; y: number }>();
  for (const part of raw.split(";")) {
    const [zx, zy] = part.split(",").map((n) => Number(n));
    if (!Number.isInteger(zx) || !Number.isInteger(zy)) continue;
    if (!inWorld(zx, zy)) continue;
    zones.set(zx * 10000 + zy, { x: zx, y: zy });
    if (zones.size >= MAX_ZONES) break;
  }
  return zones.size ? [...zones.values()] : fallback;
};

/**
 * Controller for generating cells on the World Map.
 *
 * Processes chunks of 10 x 10 cells, retrieving persistent cells (e.g., homebases, outposts)
 * from the database, while all other cells are stored in-memory.
 *
 * Several zones can be asked for at once (`zones=x,y;x,y;...`, up to 16): they are read with one query each
 * for the cells, their owners, the owners' last-seen times, alliances and relocation invites, and
 * answered as `areas: [{ x, y, data }, ...]`. The game used to ask for one zone at a time and wait for each
 * answer before asking for the next, so the map filled in a round trip per zone. Without `zones` the reply
 * is the stock one ({ x, y, data }). Big replies are gzipped for clients that accept it.
 *
 * @param {Koa.Context} ctx - The Koa context object
 * @returns {Promise<void>} A promise that resolves when the area data is retrieved and the response is sent.
 *
 * @throws {Error} Throws an error if there are issues parsing the request body or retrieving data.
 */
export const getArea: KoaController = async (ctx) => {
  if (!devConfig.maproom) throw mapRoomDisabledErr();

  const requestBody = (ctx.request.body ?? {}) as Record<string, unknown>;
  const { x, y, sendresources } = getAreaSchema.parse(requestBody);
  const batch = typeof requestBody.zones === "string" && requestBody.zones.length > 0;
  const zones = requestedZones(requestBody.zones, x, y);

  const user: User = ctx.authUser;

  await postgres.em.populate(user, ["save"], { fields: OWN_SAVE_FIELDS });

  const save = user.save!;
  const worldid = save.worldid;

  if (!worldid) throw new Error(`${user.username} has no world ID.`);

  // First, get persistant cells which have been stored in the database: every zone asked for, in one query.
  const zoneWhere = zones.map((zone) => ({
    x: { $gte: zone.x, $lt: zone.x + ZONE },
    y: { $gte: zone.y, $lt: zone.y + ZONE },
  }));
  const dbCells = !zones.length ? [] : await postgres.em.find(
    WorldMapCell,
    {
      world: worldid,
      map_version: MapRoomVersion.V2,
      ...(zoneWhere.length === 1 ? zoneWhere[0] : { $or: zoneWhere }),
    },
    { populate: ["save"], fields: CELL_SAVE_FIELDS }
  );

  // Batch load all unique cell owners in a single query
  const ownerIds = [...new Set(dbCells.map(cell => cell.uid).filter(Boolean))] as number[];

  // Pending relocation invites on the viewer's own outposts in the zones, in one query (was one per outpost).
  const ownOutposts = dbCells
    .filter((cell) => cell.uid === user.userid && cell.base_type === MapRoomCell.OUTPOST && cell.baseid)
    .map((cell) => cell.baseid!);

  const [ownersList, lastSeen, pendingInvites] = await Promise.all([
    ownerIds.length
      ? postgres.em.find(User, { userid: { $in: ownerIds } }, {
        populate: ["save"],
        fields: CELL_OWNER_FIELDS,
      })
      : Promise.resolve([]),
    getLastSeen(ownerIds, BaseType.MAIN),
    pendingInviteThreads(ownOutposts, user.userid),
  ]);

  const cellOwners = new Map(ownersList.map((u) => [u.userid, u]));

  ctx.state.lastSeen = lastSeen;
  ctx.state.pendingInvites = pendingInvites;

  const allianceIds = new Set<number>();

  if (user.alliance_id) allianceIds.add(user.alliance_id);

  for (const owner of cellOwners.values()) {
    if (owner.alliance_id) allianceIds.add(owner.alliance_id);
  }

  const alliancedata = await getAllianceRoster([...allianceIds]);

  const noise = generateNoise(worldid);
  // Inferno-only: the portals to the underworld (both ends are lava cells that say so: io_portal).
  const portals = underworldOn() ? portalsFor(worldid) : [];
  const portalCells = new Map<number, number[]>();
  for (const p of portals) {
    portalCells.set(p.x * 10000 + p.y, [p.i, p.x, p.y, p.ux, p.uy]);
    portalCells.set(p.ux * 10000 + p.uy, [p.i, p.x, p.y, p.ux, p.uy]);
  }
  const areas: { x: number; y: number; data: Record<number, Record<number, unknown>> }[] = [];

  for (const zone of zones) {
    const cells: Record<number, Record<number, unknown>> = {};

    for (const cell of dbCells) {
      if (cell.x < zone.x || cell.x >= zone.x + ZONE || cell.y < zone.y || cell.y >= zone.y + ZONE) continue;
      if (!cells[cell.x]) cells[cell.x] = {};

      cells[cell.x][cell.y] = await createCellData(cell, worldid, ctx, cellOwners);
    }

    // Then, fill the remaining cells in-memory
    for (let cellX = zone.x; cellX < zone.x + ZONE; cellX++) {
      // Ensure the cellX object exists in the cells map to append the cellY object to it
      if (!cells[cellX]) cells[cellX] = {};
      for (let cellY = zone.y; cellY < zone.y + ZONE; cellY++) {
        // The cell already exists, skip it
        if (cells[cellX][cellY]) continue;
        const portal = portalCells.get(cellX * 10000 + cellY);
        const under = isUnder(cellX, cellY);
        // (an underworld cell is flat land; its portals stand on land of the same height, with no yard: the
        // user's, 4 October, they used to be lava)
        if (under && portal) {
          cells[cellX][cellY] = { i: underworldConfig.height, u: 1, io_portal: portal };
          continue;
        }
        const terrainHeight = under ? underworldConfig.height : getTerrainHeight(noise, cellX, cellY);
        // Create a cell in-memory, skip the world being defined for memory efficency
        const inMemoryCell = new WorldMapCell(
          undefined,
          cellX,
          cellY,
          terrainHeight
        );
        const data = await createCellData(inMemoryCell, worldid, ctx);
        cells[cellX][cellY] = portal && data ? { ...data, io_portal: portal } : data;
      }
    }

    areas.push({ x: zone.x, y: zone.y, data: cells });
  }

  const credits = visibleCredits(user, save.credits);

  const reply = {
    error: 0,
    ...(batch ? { areas } : areas.length ? { x: areas[0].x, y: areas[0].y, data: areas[0].data } : { x, y, data: {} }),
    alliancedata,
    // Inferno-only: where the underworld is, and its portals ([overworld x, y, underworld x, y]).
    ...(underworldOn() && {
      io_under: {
        o: underworldConfig.origin,
        s: underworldConfig.size,
        r: underworldConfig.outpostRange,
        e: underworldConfig.exitRange,
        k: underworldConfig.takeoverCostMultiplier,
        p: portals.map((p) => [p.x, p.y, p.ux, p.uy]),
      },
    }),
    ...(sendresources === 1 && {
      resources: save.resources,
      credits,
    }),
  };

  ctx.status = Status.OK;

  const raw = JSON.stringify(reply);
  if (raw.length > COMPRESS_OVER && ctx.headers["accept-encoding"] && ctx.acceptsEncodings("gzip") === "gzip") {
    ctx.type = "application/json";
    ctx.set("Vary", "Accept-Encoding");
    ctx.set("Content-Encoding", "gzip");
    ctx.body = await compressGzip(raw, { level: 4 });
    return;
  }
  ctx.body = reply;
};
