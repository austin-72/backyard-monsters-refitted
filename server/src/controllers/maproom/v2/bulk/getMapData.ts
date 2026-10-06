import { Status } from "../../../../enums/StatusCodes.js";
import { postgres } from "../../../../server.js";
import type { User } from "../../../../database/models/user.model.js";
import { getGameMapData } from "../../../../services/maproom/v2/bulk/worldSnapshot.js";
import type { KoaController } from "../../../../utils/KoaController.js";

/**
 * The game's map snapshot (Map Room 2): the player's world as /worldmapv2/snapshot describes it, made on
 * a fixed 5-minute clock (`nextAt`: when the next one is out; the game doesn't ask before), so the map
 * room can show the whole world the moment it opens (and the zoomed-out world map). getarea then fills in what is per viewer (resources, monsters, invites) and brings the
 * part on screen up to date.
 *
 * Body (form)
 *   layers=1   also send the world's fixed layers (terrain, tribes and their levels, the yard id prefix):
 *              `static` in services/maproom/v2/bulk/worldSnapshot.ts. The game asks once per world.
 *
 * Reply: { error: 0, generatedAt, worldid, nextAt, width, height, players, alliances, cells, static? }, compressed
 * (brotli or gzip) when the request says it accepts that.
 */
export const getMapData: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"], { fields: ["save.worldid"] });
  const worldid = user.save?.worldid;

  ctx.status = Status.OK;
  if (!worldid) {
    ctx.body = { error: "You are not on a world map yet." };
    return;
  }

  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const data = await getGameMapData(worldid, String(body.layers ?? "") === "1");

  ctx.type = "application/json";
  ctx.set("Cache-Control", "no-store");
  ctx.set("Vary", "Accept-Encoding");

  const acceptEncoding = ctx.headers["accept-encoding"];
  if (acceptEncoding && ctx.acceptsEncodings("br") === "br") {
    ctx.set("Content-Encoding", "br");
    ctx.body = await data.brotli();
    return;
  }
  if (acceptEncoding && ctx.acceptsEncodings("gzip") === "gzip") {
    ctx.set("Content-Encoding", "gzip");
    ctx.body = await data.gzip();
    return;
  }
  ctx.body = data.raw;
};
