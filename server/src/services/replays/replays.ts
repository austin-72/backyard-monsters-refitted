import { randomBytes } from "node:crypto";
import { gunzip, gzip } from "node:zlib";
import { promisify } from "node:util";

// (21 October: on the server's background threads, so a big replay doesn't hold up other players' requests)
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
import type { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { replayConfig } from "../../config/ReplayConfig.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { tribeLogName } from "../base/createAttackLog.js";
import { isGauntletBaseId } from "../events/gauntlet.js";
import { isSiegeBaseId } from "../arcade/siege.js";
import { isTestMode } from "../admin/testMode.js";
import { isHidden } from "../user/presence.js";
import { endLiveAttack, isLive, isWatched, liveAttacksOn, noteWatching, renewLiveAttack } from "./liveAttacks.js";

/**
 * Inferno-only: attack replays (config/ReplayConfig.ts).
 *
 * - A player-versus-player attack (a main yard or an outpost; not a tribe, Moloch, the Gauntlet or admin practice)
 *   gets a replay row when it starts (startReplay, from the attack's load): the yard as it is then (its buildings,
 *   their health, its warts) and a key, sent to the attacker's game (io_replay), which records the battle
 *   (IoReplayRecorder.ts) and sends it in parts as it goes (addChunk), the last one saying it is over.
 * - Finished, the parts and the yard are gzipped together into `data` (finishReplay). A recording whose parts
 *   stopped coming (the game closed) is finished with what it has (cleanupReplays).
 * - Anyone with the key can watch it (the attack logs give it to the attacker and the defender; chat shares it):
 *   getReplay gives the game the recording, and the yard's load in view mode with the key (baseLoad) shows the yard
 *   as it was. replayFile is the downloadable file (the same gzipped JSON), importReplay takes one back.
 * - Kept 7 days, but each defender keeps at least their 10 newest however old; imported ones for a day.
 * - (QoL #97, 15 October) A player's favourites (the ★ in the replay's bar, at most FAV_MAX) are kept however old:
 *   a Redis set per player (favKey), which the clean-up leaves out.
 * - (QoL #539, 15 October) The size limits (ReplayConfig maxChunkBytes, maxBytes: characters of the game's JSON)
 *   are sent with every part's answer (limits), and the game sends its parts by size under them. A part that
 *   would go over (or a recording the game stopped at its own limits: cut=1) marks the replay "cut short"
 *   (io_cut in its yard while it records, meta.cut once finished) instead of being dropped without a word.
 * - (QoL #96, 15 October) Not only player-versus-player: an attack on a tribe or Moloch yard (startReplay: no
 *   defender, defender_userid 0 and the tribe's name; its attack log is the attacker's, so it is listed under "My
 *   attacks"), and a wild raid on the player's own yard (startRaidReplay, asked by the player's game when the raid
 *   comes: replays/raid). A raid's row is the player's on both sides (attacker_userid = defender_userid, the one
 *   whose game records it; attacker_name the tribe's name). So what a replay is of (kindOf: "player", "tribe" or
 *   "raid") is read from the row's own columns, no new column: no defender is a tribe, the same player on both
 *   sides a raid; it is also in the replay's meta (kind), and so in a downloaded file.
 * - (QoL #92, 15 October) A wild raid gets an attack log too (bym.attack_logs, attacker_userid 0 and the tribe's
 *   name, the player the defender), so it is listed under "Attacks on me" with its replay: its damage, the
 *   buildings it wrecked and what it took come with its last part, and it ends with its replay (finish). A raid
 *   whose recording got nothing (it was over before the game began recording) keeps its log, not an empty replay.
 * - (QoL #96) The clean-up keeps each player's 10 newest of each kind: the defender's of attacks on their yards,
 *   the attacker's of their attacks on tribes, the player's of the raids on them; favourites however old.
 *
 * The recording (the game's own format, IoReplayRecorder): { v: 1, rate (samples a second), defs: [[uid, monster,
 * side, kind, ...]], samples: [[t, [[uid, x, y, hp, hold], ...], [[building id, hp%], ...], damage%], ...] }.
 */

type Em = typeof postgres.em;

const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

export class ReplayError extends Error {}

export const replaysEnabled = () => infernoOnlyConfig.enabled && replayConfig.enabled;

const newKey = () => randomBytes(9).toString("base64url").replace(/[^0-9a-zA-Z]/g, "x").slice(0, 12);

/** What the yard looks like at the start: all the replay's view load needs, besides the save itself. */
const yardSnapshot = (save: Save) => ({
  buildingdata: save.buildingdata ?? {},
  buildinghealthdata: save.buildinghealthdata ?? {},
  mushrooms: save.mushrooms ?? {},
});

/**
 * A player-versus-player attack has begun (baseLoad, an attack on another player's yard): its replay row. Returns
 * the key the attacker's game records under, or null (not a replay attack).
 * (QoL #96, 15 October: a tribe or Moloch yard's too (Map Room 2's tribe attacks load as attacks); not the
 * Gauntlet's or the Devil's Arcade's yards.)
 */
export const startReplay = async (attacker: User, save: Save): Promise<string | null> => {
  if (!replaysEnabled()) return null;
  const tribe = save.type === BaseType.TRIBE;
  if (isGauntletBaseId(save.baseid) || isSiegeBaseId(save.baseid)) return null;
  if (!tribe && (!save.saveuserid || save.saveuserid === attacker.userid)) return null;
  try {
    const em = postgres.em.fork();
    // (QoL #96: a tribe has no player: its defender is 0, named as its attack log names it)
    const defender = tribe
      ? [{ username: tribeLogName(save) }]
      : await sql<{ username: string }>(em, `SELECT username FROM bym."user" WHERE userid = ?`, [save.saveuserid]);
    const log = await sql<{ id: number }>(em,
      `SELECT id FROM bym.attack_logs WHERE attacker_userid = ? AND baseid = ? AND ended = false ORDER BY attacktime DESC LIMIT 1`,
      [attacker.userid, save.baseid]);
    const key = newKey();
    await sql(em,
      `INSERT INTO bym.replay (key, attack_log_id, attacker_userid, attacker_name, defender_userid, defender_name, baseid, yard_type, x, y, yard)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb)) RETURNING id`,
      [key, log[0]?.id ?? null, attacker.userid, attacker.username ?? "", tribe ? 0 : save.saveuserid, String(defender[0]?.username ?? "").slice(0, 255), String(save.baseid),
        String(save.type ?? "main"), save.cell?.x ?? null, save.cell?.y ?? null, JSON.stringify(yardSnapshot(save))]);
    return key;
  } catch (e) {
    logger.error(`Replay: not started for ${attacker.userid} on ${save.baseid}: ${e}`);
    return null;
  }
};

/**
 * (QoL #96) The raids on one player are recorded once in this long at most (a wild raid comes once a day).
 * (18 October, SUSPECTED-BUGS.md: "Wild-raid replays and attack-log rows can be made at will, with any loot": every 5
 * minutes, with no raid on) as often as a wild raid can come (config wildAttacks.minHours, an hour's room).
 */
const RAID_GAP_SECONDS = 300;
const raidGapSeconds = () => {
  const w = infernoOnlyConfig.wildAttacks;
  return w?.enabled && Number(w.minHours) > 1 ? Math.max(RAID_GAP_SECONDS, (Number(w.minHours) - 1) * 3600) : RAID_GAP_SECONDS;
};

/** (QoL #96) A raid's tribe by its wmid (WMATTACK's raids: 1, 11, 21, 31; Moloch 51 to 60), as attack logs name it. */
const raidTribeName = (wmid: number) =>
  tribeLogName({ wmid: wmid >= 51 && wmid <= 60 ? 51 : wmid, name: undefined } as unknown as Save);

/**
 * Inferno-only (QoL #96, 15 October): a wild raid has begun on the player's own yard (the game asks, replays/raid,
 * from WMATTACK.SendAttack): its replay row, with the yard as the server last saved it (the raid's own saves wait
 * till it is over), and (QoL #92) its attack log, for "Attacks on me". The row is the player's on both sides (their
 * game records it), the attacker's name the tribe's. Returns { key }; a ReplayError says why not (a raid of admin
 * test mode is practice, as an attack in it is; not the player's yard; a raid on them recorded just now).
 */
export const startRaidReplay = async (user: User, baseid: string, wmid: number) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  if (await isTestMode(user)) throw new ReplayError("A raid in test mode isn't recorded.");
  const em = postgres.em.fork();
  const save = await em.findOne(Save, { baseid: String(baseid ?? "").slice(0, 32) }, { populate: ["cell"] as never });
  if (!save || save.saveuserid !== user.userid || (save.type !== BaseType.MAIN && save.type !== BaseType.OUTPOST)) {
    throw new ReplayError("That isn't one of your yards.");
  }
  const recent = await sql<{ id: number }>(em,
    `SELECT id FROM bym.replay WHERE attacker_userid = ? AND defender_userid = ? AND imported = false AND created_at > now() - (? || ' seconds')::interval LIMIT 1`,
    [user.userid, user.userid, String(raidGapSeconds())]);
  if (recent.length) throw new ReplayError("A raid on you is being recorded already.");
  const t = Math.max(0, Math.min(60, Math.floor(Number(wmid) || 1)));
  const tribe = String(raidTribeName(t)).slice(0, 255);
  const name = String(user.username ?? "").slice(0, 255);
  const x = save.cell?.x ?? null;
  const y = save.cell?.y ?? null;
  // (QoL #92: the raid's attack log: no attacker player (0), the tribe's name; its damage, wrecks and loss come with
  // the recording's last part, addChunk)
  const log = await sql<{ id: number }>(em,
    `INSERT INTO bym.attack_logs (attacker_userid, attacker_username, defender_userid, defender_username, type, x, y, baseid, level, damage, destroyed, ended, loot, attackreport, attacktime)
     VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, false, '{}'::jsonb, CAST(? AS jsonb), now()) RETURNING id`,
    [tribe, user.userid, name, String(save.type ?? "main"), x, y, String(save.baseid), save.level ?? null, JSON.stringify({ raid: { wmid: t } })]);
  const key = newKey();
  await sql(em,
    `INSERT INTO bym.replay (key, attack_log_id, attacker_userid, attacker_name, defender_userid, defender_name, baseid, yard_type, x, y, yard)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb)) RETURNING id`,
    [key, log[0]?.id ?? null, user.userid, tribe, user.userid, name, String(save.baseid), String(save.type ?? "main"), x, y, JSON.stringify(yardSnapshot(save))]);
  return { key };
};

