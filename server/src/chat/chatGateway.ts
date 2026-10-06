import { logger } from "../utils/logger.js";
import { type ChatControlMessage } from "./chatControl.js";
import {
  ClientMessageType,
  ErrorCode,
  send,
  ServerMessageType,
  type ClientMessage,
} from "./chatProtocol.js";
import { authenticate } from "./chatIdentity.js";
import { addIgnore, removeIgnore, sendIgnoreList } from "./chatIgnoreList.js";
import {
  authorizeJoin,
  getChannelHistory,
  joinChannel,
  leaveAllChannels,
  leaveChannel,
  postMessage,
} from "./chatRooms.js";
import { clients, type ChatClient, type SocketData } from "./chatState.js";
import { refreshDisplayName } from "./chatIdentity.js";
import { deleteLine, muteFromChat } from "./chatModeration.js";
import { ALLIANCE_CHANNEL_ALIAS } from "../config/ChatConfig.js";
import { initTransport, subscribeControl } from "./chatTransport.js";
import { ChannelType, ChatControlType } from "../enums/Chat.js";

type ServerWebSocket<T> = import("bun").ServerWebSocket<T>;

/**
 * Brings the gateway up: opens the Redis subscriber and, once it connects,
 * subscribes to the control channel. Must be called once before any WebSocket
 * connections are accepted.
 */
export const initGateway = () => initTransport(() => subscribeControl(handleControlMessage));

/**
 * Handles a control message published by the API side.
 * Membership changes are written there, so this is how the gateway learns that a
 * player it is holding in an alliance channel no longer belongs in it.
 *
 * @param {string} payload - The serialised {@link ChatControlMessage}.
 */
const handleControlMessage = (payload: string) => {
  let message: ChatControlMessage;

  try {
    message = JSON.parse(payload);
  } catch {
    logger.error(`Chat control message was not valid JSON: ${payload}`);
    return;
  }

  // (announcements are written into Global by chat/chatBroadcasts.ts now, history and all: nothing to do)
  if (message.type === ChatControlType.RefreshUser) {
    const who = clients.get(message.userId);
    if (who) void refreshDisplayName(who, true).catch((err) => logger.warn(`Chat: user ${message.userId} could not be refreshed: ${err}`));
    return;
  }
  if (message.type !== ChatControlType.AllianceEvict) return;

  const client = clients.get(message.userId);

  if (!client) return;

  // At once (a kicked player stops reading straight away), and again a moment later: a join is written in
  // the caller's transaction, which may not have landed yet.
  void reconcileAlliance(client);
  setTimeout(() => {
    const again = clients.get(message.userId);
    if (again) void reconcileAlliance(again);
  }, 1500);
};

/**
 * Puts a connected player in the alliance channel they belong to now: out of one they left or were removed
 * from (the game is told: alliance_left), into a new one they joined or created (joined, with its history).
 */
const reconcileAlliance = async (client: ChatClient) => {
  try {
    const resolved = await authorizeJoin(client.userId, ALLIANCE_CHANNEL_ALIAS);
    for (const [channel, info] of [...client.channels]) {
      if (info.type !== ChannelType.Alliance || channel === resolved?.key) continue;
      leaveChannel(client, channel);
      send(client.ws, { type: ServerMessageType.AllianceLeft, channel });
    }
    if (resolved && !client.channels.has(resolved.key)) {
      joinChannel(client, resolved.key, resolved.info);
      const history = await getChannelHistory(resolved.key, resolved.info);
      send(client.ws, { type: ServerMessageType.Joined, channel: resolved.key, history });
    }
  } catch (err) {
    logger.warn(`Chat: alliance channel of user ${client.userId} could not be updated: ${err}`);
  }
};

/**
 * Called when a new WebSocket connection is opened.
 * Initialises the socket's data to an unauthenticated state.
 *
 * @param {ServerWebSocket<SocketData>} ws - The newly opened WebSocket connection.
 */
