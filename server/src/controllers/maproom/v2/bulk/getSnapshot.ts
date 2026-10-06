import { MapRoomVersion } from "../../../../enums/MapRoom.js";
import { Status } from "../../../../enums/StatusCodes.js";
import { isKnownWorld } from "../../../../services/maproom/knownWorlds.js";
import { getWorldSnapshot, SNAPSHOT_MAX_AGE_SECONDS } from "../../../../services/maproom/v2/bulk/worldSnapshot.js";
import type { KoaController } from "../../../../utils/KoaController.js";

/**
 * THIS ENDPOINT IS FOR API CONSUMERS ONLY.
 * ____________________________________________________________
 *
 * Serves an MR2 world's map in a single request: every player main yard and outpost, every damaged or
 * destroyed wild monster camp, the owners and the world's alliances. The game gets the same snapshot
 * from /worldmapv2/mapdata.
 *
 * Covers the part of the map that is not derivable: terrain comes from /worldmapv2/terrain, and wild
 * monster tribes and levels are pure functions of the coordinates (an untouched camp is not listed).
 *
 * Auth
 *   X-API-Key   An active key from bym.api_consumer (see `bun run consumer:create`). Required.
 *
 * Query
 *   worldid   The uuid of an existing MR2 world. Required.
 *
 * Body
 *   application/json
 *   {
 *     "generatedAt": <unix seconds the snapshot was built>,
 *     "worldid":     "<uuid>",
 *     "nextAt":      <unix seconds the world's next snapshot is due (a fixed 5-minute clock)>,
 *     "width":       400, "height": 400,
 *     "players":     { "<uid>": { "name": "<username>", "avatar": "<url|null>", "alliance": <id|0>, "level": <n> } },
 *     "alliances":   { "<alliance id>": { "name": "<name>", "image": <icon index>, "leader": <uid>,
 *                                          "members": [ <uid>, ... ], "relationships": { "<alliance id>": -1 | 1 } } },
 *     "cells":       [ [x, y, base_type, uid, baseid, empirevalue,
 *                       flinger, catapult, damage, protected, destroyed, level, locked, terrain], ... ]
 *   }
 *
 *   Cells are positional arrays to avoid repeating key names across six figures of rows, and reference
 *   their owner by uid. base_type is 1 for a damaged or destroyed wild monster camp, 2 for a main yard and
 *   3 for an outpost. level is the owner's level for a player's yard and the camp's level for a wild
 *   monster camp. locked is 1 while a main yard can't be attacked (its owner is playing, or it is under
 *   attack, as of the snapshot). terrain is the cell's height as stored with it (a yard keeps the height
 *   it was placed at; /worldmapv2/terrain has every other cell's). Wild monster cells carry uid 0 and have no entry in players; their
 *   empirevalue, flinger, catapult and protected are always 0.
 *
 *   relationships are the flags an alliance has set on others, keyed by target id: -1 hostile,
 *   1 friendly, absent neutral. (/worldmapv2/alliances still lists every world's alliances at once.)
 *
 * Not included
 *   Resources and monsters change every tick and would make the response uncacheable and different for
 *   every caller; they stay on getarea.
 *
 * Encoding
 *   brotli, gzip or identity, selected from Accept-Encoding, preferring brotli.
 *   A request that sends no Accept-Encoding receives identity. Responses carry
 *   Vary: Accept-Encoding.
 *
 * Caching
 *   Rebuilt once every 5 minutes per world (each world at its own moment) and served with a matching max-age and a strong ETag derived
 *   from the payload. The ETag covers the world's map alone, so it only changes when something on it
 *   does. Send the ETag back as If-None-Match to get a 304 with no body while nothing has changed.
 *
 * Status
 *   200   the snapshot
 *   304   the cached copy is current
 *   400   worldid missing, unknown, or not an MR2 world
 *   429   rate limited
 *
 * @param {Context} ctx - The Koa request/response context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 */
export const getSnapshot: KoaController = async (ctx) => {
  const { worldid } = ctx.query;

  if (!worldid) {
    ctx.status = Status.BAD_REQUEST;
    ctx.body = { error: "Missing worldid" };
    return;
  }

  const worldExists = await isKnownWorld(worldid, MapRoomVersion.V2);

  if (!worldExists) {
    ctx.status = Status.BAD_REQUEST;
    ctx.body = { error: "Unknown worldid" };
    return;
  }

  const snapshot = await getWorldSnapshot(worldid.toString());

  // (kept until the world's next one is out on the 5-minute clock)
  const maxAge = Math.max(0, Math.min(SNAPSHOT_MAX_AGE_SECONDS, snapshot.nextAt - Math.floor(Date.now() / 1000)));
  ctx.set("Cache-Control", `private, max-age=${maxAge}`);
  ctx.set("Vary", "Accept-Encoding");
  ctx.set("ETag", snapshot.etag);
  ctx.set("Access-Control-Expose-Headers", "ETag");
  ctx.type = "application/json";

  // ctx.fresh only reports true once the status is 2xx.
  ctx.status = Status.OK;

  if (ctx.fresh) {
    ctx.status = Status.NOT_MODIFIED;
    return;
  }

  const acceptEncoding = ctx.headers["accept-encoding"];

  if (acceptEncoding && ctx.acceptsEncodings("br") === "br") {
    ctx.set("Content-Encoding", "br");
    ctx.body = await snapshot.brotli();
    return;
  }

  if (acceptEncoding && ctx.acceptsEncodings("gzip") === "gzip") {
    ctx.set("Content-Encoding", "gzip");
    ctx.body = await snapshot.gzip();
    return;
  }

  ctx.body = snapshot.raw;
};