interface ReplayRow {
  id: number;
  key: string;
  attack_log_id: number | null;
  attacker_userid: number;
  attacker_name: string;
  defender_userid: number;
  defender_name: string;
  baseid: string;
  yard_type: string;
  x: number | null;
  y: number | null;
  status: string;
  yard: Record<string, unknown> | null;
  chunks: unknown[];
  data: Buffer | null;
  size: number;
  duration: number;
  damage: number;
  imported: boolean;
  viewer_userid: number | null;
  created_at: Date;
}

const findReplay = async (em: Em, key: string, lock = false) =>
  (await sql<ReplayRow>(em, `SELECT * FROM bym.replay WHERE key = ?${lock ? " FOR UPDATE" : ""}`, [String(key).slice(0, 24)]))[0] ?? null;

/** The recording's parts put together (the samples in order). */
const assemble = (row: ReplayRow) => {
  const defs: unknown[] = [];
  const samples: unknown[] = [];
  let rate = 4;
  const parts = [...(row.chunks ?? [])] as { seq: number; d?: unknown[]; s?: unknown[]; rate?: number }[];
  parts.sort((a, b) => a.seq - b.seq);
  for (const part of parts) {
    if (Array.isArray(part.d)) defs.push(...part.d);
    if (Array.isArray(part.s)) samples.push(...part.s);
    if (part.rate) rate = Number(part.rate) || rate;
  }
  return { rate, defs, samples };
};

