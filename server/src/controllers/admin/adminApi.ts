import { readFileSync } from "fs";
import { gauntletProgress, gauntletWindow, isGauntletBaseId, resetGauntlet, setGauntletOverride } from "../../services/events/gauntlet.js";
import { hfoAdminNextDay, hfoAdminReset, hfoAdminStart, hfoCounts, hfoFinalWaveWon, hfoProgress, setHfoEnabled } from "../../services/events/hfo.js";
import { fmiEnabled, fmiShown, fmiView } from "../../services/events/fmi.js";
// (QoL #398, #399, #250, 16 October: the invasion's and the Wart Bloom's switches, a yard restored)
import { fmiAdminReset, fmiAdminState, setFmiOverride } from "../../services/events/fmi.js";
import { setTotOverride, totAdminState } from "../../services/events/trickOrTreat.js";
import { WartBloomError, setWartBloom, wartBloomAdminState } from "../../services/events/wartBloom.js";
import { YardRestoreError, copyYard, restoreYard } from "../../services/admin/playerRecords.js";
import { readTrophies } from "../../services/events/trophies.js";
import path from "path";
import type { Context } from "koa";

import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { World } from "../../database/models/world.model.js";
import { WorldMapCell } from "../../database/models/worldmapcell.model.js";
import { Message } from "../../database/models/message.model.js";
import { Report } from "../../database/models/report.model.js";
import { AdminLog } from "../../database/models/adminlog.model.js";
import { BugReport } from "../../database/models/bugreport.model.js";
import { BaseType } from "../../enums/Base.js";
import { ATTACK_TIMEOUT } from "../../services/base/isAttackActive.js";
import { MapRoom2, MapRoomCell, Terrain } from "../../enums/MapRoom.js";
import { MessageType } from "../../enums/MessageType.js";
import { Tribe } from "../../enums/Tribes.js";
import { postgres, redis } from "../../server.js";
import { getPublishedBuild, getRequiredBuild } from "../../services/clientBuild.js";
import { generateNoise, getTerrainHeight } from "../../services/maproom/v2/generateMap.js";
import { tribeForCell } from "../../services/maproom/v2/tribeForCell.js";
import { cleanKitName, playerKits, removePictures } from "../../services/maproom/v2/playerKits.js";
import { BOARD_HIDDEN_KEY } from "../../services/leaderboards/gameLeaderboards.js";
import { getUsernameCooldown, renameUser } from "../../services/user/renameUser.js";
import { usernameSchema } from "../../schemas/AuthSchemas.js";
import {
  ADMIN_COOKIE,
  clearAnnouncement,
  createSignInCode,
  endSession,
  endSessionById,
  exchangeSignInCode,
  listSessions,
  noteSession,
  getAnnouncement,
  getMaintenance,
  getMaintenanceSchedule,
  scheduleMaintenance,
  cancelMaintenanceSchedule,
  isAdmin,
  logAdminAction,
  mutedUntil,
  muteReason,
  muteUser,
  sessionAdmin,
  setAnnouncement,
  setMaintenance,
  unmuteUser,
} from "../../services/admin/admin.js";
import { ADMIN_PANEL_HTML } from "../../services/admin/panelHtml.js";
import { endTestMode, inTestModeQuick, testModeUserIds } from "../../services/admin/testMode.js";
import { playerActions, shinyLedger, yardBackups } from "../../services/admin/playerRecords.js";
import { ONLINE_SECONDS, onlineNow, presenceSince } from "../../services/user/presence.js";
import { bugSamples, fixedBuildKey } from "../../services/admin/bugReports.js";
import { FeedbackRefused, deleteFeedback, feedbackById, feedbackCounts, feedbackPicture, listFeedback, updateFeedback } from "../../services/feedback/playerFeedback.js";
import { refreshChatUser } from "../../chat/chatControl.js";
import { questAdminForce, questAdminReset, questAdminView } from "../../services/quests/questProgress.js";
import { deleteAccount } from "../../services/admin/deleteAccount.js";
import { endSessions } from "../../services/user/sessionStore.js";
import { logger } from "../../utils/logger.js";
import { backupStatus } from "../../services/admin/backupStatus.js";
import { CHEAT_RULES, dismissCheatReport, listCheatReports, openCheatsOf } from "../../services/anticheat/cheatReports.js";
import { serverHealth } from "../../services/admin/health.js";
import { loginHistory } from "../../services/admin/loginHistory.js";
import { DesignError, exportDesigns, importDesigns, listKitBackups, restoreKitBackup } from "../../services/admin/designs.js";
import { CHANNELS, INFERNO_CHAT_CHANNEL } from "../../config/ChatConfig.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
// (QoL #244, #245, #261: reset links, sign out everywhere, email and addresses, admin roles)
import { ADMIN_ROLES, adminMayRun, adminRole, endPanelSessionsOf, isConfigOwner, isOwner, isStaff } from "../../services/admin/admin.js";
import { cancelResetToken, makeResetToken, RESET_LINK_HOURS, RESET_PAGE_PATH, resetLinkExpiry } from "../../services/user/passwordReset.js";
import { playSessionsOf } from "../../services/user/sessionStore.js";
import { savedLoginsOf } from "../../services/user/savedLogins.js";

/** Inferno-only chat moderators (user.chat_mod; 0 rows before the 20261005 migration). */
const chatModerators = async (): Promise<{ id: number; username: string }[]> =>
  (await postgres.em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(`SELECT userid, username FROM bym."user" WHERE chat_mod = true ORDER BY username`)
    .catch(() => [])
  ).map((r) => ({ id: Number(r.userid), username: r.username }));

/**
 * Inferno-only admin panel (a web page on the server, opened from the Admin button in the game).
 *
 *   POST /admin/session   (game, player auth)  -> a one-time sign-in code, admins only
 *   GET  /admin/signin?code=...                -> sets the admin session cookie, redirects to /admin
 *   GET  /admin                                -> the panel page
 *   POST /admin/api/<action>                   -> the tools below; admin session cookie + X-Admin header
 *
 * Every change is written to the admin log with who did it.
 */

class AdminError extends Error {}

const SERVER_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version ?? "?";
  } catch {
    return "?";
  }
})();

type Body = Record<string, unknown>;
type Action = (admin: User, body: Body, ctx: Context) => Promise<unknown>;

const str = (value: unknown, max = 400) => String(value ?? "").trim().slice(0, max);
const int = (value: unknown) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) throw new AdminError("A number was expected.");
  return n;
};

const em = () => postgres.em.fork();

const findUser = async (body: Body) => {
  const user = await em().findOne(User, { userid: int(body.id) }, { populate: ["save"] });
  if (!user) throw new AdminError("No such player.");
  return user;
};

const target = (user: User) => ({ userid: user.userid, username: user.username });

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

/** QoL #403: a monster's id as the game has them (C1..C39, IC1..IC39). */
const MONSTER_ID = /^(IC|C)([1-9]|[1-3][0-9])$/;

/** A JSON column read as an object ({} for anything else). */
const objectOf = (v: unknown): Record<string, any> => {
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};
};

/**
 * QoL #403: why a change to a player's Strongbox or Academy can't be made now ("" when it can). The game sends its whole
 * Strongbox and Academy with every save, so a game open now would save over it: the player must not have been in the
 * game for 10 minutes. Not while they are in admin test mode either (their account is put back when it ends).
 */
const savesOverIt = async (user: User): Promise<string> => {
  const quiet = 600;
  const seen = (await presenceSince(quiet, 5000).catch(() => [])).find((p) => p.id === user.userid);
  if (seen) return "The player is in the game (or was in the last 10 minutes): their game would save over it. Try when they have been away for 10 minutes.";
  const saved = Number(user.save?.savetime ?? 0);
  if (saved && Math.floor(Date.now() / 1000) - saved < quiet) return "The player's yard was saved in the last 10 minutes: their game may still be open. Try again later.";
  if (await inTestModeQuick(user.userid)) return "The player is in admin test mode: their account is put back when it ends.";
  return "";
};

const worldOf = async (body: Body) => {
  const worlds = await em().find(World, {}, { orderBy: { playerCount: "desc" } });
  const uuid = str(body.world, 64);
  const world = uuid ? worlds.find((w) => w.uuid === uuid) : worlds[0];
  if (!world) throw new AdminError("No such world.");
  return world;
};

/** QoL #401: the players a compensation goes to (never banned ones, only those with a yard, never more than 100,000). */
const compensationTargets = async (body: Body): Promise<number[]> => {
  const who = str(body.who, 12);
  const conn = em().getConnection();
  if (who === "all") {
    return ((await conn.execute(
      `SELECT u.userid FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid
        WHERE NOT COALESCE(u.banned, false) ORDER BY u.userid LIMIT 100000`, [], "all")) as { userid: number }[]).map((r) => Number(r.userid));
  }
  if (who === "active") {
    const days = Math.max(1, Math.min(365, int(body.days)));
    const since = Math.floor(Date.now() / 1000) - days * 86_400;
    return ((await conn.execute(
      `SELECT u.userid FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid
        WHERE NOT COALESCE(u.banned, false) AND COALESCE(s.savetime, 0) >= ? ORDER BY u.userid LIMIT 100000`, [since], "all")) as { userid: number }[]).map((r) => Number(r.userid));
  }
  if (who === "list") {
    const words = str(body.list, 20000).split(/[\s,;]+/).map((w) => w.trim()).filter(Boolean).slice(0, 5000);
    const ids = words.filter((w) => /^\d+$/.test(w)).map(Number);
    const names = words.filter((w) => !/^\d+$/.test(w)).map((w) => w.toLowerCase());
    if (!ids.length && !names.length) return [];
    const rows = (await conn.execute(
      `SELECT u.userid FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid
        WHERE NOT COALESCE(u.banned, false) AND (u.userid = ANY(CAST(? AS int[])) OR lower(u.username) = ANY(CAST(? AS text[]))) ORDER BY u.userid`,
      [`{${ids.join(",")}}`, `{${names.map((n) => `"${n.replace(/["\\]/g, "")}"`).join(",")}}`], "all")) as { userid: number }[];
    return rows.map((r) => Number(r.userid));
  }
  throw new AdminError("Choose who: everyone, active players, or a list.");
};

/**
 * Inferno-only (QoL #244, #261): a reset link or a sign-out for an account with an admin role is an owner's to give
 * (an admin could otherwise take over an owner's account), or the account's own.
 */
const staffTargetCheck = (admin: User, user: User) => {
  if (isStaff(user) && user.userid !== admin.userid && !isOwner(admin)) throw new AdminError("Only an owner can do this to an account with an admin role.");
};

// ---------------------------------------------------------------------------------------------
// The tools
// ---------------------------------------------------------------------------------------------

