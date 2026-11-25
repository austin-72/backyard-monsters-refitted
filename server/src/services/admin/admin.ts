import { tellMuted } from "../../chat/chatControl.js";
import { sendAlert } from "./alerts.js";
import { createHash, randomBytes } from "crypto";

import { User } from "../../database/models/user.model.js";
import { AdminLog } from "../../database/models/adminlog.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ChatBroadcastType } from "../../enums/Chat.js";
import { broadcastGlobal } from "../../chat/chatBroadcasts.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only admin panel: who is an admin, the audit log, panel sign-in, and the server-wide
 * switches the panel sets (maintenance mode, announcements, chat mutes). Switches live in Redis so
 * the API and the chat process both see them, and they survive a restart of either.
 */

// ---------------------------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------------------------

/**
 * Admins are the accounts named in infernoOnlyConfig.admins, exactly: capitals count, so "AdminTester"
 * is not "admintester". The check is made on every request (the game's flags, the panel's API, test
 * mode, maintenance logins), so taking a name out of the config ends that admin's panel session too.
 *
 * The names are also reserved (isReservedAdminName): nobody can register one, or rename to one, from
 * the game, in any capitals. An admin name that isn't an account yet therefore can't be claimed by
 * whoever registers it first, and a name an admin renamed away from can't be picked up. The server
 * owner gives a reserved name to an account with `bun run admin:claim <account> <admin name>`
 * (scripts/admin-claim.ts).
 */
export const configuredAdmins = () => infernoOnlyConfig.admins.map((name) => name.trim()).filter(Boolean);

/**
 * Inferno-only (16 October, QoL #261): admin roles, kept on the account (user.admin_role, migration
 * 20261109_AdminRoles) and set from the panel by an owner:
 *
 *   owner    everything, and sets other accounts' roles. The names in infernoOnlyConfig.admins are owners whatever
 *            their account says (they bootstrap the rest), and their role can't be changed from the panel.
 *   admin    everything else: the panel, test mode, the Designer, playing on in maintenance.
 *   support  the panel, read only: every tool that changes something is refused (adminMayRun, checked once for
 *            every panel request), and so are test mode and the Designer. The game's Admin menu shows.
 *
 * isAdmin is "owner or admin", as it was for the config's names, so the checks made with it everywhere (test mode,
 * the Designer, maintenance logins, design yards) are the same; isStaff (any role) lets in to the panel.
 */
export type AdminRole = "owner" | "admin" | "support";
export const ADMIN_ROLES: readonly AdminRole[] = ["owner", "admin", "support"];

export const adminRole = (user?: User | null): AdminRole | null => {
  if (!user || !infernoOnlyConfig.enabled || !user.username) return null;
  if (configuredAdmins().includes(user.username)) return "owner";
  const stored = String(user.admin_role ?? "");
  return (ADMIN_ROLES as readonly string[]).includes(stored) ? (stored as AdminRole) : null;
};

/** The role comes from the config's names (it can't be changed from the panel). */
export const isConfigOwner = (user?: User | null) =>
  !!user && infernoOnlyConfig.enabled && !!user.username && configuredAdmins().includes(user.username);

export const isAdmin = (user?: User | null) => {
  const role = adminRole(user);
  return role === "owner" || role === "admin";
};

/** (QoL #261) Any role: the panel (read only for support) and the game's Admin menu. */
export const isStaff = (user?: User | null) => adminRole(user) !== null;

export const isOwner = (user?: User | null) => adminRole(user) === "owner";

/**
 * (QoL #261) The panel's tools that only read: all a support account may use. Anything not here changes something
 * and is refused for support, so a tool added later is refused until it is listed. designImport only looks unless
 * `apply` is 1.
 */
const READ_ONLY_ACTIONS = new Set([
  "status", "players", "search", "player", "account", "monsters", "compensatePreview", "quests", "online", "sessions",
  "testModeList", "reports", "cheats", "invites", "cell", "worlds", "bugs", "health", "kitBackups", "designExport",
  "fmi", "fmiPlayer", "fmiControl", "totControl", "wartBloom", "loginHistory", "inactive", "chat", "shinyLedger", "playerActions", "yardBackups", "log",
  "feedback", "feedbackPicture",
]);
/** (QoL #261) Tools for owners only. */
const OWNER_ACTIONS = new Set(["setRole"]);

