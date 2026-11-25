import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { getReferralCode, inviteLink, inviteProgress, referralsEnabled } from "./referrals.js";
import { streakStatus } from "./dailyLogin.js";
import { announcementSeen, getAnnouncement, getMaintenance, getMaintenanceSchedule, isAdmin, isStaff, adminRole } from "../admin/admin.js";
import { lastWildAttack } from "./wildAttacks.js";
import { isTestMode, testModeFlags } from "../admin/testMode.js";
import { currentStage, gauntletWindow, monthKey, readState } from "../events/gauntlet.js";
import { hfoFlag } from "../events/hfo.js";
import { basiliskFree } from "../events/basilisk.js";
import { fmiView } from "../events/fmi.js";
import { totView } from "../events/trickOrTreat.js";
import { daveForOwner } from "../yard/dave.js";
import { readTrophies } from "../events/trophies.js";
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
  // (QoL #485: and once per account, on every device: not sent again once the game says it was shown)
  const announcement = await getAnnouncement();
  if (announcement && (await announcementSeen(user.userid).catch(() => "")) !== String(announcement.id)) flags.io_announce = JSON.stringify(announcement);

  // (QoL #400, #210: maintenance planned, or on now: players in the game are warned, then told; admins play on)
  if (!isAdmin(user)) {
    const plan = await getMaintenanceSchedule().catch(() => null);
    const on = await getMaintenance().catch(() => null);
    if (on) flags.io_maintenance = JSON.stringify({ on: 1, message: on });
    else if (plan) flags.io_maintenance = JSON.stringify({ at: plan.at, message: plan.message, now: Date.now() });
  }

  // Admin test mode (services/admin/testMode.ts): the game needs it on every screen, attacks included.
  if (await isTestMode(user)) Object.assign(flags, await testModeFlags(user.userid)); // (QoL #396: io_testreal for the real-costs profile)

  // The Wart Bloom's weekends (services/events/wartBloom.ts): the game grows warts 3 times as fast in them.
  flags.io_wartbloom = wartBloomFlag();

  // the D.A.V.E. Club's choices (services/yard/dave.ts): the player's own, for the window and their attacks
  // (16 October: with every load, attacks too: they were only with the player's own yard's, so the player's
  // champions attacking another yard or a tribe's had no skins)
  flags.io_dave = JSON.stringify(await daveForOwner(user.userid));

  if (!ownYardInBuildMode) return;

  if (referralsEnabled()) {
    flags.io_invite = inviteLink(await getReferralCode(user));
    flags.io_invite_shiny = infernoOnlyConfig.referral.shiny;
    flags.io_invite_download = infernoOnlyConfig.referral.downloadUrl;
    // (QoL #192: how the player's own invites are doing)
    flags.io_invite_counts = JSON.stringify(await inviteProgress(user.userid).catch(() => ({ joined: 0, paid: 0, waiting: 0 })));
  }

  const streak = streakStatus(user);
  if (streak) flags.io_streak = JSON.stringify(streak);

  if (isAdmin(user)) flags.io_admin = 1;
  // (QoL #261: a support account gets the Admin menu too, for the panel (read only there); io_admin_role says which,
  // so the menu can leave out test mode and the Designer, which the server refuses it)
  else if (isStaff(user)) {
    flags.io_admin = 1;
    flags.io_admin_role = adminRole(user);
  }

  // Moloch's Gauntlet: whether it is on (the button on the main yard), and how far the player got this month.
  if (infernoOnlyConfig.gauntlet.enabled) {
    // (admin test mode: its test ladder, always open)
    const testMode = await isTestMode(user);
    const window = testMode ? { open: true, month: monthKey(), closesAt: null, opensAt: null } : await gauntletWindow();
    const stage = currentStage(await readState(user.userid, window.month, testMode));
    flags.io_gauntlet = JSON.stringify({ open: window.open, closesAt: window.closesAt, opensAt: window.opensAt, stage, stages: infernoOnlyConfig.gauntlet.stages, test: testMode, showDaysBefore: infernoOnlyConfig.gauntlet.showDaysBefore });
  }

  // The Frozen Monster Invasion (services/events/fmi.ts): this month's, for a player who may take part (else none);
  // and the event trophies won (services/events/trophies.ts), which the game keeps in the yard or storage.
  const fmi = await fmiView(user, await isTestMode(user));
  if (fmi) flags.io_fmi = JSON.stringify(fmi);
  flags.io_trophies = JSON.stringify(await readTrophies(user.userid));
  // Trick or Treat (services/events/trickOrTreat.ts): its doors, from a few days before it opens till it's over (and
  // while a trick is still to be faced).
  const tot = await totView(user, await isTestMode(user)).catch(() => null);
  if (tot) flags.io_tot = JSON.stringify(tot);
  // Hell Freezes Over (services/events/hfo.ts): the player's progress, once it has started for them.
  // (not started by admin test mode, which unlocks every monster for the test)
  const hfo = await hfoFlag(user, atLoad, await isTestMode(user));
  if (hfo) flags.io_hfo = hfo;

  // (13 October) the Basilisk joins the player's side after 200 battles won (services/events/basilisk.ts)
  flags.io_basilisk = (await basiliskFree(user.userid)) ? 1 : 0;

  // Wild attacks are at most one a day per player, not per yard: the game needs the last one on any yard.
  if (infernoOnlyConfig.wildAttacks.enabled) flags.io_wildlast = await lastWildAttack(user);
};
