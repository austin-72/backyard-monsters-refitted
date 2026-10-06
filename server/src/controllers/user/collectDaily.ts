import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { claimDaily, streakStatus } from "../../services/user/dailyLogin.js";
import { questBest, questBump } from "../../services/quests/questProgress.js";

/** POST /dailyreward/collect: collects today's daily login reward (services/user/dailyLogin.ts). */
export const collectDaily: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const result = await claimDaily(user);

  if (result) {
    void questBump(user.userid, "daily_collect");
    void questBest(user.userid, "streak", Number(result.streak) || 0);
  }

  ctx.status = Status.OK;
  ctx.body = result
    ? { error: 0, day: result.day, shiny: result.shiny, credits: result.credits, streak: result.streak, status: streakStatus(user) }
    : { error: 1, message: "Today's reward has already been collected." };
};
