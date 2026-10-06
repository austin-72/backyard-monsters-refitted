import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { isShinyLocked } from "../../../services/user/shinyLock.js";
import {
  InviteError,
  acceptInvite,
  checkInvite,
  declineInvite,
  inviteTargets,
} from "../../../services/maproom/v2/relocateInvites.js";

/** Relocation invites, inferno-only (services/maproom/v2/relocateInvites.ts). */

const params = (ctx: Parameters<KoaController>[0]) => {
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  return {
    baseid: String(body.baseid ?? ""),
    threadid: parseInt(String(body.threadid ?? "0")) || 0,
    shiny: body.shiny !== undefined && body.shiny !== "" && Number(body.shiny) > 0,
  };
};

const reply = async (ctx: Parameters<KoaController>[0], work: () => Promise<object | void>) => {
  try {
    const result = (await work()) ?? {};
    ctx.status = Status.OK;
    ctx.body = { error: 0, ...result };
  } catch (err) {
    if (!(err instanceof InviteError)) throw err;
    ctx.status = Status.OK;
    ctx.body = { error: err.message };
  }
};

/** POST worldmapv2/invitetargets: alliance members for the invite popup's recipient list. */
export const getInviteTargets: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, targets: await inviteTargets(user) };
};

/** POST base/migratetofriend: accept an invite and move the main yard onto the outpost. */
export const migrateToFriend: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { baseid, threadid, shiny } = params(ctx);
  await reply(ctx, async () => {
    if (shiny && isShinyLocked(user)) throw new InviteError("Your shiny is locked.");
    return acceptInvite(user, baseid, threadid, shiny);
  });
};

/** POST base/migratecheck: is the invite still good, and does accepting it move to another world? */
export const migrateCheck: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { baseid, threadid } = params(ctx);
  await reply(ctx, () => checkInvite(user, baseid, threadid));
};

/** POST base/rejectmigratetofriend: decline an invite. */
export const rejectMigrateToFriend: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { baseid, threadid } = params(ctx);
  await reply(ctx, () => declineInvite(user, baseid, threadid));
};
