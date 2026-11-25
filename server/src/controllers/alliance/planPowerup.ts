import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { PlanPowerupSchema } from "../../schemas/AllianceSchemas.js";
import { requireAlliancePerm } from "../../services/alliance/ioOfficerPerms.js";
import { planPowerup, powerupRow } from "../../services/alliance/powerups.js";
import { powerupLeaderOnlyErr } from "../../errors/errors.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Inferno-only (22 October, the user's pick "C" from Round 2 of the proposals): POST /alliance/planpowerup
 * { powerup_id, at, tier }: plans when a power-up starts (at: seconds; 0 cancels the plan), for whoever may start it
 * (the leader, or an officer the leader allows). Answers with the rows, as activatepowerup does.
 */
export const planPowerupController: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    ctx.body = { error: "Not found" };
    return;
  }
  const user: User = ctx.authUser;
  const alliance = await requireAlliancePerm(user, "powerups", powerupLeaderOnlyErr);
  const { powerup_id, at, tier } = PlanPowerupSchema.parse(ctx.request.body);
  const resolved = await planPowerup({ allianceId: alliance.id, author: user, powerupId: powerup_id, tier, at });
  ctx.status = Status.OK;
  ctx.body = { error: 0, powerups: resolved.map(powerupRow) };
};
