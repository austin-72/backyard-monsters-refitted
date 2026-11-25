import { logger } from "../utils/logger.js";

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
import { sanitizeEmotes } from "./chatEmotes.js";
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
import { tagsOfUsers, type MemberTag } from "../services/alliance/allianceTag.js";
import { isHidden, onlineNow } from "../services/user/presence.js";
import { refreshDisplayName } from "./chatIdentity.js";
import { newLineId, rolesOf } from "./chatModeration.js";
import { chatColorsOf } from "../services/yard/dave.js";
import { ChannelType } from "../enums/Chat.js";
import { questChat } from "../services/quests/questProgress.js";

interface ResolvedChannel {
  key: string;
  info: ChannelInfo;
}

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
  if (info.type !== ChannelType.Alliance) return await withIdentity(await getHistory(channel));

  const em = postgres.orm.em.fork();
  const entries = await getAllianceMessages(info.allianceId, em);
  return await withIdentity(entries);
};

/**
 * Stored lines, Global's and an alliance's, show their authors as they are now (13 October): the name alone (lines
 * from before carry "[12] Name"), the author's alliance tag now, whether they are online now, their staff role and
 * their name's colour. One query for the authors of the lines in it. Shouts are sentences and stay as they are.
 */
const withIdentity = async (entries: HistoryEntry[]): Promise<HistoryEntry[]> => {
  const ids = [...new Set(entries.filter((e) => e.messageType === AllianceMessageType.MESSAGE && e.userId > 0).map((e) => e.userId))];
  if (!ids.length) return entries;
  try {
    const rows = await postgres.em
      .getConnection()
      .execute<{ userid: number; username: string }[]>(
        `SELECT u.userid, u.username FROM bym."user" u WHERE u.userid IN (${ids.map(() => "?").join(",")})`,
        ids
      );
    const names = new Map(rows.map((r) => [Number(r.userid), r.username]));
    const roles = await rolesOf(rows.map((r) => ({ userid: Number(r.userid), username: r.username })));
    const colors = await chatColorsOf(ids).catch(() => new Map<number, string>());
    const tags = await tagsOfUsers(ids).catch(() => new Map<number, MemberTag>());
    const online = await onlineNow();
    return entries.map((e) => {
      if (e.messageType !== AllianceMessageType.MESSAGE || !names.has(e.userId)) return e;
      const { role: _r, color: _c, allianceId: _a, allianceTag: _t, ...rest } = e;
      const role = roles.get(e.userId);
      const color = colors.get(e.userId);
      const tag = tags.get(e.userId);
      return {
        ...rest,
        displayName: names.get(e.userId)!,
        online: online.has(e.userId),
        ...(role && { role }),
        ...(color && { color }),
        ...(tag && { allianceId: tag.allianceId, allianceTag: tag.tag }),
      };
    });
  } catch (err) {
    logger.warn(`Chat: history names failed: ${err}`);
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
/** When each player's next chat line is due (13 October), across their connections: the flood limit's state. */
const floodByUser = new Map<number, number>();

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
  // (13 October) banned or deleted from the admin panel: nothing posted (chat has its own sign-in)
  if ((await redis.get(`chat:banned:${client.userId}`)) === "1") {
    trace("refused, banned");
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.Muted, minutes: 0 });
    return;
  }
  const mutedUntil = Number((await redis.get(`chat:mute:${client.userId}`)) ?? 0);
  if (mutedUntil > now) {
    trace("refused, muted");
    // (QoL #262: with the reason given, if any)
    const reason = (await redis.get(`chat:mutereason:${client.userId}`).catch(() => null)) ?? undefined;
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.Muted, minutes: Math.ceil((mutedUntil - now) / 60_000), reason });
    return;
  }

  // (13 October: kept by player, not by connection: signing in to chat again started a fresh burst each time)
  const due = Math.max(now, client.lastMsgAt, floodByUser.get(client.userId) ?? 0) + RATE_LIMIT_MS;
  if (due - now > RATE_LIMIT_MS * RATE_LIMIT_BURST) {
    trace("refused, rate limited");
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.RateLimited });
    return;
  }

  client.lastMsgAt = due;
  floodByUser.set(client.userId, due);
  if (floodByUser.size > 5000) for (const [id, at] of floodByUser) if (at < now) floodByUser.delete(id);

  // (control characters and line breaks never reach anyone; the game shows the text as text, not markup)
  // (Inferno-only, 7 October, the user's call: no word filter on what players write to each other.)
  // (14 October: emotes, [e:id], the game's own and at most 5 a line: chatEmotes.ts)
  const messageBody = sanitizeEmotes(String(body ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, MAX_MSG_LEN).trim());

  if (!messageBody) return;

  // (13 October: the speaker's alliance tag as it is now, at most 10 seconds old: joined, left, or set by the leader)
  await refreshDisplayName(client).catch(() => undefined);

  // (18 October, SUSPECTED-BUGS.md) an alliance's chat only while still in it: a kicked player whose eviction
  // message didn't get through kept reading and writing it until they reconnected
  if (info.type === ChannelType.Alliance) {
    const rows = (await postgres.orm.em
      .getConnection()
      .execute(`SELECT alliance_id FROM bym."user" WHERE userid = ?`, [client.userId], "all")
      .catch(() => null)) as { alliance_id: number | null }[] | null;
    if (rows && Number(rows[0]?.alliance_id ?? 0) !== Number(info.allianceId)) {
      trace("refused, no longer in that alliance");
      leaveChannel(client, channel);
      send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.NotInChannel });
      return;
    }
  }

  const fields = {
    userId: client.userId,
    picSquare: client.picSquare,
    allianceImage: null,
    body: messageBody,
    messageType: AllianceMessageType.MESSAGE,
    ...(client.role && { role: client.role }),
    ...(client.color && { color: client.color }),
    ...(client.allianceId && client.allianceTag && { allianceId: client.allianceId, allianceTag: client.allianceTag }),
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

  // Inferno-only (QoL #149): "@all" or "@officers" from the alliance's leader or an officer calls those members (the
  // line counts as a mention for them); anyone else's is an ordinary line
  let ping: "all" | "officers" | undefined;
  if (info.type === ChannelType.Alliance) {
    const m = /(^|\s)@(all|officers)\b/i.exec(messageBody);
    if (m) {
      const rows = (await postgres.em
        .getConnection()
        .execute(`SELECT alliance_role FROM bym."user" WHERE userid = ?`, [client.userId])
        .catch(() => [])) as { alliance_role: string | null }[];
      const r = rows[0]?.alliance_role;
      if (r === "leader" || r === "officer") ping = m[2].toLowerCase() === "all" ? "all" : "officers";
    }
  }

  const outgoing: ServerMessage = {
    type: ServerMessageType.Message,
    channel,
    ...entry,
    userId: client.userId,
    // (speaking: online, unless appearing offline)
    online: !(await isHidden(client.userId)),
    ...(ping && { ping }),
  };

  trace(`delivered (${messageBody.length} characters)`);

  publishToChannel(channel, JSON.stringify(outgoing));

  // Inferno-only quest book (never holds up or fails the line)
  void questChat(client.userId, info.type === ChannelType.Alliance ? "alliance" : "global", messageBody);
};