/**
 * (QoL #96) What a replay is of, from its row's own columns: a tribe's yard (no defender), a wild raid on the
 * player's yard (the player on both sides: their game recorded it) or a player's yard. An imported file is a
 * player's unless its meta says otherwise (getReplay reads the file's).
 */
export type ReplayKind = "player" | "tribe" | "raid";

const kindOf = (row: Pick<ReplayRow, "attacker_userid" | "defender_userid" | "imported">): ReplayKind =>
  row.imported ? "player" : !row.defender_userid ? "tribe" : row.attacker_userid === row.defender_userid ? "raid" : "player";

const metaOf = (row: ReplayRow) => ({
  key: row.key,
  attacker: row.attacker_name,
  defender: row.defender_name,
  // (QoL #96: a raid's attacker is its tribe: no player)
  attacker_userid: kindOf(row) === "raid" ? 0 : row.attacker_userid,
  defender_userid: row.defender_userid,
  kind: kindOf(row),
  baseid: row.baseid,
  yard_type: row.yard_type,
  x: row.x,
  y: row.y,
  time: Math.floor(new Date(row.created_at).getTime() / 1000),
  duration: row.duration,
  damage: row.damage,
});

/** (QoL #539) A recording that lost parts at the size limits: noted in its yard (a JSON column) until finished. */
const isCut = (row: ReplayRow) => Boolean(row.yard && (row.yard as Record<string, unknown>).io_cut);