/** Whether this panel account may use this tool: "" when it may, else why not (one check for every request). */
export const adminMayRun = (admin: User, action: string, body: Record<string, unknown>): string => {
  const role = adminRole(admin);
  if (!role) return "Not an admin.";
  if (OWNER_ACTIONS.has(action) && role !== "owner") return "Only an owner can do this.";
  if (role !== "support") return "";
  if (READ_ONLY_ACTIONS.has(action)) return "";
  if (action === "designImport" && String(body?.apply ?? "") !== "1") return "";
  return "Your role is support: the panel is read only for you.";
};

/** One of the configured admin names, in any capitals (register and rename refuse it). */
export const isReservedAdminName = (username?: string | null) => {
  if (!infernoOnlyConfig.enabled || !username) return false;
  const wanted = username.trim().toLowerCase();
  return configuredAdmins().some((name) => name.toLowerCase() === wanted);
};

/** Startup: says in the log which admin names are accounts, which are waiting, and which lookalikes are not admins. */
export const startAdminNames = () => {
  if (!infernoOnlyConfig.enabled) return;
  (async () => {
    for (const name of configuredAdmins()) {
      const rows = await postgres.em.getConnection().execute<{ userid: number; username: string }[]>(
        `SELECT userid, username FROM bym."user" WHERE lower(username) = lower(?) LIMIT 10`,
        [name]
      );
      const exact = rows.find((r) => r.username === name);
      const others = rows.filter((r) => r.username !== name).map((r) => `"${r.username}" (#${r.userid})`);
      if (exact) logger.info(`Admin "${name}" is account #${exact.userid}.`);
      else
        logger.warn(
          `Admin name "${name}" is not an account yet. It is reserved (nobody can register it); give it to your account with: bun run admin:claim <your account> ${name}`
        );
      if (others.length) logger.warn(`Not admins (the name differs from "${name}" in capitals): ${others.join(", ")}`);
    }
  })().catch((err) => logger.warn(`Could not read the admin accounts: ${err}`));
};

/** Another account already has this name apart from capitals (register and rename refuse it). */
export const usernameTakenIgnoringCase = async (username: string, exceptUserid = 0) => {
  const rows = await postgres.em.getConnection().execute<{ n: number }[]>(
    `SELECT 1 AS n FROM bym."user" WHERE lower(username) = lower(?) AND userid <> ? LIMIT 1`,
    [username, exceptUserid]
  );
  return rows.length > 0;
};

// ---------------------------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------------------------

export const logAdminAction = async (
  admin: User,
  action: string,
  target: { userid?: number; username?: string } | null,
  details: string
) => {
  const em = postgres.em.fork();
  em.persist(
    em.create(AdminLog, {
      admin_id: admin.userid,
      admin_name: admin.username,
      action,
      target_id: target?.userid ?? null,
      target_name: target?.username ?? null,
      details: details.slice(0, 1000),
    })
  );
  await em.flush();
  logger.info(`ADMIN ${admin.username}: ${action}${target?.username ? ` -> ${target.username}` : ""} ${details}`);
};

// ---------------------------------------------------------------------------------------------
// Panel sign-in: the game asks for a one-time code, the browser trades it for a session cookie.
// ---------------------------------------------------------------------------------------------

const CODE_TTL = 120;
const SESSION_TTL = 12 * 60 * 60;
export const ADMIN_COOKIE = "bymr_admin";

export const createSignInCode = async (admin: User) => {
  const code = randomBytes(24).toString("hex");
  await redis.setex(`admin:code:${code}`, CODE_TTL, String(admin.userid));
  return code;
};

/** Trades a sign-in code (usable once) for a session token. */
export const exchangeSignInCode = async (code: string) => {
  if (!/^[a-f0-9]{48}$/.test(code)) return null;
  const key = `admin:code:${code}`;
  // (13 October: taken in one step: read then deleted, two requests at once both made a session of one code)
  const userid = await redis.getdel(key);
  if (!userid) return null;

  const token = randomBytes(32).toString("hex");
  await redis.setex(`admin:session:${token}`, SESSION_TTL, userid);
  return token;
};

/** The admin a session cookie belongs to, if they are still an admin and not banned. */
export const sessionAdmin = async (token?: string) => {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const userid = await redis.get(`admin:session:${token}`);
  if (!userid) return null;
  const user = await postgres.em.fork().findOne(User, { userid: Number(userid) });
  // (QoL #261: any role; support's tools are limited by adminMayRun)
  return user && !user.banned && isStaff(user) ? user : null;
};

export const endSession = async (token?: string) => {
  if (!token) return null;
  await redis.del(`admin:sessinfo:${sessionId(token)}`).catch(() => 0);
  return redis.del(`admin:session:${token}`);
};

