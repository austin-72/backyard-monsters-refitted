import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { getReferralCode, inviteLink, referralsEnabled } from "./referrals.js";
import { streakStatus } from "./dailyLogin.js";
import { getAnnouncement, isAdmin } from "../admin/admin.js";
import { lastWildAttack } from "./wildAttacks.js";
import { isTestMode } from "../admin/testMode.js";
import { currentStage, gauntletWindow, monthKey, readState } from "../events/gauntlet.js";
import { hfoFlag } from "../events/hfo.js";
import { wartBloomFlag } from "../events/wartBloomTimes.js";

/**
 * Inferno-only flags that belong to one player rather than the server. They are sent with every
 * base load *and* every updatesaved poll: the client replaces its whole flag set with each reply, so
 * a flag sent only at load disappeared a few seconds later (the referral link and the streak line did).
 *
 * @param ownYardInBuildMode - the player is on one of their own yards, building (not visiting or attacking).
 * @param atLoad - a load of the player's main yard (not the half-minute poll, an outpost or a design): Hell Freezes
 *   Over may start, or move to its next day.
 */
export const addPlayerFlags = async (flags: Record<string, unknown>, user: User, ownYardInBuildMode: boolean, atLoad = false) => {
  if (!infernoOnlyConfig.enabled) return;

  // Server-wide announcement from the admin panel: shown once per player (the client remembers the id).
  const announcement = await getAnnouncement();
  if (announcement) flags.io_announce = JSON.stringify(announcement);

  // Admin test mode (services/admin/testMode.ts): the game needs it on every screen, attacks included.
  if (await isTestMode(user)) flags.io_testmode = 1;

  // The Wart Bloom's weekends (services/events/wartBloom.ts): the game grows warts 3 times as fast in them.
  flags.io_wartbloom = wartBloomFlag();

  if (!ownYardInBuildMode) return;

  if (referralsEnabled()) {
    flags.io_invite = inviteLink(await getReferralCode(user));
    flags.io_invite_shiny = infernoOnlyConfig.referral.shiny;
    flags.io_invite_download = infernoOnlyConfig.referral.downloadUrl;
  }

  const streak = streakStatus(user);
  if (streak) flags.io_streak = JSON.stringify(streak);

  if (isAdmin(user)) flags.io_admin = 1;

  // Moloch's Gauntlet: whether it is on (the button on the main yard), and how far the player got this month.
  if (infernoOnlyConfig.gauntlet.enabled) {
    // (admin test mode: its test ladder, always open)
    const testMode = await isTestMode(user);
    const window = testMode ? { open: true, month: monthKey(), closesAt: null, opensAt: null } : await gauntletWindow();
    const stage = currentStage(await readState(user.userid, window.month, testMode));
    flags.io_gauntlet = JSON.stringify({ open: window.open, closesAt: window.closesAt, opensAt: window.opensAt, stage, stages: infernoOnlyConfig.gauntlet.stages, test: testMode });
  }

  // Hell Freezes Over (services/events/hfo.ts): the player's progress, once it has started for them.
  // (not started by admin test mode, which unlocks every monster for the test)
  const hfo = await hfoFlag(user, atLoad, await isTestMode(user));
  if (hfo) flags.io_hfo = hfo;

  // Wild attacks are at most one a day per player, not per yard: the game needs the last one on any yard.
  if (infernoOnlyConfig.wildAttacks.enabled) flags.io_wildlast = await lastWildAttack(user);
};