/** The whole replay: { v, meta, yard, rate, defs, samples }. */
const fullReplay = async (row: ReplayRow): Promise<Record<string, unknown>> => {
  if (row.data) return JSON.parse((await gunzipAsync(row.data)).toString("utf8")) as Record<string, unknown>;
  // (QoL #539: meta.cut, a replay cut short at the size limits)
  return { v: 1, meta: { ...metaOf(row), ...(isCut(row) ? { cut: true } : {}) }, yard: row.yard ?? {}, ...assemble(row) };
};

/** (QoL #539) The size limits the game sends its parts under (characters of each part's JSON, and of all of them). */
export const replayLimits = () => ({ part: replayConfig.maxChunkBytes, total: replayConfig.maxBytes });

/**
 * The attacker's game sends a part of the recording. The last one (final) finishes the replay. A part sent again
 * (its answer was lost: the game sends it again until one comes, QoL #455) is kept once. Returns { cut }: the
 * replay is cut short (a part over the size limits, QoL #539, or the game said so: cut).
 * (QoL #92: a raid's last part also says what it wrecked and took (summary destroyed, loot [r1..r4]), for its
 * attack log.)
 */
export const addChunk = async (user: User, key: string, seq: number, data: string, final: boolean, summary: { duration?: number; damage?: number; destroyed?: number; loot?: unknown }, cutByGame = false) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  // (QoL #539: a part over the limit is not kept, but the replay says it was cut short; it said nothing)
  let tooBig = data.length > replayConfig.maxChunkBytes;
  let part: { d?: unknown[]; s?: unknown[]; rate?: number } = {};
  if (data && !tooBig) {
    try {
      part = JSON.parse(data);
    } catch {
      throw new ReplayError("That part of the replay can't be read.");
    }
  }
  let cut = false;
  let baseid: string | null = null;
  await postgres.em.fork().transactional(async (em) => {
    const row = await findReplay(em, key, true);
    if (!row || row.attacker_userid !== user.userid || row.imported) throw new ReplayError("That isn't your recording.");
    if (row.status !== "recording") {
      // (already finished: a part sent again)
      cut = isCut(row);
      return;
    }
    const size = row.size + data.length;
    const known = (row.chunks ?? []).some((c) => (c as { seq: number }).seq === seq);
    if (data && !known && (tooBig || size > replayConfig.maxBytes)) tooBig = true;
    if (data && !tooBig && !known) {
      await sql(em, `UPDATE bym.replay SET chunks = chunks || CAST(? AS jsonb), size = ? WHERE id = ? RETURNING id`,
        [JSON.stringify([{ seq, d: part.d ?? [], s: part.s ?? [], rate: part.rate ?? 4 }]), size, row.id]);
    }
    cut = isCut(row) || (tooBig && !known) || cutByGame;
    if (cut && !isCut(row)) {
      await sql(em, `UPDATE bym.replay SET yard = COALESCE(yard, '{}'::jsonb) || '{"io_cut": 1}'::jsonb WHERE id = ? RETURNING id`, [row.id]);
      logger.info(`Replay ${row.key}: cut short (${tooBig ? `a part of ${data.length} characters, ${size} in all` : "by the game"})`);
    }
    const duration = Math.max(0, Math.min(3600, Math.round(Number(summary.duration) || 0)));
    const damage = Math.max(0, Math.min(100, Math.round(Number(summary.damage) || 0)));
    await sql(em, `UPDATE bym.replay SET duration = GREATEST(duration, ?), damage = GREATEST(damage, ?) WHERE id = ? RETURNING id`, [duration, damage, row.id]);
    // (QoL #92: a raid's attack log: the buildings it wrecked and what it took, as the player's game counted them)
    if (final && kindOf(row) === "raid" && row.attack_log_id) {
      const loot = Array.isArray(summary.loot) ? summary.loot : [];
      const lost: Record<string, number> = {};
      // (18 October: no more of each than the player's yard can hold, rather than up to 1e13)
      const held = await sql<{ resources: Record<string, unknown> | null }>(em, `SELECT resources FROM bym.save WHERE userid = ? AND type = 'main' LIMIT 1`, [row.defender_userid]);
      const res = held[0]?.resources ?? {};
      for (let i = 0; i < 4; i++) {
        const most = Math.max(Number(res[`r${i + 1}`]) || 0, Number(res[`r${i + 1}max`]) || 0);
        const n = Math.min(1e13, most, Math.max(0, Math.round(Number(loot[i]) || 0)));
        if (n > 0) lost[`r${i + 1}`] = n;
      }
      const destroyed = Math.max(0, Math.min(10000, Math.round(Number(summary.destroyed) || 0)));
      await sql(em, `UPDATE bym.attack_logs SET destroyed = GREATEST(destroyed, ?), loot = CAST(? AS jsonb) WHERE id = ? AND attacker_userid = 0 AND defender_userid = ? RETURNING id`,
        [destroyed, JSON.stringify(lost), row.attack_log_id, row.defender_userid]);
    }
    if (final) {
      const fresh = await findReplay(em, key, true);
      if (fresh) await finish(em, fresh);
    }
    baseid = kindOf(row) === "player" ? row.baseid : null;
  });
  // (18 October, the user's: a live attack goes on while its parts come, and is over with its last one; and its game
  // sends short parts while the defender watches: services/replays/liveAttacks.ts)
  if (baseid) {
    if (final) await endLiveAttack(baseid);
    else await renewLiveAttack(baseid);
  }
  // (anyone watching, from the Watch menu too: any attack's, a tribe's as well)
  const live = !final && liveAttacksOn() && (await isWatched(String(key).slice(0, 24)));
  return { cut, live };
};

