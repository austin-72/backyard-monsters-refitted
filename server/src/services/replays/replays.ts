import { randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import type { User } from "../../database/models/user.model.js";
import type { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { replayConfig } from "../../config/ReplayConfig.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: attack replays (config/ReplayConfig.ts).
 *
 * - A player-versus-player attack (a main yard or an outpost; not a tribe, Moloch, the Gauntlet or admin practice)
 *   gets a replay row when it starts (startReplay, from the attack's load): the yard as it is then (its buildings,
 *   their health, its warts) and a key, sent to the attacker's game (io_replay), which records the battle
 *   (IoReplayRecorder.as) and sends it in parts as it goes (addChunk), the last one saying it is over.
 * - Finished, the parts and the yard are gzipped together into `data` (finishReplay). A recording whose parts
 *   stopped coming (the game closed) is finished with what it has (cleanupReplays).
 * - Anyone with the key can watch it (the attack logs give it to the attacker and the defender; chat shares it):
 *   getReplay gives the game the recording, and the yard's load in view mode with the key (baseLoad) shows the yard
 *   as it was. replayFile is the downloadable file (the same gzipped JSON), importReplay takes one back.
 * - Kept 7 days, but each defender keeps at least their 10 newest however old; imported ones for a day.
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
 */
export const startReplay = async (attacker: User, save: Save): Promise<string | null> => {
  if (!replaysEnabled()) return null;
  if (save.type === BaseType.TRIBE || !save.saveuserid || save.saveuserid === attacker.userid) return null;
  try {
    const em = postgres.em.fork();
    const defender = await sql<{ username: string }>(em, `SELECT username FROM bym."user" WHERE userid = ?`, [save.saveuserid]);
    const log = await sql<{ id: number }>(em,
      `SELECT id FROM bym.attack_logs WHERE attacker_userid = ? AND baseid = ? AND ended = false ORDER BY attacktime DESC LIMIT 1`,
      [attacker.userid, save.baseid]);
    const key = newKey();
    await sql(em,
      `INSERT INTO bym.replay (key, attack_log_id, attacker_userid, attacker_name, defender_userid, defender_name, baseid, yard_type, x, y, yard)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb)) RETURNING id`,
      [key, log[0]?.id ?? null, attacker.userid, attacker.username ?? "", save.saveuserid, defender[0]?.username ?? "", String(save.baseid),
        String(save.type ?? "main"), save.cell?.x ?? null, save.cell?.y ?? null, JSON.stringify(yardSnapshot(save))]);
    return key;
  } catch (e) {
    logger.error(`Replay: not started for ${attacker.userid} on ${save.baseid}: ${e}`);
    return null;
  }
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

const metaOf = (row: ReplayRow) => ({
  key: row.key,
  attacker: row.attacker_name,
  defender: row.defender_name,
  attacker_userid: row.attacker_userid,
  defender_userid: row.defender_userid,
  baseid: row.baseid,
  yard_type: row.yard_type,
  x: row.x,
  y: row.y,
  time: Math.floor(new Date(row.created_at).getTime() / 1000),
  duration: row.duration,
  damage: row.damage,
});

/** The whole replay: { v, meta, yard, rate, defs, samples }. */
const fullReplay = (row: ReplayRow) => {
  if (row.data) return JSON.parse(gunzipSync(row.data).toString("utf8")) as Record<string, unknown>;
  return { v: 1, meta: metaOf(row), yard: row.yard ?? {}, ...assemble(row) };
};

/** The attacker's game sends a part of the recording. The last one (final) finishes the replay. */
export const addChunk = async (user: User, key: string, seq: number, data: string, final: boolean, summary: { duration?: number; damage?: number }) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  if (data.length > replayConfig.maxChunkBytes) throw new ReplayError("That part of the replay is too big.");
  let part: { d?: unknown[]; s?: unknown[]; rate?: number } = {};
  if (data) {
    try {
      part = JSON.parse(data);
    } catch {
      throw new ReplayError("That part of the replay can't be read.");
    }
  }
  await postgres.em.fork().transactional(async (em) => {
    const row = await findReplay(em, key, true);
    if (!row || row.attacker_userid !== user.userid || row.imported) throw new ReplayError("That isn't your recording.");
    if (row.status !== "recording") return; // (already finished: a part sent again)
    const size = row.size + data.length;
    if (data && size <= replayConfig.maxBytes && !(row.chunks ?? []).some((c) => (c as { seq: number }).seq === seq)) {
      await sql(em, `UPDATE bym.replay SET chunks = chunks || CAST(? AS jsonb), size = ? WHERE id = ? RETURNING id`,
        [JSON.stringify([{ seq, d: part.d ?? [], s: part.s ?? [], rate: part.rate ?? 4 }]), size, row.id]);
    }
    const duration = Math.max(0, Math.min(3600, Math.round(Number(summary.duration) || 0)));
    const damage = Math.max(0, Math.min(100, Math.round(Number(summary.damage) || 0)));
    await sql(em, `UPDATE bym.replay SET duration = GREATEST(duration, ?), damage = GREATEST(damage, ?) WHERE id = ? RETURNING id`, [duration, damage, row.id]);
    if (final) {
      const fresh = await findReplay(em, key, true);
      if (fresh) await finish(em, fresh);
    }
  });
};

/** Gzips the yard and the recording together; the parts are dropped. */
const finish = async (em: Em, row: ReplayRow) => {
  const whole = fullReplay(row);
  const data = gzipSync(Buffer.from(JSON.stringify(whole), "utf8"));
  await sql(em, `UPDATE bym.replay SET status = 'done', data = ?, chunks = '[]'::jsonb, yard = NULL WHERE id = ? RETURNING id`, [data, row.id]);
};

/** A replay to watch (by its key): its details and recording. The yard comes with the view load (replayYard). */
export const getReplay = async (user: User, key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || (row.imported && row.viewer_userid !== user.userid)) throw new ReplayError("That replay isn't here any more.");
  const whole = fullReplay(row);
  return { meta: { ...metaOf(row), ...((whole.meta as object) ?? {}), key: row.key, imported: row.imported }, rate: whole.rate, defs: whole.defs, samples: whole.samples, recording: row.status === "recording" };
};

/** The yard as it was when the replay's attack began, and the yard's base id (the view load). */
export const replayYard = async (user: User, key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || (row.imported && row.viewer_userid !== user.userid)) throw new ReplayError("That replay isn't here any more.");
  const whole = fullReplay(row);
  return { baseid: row.baseid, yard: (whole.yard ?? {}) as { buildingdata?: unknown; buildinghealthdata?: unknown; mushrooms?: unknown } };
};

