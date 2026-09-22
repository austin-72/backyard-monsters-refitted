import z from "zod";

import { Save } from "../../../database/models/save.model.js";
import type { User } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { Status } from "../../../enums/StatusCodes.js";
import { baseUnderAttackErr, permissionErr } from "../../../errors/errors.js";
import { postgres } from "../../../server.js";
import { isAttackActive } from "../../../services/base/isAttackActive.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { logger } from "../../../utils/logger.js";

/**
 * Outpost kits, applied by the server
 * ====================================================================
 * Using a kit replaces an outpost. Doing that on the client alone leaves room for leftovers:
 * anything the running game still holds can be written back by its next save. So the server
 * does it instead:
 *
 *   1. the client pays for the kit and lets that save finish,
 *   2. it stops saving and calls this endpoint with the kit's buildings,
 *   3. the outpost save is wiped back to what a freshly taken-over outpost looks like and the
 *      kit is written into it,
 *   4. the client loads the outpost again from that save.
 *
 * Nothing from the old yard survives: buildings, damage, housed monsters, hatchery queues,
 * per-building loot state, stored decorations, siege and effect data are all reset here.
 * ====================================================================
 */

const OUTPOST_HALL = 112;
const MAX_BUILDINGS = 600;

/** Main-yard-only buildings never belong in an outpost. */
const FORBIDDEN_TYPES = new Set([11, 12, 14, 51]);

const ApplyKitSchema = z.object({
  baseid: z.string(),
  buildings: z.string().transform((value) => JSON.parse(value) as unknown),
});

const toInt = (value: unknown) => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);

export const applyKit: KoaController = async (ctx) => {
  const { baseid, buildings } = ApplyKitSchema.parse(ctx.request.body);
  const user: User = ctx.authUser;

  await postgres.em.populate(user, ["save"]);
  const userSave = user.save!;

  const outpost = await postgres.em.findOne(Save, { baseid, type: BaseType.OUTPOST, saveuserid: user.userid });
  if (!outpost) throw permissionErr();
  if (isAttackActive(outpost)) throw baseUnderAttackErr();

  if (!buildings || typeof buildings !== "object" || Array.isArray(buildings)) throw new Error("applyKit: buildings must be an object.");

  const entries = Object.values(buildings as Record<string, Record<string, unknown>>);
  if (entries.length === 0 || entries.length > MAX_BUILDINGS) throw new Error(`applyKit: ${entries.length} buildings.`);

  // Keep the hall that is standing (its level belongs to the outpost, not to the kit); take only its position from the kit.
  const standingHall = Object.values((outpost.buildingdata ?? {}) as Record<string, Record<string, unknown>>).find(
    (building) => toInt(building?.t) === OUTPOST_HALL,
  );

  const kit: Record<string, Record<string, number>> = {};
  let nextId = 1;

  for (const building of entries) {
    const type = toInt(building?.t);
    const x = toInt(building?.X);
    const y = toInt(building?.Y);

    if (type === null || type <= 0 || x === null || y === null) throw new Error("applyKit: malformed building.");
    if (FORBIDDEN_TYPES.has(type)) continue;

    if (type === OUTPOST_HALL) {
      kit["0"] = { t: OUTPOST_HALL, X: x, Y: y, id: 0, l: Math.max(1, toInt(standingHall?.l) ?? 1) };
      continue;
    }

    const entry: Record<string, number> = { t: type, X: x, Y: y, id: nextId };
    const level = toInt(building.l);
    const prefab = toInt(building.prefab);

    // Bought with shiny: finished at its kit level. Bought with resources: `prefab` makes the client build it up.
    if (level !== null && level >= 1) entry.l = Math.min(level, 50);
    else entry.prefab = Math.min(Math.max(1, prefab ?? 1), 50);

    kit[String(nextId)] = entry;
    nextId++;
  }

  if (!kit["0"]) {
    kit["0"] = {
      t: OUTPOST_HALL,
      X: toInt(standingHall?.X) ?? -65,
      Y: toInt(standingHall?.Y) ?? -65,
      id: 0,
      l: Math.max(1, toInt(standingHall?.l) ?? 1),
    };
  }

  // Back to a freshly taken-over outpost, then the kit.
  outpost.buildingdata = kit as unknown as Save["buildingdata"];
  outpost.buildinghealthdata = {};
  outpost.buildingkeydata = {};
  outpost.buildingresources = {};
  outpost.researchdata = {};
  outpost.aiattacks = {};
  outpost.monsters = {};
  outpost.mushrooms = {};
  outpost.inventory = {};
  outpost.siege = {};
  outpost.loot = {};
  outpost.champion = [];
  outpost.effects = [];
  outpost.damage = 0;
  outpost.destroyed = 0;
  outpost.locked = 0;

  // The owner's main yard mirrors each outpost's harvesters for auto-banking; the next outpost save rebuilds it.
  if (userSave.buildingresources) delete userSave.buildingresources[`b${baseid}`];

  postgres.em.persist([outpost, userSave]);
  await postgres.em.flush();

  logger.info(`Kit applied to outpost ${baseid} of user ${user.userid}: ${Object.keys(kit).length} buildings.`);

  ctx.status = Status.OK;
  ctx.body = { error: 0, buildings: Object.keys(kit).length };
};