export const handleOpen = (ws: ServerWebSocket<SocketData>) => {
  ws.data = { userId: null, displayName: "", lastMsgAt: 0 };
};

/**
 * Parses the incoming JSON, routes to the appropriate handler based on
 * {@link ClientMessageType}, and enforces authentication for all message types
 * except `auth`.
 *
 * @param {ServerWebSocket<SocketData>} ws - The WebSocket connection that sent the message.
 * @param {string | Buffer} data - The raw message data received from the client.
 */
const dispatch = async (ws: ServerWebSocket<SocketData>, data: string | Buffer) => {
  let message: ClientMessage;

  try {
    message = JSON.parse(data.toString());
  } catch {
    send(ws, { type: ServerMessageType.Error, code: ErrorCode.InvalidJson });
    return;
  }

  if (message.type === ClientMessageType.Auth) {
    await authenticate(ws, message);
    return;
  }

  if (ws.data.userId === null) {
    send(ws, { type: ServerMessageType.Error, code: ErrorCode.NotAuthenticated });
    return;
  }

  const client = clients.get(ws.data.userId);

  if (!client) {
    send(ws, { type: ServerMessageType.Error, code: ErrorCode.NotAuthenticated });
    return;
  }

  switch (message.type) {
    case ClientMessageType.Join: {
      const resolved = await authorizeJoin(client.userId, message.channel);

      if (!resolved) {
        send(ws, { type: ServerMessageType.Error, code: ErrorCode.InvalidChannel });
        return;
      }

      joinChannel(client, resolved.key, resolved.info);

      const history = await getChannelHistory(resolved.key, resolved.info);

      send(ws, { type: ServerMessageType.Joined, channel: resolved.key, history });
      return;
    }

    case ClientMessageType.Leave:
      leaveChannel(client, message.channel);
      return;

    case ClientMessageType.Delete:
      await deleteLine(client, message.channel, message.id);
      return;

    case ClientMessageType.Mute:
      await muteFromChat(client, message.targetId, message.targetName, message.minutes);
      return;

    case ClientMessageType.Say:
      await postMessage(client, message.channel, message.message);
      return;

    case ClientMessageType.GetIgnore:
      await sendIgnoreList(client, message.action === "sync" ? "sync" : "show");
      return;

    case ClientMessageType.Ignore:
      await addIgnore(client, message.targetId, message.targetName);
      return;

    case ClientMessageType.Unignore:
      await removeIgnore(client, message.targetId, message.targetName);
      return;

    case ClientMessageType.UpdateName:
      // (the game says its yard level changed: the name it is shown with follows)
      await refreshDisplayName(client);
      return;

    case ClientMessageType.Ping:
      return;
  }
};

/**
 * Called when a message is received from a WebSocket client.
 *
 * Bun does not await this handler, so anything that escapes it becomes an unhandled
 * rejection and takes the whole process down with every connection on it. This is the
 * boundary that keeps one player's failed query from disconnecting everyone.
 *
 * @param {ServerWebSocket<SocketData>} ws - The WebSocket connection that sent the message.
 * @param {string | Buffer} data - The raw message data received from the client.
 */
export const handleMessage = async (ws: ServerWebSocket<SocketData>, data: string | Buffer) => {
  try {
    await dispatch(ws, data);
  } catch (err) {
    logger.error(`Chat message handling failed for user ${ws.data.userId}: ${err}`);

    send(ws, { type: ServerMessageType.Error, code: ErrorCode.ServerError });
  }
};

/**
 * Called when a WebSocket connection is closed.
 * Removes the client from every channel and from the active clients map.
 *
 * @param {ServerWebSocket<SocketData>} ws - The WebSocket connection that was closed.
 */
export const handleClose = (ws: ServerWebSocket<SocketData>): void => {
  const userId = ws.data.userId;
  if (userId === null) return;

  const client = clients.get(userId);
  if (!client || client.ws !== ws) return;

  leaveAllChannels(client);
  clients.delete(userId);
};
