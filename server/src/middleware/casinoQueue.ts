import type { Context, Next } from "koa";
import { Status } from "../enums/StatusCodes.js";

/**
 * The Brimstone Pit's requests, one player's at a time (bug reports 63, 64, 67).
 *
 * Magma Drop keeps up to 20 balls in the air, each its own request. Every bet is a transaction that locks
 * the player's seed and Shiny rows, so the other 19 waited inside the database, each holding one of the
 * pool's connections: one player dropping fast could take the whole pool, and every other request on the
 * server (saves, the derby's state, other players' bets) waited behind them, until the proxy gave up after
 * 100 seconds (HTTP 524). Here a player's casino requests wait their turn in memory instead, and only one
 * of them uses a connection at a time. A player with more than MAX_WAITING waiting is told to slow down.
 */
const MAX_WAITING = 40;
const queues = new Map<number, { tail: Promise<void>; waiting: number }>();

export const casinoOneAtATime = async (ctx: Context, next: Next) => {
  const userid: number | undefined = ctx.authUser?.userid;
  if (!userid) return next();
  let q = queues.get(userid);
  if (!q) {
    q = { tail: Promise.resolve(), waiting: 0 };
    queues.set(userid, q);
  }
  if (q.waiting >= MAX_WAITING) {
    ctx.status = Status.OK;
    ctx.body = { error: "Easy there: too many bets at once. Wait a moment." };
    return;
  }
  q.waiting++;
  const entry = q;
  let release!: () => void;
  const mine = new Promise<void>((resolve) => (release = resolve));
  const before = entry.tail;
  entry.tail = before.then(() => mine);
  try {
    await before;
    await next();
  } finally {
    release();
    entry.waiting--;
    if (entry.waiting === 0 && queues.get(userid) === entry) queues.delete(userid);
  }
};

/** (tests) how many players have casino requests waiting or running */
export const casinoQueueSize = () => queues.size;
