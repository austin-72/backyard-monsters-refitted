import { ChatBroadcastType } from "../../enums/Chat.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { broadcastGlobal } from "../../chat/chatBroadcasts.js";
import { redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { bloomWindows } from "./wartBloomTimes.js";

/**
 * Inferno-only: the Wart Bloom. Every weekend, from Friday 6 pm until Sunday midnight (US Central time,
 * daylight saving included), warts grow 3 times as fast in players' main yards (never in outposts).
 *
 * The game grows warts itself (MUSHROOMS.as): one per 17,280 seconds since the last, at most 10 in a yard.
 * It is sent the bloom windows (the flag io_wartbloom, with every load and poll: playerFlags.ts) and counts
 * each second inside one 3 times, offline time too. The server only says when, and announces the start and
 * the end in Global chat (once each: Redis remembers which were announced).
 */
export const BLOOM_START_TEXT = "Wart Bloom! Until Sunday midnight (Central time), warts grow 3 times as fast in your main yard.";
export const BLOOM_END_TEXT = "The Wart Bloom is over: warts grow at their usual pace again. The next one starts Friday at 6 pm Central.";

/** Announces a bloom's start (while it is on) and its end (within an hour of it), each once. */
export const checkWartBloom = async (nowMs = Date.now()) => {
  const now = Math.floor(nowMs / 1000);
  for (const [start, end] of bloomWindows(nowMs)) {
    if (start <= now && now < end) {
      const key = `wartbloom:start:${start}`;
      if (!(await redis.get(key))) {
        await redis.setex(key, 14 * 86400, "1");
        await broadcastGlobal(ChatBroadcastType.EVENT, BLOOM_START_TEXT);
        logger.info("Wart Bloom: started (announced in Global chat)");
      }
    } else if (end <= now && now < end + 3600) {
      const key = `wartbloom:end:${end}`;
      if (!(await redis.get(key))) {
        await redis.setex(key, 14 * 86400, "1");
        await broadcastGlobal(ChatBroadcastType.EVENT, BLOOM_END_TEXT);
        logger.info("Wart Bloom: ended (announced in Global chat)");
      }
    }
  }
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every minute (started with the server, Inferno-only servers only). */
export const startWartBloom = () => {
  if (timer || !infernoOnlyConfig.enabled) return;
  const run = () => checkWartBloom().catch((e) => logger.error(`Wart Bloom: the check failed: ${e}`));
  timer = setInterval(run, 60 * 1000);
  timer.unref?.();
  setTimeout(run, 20 * 1000).unref?.();
};