/** Inferno-only (QoL #259): a session's short id (never the token itself, which signs in). */
const sessionId = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 12);

/** Inferno-only (QoL #259): who opened a session, when and from where, kept as long as it lasts. */
export const noteSession = async (token: string, admin: User, ip: string, agent: string) => {
  await redis.setex(`admin:sessinfo:${sessionId(token)}`, SESSION_TTL, JSON.stringify({ token, userid: admin.userid, username: admin.username, at: Date.now(), ip, agent }));
};

/** The panel's sessions now (each with its short id; `mine` for the one asking). */
export const listSessions = async (mineToken?: string) => {
  const out: { id: string; username: string; at: number; ip: string; agent: string; mine: boolean }[] = [];
  let cursor = "0";
  do {
    const [next, keys] = (await redis.send("SCAN", [cursor, "MATCH", "admin:sessinfo:*", "COUNT", "200"])) as [string, string[]];
    cursor = next;
    for (const key of keys) {
      try {
        const info = JSON.parse(String(await redis.get(key)));
        if (!(await redis.get(`admin:session:${info.token}`))) continue;
        out.push({ id: key.slice("admin:sessinfo:".length), username: info.username, at: info.at, ip: info.ip, agent: info.agent, mine: info.token === mineToken });
      } catch {
        // (unreadable: left to run out)
      }
    }
  } while (cursor !== "0");
  return out.sort((a, b) => b.at - a.at);
};

/** Inferno-only (QoL #244): every panel session of one account ended (its "Sign out everywhere"). How many. */
export const endPanelSessionsOf = async (userid: number) => {
  let ended = 0;
  let cursor = "0";
  do {
    const [next, keys] = (await redis.send("SCAN", [cursor, "MATCH", "admin:sessinfo:*", "COUNT", "200"])) as [string, string[]];
    cursor = next;
    for (const key of keys) {
      try {
        const info = JSON.parse(String(await redis.get(key)));
        if (Number(info.userid) !== userid) continue;
        await endSession(info.token);
        ended++;
      } catch {
        // (unreadable: left to run out)
      }
    }
  } while (cursor !== "0");
  return ended;
};

/** Ends one session by its short id, or every other one (`others`). How many ended. */
export const endSessionById = async (id: string, mineToken: string | undefined, others: boolean, onlyUsername?: string) => {
  let ended = 0;
  for (const s of await listSessions(mineToken)) {
    if (s.mine || (!others && s.id !== id)) continue;
    // (18 October: a non-owner admin ends only their own other sessions)
    if (onlyUsername !== undefined && s.username !== onlyUsername) continue;
    const info = JSON.parse(String(await redis.get(`admin:sessinfo:${s.id}`)));
    await endSession(info.token);
    ended++;
  }
  return ended;
};

// ---------------------------------------------------------------------------------------------
// Maintenance mode: new logins refused (admins excepted) with a message.
// ---------------------------------------------------------------------------------------------

const MAINTENANCE_KEY = "admin:maintenance";
let maintenanceCache: { value: string | null; at: number } = { value: null, at: 0 };

/**
 * Inferno-only (QoL #400, #210): maintenance planned for a time: players in the game are warned at 15, 5 and 1
 * minutes before (flag io_maintenance), and at the time maintenance mode goes on by itself.
 */
const MAINT_SCHEDULE_KEY = "admin:maintenance:at";
let scheduleCache: { value: { at: number; message: string } | null; at: number } = { value: null, at: 0 };

export const getMaintenanceSchedule = async (): Promise<{ at: number; message: string } | null> => {
  if (Date.now() - scheduleCache.at >= 5000) {
    let value: { at: number; message: string } | null = null;
    try {
      const raw = await redis.get(MAINT_SCHEDULE_KEY);
      value = raw ? JSON.parse(raw) : null;
    } catch {
      value = null;
    }
    scheduleCache = { value, at: Date.now() };
  }
  const plan = scheduleCache.value;
  if (plan && plan.at <= Date.now()) {
    // the time has come: on by itself, and the plan done
    await redis.del(MAINT_SCHEDULE_KEY).catch(() => 0);
    scheduleCache = { value: null, at: Date.now() };
    await setMaintenance(plan.message);
    logger.info(`Maintenance mode on, as planned: ${plan.message}`);
    sendAlert("maintenance", `maintenance mode is on, as planned: ${plan.message.slice(0, 200)}`);
    return null;
  }
  return plan;
};

