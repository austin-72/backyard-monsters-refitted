import { randomBytes } from "crypto";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { User } from "../database/models/user.model.js";
import { ChannelType } from "../enums/Chat.js";
import { postgres, redis } from "../server.js";
import { configuredAdmins, logAdminAction, muteUser, unmuteUser } from "../services/admin/admin.js";
import { recordPlayerReport } from "../services/admin/bugReports.js";
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

// (QoL #152, #153: `key`, the game's own words for it, `v1` and `v2` filled in; `text` for older games)
const notice = (client: ChatClient, text: string, key?: string, v1?: string, v2?: string) =>
  send(client.ws, { type: ServerMessageType.Notice, text, ...(key && { key }), ...(v1 != null && { v1 }), ...(v2 != null && { v2 }) });
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
  // (18 October, SUSPECTED-BUGS.md: any moderator could delete an admin's or another moderator's line) as muting:
  // a moderator's own lines, and players', but not an admin's or another moderator's
  const mayDelete = async (author: number) => {
    if (client.role === "admin" || !author || author === client.userId) return true;
    const rows = await postgres.em.getConnection().execute<{ username: string }[]>(`SELECT username FROM bym."user" WHERE userid = ?`, [author]);
    const role = rows[0] ? await roleOf(author, rows[0].username) : null;
    return role !== "admin" && role !== "mod";
  };
  if (info.type === ChannelType.Alliance) {
    const rowId = Number(id.slice(1));
    if (!id.startsWith("a") || !Number.isSafeInteger(rowId)) return refuse(client);
    const authorRows = await postgres.em
      .getConnection()
      .execute<{ author: number }[]>(`SELECT user_id AS author FROM bym.alliance_message WHERE id = ? AND alliance_id = ?`, [rowId, info.allianceId]);
    if (authorRows.length && !(await mayDelete(Number(authorRows[0].author ?? 0)))) return refuse(client);
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
      if (!(await mayDelete(Number(entry.userId ?? 0)))) return refuse(client);
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
export const muteFromChat = async (client: ChatClient, targetId: string | undefined, targetName: string | undefined, minutes: number, reason?: string) => {
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
  // (QoL #153: with the reason the moderator gave, if any: the player is told it at once, admin.muteUser -> tellMuted)
  const why = typeof reason === "string" ? reason.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 200) : "";
  await muteUser(Number(target.userid), capped, why);
  if (staff) await logAdminAction(staff, "mute", { userid: Number(target.userid), username: target.username }, `${capped} minutes, from chat${why ? `: ${why}` : ""}`);
  notice(client, `${target.username} is muted for ${capped >= 1440 ? `${Math.round(capped / 1440)} day(s)` : capped >= 60 ? `${Math.round(capped / 60)} hour(s)` : `${capped} minutes`}.`);
};

/** A player by id, with their staff role, when a moderator may act on them (else the client is answered). */
const actionableTarget = async (client: ChatClient, targetId: string | undefined): Promise<{ userid: number; username: string } | null> => {
  if (!/^\d{1,10}$/.test(String(targetId ?? ""))) {
    refuse(client);
    return null;
  }
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(`SELECT userid, username FROM bym."user" WHERE userid = ?`, [Number(targetId)]);
  const target = rows[0];
  if (!target) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: String(targetId).slice(0, 16) });
    return null;
  }
  const targetRole = await roleOf(Number(target.userid), target.username);
  if (Number(target.userid) === client.userId || targetRole === "admin" || (targetRole === "mod" && client.role !== "admin")) {
    refuse(client);
    return null;
  }
  return { userid: Number(target.userid), username: target.username };
};

/** QoL #153: at most this many lines at once. */
const PURGE_MAX = 50;

/**
 * Inferno-only (QoL #153): a player's last lines in a room removed for everyone (the name menu's "Delete their last
 * 10 lines"), newest first, from its history too (a Global room's list in Redis, an alliance's feed in Postgres). The
 * same rules as a mute: never an admin, a moderator only by an admin. In the admin log.
 */
export const purgeLines = async (client: ChatClient, channel: string, targetId: string, count?: number) => {
  if (!client.role) return refuse(client);
  const info = client.channels.get(channel);
  if (!info) return refuse(client);
  const target = await actionableTarget(client, targetId);
  if (!target) return;
  const n = Math.max(1, Math.min(PURGE_MAX, Math.round(Number(count) || 10)));
  const ids: string[] = [];
  if (info.type === ChannelType.Alliance) {
    const gone = await postgres.em
      .getConnection()
      .execute<{ id: string | number }[]>(
        `DELETE FROM bym.alliance_message WHERE id IN (SELECT id FROM bym.alliance_message WHERE alliance_id = ? AND user_id = ? AND message_type = 'message' ORDER BY id DESC LIMIT ?) RETURNING id`,
        [info.allianceId, target.userid, n]
      );
    for (const row of gone) ids.push(`a${row.id}`);
  } else {
    const key = `history:${channel}`;
    // (the list is newest first)
    for (const raw of await redis.lrange(key, 0, -1)) {
      if (ids.length >= n) break;
      let entry: HistoryEntry;
      try {
        entry = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Number(entry.userId) !== target.userid || !entry.id) continue;
      await redis.lrem(key, 1, raw);
      ids.push(entry.id);
    }
  }
  for (const id of ids) publishToChannel(channel, JSON.stringify({ type: ServerMessageType.Deleted, channel, id }));
  const staff = await staffUser(client);
  if (staff) await logAdminAction(staff, "chat-purge", target, `${ids.length} line(s) deleted in ${channel}`);
  notice(client, `${ids.length} line(s) by ${target.username} deleted.`, "io_chat2_purged", String(ids.length), target.username);
};

