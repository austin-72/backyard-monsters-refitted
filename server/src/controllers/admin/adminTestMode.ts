import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { isAdmin } from "../../services/admin/admin.js";
import {
  endTestMode,
  givePet,
  isTestMode,
  serverFastForward,
  setBuildingLevel,
  setProtection,
  startTestMode,
  takeCell,
  TestModeError,
  testModeProfile,
  wildCell,
} from "../../services/admin/testMode.js";

/**
 * POST admin/testmode (from the game, logged in): the admin test mode switch and its tools.
 * Body: action = status | on | off | protection (on=1|0) | takecell (x, y) | wildcell (x, y) |
 * (15 October, QoL #395, the admin's own main yard, test mode on) halllevel (level) | buildinglevel (id, level) |
 * pet (monster) | (QoL #397) fastforward (hours: the main yard as saved, and Hell Freezes Over's day).
 * (QoL #396) on takes profile = full (the default: unlimited and instant) | real (the account's own shiny and
 * resources, real costs); status and on answer it as `profile`.
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
        ctx.body = { error: 0, on, profile: on ? await testModeProfile(user.userid) : null };
        return;
      case "on":
        // (QoL #396: the profile it is switched on with; one already on keeps its own)
        await startTestMode(user, String(body.profile ?? "") === "real" ? "real" : "full");
        ctx.body = { error: 0, on: true, profile: await testModeProfile(user.userid) };
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
      case "halllevel":
        ctx.body = { error: 0, on, ...(await setBuildingLevel(user, "hall", int(body.level))) };
        return;
      case "buildinglevel":
        ctx.body = { error: 0, on, ...(await setBuildingLevel(user, int(body.id), int(body.level))) };
        return;
      case "pet":
        ctx.body = { error: 0, on, ...(await givePet(user, String(body.monster ?? "").slice(0, 16))) };
        return;
      case "fastforward":
        // (QoL #397: the admin's own main yard and Hell Freezes Over day only)
        ctx.body = { error: 0, on, ...(await serverFastForward(user, int(body.hours))) };
        return;
      default:
        throw new TestModeError(`Unknown action ${action}.`);
    }
  } catch (err) {
    ctx.body = { error: err instanceof TestModeError ? err.message : `Test mode: ${(err as Error).message}` };
  }
};
