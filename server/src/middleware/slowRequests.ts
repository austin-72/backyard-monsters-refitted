import type { Context, Next } from "koa";
import { postgres } from "../server.js";
import { logger } from "../utils/logger.js";
import { verifyJwtToken } from "./auth.js";
import { casinoTurns } from "./casinoQueue.js";

/**
 * Inferno-only (9 October, bug reports 84 and 85: "HTTP 524 on /quests/status (125157 ms)", "HTTP 524 on
 * /casino/bonepile/start (125073 ms)"). A request the server had not answered after 100 seconds is answered by
 * the proxy with HTTP 524, and the game's report of it could only say that it took long, not why.
 *
 * Every request the game sends is watched here. One still running after SLOW_MS is written down once, with what
 * the server looked like at that moment: the database's connections (in use, free, and requests waiting for one),
 * the Brimstone Pit's requests (using the database, waiting their turn), how late the server's own clock ran (a
 * busy CPU), and what the database was doing (each connection's query, how long it had run, what it waited on and
 * which connections held it up). When it ends, how long it took in all and how it ended are added. The game's
 * report of a slow or failed request (services/admin/bugReports, controllers/debug/reportBug) gets the server's
 * notes of the same request (`serverNotesFor`) added to it.
 */
const SLOW_MS = 15_000;
const KEEP = 200;

interface Live {
  start: number;
  method: string;
  path: string;
  ctx: Context;
  note?: SlowNote;
}

export interface SlowNote {
  at: number;
  method: string;
  path: string;
  userid: number | null;
  email: string | null;
  waited: number;
  server: string;
  db: string[];
  ended?: { ms: number; status: number; error?: string };
}

let nextId = 1;
const live = new Map<number, Live>();
const notes: SlowNote[] = [];

const who = (ctx: Context): { userid: number | null; email: string | null } => {
  const user = (ctx as { authUser?: { userid?: number; email?: string } }).authUser;
  if (user?.userid) return { userid: user.userid, email: user.email ?? null };
  const auth = ctx.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      return { userid: null, email: verifyJwtToken(auth.slice(7)).user?.email ?? null };
    } catch {
      // (a bad token: nobody)
    }
  }
  return { userid: null, email: null };
};

export const slowRequests = async (ctx: Context, next: Next) => {
  const id = nextId++;
  const entry: Live = { start: Date.now(), method: ctx.method, path: ctx.path, ctx };
  live.set(id, entry);
  let error: string | undefined;
  try {
    await next();
  } catch (e) {
    error = String((e as Error)?.message ?? e).slice(0, 200);
    throw e;
  } finally {
    live.delete(id);
    if (entry.note) {
      entry.note.ended = { ms: Date.now() - entry.start, status: error ? 500 : ctx.status, ...(error ? { error } : {}) };
      // (the user known by now, if it was not when it was written down)
      if (!entry.note.userid) Object.assign(entry.note, who(ctx));
      logger.warn(`Slow request ended: ${entry.method} ${entry.path} after ${entry.note.ended.ms} ms (${error ? `failed: ${error}` : `status ${ctx.status}`})`);
    }
  }
};

// ---- what the server looks like (one look for all the requests found slow at the same time)

let lastTick = Date.now();
let lag = 0;

type PgClient = { connect(): Promise<void>; query(sql: string): Promise<{ rows: Record<string, any>[] }>; end(): Promise<void> };
type PgPool = { totalCount: number; idleCount: number; waitingCount: number; options?: { max?: number }; Client: new (config: object) => PgClient };

const nativePool = async (): Promise<PgPool> => (await postgres.em.getConnection().getNativeClient()) as unknown as PgPool;

const dbActivity = async (): Promise<string[]> => {
  // (a connection of its own, not one of the pool's: when the pool is what everyone waits for, there is none free;
  // the pool's own client class, `pg`'s)
  let client: PgClient;
  try {
    client = new (await nativePool()).Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 3000,
    statement_timeout: 3000,
  });
  } catch (e) {
    return [`(could not look at the database: ${String((e as Error)?.message ?? e).slice(0, 120)})`];
  }
  try {
    await client.connect();
    const r = await client.query(
      `SELECT pid, state, COALESCE(wait_event_type || ':' || wait_event, 'running') AS waiting, pg_blocking_pids(pid) AS blocked_by,
              COALESCE(extract(epoch FROM now() - xact_start)::int, 0) AS xact_s, COALESCE(extract(epoch FROM now() - query_start)::int, 0) AS query_s,
              left(regexp_replace(query, '\\s+', ' ', 'g'), 160) AS query
         FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid() AND state <> 'idle'
        ORDER BY xact_start NULLS LAST LIMIT 25`);
    if (!r.rows.length) return ["(nothing running in the database)"];
    return r.rows.map((x) =>
      `#${x.pid} ${x.state}, ${x.waiting}${x.blocked_by?.length ? `, held up by #${x.blocked_by.join(", #")}` : ""}, in a transaction ${x.xact_s} s, this query ${x.query_s} s: ${x.query}`);
  } catch (e) {
    return [`(could not look at the database: ${String((e as Error)?.message ?? e).slice(0, 120)})`];
  } finally {
    client.end().catch(() => {});
  }
};

