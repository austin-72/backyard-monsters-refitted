import type { Context, Next } from "koa";
import { postgres, redis } from "../../server.js";
import { slowNotes } from "../../middleware/slowRequests.js";

/**
 * Inferno-only (QoL #269): the admin panel's Health tab. What the server looks like now: the database's
 * connections, Redis's memory, the requests found slow in the last hour (middleware/slowRequests.ts keeps those),
 * and the server's failures (HTTP 5xx) per hour.
 *
 * The 5xx are counted here, in memory, by `countServerErrors` (a middleware outside ErrorInterceptor, so it sees
 * the status a failure was answered with). They start again from 0 when the server restarts; the panel says since
 * when. The failures themselves, with their stack, are in the Bugs tab (`Server 500 on ...`).
 */

const HOUR_MS = 3_600_000;
/** Hours of counts kept (and shown). */
const KEEP_HOURS = 48;

const startedAt = Date.now();
/** hour start (ms) -> [requests, 5xx answers] */
const hours = new Map<number, [number, number]>();

const count = (status: number) => {
  const hour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  let row = hours.get(hour);
  if (!row) {
    row = [0, 0];
    hours.set(hour, row);
    for (const h of hours.keys()) if (h < hour - KEEP_HOURS * HOUR_MS) hours.delete(h);
  }
  row[0]++;
  if (status >= 500) row[1]++;
};

/** (QoL #269) Every request counted, and its answer when it is a 5xx. Never changes the answer. */
export const countServerErrors = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (e) {
    count(500);
    throw e;
  }
  count(ctx.status);
};

/** The last `n` hours, oldest first: {hour: epoch ms, requests, errors}. */
export const errorsPerHour = (n = 24) => {
  const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const out: { hour: number; requests: number; errors: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const hour = now - i * HOUR_MS;
    const row = hours.get(hour) ?? [0, 0];
    out.push({ hour, requests: row[0], errors: row[1] });
  }
  return out;
};

type PgPool = { totalCount: number; idleCount: number; waitingCount: number; options?: { max?: number } };

/** The database pool now (as middleware/slowRequests.ts reads it), or null when it can't be read. */
const dbPool = async () => {
  try {
    const p = (await postgres.em.getConnection().getNativeClient()) as unknown as PgPool;
    if (typeof p?.totalCount !== "number") return null;
    return { inUse: p.totalCount - p.idleCount, idle: p.idleCount, waiting: p.waitingCount, open: p.totalCount, max: p.options?.max ?? null };
  } catch {
    return null;
  }
};

/** Redis's INFO memory (and the key count), the numbers only. */
const redisMemory = async () => {
  try {
    const raw = String((await redis.send("INFO", ["memory"])) ?? "");
    const info: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const at = line.indexOf(":");
      if (at > 0 && !line.startsWith("#")) info[line.slice(0, at)] = line.slice(at + 1).trim();
    }
    const keys = Number(await redis.send("DBSIZE", []).catch(() => NaN));
    return {
      used: Number(info.used_memory) || 0,
      usedHuman: info.used_memory_human ?? "",
      peakHuman: info.used_memory_peak_human ?? "",
      max: Number(info.maxmemory) || 0,
      maxHuman: info.maxmemory_human ?? "",
      policy: info.maxmemory_policy ?? "",
      fragmentation: Number(info.mem_fragmentation_ratio) || null,
      keys: Number.isFinite(keys) ? keys : null,
    };
  } catch {
    return null;
  }
};

/**
 * Everything the Health tab shows. The slow requests are the server's own notes, without the database's query
 * texts (they can hold the values a request sent) and without e-mails: what, of whom (player id), how long, how it
 * ended, and the server's state at that moment (connections, the Pit's queue, the clock's lag).
 */
export const serverHealth = async () => {
  const since = Date.now() - HOUR_MS;
  const slow = slowNotes()
    .filter((n) => n.at >= since)
    .reverse()
    .slice(0, 100)
    .map((n) => ({
      at: n.at,
      method: n.method,
      path: n.path,
      userid: n.userid,
      waited: n.waited,
      ended: n.ended ? { ms: n.ended.ms, status: n.ended.status, failed: !!n.ended.error } : null,
      server: n.server,
    }));
  const mem = process.memoryUsage();
  return {
    now: Date.now(),
    startedAt,
    uptime: Math.floor(process.uptime()),
    memory: { rss: mem.rss, heapUsed: mem.heapUsed },
    db: await dbPool(),
    redis: await redisMemory(),
    slow,
    perHour: errorsPerHour(24),
  };
};
