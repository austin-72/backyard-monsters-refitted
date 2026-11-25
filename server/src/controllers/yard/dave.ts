import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { buyDave, DaveError, setDave } from "../../services/yard/dave.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (10 October): dave/set (key, value), a D.A.V.E. Club choice (services/yard/dave.ts). Answers
 * { error: 0, dave } or { error: "message" } (status 200).
 */
export const daveSet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = ((ctx.request.body as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    ctx.body = { error: 0, dave: await setDave(user, String(body.key ?? ""), body.value) };
  } catch (e) {
    if (e instanceof DaveError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`D.A.V.E. Club: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};

/**
 * Inferno-only (14 October): dave/buy (key champSkin.<champion>, value <skin>), a champion's skin bought for Shiny and
 * put on. Answers { error: 0, dave, credits } (credits null: it was owned already) or { error: "message" }.
 */
export const daveBuy: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = ((ctx.request.body as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    const r = await buyDave(user, String(body.key ?? ""), body.value);
    ctx.body = { error: 0, dave: r.dave, ...(r.credits != null && { credits: r.credits }) };
  } catch (e) {
    if (e instanceof DaveError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`D.A.V.E. Club skin: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};
