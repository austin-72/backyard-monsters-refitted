import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { ActivatePowerupSchema } from "../../schemas/AllianceSchemas.js";
import { requireAlliancePerm } from "../../services/alliance/ioOfficerPerms.js";
import { startPowerup, type PowerupActivation } from "../../services/alliance/powerups.js";
import { powerupRow } from "../../services/alliance/powerups.js";
import { powerupLeaderOnlyErr } from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";
import { questBump } from "../../services/quests/questProgress.js";

/**
 * Starts a fully charged power-up, buffing every member of the alliance for its
 * running time.
 *
 * Leader only. Membership is checked before rank so an ordinary member is told
 * whose call it is rather than being refused outright - the original showed them
 * a disabled Activate button carrying the same sentence.
 *
 * Inferno-only (QoL #174): an officer too, when the leader allows it (services/alliance/ioOfficerPerms.ts).
 *
 * @param {Context} ctx - Koa context.
 */
export const activatePowerup: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  // (Inferno-only, QoL #174: or an officer the leader lets start them; a member is refused as before)
  const alliance = await requireAlliancePerm(user, "powerups", powerupLeaderOnlyErr);

  const { powerup_id, tier } = ActivatePowerupSchema.parse(ctx.request.body);

  const purchase: PowerupActivation = {
    allianceId: alliance.id,
    author: user,
    powerupId: powerup_id,
    tier,
  }

  const resolved = await startPowerup(purchase);
  void questBump(user.userid, "powerup");

  const powerups = resolved.map(powerupRow);

  ctx.status = Status.OK;
  ctx.body = { error: 0, powerups };
};
