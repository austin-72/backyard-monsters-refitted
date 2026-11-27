import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { adminRole } from "../admin/admin.js";
import { sendAlert } from "../admin/alerts.js";
import { clientOf } from "../admin/bugReports.js";
import type { User } from "../../database/models/user.model.js";
import { playerLevel } from "../yard/terrain.js";

/**
 * Inferno-only (25 November, the user's: "Make it so right clicking shows options that are not game related like
 * "report a bug" or "suggest a change" allowing the user to highlight whatever their mouse is over and optionally
 * attach a screenshot or anything similar you can think of that belongs in the right click menu. Admin right clicks
 * should be noted as admin in the report a bug/etc. I want to be able to tell you to look at the things players said
 * and we can review and select what changes to make.").
 *
 * What players send from the game's right-click menu (client: com/monsters/feedback/IoFeedback.ts), one row a report
 * in bym.player_feedback (migration 20261117_PlayerFeedback): a bug or a suggestion, in their words, with what they
 * highlighted, where they were, their last clicks, and a screenshot if they chose (the highlight drawn on it) and a
 * picture of their own. An admin's report is marked with their role (taken from the account here, not from what the
 * game says). Admins read and answer them in the panel's Feedback tab; the player sees the status and the answer
 * under My reports. `bun run feedback` (scripts/feedback.ts) writes the open ones out to read and review.
 *
 * Limits: a player sends at most 6 reports in 10 minutes and 30 a day; (27 November, the user's: "remove the cap on
 * reports being sent. No cap for players ... > level 40 in game") none for a player whose main yard is above level 40,
 * nor for an admin. Text up to 3000 characters; each picture up to 1.5 MB (JPEG, PNG or WebP, checked by its first
 * bytes).
 */

export const FEEDBACK_KINDS = ["bug", "idea"] as const;
export const FEEDBACK_STATUSES = ["new", "seen", "planned", "done", "declined"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const HOW_OFTEN = ["", "once", "sometimes", "always"] as const;

export const TEXT_MIN = 5;
export const TEXT_MAX = 3000;
const PICTURE_MAX = 1.5 * 1024 * 1024;
const PER_10_MIN = 6;
const PER_DAY = 30;
/** Above this level (the main yard's), no cap. */
export const UNCAPPED_ABOVE_LEVEL = 40;

export class FeedbackRefused extends Error {}

const sqlRows = async <T>(query: string, params: unknown[] = []): Promise<T[]> =>
  (await postgres.em.getConnection().execute(query, params, "all")) as T[];

const clip = (v: unknown, max: number) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);

/**
 * A picture sent as a data URL (or bare base64): its base64, if it is a JPEG, PNG or WebP of at most 1.5 MB; null
 * when none was sent. Anything else is refused.
 */
export const pictureOf = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/) ?? (/^[A-Za-z0-9+/=\s]+$/.test(raw) ? [raw, "", raw] : null);
  if (!m) throw new FeedbackRefused("That picture can't be sent (a JPEG, PNG or WebP picture only).");
  const b64 = m[2].replace(/\s+/g, "");
  if (b64.length > Math.ceil((PICTURE_MAX * 4) / 3) + 4) throw new FeedbackRefused("That picture is too big (1.5 MB at most).");
  const bytes = Buffer.from(b64, "base64");
  if (!bytes.length || bytes.length > PICTURE_MAX) throw new FeedbackRefused("That picture is too big (1.5 MB at most).");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
  if (!jpeg && !png && !webp) throw new FeedbackRefused("That picture can't be sent (a JPEG, PNG or WebP picture only).");
  return bytes.toString("base64");
};

/** The picture's type from its first bytes, for a data URL. */
export const pictureType = (b64: string) => (b64.startsWith("/9j/") ? "image/jpeg" : b64.startsWith("iVBOR") ? "image/png" : "image/webp");

/** A box [x, y, w, h] of finite numbers, or null. */
const boxOf = (v: unknown): number[] | null => {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const n = v.map((x) => Math.round(Number(x) * 10) / 10);
  return n.every((x) => Number.isFinite(x) && Math.abs(x) < 100000) ? n : null;
};

const uncappedSeen = new Map<number, { at: number; yes: boolean }>();
/** No cap on reports for this player: an admin, or a main yard above UNCAPPED_ABOVE_LEVEL (known for a minute). */
export const feedbackUncapped = async (user: User): Promise<boolean> => {
  if (adminRole(user)) return true;
  const seen = uncappedSeen.get(user.userid);
  if (seen && Date.now() - seen.at < 60_000) return seen.yes;
  let yes = false;
  try {
    // (the level as the game works it out: bym.save's own level column stays 1; terrain.ts playerLevel)
    yes = (await playerLevel(user.userid)) > UNCAPPED_ABOVE_LEVEL;
  } catch {
    yes = false;
  }
  if (uncappedSeen.size > 5000) uncappedSeen.clear();
  uncappedSeen.set(user.userid, { at: Date.now(), yes });
  return yes;
};

