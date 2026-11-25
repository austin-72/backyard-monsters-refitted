import { ChatBroadcastType } from "../../enums/Chat.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { broadcastGlobal } from "../../chat/chatBroadcasts.js";
import { redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import {
  BLOOM_RATE_MAX,
  BLOOM_RATE_MIN,
  type BloomOverride,
  WART_BLOOM,
  bloomEndText,
  bloomRate,
  bloomStartText,
  bloomWindows,
  effectiveBloomWindows,
  getBloomOverride,
  setBloomOverride,
} from "./wartBloomTimes.js";

/**
 * Inferno-only: the Wart Bloom. Every weekend, from Friday 6 pm until Sunday midnight (US Central time,
 * daylight saving included), warts grow 3 times as fast in players' main yards (never in outposts).
 *
 * The game grows warts itself (MUSHROOMS.ts): one per 17,280 seconds since the last, at most 10 in a yard.
 * It is sent the bloom windows (the flag io_wartbloom, with every load and poll: playerFlags.ts) and counts
 * each second inside one 3 times, offline time too. The server only says when, and announces the start and
 * the end in Global chat (once each: Redis remembers which were announced).
 *
 * (QoL #399, 16 October) The admin panel's switch (Redis admin:wartbloom, read every 15 seconds and at once when
 * the panel changes it): this weekend's bloom skipped (the rest of it, when it is on), a bloom now for some hours,
 * and another rate. The game takes all of it from the flag; with nothing set, the flag is as before.
 */

/** Announces a bloom's start (while it is on) and its end (within an hour of it), each once. */
export const checkWartBloom = async (nowMs = Date.now()) => {
  const now = Math.floor(nowMs / 1000);
  // (QoL #399: the blooms as the game is sent them: a skipped weekend isn't announced, a bloom added is)
  const windows = effectiveBloomWindows(nowMs);
  for (const [start, end] of windows) {
    if (start <= now && now < end) {
      const key = `wartbloom:start:${start}`;
      if (!(await redis.get(key))) {
        await redis.setex(key, 14 * 86400, "1");
        await broadcastGlobal(ChatBroadcastType.EVENT, bloomStartText(end - now, bloomRate()));
        logger.info("Wart Bloom: started (announced in Global chat)");
      }
    } else if (end <= now && now < end + 3600) {
      const key = `wartbloom:end:${end}`;
      if (!(await redis.get(key))) {
        await redis.setex(key, 14 * 86400, "1");
        const next = windows.find(([s]) => s > now);
        await broadcastGlobal(ChatBroadcastType.EVENT, bloomEndText(next ? next[0] - now : 7 * 86400 - 54 * 3600));
        logger.info("Wart Bloom: ended (announced in Global chat)");
      }
    }
  }
};

// ---------------------------------------------------------------------------------------------
// (QoL #399) The admin panel's switch
// ---------------------------------------------------------------------------------------------

const OVERRIDE_KEY = "admin:wartbloom";

/** Reads the override from Redis into the flag (a failed read keeps the last one known). */
export const refreshWartBloomOverride = async () => {
  try {
    const raw = await redis.get(OVERRIDE_KEY);
    setBloomOverride(raw ? (JSON.parse(raw) as BloomOverride) : null);
  } catch {
    // (kept as it was)
  }
  return getBloomOverride();
};

const writeOverride = async (o: BloomOverride) => {
  const now = Math.floor(Date.now() / 1000);
  // what no longer matters goes: skips of weekends over, blooms added that ended over 8 days ago
  const weekends = bloomWindows();
  const clean: BloomOverride = {
    rate: o.rate ?? null,
    skip: (o.skip ?? []).filter((s) => weekends.some(([start, end]) => start === s.start && end > now - 8 * 86400)),
    extra: (o.extra ?? []).filter((x) => x[1] > now - 8 * 86400 && x[1] > x[0]),
  };
  if (clean.rate == null && !clean.skip!.length && !clean.extra!.length) await redis.del(OVERRIDE_KEY);
  else await redis.set(OVERRIDE_KEY, JSON.stringify(clean));
  await refreshWartBloomOverride();
};

/** The weekend bloom on now, or else the next one: [start, end]. */
const thisWeekend = (now: number) => bloomWindows().find(([, end]) => end > now) ?? null;

/** For the panel: the bloom on now and the next, as the game is sent them, the weekend's own, and the override. */
export const wartBloomAdminState = async () => {
  const o = await refreshWartBloomOverride();
  const now = Math.floor(Date.now() / 1000);
  const windows = effectiveBloomWindows();
  const weekend = thisWeekend(now);
  const skipped = weekend ? (o?.skip ?? []).find((s) => s.start === weekend[0]) ?? null : null;
  return {
    enabled: infernoOnlyConfig.enabled,
    now,
    rate: bloomRate(),
    usualRate: WART_BLOOM.rate,
    rates: [BLOOM_RATE_MIN, BLOOM_RATE_MAX],
    on: windows.find(([s, e]) => s <= now && now < e) ?? null,
    next: windows.find(([s]) => s > now) ?? null,
    weekend,
    weekendSkipped: skipped ? { at: skipped.at } : null,
    extra: (o?.extra ?? []).filter((x) => x[1] > now),
    override: o,
  };
};

export class WartBloomError extends Error {}

/**
 * The panel's buttons:
 *  - skip: this weekend's bloom (the one on now: the rest of it; else the next one) is left out;
 *  - unskip: it is back;
 *  - now: a bloom from now for `hours` (1 to 72; one added before and still on ends now);
 *  - end: a bloom added that is on now ends now (a weekend's: skip it);
 *  - rate: `rate` times as fast (2 to 10), or the usual 3 (rate 0 or none);
 *  - auto: all back to the weekends at the usual rate (a bloom added that is on ends now).
 * Answers a line for the admin log.
 */
export const setWartBloom = async (what: string, hours?: number, rate?: number): Promise<string> => {
  const o: BloomOverride = { ...((await refreshWartBloomOverride()) ?? {}) };
  const now = Math.floor(Date.now() / 1000);
  const fmt = (t: number) => new Date(t * 1000).toISOString().replace(".000Z", "Z");
  const endExtras = () => (o.extra ?? []).map(([s, e]): [number, number] => (s <= now && now < e ? [s, now] : [s, e])).filter(([s, e]) => e > s && !(s > now));
  let line: string;
  switch (what) {
    case "skip": {
      const w = thisWeekend(now);
      if (!w) throw new WartBloomError("No weekend bloom found.");
      if ((o.skip ?? []).some((s) => s.start === w[0])) throw new WartBloomError("This weekend's bloom is skipped already.");
      o.skip = [...(o.skip ?? []), { start: w[0], at: now }];
      line = w[0] <= now ? `this weekend's bloom stopped now (it was on until ${fmt(w[1])})` : `the weekend bloom of ${fmt(w[0])} to ${fmt(w[1])} skipped`;
      break;
    }
    case "unskip": {
      const w = thisWeekend(now);
      if (!w || !(o.skip ?? []).some((s) => s.start === w[0])) throw new WartBloomError("This weekend's bloom isn't skipped.");
      o.skip = (o.skip ?? []).filter((s) => s.start !== w[0]);
      line = `the weekend bloom of ${fmt(w[0])} to ${fmt(w[1])} back`;
      break;
    }
    case "now": {
      const h = Math.trunc(Number(hours));
      if (!Number.isFinite(h) || h < 1 || h > 72) throw new WartBloomError("From 1 to 72 hours.");
      o.extra = [...endExtras(), [now, now + h * 3600]];
      line = `a bloom now for ${h} hour(s), until ${fmt(now + h * 3600)}`;
      break;
    }
    case "end": {
      if (!(o.extra ?? []).some(([s, e]) => s <= now && now < e)) throw new WartBloomError("No bloom added here is on now (to stop a weekend's, skip it).");
      o.extra = endExtras();
      line = "the bloom added here ended now";
      break;
    }
    case "rate": {
      const r = Math.trunc(Number(rate) || 0);
      if (r && (r < BLOOM_RATE_MIN || r > BLOOM_RATE_MAX)) throw new WartBloomError(`A rate from ${BLOOM_RATE_MIN} to ${BLOOM_RATE_MAX} (or 0 for the usual ${WART_BLOOM.rate}).`);
      const before = bloomRate(o);
      o.rate = r || null;
      line = `rate ${before} -> ${bloomRate(o)}`;
      break;
    }
    case "auto": {
      o.rate = null;
      o.skip = (o.skip ?? []).filter((s) => {
        const w = bloomWindows().find(([start]) => start === s.start);
        // (a skipped weekend that is over stays as it was: the game counted it so)
        return w ? w[1] <= now : false;
      });
      o.extra = endExtras();
      line = "back to the weekends at the usual rate";
      break;
    }
    default:
      throw new WartBloomError("skip, unskip, now, end, rate or auto.");
  }
  await writeOverride(o);
  logger.info(`Wart Bloom: ${line} (admin panel)`);
  return line;
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every minute (started with the server, Inferno-only servers only). */
export const startWartBloom = () => {
  if (timer || !infernoOnlyConfig.enabled) return;
  const run = () => checkWartBloom().catch((e) => logger.error(`Wart Bloom: the check failed: ${e}`));
  timer = setInterval(run, 60 * 1000);
  timer.unref?.();
  setTimeout(run, 20 * 1000).unref?.();
  // (QoL #399: the admin panel's switch, read now and every 15 seconds)
  void refreshWartBloomOverride();
  setInterval(() => void refreshWartBloomOverride(), 15 * 1000).unref?.();
};
