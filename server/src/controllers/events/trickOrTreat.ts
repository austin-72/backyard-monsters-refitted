import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { isTestMode } from "../../services/admin/testMode.js";
import { totKnock, totTrickEnd, totTrickStart, totView, totWindow } from "../../services/events/trickOrTreat.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";

/**
 * Inferno-only (20 October): Trick or Treat's requests (services/events/trickOrTreat.ts). Every answer carries the
 * player's doors as the flag io_tot does (`tot`).
 *
 *   POST /tot/status                                   the event and the player's doors
 *   POST /tot/knock        tribe (force: test mode)    a door knocked on: its treat (Shiny, credits) or its trick
 *   POST /tot/trickstart   tribe, id                   the trick's raid begins
 *   POST /tot/trickend     tribe, id, cleared, killed  the trick's raid is over (cleared: every Zagnoid killed)
 */
const body = (ctx: Parameters<KoaController>[0]) => (ctx.request.body ?? {}) as Record<string, unknown>;
const num = (value: unknown) => Math.round(Number(value)) || 0;

const handle =
  (fn: (user: User, b: Record<string, unknown>, test: boolean) => Promise<Record<string, unknown>>): KoaController =>
  async (ctx) => {
    ctx.status = Status.OK;
    if (!infernoOnlyConfig.enabled || !infernoOnlyConfig.trickOrTreat.enabled) {
      ctx.body = { error: 0, enabled: false };
      return;
    }
    const user: User = ctx.authUser;
    ctx.body = { error: 0, enabled: true, ...(await fn(user, body(ctx), await isTestMode(user))) };
  };

// (24 October: with no event to show, when the doors open if they haven't yet, so the game doesn't say "over")
export const totStatusController = handle(async (user, _b, test) => {
  const tot = await totView(user, test);
  if (tot) return { tot };
  const w = totWindow();
  return { tot, opens: !w.open && getCurrentDateTime() < w.startsAt ? w.startsAt : 0 };
});
export const totKnockController = handle(async (user, b, test) => totKnock(user, b.tribe, test, b.force));
export const totTrickStartController = handle(async (user, b, test) => totTrickStart(user, b.tribe, num(b.id), test));
export const totTrickEndController = handle(async (user, b, test) => totTrickEnd(user, b.tribe, num(b.id), String(b.cleared ?? "") === "1", num(b.killed), test));