export const scheduleMaintenance = async (minutes: number, message: string) => {
  const plan = { at: Date.now() + Math.round(minutes * 60_000), message };
  await redis.set(MAINT_SCHEDULE_KEY, JSON.stringify(plan));
  scheduleCache = { value: plan, at: Date.now() };
  return plan;
};

export const cancelMaintenanceSchedule = async () => {
  await redis.del(MAINT_SCHEDULE_KEY);
  scheduleCache = { value: null, at: Date.now() };
};

export const getMaintenance = async () => {
  await getMaintenanceSchedule().catch(() => null);
  if (Date.now() - maintenanceCache.at < 5000) return maintenanceCache.value;
  const value = (await redis.get(MAINTENANCE_KEY)) || null;
  maintenanceCache = { value, at: Date.now() };
  return value;
};

export const setMaintenance = async (message: string | null) => {
  if (message) await redis.set(MAINTENANCE_KEY, message);
  else await redis.del(MAINTENANCE_KEY);
  maintenanceCache = { value: message, at: Date.now() };
};

// ---------------------------------------------------------------------------------------------
// Announcements: a popup every player sees once (flag io_announce), and optionally a chat line.
// ---------------------------------------------------------------------------------------------

const ANNOUNCE_KEY = "admin:announce";

export interface Announcement {
  id: string;
  text: string;
}

/** Read on every poll of every player: kept for 5 seconds, as the maintenance message is. */
let announceCache: { value: Announcement | null; at: number } = { value: null, at: 0 };

/** QoL #485: the announcement an account has been shown (its id), so it is shown once per account, not per browser. */
const seenKey = (userid: number) => `announce:seen:${userid}`;

export const announcementSeen = async (userid: number): Promise<string> => String((await redis.get(seenKey(userid))) ?? "");

export const markAnnouncementSeen = async (userid: number, id: string): Promise<void> => {
  await redis.set(seenKey(userid), String(id).slice(0, 64), "EX", String(15 * 86_400));
};

export const getAnnouncement = async (): Promise<Announcement | null> => {
  if (Date.now() - announceCache.at < 5000) return announceCache.value;
  const raw = await redis.get(ANNOUNCE_KEY);
  let value: Announcement | null = null;
  if (raw) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  announceCache = { value, at: Date.now() };
  return value;
};

export const setAnnouncement = async (text: string, hours: number, toChat: boolean) => {
  const announcement: Announcement = { id: randomBytes(6).toString("hex"), text };
  await redis.setex(ANNOUNCE_KEY, Math.max(1, Math.round(hours * 3600)), JSON.stringify(announcement));
  announceCache = { value: null, at: 0 };
  if (toChat) {
    // Written into every Global room's history as well, so players who come later still see it.
    await broadcastGlobal(ChatBroadcastType.ANNOUNCE, text);
  }
  return announcement;
};

export const clearAnnouncement = () => {
  announceCache = { value: null, at: 0 };
  return redis.del(ANNOUNCE_KEY);
};

// ---------------------------------------------------------------------------------------------
// Chat mutes (checked by the chat process when a player speaks: chat/chatRooms.ts)
// ---------------------------------------------------------------------------------------------

export const muteKey = (userid: number) => `chat:mute:${userid}`;

/**
 * A chat mute for some minutes. Inferno-only (QoL #262): with a reason, kept as long as the mute and shown to the
 * player (when they try to talk, and at once if they are in chat).
 */
export const muteUser = async (userid: number, minutes: number, reason = "") => {
  const ttl = Math.max(60, Math.round(minutes * 60));
  await redis.setex(muteKey(userid), ttl, String(Date.now() + minutes * 60_000));
  const why = String(reason ?? "").replace(/[<>]/g, "").trim().slice(0, 200);
  if (why) await redis.setex(`chat:mutereason:${userid}`, ttl, why);
  else await redis.del(`chat:mutereason:${userid}`).catch(() => 0);
  await tellMuted(userid, Math.max(1, Math.round(minutes)), why).catch(() => undefined);
};

export const unmuteUser = async (userid: number) => {
  await redis.del(`chat:mutereason:${userid}`).catch(() => 0);
  return redis.del(muteKey(userid));
};

/** QoL #262: the reason a mute was given, or "". */
export const muteReason = async (userid: number) => (await redis.get(`chat:mutereason:${userid}`).catch(() => null)) ?? "";

/** Epoch ms the mute ends, or null. */
export const mutedUntil = async (userid: number) => {
  const raw = await redis.get(muteKey(userid));
  return raw ? Number(raw) : null;
};
