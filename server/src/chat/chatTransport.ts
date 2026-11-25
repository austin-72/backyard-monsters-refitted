import { RedisClient } from "bun";

import { redis } from "../server.js";
import { logger } from "../utils/logger.js";
import { exitOnRedisReconnect } from "../utils/redisReconnectGuard.js";
import { CHAT_CONTROL_CHANNEL } from "./chatControl.js";
import { channelMembers, clients } from "./chatState.js";

let redisSub: RedisClient;
/** The subscriber has connected (once): subscriptions can be made. */
let subReady = false;
/** The subscriptions wanted, made again when the subscriber connects (a channel joined before it had: its subscribe failed). */
const wanted = new Map<string, (message: string) => void>();

/** How long a connection attempt may take before it is given up and tried again. */
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Opens the dedicated Redis subscriber used for cross-process fan-out.
 *
 * A subscriber-mode client can only subscribe and unsubscribe, which is why this
 * is a second connection rather than the shared `redis` client used to publish.
 * Must be called once before any WebSocket connections are accepted.
 *
 * 24 October: a first connection that failed (seen at a server start: no "connected", and every channel's subscribe
 * then "Connection has failed") left the chat silent until the next restart: players saw "Chat had a hiccup". The
 * connection is now tried again (after 1 s, 2 s, ... up to 30 s) until it opens, and the channels joined meanwhile are
 * subscribed when it does. Once connected, a later reconnect still restarts the process (exitOnRedisReconnect).
 *
 * @param {() => void} onReady - Run once the subscriber connects, to register subscriptions.
 */
export const initTransport = (onReady: () => void) => {
  const open = (attempt: number) => {
    const client = new RedisClient(process.env.REDIS_URL);
    redisSub = client;
    let settled = false;
    const retry = (why: string) => {
      if (settled || subReady) return;
      settled = true;
      const wait = Math.min(30_000, 1000 * attempt);
      logger.error(`Chat Redis subscriber could not connect (${why}); trying again in ${wait / 1000} s`);
      try {
        client.close();
      } catch {
        // (already closed)
      }
      setTimeout(() => open(attempt + 1), wait);
    };

    exitOnRedisReconnect(client, "Chat Redis subscriber", () => {
      if (client !== redisSub || subReady) return;
      settled = true;
      logger.info(attempt > 1 ? `Chat Redis subscriber connected (try ${attempt})` : "Chat Redis subscriber connected");
      // (the channels joined while it was connecting first, then the control channel)
      for (const [channel, listener] of wanted) subscribeNow(channel, listener);
      subReady = true;
      onReady();
    });

    client.onclose = (err) => {
      if (subReady) logger.error(`Chat Redis subscriber disconnected: ${err?.message ?? err}`);
      else retry(`closed: ${err?.message ?? err}`);
    };
    const timer = setTimeout(() => retry("no answer"), CONNECT_TIMEOUT_MS);
    client
      .connect()
      .then(() => clearTimeout(timer))
      .catch((err) => {
        clearTimeout(timer);
        retry(String(err?.message ?? err));
      });
  };
  open(1);
};

/**
 * Delivers a raw JSON payload to all locally connected clients in a channel.
 * Runs from the subscription callback, so it handles messages published by any
 * process in the cluster, including this one.
 *
 * @param {string} channel - The channel whose members should receive the payload.
 * @param {string} payload - The serialised JSON message payload.
 */
export const fanOut = (channel: string, payload: string) => {
  const members = channelMembers.get(channel);

  if (!members) return;

  for (const userId of members) {
    const client = clients.get(userId);

    if (!client) continue;

    client.ws.send(payload);
  }
};

const subscribeNow = (channel: string, listener: (message: string) => void) => {
  try {
    redisSub
      .subscribe(channel, listener)
      .catch((err) => logger.error(`Chat subscribe failed for ${channel}: ${err}`));
  } catch (err) {
    logger.error(`Chat subscribe failed for ${channel}: ${err}`);
  }
};

/**
 * Registers a Redis subscription, logging rather than throwing on failure. Kept as wanted, so it is made (again) when
 * the subscriber connects.
 *
 * @param {string} channel - The channel to subscribe to.
 * @param {(message: string) => void} listener - Called with each raw payload.
 */
const subscribe = (channel: string, listener: (message: string) => void) => {
  wanted.set(channel, listener);
  if (subReady) subscribeNow(channel, listener);
};

/**
 * Subscribes to a chat channel so its payloads reach local members.
 *
 * @param {string} channel - The channel to subscribe to.
 */
export const subscribeToChannel = (channel: string) => subscribe(channel, (msg) => fanOut(channel, msg));

/**
 * Subscribes to the control channel the API side publishes membership events on.
 *
 * @param {(message: string) => void} listener - Called with each raw control payload.
 */
export const subscribeControl = (listener: (message: string) => void) =>
  subscribe(CHAT_CONTROL_CHANNEL, listener);

/**
 * Drops a channel's subscription once no local client remains in it. (24 October: an unsubscribe while the
 * subscriber wasn't subscribed to anything threw at once, not through its promise: an uncaught exception in the log.)
 *
 * @param {string} channel - The channel to unsubscribe from.
 */
export const unsubscribeFromChannel = (channel: string) => {
  wanted.delete(channel);
  if (!subReady) return;
  try {
    redisSub
      .unsubscribe(channel)
      .catch((err) => logger.error(`Chat unsubscribe failed for ${channel}: ${err}`));
  } catch (err) {
    logger.error(`Chat unsubscribe failed for ${channel}: ${err}`);
  }
};

/**
 * Publishes a raw JSON string to a Redis channel. Local delivery happens through
 * {@link fanOut} when the subscription receives it back.
 *
 * @param {string} channel - The Redis channel to publish to.
 * @param {string} payload - The serialised JSON message payload.
 */
export const publishToChannel = (channel: string, payload: string) => {
  redis
    .publish(channel, payload)
    .catch((err) => logger.error(`Chat publish error on ${channel}: ${err}`));
};
