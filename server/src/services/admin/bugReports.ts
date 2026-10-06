import { createHash, randomBytes } from "crypto";

import { BugReport } from "../../database/models/bugreport.model.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only automatic bug reports. The game client sends every error it hits (uncaught errors and
 * the errors it logs itself; client: com/monsters/debug/IoBugReport.as). Identical problems are grouped
 * into one row by a fingerprint of the error with the numbers taken out, so the admin panel's Bugs tab
 * shows each problem once, with how often it happened and to how many players.
 */

const MAX_USERS_KEPT = 200;

/**
 * Reports that are expected answers, not bugs. Newer clients don't send them (IoBugReport.as); this also
 * drops them from clients built before that.
 *  - the notice that a newer client was published (GLOBAL.ioCheckBuild)
 *  - 502/503/504: the server or its proxy restarting during a deploy
 *  - "Load Error" lines that name a 4xx answer (wrong password, a login used elsewhere, ...), and the
 *    save answer the game logs after one
 *  - /init answering 500 from clients before 26 September: that is the server telling an outdated client
 *    to update (versionMismatch), and a real failure of /init is reported by the server itself
 */
const NOISE = [
  /^HALT:? A new version of the game has been published/,
  /^URLLoaderApi HTTP status 500 Internal Server Error \/init$/,
  /^URLLoader Load Error \(HTTP 500\) \S*\/init$/,
  /^URLLoaderApi HTTP status 50[234]\b/,
  /^URLLoader Load Error \(HTTP (4\d\d|50[234])\)/,
  // the whole save answer the game logs after a 4xx (test mode switched off elsewhere, a yard reset)
  /^Base\.(Save|Page): \{.*"status":4\d\d\b/,
];

export const isNoise = (message: string) => {
  const text = message.replace(/^\[v[^\]]*\]\s*/, "");
  return NOISE.some((pattern) => pattern.test(text));
};

/** Strips the parts of a message that change from one occurrence to the next. */
export const normalise = (message: string) =>
  message
    .replace(/^\[v[^\]]*\]\s*/, "") // client version prefix
    .replace(/\bhttps?:\/\/[^/\s]+/gi, "") // server address: the same bug via either of the site's addresses
    .replace(/\s*\[mode:[^\]]*\]\s*$/, "") // mode / base id suffix
    .replace(/\s*\|\s*seen \d+ times/g, "")
    .replace(/\b[0-9a-f]{8,}\b/gi, "#") // ids, hashes
    .replace(/(?<![#\d])\d+/g, "#") // numbers, but not Flash error codes like #1009
    .replace(/\s+/g, " ")
    .trim();

/** The first line of the error plus the first stack frame: the same bug from anywhere groups together. */
export const fingerprintOf = (message: string) => {
  const clean = normalise(message);
  const firstLine = clean.split(/\s\|\s|\n/)[0];
  const frame = clean.match(/at [^\s(]+\(\)/)?.[0] ?? "";
  return createHash("sha1").update(firstLine + "|" + frame).digest("hex");
};

/**
 * Which program sent a report, from its User-Agent: the Flash Player projector, or a browser (the game's
 * browser client reports a made-up Flash version, so the browser itself is what tells you anything).
 */
export const clientOf = (userAgent: string | undefined, playerVersion = "") => {
  const ua = String(userAgent ?? "").slice(0, 300);
  if (!ua || /Shockwave Flash|Adobe Flash|AdobeAIR/i.test(ua)) return `Flash Player${playerVersion ? ` ${playerVersion}` : ""}`;
  return `browser: ${ua}`;
};

/** "IoTester (#1)", for the report's first lines. */
export const accountOf = (user?: { userid?: number; username?: string } | null) =>
  user?.userid ? `${user.username ?? "?"} (#${user.userid})` : "not logged in";

/**
 * A server failure's reference: the server's report of a 500 gets one, the answer carries it to the game,
 * and the game's report of the same failure (with what the player was doing) is added to that report
 * instead of making a second one (attachGameReport).
 */
const REF_TTL = 60 * 60;
export const newBugRef = () => randomBytes(4).toString("hex");
export const rememberBugRef = (ref: string, bugId: number) => redis.setex(`bugref:${ref}`, REF_TTL, String(bugId)).catch(() => {});

/** The game's report of a failure the server reported already (same ref): its context is added there. */
export const attachGameReport = async (ref: string, context: string): Promise<boolean> => {
  const id = Number(await redis.get(`bugref:${ref}`).catch(() => null));
  if (!id) return false;
  const em = postgres.em.fork();
  const bug = await em.findOne(BugReport, { id });
  if (!bug) return false;
  const serverPart = (bug.context ?? "").split("\n\nIn the game:\n")[0];
  bug.context = `${serverPart}\n\nIn the game:\n${context}`.slice(0, 8000);
  await em.flush();
  await redis.del(`bugref:${ref}`).catch(() => {});
  return true;
};

export const recordBug = async (input: { message: string; context: string; build: string; userid?: number }): Promise<number | undefined> => {
  const message = input.message.slice(0, 4000);
  if (isNoise(message)) return undefined;
  const fingerprint = fingerprintOf(message);
  const title = normalise(message).split(/\s\|\s|\n/)[0].slice(0, 500) || "(no message)";
  const em = postgres.em.fork();

  const existing = await em.findOne(BugReport, { fingerprint });
  if (existing) {
    const users = existing.users ?? [];
    if (input.userid && !users.includes(input.userid)) {
      existing.user_count += 1;
      if (users.length < MAX_USERS_KEPT) existing.users = [...users, input.userid];
    }
    existing.count += 1;
    existing.details = message;
    existing.context = input.context.slice(0, 8000);
    existing.last_build = input.build.slice(0, 32);
    existing.last_seen = new Date();
    if (existing.status === "fixed") {
      existing.status = "open"; // came back after being marked fixed
      logger.warn(`Bug #${existing.id} reported again after being marked fixed: ${title}`);
    }
    await em.flush();
    return existing.id;
  }

  const created = em.create(BugReport, {
    fingerprint,
    title,
    details: message,
    context: input.context.slice(0, 8000),
    users: input.userid ? [input.userid] : [],
    user_count: input.userid ? 1 : 0,
    last_build: input.build.slice(0, 32),
  });
  em.persist(created);
  try {
    await em.flush();
    logger.warn(`New bug reported by the game: ${title}`);
    return created.id;
  } catch {
    // Another report of the same new bug got in first: count this one on its row instead.
    return recordBug(input);
  }
};