const actions: Record<string, Action> = {
  // 15. Server status
  status: async () => {
    // (QoL #257: the players active in the last 5 minutes, as Who's Online counts them; KEYS counted yard loads in
    // the last 2 minutes only, and blocked Redis while it walked every key)
    const online = (await onlineNow()).size;
    return {
      online,
      version: SERVER_VERSION,
      publishedBuild: getPublishedBuild(),
      requiredBuild: getRequiredBuild(),
      maintenance: await getMaintenance(),
      maintenancePlan: await getMaintenanceSchedule(),
      backups: backupStatus(),
      announcement: await getAnnouncement(),
      gauntlet: await gauntletWindow(),
      hfo: await hfoCounts(),
    };
  },

  // Hell Freezes Over (services/events/hfo.ts): on (players start once they qualify) or off (nobody new starts;
  // players who started keep going)
  hfo: async (admin, body) => {
    const state = str(body.state, 4);
    if (state !== "on" && state !== "off") throw new AdminError("on or off.");
    await setHfoEnabled(state === "on");
    await logAdminAction(admin, `hfo-${state}`, null, "");
    return { hfo: await hfoCounts() };
  },
  // for one player: start it now (whatever the switch and whether they qualify), the next day on their next
  // load (whatever the time and tasks), or clear their progress (shiny paid stays paid and isn't paid again)
  hfoStart: async (admin, body) => {
    const user = await findUser(body);
    await hfoAdminStart(user.userid);
    await logAdminAction(admin, "hfo-start", target(user), "started now");
    return {};
  },
  hfoNextDay: async (admin, body) => {
    const user = await findUser(body);
    const day = await hfoAdminNextDay(user.userid);
    await logAdminAction(admin, "hfo-next-day", target(user), day >= 4 ? "the waves open on the next load" : `day ${day} starts on the next load`);
    return {};
  },
  hfoReset: async (admin, body) => {
    const user = await findUser(body);
    await hfoAdminReset(user.userid);
    await logAdminAction(admin, "hfo-reset", target(user), "progress cleared (shiny paid stays paid, not paid again)");
    return {};
  },

  // Moloch's Gauntlet: open it now (for the configured days), close it now, or back to the calendar
  gauntlet: async (admin, body) => {
    const state = str(body.state, 8);
    if (state !== "open" && state !== "closed" && state !== "auto") throw new AdminError("open, closed or auto.");
    await setGauntletOverride(state);
    await logAdminAction(admin, `gauntlet-${state}`, null, "");
    return { gauntlet: await gauntletWindow() };
  },
  gauntletReset: async (admin, body) => {
    const user = await findUser(body);
    await resetGauntlet(user);
    await logAdminAction(admin, "gauntlet-reset", target(user), "progress this month started again (rewards paid stay paid, not paid again)");
    return {};
  },

  // 1. Players, a page at a time (QoL #255, 15 October: worked out on the server; the page used to fetch up to
  // 20,000 and filter and sort them itself), filtered by name or id, sorted by id, name or invites, with how many
  // friends joined through their invite link (invites) and how many of those were paid (invitesPaid)
  players: async (_admin, body) => {
    const q = str(body.q, 40).replace(/[%_\\]/g, "");
    const limit = Math.max(1, Math.min(1000, Number(body.limit) || 200));
    const offset = Math.max(0, Number(body.offset) || 0);
    const sort = ["id", "username", "invites"].includes(String(body.sort)) ? String(body.sort) : "id";
    const desc = body.desc === true || body.desc === "1" || body.desc === 1;
    const dir = desc ? "DESC" : "ASC";
    const order = sort === "username" ? `lower(u.username) ${dir}, u.userid ${dir}` : sort === "invites" ? `accepted ${dir}, paid ${dir}, u.userid ${desc ? "ASC" : "DESC"}` : `u.userid ${dir}`;
    const conn = em().getConnection();
    // (QoL #245: and by email (any part of it), or by the last or registration address (from its start, "203.0.113."),
    // the admin panel only)
    const qMail = str(body.q, 120);
    const mailLike = qMail.length >= 3 ? `%${qMail.replace(/[%_\\]/g, (c) => "\\" + c)}%` : null;
    const ipLike = /^[0-9a-fA-F.:]{3,64}$/.test(qMail) && /[.:]/.test(qMail) ? `${qMail}%` : null;
    const rows = (await conn.execute(
      `SELECT u.userid AS id, u.username, u.banned, u.referral_barred, COALESCE(r.accepted, 0)::int AS accepted, COALESCE(r.paid, 0)::int AS paid,
              count(*) OVER ()::int AS found
         FROM bym."user" u
         LEFT JOIN (SELECT referred_by, count(*)::int AS accepted, (count(*) FILTER (WHERE referral_result = 'paid'))::int AS paid
                      FROM bym."user" WHERE referred_by IS NOT NULL GROUP BY referred_by) r ON r.referred_by = u.userid
        WHERE (CAST(? AS text) = '' OR u.username ILIKE ? OR u.userid::text = ?
               OR u.email ILIKE CAST(? AS text) OR u.last_ip LIKE CAST(? AS text) OR u.registration_ip LIKE CAST(? AS text))
        ORDER BY ${order}
        LIMIT ${limit} OFFSET ${offset}`,
      [q, `%${q}%`, q, mailLike, ipLike, ipLike], "all")) as { id: number; username: string; banned: boolean; referral_barred: boolean; accepted: number; paid: number; found: number }[];
    const all = Number(((await conn.execute(`SELECT count(*)::int AS n FROM bym."user"`, [], "all")) as { n: number }[])[0]?.n ?? 0);
    return {
      total: all,
      found: rows.length ? Number(rows[0].found) : (offset ? undefined : 0),
      offset,
      players: rows.map((u) => ({
        id: Number(u.id),
        username: u.username,
        banned: !!u.banned,
        invites: Number(u.accepted),
        invitesPaid: Number(u.paid),
        inviteBarred: !!u.referral_barred,
      })),
    };
  },

  // 1. Find players
  search: async (_admin, body) => {
    const q = str(body.q, 40);
    if (!q) return { players: [] };
    const where = /^\d+$/.test(q)
      ? { $or: [{ userid: Number(q) }, { username: { $ilike: `%${q}%` } }] }
      : { username: { $ilike: `%${q.replace(/[%_]/g, "")}%` } };
    const users = await em().find(User, where, { limit: 25, orderBy: { username: "asc" } });
    return { players: users.map((u) => ({ id: u.userid, username: u.username, banned: u.banned })) };
  },

  // 1. Account card (with kits for 5, mute for 9, report count for 8)
  player: async (_admin, body) => {
    const user = await findUser(body);
    const save = user.save;
    const report = await em().findOne(Report, { userid: user.userid });
    const cell = save?.worldid
      ? await em().findOne(WorldMapCell, { uid: user.userid, base_type: MapRoomCell.HOMECELL, world: save.worldid })
      : null;
    // Invites (services/user/referrals.ts): the players who joined through this player's link, and who invited
    // this player. status: paid / same-ip / no-inviter, "waiting" (hasn't loaded the game yet: nothing decided),
    // "unrecorded" (decided before the result was kept, 1 October)
    const referralStatus = (u: User) => u.referral_result ?? (u.referral_credited ? "unrecorded" : "waiting");
    const friends = await em().find(User, { referred_by: user.userid }, { populate: ["save"], orderBy: { userid: "asc" } });
    const inviter = user.referred_by
      ? await em().findOne(User, { userid: user.referred_by }, { fields: ["userid", "username"] })
      : null;
    return {
      id: user.userid,
      username: user.username,
      banned: user.banned,
      banReason: user.ban_reason ?? "",
      shinyLocked: user.shiny_locked,
      allianceId: user.alliance_id ?? null,
      registered: save?.createtime ? new Date(save.createtime * 1000).toISOString() : null,
      lastSeen: save?.savetime ? new Date(save.savetime * 1000).toISOString() : null,
      world: save?.worldid ?? null,
      home: cell ? [cell.x, cell.y] : null,
      credits: save?.credits ?? 0,
      resources: save?.resources ?? {},
      outposts: save?.outposts?.length ?? 0,
      streak: { day: user.login_streak ?? 0, lastCollected: user.login_last_claim ?? null },
      mutedUntil: await mutedUntil(user.userid),
      renameCooldown: getUsernameCooldown(user)?.toISOString() ?? null,
      boardHidden: Boolean(await redis.send("SISMEMBER", [BOARD_HIDDEN_KEY, String(user.userid)]).catch(() => 0)),
      muteReason: await muteReason(user.userid),
      chatMod: (await chatModerators()).some((m) => m.id === user.userid),
      chatMods: await chatModerators(),
      gauntlet: await gauntletProgress(user),
      hfo: await hfoProgress(user.userid),
      attackViolations: report?.attackViolations ?? 0,
      cheats: (await openCheatsOf(user.userid)).map((c) => ({ rule: c.rule, title: CHEAT_RULES[c.rule]?.title ?? c.rule, count: Number(c.count), last: c.last_at })),
      invites: {
        code: user.referral_code ?? null,
        barred: !!user.referral_barred,
        barredReason: user.referral_barred_reason ?? "",
        accepted: friends.map((f) => ({
          id: f.userid,
          username: f.username,
          joined: f.save?.createtime ? new Date(f.save.createtime * 1000).toISOString() : null,
          status: referralStatus(f),
        })),
        invitedBy: user.referred_by
          ? { id: user.referred_by, username: inviter?.username ?? null, status: referralStatus(user) }
          : null,
      },
      // (QoL #404: the main yard's base id, for "View yard in game")
      baseid: save?.baseid ?? null,
      kits: playerKits(user).map((kit, i) =>
        kit ? { slot: i + 1, name: kit.name, savedAt: kit.savedAt, buildings: Object.keys(kit.buildings).length } : { slot: i + 1 }
      ),
    };
  },

  // 2. Ban / unban
  ban: async (admin, body) => {
    const user = await findUser(body);
    if (isAdmin(user)) throw new AdminError("Admins cannot be banned from the panel.");
    const reason = str(body.reason, 400);
    if (!reason) throw new AdminError("Give the player a reason.");
    await em().nativeUpdate(User, { userid: user.userid }, { banned: true, ban_reason: reason });
    // (13 October: and silent in chat at once; chat has its own sign-in, so a banned player went on talking)
    await redis.set(`chat:banned:${user.userid}`, "1").catch(() => 0);
    await logAdminAction(admin, "ban", target(user), reason);
    return {};
  },
  unban: async (admin, body) => {
    const user = await findUser(body);
    await em().nativeUpdate(User, { userid: user.userid }, { banned: false, ban_reason: null });
    await redis.del(`chat:banned:${user.userid}`).catch(() => 0);
    await logAdminAction(admin, "unban", target(user), "");
    return {};
  },

  // Delete an account for good (services/admin/deleteAccount.ts): the player's username typed again to
  // confirm, and a reason for the log. Never an admin, never the admin's own. Their sign-ins end at once.
  deleteAccount: async (admin, body) => {
    const user = await findUser(body);
    if (isAdmin(user)) throw new AdminError("Admins cannot be deleted from the panel.");
    if (user.userid === admin.userid) throw new AdminError("You cannot delete your own account.");
    if (str(body.confirm, 64) !== user.username) throw new AdminError(`Type the username exactly (${user.username}) to confirm.`);
    const reason = str(body.reason, 400);
    if (!reason) throw new AdminError("Give a reason (it goes in the admin log).");
    const done = await deleteAccount(user.userid);
    if (!done) throw new AdminError("No such player.");
    await endSessions(done.email).catch((err) => logger.warn(`Could not end ${done.email}'s logins: ${err}`));
    await redis.set(`chat:banned:${user.userid}`, "1").catch(() => 0);
    await refreshChatUser(user.userid);
    await logAdminAction(admin, "delete-account", target(user), `${reason} (${done.details})`);
    return { deleted: done.username };
  },

  // Invite rewards: bar a player who abused the invite link (friends joining through it then pay nothing to
  // either side, services/user/referrals.ts), or lift it. Referrals already decided stay as they are.
  inviteBar: async (admin, body) => {
    const user = await findUser(body);
    const reason = str(body.reason, 400);
    if (!reason) throw new AdminError("Give a reason (it goes in the admin log).");
    await em().nativeUpdate(User, { userid: user.userid }, { referral_barred: true, referral_barred_reason: reason });
    await logAdminAction(admin, "invite-bar", target(user), reason);
    return {};
  },
  inviteUnbar: async (admin, body) => {
    const user = await findUser(body);
    await em().nativeUpdate(User, { userid: user.userid }, { referral_barred: false, referral_barred_reason: null });
    await logAdminAction(admin, "invite-unbar", target(user), "");
    return {};
  },

  // 3. Shiny and resources
  credits: async (admin, body) => {
    const user = await findUser(body);
    const amount = int(body.amount);
    const note = str(body.note, 300);
    if (!note) throw new AdminError("A note is required.");
    const save = user.save;
    if (!save) throw new AdminError("The player has no main yard.");
    const before = save.credits ?? 0;
    const after = Math.max(0, before + amount);
    await em().nativeUpdate(Save, { baseid: save.baseid }, { credits: after });
    await logAdminAction(admin, "credits", target(user), `${before} -> ${after} (${amount >= 0 ? "+" : ""}${amount}): ${note}`);
    return { credits: after };
  },
  resources: async (admin, body) => {
    const user = await findUser(body);
    const note = str(body.note, 300);
    if (!note) throw new AdminError("A note is required.");
    const save = user.save;
    if (!save) throw new AdminError("The player has no main yard.");
    const before = { ...(save.resources ?? {}) } as Record<string, number>;
    const after = { ...before };
    // (QoL #279: "add" changes what the yard has now by the amounts given; the old "set" overwrote all four)
    const add = body.mode === "add";
    for (const key of ["r1", "r2", "r3", "r4"]) {
      if (body[key] === undefined || body[key] === "") continue;
      after[key] = Math.max(0, add ? (Number(before[key]) || 0) + int(body[key]) : int(body[key]));
    }
    if (add) {
      const d = ["r1", "r2", "r3", "r4"].map((k) => (body[k] === undefined || body[k] === "" ? 0 : int(body[k])));
      if (d.every((n) => n === 0)) throw new AdminError("Fill in at least one amount.");
      // (in one statement, so a save landing meanwhile isn't overwritten)
      const rows = await em().getConnection().execute<{ resources: Record<string, number> }[]>(
        `UPDATE bym.save SET resources = COALESCE(resources, '{}'::jsonb) || jsonb_build_object(
           'r1', GREATEST(0, COALESCE((resources->>'r1')::numeric, 0) + ?), 'r2', GREATEST(0, COALESCE((resources->>'r2')::numeric, 0) + ?),
           'r3', GREATEST(0, COALESCE((resources->>'r3')::numeric, 0) + ?), 'r4', GREATEST(0, COALESCE((resources->>'r4')::numeric, 0) + ?))
         WHERE baseid = ? RETURNING resources`,
        [d[0], d[1], d[2], d[3], save.baseid]
      );
      const now = rows[0]?.resources ?? after;
      await logAdminAction(admin, "resources", target(user), `${JSON.stringify(before)} + ${JSON.stringify(d)} -> ${JSON.stringify(now)}: ${note}`);
      return { resources: now };
    }
    await em().nativeUpdate(Save, { baseid: save.baseid }, { resources: after });
    await logAdminAction(admin, "resources", target(user), `${JSON.stringify(before)} -> ${JSON.stringify(after)}: ${note}`);
    return { resources: after };
  },

  // QoL #403: a player's monsters (main yard): Strongbox, Academy levels and the monsters in their Compounds; read only.
  // canChange says whether monsterGive can be used now (see savesOverIt).
  monsters: async (_admin, body) => {
    const user = await findUser(body);
    const save = user.save;
    if (!save) return { monsters: [], canChange: "The player has no main yard." };
    const locker = objectOf(save.lockerdata);
    const academy = objectOf(save.academy);
    const raw = objectOf(save.monsters);
    const housed = objectOf(raw.housed ?? raw);
    const ids = [...new Set([...Object.keys(locker), ...Object.keys(academy), ...Object.keys(housed)])].filter((id) => MONSTER_ID.test(id));
    const order = (id: string) => (id.startsWith("IC") ? 1000 : 0) + Number(id.replace(/\D/g, ""));
    const now = Math.floor(Date.now() / 1000);
    return {
      savedAt: save.savetime ? Number(save.savetime) * 1000 : null,
      canChange: await savesOverIt(user),
      monsters: ids.sort((a, b) => order(a) - order(b)).map((id) => {
        const t = Number(objectOf(locker[id]).t);
        const a = objectOf(academy[id]);
        const time = Number(a.time);
        const h = housed[id];
        return {
          id,
          strongbox: t === 2 ? "unlocked" : t === 1 ? "unlocking" : "locked",
          level: Number(a.level) || 0,
          // (training under way: the game reads 162 hours or less as "from now", more as the time it ends)
          trainingEnds: Number.isFinite(time) && time > 0 ? (time <= 60 * 60 * 162 ? (now + time) * 1000 : time * 1000) : null,
          housed: Array.isArray(h) ? h.length : Number(h) || 0,
        };
      }),
    };
  },
  // QoL #403: a monster unlocked in a player's Strongbox (Academy level 1 too, if it has none), or its Academy level set
  // (1-6; training under way for it stops), on their main yard, with a note for the admin log, as Shiny is given above.
  // Only while the player's game isn't open (savesOverIt). Taken on their next load.
  monsterGive: async (admin, body) => {
    const user = await findUser(body);
    const save = user.save;
    if (!save) throw new AdminError("The player has no main yard.");
    const monster = str(body.monster, 8).toUpperCase();
    if (!MONSTER_ID.test(monster)) throw new AdminError("A monster id, such as IC1 or C12.");
    const what = str(body.what, 10);
    if (what !== "unlock" && what !== "academy") throw new AdminError("Unlock or Academy level.");
    const note = str(body.note, 300);
    if (!note) throw new AdminError("A note is required.");
    const why = await savesOverIt(user);
    if (why) throw new AdminError(why);
    const beforeLocker = JSON.stringify(objectOf(save.lockerdata)[monster] ?? null);
    const beforeAcademy = JSON.stringify(objectOf(save.academy)[monster] ?? null);
    const conn = em().getConnection();
    if (what === "unlock") {
      const rows = (await conn.execute(
        `UPDATE bym.save SET
           lockerdata = COALESCE(lockerdata, '{}'::jsonb) || jsonb_build_object(CAST(? AS text), jsonb_build_object('t', 2)),
           academy = CASE WHEN jsonb_typeof(COALESCE(academy, '{}'::jsonb) -> CAST(? AS text)) = 'object' THEN academy
                          ELSE COALESCE(academy, '{}'::jsonb) || jsonb_build_object(CAST(? AS text), jsonb_build_object('level', 1)) END
         WHERE baseid = ? AND (lockerdata IS NULL OR jsonb_typeof(lockerdata) = 'object') AND (academy IS NULL OR jsonb_typeof(academy) = 'object')
         RETURNING lockerdata -> CAST(? AS text) AS locker, academy -> CAST(? AS text) AS academy`,
        [monster, monster, monster, save.baseid, monster, monster], "all")) as { locker: unknown; academy: unknown }[];
      if (!rows.length) throw new AdminError("The player's Strongbox or Academy isn't readable as saved: nothing was changed.");
      await logAdminAction(admin, "monster-unlock", target(user), `${monster}: Strongbox ${beforeLocker} -> ${JSON.stringify(rows[0].locker)}, Academy ${beforeAcademy} -> ${JSON.stringify(rows[0].academy)}: ${note}`);
      return { monster, strongbox: "unlocked" };
    }
    const level = int(body.level);
    if (level < 1 || level > 6) throw new AdminError("An Academy level from 1 to 6.");
    const rows = (await conn.execute(
      `UPDATE bym.save SET academy = COALESCE(academy, '{}'::jsonb) || jsonb_build_object(CAST(? AS text),
           (CASE WHEN jsonb_typeof(COALESCE(academy, '{}'::jsonb) -> CAST(? AS text)) = 'object' THEN academy -> CAST(? AS text) ELSE '{}'::jsonb END)
             - 'time' - 'duration' || jsonb_build_object('level', CAST(? AS int)))
         WHERE baseid = ? AND (academy IS NULL OR jsonb_typeof(academy) = 'object')
         RETURNING academy -> CAST(? AS text) AS entry`,
      [monster, monster, monster, level, save.baseid, monster], "all")) as { entry: unknown }[];
    if (!rows.length) throw new AdminError("The player's Academy isn't readable as saved: nothing was changed.");
    await logAdminAction(admin, "monster-academy", target(user), `${monster}: ${beforeAcademy} -> ${JSON.stringify(rows[0].entry)}: ${note}`);
    return { monster, level };
  },

  // QoL #401: Shiny for many players at once (compensation): everyone, those active in the last N days, or a list of
  // names or ids; banned players never. `compensatePreview` says who; `compensate` gives it, asking the count
  // seen in the preview back, so the group can't have changed under the admin's eyes.
  compensatePreview: async (_admin, body) => {
    const ids = await compensationTargets(body);
    const sample = ids.length ? await em().find(User, { userid: { $in: ids.slice(0, 20) } }, { fields: ["userid", "username"] }) : [];
    return { count: ids.length, sample: sample.map((u) => u.username) };
  },
  compensate: async (admin, body) => {
    const amount = int(body.amount);
    if (!amount || Math.abs(amount) > 100_000) throw new AdminError("An amount from -100,000 to 100,000, not 0.");
    const note = str(body.note, 300);
    if (!note) throw new AdminError("A note is required (it goes in the log).");
    const ids = await compensationTargets(body);
    if (!ids.length) throw new AdminError("Nobody matches (banned players and those without a yard yet are left out).");
    if (int(body.count) !== ids.length) throw new AdminError(`The group is ${ids.length} players now, not ${int(body.count)}: preview it again.`);
    const rows = (await em().getConnection().execute(
      `UPDATE bym.save s SET credits = GREATEST(0, COALESCE(s.credits, 0) + ?)
         FROM bym."user" u
        WHERE s.basesaveid = u.save_basesaveid AND u.userid = ANY(CAST(? AS int[]))
        RETURNING u.userid`,
      [amount, `{${ids.join(",")}}`], "all")) as { userid: number }[];
    await logAdminAction(admin, "compensate", null, `${amount >= 0 ? "+" : ""}${amount} Shiny to ${rows.length} players (${String(body.who ?? "")}${body.days ? ` ${body.days} days` : ""}): ${note}`);
    return { players: rows.length };
  },

  // 4. Login streak: day 0 resets; day N means N days collected in a row, today's still to collect.
  streak: async (admin, body) => {
    const user = await findUser(body);
    const day = Math.max(0, Math.min(6, int(body.day)));
    const yesterday = utcDay(new Date(Date.now() - 86_400_000));
    await em().nativeUpdate(
      User,
      { userid: user.userid },
      { login_streak: day, login_last_claim: day > 0 ? yesterday : null }
    );
    await logAdminAction(admin, "streak", target(user), `set to day ${day}`);
    return {};
  },

  // 4b. Quest book (services/quests/)
  quests: async (_admin, body) => {
    const user = await findUser(body);
    const view = await questAdminView(user);
    return {
      claimed: view.status.claimed,
      total: view.status.total,
      ready: view.status.ready,
      quests: view.status.quests.map((x) => ({ id: x.id, cat: x.cat, state: x.state, value: x.value, target: x.target })),
      chests: view.status.chests.map((x) => ({ id: x.id, state: x.state, done: x.done, total: x.total })),
      counters: view.counters,
      forced: view.forced,
    };
  },
  questForce: async (admin, body) => {
    const user = await findUser(body);
    const id = str(body.quest, 40);
    try {
      await questAdminForce(user.userid, id);
    } catch (err) {
      throw new AdminError((err as Error).message);
    }
    await logAdminAction(admin, "quest-force", target(user), id);
    return {};
  },
  questReset: async (admin, body) => {
    const user = await findUser(body);
    const id = str(body.quest, 40) || "all";
    await questAdminReset(user.userid, id);
    await logAdminAction(admin, "quest-reset", target(user), id);
    return {};
  },

  // 5. Saved kits
  kitRename: async (admin, body) => {
    const user = await findUser(body);
    const slot = int(body.slot);
    const kits = playerKits(user);
    const kit = kits[slot - 1];
    if (!kit) throw new AdminError("That slot is empty.");
    const old = kit.name;
    kit.name = cleanKitName(body.name, slot);
    await em().nativeUpdate(User, { userid: user.userid }, { player_kits: kits });
    await logAdminAction(admin, "kit-rename", target(user), `slot ${slot}: "${old}" -> "${kit.name}"`);
    return {};
  },
  kitDelete: async (admin, body) => {
    const user = await findUser(body);
    const slot = int(body.slot);
    const kits = playerKits(user);
    const kit = kits[slot - 1];
    if (!kit) throw new AdminError("That slot is empty.");
    kits[slot - 1] = null;
    await em().nativeUpdate(User, { userid: user.userid }, { player_kits: kits });
    removePictures(kit.image);
    await logAdminAction(admin, "kit-delete", target(user), `slot ${slot}: "${kit.name}"`);
    return {};
  },

  // QoL #253: a cheater's scores wiped: the Devil's Arcade's (scores and ghosts) and Hellgate's best deleted, and
  // taken off the Brimstone Pit's board (its bets are the Pit's history and stay). `undo` puts them back on the Pit's.
  scoreWipe: async (admin, body) => {
    const user = await findUser(body);
    const reason = str(body.reason, 300);
    if (!reason) throw new AdminError("Give a reason (it goes in the admin log).");
    const conn = em().getConnection();
    const arcade = Number(((await conn.execute(`WITH d AS (DELETE FROM bym.arcade_score WHERE user_id = ? RETURNING 1) SELECT count(*)::int AS n FROM d`, [user.userid], "all").catch(() => [{ n: 0 }])) as { n: number }[])[0]?.n ?? 0);
    await conn.execute(`DELETE FROM bym.arcade_ghost WHERE user_id = ?`, [user.userid]).catch(() => undefined);
    const td = Number(((await conn.execute(`WITH d AS (DELETE FROM bym.td_score WHERE user_id = ? RETURNING 1) SELECT count(*)::int AS n FROM d`, [user.userid], "all").catch(() => [{ n: 0 }])) as { n: number }[])[0]?.n ?? 0);
    await redis.send("SADD", [BOARD_HIDDEN_KEY, String(user.userid)]);
    await logAdminAction(admin, "score-wipe", target(user), `${arcade} arcade score(s), ${td ? "the Hellgate best" : "no Hellgate best"}, off the Pit's board: ${reason}`);
    return { arcade, td };
  },
  scoreUnhide: async (admin, body) => {
    const user = await findUser(body);
    await redis.send("SREM", [BOARD_HIDDEN_KEY, String(user.userid)]);
    await logAdminAction(admin, "score-unhide", target(user), "back on the Pit's and Hellgate's boards");
    return {};
  },

  // QoL #248: rename from the panel (the player's own cooldown isn't started by it), and the cooldown lifted
  rename: async (admin, body) => {
    const user = await findUser(body);
    // (18 October, SUSPECTED-BUGS.md: an owner is an owner by name, so any admin could take an owner's rights away
    // by renaming them) staff only by an owner, and never an owner named in the server's config
    staffTargetCheck(admin, user);
    if (isConfigOwner(user)) throw new AdminError("This account is an owner in the server's config (InfernoOnlyConfig.admins): its name can't be changed here.");
    const parsed = usernameSchema.safeParse(str(body.username, 40));
    if (!parsed.success) throw new AdminError(parsed.error.issues[0]?.message ?? "That name isn't allowed.");
    const keep = user.username_changed_at ?? null;
    const old = user.username;
    try {
      await renameUser(user, parsed.data);
    } catch (err) {
      throw new AdminError((err as Error).message || "That name is taken.");
    }
    await em().nativeUpdate(User, { userid: user.userid }, { username_changed_at: keep });
    await refreshChatUser(user.userid);
    await logAdminAction(admin, "rename", { userid: user.userid, username: parsed.data }, `${old} -> ${parsed.data}`);
    return { username: parsed.data };
  },
  renameCooldownReset: async (admin, body) => {
    const user = await findUser(body);
    await em().nativeUpdate(User, { userid: user.userid }, { username_changed_at: null });
    await logAdminAction(admin, "rename-cooldown-reset", target(user), "");
    return {};
  },

  // QoL #257: who is online now (active in the last 5 minutes), most recent first, those appearing offline marked
  online: async () => {
    const all = (await presenceSince(ONLINE_SECONDS, 2000)).filter((p) => p.online);
    const ids = all.map((p) => p.id);
    const users = ids.length ? await em().find(User, { userid: { $in: ids } }, { fields: ["userid", "username"] }) : [];
    const names = new Map(users.map((u) => [u.userid, u.username]));
    return { players: all.map((p) => ({ id: p.id, username: names.get(p.id) ?? `#${p.id}`, at: p.at * 1000, hidden: !!p.hidden })) };
  },

  // QoL #259: the panel's sessions (who, since when, from where), and ending one (or all but your own)
  sessions: async (_admin, _body, ctx) => ({ sessions: await listSessions(ctx.cookies.get(ADMIN_COOKIE)) }),
  sessionEnd: async (admin, body, ctx) => {
    const id = str(body.id, 16);
    // (18 October, SUSPECTED-BUGS.md: any admin could sign an owner out of the panel) only owners end other staff
    // members' sessions
    const ended = await endSessionById(id, ctx.cookies.get(ADMIN_COOKIE), body.others === true || body.others === "1", isOwner(admin) ? undefined : admin.username);
    await logAdminAction(admin, "panel-session-end", null, body.others ? `${ended} other session(s)` : `session ${id}`);
    return { ended };
  },

  // QoL #405: who is in test mode now, and switching it off for one of them (their yard put back as test mode does)
  testModeList: async () => {
    const ids = await testModeUserIds();
    const users = ids.length ? await em().find(User, { userid: { $in: ids } }, { fields: ["userid", "username"] }) : [];
    const since = await Promise.all(users.map((u) => redis.get(`admin:testmode:${u.userid}`).catch(() => null)));
    const at = (raw: string | null) => {
      try {
        return Number(JSON.parse(String(raw)).since) * 1000 || null;
      } catch {
        return null;
      }
    };
    return { users: users.map((u, i) => ({ id: u.userid, username: u.username, since: at(since[i]) })) };
  },
  testModeOff: async (admin, body) => {
    const user = await findUser(body);
    const ended = await endTestMode(user, `turned off from the admin panel by ${admin.username}`);
    await logAdminAction(admin, "testmode-off", target(user), ended ? "ended, yard put back" : "was not on (tidied)");
    return { ended };
  },

  // 6. Shiny lock
  shinyUnlock: async (admin, body) => {
    const user = await findUser(body);
    await em().nativeUpdate(User, { userid: user.userid }, { shiny_locked: false });
    await logAdminAction(admin, "shiny-unlock", target(user), "");
    return {};
  },

  // 7. Move a main yard to a free land cell in its own world
  relocate: async (admin, body) => {
    const user = await findUser(body);
    const save = user.save;
    if (!save?.worldid) throw new AdminError("The player has no map world.");
    const x = int(body.x);
    const y = int(body.y);
    if (x < 0 || y < 0 || x >= MapRoom2.WIDTH || y >= MapRoom2.HEIGHT) throw new AdminError("Those coordinates are off the map.");
    const height = getTerrainHeight(generateNoise(save.worldid), x, y);
    if (height <= Terrain.WATER3) throw new AdminError("That cell is water.");
    if (tribeForCell(save.worldid, x, y).tribe === Tribe.MOLOCH) throw new AdminError("That cell is a Moloch stronghold.");

    const fork = em();
    if (await fork.findOne(WorldMapCell, { world: save.worldid, x, y })) throw new AdminError("That cell is taken.");
    const home = await fork.findOne(WorldMapCell, { uid: user.userid, base_type: MapRoomCell.HOMECELL, world: save.worldid });
    if (!home) throw new AdminError("The player's home cell was not found.");
    const from = `${home.x},${home.y}`;
    home.x = x;
    home.y = y;
    home.terrainHeight = height;
    await fork.flush();
    await fork.nativeUpdate(Save, { baseid: save.baseid }, { homebase: [String(x), String(y)] });
    await logAdminAction(admin, "relocate", target(user), `${from} -> ${x},${y}`);
    return {};
  },

  // 8. Attack-violation reports
  reports: async () => {
    const rows = await em().find(Report, { $or: [{ attackViolations: { $gt: 0 } }, { violations: { $gt: 0 } }] }, { orderBy: { lastupdateAt: "desc" }, limit: 100 });
    const users = await em().find(User, { userid: { $in: rows.map((r) => r.userid) } }, { fields: ["userid", "banned"] });
    const banned = new Map(users.map((u) => [u.userid, u.banned]));
    return {
      reports: rows.map((r) => ({
        id: r.userid,
        username: r.username,
        attackViolations: r.attackViolations,
        violations: r.violations,
        banned: banned.get(r.userid) ?? false,
        updated: r.lastupdateAt,
        recent: (Array.isArray(r.report) ? r.report : []).slice(-5),
      })),
    };
  },
  reportDismiss: async (admin, body) => {
    const id = int(body.id);
    const report = await em().findOne(Report, { userid: id });
    if (!report) throw new AdminError("No such report.");
    await em().nativeUpdate(Report, { userid: id }, { attackViolations: 0, violations: 0 });
    await logAdminAction(admin, "report-dismiss", { userid: id, username: report.username }, `was ${report.attackViolations} refused attacks`);
    return {};
  },

  // 8b. The cheat detector's reports (services/anticheat)
  cheats: async (_admin, body) => {
    const status = String(body.status ?? "open") === "dismissed" ? "dismissed" : "open";
    const reports = await listCheatReports(status);
    // (QoL #407: a dismissal's note)
    const notes = await Promise.all(reports.map((r) => redis.get(`cheat:note:${r.id}`).catch(() => null)));
    return { reports: reports.map((r, i) => ({ ...r, note: notes[i] ?? "" })), rules: Object.entries(CHEAT_RULES).map(([id, r]) => ({ id, ...r })) };
  },
  cheatDismiss: async (admin, body) => {
    const id = int(body.id);
    const row = await dismissCheatReport(id, admin.username);
    if (!row) throw new AdminError("No such open report.");
    // (QoL #407: with a note, kept with the report)
    const note = str(body.note, 300);
    if (note) await redis.set(`cheat:note:${id}`, note).catch(() => 0);
    await logAdminAction(admin, "cheat-dismiss", { userid: row.userid, username: row.username }, `${CHEAT_RULES[row.rule]?.title ?? row.rule}, ${row.count} time(s)${note ? `: ${note}` : ""}`);
    return {};
  },
  // QoL #407: a dismissed report open again (unless the same rule has an open one for that player already)
  cheatReopen: async (admin, body) => {
    const id = int(body.id);
    const conn = em().getConnection();
    const rows = (await conn.execute(`SELECT userid, username, rule FROM bym.cheat_report WHERE id = ? AND status = 'dismissed'`, [id], "all")) as { userid: number; username: string; rule: string }[];
    const row = rows[0];
    if (!row) throw new AdminError("No such dismissed report.");
    const open = (await conn.execute(`SELECT count(*)::int AS n FROM bym.cheat_report WHERE userid = ? AND rule = ? AND status = 'open'`, [row.userid, row.rule], "all")) as { n: number }[];
    if (Number(open[0]?.n) > 0) throw new AdminError("This player has an open report for the same check already: look at that one.");
    await conn.execute(`UPDATE bym.cheat_report SET status = 'open', reviewed_by = NULL, reviewed_at = NULL WHERE id = ?`, [id]);
    await logAdminAction(admin, "cheat-reopen", { userid: Number(row.userid), username: row.username }, CHEAT_RULES[row.rule]?.title ?? row.rule);
    return {};
  },

  // 9. Chat mute
  mute: async (admin, body) => {
    const user = await findUser(body);
    const minutes = Math.max(1, Math.min(60 * 24 * 30, int(body.minutes)));
    // (QoL #262: a reason, shown to the player)
    const reason = str(body.reason, 200).replace(/[<>]/g, "");
    await muteUser(user.userid, minutes, reason);
    await logAdminAction(admin, "mute", target(user), `${minutes} minutes${reason ? `: ${reason}` : ""}`);
    return {};
  },
  unmute: async (admin, body) => {
    const user = await findUser(body);
    await unmuteUser(user.userid);
    await logAdminAction(admin, "unmute", target(user), "");
    return {};
  },
  // Chat moderator: a [Mod] badge in chat, and Delete line / Mute in the game's name menu (chat/chatModeration.ts)
  chatMod: async (admin, body) => {
    const user = await findUser(body);
    const on = body.on === true || body.on === 1 || body.on === "1";
    try {
      await postgres.em.getConnection().execute(`UPDATE bym."user" SET chat_mod = ? WHERE userid = ?`, [on, user.userid]);
    } catch {
      throw new AdminError("Run the database migrations first (20261005_AddChatModerators).");
    }
    await logAdminAction(admin, on ? "chat-mod" : "chat-unmod", target(user), "");
    await refreshChatUser(user.userid);
    return {};
  },

  // 10. Announcements
  announce: async (admin, body) => {
    const text = str(body.text, 500).replace(/[<>]/g, "");
    if (!text) throw new AdminError("Write the announcement first.");
    const hours = Math.max(1, Math.min(24 * 14, Number(body.hours) || 24));
    const toChat = body.chat === true || body.chat === "1";
    await setAnnouncement(text, hours, toChat);
    await logAdminAction(admin, "announce", null, `${hours}h${toChat ? " +chat" : ""}: ${text}`);
    return {};
  },
  announceClear: async (admin) => {
    await clearAnnouncement();
    await logAdminAction(admin, "announce-clear", null, "");
    return {};
  },

  // 11. Relocation invites
  invites: async () => {
    const rows = await em().find(
      Message,
      { messagetype: MessageType.MIGRATE_REQUEST, migratestate: "requested" },
      { limit: 200, orderBy: { updatetime: "desc" } }
    );
    const ids = [...new Set(rows.flatMap((m) => [m.userid, m.targetid]))];
    const names = new Map((await em().find(User, { userid: { $in: ids } }, { fields: ["userid", "username"] })).map((u) => [u.userid, u.username]));
    return {
      invites: rows.map((m) => ({
        id: m.id,
        from: names.get(m.userid) ?? m.userid,
        to: names.get(m.targetid) ?? m.targetid,
        baseid: m.baseid,
        coords: m.coords,
        sent: m.updatetime,
      })),
    };
  },
  inviteCancel: async (admin, body) => {
    const id = str(body.id, 64);
    const invite = await em().findOne(Message, { id, migratestate: "requested" });
    if (!invite) throw new AdminError("That invite is no longer pending.");
    await em().nativeUpdate(Message, { id }, { migratestate: "revoked" });
    await logAdminAction(admin, "invite-cancel", { userid: invite.userid }, `outpost ${invite.baseid}, to user ${invite.targetid}`);
    return {};
  },

  // 12. Inspect a cell
  cell: async (_admin, body) => {
    const world = await worldOf(body);
    const x = int(body.x);
    const y = int(body.y);
    const record = await em().findOne(WorldMapCell, { world: world.uuid, x, y });
    const save = record?.baseid ? await em().findOne(Save, { baseid: record.baseid }) : null;
    const owner = record?.uid ? await em().findOne(User, { userid: record.uid }, { fields: ["userid", "username"] }) : null;
    const tribe = tribeForCell(world.uuid, x, y);
    const height = getTerrainHeight(generateNoise(world.uuid), x, y);
    return {
      world: world.uuid,
      x,
      y,
      terrain: height,
      water: height <= Terrain.WATER3,
      stored: record
        ? {
            type: ({ 1: "tribe yard", 2: "main yard", 3: "outpost" } as Record<number, string>)[record.base_type] ?? record.base_type,
            baseid: record.baseid,
            owner: owner ? { id: owner.userid, username: owner.username } : null,
            created: save?.createtime ? new Date(save.createtime * 1000).toISOString() : null,
            destroyed: save?.destroyed ?? 0,
          }
        : null,
      tribe: { tribe: tribe.tribe, level: tribe.level },
    };
  },

  // 13. Reset stored tribe yards (one cell, or all)
  resetTribes: async (admin, body) => {
    const fork = em();
    // Yards a player is attacking right now are left (their next save would find no yard); a later
    // reset takes them.
    const busySince = Math.floor(Date.now() / 1000) - ATTACK_TIMEOUT;
    if (body.all === true || body.all === "1") {
      const busy = (
        await fork.find(Save, { type: BaseType.TRIBE, attackid: { $ne: 0 }, savetime: { $gte: busySince } }, { fields: ["baseid"] })
      ).map((save) => save.baseid);
      const keep = busy.length ? { $or: [{ baseid: null }, { baseid: { $nin: busy } }] } : {};
      // (Moloch's Gauntlet yards are tribe yards too, but each player's own: they are left.)
      const gauntletYards = (await fork.find(Save, { type: BaseType.TRIBE, baseid: { $like: "9%" } }, { fields: ["baseid"] }))
        .map((save) => save.baseid)
        .filter((baseid) => isGauntletBaseId(baseid));
      const leave = [...busy, ...gauntletYards];
      const saves = await fork.nativeDelete(Save, { type: BaseType.TRIBE, ...(leave.length ? { baseid: { $nin: leave } } : {}) });
      const cells = await fork.nativeDelete(WorldMapCell, { base_type: MapRoomCell.WM, ...keep });
      await logAdminAction(admin, "reset-tribes", null, `all: ${saves} yards, ${cells} cells` + (busy.length ? `, ${busy.length} under attack left` : ""));
      return { yards: saves, underAttack: busy.length };
    }
    const world = await worldOf(body);
    const x = int(body.x);
    const y = int(body.y);
    const record = await fork.findOne(WorldMapCell, { world: world.uuid, x, y, base_type: MapRoomCell.WM });
    if (!record) throw new AdminError("No stored tribe yard on that cell (it is generated fresh already).");
    if (record.baseid) {
      const busy = await fork.count(Save, { baseid: record.baseid, type: BaseType.TRIBE, attackid: { $ne: 0 }, savetime: { $gte: busySince } });
      if (busy) throw new AdminError("A player is attacking that yard right now. Try again in a few minutes.");
      await fork.nativeDelete(Save, { baseid: record.baseid, type: BaseType.TRIBE });
    }
    await fork.nativeDelete(WorldMapCell, { cellid: record.cellid });
    await logAdminAction(admin, "reset-tribes", null, `cell ${x},${y} in ${world.uuid}`);
    return { yards: 1 };
  },

  // 14. Worlds
  worlds: async () => {
    const worlds = await em().find(World, {}, { orderBy: { playerCount: "desc" } });
    const molochs = await em().find(Save, { type: BaseType.TRIBE, wmid: 51, destroyed: 1 }, { fields: ["worldid"] });
    return {
      worlds: worlds.map((w) => ({
        uuid: w.uuid,
        players: w.playerCount,
        molochsDestroyed: molochs.filter((m) => m.worldid === w.uuid).length,
      })),
      maxPlayers: MapRoom2.MAX_PLAYERS,
    };
  },

  // QoL #400: maintenance planned in N minutes (players warned at 15, 5 and 1 minutes), or the plan cancelled
  maintenanceAt: async (admin, body) => {
    const minutes = Number(body.minutes);
    if (body.cancel === true || body.cancel === "1") {
      await cancelMaintenanceSchedule();
      await logAdminAction(admin, "maintenance-plan-cancel", null, "");
      return { plan: null };
    }
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) throw new AdminError("In 1 minute to 24 hours.");
    const message = str(body.message, 400);
    if (!message) throw new AdminError("Write the message players will see.");
    const plan = await scheduleMaintenance(minutes, message);
    await logAdminAction(admin, "maintenance-plan", null, `at ${new Date(plan.at).toISOString()}: ${message}`);
    return { plan };
  },

  // 16. Maintenance mode
  maintenance: async (admin, body) => {
    const message = str(body.message, 400);
    await setMaintenance(message || null);
    await logAdminAction(admin, message ? "maintenance-on" : "maintenance-off", null, message);
    return { maintenance: message || null };
  },

  // Automatic bug reports from the game (services/admin/bugReports.ts)
  bugs: async (_admin, body) => {
    const status = str(body.status, 8) === "fixed" ? "fixed" : "open";
    const rows = await em().find(BugReport, { status }, { orderBy: { last_seen: "desc" }, limit: 200 });
    // Who hit each one: the names of its most recent players (up to 5).
    const recent = (b: BugReport) => (b.users ?? []).slice(-5).reverse();
    const ids = [...new Set(rows.flatMap(recent))];
    const names = new Map(
      ids.length ? (await em().find(User, { userid: { $in: ids } }, { fields: ["userid", "username"] })).map((u) => [u.userid, u.username]) : []
    );
    // (QoL #258: the last 5 reports of each)
    const samples = new Map<number, unknown[]>();
    await Promise.all(rows.map(async (b) => samples.set(b.id, await bugSamples(b.id))));
    return {
      bugs: rows.map((b) => ({
        reporters: recent(b).map((id) => ({ id, username: names.get(id) ?? `#${id}` })),
        id: b.id,
        title: b.title,
        details: b.details,
        context: b.context,
        count: b.count,
        players: b.user_count,
        build: b.last_build,
        firstSeen: b.first_seen,
        lastSeen: b.last_seen,
        fixedAt: b.fixed_at ?? null,
        samples: samples.get(b.id) ?? [],
      })),
    };
  },
  bugStatus: async (admin, body) => {
    const id = int(body.id);
    const status = str(body.status, 8) === "fixed" ? "fixed" : "open";
    const bug = await em().findOne(BugReport, { id });
    if (!bug) throw new AdminError("No such bug.");
    await em().nativeUpdate(BugReport, { id }, { status, fixed_at: status === "fixed" ? new Date() : null });
    // (QoL #258: the build out now: reports from older games don't reopen it)
    if (status === "fixed" && getPublishedBuild()) await redis.set(fixedBuildKey(id), String(getPublishedBuild())).catch(() => 0);
    if (status === "open") await redis.del(fixedBuildKey(id)).catch(() => 0);
    await logAdminAction(admin, status === "fixed" ? "bug-fixed" : "bug-reopen", null, `#${id}: ${bug.title}`);
    return {};
  },
  bugDelete: async (admin, body) => {
    const id = int(body.id);
    const bug = await em().findOne(BugReport, { id });
    if (!bug) throw new AdminError("No such bug.");
    await em().nativeDelete(BugReport, { id });
    await redis.del(`bug:samples:${id}`).catch(() => 0);
    await redis.del(fixedBuildKey(id)).catch(() => 0);
    await logAdminAction(admin, "bug-delete", null, `#${id}: ${bug.title}`);
    return {};
  },

  // (25 November) What players sent from the game's right-click menu: bug reports and suggestions
  // (services/feedback/playerFeedback.ts). The list is without its pictures: feedbackPicture gets one.
  feedback: async (_admin, body) => {
    const status = str(body.status, 12) || "open";
    const kind = str(body.kind, 8);
    return { reports: await listFeedback(status, kind), counts: await feedbackCounts() };
  },
  feedbackPicture: async (_admin, body) => {
    const id = int(body.id);
    const image = await feedbackPicture(id, str(body.which, 8) === "picture" ? "picture" : "shot");
    if (!image) throw new AdminError("No picture.");
    return { image };
  },
  feedbackSet: async (admin, body) => {
    const id = int(body.id);
    const change: { status?: string; reply?: string; note?: string } = {};
    if (body.status !== undefined) change.status = str(body.status, 12);
    if (body.reply !== undefined) change.reply = String(body.reply ?? "").slice(0, 2000);
    if (body.note !== undefined) change.note = String(body.note ?? "").slice(0, 2000);
    let row;
    try {
      row = await updateFeedback(id, change, admin.username);
    } catch (e) {
      if (e instanceof FeedbackRefused) throw new AdminError(e.message);
      throw e;
    }
    if (!row) throw new AdminError("No such report.");
    const what = [change.status !== undefined ? `status ${change.status}` : "", change.reply !== undefined ? "answer" : "", change.note !== undefined ? "note" : ""].filter(Boolean).join(", ");
    await logAdminAction(admin, "feedback-set", { userid: row.userid, username: row.username }, `#${id} (${row.kind}): ${what}`);
    return { report: row };
  },
  feedbackDelete: async (admin, body) => {
    const id = int(body.id);
    const row = await feedbackById(id);
    if (!row || !(await deleteFeedback(id))) throw new AdminError("No such report.");
    await logAdminAction(admin, "feedback-delete", { userid: row.userid, username: row.username }, `#${id} (${row.kind}): ${row.text.slice(0, 80)}`);
    return {};
  },

  // QoL #269: the Health tab (services/admin/health.ts): database connections, Redis memory, the requests found
  // slow in the last hour, and 5xx answers per hour since the server started
  health: async () => ({ health: await serverHealth() }),

  // QoL #271: the copies of inferno-kits.json kept at each Designer save (services/admin/designs.ts), and one put
  // back (the file as it is now is copied first)
  kitBackups: async () => listKitBackups(),
  kitRestore: async (admin, body) => {
    try {
      return await restoreKitBackup(admin, str(body.name, 80));
    } catch (err) {
      if (err instanceof DesignError) throw new AdminError(err.message);
      throw err;
    }
  },

  // QoL #420: the Designer's layouts and kits as one file (the format scripts/export-designs.ts writes: `file`, its
  // text), and such a file looked at (apply not 1: what it holds and what would change) or put in use (apply 1).
  // `file`: the file's text, or the parsed object. The game's Designer does the same (POST admin/design).
  designExport: async () => {
    try {
      return exportDesigns();
    } catch (err) {
      if (err instanceof DesignError) throw new AdminError(err.message);
      throw err;
    }
  },
  designImport: async (admin, body) => {
    try {
      return await importDesigns(admin, body.file, String(body.apply ?? "") === "1");
    } catch (err) {
      if (err instanceof DesignError) throw new AdminError(err.message);
      throw err;
    }
  },

  // QoL #398: the Frozen Monster Invasion (services/events/fmi.ts): this month's (or the next) invasion and how many
  // players are in it, and one player's waves. (16 October: opened, closed or reset with fmiSet / fmiReset below.)
  fmi: async () => {
    const w = fmiShown();
    const waves = infernoOnlyConfig.fmi.waves;
    const rows = (await em().getConnection().execute(
      `SELECT count(*)::int AS players, (count(*) FILTER (WHERE COALESCE((fmi->>'won')::int, 0) > 0))::int AS won,
              (count(*) FILTER (WHERE COALESCE((fmi->>'won')::int, 0) >= ?))::int AS finished
         FROM bym."user" WHERE fmi IS NOT NULL AND fmi->>'key' = ?`,
      [waves, w.key], "all").catch(() => [])) as { players: number; won: number; finished: number }[];
    const r = rows[0] ?? { players: 0, won: 0, finished: 0 };
    return { fmi: { enabled: fmiEnabled(), key: w.key, kind: w.kind, open: w.open, startsAt: w.startsAt, endsAt: w.endsAt, waves, players: Number(r.players), won: Number(r.won), finished: Number(r.finished) } };
  },
  fmiPlayer: async (_admin, body) => {
    const user = await findUser(body);
    const eligible = await hfoFinalWaveWon(user.userid).catch(() => false);
    const view = await fmiView(user, false).catch(() => null);
    const trophies: Record<string, number> = await readTrophies(user.userid).catch(() => ({}));
    return {
      enabled: fmiEnabled(),
      eligible,
      view: view ? { key: view.key, kind: view.kind, open: view.open, waves: view.waves, won: view.won, fight: view.fight, last: view.last } : null,
      totems: { fmi1: Number(trophies.fmi1 ?? 0), fmi2: Number(trophies.fmi2 ?? 0) },
    };
  },

  // QoL #246: a player's logins of the last 90 days (services/admin/loginHistory.ts, written by the login), and the
  // other accounts that logged in in the same browsers
  loginHistory: async (_admin, body) => {
    const user = await findUser(body);
    const h = await loginHistory(user.userid);
    const ids = h.sameBrowser.map((o) => o.id);
    const users = ids.length ? await em().find(User, { userid: { $in: ids } }, { fields: ["userid", "username", "banned"] }) : [];
    const byId = new Map(users.map((u) => [u.userid, u]));
    return {
      days: 90,
      logins: h.logins,
      sameBrowser: h.sameBrowser.map((o) => ({ ...o, username: byId.get(o.id)?.username ?? null, banned: !!byId.get(o.id)?.banned })),
    };
  },

  // QoL #254: players not seen for N days or more (their main yard's last save), with their outposts; read only
  inactive: async (_admin, body) => {
    const days = Math.max(1, Math.min(3650, Math.trunc(Number(body.days)) || 30));
    const limit = Math.max(1, Math.min(500, Number(body.limit) || 200));
    const offset = Math.max(0, Math.trunc(Number(body.offset)) || 0);
    const dir = body.order === "recent" ? "DESC" : "ASC";
    const before = Math.floor(Date.now() / 1000) - days * 86_400;
    const rows = (await em().getConnection().execute(
      `SELECT u.userid AS id, u.username, u.banned, s.savetime, s.createtime,
              (CASE WHEN jsonb_typeof(s.outposts) = 'array' THEN jsonb_array_length(s.outposts) ELSE 0 END)::int AS outposts,
              count(*) OVER ()::int AS found
         FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid
        WHERE COALESCE(s.savetime, 0) < ?
        ORDER BY COALESCE(s.savetime, 0) ${dir}, u.userid ASC
        LIMIT ${limit} OFFSET ${offset}`,
      [before], "all")) as { id: number; username: string; banned: boolean; savetime: number | null; createtime: number | null; outposts: number; found: number }[];
    return {
      days,
      offset,
      found: rows.length ? Number(rows[0].found) : (offset ? undefined : 0),
      players: rows.map((r) => ({
        id: Number(r.id),
        username: r.username,
        banned: !!r.banned,
        lastSeen: r.savetime ? Number(r.savetime) * 1000 : null,
        registered: r.createtime ? Number(r.createtime) * 1000 : null,
        outposts: Number(r.outposts) || 0,
      })),
    };
  },

  // QoL #256: chat of the last 30 days at most, searchable, read only: every alliance line (bym.alliance_message)
  // and what the Global rooms keep (their last 100 lines each, chat/chatHistory.ts)
  chat: async (_admin, body) => {
    const q = str(body.q, 80).toLowerCase();
    const days = Math.max(1, Math.min(30, Math.trunc(Number(body.days)) || 30));
    const where = ["global", "alliance"].includes(String(body.where)) ? String(body.where) : "all";
    const since = Date.now() - days * 86_400_000;
    const lines: { at: number; room: string; userid: number; name: string; text: string; type: string }[] = [];
    if (where !== "alliance") {
      for (const channel of new Set([...Object.values(CHANNELS), INFERNO_CHAT_CHANNEL])) {
        const raw = ((await redis.send("LRANGE", [`history:${channel}`, "0", "-1"]).catch(() => [])) as string[] | null) ?? [];
        for (const line of raw) {
          try {
            const e = JSON.parse(line) as { ts?: number; userId?: number; displayName?: string; body?: string; messageType?: string };
            const at = Number(e.ts) || 0;
            const name = String(e.displayName ?? "");
            const text = String(e.body ?? "");
            if (at < since || (q && !text.toLowerCase().includes(q) && !name.toLowerCase().includes(q))) continue;
            lines.push({ at, room: channel.replace(/^chat:/, ""), userid: Number(e.userId) || 0, name, text, type: String(e.messageType ?? "message") });
          } catch {
            // (unreadable: skipped)
          }
        }
      }
    }
    if (where !== "global") {
      const like = `%${q.replace(/[%_\\]/g, "")}%`;
      const rows = (await em().getConnection().execute(
        `SELECT m.alliance_id, a.name AS alliance, m.user_id, u.username, m.body, m.created_at
           FROM bym.alliance_message m
           LEFT JOIN bym.alliance a ON a.id = m.alliance_id
           LEFT JOIN bym."user" u ON u.userid = m.user_id
          WHERE m.message_type = 'message' AND m.created_at >= now() - CAST(? AS int) * interval '1 day'
            AND (CAST(? AS text) = '' OR m.body ILIKE ? OR u.username ILIKE ?)
          ORDER BY m.id DESC LIMIT 500`,
        [days, q, like, like], "all").catch(() => [])) as { alliance_id: number; alliance: string | null; user_id: number; username: string | null; body: string; created_at: Date | string }[];
      for (const r of rows) {
        lines.push({
          at: new Date(r.created_at).getTime(),
          room: `alliance ${r.alliance ?? "#" + r.alliance_id}`,
          userid: Number(r.user_id) || 0,
          name: r.username ?? `#${r.user_id}`,
          text: String(r.body ?? ""),
          type: "message",
        });
      }
    }
    lines.sort((a, b) => b.at - a.at);
    return { days, lines: lines.slice(0, 500), more: lines.length > 500 };
  },

  // QoL #252: every Shiny change of the player's the server has a record of, with its source (read only; and the ways
  // Shiny changes that leave none: services/admin/playerRecords.ts)
  shinyLedger: async (_admin, body) => {
    const user = await findUser(body);
    return shinyLedger(user.userid);
  },
  // QoL #505: what the player did (the player log, their attacks) and what admins did to the account (read only)
  playerActions: async (_admin, body) => {
    const user = await findUser(body);
    return playerActions(user.userid);
  },
  // QoL #250: the copies of the player's yards that exist (the daily backups, outposts kept at a relocation or when
  // abandoned, copies made from the panel, a test mode snapshot). (16 October: yardCopy / yardRestore below.)
  yardBackups: async (_admin, body) => {
    const user = await findUser(body);
    return yardBackups(user.userid);
  },

  // ---- Inferno-only (16 October, QoL #244, #245, #261): a player's account and sign-ins on their card ------------
  // (the card's "Account and sign-in" part: panel.html loadAccount). Email and addresses are shown here only, in the
  // panel: no other route sends them.
  account: async (admin, body) => {
    const user = await findUser(body);
    const ips = [...new Set([user.last_ip, user.registration_ip].map((ip) => String(ip ?? "").trim()).filter(Boolean))];
    // other accounts whose last or registration address is one of this account's
    const same = ips.length
      ? ((await em().getConnection().execute(
          `SELECT userid, username, banned, last_ip, registration_ip FROM bym."user"
            WHERE userid <> ? AND (last_ip = ANY(CAST(? AS text[])) OR registration_ip = ANY(CAST(? AS text[])))
            ORDER BY userid LIMIT 51`,
          [user.userid, `{${ips.map((ip) => `"${ip.replace(/["\\]/g, "")}"`).join(",")}}`, `{${ips.map((ip) => `"${ip.replace(/["\\]/g, "")}"`).join(",")}}`], "all")) as { userid: number; username: string; banned: boolean; last_ip: string | null; registration_ip: string | null }[])
      : [];
    const play = await playSessionsOf(user.email).catch(() => []);
    const saved = await savedLoginsOf(user.email).catch(() => []);
    const role = adminRole(user);
    return {
      email: user.email,
      lastIp: user.last_ip ?? null,
      registrationIp: user.registration_ip ?? null,
      sameIp: same.slice(0, 50).map((o) => ({
        id: Number(o.userid),
        username: o.username,
        banned: !!o.banned,
        // which of this account's addresses it shares
        on: [...new Set([o.last_ip, o.registration_ip].filter((ip) => ip && ips.includes(String(ip))))],
      })),
      sameIpMore: same.length > 50,
      play: play.map((p) => ({ type: p.sessionType, agent: p.agent, since: p.since.toISOString() })),
      saved: saved.map((s) => ({ agent: s.agent, created: s.created.toISOString(), lastUsed: s.lastUsed.toISOString(), expires: s.expires.toISOString() })),
      resetLinkUntil: resetLinkExpiry(user.resetToken),
      role,
      roleFromConfig: isConfigOwner(user),
      roles: ADMIN_ROLES,
      // what the admin asking may do here (the panel greys the rest; the server checks again)
      you: { role: adminRole(admin), canSetRole: isOwner(admin) && admin.userid !== user.userid && !isConfigOwner(user) },
    };
  },

  // QoL #244: a one-time reset link for the player, to give them on Discord: 24 hours, good once, a new one replaces
  // the one before. The token is shown to this admin once and never logged; the account keeps only its hash.
  resetLink: async (admin, body) => {
    const user = await findUser(body);
    staffTargetCheck(admin, user);
    const { token, expiresAt } = await makeResetToken(user);
    await logAdminAction(admin, "reset-link", target(user), `a one-time password reset link made, good for ${RESET_LINK_HOURS} hours (until ${new Date(expiresAt).toISOString()}); any earlier link no longer works`);
    return { path: `${RESET_PAGE_PATH}#${token}`, expiresAt };
  },
  resetLinkCancel: async (admin, body) => {
    const user = await findUser(body);
    staffTargetCheck(admin, user);
    await cancelResetToken(user);
    await logAdminAction(admin, "reset-link-cancel", target(user), "the password reset link no longer works");
    return {};
  },
  // QoL #244: every play session, saved login, chat sign-in and panel session of the account ended
  signOutEverywhere: async (admin, body) => {
    const user = await findUser(body);
    staffTargetCheck(admin, user);
    const before = { play: (await playSessionsOf(user.email).catch(() => [])).length, saved: (await savedLoginsOf(user.email).catch(() => [])).length };
    await endSessions(user.email);
    const panel = await endPanelSessionsOf(user.userid).catch(() => 0);
    await logAdminAction(admin, "sign-out-everywhere", target(user), `${before.play} play session(s), ${before.saved} saved login(s)${panel ? `, ${panel} panel session(s)` : ""} ended`);
    return { ended: before, panel };
  },
  // QoL #261: an account's admin role (owners only: adminMayRun; never their own, never a name from the config)
  setRole: async (admin, body) => {
    const user = await findUser(body);
    const role = str(body.role, 16);
    if (role && !(ADMIN_ROLES as readonly string[]).includes(role)) throw new AdminError("Owner, admin, support, or none.");
    if (user.userid === admin.userid) throw new AdminError("You cannot change your own role.");
    if (isConfigOwner(user)) throw new AdminError("This account is an owner in the server's config (InfernoOnlyConfig.admins): change it there.");
    const before = adminRole(user) ?? "none";
    // (18 October, SUSPECTED-BUGS.md: demoted while in test mode, the test Shiny and resources stayed, now real, and
    // test mode could no longer be switched off) test mode ends first, and the account is put back
    if (role !== before && (await inTestModeQuick(user.userid))) await endTestMode(user, `role changed by ${admin.username}`);
    try {
      await em().nativeUpdate(User, { userid: user.userid }, { admin_role: role || null });
    } catch {
      throw new AdminError("Run the database migrations first (20261109_AdminRoles).");
    }
    // (no longer staff: their panel sessions end now, not at their next request)
    if (!role) await endPanelSessionsOf(user.userid).catch(() => 0);
    await logAdminAction(admin, "set-role", target(user), `${before} -> ${role || "none"}`);
    return { role: role || null };
  },

  // ---------------------------------------------------------------------------------------------
  // QoL #398 (16 October): the Frozen Monster Invasion's switch: open now (for N hours), closed now (until next
  // month), or the calendar; its progress; one player's progress this month started again
  // ---------------------------------------------------------------------------------------------
  fmiControl: async () => ({ fmi: await fmiAdminState() }),
  fmiSet: async (admin, body) => {
    const state = str(body.state, 8);
    if (state !== "open" && state !== "closed" && state !== "auto") throw new AdminError("open, closed or auto.");
    const hours = body.hours === undefined || body.hours === "" ? undefined : int(body.hours);
    if (hours !== undefined && (hours < 1 || hours > 31 * 24)) throw new AdminError("From 1 hour to 31 days (744 hours).");
    const o = await setFmiOverride(state, hours, admin.username);
    await logAdminAction(admin, `fmi-${state}`, null, o ? `Invasion ${o.kind} (${o.key}) ${o.state} until ${new Date(o.until * 1000).toISOString()}` : "back to the calendar");
    return { fmi: await fmiAdminState() };
  },
  // (20 October) Trick or Treat's switch: open now (for N hours), closed now (for N hours), or the calendar; the doors
  // knocked on this year
  totControl: async () => ({ tot: await totAdminState() }),
  totSet: async (admin, body) => {
    const state = str(body.state, 8);
    if (state !== "open" && state !== "closed" && state !== "auto") throw new AdminError("open, closed or auto.");
    const hours = body.hours === undefined || body.hours === "" ? 24 : int(body.hours);
    if (hours < 1 || hours > 31 * 24) throw new AdminError("From 1 hour to 31 days (744 hours).");
    const o = await setTotOverride(state, hours, admin.username);
    await logAdminAction(admin, `tot-${state}`, null, o ? `Trick or Treat ${o.state} until ${new Date(o.until * 1000).toISOString()}` : "back to the calendar");
    return { tot: await totAdminState() };
  },
  fmiReset: async (admin, body) => {
    const user = await findUser(body);
    const was = await fmiAdminReset(user.userid);
    await logAdminAction(admin, "fmi-reset", target(user), `this month's waves started again (was: ${was}; totems stay)`);
    return { was };
  },

  // ---------------------------------------------------------------------------------------------
  // QoL #399 (16 October): the Wart Bloom's switch (services/events/wartBloom.ts): skip this weekend's, a bloom now
  // for N hours, end it, its rate, or all back to normal. The game is sent it with its next poll.
  // ---------------------------------------------------------------------------------------------
  wartBloom: async () => ({ bloom: await wartBloomAdminState() }),
  wartBloomSet: async (admin, body) => {
    const what = str(body.what, 10);
    let line: string;
    try {
      line = await setWartBloom(what, Number(body.hours), Number(body.rate));
    } catch (err) {
      if (err instanceof WartBloomError) throw new AdminError(err.message);
      throw err;
    }
    await logAdminAction(admin, `wartbloom-${what}`, null, line);
    return { bloom: await wartBloomAdminState() };
  },

  // ---------------------------------------------------------------------------------------------
  // QoL #250 (16 October): a copy of one of the player's yards made now, and a yard restored to a copy of it
  // (services/admin/playerRecords.ts): confirmed first, never while the player's game is open (as monsterGive:
  // savesOverIt), the yard as it is kept first (so the restore can be undone the same way)
  // ---------------------------------------------------------------------------------------------
  yardCopy: async (admin, body) => {
    const user = await findUser(body);
    const baseid = str(body.baseid, 24);
    try {
      const r = await copyYard(user.userid, user.username, baseid, admin.username);
      await logAdminAction(admin, "yard-copy", target(user), `${r.type} ${baseid}: ${r.buildings ?? 0} buildings, kept as player log #${r.logId}`);
      return r;
    } catch (err) {
      if (err instanceof YardRestoreError) throw new AdminError(err.message);
      throw err;
    }
  },
  yardRestore: async (admin, body) => {
    const user = await findUser(body);
    if (!(body.confirm === true || body.confirm === 1 || body.confirm === "1")) throw new AdminError("Confirm the restore first.");
    const logId = int(body.logId);
    const baseid = str(body.baseid, 24);
    const why = await savesOverIt(user);
    if (why) throw new AdminError(why);
    try {
      const r = await restoreYard(user.userid, user.username, logId, baseid, admin.username);
      await logAdminAction(
        admin,
        "yard-restore",
        target(user),
        `${r.type} ${baseid} restored to copy #${logId} (kept ${new Date(r.copyAt).toISOString()}${r.copySavedAt ? `, as saved ${new Date(r.copySavedAt).toISOString()}` : ""}): ${r.before ?? 0} -> ${r.after ?? 0} buildings; the yard before it kept as #${r.undoLogId}`
      );
      return r;
    } catch (err) {
      if (err instanceof YardRestoreError) throw new AdminError(err.message);
      throw err;
    }
  },

  // 17. The admin log
  log: async (_admin, body) => {
    const q = str(body.q, 60).replace(/[%_]/g, "");
    const where = q
      ? { $or: [{ admin_name: { $ilike: `%${q}%` } }, { target_name: { $ilike: `%${q}%` } }, { action: { $ilike: `%${q}%` } }, { details: { $ilike: `%${q}%` } }] }
      : {};
    // (QoL #260: a date range, both days included, and pages of 200 further back)
    const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? new Date(`${str(v, 10)}T00:00:00Z`) : null);
    const from = day(body.from);
    const to = day(body.to);
    const at: Record<string, Date> = {};
    if (from) at.$gte = from;
    if (to) at.$lt = new Date(to.getTime() + 86_400_000);
    const filter = Object.keys(at).length ? (q ? { $and: [where, { at }] } : { at }) : where;
    const offset = Math.max(0, Number(body.offset) || 0);
    const rows = await em().find(AdminLog, filter as object, { orderBy: { at: "desc", id: "desc" }, limit: 201, offset });
    return { log: rows.slice(0, 200), more: rows.length > 200 };
  },
};

