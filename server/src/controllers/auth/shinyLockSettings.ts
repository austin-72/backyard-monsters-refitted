import bcrypt from "bcrypt";
import { RateLimit } from "koa2-ratelimit";
import type { Context } from "koa";

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { ShinyLockSchema } from "../../schemas/AuthSchemas.js";
import { parseInput } from "../../schemas/parseInput.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (QoL #197): the Shiny lock's password checks and changes - 10 every 15 minutes per player (a wrong
 * password counts), so the password can't be guessed through it.
 */
export const shinyLockLimiter = RateLimit.middleware({
  interval: { min: 15 },
  max: 10,
  prefixKey: "shinylock",
  keyGenerator: async (ctx: Context) => `shinylock|${ctx.authUser?.userid ?? ctx.ip}`,
  handler: async (ctx: Context) => {
    ctx.status = Status.TOO_MANY_REQUESTS;
    ctx.body = { error: "Too many tries. Please wait a few minutes." };
  },
});

/**
 * The account's Shiny lock: spending more than this many Shiny asks for the password (0: off). Read from the
 * database, as outpostNames.ts reads its names, so it is never an older copy of the row.
 */
export const shinyLockAbove = async (userid: number): Promise<number> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT stats -> 'ioShinyLock' -> 'above' AS above FROM bym."user" WHERE userid = ?`, [userid], "all")) as { above: unknown }[];
  const above = Number(rows[0]?.above);
  return Number.isFinite(above) && above > 0 ? Math.floor(above) : 0;
};

/**
 * Inferno-only (15 October, QoL #197): the Shiny lock, set in the page's settings (Account). Spending more than
 * `above` Shiny in one go asks for the account's password first (the game asks: GLOBAL.ioConfirmShiny and the
 * Brimstone Pit's bets, com/auth/IoShinyLock.ts). It guards against someone else at the player's computer, not
 * against the player: the server's own spending checks are unchanged.
 *
 *  - { password, above }: the lock set (0 turns it off), with the current password. Kept in the player's own row,
 *    `user.stats` (the JSON column outpostNames.ts also keeps its names in) under `ioShinyLock`: { above }, written
 *    with one jsonb update so anything else kept there stays.
 *  - { password, check: 1 }: whether the password is right, before a spend over the lock's amount.
 * Only the logged-in player's own account. The password travels as `password`, which the request log never prints.
 */
export const shinyLockSettings: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { password, above, check } = parseInput(ShinyLockSchema, ctx.request.body);
  const ok = !!user.password && (await bcrypt.compare(String(password), user.password));
  if (!ok) {
    ctx.status = Status.OK;
    ctx.body = { error: "That isn't your password.", above: await shinyLockAbove(user.userid) };
    return;
  }
  if (check || above == null) {
    ctx.status = Status.OK;
    ctx.body = { error: 0, ok: 1, above: await shinyLockAbove(user.userid) };
    return;
  }
  await postgres.em
    .getConnection()
    .execute(
      `UPDATE bym."user" SET stats = jsonb_set(CASE WHEN jsonb_typeof(stats) = 'object' THEN stats ELSE '{}'::jsonb END, '{ioShinyLock}', ?::jsonb) WHERE userid = ?`,
      [JSON.stringify({ above }), user.userid]
    );
  logger.info(`${user.username} set their Shiny lock to ${above > 0 ? `over ${above}` : "off"}`);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ok: 1, above };
};
