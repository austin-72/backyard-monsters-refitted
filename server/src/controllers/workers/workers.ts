import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { isTestMode } from "../../services/admin/testMode.js";
import { sacrificeWorker, unsacrificeWorker, WorkerError } from "../../services/workers/sacrifice.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (10 October): workers/sacrifice, a worker given to Moloch for Shiny (services/workers/sacrifice.ts).
 * Answers { error: 0, credits, extra } or { error: "message" } (status 200: the game shows the message).
 */
export const workersSacrifice: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    if (await isTestMode(user)) throw new WorkerError("Workers can't be sacrificed in test mode.");
    const r = await sacrificeWorker(user);
    // (QoL #497: `undo`: for so many seconds the worker can be taken back, workers/unsacrifice)
    ctx.body = { error: 0, credits: r.credits, extra: r.extra, undo: r.undo };
  } catch (e) {
    if (e instanceof WorkerError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Workers: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};

/**
 * Inferno-only (QoL #497): workers/unsacrifice, "Moloch returns it": the last sacrifice taken back within a couple of
 * minutes, its Shiny given back (services/workers/sacrifice.ts). Answers { error: 0, credits, extra } or
 * { error: "message" } (status 200: the game shows the message).
 */
export const workersUnsacrifice: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  try {
    if (await isTestMode(user)) throw new WorkerError("Workers can't be taken back in test mode.");
    const r = await unsacrificeWorker(user);
    ctx.body = { error: 0, credits: r.credits, extra: r.extra };
  } catch (e) {
    if (e instanceof WorkerError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Workers: ${e}`);
    ctx.body = { error: "Something went wrong. Try again." };
  }
};