/** The attacker's game says (live:act, services/live/liveActivity.ts) it is still attacking with this recording. */
const attackerStillOn = async (attacker: number, key: string) => {
  try {
    const raw = await redis.get(`live:act:${attacker}`);
    return Boolean(raw && (JSON.parse(raw) as { key?: string }).key === key);
  } catch {
    return false;
  }
};

/**
 * (18 October, the user's) An attack as it goes (replays/live), for its defender's game to show live, or anyone's
 * (the Watch menu): the recording's parts after `after` (their seq; -1: from the start, with the replay's details). Once the
 * recording is finished its parts are put together, so then the rest is given by time: the samples after `t` and the
 * monsters after the first `defs`. Each look counts as watching (the attacker's game sends short parts meanwhile).
 */
export const liveReplay = async (user: User, key: string, after: number, t: number, defsHave: number) => {
  const em = postgres.em.fork();
  const rows = await sql<ReplayRow & { parts: unknown[] }>(em,
    `SELECT id, key, attack_log_id, attacker_userid, attacker_name, defender_userid, defender_name, baseid, yard_type, x, y, status, NULL AS yard,
            '[]'::jsonb AS chunks, NULL AS data, size, duration, damage, imported, viewer_userid, created_at,
            CASE WHEN status = 'recording' THEN (SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'seq')::int), '[]'::jsonb) FROM jsonb_array_elements(chunks) c WHERE (c->>'seq')::int > ?) ELSE '[]'::jsonb END AS parts
       FROM bym.replay WHERE key = ?`,
    [Math.floor(after), String(key).slice(0, 24)]);
  const row = rows[0];
  // (18 October, the user's: the Watch menu: anyone may watch any attack as it goes, its defender too)
  if (!row || row.imported) throw new ReplayError("That attack can't be watched.");
  const meta = after < 0 ? metaOf(row) : undefined;
  if (row.status === "recording") {
    // (22 October: an attacker appearing offline can't be watched as they attack, from the Watch list or a key passed
    // on (it stopped only the pictures of their game); their defender still can, and they themselves)
    if (await hiddenFrom(user, row)) throw new ReplayError("That attack can't be watched.");
    // (18 October: who watches, for the attacker's list; not the attacker themselves)
    await noteWatching(row.key, user.userid !== row.attacker_userid ? user.userid : 0);
    const parts = (Array.isArray(row.parts) ? row.parts : []) as { seq: number; d?: unknown[]; s?: unknown[]; rate?: number }[];
    // (active: the attack still going; a recording whose game went away stops being: its note expired)
    // (a tribe's yard has no note: its attacker's game still saying it attacks with this recording, the Watch menu's)
    const active = (await isLive(row.baseid)) || (await attackerStillOn(row.attacker_userid, row.key));
    return { meta, recording: true, done: false, active, damage: row.damage, parts: parts.map((p) => ({ seq: p.seq, d: p.d ?? [], s: p.s ?? [], rate: p.rate ?? 4 })) };
  }
  // (finished: the rest of it, by time)
  const whole = await fullReplay((await findReplay(em, row.key)) ?? row);
  const defs = (Array.isArray(whole.defs) ? whole.defs : []) as unknown[];
  const samples = ((Array.isArray(whole.samples) ? whole.samples : []) as unknown[][]).filter((sample) => Number(sample?.[0]) > t);
  return { meta, recording: false, done: true, damage: row.damage, rate: whole.rate, defs: defs.slice(Math.max(0, Math.floor(defsHave))), samples };
};

