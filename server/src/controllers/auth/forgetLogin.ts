import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { forgetSavedLogin } from "../../services/user/savedLogins.js";

/**
 * Inferno-only (13 October): a name forgotten on the login page (its x): this browser's saved login for that
 * account ended, its cookie taken away (services/user/savedLogins.ts). Only the browser holding it can end it.
 */
export const forgetLogin: KoaController = async (ctx) => {
  const email = String((ctx.request.body as Record<string, unknown> | undefined)?.email ?? "").trim().slice(0, 255);
  const ended = email ? await forgetSavedLogin(ctx, email) : false;
  ctx.status = Status.OK;
  ctx.body = { error: 0, ended: ended ? 1 : 0 };
};
