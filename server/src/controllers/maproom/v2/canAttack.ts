import z from "zod";
import type { KoaController } from "../../../utils/KoaController.js";
import { Save } from "../../../database/models/save.model.js";
import { postgres } from "../../../server.js";
import { Status } from "../../../enums/StatusCodes.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { isTestMode } from "../../../services/admin/testMode.js";
import { checkAttackTarget } from "../../../services/maproom/v2/attackRefusal.js";

const CanAttackSchema = z.object({ baseid: z.string().min(1).max(32) });

/**
 * Inferno-only (QoL #69): asked by the map just before an attack leaves it. Whether the yard can be attacked now
 * (services/maproom/v2/attackRefusal.ts, the checks the attack's own load makes): `{ ok: 1 }`, or `{ ok: 0, refused,
 * message }`. A refused attack used to load the player's home yard first and say so there. Nothing is written; the
 * range is left to the load (its check files a report when it fails).
 */
export const canAttack: KoaController = async (ctx) => {
  const parsed = CanAttackSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    // (a bad question is answered, not a server error and a bug report)
    ctx.status = Status.BAD_REQUEST;
    ctx.body = { error: "No yard given." };
    return;
  }
  const { baseid } = parsed.data;
  ctx.status = Status.OK;
  if (await isTestMode(ctx.authUser)) {
    ctx.body = { error: 0, ok: 1 };
    return;
  }
  const save = await postgres.em.findOne(Save, { baseid });
  if (!save) {
    ctx.body = { error: 0, ok: 1 };
    return;
  }
  try {
    await checkAttackTarget(save);
    ctx.body = { error: 0, ok: 1 };
  } catch (e) {
    const refused = e instanceof ClientSafeError ? (e.data as { io_refused?: string }).io_refused : undefined;
    if (!refused) throw e;
    ctx.body = { error: 0, ok: 0, refused, message: (e as Error).message };
  }
};