/**
 * Gzips the yard and the recording together; the parts are dropped.
 * (QoL #92/#96: a raid's attack log ends with it, at its damage; a raid's or a tribe attack's recording that got
 * nothing (the raid was over before the game began recording, a game that doesn't record those) is dropped, its
 * log kept, rather than listed as an empty replay.)
 */
const finish = async (em: Em, row: ReplayRow) => {
  const whole = await fullReplay(row);
  const kind = kindOf(row);
  if (kind === "raid" && row.attack_log_id) {
    await sql(em, `UPDATE bym.attack_logs SET ended = true, endtime = COALESCE(endtime, now()), damage = GREATEST(damage, ?) WHERE id = ? AND attacker_userid = 0 AND defender_userid = ? RETURNING id`,
      [Math.max(0, Math.min(100, Number(row.damage) || 0)), row.attack_log_id, row.defender_userid]);
  }
  if (kind !== "player" && (!Array.isArray(whole.samples) || !(whole.samples as unknown[]).length)) {
    await sql(em, `DELETE FROM bym.replay WHERE id = ? RETURNING id`, [row.id]);
    return;
  }
  const data = (await gzipAsync(Buffer.from(JSON.stringify(whole), "utf8")));
  await sql(em, `UPDATE bym.replay SET status = 'done', data = ?, chunks = '[]'::jsonb, yard = NULL WHERE id = ? RETURNING id`, [data, row.id]);
};

/**
 * (22 October) An attack still going whose attacker appears offline: hidden from everyone but its attacker and its
 * defender.
 */
const hiddenFrom = async (user: User, row: ReplayRow): Promise<boolean> =>
  row.status === "recording" && user.userid !== row.attacker_userid && user.userid !== row.defender_userid && Number(row.attacker_userid) > 0 && (await isHidden(row.attacker_userid));

/** A replay to watch (by its key): its details and recording. The yard comes with the view load (replayYard). */
export const getReplay = async (user: User, key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || (row.imported && row.viewer_userid !== user.userid)) throw new ReplayError("That replay isn't here any more.");
  if (await hiddenFrom(user, row)) throw new ReplayError("That attack can't be watched.");
  const whole = await fullReplay(row);
  // (QoL #97: fav, the player's own ★ on it)
  const fav = row.imported ? false : await isFavourite(user.userid, row.key);
  return { meta: { ...metaOf(row), ...((whole.meta as object) ?? {}), key: row.key, imported: row.imported }, rate: whole.rate, defs: whole.defs, samples: whole.samples, recording: row.status === "recording", fav };
};

/**
 * (QoL #98) A replay's details only (who attacked whom, the damage), without its recording: for its link in chat
 * ("▶ Ann vs Bob · 87%"). Nothing is unpacked.
 */
export const getReplayMeta = async (user: User, key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || (row.imported && row.viewer_userid !== user.userid)) throw new ReplayError("That replay isn't here any more.");
  return { meta: { ...metaOf(row), imported: row.imported }, recording: row.status === "recording" };
};

// ---- (QoL #97, 15 October) favourite replays: kept beyond the clean-up, at most FAV_MAX a player

export const FAV_MAX = 10;

const favKey = (userid: number) => `replay-fav:${userid}`;

