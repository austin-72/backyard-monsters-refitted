import type { KoaController } from "../utils/KoaController.js";
import { User } from "../database/models/user.model.js";
import { Status } from "../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { FeedbackRefused, feedbackOf, markRepliesSeen, recordFeedback, unseenRepliesOf } from "../services/feedback/playerFeedback.js";

/**
 * Inferno-only (25 November): the game's right-click menu (client: com/monsters/feedback/IoFeedback.ts;
 * services/feedback/playerFeedback.ts).
 *
 *   POST /feedback        {kind, text, howOften, subject, target, highlight, place, context, build, player, shot,
 *                          picture}: a bug report or a suggestion. {error: 0, id} or {error: "why"} (limited: true
 *                          when the player has sent too many).
 *   POST /feedback/mine   {seen?: 1}: the player's own reports with their status and answer; seen=1 marks the
 *                          answers seen (My reports was opened). {count: 1}: only how many answers are unseen.
 */
export const sendFeedback: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "Not available." };
    return;
  }
  const user: User = ctx.authUser;
  try {
    const id = await recordFeedback(user, (ctx.request.body ?? {}) as Record<string, unknown> as any, ctx.get("user-agent"));
    ctx.body = { error: 0, id };
  } catch (e) {
    if (!(e instanceof FeedbackRefused)) throw e;
    ctx.body = e.message === "limit" ? { error: "limit", limited: true } : { error: e.message };
  }
};

export const myFeedback: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: 0, reports: [], unseen: 0 };
    return;
  }
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  if (String(body.count ?? "") === "1") {
    ctx.body = { error: 0, unseen: await unseenRepliesOf(user.userid) };
    return;
  }
  const mine = await feedbackOf(user.userid);
  if (String(body.seen ?? "") === "1" && mine.unseen) await markRepliesSeen(user.userid);
  ctx.body = { error: 0, ...mine };
};
