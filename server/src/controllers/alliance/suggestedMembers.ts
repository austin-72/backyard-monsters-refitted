import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { requireAllianceLeader, requireAllianceStaff } from "../../services/alliance/allianceAccess.js";
import { getSuggestedMembers, getSuggestedPage, SUGGESTED_LIMIT } from "../../services/alliance/suggestedMembers.js";
import type { KoaController } from "../../utils/KoaController.js";

/** (Inferno-only, QoL #163) "active": seen within the last 24 hours. */
const ACTIVE_SEC = 24 * 60 * 60;

const flag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";

/**
 * Returns players the leader could recruit, for the Suggested tab.
 *
 * Leader-only, as it was in the original - the tab is only rendered for whoever can
 * actually send an invite.
 *
 * Inferno-only (QoL #163): GET|POST { mine?, min_level?, active?, page? }: only the recruiter's own world, at least
 * that level, seen in the last 24 hours, and which page of SUGGESTED_LIMIT (0 first).
 * { error: 0, members, page, page_size, more, total }
 *
 * @param {Context} ctx - Koa context.
 */
export const suggestedMembers: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  // (Inferno-only: officers recruit too)
  const alliance = infernoOnlyConfig.enabled ? await requireAllianceStaff(user) : await requireAllianceLeader(user);

  if (!infernoOnlyConfig.enabled) {
    const members = await getSuggestedMembers(alliance);

    ctx.status = Status.OK;
    ctx.body = { error: 0, members };
    return;
  }

  // (QoL #163: the Recruit tab's filters, from the query or the body: the game sends them as a POST)
  const p = { ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) };
  let world: string | null | undefined;
  if (flag(p.mine)) {
    await postgres.em.populate(user, ["save"], { fields: ["save.worldid"] });
    world = user.save?.worldid ?? null;
  }
  const result = await getSuggestedPage(alliance, {
    world,
    minLevel: Number(p.min_level) || 0,
    activeSec: flag(p.active) ? ACTIVE_SEC : 0,
    page: Number(p.page) || 0,
  });

  ctx.status = Status.OK;
  ctx.body = { error: 0, members: result.members, page: result.page, page_size: SUGGESTED_LIMIT, more: result.more, total: result.total };
};
