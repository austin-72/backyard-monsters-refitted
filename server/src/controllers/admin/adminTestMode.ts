import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { isAdmin } from "../../services/admin/admin.js";
import {
  endTestMode,
  isTestMode,
  setProtection,
  startTestMode,
  takeCell,
  TestModeError,
  wildCell,
} from "../../services/admin/testMode.js";

/**
 * POST admin/testmode (from the game, logged in): the admin test mode switch and its tools.
 * Body: action = status | on | off | protection (on=1|0) | takecell (x, y) | wildcell (x, y).
 * Answers {error: 0, on, ...} or {error: "message"} (shown in the game).
 */
export const adminTestMode: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const action = String(body.action ?? "status");

  ctx.status = Status.OK;
  if (!isAdmin(user)) {
    ctx.body = { error: "Admins only." };
    return;
  }
  await postgres.em.populate(user, ["save"]);

  try {
    const on = await isTestMode(user);
    const int = (v: unknown) => parseInt(String(v ?? ""), 10);

    switch (action) {
      case "status":
        ctx.body = { error: 0, on };
        return;
      case "on":
        await startTestMode(user);
        ctx.body = { error: 0, on: true };
        return;
      case "off":
        await endTestMode(user, "switched off in the game");
        ctx.body = { error: 0, on: false };
        return;
    }

    if (!on) throw new TestModeError("Test mode is off.");

    switch (action) {
      case "protection":
        ctx.body = { error: 0, on, protected: await setProtection(user, String(body.on) === "1") };
        return;
      case "takecell":
        ctx.body = { error: 0, on, ...(await takeCell(user, int(body.x), int(body.y))) };
        return;
      case "wildcell":
        ctx.body = { error: 0, on, ...(await wildCell(user, int(body.x), int(body.y))) };
        return;
      default:
        throw new TestModeError(`Unknown action ${action}.`);
    }
  } catch (err) {
    ctx.body = { error: err instanceof TestModeError ? err.message : `Test mode: ${(err as Error).message}` };
  }
};
