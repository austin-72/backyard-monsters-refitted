import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres, redis } from "../../server.js";
import { visibleCredits } from "../user/shinyLock.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (10 October): sacrificing a worker to Moloch (the game's IoWorkerFun). The main yard's workers are
 * one plus its store data's extra workers (storedata.BEW.q, all of them there from the start: getDefaultBaseData).
 * A sacrifice takes one extra worker away for good and pays infernoOnlyConfig.workerSacrificeShiny Shiny, in one
 * transaction on the locked save row. Never the last worker (there must be an extra one to take). The yard can't
 * get it back: the game's saves never raise BEW (capWorkers) and no worker is for sale here.
 */

export class WorkerError extends Error {}

type Em = typeof postgres.em;

const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

export const sacrificeEnabled = () => infernoOnlyConfig.enabled && infernoOnlyConfig.workerSacrificeShiny > 0;

/**
 * Inferno-only (QoL #497): for this many seconds after a sacrifice, "Moloch returns it": the worker can be taken back
 * (workers/unsacrifice), and the Shiny it paid is taken back with it. Only the last sacrifice, once, and only while
 * the Shiny is still there to give back. Kept in Redis (gone when the time is up). 0 turns it off.
 */
export const UNDO_SACRIFICE_SEC: number = 120;

const undoKey = (userid: number) => `io:workers:sacrificed:${userid}`;

/** The main yard's extra workers can't go above this (the config's workers, less the one every yard has). */
const maxExtra = () => Math.max(0, Math.floor(Number(infernoOnlyConfig.workers) || 5) - 1);

