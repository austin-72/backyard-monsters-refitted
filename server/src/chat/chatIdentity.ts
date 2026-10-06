import { Save } from "../database/models/save.model.js";
import { User } from "../database/models/user.model.js";
import { postgres, redis } from "../server.js";
import { calculateBaseLevel } from "../services/base/calculateBaseLevel.js";
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
const getDisplayName = (user: ChatIdentity): string => {
  const save = user.save;
  const level = save ? calculateBaseLevel(save.points, save.basevalue) : 1;

  return `[${level}] ${user.username}`;
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
  };

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
};
