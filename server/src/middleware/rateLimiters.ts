import { hasChatSession } from "../chat/chatHttpBridge.js";
import { RateLimit } from "koa2-ratelimit";
import { Env } from "../enums/Env.js";
import { Status } from "../enums/StatusCodes.js";
import type { Context } from "koa";

/**
 * Keys a limiter by account, falling back to IP only for unauthenticated routes.
 *
 * The limiter's prefix is part of the key because koa2-ratelimit keeps every
 * limiter's counters in one shared store and uses a custom keyGenerator's result as
 * the key verbatim; it only adds prefixKey in its default generator. Without the
 * prefix, every limiter keyed by user counts into the same bucket, so browsing the
 * map could rate limit an alliance join request or a username change.
 *
 * @param {string} prefixKey - The limiter's prefixKey, which scopes its counters.
 * @returns {(ctx: Context) => Promise<string>} The key generator for that limiter.
 */
const byUser = (prefixKey: string) => async (ctx: Context) => `${prefixKey}|${ctx.authUser?.userid ?? ctx.ip}`;

/**
 * Inferno-only (QoL #533): every limiter's refusal says how long to wait, the same way: a Retry-After header (seconds)
 * and, in a JSON answer, `wait` (seconds) and `limited: true`, so the game can wait and ask again (URLLoaderApi
 * asks a read again once by itself). The wait is until the limiter's window ends (koa2-ratelimit puts its end in
 * ctx.state.rateLimit.reset, seconds since 1970, before it calls the handler).
 *
 * @param {Context} ctx - The refused request.
 * @param {number} status - The status to answer with (429, or 200 where the game shows the message).
 * @param {unknown} body - The answer: an object gets `wait` and `limited`; a text stays as it is.
 */
const refuse = (ctx: Context, status: number, body: unknown) => {
  const reset = Number((ctx.state as { rateLimit?: { reset?: number } } | undefined)?.rateLimit?.reset) || 0;
  const wait = Math.max(1, reset > 0 ? Math.ceil(reset - Date.now() / 1000) : 60);
  ctx.set("Retry-After", String(wait));
  ctx.status = status;
  ctx.body = body && typeof body === "object" ? { ...(body as Record<string, unknown>), wait, limited: true } : body;
};

/**
 * Rate limit for MR2 getarea - 240 requests per minute per user (QoL #537: was 120, which a fast pan across the
 * world map reached; the game asks again a little later when refused).
 */
export const getAreaLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 240,
  prefixKey: "getarea",
  keyGenerator: byUser("getarea"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many area requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the unauthenticated public read routes (worlds, leaderboards).
 * Both are Redis cached, so this bounds cache misses rather than the cached
 * path. Keyed by IP because there is no account to key on.
 */
export const publicReadLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 30,
  prefixKey: "public-read",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many requests. Please try again shortly." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Inferno-only (QoL #536): Who's Online, 30 a minute per player. It shared the public-read limit per IP with replay
 * downloads, so a household or a school went stale together.
 */
export const whosOnlineLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 30,
  prefixKey: "whosonline",
  keyGenerator: byUser("whosonline"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many requests. Please try again shortly." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only (QoL #542): alliance board pins, 10 a minute per player (it was per IP address). */
export const allianceBoardLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 10,
  prefixKey: "alliance-board",
  keyGenerator: byUser("alliance-board"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many pins at once. Please try again in a minute." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only (QoL #540): the D.A.V.E. Club's choices, their own 60 a minute per player (they shared Pets' limit). */
export const daveLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 60,
  prefixKey: "dave",
  keyGenerator: byUser("dave"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many changes at once. Please try again in a moment." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for client debug logging - 120 requests per minute per IP.
 */
export const debugDataLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 120,
  prefixKey: "debug-data",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many debug log requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the MR2 terrain blob - 10 requests per minute per API consumer.
 *
 * Sized so one caller can bootstrap or revalidate every MR2 world inside a
 * single window; 304s pass through the limiter too.
 */
export const terrainLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 10,
  prefixKey: "terrain",
  keyGenerator: async (ctx: Context) => `terrain|${ctx.state.apiConsumer ?? ctx.ip}`,
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many terrain requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the MR2 occupancy snapshot - 10 requests per minute per API consumer.
 *
 * The payload is rebuilt at most once a minute, so anything above that rate is
 * served from cache or answered with a 304.
 */
/**
 * Rate limit for the game's map snapshot (/worldmapv2/mapdata): the game asks about once a minute while
 * the map room is open.
 */
export const mapDataLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 20,
  prefixKey: "mapdata",
  keyGenerator: byUser("mapdata"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many map requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only: the game's attack logs (/attacklogs/game): the list, and a report when one is opened. */
export const attackLogsLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 40,
  prefixKey: "attacklogs",
  keyGenerator: byUser("attacklogs"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only: attack replays (replays/*): a recording's parts, watching, downloading: 90 a minute per player. */
export const replaysLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 90,
  prefixKey: "replays",
  keyGenerator: byUser("replays"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/**
 * (18 October) Inferno-only: attackwatch/status, the game's look for attacks on the player's yards (every 5 s), and
 * live/list, the Watch menu's (every few seconds while it is open, or watching all): 90 a minute per player.
 */
export const attackWatchLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 90,
  prefixKey: "attackwatch",
  keyGenerator: byUser("attackwatch"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." });
  },
});

/** (18 October) Inferno-only: the Watch menu's pictures (live/frame, live/view): 6 a second per player at most. */
export const liveFramesLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 360,
  prefixKey: "liveframes",
  keyGenerator: byUser("liveframes"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." });
  },
});

/** Inferno-only: the Pets tab (pets/*): 60 requests a minute per player. */
export const petsLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 60,
  prefixKey: "pets",
  keyGenerator: byUser("pets"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only: the Soul Crucible (crucible/*): 60 requests a minute per player. */
export const crucibleLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 60,
  prefixKey: "crucible",
  keyGenerator: byUser("crucible"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." });
  },
});

/**
 * Inferno-only (25 November): the game's right-click menu (feedback, feedback/mine): 20 requests a minute per player
 * (the reports themselves have their own limits: services/feedback/playerFeedback.ts).
 */
export const feedbackLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 20,
  prefixKey: "feedback",
  keyGenerator: byUser("feedback"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." });
  },
});

/** Inferno-only (13 November): the Devil's Contract (devil/*): 30 requests a minute per player. */
export const devilLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 30,
  prefixKey: "devil",
  keyGenerator: byUser("devil"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." });
  },
});

