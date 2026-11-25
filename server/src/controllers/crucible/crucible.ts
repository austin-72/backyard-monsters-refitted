import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { crucibleEnabled, crucibleStatus, CrucibleError, pour, type CrucibleState } from "../../services/crucible/crucible.js";
import { isTestMode } from "../../services/admin/testMode.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: the Soul Crucible's requests (services/crucible/crucible.ts). Answers { error: 0, level, closed,
 * capacity, cap, given, left, resources, room, ... } or { error: "message" } (status 200: the game shows the
 * message).
 */

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) }) as Record<string, unknown>;

const view = (s: CrucibleState) => ({ level: s.level, closed: s.closed ?? "", capacity: s.capacity, cap: s.cap, given: s.given, left: s.left, resources: s.resources, room: s.room });

const answer = async (ctx: Parameters<KoaController>[0], work: () => Promise<Record<string, unknown>>) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!crucibleEnabled()) {
    ctx.body = { error: "The Soul Crucible isn't here." };
    return;
  }
  try {
    ctx.body = { error: 0, ...(await work()) };
  } catch (e) {
    if (e instanceof CrucibleError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Soul Crucible: ${e}`);
    ctx.body = { error: "Something went wrong at the Soul Crucible. Try again." };
  }
};

/** crucible/status: the building, today's cap, the yard's resources and room. */
export const crucibleGetStatus: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await answer(ctx, async () => view(await crucibleStatus(user)));
};

/**
 * crucible/pour (from, to: r1-r4; amount): the pour. Answers the state after it, with `from`, `to`, `took` and
 * `gave`. Not in admin test mode (its resources are not the yard's, and are put back when it ends).
 */
export const cruciblePour: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  const from = String(p.from ?? "").slice(0, 4);
  const to = String(p.to ?? "").slice(0, 4);
  const amount = Number(p.amount);
  await answer(ctx, async () => {
    if (await isTestMode(user)) throw new CrucibleError("The Soul Crucible can't be used in test mode.");
    const r = await pour(user, from, to, amount);
    return { ...view(r), from: r.from, to: r.to, took: r.took, gave: r.gave };
  });
};