/** The replay as a file to keep (gzipped JSON). */
export const replayFile = async (key: string) => {
  const row = await findReplay(postgres.em.fork(), key);
  if (!row || row.imported) throw new ReplayError("That replay isn't here any more.");
  const whole = fullReplay(row);
  whole.meta = { ...metaOf(row), ...((whole.meta as object) ?? {}) };
  return { name: `replay-${row.attacker_name}-vs-${row.defender_name}-${row.key}.bymreplay`.replace(/[^0-9a-zA-Z._-]/g, "_"), data: gzipSync(Buffer.from(JSON.stringify(whole), "utf8")) };
};

/** A downloaded replay file opened again: kept for a day, for this player. Returns its new key. */
export const importReplay = async (user: User, file: Buffer) => {
  if (!replaysEnabled()) throw new ReplayError("Replays are off.");
  if (file.length > replayConfig.maxImportBytes) throw new ReplayError("That file is too big to be a replay.");
  let whole: Record<string, unknown>;
  try {
    whole = JSON.parse(gunzipSync(file).toString("utf8"));
  } catch {
    throw new ReplayError("That file isn't a replay.");
  }
  const meta = (whole.meta ?? {}) as Record<string, unknown>;
  if (whole.v !== 1 || !Array.isArray(whole.samples) || !Array.isArray(whole.defs) || typeof whole.yard !== "object" || !meta.baseid) {
    throw new ReplayError("That file isn't a replay.");
  }
  const key = newKey();
  const data = gzipSync(Buffer.from(JSON.stringify(whole), "utf8"));
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

/** Finishes stale recordings and forgets old replays (keepDays, keepPerDefender, importedHours). */
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
  const old = await sql<{ id: number }>(em,
    `DELETE FROM bym.replay WHERE imported = false AND status = 'done' AND created_at < now() - (? || ' days')::interval AND id NOT IN (
       SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY defender_userid ORDER BY created_at DESC) AS n FROM bym.replay WHERE imported = false) ranked WHERE n <= ?
     ) RETURNING id`,
    [String(replayConfig.keepDays), replayConfig.keepPerDefender]);
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
