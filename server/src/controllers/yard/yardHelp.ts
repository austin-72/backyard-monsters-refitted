import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { ackHelp, helpBuilding, HELP_SHARE, pendingHelp, YardHelpError, yardHelpEnabled } from "../../services/yard/yardHelp.js";
import { logger } from "../../utils/logger.js";

const body = (ctx: Parameters<KoaController>[0]) => (ctx.request.body as Record<string, unknown> | undefined) ?? {};

/**
 * Inferno-only (27 November, 72's suggestion): yard/help (baseid, bid), a visitor helps out with a building's job
 * (services/yard/yardHelp.ts). Answers { error: 0, share, kind, lvl, helpers } or { error: "message" }.
 */
export const yardHelp: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    const r = await helpBuilding(user, body(ctx).baseid, body(ctx).bid);
    ctx.body = { error: 0, share: HELP_SHARE, ...r };
  } catch (e) {
    if (e instanceof YardHelpError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Yard help: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};

/**
 * yard/helps (baseid, ack): the helps the owner's game hasn't taken for that yard of theirs, after marking `ack` (ids,
 * comma separated) taken. Answers { error: 0, share, helps: [{ id, bid, kind, lvl, from, name }] }.
 */
export const yardHelps: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!yardHelpEnabled()) {
    ctx.body = { error: 0, share: HELP_SHARE, helps: [] };
    return;
  }
  try {
    if (body(ctx).ack) await ackHelp(user.userid, body(ctx).ack);
    ctx.body = { error: 0, share: HELP_SHARE, helps: body(ctx).baseid ? await pendingHelp(user.userid, body(ctx).baseid) : [] };
  } catch (e) {
    logger.error(`Yard help: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};