export const snapshotLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 10,
  prefixKey: "snapshot",
  keyGenerator: async (ctx: Context) => `snapshot|${ctx.state.apiConsumer ?? ctx.ip}`,
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many snapshot requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the MR2 alliance snapshot - 10 requests per minute per API consumer.
 */
export const alliancesLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 10,
  prefixKey: "alliances",
  keyGenerator: async (ctx: Context) => `alliances|${ctx.state.apiConsumer ?? ctx.ip}`,
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many alliance requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for MR3 getcells - 60 requests per minute per user.
 */
export const getCellsLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 60,
  prefixKey: "getcells",
  keyGenerator: byUser("getcells"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many cell requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the alliance browse/search - 30 requests per minute per user.
 */
export const searchAlliancesLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 30,
  prefixKey: "searchalliances",
  keyGenerator: byUser("searchalliances"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many alliance searches. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for a leader inviting players - 20 per minute per user.
 */
export const allianceInviteLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 20,
  prefixKey: "alliance-invite",
  keyGenerator: byUser("alliance-invite"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many alliance invites. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for a player asking to join an alliance - 10 per minute per user.
 */
export const allianceJoinRequestLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 10,
  prefixKey: "alliance-join-request",
  keyGenerator: byUser("alliance-join-request"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many join requests. Please slow down." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Chat polling: a client polls about every 2.5 seconds (24 a minute). Generous headroom for the
 * extra poll after each sent line and for several players behind one address.
 */
/**
 * Chat polling (the HTTP fallback for games whose WebSocket is blocked): a game polls about 25 times a minute, more
 * while lines are sent. Counted per chat session (its sid), so many players behind one address (a school, a shared
 * connection; bug report 87: 600 a minute for the whole address was used up and their chat stopped) are not limited
 * by each other; the address keeps a cap of its own, five times higher, against a flood of new sessions.
 */
export const chatPollLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 240,
  prefixKey: "chatpoll",
  keyGenerator: async (ctx: Context) => {
    const sid = (ctx.request.body as Record<string, unknown> | undefined)?.sid;
    // (18 October, SUSPECTED-BUGS.md: any made-up sid was a bucket of its own) a session's sid only when it exists
    return `chatpoll|${typeof sid === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(sid) && hasChatSession(sid) ? "s:" + sid : "ip:" + ctx.ip}`;
  },
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: 1, message: "Too many chat requests." }); // (QoL #533: with how long to wait)
  },
});

