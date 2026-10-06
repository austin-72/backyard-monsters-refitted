import { readFileSync } from "fs";
import { gauntletProgress, gauntletWindow, isGauntletBaseId, resetGauntlet, setGauntletOverride } from "../../services/events/gauntlet.js";
import { hfoAdminNextDay, hfoAdminReset, hfoAdminStart, hfoCounts, hfoProgress, setHfoEnabled } from "../../services/events/hfo.js";
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
import {
  ADMIN_COOKIE,
  clearAnnouncement,
  createSignInCode,
  endSession,
  exchangeSignInCode,
  getAnnouncement,
  getMaintenance,
  isAdmin,
  logAdminAction,
  mutedUntil,
  muteUser,
  sessionAdmin,
  setAnnouncement,
  setMaintenance,
  unmuteUser,
} from "../../services/admin/admin.js";
import { ADMIN_PANEL_HTML } from "../../services/admin/panelHtml.js";
import { refreshChatUser } from "../../chat/chatControl.js";
import { questAdminForce, questAdminReset, questAdminView } from "../../services/quests/questProgress.js";
import { deleteAccount } from "../../services/admin/deleteAccount.js";
import { SessionType } from "../../enums/SessionType.js";

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

const worldOf = async (body: Body) => {
  const worlds = await em().find(World, {}, { orderBy: { playerCount: "desc" } });
  const uuid = str(body.world, 64);
  const world = uuid ? worlds.find((w) => w.uuid === uuid) : worlds[0];
  if (!world) throw new AdminError("No such world.");
  return world;
};

// ---------------------------------------------------------------------------------------------
// The tools
// ---------------------------------------------------------------------------------------------

const actions: Record<string, Action> = {
  // 15. Server status
  status: async () => {
    const online = ((await redis.send("KEYS", ["last-seen:main:*"])) as string[] | null)?.length ?? 0;
    return {
      online,
      version: SERVER_VERSION,
      publishedBuild: getPublishedBuild(),
      requiredBuild: getRequiredBuild(),
      maintenance: await getMaintenance(),
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

  // 1. Every player, oldest account first (the Players tab lists, filters and sorts them in the page), with how
  // many friends joined through their invite link (invites) and how many of those were paid (invitesPaid)
  players: async () => {
    const users = await em().find(User, {}, { fields: ["userid", "username", "banned", "referral_barred"], orderBy: { userid: "asc" }, limit: 20000 });
    const counts = (await em().getConnection().execute(
      `SELECT referred_by AS id, count(*)::int AS accepted, (count(*) FILTER (WHERE referral_result = 'paid'))::int AS paid
       FROM bym."user" WHERE referred_by IS NOT NULL GROUP BY referred_by`, [], "all")) as { id: number; accepted: number; paid: number }[];
    const byId = new Map(counts.map((c) => [Number(c.id), c]));
    return {
      players: users.map((u) => ({
        id: u.userid,
        username: u.username,
        banned: u.banned,
        invites: byId.get(u.userid)?.accepted ?? 0,
        invitesPaid: byId.get(u.userid)?.paid ?? 0,
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
      chatMod: (await chatModerators()).some((m) => m.id === user.userid),
      chatMods: await chatModerators(),
      gauntlet: await gauntletProgress(user),
      hfo: await hfoProgress(user.userid),
      attackViolations: report?.attackViolations ?? 0,
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
    await logAdminAction(admin, "ban", target(user), reason);
    return {};
  },
  unban: async (admin, body) => {
    const user = await findUser(body);
    await em().nativeUpdate(User, { userid: user.userid }, { banned: false, ban_reason: null });
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
    await Promise.all([SessionType.GAME, SessionType.LAUNCHER].map((t) => redis.del(`user-token:${t}:${done.email}`).catch(() => 0)));
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
    for (const key of ["r1", "r2", "r3", "r4"]) {
      if (body[key] !== undefined && body[key] !== "") after[key] = Math.max(0, int(body[key]));
    }
    await em().nativeUpdate(Save, { baseid: save.baseid }, { resources: after });
    await logAdminAction(admin, "resources", target(user), `${JSON.stringify(before)} -> ${JSON.stringify(after)}: ${note}`);
    return { resources: after };
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

  // 9. Chat mute
  mute: async (admin, body) => {
    const user = await findUser(body);
    const minutes = Math.max(1, Math.min(60 * 24 * 30, int(body.minutes)));
    await muteUser(user.userid, minutes);
    await logAdminAction(admin, "mute", target(user), `${minutes} minutes`);
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
      })),
    };
  },
  bugStatus: async (admin, body) => {
    const id = int(body.id);
    const status = str(body.status, 8) === "fixed" ? "fixed" : "open";
    const bug = await em().findOne(BugReport, { id });
    if (!bug) throw new AdminError("No such bug.");
    await em().nativeUpdate(BugReport, { id }, { status, fixed_at: status === "fixed" ? new Date() : null });
    await logAdminAction(admin, status === "fixed" ? "bug-fixed" : "bug-reopen", null, `#${id}: ${bug.title}`);
    return {};
  },
  bugDelete: async (admin, body) => {
    const id = int(body.id);
    const bug = await em().findOne(BugReport, { id });
    if (!bug) throw new AdminError("No such bug.");
    await em().nativeDelete(BugReport, { id });
    await logAdminAction(admin, "bug-delete", null, `#${id}: ${bug.title}`);
    return {};
  },

  // 17. The admin log
  log: async (_admin, body) => {
    const q = str(body.q, 60).replace(/[%_]/g, "");
    const where = q
      ? { $or: [{ admin_name: { $ilike: `%${q}%` } }, { target_name: { $ilike: `%${q}%` } }, { action: { $ilike: `%${q}%` } }, { details: { $ilike: `%${q}%` } }] }
      : {};
    const rows = await em().find(AdminLog, where, { orderBy: { at: "desc" }, limit: 200 });
    return { log: rows };
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
  if (!isAdmin(user)) {
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
    ctx.body = "<p>This sign-in link has expired or was already used. Press the Admin button in the game again.</p>";
    return;
  }
  ctx.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 12 * 60 * 60 * 1000, secure: ctx.secure, overwrite: true });
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
    ctx.body = { error: 0, username: admin.username };
    return;
  }

  // Own tools only: "constructor", "toString" and the like are the object's, not tools (and
  // "constructor" handed back the admin's own account record, password hash included).
  const run = Object.hasOwn(actions, action) ? actions[action] : undefined;
  if (!run) {
    ctx.body = { error: "Unknown action." };
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
