import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { permissionErr } from "../../errors/errors.js";
import { visibleCredits } from "../../services/user/shinyLock.js";
import { questClaim, questClientEvent, questStatus } from "../../services/quests/questProgress.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: the quest book (services/quests/). The server keeps every count and pays every reward; the
 * game reports a few things only it sees (hatching, attacks, the map room), each held to a most and to how
 * often it may come (CLIENT_EVENTS). Refusals come back as { error: "message" }.
 */

const requireInferno = () => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
};

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) });

/** GET|POST /quests/status: the whole book, today's daily quests and how many are ready. */
export const questStatusController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(await questStatus(user)) };
};

/**
 * POST /quests/claim { ids: "id,id,daily:d_wins,daily:bonus" | "all" }: collects what is ready, pays it
 * into the main yard, and answers with the book as it is now.
 */
export const questClaimController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const raw = String(params(ctx).ids ?? "").trim();
  ctx.status = Status.OK;
  if (!raw) {
    ctx.body = { error: "Nothing to collect." };
    return;
  }
  const ids = raw === "all" ? "all" : raw.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9_:]{1,40}$/.test(s)).slice(0, 50);
  try {
    const got = await questClaim(user, ids);
    ctx.body = {
      error: 0,
      claimed: got.claimed,
      reward: got.reward,
      credits: visibleCredits(user, got.credits),
      resources: got.resources,
      book: await questStatus(user),
    };
  } catch (err) {
    if ((err as { quest?: boolean }).quest) {
      ctx.body = { error: (err as Error).message };
      return;
    }
    throw err;
  }
};

/**
 * POST /quests/event { e, n } or { events: '[{"e":"hatch","n":2}, ...]' } (20 at most): things the game
 * saw. Unknown kinds and reports that come too often are left out quietly. Answers how many quests are
 * ready now (the tracker's glow), unless `quiet`.
 */
export const questEventController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const p = params(ctx);
  let list: { e?: unknown; n?: unknown }[] = [];
  if (typeof p.events === "string" && p.events) {
    try {
      const parsed = JSON.parse(p.events);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      // (left out)
    }
  } else if (Array.isArray(p.events)) list = p.events as typeof list;
  else if (p.e) list = [{ e: p.e, n: p.n }];
  let counted = 0;
  for (const ev of list.slice(0, 20)) {
    if (typeof ev?.e !== "string") continue;
    try {
      if (await questClientEvent(user.userid, ev.e, Number(ev.n ?? 1))) counted++;
    } catch (err) {
      logger.warn(`Quests: event ${ev.e} for player #${user.userid}: ${err}`);
    }
  }
  ctx.status = Status.OK;
  if (p.quiet === "1" || p.quiet === 1) {
    ctx.body = { error: 0, counted };
    return;
  }
  const book = await questStatus(user);
  ctx.body = { error: 0, counted, ready: book.ready, book };
};