const serverNow = async (): Promise<string> => {
  let pool = "?";
  try {
    const p = await nativePool();
    pool = `${p.totalCount - p.idleCount} in use, ${p.idleCount} free, ${p.waitingCount} waiting for one (most ${p.options?.max ?? "?"})`;
  } catch {
    // (no pool)
  }
  const c = casinoTurns();
  return `database connections: ${pool} | Pit: ${c.running} of ${c.atOnce} at once, ${c.waiting} waiting | requests running: ${live.size} | server clock late by ${lag} ms`;
};

const look = async () => {
  const now = Date.now();
  // (the check runs every second: when it runs later than that, the server was too busy to run it)
  lag = Math.max(0, now - lastTick - 1000);
  lastTick = now;
  const slow = [...live.values()].filter((l) => !l.note && now - l.start >= SLOW_MS);
  if (!slow.length) return;
  for (const l of slow) l.note = { at: now, method: l.method, path: l.path, waited: now - l.start, server: "", db: [], ...who(l.ctx) };
  const [server, db] = await Promise.all([serverNow(), dbActivity()]);
  for (const l of slow) {
    const n = l.note!;
    n.server = server;
    n.db = db;
    notes.push(n);
    if (notes.length > KEEP) notes.shift();
    logger.warn(`Slow request: ${n.method} ${n.path} of ${n.userid ? `#${n.userid}` : (n.email ?? "nobody")}, running ${Math.round(n.waited / 1000)} s | ${server}\n  ${db.join("\n  ")}`);
  }
};

let busy = false;
const timer = setInterval(() => {
  if (busy) {
    lastTick = Date.now();
    return;
  }
  busy = true;
  look()
    .catch((e) => logger.warn(`Slow requests: ${e}`))
    .finally(() => (busy = false));
}, 1000);
timer.unref?.();

const fmtTime = (t: number) => new Date(t).toISOString().slice(11, 19);

/**
 * The server's notes of `path` for this player (by id or e-mail) from the last `withinMs`, as lines for a report;
 * and, when there are none, a line saying so (the request then never reached the server, or it restarted).
 */
export const serverNotesFor = (path: string, userid: number | null, email: string | null, withinMs = 10 * 60_000): string => {
  const since = Date.now() - withinMs;
  const mine = notes.filter((n) => n.at >= since && n.path === path && ((userid && n.userid === userid) || (email && n.email === email)));
  const running = [...live.values()].filter((l) => l.path === path && Date.now() - l.start > SLOW_MS && (() => {
    const w = who(l.ctx);
    return (userid && w.userid === userid) || (email && w.email === email);
  })());
  if (!mine.length && !running.length) {
    return `Server side: no request to ${path} of this player ran longer than ${SLOW_MS / 1000} s in the last ${withinMs / 60_000} minutes (it never reached the server or was lost on the way back, or the server restarted).`;
  }
  const lines: string[] = ["Server side:"];
  for (const n of mine.slice(-3)) {
    lines.push(`${fmtTime(n.at)} ${n.method} ${n.path} still running after ${Math.round(n.waited / 1000)} s; ${n.ended ? `ended after ${Math.round(n.ended.ms / 1000)} s, ${n.ended.error ? `failed: ${n.ended.error}` : `status ${n.ended.status}`}` : "not ended yet"}`);
    lines.push(`  ${n.server}`);
    for (const d of n.db.slice(0, 12)) lines.push(`  db ${d}`);
  }
  for (const l of running) if (!mine.some((n) => n === l.note)) lines.push(`${fmtTime(l.start)} ${l.method} ${l.path} still running, ${Math.round((Date.now() - l.start) / 1000)} s so far`);
  return lines.join("\n");
};

/** (tests) the notes kept */
export const slowNotes = () => notes.slice();
