import type { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { isTestMode } from "../admin/testMode.js";
import { isWatched } from "../replays/liveAttacks.js";
import { hiddenPlayers, isHidden } from "../user/presence.js";

/**
 * Inferno-only (18 October, the user's): the Watch menu (the top bar's Watch). Anyone can watch what anyone else is
 * doing live: an attack (on a player's yard or outpost, or on a tribe's), a game of the Brimstone Pit, a game of the
 * Devil's Arcade, a Hellgate Defense run.
 *
 * - Every game says what its player is doing, with its regular look (attackwatch/status, every few seconds):
 *   reportActivity keeps it LIVE_TTL seconds (`live:act:<userid>`, and the player in `live:actors`). An attack names
 *   its replay's key: its title is the server's own (the replay's defender), and it is watched from its recording, over
 *   the yard (replays/live), as its defender watches it. Anything else is watched as pictures of the player's game,
 *   copied from its screen and passed on over the Watch socket (services/live/liveStream.ts); while someone watches
 *   (`live:watching:<userid>`) attackwatch/status says so to a game not connected to it yet (stream: 1).
 * - listActivities: everything live now, the longest going first (the Watch menu's list, "Watch all").
 * - Admins in test mode are left out: what they do is practice. So are the players appearing offline (Who's Online's
 *   button, services/user/presence.ts): not listed, and nothing of theirs can be watched.
 */

export const LIVE_TTL = 15;
const WATCHING_TTL = 6;

export const KINDS = new Set(["attack", "casino", "arcade", "hellgate", "siege", "gauntlet"]);

export interface Activity {
  uid: number;
  name: string;
  kind: string;
  title: string;
  detail: string;
  since: number;
  /** An attack's replay key: watched from its recording. */
  key: string | null;
  /** The yard attacked (an attack watched from its recording). */
  baseid: string | null;
  yardType: string | null;
}

export const watchOn = () => infernoOnlyConfig.enabled && Boolean(infernoOnlyConfig.liveAttacks?.enabled ?? true);

const actKey = (uid: number) => `live:act:${uid}`;
const ACTORS = "live:actors";
const watchingKey = (uid: number) => `live:watching:${uid}`;

const clean = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);

/** An attack's replay, as the server has it: who and what is attacked (cached: asked every few seconds). */
const replayInfo = new Map<string, { at: number; info: { attacker: number; title: string; baseid: string; yardType: string } | null }>();

const attackInfo = async (userid: number, key: string) => {
  const hit = replayInfo.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.info && hit.info.attacker === userid ? hit.info : null;
  if (replayInfo.size > 5000) replayInfo.clear();
  const rows = (await postgres.em
    .fork()
    .getConnection()
    .execute(`SELECT attacker_userid, defender_userid, defender_name, yard_type, baseid, status, imported FROM bym.replay WHERE key = ?`, [key], "all")) as {
    attacker_userid: number;
    defender_userid: number;
    defender_name: string;
    yard_type: string;
    baseid: string;
    status: string;
    imported: boolean;
  }[];
  const r = rows[0];
  let info: { attacker: number; title: string; baseid: string; yardType: string } | null = null;
  if (r && !r.imported && r.status === "recording") {
    const who = String(r.defender_name ?? "");
    const title = !r.defender_userid ? who : r.defender_userid === r.attacker_userid ? who : `${who}'s ${r.yard_type === "outpost" ? "outpost" : "yard"}`;
    info = { attacker: Number(r.attacker_userid), title, baseid: String(r.baseid), yardType: String(r.yard_type ?? "main") };
  }
  replayInfo.set(key, { at: Date.now(), info });
  return info && info.attacker === userid ? info : null;
};

/**
 * What the player's game says it is doing now (null or nothing: nothing to watch): {k: kind, t: title, d: detail,
 * key: an attack's replay key, s: since (unix seconds)}.
 */