// ---------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------

/**
 * Headers for every admin response: never cached or framed, no type guessing, and the address (with a
 * sign-in code in it) never sent on to another site. The panel page also gets a content policy: its
 * own inline script only, nothing loaded from anywhere, requests to this server only.
 */
const PANEL_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const secureHeaders = (ctx: Context) => {
  ctx.set("Cache-Control", "no-store");
  ctx.set("X-Frame-Options", "DENY");
  ctx.set("X-Content-Type-Options", "nosniff");
  ctx.set("Referrer-Policy", "no-referrer");
};

/** POST /admin/session (from the game): a one-time code for the panel, admins only. */
export const adminSignInCode: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  // (QoL #261: any admin role; support's panel is read only)
  if (!isStaff(user)) {
    ctx.body = { error: "Not an admin." };
    return;
  }
  ctx.body = { error: 0, code: await createSignInCode(user) };
};

/** GET /admin/signin?code=...: sets the admin session cookie and opens the panel. */
export const adminSignIn: KoaController = async (ctx) => {
  secureHeaders(ctx);
  const token = await exchangeSignInCode(String(ctx.query.code ?? ""));
  if (!token) {
    ctx.status = Status.OK;
    ctx.type = "text/html";
    // (in the Inferno's colours, like the panel)
    ctx.body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Inferno admin · Inferno Map Room 2</title></head>` +
      `<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#1b100c;color:#f1e4d6;font:15px/1.5 system-ui,sans-serif">` +
      `<div style="max-width:460px;margin:24px;padding:18px 22px;background:#2a1a13;border:1px solid #4a2e22;border-radius:10px;text-align:center">` +
      `<h1 style="margin:0 0 8px;font-size:18px;color:#e0662b">Inferno admin</h1><p style="margin:0">This sign-in link has expired or was already used. Press the Admin button in the game again.</p></div></body></html>`;
    return;
  }
  ctx.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 12 * 60 * 60 * 1000, secure: ctx.secure, overwrite: true });
  // (QoL #259: every sign-in to the panel is in the log, with where it came from, and kept as a session to list)
  const admin = await sessionAdmin(token);
  if (admin) {
    const agent = String(ctx.get("user-agent") ?? "").slice(0, 160);
    await noteSession(token, admin, ctx.ip, agent).catch(() => undefined);
    await logAdminAction(admin, "panel-signin", null, `from ${ctx.ip} (${agent.slice(0, 80)})`).catch(() => undefined);
  }
  ctx.redirect("/admin");
};

