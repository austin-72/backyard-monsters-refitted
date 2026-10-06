import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { visibleCredits } from "../../services/user/shinyLock.js";
import {
  hfoClear,
  hfoSeen,
  hfoSpawn,
  hfoStatus,
  hfoThaw,
  hfoTowers,
  hfoTry,
  hfoWaveEnd,
  hfoWaveStart,
} from "../../services/events/hfo.js";

/**
 * Hell Freezes Over (services/events/hfo.ts): the game's requests. Every answer carries the player's progress
 * as the flag io_hfo does (`hfo`), so the game is never behind.
 *
 *   POST /hfo/status                         the event window
 *   POST /hfo/spawn     kind, patches        patches the game placed ([[x, y, frame], ...])
 *   POST /hfo/clear     id                   a small patch cleared (line: the worker's Day 1 line)
 *   POST /hfo/try       id                   a big patch tried (line: Day 2)
 *   POST /hfo/towers    ids                  Day 3: the towers iced
 *   POST /hfo/thaw      id, gone             a tower freed (line: Day 3; frozen: the waves open)
 *   POST /hfo/wavestart wave                 a wave starts (fight id)
 *   POST /hfo/waveend   wave, id, won        a wave ended (paid: its shiny, once)
 *   POST /hfo/seen      what                 "frozen" or "reveal" shown
 */
const body = (ctx: Parameters<KoaController>[0]) => (ctx.request.body ?? {}) as Record<string, unknown>;

const handle =
  (fn: (user: User, b: Record<string, unknown>) => Promise<Record<string, unknown>>): KoaController =>
  async (ctx) => {
    ctx.status = Status.OK;
    if (!infernoOnlyConfig.enabled) {
      ctx.body = { error: 0, enabled: false };
      return;
    }
    const user: User = ctx.authUser;
    await postgres.em.populate(user, ["save"]);
    ctx.body = { error: 0, ...(await fn(user, body(ctx))) };
  };

const num = (value: unknown) => Math.round(Number(value)) || 0;

export const hfoStatusController = handle(async (user) => hfoStatus(user));
export const hfoSpawnController = handle(async (user, b) => hfoSpawn(user, String(b.kind ?? ""), b.patches));
export const hfoClearController = handle(async (user, b) => hfoClear(user, num(b.id)));
export const hfoTryController = handle(async (user, b) => hfoTry(user, num(b.id)));
export const hfoTowersController = handle(async (user, b) => hfoTowers(user, b.ids));
export const hfoThawController = handle(async (user, b) => hfoThaw(user, num(b.id), String(b.gone ?? "") === "1"));
export const hfoWaveStartController = handle(async (user, b) => hfoWaveStart(user, num(b.wave)));
export const hfoWaveEndController = handle(async (user, b) => {
  const outcome = await hfoWaveEnd(user, num(b.wave), num(b.id), String(b.won ?? "") === "1");
  return { ...outcome, credits: user.save ? visibleCredits(user, user.save.credits ?? 0) : undefined };
});
export const hfoSeenController = handle(async (user, b) => hfoSeen(user, String(b.what ?? "")));