/** One worker less, the Shiny paid. Returns the balance and the extra workers left. */
export const sacrificeWorker = async (user: User): Promise<{ credits: number; extra: number; undo: number }> => {
  if (!sacrificeEnabled()) throw new WorkerError("Workers can't be sacrificed here.");
  const shiny = infernoOnlyConfig.workerSacrificeShiny;
  const result = await postgres.em.fork().transactional(async (em) => {
    const rows = await sql<{ q: string | null }>(em, `SELECT storedata->'BEW'->>'q' AS q FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!rows.length) throw new WorkerError("Your yard could not be found.");
    const extra = Math.floor(Number(rows[0].q) || 0);
    if (extra < 1) throw new WorkerError("That's your last worker: you need at least one.");
    const paid = await sql<{ credits: number; q: string }>(em,
      `UPDATE bym.save SET credits = credits + ?, storedata = jsonb_set(COALESCE(storedata, '{}'::jsonb), '{BEW}', jsonb_build_object('q', ?::int)) WHERE userid = ? AND type = ? RETURNING credits, storedata->'BEW'->>'q' AS q`,
      [shiny, extra - 1, user.userid, BaseType.MAIN]);
    if (paid.length !== 1) throw new WorkerError("Your yard could not be found.");
    return { credits: Number(paid[0].credits), extra: Number(paid[0].q) };
  });
  // The request's own copy of the save (if loaded) must not later write back what it had.
  syncRequestSave(user, result.credits, result.extra);
  // (QoL #497: logged; and Moloch returns it, for a little while)
  logger.info(`Workers: user ${user.userid} sacrificed a worker for ${shiny} Shiny (${result.extra} extra worker(s) left).`);
  let undo = 0;
  if (UNDO_SACRIFICE_SEC > 0) {
    const kept = await redis
      .set(undoKey(user.userid), JSON.stringify({ shiny, at: Math.floor(Date.now() / 1000) }), "EX", String(UNDO_SACRIFICE_SEC))
      .catch(() => null);
    if (kept === "OK") undo = UNDO_SACRIFICE_SEC;
  }
  return { credits: visibleCredits(user, result.credits), extra: result.extra, undo };
};

const syncRequestSave = (user: User, credits: number, extra: number) => {
  const save = user.save as unknown as { credits?: number; storedata?: Record<string, unknown> } | undefined;
  if (save && typeof save === "object") {
    if ("credits" in save) save.credits = credits;
    if (save.storedata && typeof save.storedata === "object") save.storedata = { ...save.storedata, BEW: { q: extra } };
  }
};

/**
 * QoL #497: "Moloch returns it": the last sacrifice taken back within UNDO_SACRIFICE_SEC. The worker is given back
 * (one extra worker more, never above the yard's most) and the Shiny it paid is taken back, in one transaction on the
 * locked save row; refused when the Shiny has been spent since (the balance can't go below what it was). The record
 * is claimed first (GETDEL: a second request can't give a second worker back) and put back if this one fails.
 */
export const unsacrificeWorker = async (user: User): Promise<{ credits: number; extra: number }> => {
  if (!sacrificeEnabled() || UNDO_SACRIFICE_SEC <= 0) throw new WorkerError("Workers can't be taken back here.");
  const raw = await redis.getdel(undoKey(user.userid)).catch(() => null);
  let record: { shiny?: number; at?: number } | null = null;
  try {
    record = raw ? JSON.parse(String(raw)) : null;
  } catch (_) {
    record = null;
  }
  const now = Math.floor(Date.now() / 1000);
  const at = Math.floor(Number(record?.at) || 0);
  const shiny = Math.floor(Number(record?.shiny) || 0);
  if (!record || shiny <= 0 || now - at > UNDO_SACRIFICE_SEC) throw new WorkerError("Too late: Moloch has kept that worker.");
  const putBack = async () => {
    const left = UNDO_SACRIFICE_SEC - (Math.floor(Date.now() / 1000) - at);
    if (left > 0) await redis.set(undoKey(user.userid), String(raw), "EX", String(left)).catch(() => null);
  };
  let result: { credits: number; extra: number };
  try {
    result = await postgres.em.fork().transactional(async (em) => {
      const rows = await sql<{ q: string | null; credits: number }>(em, `SELECT storedata->'BEW'->>'q' AS q, credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
      if (!rows.length) throw new WorkerError("Your yard could not be found.");
      const extra = Math.floor(Number(rows[0].q) || 0);
      if (extra >= maxExtra()) throw new WorkerError("Your yard has all its workers already.");
      if (Number(rows[0].credits) < shiny) throw new WorkerError(`Moloch wants his ${shiny} Shiny back, and you've spent them: he keeps the worker.`);
      const back = await sql<{ credits: number; q: string }>(em,
        `UPDATE bym.save SET credits = credits - ?, storedata = jsonb_set(COALESCE(storedata, '{}'::jsonb), '{BEW}', jsonb_build_object('q', ?::int)) WHERE userid = ? AND type = ? RETURNING credits, storedata->'BEW'->>'q' AS q`,
        [shiny, extra + 1, user.userid, BaseType.MAIN]);
      if (back.length !== 1) throw new WorkerError("Your yard could not be found.");
      return { credits: Number(back[0].credits), extra: Number(back[0].q) };
    });
  } catch (e) {
    await putBack();
    throw e;
  }
  syncRequestSave(user, result.credits, result.extra);
  logger.info(`Workers: user ${user.userid} took a sacrificed worker back (${shiny} Shiny returned; ${result.extra} extra worker(s) now).`);
  return { credits: visibleCredits(user, result.credits), extra: result.extra };
};

/**
 * The main yard's store data as the game saves it: its extra workers (BEW) never more than the save has already
 * (the game only ever loses one, by a sacrifice; none is for sale here). Other items as sent.
 * (QoL #497: and never fewer either: only workers/sacrifice and workers/unsacrifice change them, on the server, so a
 * save the game sent before a worker was taken back can't take it away again.)
 */
export const capWorkers = (sent: unknown, stored: unknown): unknown => {
  if (!infernoOnlyConfig.enabled || !sent || typeof sent !== "object" || Array.isArray(sent)) return sent;
  const had = (stored as Record<string, { q?: number }> | null | undefined)?.BEW?.q;
  const send = sent as Record<string, { q?: number }>;
  if (had == null || !send.BEW || typeof send.BEW !== "object") return sent;
  const q = Math.floor(Number(send.BEW.q) || 0);
  if (q === had) return sent;
  return { ...send, BEW: { ...send.BEW, q: had } };
};