export const chatPollAddressLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 3000,
  prefixKey: "chatpollip",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: 1, message: "Too many chat requests." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for user registration tries: 30 an hour in prod (a minute in dev), only against hammering. The
 * accounts actually made are limited in the register controller (5 an hour from one address): this counted every
 * try, a name already taken included, so a new player who tried three taken names, or a household or school
 * sharing an address, couldn't sign up for an hour (QoL #508, 14 October).
 */
export const registerLimiter = RateLimit.middleware({
  interval: { min: process.env.ENV === Env.PROD ? 60 : 1 },
  max: 30,
  prefixKey: "register",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, {
      error: "Too many sign-up tries from this connection. Please wait a few minutes and try again.",
    }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for username changes - 5 requests per hour per user.
 */
export const changeUsernameLimiter = RateLimit.middleware({
  interval: { min: 60 },
  max: 5,
  prefixKey: "changeusername",
  keyGenerator: byUser("changeusername"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, {
      error: "Too many username change attempts. Please try again later.",
    }); // (QoL #533: with how long to wait)
  },
});

/**
 * Inferno-only (QoL #198): password changes while logged in - 5 an hour per player (a wrong current password counts).
 */
export const changePasswordLimiter = RateLimit.middleware({
  interval: { min: 60 },
  max: 5,
  prefixKey: "changepassword",
  keyGenerator: byUser("changepassword"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, {
      error: "Too many password change attempts. Please try again in an hour.",
    }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for login - 30 requests per 5 minutes in prod, 30 per minute in dev.
 */
export const loginLimiter = RateLimit.middleware({
  interval: { min: process.env.ENV === Env.PROD ? 5 : 1 },
  max: 30,
  prefixKey: "login",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many login attempts. Please try again later." }); // (QoL #533: with how long to wait)
  },
});

/**
 * The admin panel (controllers/admin/adminApi.ts): sign-in links 20 a minute and API calls 300 a
 * minute per IP. Codes and sessions can't be guessed anyway; this keeps anyone from trying.
 */
export const adminSignInLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 20,
  prefixKey: "admin-signin",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, "Too many sign-in attempts. Wait a minute and press the Admin button in the game again."); // (QoL #533: with how long to wait)
  },
});

export const adminApiLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 300,
  prefixKey: "admin-api",
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { error: "Too many requests. Wait a minute." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Rate limit for the Brimstone Pit (casino/*): 720 requests a minute per player, about 12 a second.
 * Answered with status 200 and a message the game shows (it treats other statuses as a lost connection).
 */
export const casinoLimiter = RateLimit.middleware({
  interval: { min: 1 },
  // (Magma Drop keeps up to 20 Spurtz in the air, each about 2 seconds: 10 a second, 600 a minute, at full tilt)
  max: 720,
  prefixKey: "casino",
  keyGenerator: byUser("casino"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Easy there: too many bets at once. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/**
 * The quest book's reports and collections (POST /quests/event, /quests/claim, 13 October), per player: the game
 * sends events with its saves and a few as things happen; they had no limit.
 */
export const questLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 90,
  prefixKey: "quests",
  keyGenerator: byUser("quests"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/**
 * Hellgate Defense and Hellgate 2 (POST /td, 13 October): runs, embers, perks and their boards, per player. A run
 * asks a few times a minute; the arcade's and the Pit's had limits, this had none.
 */
export const tdLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 120,
  prefixKey: "td",
  keyGenerator: byUser("td"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/** Inferno-only: the Devil's Arcade (scores, leaderboards, tickets for its socket): 120 requests a minute per player. */
export const arcadeLimiter = RateLimit.middleware({
  interval: { min: 1 },
  max: 120,
  prefixKey: "arcade",
  keyGenerator: byUser("arcade"),
  handler: async (ctx: Context) => {
    refuse(ctx, Status.OK, { error: "Too many requests. Wait a moment." }); // (QoL #533: with how long to wait)
  },
});

/** (13 October) "Forgot password": each request sends an email: 5 every 15 minutes per address (there was no limit). */
export const forgotPasswordLimiter = RateLimit.middleware({
  interval: { min: 15 },
  max: 5,
  prefixKey: "forgotpw",
  keyGenerator: async (ctx: Context) => `forgotpw|${ctx.ip}`,
  handler: async (ctx: Context) => {
    refuse(ctx, Status.TOO_MANY_REQUESTS, { message: "Too many password reset requests. Please try again in a few minutes." }); // (QoL #533: with how long to wait)
  },
});
