import { logger } from "../utils/logger.js";
import { Filter as BadWords } from "bad-words";

import { User } from "../database/models/user.model.js";
import { postgres, redis } from "../server.js";
import {
  addAllianceMessage,
  getAllianceMessages,
} from "../services/alliance/allianceMessages.js";
import { AllianceMessageType } from "../enums/Alliance.js";
import {
  allianceChannelKey,
  validateChannel,
} from "./chatChannels.js";
import { getHistory, pushMessage } from "./chatHistory.js";
import {
  ErrorCode,
  send,
  ServerMessageType,
  type HistoryEntry,
  type ServerMessage,
} from "./chatProtocol.js";
import { channelMembers, type ChannelInfo, type ChatClient } from "./chatState.js";
import {
  publishToChannel,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "./chatTransport.js";
import { ALLIANCE_CHANNEL_ALIAS } from "../config/ChatConfig.js";
import { calculateBaseLevel } from "../services/base/calculateBaseLevel.js";
import { newLineId, rolesOf } from "./chatModeration.js";
import { ChannelType } from "../enums/Chat.js";
import { questChat } from "../services/quests/questProgress.js";

interface ResolvedChannel {
  key: string;
  info: ChannelInfo;
}

const filter = new BadWords();

/**
 * Chat flood limit: one line every RATE_LIMIT_MS on average, with a burst of up to RATE_LIMIT_BURST
 * lines at once. The burst matters for the HTTP chat bridge, which carries every line typed since
 * its last request in one go: two lines typed a second apart can reach here in the same millisecond.
 * (client.lastMsgAt is the time the next line would be due if lines kept coming at the average rate.)
 */
const RATE_LIMIT_MS = 500;
const RATE_LIMIT_BURST = 3;
const MAX_MSG_LEN = 200;

/**
 * Resolves the channel a client is asking to join into a real channel key.
 *
 * Global rooms are validated against the fixed set the server issues at base load.
 * Alliance chat is different: the client sends only the ALLIANCE_CHANNEL_ALIAS
 * and the key is derived from the player's own membership, so no client can name
 * another alliance's channel regardless of what it sends.
 *
 * @param {number} userid - The player requesting the join.
 * @param {string} requestedChannel - The channel name as sent by the client.
 * @returns {Promise<ResolvedChannel | null>} The channel key and its kind, or null if not permitted.
 */
export const authorizeJoin = async (userid: number, requestedChannel: string): Promise<ResolvedChannel | null> => {
  if (requestedChannel === ALLIANCE_CHANNEL_ALIAS) {
    const em = postgres.orm.em.fork();
    const user = await em.findOne(User, { userid }, { fields: ["alliance_id"] });

    if (!user) return null;

    if (!user.alliance_id) return null;

    const key = allianceChannelKey(user.alliance_id);

    return { key, info: { type: ChannelType.Alliance, allianceId: user.alliance_id } };
  }

  const key = validateChannel(requestedChannel);

  if (!key) return null;

  return { key, info: { type: ChannelType.Global } };
};

/**
 * Subscribes a client to a channel, in addition to any they are already in.
 * Creates the Redis subscription for the channel if this is the first local member.
 * Broadcasts a {@link ServerMessageType.UserEnter} event to the channel on join.
 *
 * @param {ChatClient} client - The client joining the channel.
 * @param {string} channel - The resolved channel key (e.g. `chat:alliance:{id}`).
 * @param {ChannelInfo} channelInfo - What kind of channel it is, from {@link authorizeJoin}.
 */
export const joinChannel = (client: ChatClient, channel: string, channelInfo: ChannelInfo) => {
  if (client.channels.has(channel)) return;

  client.channels.set(channel, channelInfo);

  let members = channelMembers.get(channel);

  if (!members) {
    members = new Set();
    channelMembers.set(channel, members);
    subscribeToChannel(channel);
  }

  members.add(client.userId);

  const enterMessage: ServerMessage = {
    type: ServerMessageType.UserEnter,
    channel,
    userId: client.userId,
    displayName: client.displayName,
  };

  publishToChannel(channel, JSON.stringify(enterMessage));
};

/**
 * Removes a client from one of the channels they are in.
 * Unsubscribes from Redis if no local clients remain in the channel.
 * Broadcasts a {@link ServerMessageType.UserExit} event to the channel on leave.
 *
 * @param {ChatClient} client - The client leaving.
 * @param {string} channel - The channel being left.
 */
export const leaveChannel = (client: ChatClient, channel: string) => {
  if (!client.channels.delete(channel)) return;

  const members = channelMembers.get(channel);

  if (members) {
    members.delete(client.userId);

    if (members.size === 0) {
      channelMembers.delete(channel);
      unsubscribeFromChannel(channel);
    }
  }

  const exitMessage: ServerMessage = {
    type: ServerMessageType.UserExit,
    channel,
    userId: client.userId,
  };

  publishToChannel(channel, JSON.stringify(exitMessage));
};

/**
 * Removes a client from every channel they are in, used when the connection ends.
 *
 * @param {ChatClient} client - The client being disconnected.
 */
export const leaveAllChannels = (client: ChatClient) => {
  for (const channel of [...client.channels.keys()]) leaveChannel(client, channel);
};

/**
 * Returns the entries shown when a channel is joined.
 *
 * @param {string} channel - The channel being joined.
 * @param {ChannelInfo} info - What kind of channel it is.
 * @returns {Promise<HistoryEntry[]>} Entries ordered oldest to newest.
 */
export const getChannelHistory = async (channel: string, info: ChannelInfo): Promise<HistoryEntry[]> => {
  if (info.type !== ChannelType.Alliance) return await getHistory(channel);

  const em = postgres.orm.em.fork();
  const entries = await getAllianceMessages(info.allianceId, em);
  return await withLevels(entries);
};

/**
 * Alliance lines carry the author's yard level, "[12] Name", as Global's do (the feed stores only the
 * author): one query for the authors of the lines in it. Shouts are sentences and stay as they are.
 */
const withLevels = async (entries: HistoryEntry[]): Promise<HistoryEntry[]> => {
  const ids = [...new Set(entries.filter((e) => e.messageType === AllianceMessageType.MESSAGE && e.userId > 0).map((e) => e.userId))];
  if (!ids.length) return entries;
  try {
    const rows = await postgres.em
      .getConnection()
      .execute<{ userid: number; username: string; points: string | null; basevalue: string | null }[]>(
        `SELECT u.userid, u.username, s.points, s.basevalue
           FROM bym."user" u LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
          WHERE u.userid IN (${ids.map(() => "?").join(",")})`,
        ids
      );
    const names = new Map(rows.map((r) => [Number(r.userid), `[${calculateBaseLevel(r.points ?? "0", r.basevalue ?? "0")}] ${r.username}`]));
    const roles = await rolesOf(rows.map((r) => ({ userid: Number(r.userid), username: r.username })));
    return entries.map((e) => {
      if (e.messageType !== AllianceMessageType.MESSAGE || !names.has(e.userId)) return e;
      const role = roles.get(e.userId);
      return { ...e, displayName: names.get(e.userId)!, ...(role && { role }) };
    });
  } catch (err) {
    logger.warn(`Chat: alliance history levels failed: ${err}`);
    return entries;
  }
};

/**
 * Accepts a chat line from a client and broadcasts it to the channel.
 *
 * Where the line is stored depends on the room: alliance chat is durable in
 * Postgres and trimmed to a sliding window, while global rooms keep a capped
 * Redis list. Either way the client is told nothing about which happened.
 *
 * @param {ChatClient} client - The client sending the message.
 * @param {string} channel - The channel to post into.
 * @param {string} body - The raw message text as sent by the client.
 */
export const postMessage = async (client: ChatClient, channel: string, body: string) => {
  const info = client.channels.get(channel);

  // Local servers only: say what happened to each chat line, so "my message vanished" can be told
  // apart (never joined the channel / rate limited / delivered) from the server log.
  const trace = (outcome: string) => {
    if (process.env.ENV === "local") logger.info(`Chat: user ${client.userId} -> ${channel}: ${outcome}`);
  };

  if (!info) {
    trace(`refused, not in that channel (in: ${[...client.channels.keys()].join(", ") || "none"})`);
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.NotInChannel });
    return;
  }

  const now = Date.now();

  // Muted from the admin panel (services/admin/admin.ts): the line is not posted and only the
  // speaker is told why.
  const mutedUntil = Number((await redis.get(`chat:mute:${client.userId}`)) ?? 0);
  if (mutedUntil > now) {
    trace("refused, muted");
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.Muted, minutes: Math.ceil((mutedUntil - now) / 60_000) });
    return;
  }

  const due = Math.max(now, client.lastMsgAt) + RATE_LIMIT_MS;
  if (due - now > RATE_LIMIT_MS * RATE_LIMIT_BURST) {
    trace("refused, rate limited");
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.RateLimited });
    return;
  }

  client.lastMsgAt = due;

  // (control characters and line breaks never reach anyone; the game shows the text as text, not markup)
  const messageBody = filter.clean(String(body ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, MAX_MSG_LEN).trim());

  if (!messageBody) return;

  const fields = {
    userId: client.userId,
    picSquare: client.picSquare,
    allianceImage: null,
    body: messageBody,
    messageType: AllianceMessageType.MESSAGE,
    ...(client.role && { role: client.role }),
  };

  let entry: HistoryEntry;

  if (info.type === ChannelType.Alliance) {
    const record = { allianceId: info.allianceId, userId: client.userId, body: messageBody };

    const em = postgres.orm.em.fork();
    const stored = await addAllianceMessage(record, em);

    entry = { ...fields, displayName: client.displayName, ts: stored.created_at.getTime(), id: `a${stored.id}` };
  } else {
    entry = { ...fields, displayName: client.displayName, ts: now, id: newLineId() };

    await pushMessage(channel, entry);
  }

  const outgoing: ServerMessage = {
    type: ServerMessageType.Message,
    channel,
    ...entry,
    userId: client.userId,
  };

  trace(`delivered (${messageBody.length} characters)`);

  publishToChannel(channel, JSON.stringify(outgoing));

  // Inferno-only quest book (never holds up or fails the line)
  void questChat(client.userId, info.type === ChannelType.Alliance ? "alliance" : "global", messageBody);
};
