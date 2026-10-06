import { randomBytes } from "crypto";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { User } from "../database/models/user.model.js";
import { ChannelType } from "../enums/Chat.js";
import { postgres, redis } from "../server.js";
import { configuredAdmins, logAdminAction, muteUser, unmuteUser } from "../services/admin/admin.js";
import { logger } from "../utils/logger.js";
import { ErrorCode, send, ServerMessageType, type ChatRole, type HistoryEntry } from "./chatProtocol.js";
import { type ChatClient } from "./chatState.js";
import { publishToChannel } from "./chatTransport.js";

/**
 * Inferno-only chat moderation (the user's, 2 October): admins (InfernoOnlyConfig.admins) and chat
 * moderators (user.chat_mod, switched on in the admin panel) carry a badge in chat, and from the game's name
 * menu can delete a line for everyone (from the room's history too) and mute a player. Moderators can't act
 * on admins or other moderators; admins can act on anyone but themselves. Every action is in the admin log.
 */

/** A mute from the chat menu: at most a day for moderators, 30 days for admins. */
const MOD_MAX_MINUTES = 24 * 60;
const ADMIN_MAX_MINUTES = 30 * 24 * 60;

const isAdminName = (username: string) => infernoOnlyConfig.enabled && configuredAdmins().includes(username);

/** Players' staff roles (admins by name, moderators from user.chat_mod), for the given ids. */
export const rolesOf = async (users: { userid: number; username: string }[]): Promise<Map<number, ChatRole>> => {
  const roles = new Map<number, ChatRole>();
  if (!infernoOnlyConfig.enabled || !users.length) return roles;
  for (const u of users) if (isAdminName(u.username)) roles.set(u.userid, "admin");
  const rest = users.filter((u) => !roles.has(u.userid)).map((u) => u.userid);
  if (!rest.length) return roles;
  try {
    const rows = await postgres.em
      .getConnection()
      .execute<{ userid: number }[]>(
        `SELECT userid FROM bym."user" WHERE chat_mod = true AND userid IN (${rest.map(() => "?").join(",")})`,
        rest
      );
    for (const row of rows) roles.set(Number(row.userid), "mod");
  } catch (err) {
    // (the column comes with the 20261005 migration: before it, nobody is a moderator)
    logger.warn(`Chat: moderators could not be read: ${err}`);
  }
  return roles;
};

export const roleOf = async (userid: number, username: string): Promise<ChatRole | null> =>
  (await rolesOf([{ userid, username }])).get(userid) ?? null;

/** A new id for a Global line (kept in its history, so a moderator can delete it later). */
export const newLineId = () => `g${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

const notice = (client: ChatClient, text: string) => send(client.ws, { type: ServerMessageType.Notice, text });
const refuse = (client: ChatClient) => send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.NotAllowed });

const staffUser = async (client: ChatClient) =>
  postgres.em.fork().findOne(User, { userid: client.userId });

/**
 * Deletes a line for everyone in the room, and from its history (a Global room's list in Redis, an
 * alliance's feed in Postgres). The room is told (`deleted`), so every game takes it off the screen.
 */
export const deleteLine = async (client: ChatClient, channel: string, id: string) => {
  if (!client.role) return refuse(client);
  const info = client.channels.get(channel);
  if (!info || typeof id !== "string" || !/^[ga][0-9a-z]{1,40}$/.test(id)) return refuse(client);
  let removed: HistoryEntry | null = null;
  if (info.type === ChannelType.Alliance) {
    const rowId = Number(id.slice(1));
    if (!id.startsWith("a") || !Number.isSafeInteger(rowId)) return refuse(client);
    const rows = await postgres.em
      .getConnection()
      .execute<{ body: string; author: number }[]>(
        `DELETE FROM bym.alliance_message WHERE id = ? AND alliance_id = ? RETURNING body, user_id AS author`,
        [rowId, info.allianceId]
      );
    if (rows.length) removed = { userId: Number(rows[0].author ?? 0), displayName: "", picSquare: null, allianceImage: null, body: rows[0].body, messageType: "message" as never, ts: 0 };
  } else {
    const key = `history:${channel}`;
    for (const raw of await redis.lrange(key, 0, -1)) {
      let entry: HistoryEntry;
      try {
        entry = JSON.parse(raw);
      } catch {
        continue;
      }
      if (entry.id !== id) continue;
      await redis.lrem(key, 1, raw);
      removed = entry;
      break;
    }
  }
  // Taken off everyone's screen even when it was too old to be in the history any more.
  publishToChannel(channel, JSON.stringify({ type: ServerMessageType.Deleted, channel, id }));
  const staff = await staffUser(client);
  if (staff) await logAdminAction(staff, "chat-delete", removed ? { userid: removed.userId } : null, `${channel}: ${removed ? removed.body : id}`.slice(0, 500));
  notice(client, "Line deleted.");
};

/**
 * Mutes a player from the chat (minutes 0: unmutes). Moderators: up to a day, never an admin or another
 * moderator. The muted player is told when they next speak (chatRooms.postMessage).
 */
export const muteFromChat = async (client: ChatClient, targetId: string | undefined, targetName: string | undefined, minutes: number) => {
  if (!client.role) return refuse(client);
  const conn = postgres.em.getConnection();
  const byName = typeof targetName === "string" && targetName.trim().length > 0;
  const rows = byName
    ? await conn.execute<{ userid: number; username: string }[]>(
        `SELECT userid, username FROM bym."user" WHERE lower(username) = lower(?) ORDER BY userid LIMIT 1`,
        [targetName!.trim().replace(/^@/, "").replace(/^\[\d+\]\s*/, "").slice(0, 64)]
      )
    : /^\d{1,10}$/.test(String(targetId ?? ""))
      ? await conn.execute<{ userid: number; username: string }[]>(`SELECT userid, username FROM bym."user" WHERE userid = ?`, [Number(targetId)])
      : [];
  const target = rows[0];
  if (!target) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: String(targetName ?? targetId ?? "").slice(0, 64) });
    return;
  }
  const targetRole = await roleOf(Number(target.userid), target.username);
  if (Number(target.userid) === client.userId || targetRole === "admin" || (targetRole === "mod" && client.role !== "admin")) return refuse(client);
  const wanted = Math.round(Number(minutes) || 0);
  const staff = await staffUser(client);
  if (wanted <= 0) {
    await unmuteUser(Number(target.userid));
    if (staff) await logAdminAction(staff, "unmute", { userid: Number(target.userid), username: target.username }, "from chat");
    notice(client, `${target.username} can talk again.`);
    return;
  }
  const capped = Math.min(wanted, client.role === "admin" ? ADMIN_MAX_MINUTES : MOD_MAX_MINUTES);
  await muteUser(Number(target.userid), capped);
  if (staff) await logAdminAction(staff, "mute", { userid: Number(target.userid), username: target.username }, `${capped} minutes, from chat`);
  notice(client, `${target.username} is muted for ${capped >= 1440 ? `${Math.round(capped / 1440)} day(s)` : capped >= 60 ? `${Math.round(capped / 60)} hour(s)` : `${capped} minutes`}.`);
};
