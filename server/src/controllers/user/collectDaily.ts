import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { buyBackStreak, claimDaily, StreakError, streakStatus } from "../../services/user/dailyLogin.js";
import { questBest, questBump } from "../../services/quests/questProgress.js";
import { logger } from "../../utils/logger.js";

/** POST /dailyreward/collect: collects today's daily login reward (services/user/dailyLogin.ts). */
export const collectDaily: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const result = await claimDaily(user);

  if (result) {
    void questBump(user.userid, "daily_collect");
    void questBest(user.userid, "streak", Number(result.streak) || 0);
  }

  ctx.status = Status.OK;
  // (QoL #126: `saved` 1 when a streak saver covered yesterday; `savers` the savers held after this collection)
  ctx.body = result
    ? { error: 0, day: result.day, shiny: result.shiny, credits: result.credits, streak: result.streak, saved: result.saved, savers: result.savers, status: streakStatus(user) }
    : { error: 1, message: "Today's reward has already been collected." };
};

/**
 * (QoL #126) POST|GET /dailyreward/status: the streak as the popup shows it (the same as the io_streak flag), answered
 * { error: 0, status } (status null: the daily reward is off).
 */
export const dailyStatus: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  ctx.body = { error: 0, status: streakStatus(ctx.authUser) };
};

/**
 * (QoL #126) POST /dailyreward/buyback (streak: the streak the popup offered): buys back a streak that broke today for
 * its price in Shiny (services/user/dailyLogin.ts buyBackStreak). Answers { error: 0, streak, price, credits, status }
 * or { error: 1, message, status }.
 */
export const buyBackDaily: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = { ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) };
  const expected = Math.max(0, Math.floor(Number(body.streak) || 0));
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    const r = await buyBackStreak(user, expected);
    ctx.body = { error: 0, streak: r.streak, price: r.price, credits: r.credits, status: streakStatus(user) };
  } catch (e) {
    if (e instanceof StreakError) {
      ctx.body = { error: 1, message: e.message, status: streakStatus(user) };
      return;
    }
    logger.error(`Daily reward buy-back: ${e}`);
    ctx.body = { error: 1, message: "Your streak could not be bought back right now. Please try again in a moment." };
  }
};