export const reportActivity = async (user: User, raw: unknown) => {
  if (!watchOn()) return;
  let act: Record<string, unknown> | null = null;
  if (typeof raw === "string" && raw) {
    try {
      act = JSON.parse(raw.slice(0, 2000));
    } catch {
      act = null;
    }
  } else if (raw && typeof raw === "object") act = raw as Record<string, unknown>;
  try {
    // (18 October, the user's: a player appearing offline isn't on the Watch list, and can't be watched)
    if (!act || !KINDS.has(String(act.k)) || (await isTestMode(user)) || (await isHidden(user.userid))) {
      await redis.del(actKey(user.userid));
      return;
    }
    const now = getCurrentDateTime();
    const since = Math.min(now, Math.max(now - 3 * 3600, Math.floor(Number(act.s) || now)));
    const key = typeof act.key === "string" && /^[0-9a-zA-Z]{6,24}$/.test(act.key) ? act.key : null;
    const attack = key ? await attackInfo(user.userid, key) : null;
    const entry: Activity = {
      uid: user.userid,
      name: String(user.username ?? ""),
      kind: String(act.k),
      title: attack ? attack.title : clean(act.t, 60),
      detail: clean(act.d, 60),
      since,
      key: attack ? key : null,
      baseid: attack ? attack.baseid : null,
      yardType: attack ? attack.yardType : null,
    };
    await redis.set(actKey(user.userid), JSON.stringify(entry), "EX", String(LIVE_TTL));
    await redis.sadd(ACTORS, String(user.userid));
  } catch (e) {
    logger.warn(`Watch: ${user.username}'s activity not noted: ${e}`);
  }
};

/** The player's game stops saying what it does (signed out, a game over). */
export const endActivity = async (userid: number) => {
  await redis.del(actKey(userid)).catch(() => 0);
};

/** What this player is doing now, as their game last said (null: nothing that can be watched). */
export const readActivity = async (uid: number): Promise<Activity | null> => {
  const raw = await redis.get(actKey(uid)).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Activity;
  } catch {
    return null;
  }
};

/** Everything live now, the longest going first; not the asking player's own. */
export const listActivities = async (viewer: number): Promise<Activity[]> => {
  if (!watchOn()) return [];
  const ids = ((await redis.smembers(ACTORS).catch(() => [])) ?? []) as string[];
  const hidden = await hiddenPlayers().catch(() => new Set<number>());
  const out: Activity[] = [];
  for (const id of ids) {
    const a = await readActivity(Number(id));
    if (!a) {
      await redis.srem(ACTORS, id).catch(() => 0);
      continue;
    }
    if (a.uid !== viewer && !hidden.has(a.uid)) out.push(a);
  }
  out.sort((a, b) => a.since - b.since || a.uid - b.uid);
  return out;
};

/** Someone watches the attack this player's game records (replays/live: `live:watch:<key>`). */
export const isRecordingWatched = async (uid: number) => {
  const act = await readActivity(uid);
  return Boolean(act?.key && (await isWatched(act.key)));
};

/** Someone is watching this player's pictures: their game is to send them. */
export const isFrameWanted = async (uid: number) => Boolean(await redis.exists(watchingKey(uid)).catch(() => 0));

/** Someone watches this player's pictures (services/live/liveStream.ts, every few seconds while they do). */
export const noteFrameWatched = async (uid: number) => {
  await redis.set(watchingKey(uid), "1", "EX", String(WATCHING_TTL)).catch(() => null);
};

/**
 * A watcher's look at a player: what they do now (an activity gone or changed: over). Counts as watching; the pictures
 * themselves come over the Watch socket (services/live/liveStream.ts).
 */
export const viewFrame = async (viewer: User, uid: number) => {
  const act = (await isHidden(uid)) ? null : await readActivity(uid);
  if (act && !act.key && viewer.userid !== uid) await noteFrameWatched(uid);
  return { act };
};
