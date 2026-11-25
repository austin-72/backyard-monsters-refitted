import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { isTestMode } from "../../services/admin/testMode.js";
import { fmiView, fmiWaveEnd, fmiWaveStart } from "../../services/events/fmi.js";

/**
 * Inferno-only (10 October): the Frozen Monster Invasions' requests (services/events/fmi.ts). Every answer carries
 * the player's progress as the flag io_fmi does (`fmi`).
 *
 *   POST /fmi/status                                  the event window
 *   POST /fmi/wavestart   wave                        a wave starts (fight id)
 *   POST /fmi/waveend     wave, id, won, destroyed    a wave ended (won: the totem may rise)
 */
const body = (ctx: Parameters<KoaController>[0]) => (ctx.request.body ?? {}) as Record<string, unknown>;
const num = (value: unknown) => Math.round(Number(value)) || 0;

const handle =
  (fn: (user: User, b: Record<string, unknown>, test: boolean) => Promise<Record<string, unknown>>): KoaController =>
  async (ctx) => {
    ctx.status = Status.OK;
    if (!infernoOnlyConfig.enabled || !infernoOnlyConfig.fmi.enabled) {
      ctx.body = { error: 0, enabled: false };
      return;
    }
    const user: User = ctx.authUser;
    ctx.body = { error: 0, ...(await fn(user, body(ctx), await isTestMode(user))) };
  };

export const fmiStatusController = handle(async (user, _b, test) => ({ fmi: await fmiView(user, test) }));
export const fmiWaveStartController = handle(async (user, b, test) => fmiWaveStart(user, num(b.wave), test));
export const fmiWaveEndController = handle(async (user, b, test) => fmiWaveEnd(user, num(b.wave), num(b.id), String(b.won ?? "") === "1", num(b.destroyed), test));
