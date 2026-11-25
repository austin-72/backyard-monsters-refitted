import type { Save } from "../../database/models/save.model.js";
import type { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { isAttackActive } from "../base/isAttackActive.js";
import { replaysEnabled } from "./replays.js";

/**
 * Inferno-only (18 October, the user's): attacks while the player is online, watched as they happen
 * (InfernoOnlyConfig.liveAttacks).
 *
 * - An attack on a player's main yard or outpost (not a tribe's) is noted when it starts (noteLiveAttack, from the
 *   attack's load): `live:yard:<baseid>` = who attacks, the replay's key, when; and the yard in the defender's own
 *   list, `live:user:<userid>`. The note lives LIVE_TTL seconds, renewed by every part of the attack's recording
 *   (replays.addChunk), so an attack whose game went away stops counting soon after (not 10 minutes later); it is
 *   gone at the attack's end (its last save, or its recording's last part).
 * - The defender's game asks every few seconds (attackwatch/status: liveAttacksOf), and so is told at once, wherever
 *   it is; opening the yard under attack (its build load: liveWatchFor) says so too.
 * - While the attack runs the yard is the attacker's: the owner's saves of it are refused (watchingErr), and the
 *   owner watches it from its recording (replays/live), which the attacker's game sends in short parts while it is
 *   watched (`live:watch:<key>`, set by each look of the defender's game: the parts' answers say live: 1).
 */

/** Seconds a live attack's note lasts without a part of its recording (the parts come every 30 s at most). */
export const LIVE_TTL = 120;
/** Seconds the defender's list of yards under attack lasts. */
const LIST_TTL = 15 * 60;
/** Seconds a look at a live attack counts as watching (the game looks every 2 s). */
const WATCH_TTL = 15;

export const liveAttacksOn = () => infernoOnlyConfig.enabled && Boolean(infernoOnlyConfig.liveAttacks?.enabled ?? true);

const yardKey = (baseid: string | number) => `live:yard:${baseid}`;
const userKey = (userid: number) => `live:user:${userid}`;
export const watchKey = (key: string) => `live:watch:${key}`;

export interface LiveAttack {
  /** The yard attacked, its kind ("main" or "outpost") and where it is. */
  baseid: string;
  type: string;
  x: number | null;
  y: number | null;
  /** Who attacks, and since when (unix seconds). */
  attacker: string;
  attackerId: number;
  since: number;
  /** The attack's replay (null: replays are off, nothing to watch). */
  key: string | null;
}

const isPlayersYard = (save: Save) => save.type === BaseType.MAIN || save.type === BaseType.OUTPOST;

/** An attack on a player's yard has begun (baseLoad, after its replay started). */
export const noteLiveAttack = async (attacker: User, save: Save, key: string | null) => {
  if (!liveAttacksOn() || !isPlayersYard(save) || !save.saveuserid || save.saveuserid === attacker.userid) return;
  const entry: LiveAttack = {
    baseid: String(save.baseid),
    type: String(save.type),
    x: save.cell?.x ?? null,
    y: save.cell?.y ?? null,
    attacker: String(attacker.username ?? ""),
    attackerId: attacker.userid,
    since: getCurrentDateTime(),
    key,
  };
  try {
    await redis.set(yardKey(save.baseid), JSON.stringify(entry), "EX", String(LIVE_TTL));
    await redis.sadd(userKey(save.saveuserid), String(save.baseid));
    await redis.expire(userKey(save.saveuserid), LIST_TTL);
  } catch (e) {
    logger.warn(`Live attacks: the attack on ${save.baseid} wasn't noted: ${e}`);
  }
};

/** A part of the attack's recording came: the attack is still going (replays.addChunk). */
export const renewLiveAttack = async (baseid: string) => {
  if (!liveAttacksOn()) return;
  await redis.expire(yardKey(baseid), LIVE_TTL).catch(() => 0);
};

/** The attack is over (its last save, or its recording's last part). */
export const endLiveAttack = async (baseid: string | number) => {
  if (!liveAttacksOn()) return;
  await redis.del(yardKey(baseid)).catch(() => 0);
};

const readEntry = async (baseid: string | number): Promise<LiveAttack | null> => {
  const raw = await redis.get(yardKey(baseid)).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LiveAttack;
  } catch {
    return null;
  }
};

/** Whether a recording of an attack on this yard began in the last 8 minutes (an attack lasts at most 7). On error: yes. */
const recordedSince = async (save: Save): Promise<boolean> => {
  try {
    const rows = await postgres.em
      .fork()
      .getConnection()
      .execute<{ n: number }[]>(`SELECT 1 AS n FROM bym.replay WHERE defender_userid = ? AND created_at > now() - interval '8 minutes' AND baseid = ? LIMIT 1`, [Number(save.saveuserid) || 0, String(save.baseid)], "all");
    return rows.length > 0;
  } catch {
    return true;
  }
};

