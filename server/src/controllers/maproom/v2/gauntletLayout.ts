import z from "zod";

import type { KoaController } from "../../../utils/KoaController.js";
import type { User } from "../../../database/models/user.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres } from "../../../server.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { gauntletBaseId } from "../../../services/events/gauntlet.js";
import { isTestMode } from "../../../services/admin/testMode.js";
import { descentTemplate } from "../../../game-data/tribes/devil/molochStrongholds.js";

const GauntletLayoutSchema = z.object({
  stage: z.coerce.number().int().min(1).max(99),
});

/** Traps stay hidden, as in the attack itself (types 24 and 117: the Inferno's traps). */
const HIDDEN_TYPES = new Set([24, 117]);

/** At most this many buildings are sent (a descent yard has a few hundred). */
const MAX_BUILDINGS = 900;

const toInt = (value: unknown) => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);

/**
 * Inferno-only (QoL #345, 15 October): POST|GET worldmapv2/gauntletlayout {stage}: the layout of one of the player's
 * Gauntlet gates, for the preview in the Gauntlet's window (client IoGauntlet): `buildings` as [type, X, Y, level,
 * state] (state 0 whole, 1 damaged, 2 destroyed), from the player's own copy of the yard when it has been made (its
 * damage with it), else from the descent yard it is made from (services/events/gauntlet.ts template). Read only.
 * In admin test mode, the test ladder's yards. Traps are left out (an attacker doesn't see them).
 */
export const gauntletLayout: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled || !infernoOnlyConfig.gauntlet.enabled) {
    ctx.body = { error: 0, enabled: false, buildings: [] };
    return;
  }
  const { stage } = GauntletLayoutSchema.parse({ ...((ctx.query as Record<string, unknown>) ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) });
  const stages = Number(infernoOnlyConfig.gauntlet.stages) || 13;
  if (stage > stages) {
    ctx.body = { error: 0, stage, buildings: [] };
    return;
  }

  const baseid = gauntletBaseId(user.userid, stage, await isTestMode(user));
  const [row] = await postgres.em
    .getConnection()
    .execute<{ buildingdata: unknown; buildinghealthdata: unknown }[]>(
      `SELECT buildingdata, buildinghealthdata FROM bym.save WHERE baseid = ? AND type = ? LIMIT 1`,
      [baseid, BaseType.TRIBE]
    );

  let data: unknown = row?.buildingdata;
  let health: unknown = row?.buildinghealthdata;
  if (!data || typeof data !== "object" || !Object.keys(data as object).length) {
    // (not attacked yet: the yard it will be made from; stages past 13 repeat the last one)
    data = descentTemplate(Math.min(13, stage))?.buildingdata ?? {};
    health = {};
  }
  const healthById = (health && typeof health === "object" ? health : {}) as Record<string, unknown>;

  const buildings: number[][] = [];
  for (const [key, value] of Object.entries((data ?? {}) as Record<string, unknown>)) {
    if (buildings.length >= MAX_BUILDINGS) break;
    if (!value || typeof value !== "object") continue;
    const b = value as Record<string, unknown>;
    const type = toInt(b.t);
    const x = toInt(b.X);
    const y = toInt(b.Y);
    if (type === null || type <= 0 || x === null || y === null || HIDDEN_TYPES.has(type)) continue;
    const level = Math.max(1, toInt(b.l) ?? toInt(b.prefab) ?? 1);
    const hp = key in healthById ? toInt(healthById[key]) : b.hp !== undefined ? toInt(b.hp) : null;
    const state = hp === null ? 0 : hp <= 0 ? 2 : 1;
    buildings.push([type, x, y, level, state]);
  }

  ctx.body = { error: 0, stage, buildings };
};