/** Counts a report against the player's limits; refused when over one. */
const countAgainstLimits = async (user: User, staff: boolean) => {
  const day = new Date().toISOString().slice(0, 10);
  const shortKey = `feedback:10m:${user.userid}`;
  const dayKey = `feedback:day:${day}:${user.userid}`;
  const recent = Number(await redis.send("INCR", [shortKey]).catch(() => 0));
  if (recent === 1) await redis.send("EXPIRE", [shortKey, "600"]).catch(() => 0);
  const today = Number(await redis.send("INCR", [dayKey]).catch(() => 0));
  if (today === 1) await redis.send("EXPIRE", [dayKey, String(26 * 3600)]).catch(() => 0);
  if (staff) return;
  if (recent > PER_10_MIN) throw new FeedbackRefused("limit");
  if (today > PER_DAY) throw new FeedbackRefused("limit");
};

export interface FeedbackInput {
  kind: unknown;
  text: unknown;
  howOften?: unknown;
  subject?: unknown;
  target?: unknown;
  highlight?: unknown;
  place?: unknown;
  context?: unknown;
  build?: unknown;
  player?: unknown;
  shot?: unknown;
  picture?: unknown;
}

/** Records a report from the game. Its id; FeedbackRefused with a reason the game shows (or "limit"). */
export const recordFeedback = async (user: User, input: FeedbackInput, userAgent: string | undefined): Promise<number> => {
  const kind = String(input.kind ?? "") as FeedbackKind;
  if (!FEEDBACK_KINDS.includes(kind)) throw new FeedbackRefused("A bug or a suggestion, please.");
  const text = clip(input.text, TEXT_MAX);
  if (text.length < TEXT_MIN) throw new FeedbackRefused(`Please write a little more (at least ${TEXT_MIN} characters).`);
  const howOften = (HOW_OFTEN as readonly string[]).includes(String(input.howOften ?? "")) ? String(input.howOften ?? "") : "";
  // (checked before counting, so a refused picture doesn't use up the player's reports)
  const shot = pictureOf(input.shot);
  const picture = pictureOf(input.picture);
  const role = adminRole(user);
  await countAgainstLimits(user, await feedbackUncapped(user));

  const h = (input.highlight ?? null) as { pic?: unknown; stage?: unknown } | null;
  const highlight = h && typeof h === "object" ? { pic: boxOf(h.pic), stage: boxOf(h.stage) } : null;
  const rows = await sqlRows<{ id: number }>(
    `INSERT INTO bym.player_feedback (kind, userid, username, staff_role, text, how_often, subject, target, highlight, place, context, build, client, shot, picture, reply_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, true) RETURNING id`,
    [
      kind,
      user.userid,
      String(user.username ?? ""),
      role,
      text,
      howOften,
      clip(input.subject, 300),
      clip(input.target, 600),
      highlight && (highlight.pic || highlight.stage) ? JSON.stringify(highlight) : null,
      clip(input.place, 1000),
      clip(input.context, 8000),
      clip(input.build, 32),
      clientOf(userAgent, clip(input.player, 40)).slice(0, 300),
      shot,
      picture,
    ]
  );
  const id = Number(rows[0]?.id);
  logger.info(`Player feedback #${id} (${kind}) from ${user.username} (#${user.userid})${role ? ` [${role}]` : ""}`);
  sendAlert("feedback", `New ${kind === "bug" ? "bug report" : "suggestion"} #${id} from ${user.username}${role ? ` (${role})` : ""}: see the admin panel's Feedback tab.`);
  return id;
};

export interface MineRow {
  id: number;
  kind: string;
  status: string;
  text: string;
  subject: string;
  reply: string;
  reply_at: string | null;
  reply_seen: boolean;
  created_at: string;
  updated_at: string;
}

/** A player's own reports, newest first (the last 30), and how many answers they haven't seen. */
export const feedbackOf = async (userid: number) => {
  const rows = await sqlRows<MineRow>(
    `SELECT id, kind, status, left(text, 600) AS text, subject, reply, reply_at, reply_seen, created_at, updated_at
       FROM bym.player_feedback WHERE userid = ? ORDER BY created_at DESC LIMIT 30`,
    [userid]
  );
  return { reports: rows, unseen: rows.filter((r) => !r.reply_seen).length };
};

/** How many answers a player hasn't seen (the menu's "My reports (1 new)"). */
export const unseenRepliesOf = async (userid: number) =>
  Number((await sqlRows<{ n: number }>(`SELECT count(*)::int AS n FROM bym.player_feedback WHERE userid = ? AND NOT reply_seen`, [userid]))[0]?.n ?? 0);

/** The player has opened My reports: every answer is seen. */
export const markRepliesSeen = async (userid: number) => {
  await sqlRows(`UPDATE bym.player_feedback SET reply_seen = true WHERE userid = ? AND NOT reply_seen`, [userid]);
};