/**
 * The attack running on this yard now, as its owner sees it, or null. With replays on, an attack whose recording
 * stopped coming (its note expired) is over for the owner, even inside isAttackActive's 7 minutes; with replays off,
 * isAttackActive alone says.
 */
export const liveAttackOn = async (save: Save): Promise<LiveAttack | null> => {
  if (!liveAttacksOn() || !isPlayersYard(save) || !save.attackid) return null;
  const entry = await readEntry(save.baseid);
  // (22 October: no longer than an attack can last (isAttackActive's 7 minutes): its recording sent on and on, a
  // part every 100 s, kept the note and refused every save of the owner's yard for half an hour, and again)
  if (entry && isAttackActive(save)) return entry;
  if (entry) return null;
  // (24 October, SUSPECTED-BUGS.md "an attack whose recording never started leaves the yard unguarded": no note and
  // no recording of this attack at all (the note's write failed, the recording didn't start): isAttackActive says, as
  // with replays off. A recording that started and stopped coming still frees the yard.)
  if (replaysEnabled() && isAttackActive(save) && !(await recordedSince(save))) {
    const last = save.attacks?.at(-1);
    return { baseid: String(save.baseid), type: String(save.type), x: save.cell?.x ?? null, y: save.cell?.y ?? null, attacker: String(last?.name ?? ""), attackerId: 0, since: Number(last?.starttime ?? 0), key: null };
  }
  if (!replaysEnabled() && isAttackActive(save)) {
    const last = save.attacks?.at(-1);
    return { baseid: String(save.baseid), type: String(save.type), x: save.cell?.x ?? null, y: save.cell?.y ?? null, attacker: String(last?.name ?? ""), attackerId: 0, since: Number(last?.starttime ?? 0), key: null };
  }
  return null;
};

/** What the owner's game is told about an attack on the yard it opens (io_watch), or null. */
export const liveWatchFor = async (user: User, save: Save | null) => {
  if (!save || save.saveuserid !== user.userid) return null;
  return liveAttackOn(save);
};

/** Every attack running now on this player's yards (attackwatch/status). */
export const liveAttacksOf = async (userid: number): Promise<LiveAttack[]> => {
  if (!liveAttacksOn()) return [];
  const ids = ((await redis.smembers(userKey(userid)).catch(() => [])) ?? []) as string[];
  const out: LiveAttack[] = [];
  for (const id of ids) {
    const entry = await readEntry(id);
    if (entry) out.push(entry);
    else await redis.srem(userKey(userid), id).catch(() => 0);
  }
  return out;
};

/**
 * Someone looks at the attack's recording (its defender, or anyone from the Watch menu): its game is to send short
 * parts (replays/chunk answers live: 1). (18 October) Who looks is kept too, `live:watchers:<key>` (user id, when),
 * for the attacker's list of who is watching them (services/live/liveWatchers.ts).
 */
export const noteWatching = async (key: string, viewer = 0) => {
  await redis.set(watchKey(key), "1", "EX", String(WATCH_TTL)).catch(() => null);
  if (viewer > 0) {
    await redis.send("ZADD", [watchersKey(key), String(Date.now()), String(viewer)]).catch(() => 0);
    await redis.expire(watchersKey(key), 60).catch(() => 0);
  }
};

export const watchersKey = (key: string) => `live:watchers:${key}`;

/** Who looked at the attack's recording in the last WATCH_TTL seconds (user ids). */
export const attackWatchers = async (key: string): Promise<number[]> => {
  const raw = (await redis.send("ZRANGEBYSCORE", [watchersKey(key), String(Date.now() - WATCH_TTL * 1000), "+inf"]).catch(() => [])) as unknown;
  return (Array.isArray(raw) ? raw : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
};

/** The attack on this yard is still going (its note is there: its recording's parts still come). */
export const isLive = async (baseid: string | number) => Boolean(await redis.exists(yardKey(baseid)).catch(() => 1));

export const isWatched = async (key: string) => Boolean(await redis.exists(watchKey(key)).catch(() => 0));

/** An owner's save of a yard under another player's attack: refused, and the game shows the attack instead. */
export const watchingErr = (attack: LiveAttack) =>
  new ClientSafeError({
    message: `${attack.attacker || "Another player"} is attacking this yard. You can watch it until it's over.`,
    status: Status.CONFLICT,
    data: { io_refused: "watching", io_watch: attack },
    isClientFriendly: true,
  });
