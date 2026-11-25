import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { setTerrain, TerrainError, terrainsFor } from "../../services/yard/terrain.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (10 October): terrain/set (terrain), the D.A.V.E. Club's ground for the main yard
 * (services/yard/terrain.ts). Answers { error: 0, terrain, terrains } or { error: "message" } (status 200).
 */
export const terrainSet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = ((ctx.request.body as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    const terrain = await setTerrain(user, body.terrain);
    ctx.body = { error: 0, terrain, terrains: await terrainsFor(user.userid) };
  } catch (e) {
    if (e instanceof TerrainError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Terrain: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};