// ---------------------------------------------------------------------------------------------
// The admin panel's Feedback tab (controllers/admin/adminApi.ts) and scripts/feedback.ts
// ---------------------------------------------------------------------------------------------

export interface FeedbackRow {
  id: number;
  kind: string;
  status: string;
  userid: number;
  username: string;
  staff_role: string | null;
  text: string;
  how_often: string;
  subject: string;
  target: string;
  highlight: { pic: number[] | null; stage: number[] | null } | null;
  place: string;
  context: string;
  build: string;
  client: string;
  has_shot: boolean;
  has_picture: boolean;
  reply: string;
  reply_at: string | null;
  reply_seen: boolean;
  note: string;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
}

const LIST_FIELDS = `id, kind, status, userid, username, staff_role, text, how_often, subject, target, highlight, place, context, build, client,
  shot IS NOT NULL AS has_shot, picture IS NOT NULL AS has_picture, reply, reply_at, reply_seen, note, handled_by, created_at, updated_at`;

/**
 * Reports by status: "open" (new, seen and planned), "closed" (done and declined), "all", or one status; and kind
 * ("bug", "idea" or any). Newest first, 300 at most. Without the pictures (feedbackPicture).
 */
export const listFeedback = async (status = "open", kind = "", limit = 300): Promise<FeedbackRow[]> => {
  const statuses =
    status === "open" ? ["new", "seen", "planned"] : status === "closed" ? ["done", "declined"] : status === "all" ? [...FEEDBACK_STATUSES] : [status];
  const where = [`status IN (${statuses.map(() => "?").join(", ")})`];
  const params: unknown[] = [...statuses];
  if ((FEEDBACK_KINDS as readonly string[]).includes(kind)) {
    where.push("kind = ?");
    params.push(kind);
  }
  params.push(Math.max(1, Math.min(1000, limit | 0)));
  return sqlRows<FeedbackRow>(`SELECT ${LIST_FIELDS} FROM bym.player_feedback WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`, params);
};

export const feedbackById = async (id: number): Promise<FeedbackRow | null> =>
  (await sqlRows<FeedbackRow>(`SELECT ${LIST_FIELDS} FROM bym.player_feedback WHERE id = ?`, [id]))[0] ?? null;

/** A report's screenshot ("shot") or the player's own picture ("picture") as a data URL, or null. */
export const feedbackPicture = async (id: number, which: "shot" | "picture"): Promise<string | null> => {
  const rows = await sqlRows<{ b: string | null }>(`SELECT ${which === "picture" ? "picture" : "shot"} AS b FROM bym.player_feedback WHERE id = ?`, [id]);
  const b = rows[0]?.b;
  return b ? `data:${pictureType(b)};base64,${b}` : null;
};

/** Counts for the tab's label: new reports, and open ones in all. */
export const feedbackCounts = async () => {
  const rows = await sqlRows<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM bym.player_feedback GROUP BY status`);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  return { new: by.new ?? 0, open: (by.new ?? 0) + (by.seen ?? 0) + (by.planned ?? 0), closed: (by.done ?? 0) + (by.declined ?? 0) };
};

/**
 * An admin's change to a report: its status, the answer the player sees (a changed answer shows as new to them), a
 * note for admins. Only what is given changes. The row as it is now, or null when there is none.
 */
export const updateFeedback = async (
  id: number,
  change: { status?: string; reply?: string; note?: string },
  by: string
): Promise<FeedbackRow | null> => {
  const now = await feedbackById(id);
  if (!now) return null;
  const sets: string[] = ["updated_at = now()", "handled_by = ?"];
  const params: unknown[] = [by.slice(0, 60)];
  // (something new for the player under My reports: a new answer, or the report planned, done or declined)
  let news = false;
  if (change.status !== undefined) {
    if (!(FEEDBACK_STATUSES as readonly string[]).includes(change.status)) throw new FeedbackRefused("Unknown status.");
    sets.push("status = ?");
    params.push(change.status);
    if (change.status !== now.status && ["planned", "done", "declined"].includes(change.status)) news = true;
  }
  if (change.reply !== undefined) {
    const reply = clip(change.reply, 2000);
    if (reply !== now.reply) {
      sets.push("reply = ?", "reply_at = ?");
      params.push(reply, reply ? new Date() : null);
      if (reply) news = true;
    }
  }
  if (news) sets.push("reply_seen = false");
  if (change.note !== undefined) {
    sets.push("note = ?");
    params.push(clip(change.note, 2000));
  }
  params.push(id);
  await sqlRows(`UPDATE bym.player_feedback SET ${sets.join(", ")} WHERE id = ?`, params);
  return feedbackById(id);
};

export const deleteFeedback = async (id: number) => {
  const rows = await sqlRows<{ id: number }>(`DELETE FROM bym.player_feedback WHERE id = ? RETURNING id`, [id]);
  return rows.length > 0;
};
