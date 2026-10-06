import { randomBytes } from "crypto";

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

export const isAdmin = (user?: User | null) =>
  !!user && infernoOnlyConfig.enabled && !!user.username && configuredAdmins().includes(user.username);

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
  const userid = await redis.get(key);
  if (!userid) return null;
  await redis.del(key);

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
  return user && !user.banned && isAdmin(user) ? user : null;
};

export const endSession = (token?: string) => (token ? redis.del(`admin:session:${token}`) : null);

// ---------------------------------------------------------------------------------------------
// Maintenance mode: new logins refused (admins excepted) with a message.
// ---------------------------------------------------------------------------------------------

const MAINTENANCE_KEY = "admin:maintenance";
let maintenanceCache: { value: string | null; at: number } = { value: null, at: 0 };

export const getMaintenance = async () => {
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

export const muteUser = (userid: number, minutes: number) =>
  redis.setex(muteKey(userid), Math.max(60, Math.round(minutes * 60)), String(Date.now() + minutes * 60_000));

export const unmuteUser = (userid: number) => redis.del(muteKey(userid));

/** Epoch ms the mute ends, or null. */
export const mutedUntil = async (userid: number) => {
  const raw = await redis.get(muteKey(userid));
  return raw ? Number(raw) : null;
};
