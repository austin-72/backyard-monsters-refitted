import { Save } from "../database/models/save.model.js";
import { User } from "../database/models/user.model.js";
import { postgres, redis } from "../server.js";
import { tagsOfUsers } from "../services/alliance/allianceTag.js";
import { chatTokenKey } from "./chatChannels.js";
import {
  AuthFailReason,
  ClientMessageType,
  ErrorCode,
  send,
  ServerMessageType,
  type ClientMessage,
} from "./chatProtocol.js";
import { leaveAllChannels } from "./chatRooms.js";
import { clients, type ChatClient, type SocketData } from "./chatState.js";
import { roleOf } from "./chatModeration.js";
import { chatColorOf } from "../services/yard/dave.js";

type ServerWebSocket<T> = import("bun").ServerWebSocket<T>;

type AuthMessage = Extract<ClientMessage, { type: ClientMessageType.Auth }>;

type ChatIdentity = Pick<User, "username" | "pic_square"> & {
  save?: Pick<Save, "points" | "basevalue"> | null;
};

const CHAT_FIELDS = [
  "userid",
  "username",
  "banned",
  "pic_square",
  "save.points",
  "save.basevalue"
] as const;

/**
 * The authoritative chat display name for a user.
 *
 * @param {ChatIdentity} user - The authenticated user, with the level fields selected.
 * @returns {string} The display name to broadcast for this user.
 */
// (13 October, the user's call: the name alone; the speaker's alliance tag goes with each line, not the yard level)
const getDisplayName = (user: ChatIdentity): string => user.username;

/** The player's alliance and its tag, or nulls (a failure leaves them out: the line still goes). */
const allianceOf = async (userid: number): Promise<{ allianceId: number | null; allianceTag: string | null }> => {
  const t = (await tagsOfUsers([userid]).catch(() => null))?.get(userid);
  return { allianceId: t?.allianceId ?? null, allianceTag: t?.tag ?? null };
};

/**
 * Authenticates a connection and registers it as a {@link ChatClient}.
 *
 * The token is checked against the one issued during base load, then the account
 * is loaded to derive the display name server-side rather than trusting whatever
 * the client claims to be called. A second connection for the same player closes
 * the first, so a player is only ever in one place.
 *
 * @param {ServerWebSocket<SocketData>} ws - The connection authenticating.
 * @param {AuthMessage} message - The client's auth message.
 */
export const authenticate = async (ws: ServerWebSocket<SocketData>, message: AuthMessage) => {
  if (ws.data.userId !== null) {
    send(ws, { type: ServerMessageType.Error, code: ErrorCode.AlreadyAuthenticated });
    return;
  }

  const storedToken = await redis.get(chatTokenKey(message.userId));

  if (!storedToken || storedToken !== message.token) {
    send(ws, { type: ServerMessageType.AuthFail, reason: AuthFailReason.InvalidToken });
    ws.close();
    return;
  }

  const em = postgres.orm.em.fork();

  const user = await em.findOne(User, { userid: message.userId }, { fields: CHAT_FIELDS });

  if (!user || user.banned) {
    send(ws, { type: ServerMessageType.AuthFail, reason: AuthFailReason.UserNotFound });
    ws.close();
    return;
  }

  const displayName = getDisplayName(user);

  const client: ChatClient = {
    ws,
    userId: user.userid,
    displayName,
    username: user.username,
    picSquare: user.pic_square ?? null,
    channels: new Map(),
    lastMsgAt: 0,
    role: await roleOf(user.userid, user.username),
    color: await chatColorOf(user.userid).catch(() => null),
    ...(await allianceOf(user.userid)),
  };

  // (18 October, SUSPECTED-BUGS.md: a connection that closed during the reads above was still registered, and the
  // player stayed "in chat" with nowhere for their messages to go) not registered once closed
  const state = ws as unknown as { readyState?: number; closed?: boolean };
  if (state.closed === true || (typeof state.readyState === "number" && state.readyState > 1)) return;

  ws.data.userId = user.userid;
  ws.data.displayName = displayName;

  const existing = clients.get(user.userid);

  if (existing) {
    existing.ws.close();
    leaveAllChannels(existing);
  }

  clients.set(user.userid, client);

  send(ws, { type: ServerMessageType.AuthOk, userId: user.userid, displayName, role: client.role ?? null });
};

const lastRefresh = new Map<number, number>();

/**
 * The game's yard level changed: the name the player is shown with in chat ("[12] Name") is worked out again
 * from the database (never from what the game sends). At most once every 10 seconds per player.
 *
 * @param {ChatClient} client - The client to refresh.
 */
export const refreshDisplayName = async (client: ChatClient, force = false) => {
  const now = Date.now();
  if (!force && now - (lastRefresh.get(client.userId) ?? 0) < 10_000) return;
  lastRefresh.set(client.userId, now);
  // (18 October, SUSPECTED-BUGS.md: one entry per player ever seen, never removed) the old ones dropped past 5,000
  if (lastRefresh.size > 5000) for (const [id, at] of lastRefresh) if (now - at > 10_000) lastRefresh.delete(id);
  const em = postgres.orm.em.fork();
  const user = await em.findOne(User, { userid: client.userId }, { fields: CHAT_FIELDS });
  if (!user) return;
  client.displayName = getDisplayName(user);
  client.username = user.username;
  client.ws.data.displayName = client.displayName;
  const role = await roleOf(user.userid, user.username);
  if (force && role !== (client.role ?? null)) {
    // (the admin panel's switch: the game learns its new role as a fresh login would tell it)
    send(client.ws, { type: ServerMessageType.AuthOk, userId: user.userid, displayName: client.displayName, role, refresh: true });
  }
  client.role = role;
  client.color = await chatColorOf(user.userid).catch(() => client.color ?? null);
  Object.assign(client, await allianceOf(user.userid));
};