const isFavourite = async (userid: number, key: string) => {
  try {
    return Number(await redis.sismember(favKey(userid), key)) === 1;
  } catch {
    return false;
  }
};

/**
 * Puts the player's ★ on a replay (on) or takes it off. Anyone who can watch a replay can keep it (not an imported
 * file: that one is theirs for a day). At FAV_MAX, favourites gone from the server are forgotten first; still full:
 * { fav: false, full: true }.
 */
export const favouriteReplay = async (user: User, key: string, on: boolean) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  const set = favKey(user.userid);
  if (!on) {
    await redis.srem(set, String(key));
    return { fav: false, full: false, count: Number(await redis.scard(set)) || 0, max: FAV_MAX };
  }
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || row.imported) throw new ReplayError("That replay isn't here any more.");
  if (Number(await redis.sismember(set, row.key)) === 1) {
    return { fav: true, full: false, count: Number(await redis.scard(set)) || 0, max: FAV_MAX };
  }
  let members = ((await redis.smembers(set)) ?? []).map(String);
  if (members.length >= FAV_MAX) {
    const here = await sql<{ key: string }>(postgres.em.fork(),
      `SELECT key FROM bym.replay WHERE key IN (${members.map(() => "?").join(", ")})`, members);
    const kept = new Set(here.map((r) => r.key));
    const gone = members.filter((k) => !kept.has(k));
    if (gone.length) await redis.send("SREM", [set, ...gone]);
    members = members.filter((k) => kept.has(k));
  }
  if (members.length >= FAV_MAX) return { fav: false, full: true, count: members.length, max: FAV_MAX };
  await redis.sadd(set, row.key);
  return { fav: true, full: false, count: members.length + 1, max: FAV_MAX };
};

/** Every player's favourites (the clean-up leaves them); null when Redis can't be read (then nothing old goes). */
const allFavourites = async (): Promise<string[] | null> => {
  try {
    const out = new Set<string>();
    let cursor = "0";
    do {
      const [next, sets] = (await redis.send("SCAN", [cursor, "MATCH", "replay-fav:*", "COUNT", "500"])) as [string, string[]];
      cursor = String(next);
      for (const set of sets ?? []) {
        for (const k of (await redis.smembers(set)) ?? []) out.add(String(k));
      }
    } while (cursor !== "0");
    return [...out];
  } catch (e) {
    logger.error(`Replays: the favourites could not be read: ${e}`);
    return null;
  }
};

/** The yard as it was when the replay's attack began, and the yard's base id (the view load). */
export const replayYard = async (user: User, key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || (row.imported && row.viewer_userid !== user.userid)) throw new ReplayError("That replay isn't here any more.");
  const whole = await fullReplay(row);
  return { baseid: row.baseid, yard: (whole.yard ?? {}) as { buildingdata?: unknown; buildinghealthdata?: unknown; mushrooms?: unknown } };
};

/** The replay as a file to keep (gzipped JSON). */
export const replayFile = async (key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || row.imported) throw new ReplayError("That replay isn't here any more.");
  const whole = await fullReplay(row);
  whole.meta = { ...metaOf(row), ...((whole.meta as object) ?? {}) };
  return { name: `replay-${row.attacker_name}-vs-${row.defender_name}-${row.key}.bymreplay`.replace(/[^0-9a-zA-Z._-]/g, "_"), data: (await gzipAsync(Buffer.from(JSON.stringify(whole), "utf8"))) };
};

/** A downloaded replay file opened again: kept for a day, for this player. Returns its new key. */
export const importReplay = async (user: User, file: Buffer) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  if (file.length > replayConfig.maxImportBytes) throw new ReplayError("That file is too big to be a replay.");
  let whole: Record<string, unknown>;
  try {
    // (13 October: the size limit is the packed file's: 4 MB of zeros unpacks to gigabytes and took the server down)
    whole = JSON.parse((await gunzipAsync(file, { maxOutputLength: replayConfig.maxBytes * 4 })).toString("utf8"));
  } catch {
    throw new ReplayError("That file isn't a replay.");
  }
  const meta = (whole.meta ?? {}) as Record<string, unknown>;
  if (whole.v !== 1 || !Array.isArray(whole.samples) || !Array.isArray(whole.defs) || typeof whole.yard !== "object" || !meta.baseid) {
    throw new ReplayError("That file isn't a replay.");
  }
  const key = newKey();
  const data = (await gzipAsync(Buffer.from(JSON.stringify(whole), "utf8")));
  await sql(postgres.em.fork(),
    `INSERT INTO bym.replay (key, attacker_userid, attacker_name, defender_userid, defender_name, baseid, yard_type, x, y, status, data, size, duration, damage, imported, viewer_userid, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, true, ?, now()) RETURNING id`,
    [key, Number(meta.attacker_userid) || 0, String(meta.attacker ?? "").slice(0, 255), String(meta.defender ?? "").slice(0, 255), String(meta.baseid),
      String(meta.yard_type ?? "main").slice(0, 32), Number.isFinite(Number(meta.x)) ? Number(meta.x) : null, Number.isFinite(Number(meta.y)) ? Number(meta.y) : null,
      data, data.length, Math.round(Number(meta.duration) || 0), Math.round(Number(meta.damage) || 0), user.userid]);
  return key;
};