/** QoL #152: a player can report this many lines an hour, and a line once. */
const REPORTS_AN_HOUR = 5;
const REPORT_BEFORE = 5;
const REPORT_AFTER = 2;

interface ReportedLine {
  userId: number;
  body: string;
  ts: number;
  id?: string;
}

/** "2026-10-15 13:04" (UTC), for the report's lines. */
const stamp = (ts: number) => (ts > 0 ? new Date(ts).toISOString().slice(0, 16).replace("T", " ") : "");

/**
 * Inferno-only (QoL #152): a chat line reported by a player (the name menu's "Report this line"), with the lines around
 * it as the room has them (not as the reporter's game says), to the admin panel's Reports tab
 * (services/admin/bugReports.recordPlayerReport). Only from a room the player is in; 5 an hour, and a line once a day.
 * A line too old to be in the room's history any more is reported as the reporter's game showed it, and says so.
 */
export const reportLine = async (client: ChatClient, channel: string, id: string, targetId?: string, shown?: string) => {
  if (!infernoOnlyConfig.enabled) return refuse(client);
  const info = client.channels.get(channel);
  if (!info || typeof id !== "string" || !/^[ga][0-9a-z]{1,40}$/.test(id)) return refuse(client);
  const onceKey = `chat:reported:${client.userId}:${id}`;
  if (await redis.get(onceKey).catch(() => null)) return notice(client, "You reported that line already.", "io_chat2_report_twice");
  const limitKey = `chat:reports:${client.userId}`;
  if (Number((await redis.get(limitKey).catch(() => null)) ?? 0) >= REPORTS_AN_HOUR) {
    return notice(client, "You have reported a lot of lines this hour. Try again later.", "io_chat2_report_limit");
  }
  let lines: ReportedLine[] = [];
  if (info.type === ChannelType.Alliance) {
    const rowId = Number(id.slice(1));
    if (!id.startsWith("a") || !Number.isSafeInteger(rowId)) return refuse(client);
    const conn = postgres.em.getConnection();
    type Row = { id: string | number; user_id: number; body: string; created_at: Date | string };
    const before = await conn.execute<Row[]>(
      `SELECT id, user_id, body, created_at FROM bym.alliance_message WHERE alliance_id = ? AND id <= ? AND message_type = 'message' ORDER BY id DESC LIMIT ?`,
      [info.allianceId, rowId, REPORT_BEFORE + 1]
    );
    const after = await conn.execute<Row[]>(
      `SELECT id, user_id, body, created_at FROM bym.alliance_message WHERE alliance_id = ? AND id > ? AND message_type = 'message' ORDER BY id ASC LIMIT ?`,
      [info.allianceId, rowId, REPORT_AFTER]
    );
    lines = [...before.reverse(), ...after].map((r) => ({ userId: Number(r.user_id) || 0, body: String(r.body ?? ""), ts: new Date(r.created_at).getTime() || 0, id: `a${r.id}` }));
  } else {
    // (the list is newest first: oldest first here)
    const entries = (await redis.lrange(`history:${channel}`, 0, -1))
      .flatMap((raw) => {
        try {
          return [JSON.parse(raw) as HistoryEntry];
        } catch {
          return [];
        }
      })
      .reverse();
    const i = entries.findIndex((e) => e.id === id);
    if (i >= 0) {
      lines = entries
        .slice(Math.max(0, i - REPORT_BEFORE), i + REPORT_AFTER + 1)
        .map((e) => ({ userId: Number(e.userId) || 0, body: String(e.body ?? ""), ts: Number(e.ts) || 0, id: e.id }));
    }
  }
  const found = lines.find((l) => l.id === id) ?? null;
  const who = found ? found.userId : /^\d{1,10}$/.test(String(targetId ?? "")) ? Number(targetId) : 0;
  if (!who || who === client.userId) return refuse(client);
  const ids = [...new Set([who, ...lines.map((l) => l.userId).filter((u) => u > 0)])];
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(`SELECT userid, username FROM bym."user" WHERE userid IN (${ids.map(() => "?").join(",")})`, ids);
  const names = new Map(rows.map((r) => [Number(r.userid), r.username]));
  if (!names.has(who)) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: String(who) });
    return;
  }
  const where = info.type === ChannelType.Alliance ? `Alliance chat (alliance #${info.allianceId})` : `Global (${channel})`;
  const clean = (t: string) => String(t ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  const said = found ? clean(found.body) : `${clean(shown ?? "").slice(0, 300)} (no longer in the room's history: as the reporter's game showed it)`;
  const details = `Reported by ${client.username} (#${client.userId}) in ${where}\n${stamp(found?.ts ?? 0)} ${names.get(who)}: ${said}`;
  const context = lines
    .map((l) => `${l.id === id ? ">> " : "   "}${stamp(l.ts)} ${l.userId > 0 ? (names.get(l.userId) ?? `#${l.userId}`) : "(server)"}: ${clean(l.body)}`)
    .join("\n");
  await recordPlayerReport({
    kind: "chat",
    reporter: { userid: client.userId, username: client.username },
    target: { userid: who, username: names.get(who)! },
    details,
    context: context ? `The lines around it (>> the one reported):\n${context}` : "",
  });
  await redis.setex(onceKey, 24 * 60 * 60, "1").catch(() => 0);
  const n = Number(await redis.incr(limitKey).catch(() => 0));
  if (n === 1) await redis.expire(limitKey, 60 * 60).catch(() => 0);
  notice(client, "Thanks: the line was sent to the admins.", "io_chat2_reported");
};