/** GET /admin: the panel page. It asks the API who is signed in. */
export const adminPanel: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.type = "text/html";
  secureHeaders(ctx);
  ctx.set("Content-Security-Policy", PANEL_CSP);
  ctx.body = ADMIN_PANEL_HTML;
};

/** POST /admin/api/:action */
export const adminApi: KoaController = async (ctx) => {
  secureHeaders(ctx);
  ctx.status = Status.OK;

  // Only the panel's own script sends this header; a form on another site cannot.
  if (ctx.get("X-Admin") !== "1") {
    ctx.status = Status.FORBIDDEN;
    ctx.body = { error: "Forbidden." };
    return;
  }

  const token = ctx.cookies.get(ADMIN_COOKIE);
  const action = String(ctx.params.action ?? "");

  if (action === "signout") {
    await endSession(token);
    ctx.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 0, secure: ctx.secure, overwrite: true });
    ctx.body = { error: 0 };
    return;
  }

  const admin = await sessionAdmin(token);
  if (!admin) {
    ctx.body = { error: "signin" };
    return;
  }
  if (action === "whoami") {
    ctx.body = { error: 0, username: admin.username, role: adminRole(admin) }; // (QoL #261: the panel greys what the role can't do)
    return;
  }

  // Own tools only: "constructor", "toString" and the like are the object's, not tools (and
  // "constructor" handed back the admin's own account record, password hash included).
  const run = Object.hasOwn(actions, action) ? actions[action] : undefined;
  if (!run) {
    ctx.body = { error: "Unknown action." };
    return;
  }

  // (QoL #261: what the admin's role may use, checked here once for every tool: support reads only, setRole is an
  // owner's; services/admin/admin.ts adminMayRun)
  const refused = adminMayRun(admin, action, (ctx.request.body ?? {}) as Body);
  if (refused) {
    ctx.body = { error: refused };
    return;
  }

  try {
    const result = await run(admin, (ctx.request.body ?? {}) as Body, ctx);
    ctx.body = { error: 0, ...(result as object) };
  } catch (err) {
    if (!(err instanceof AdminError)) throw err;
    ctx.body = { error: err.message };
  }
};