/** The finished replays of some attack logs: log id -> key. */
export const replaysForLogs = async (logIds: number[]) => {
  const out = new Map<number, string>();
  if (!replaysEnabled() || !logIds.length) return out;
  const ids = logIds.map((n) => Math.floor(Number(n))).filter((n) => n > 0);
  if (!ids.length) return out;
  const rows = await sql<{ attack_log_id: number; key: string }>(postgres.em.fork(),
    `SELECT attack_log_id, key FROM bym.replay WHERE attack_log_id IN (${ids.map(() => "?").join(", ")}) AND status = 'done' AND imported = false`, ids);
  for (const r of rows) out.set(Number(r.attack_log_id), r.key);
  return out;
};

/** Finishes stale recordings and forgets old replays (keepDays, keepPerDefender, importedHours), not favourites (QoL #97). */
/** (QoL #96) The player a replay is kept for (kindOf in SQL): a tribe attack's attacker, otherwise the defender. */
const KEEP_OWNER_SQL = `CASE WHEN defender_userid = 0 THEN attacker_userid ELSE defender_userid END`;

const KEEP_KIND_SQL = `CASE WHEN defender_userid = 0 THEN 'tribe' WHEN attacker_userid = defender_userid THEN 'raid' ELSE 'player' END`;

export const cleanupReplays = async () => {
  const em = postgres.em.fork();
  const stale = await sql<ReplayRow>(em, `SELECT * FROM bym.replay WHERE status = 'recording' AND created_at < now() - (? || ' minutes')::interval`, [String(replayConfig.staleMinutes)]);
  for (const row of stale) {
    try {
      await finish(em, row);
    } catch (e) {
      logger.error(`Replay ${row.key}: not finished: ${e}`);
    }
  }
  // (QoL #97: a player's favourites are kept however old; Redis not answering, nothing old goes this time)
  // (QoL #96: the newest of each kind are kept for the player they are of: an attack on a player's yard its
  // defender's, an attack on a tribe its attacker's (no defender: they all had defender 0), a raid its player's)
  const favs = await allFavourites();
  const old = favs === null ? [] : await sql<{ id: number }>(em,
    `DELETE FROM bym.replay WHERE imported = false AND status = 'done' AND created_at < now() - (? || ' days')::interval AND id NOT IN (
       SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY ${KEEP_OWNER_SQL}, ${KEEP_KIND_SQL} ORDER BY created_at DESC) AS n FROM bym.replay WHERE imported = false) ranked WHERE n <= ?
     )${favs.length ? ` AND key NOT IN (${favs.map(() => "?").join(", ")})` : ""} RETURNING id`,
    [String(replayConfig.keepDays), replayConfig.keepPerDefender, ...(favs ?? [])]);
  const imported = await sql<{ id: number }>(em, `DELETE FROM bym.replay WHERE imported = true AND created_at < now() - (? || ' hours')::interval RETURNING id`, [String(replayConfig.importedHours)]);
  return { finished: stale.length, removed: old.length + imported.length };
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every 10 minutes (started with the server, Inferno-only servers only). */
export const startReplayCleanup = () => {
  if (timer || !replaysEnabled()) return;
  const run = () =>
    cleanupReplays()
      .then((r) => {
        if (r.finished || r.removed) logger.info(`Replays: ${r.finished} finished, ${r.removed} removed`);
      })
      .catch((e) => logger.error(`Replays: the clean-up failed: ${e}`));
  timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 90 * 1000).unref?.();
};
