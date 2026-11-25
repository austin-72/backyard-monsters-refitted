import type { Context, Next } from "koa";
import type { Server } from "node:http";
import { redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (16 October, the user's: "let the client know when the server is restarting so it holds off for 60
 * seconds"). A restart (PM2 or Docker stopping the server, a deploy) left the games sending saves, polls and map
 * requests into a server that wasn't there: they failed with Cloudflare's 520 / 525 or no answer at all, the game
 * said so, and the failures came in as bug reports (#92-#95).
 *
 * Now, told to stop (SIGTERM, SIGINT), the server says so first: for GRACE_MS it goes on answering, every answer
 * carrying `X-Io-Restart: <seconds>` (the games ask for something every few seconds: chat's polls), then it stops.
 * A game that hears it holds its requests (client IoServerHold) until the new server answers, at most HOLD_S, and
 * sends them then; what fails while it holds is not reported.
 *
 * An admin can say it ahead of a restart too (`bun run restart:announce [seconds]`: Redis, read here
 * every 2 s), and the new server forgets it when it starts.
 */
export const HOLD_S = 60;

/** How long the stopping server goes on answering, so the games hear it (PM2's kill_timeout is above this). */
const GRACE_MS = Math.max(0, Number(process.env.IO_RESTART_GRACE_MS ?? 4000));

const KEY = "io:restart:until";

/** Until when (epoch ms) this server says it is restarting (0: it isn't). */
let until = 0;

/** The announced restart read from Redis (epoch ms), and when it was read. */
let announced = 0;
let announcedAt = 0;

/** Redis asked, not waited on past a moment (a restart while Redis is away still said by this server). */
const quick = <T>(p: Promise<T>, ms = 400): Promise<T | null> =>
  Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);

const readAnnounced = async (): Promise<number> => {
  const now = Date.now();
  if (now - announcedAt < 2000) return announced;
  announcedAt = now;
  try {
    announced = Number(await quick(redis.get(KEY))) || 0;
  } catch {
    announced = 0;
  }
  return announced;
};

/** Seconds left of the restart this server says is coming (0: none). */
export const restartSecondsLeft = async (): Promise<number> => {
  const end = Math.max(until, await readAnnounced());
  const left = Math.ceil((end - Date.now()) / 1000);
  return left > 0 ? left : 0;
};

/** The restart said from now on, for `seconds`. */
export const beginRestartNotice = async (seconds = HOLD_S): Promise<void> => {
  until = Date.now() + seconds * 1000;
  try {
    await quick(redis.send("SET", [KEY, String(until), "EX", String(seconds + 15)]));
  } catch {
    // (said by this server alone)
  }
};

/** A new server: a restart said before it started is over. */
export const clearRestartNotice = async (): Promise<void> => {
  until = 0;
  announced = 0;
  try {
    await quick(redis.send("DEL", [KEY]));
  } catch {
    // (nothing to clear)
  }
};

/** Every answer says when a restart is coming: `X-Io-Restart: <seconds>` (and the game may read it: CORS). */
export const restartNoticeHeader = async (ctx: Context, next: Next) => {
  const say = async () => {
    const left = await restartSecondsLeft();
    if (left > 0) {
      ctx.set("X-Io-Restart", String(left));
      // (added to what the answer exposes already: the map's ETag)
      const had = String(ctx.response.get("Access-Control-Expose-Headers") || "");
      if (!/x-io-restart/i.test(had)) ctx.set("Access-Control-Expose-Headers", had ? `${had}, X-Io-Restart` : "X-Io-Restart");
    }
  };
  await say();
  try {
    await next();
  } finally {
    // (an error answer's headers are made again: said on it too)
    await say();
  }
};

let stopping = false;

/** (18 October) The longest a stop waits for the requests under way. */
const CLOSE_WAIT_MS = 10_000;

/**
 * Told to stop: the restart said (every answer, GRACE_MS), then the server closed and the process ended. Once only;
 * a second signal ends it at once.
 */
export const installRestartNotice = (httpServer: Server): void => {
  const stop = (signal: string) => {
    if (stopping) process.exit(0);
    stopping = true;
    logger.info(`${signal}: telling the games the server restarts (${GRACE_MS} ms), then stopping`);
    void beginRestartNotice(HOLD_S).finally(() => {
      setTimeout(() => {
        // (18 October, SUSPECTED-BUGS.md: the process ended in the same moment the server closed, so a request whose
        // write was done lost its answer, and the game sent it again) no new connections, the requests under way
        // answered, then the end (at most CLOSE_WAIT_MS later)
        const done = () => process.exit(0);
        try {
          httpServer.close(() => done());
          (httpServer as unknown as { closeIdleConnections?: () => void }).closeIdleConnections?.();
        } catch {
          done();
        }
        setTimeout(done, CLOSE_WAIT_MS).unref?.();
      }, GRACE_MS).unref?.();
    });
  };
  process.once("SIGTERM", () => stop("SIGTERM"));
  process.once("SIGINT", () => stop("SIGINT"));
};
