import { Status } from "../../enums/StatusCodes.js";
import { AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { requireAllianceMember } from "../../services/alliance/allianceAccess.js";
import { OFFICER_PERMS, officerPermsOf, parseSwitch } from "../../services/alliance/ioOfficerPerms.js";
import { permissionErr } from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * GET or POST /alliance/officerperms (Inferno-only, 16 October, QoL #174): what the player's alliance lets its
 * officers do, { error: 0, perms: { powerups, relations, description } } (services/alliance/ioOfficerPerms.ts).
 * With any of `powerups`, `relations`, `description` ("1" or "0"): the leader switches those first; the others are
 * kept as they were. Anyone else who sends one is refused (403).
 *
 * @param {Context} ctx - Koa context.
 */
export const officerPermsController: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceMember(user);
  const p = { ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) };

  const perms = officerPermsOf(alliance);
  let changed = false;
  for (const k of OFFICER_PERMS) {
    const v = parseSwitch(p[k]);
    if (v === undefined) continue;
    if (user.alliance_role !== AllianceRole.LEADER) {
      throw new ClientSafeError({ message: "Only the leader can change what officers may do.", status: Status.FORBIDDEN, data: {}, isClientFriendly: true });
    }
    perms[k] = v;
    changed = true;
  }

  if (changed) {
    alliance.officer_perms = { ...perms };
    await postgres.em.flush();
  }

  ctx.status = Status.OK;
  ctx.body = { error: 0, perms };
};
