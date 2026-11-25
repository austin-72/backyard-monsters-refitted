import { createHash, randomBytes } from "crypto";
import { UniqueConstraintViolationException } from "@mikro-orm/core";

import { BugReport } from "../../database/models/bugreport.model.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { sendAlert } from "./alerts.js";

/**
 * Inferno-only automatic bug reports. The game client sends every error it hits (uncaught errors and
 * the errors it logs itself; client: com/monsters/debug/IoBugReport.ts). Identical problems are grouped
 * into one row by a fingerprint of the error with the numbers taken out, so the admin panel's Bugs tab
 * shows each problem once, with how often it happened and to how many players.
 */

const MAX_USERS_KEPT = 200;

/** Inferno-only (QoL #258): the last few reports of a bug, each with its build and context (Redis, per bug). */
export const SAMPLES_KEPT = 5;
const samplesKey = (id: number) => `bug:samples:${id}`;
/** The browser build published when the bug was marked fixed: reports from older builds don't reopen it. */
export const fixedBuildKey = (id: number) => `bug:fixedbuild:${id}`;

const keepSample = async (id: number, input: { message: string; context: string; build: string; userid?: number }) => {
  const sample = JSON.stringify({ at: new Date().toISOString(), build: input.build.slice(0, 32), userid: input.userid ?? null, details: input.message.slice(0, 2000), context: input.context.slice(0, 3000) });
  await redis.send("LPUSH", [samplesKey(id), sample]).catch(() => 0);
  await redis.send("LTRIM", [samplesKey(id), "0", String(SAMPLES_KEPT - 1)]).catch(() => 0);
};

/** QoL #258: a bug's samples, newest first. */
export const bugSamples = async (id: number): Promise<unknown[]> =>
  (((await redis.send("LRANGE", [samplesKey(id), "0", String(SAMPLES_KEPT - 1)]).catch(() => [])) as string[] | null) ?? []).flatMap((x) => {
    try {
      return [JSON.parse(x)];
    } catch {
      return [];
    }
  });

/** A build stamp as a number (yyyyMMddHHmm), or 0. */
const stampOf = (build: string) => (/^\d{12}$/.test(String(build).trim()) ? Number(String(build).trim()) : 0);

/**
 * Reports that are expected answers, not bugs. Newer clients don't send them (IoBugReport.ts); this also
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

/** (18 October) Text Postgres can't store in a text column (NUL), and other control characters, taken out. */
const storable = (text: unknown) => String(text ?? "").replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");

export const recordBug = async (raw: { message: string; context: string; build: string; userid?: number }, retried = false): Promise<number | undefined> => {
  // (18 October: a NUL in the message made every insert fail, and the retry below ran for ever)
  const input = { ...raw, message: storable(raw.message), context: storable(raw.context), build: storable(raw.build) };
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
      // (QoL #258: not from a game older than the build the fix went out in: that game simply hasn't reloaded)
      const fixedIn = stampOf(String((await redis.get(fixedBuildKey(existing.id)).catch(() => null)) ?? ""));
      const from = stampOf(input.build);
      if (fixedIn && from && from < fixedIn) {
        logger.info(`Bug #${existing.id} (fixed in ${fixedIn}) seen again from the older build ${from}: left fixed`);
      } else {
        existing.status = "open"; // came back after being marked fixed
        logger.warn(`Bug #${existing.id} reported again after being marked fixed: ${title}`);
        sendAlert("bug-back", `bug #${existing.id} is back after being marked fixed: ${title.slice(0, 200)}`);
      }
    }
    await em.flush();
    await keepSample(existing.id, input);
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
    sendAlert("bug-new", `a new bug from the game (#${created.id}): ${title.slice(0, 200)}`);
    await keepSample(created.id, input);
    return created.id;
  } catch (err) {
    // Another report of the same new bug got in first: count this one on its row instead (once: any other failure,
    // or a second one, is given up; it was retried for ever, 18 October)
    em.clear();
    if (retried || !(err instanceof UniqueConstraintViolationException)) {
      logger.warn(`A bug report could not be recorded: ${err}`);
      return undefined;
    }
    return recordBug(input, true);
  }
};

/**
 * Inferno-only (QoL #152, #185): a player reported by another, for a chat line or a letter. Kept with the bug reports
 * (no new table): one row a reported player and kind, its title "Player report (chat): Name (#12)", which the admin
 * panel lists in its Reports tab (not with the bugs). The row counts the reports, its users are the players who
 * reported, `details` and `context` are the latest report (the line or letter, and the lines or letters around it),
 * and its samples the last 5 reports. Dismissed in the panel (the bug status "fixed"), a new report opens it again.
 */
export const PLAYER_REPORT_TITLE = "Player report (";

export const isPlayerReport = (title: string) => String(title ?? "").startsWith(PLAYER_REPORT_TITLE);

export const recordPlayerReport = async (input: {
  kind: "chat" | "mail";
  reporter: { userid: number; username: string };
  target: { userid: number; username: string };
  details: string;
  context: string;
}, retried = false): Promise<number | undefined> => {
  const fingerprint = createHash("sha1").update(`player-report|${input.kind}|${input.target.userid}`).digest("hex");
  const title = `${PLAYER_REPORT_TITLE}${input.kind}): ${input.target.username} (#${input.target.userid})`.slice(0, 500);
  const details = input.details.slice(0, 4000);
  const context = input.context.slice(0, 8000);
  const em = postgres.em.fork();
  const existing = await em.findOne(BugReport, { fingerprint });
  if (existing) {
    const users = existing.users ?? [];
    if (!users.includes(input.reporter.userid)) {
      existing.user_count += 1;
      if (users.length < MAX_USERS_KEPT) existing.users = [...users, input.reporter.userid];
    }
    existing.count += 1;
    existing.title = title;
    existing.details = details;
    existing.context = context;
    existing.last_seen = new Date();
    if (existing.status === "fixed") {
      existing.status = "open";
      existing.fixed_at = null;
    }
    await em.flush();
    await redis.del(fixedBuildKey(existing.id)).catch(() => 0);
    await keepSample(existing.id, { message: details, context, build: "", userid: input.reporter.userid });
    logger.info(`Player report #${existing.id} again (${existing.count}): ${title}`);
    return existing.id;
  }
  const created = em.create(BugReport, {
    fingerprint,
    title,
    details,
    context,
    users: [input.reporter.userid],
    user_count: 1,
    last_build: "",
  });
  em.persist(created);
  try {
    await em.flush();
    logger.warn(`New player report: ${title}`);
    sendAlert("player-report", `a player was reported (#${created.id}): ${title.slice(0, 200)}`);
    await keepSample(created.id, { message: details, context, build: "", userid: input.reporter.userid });
    return created.id;
  } catch (err) {
    // Another report of the same player got in first: counted on its row instead (once: else the failure is real).
    if (retried) {
      logger.error(`A player report was not kept: ${err}`);
      return undefined;
    }
    return recordPlayerReport(input, true);
  }
};
