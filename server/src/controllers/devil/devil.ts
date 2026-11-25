import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { DevilError, devilEnabled, devilState, refuseDevil, settleDevil, signDevil } from "../../services/devil/devilContract.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (13 November): the Devil's Contract (services/devil/devilContract.ts). Every answer is
 * { error: 0, devil } or { error: "message" } (status 200: the game shows the message).
 */

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) }) as Record<string, unknown>;

const answer = async (ctx: Parameters<KoaController>[0], work: (user: User) => Promise<unknown>) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!devilEnabled()) {
    ctx.body = { error: "The Devil isn't dealing on this server." };
    return;
  }
  try {
    ctx.body = { error: 0, devil: await work(ctx.authUser as User) };
  } catch (e) {
    if (e instanceof DevilError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Devil's Contract: ${e}`);
    ctx.body = { error: "The Devil's ledger couldn't be read. Try again." };
  }
};

/** devil/state: the offer (made now if one is due) and the contracts in force. */
export const devilGetState: KoaController = async (ctx) => answer(ctx, (user) => devilState(user.userid));

/** devil/sign { id }: signs one of the offer's contracts. */
export const devilSign: KoaController = async (ctx) => answer(ctx, (user) => signDevil(user.userid, String(params(ctx).id ?? "")));

/** devil/refuse: refuses the whole offer. */
export const devilRefuse: KoaController = async (ctx) => answer(ctx, (user) => refuseDevil(user.userid));

/** devil/settle { id }: Hoarder's Seal's burn done in the game. */
export const devilSettle: KoaController = async (ctx) => answer(ctx, (user) => settleDevil(user.userid, String(params(ctx).id ?? "")));
