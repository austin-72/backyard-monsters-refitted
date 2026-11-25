import { redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (QoL #492, 15 October): a Yard Planner slot that is saved over, or deleted, keeps what it had for
 * 7 days: one earlier version a slot, so a layout saved into the wrong slot can be had back (bm/yardplanner/restoretemplate).
 * Kept in Redis, `io:plan:prev:<the yard's baseid>:<slot>` (a JSON copy of the slot's entry), gone when the 7 days are up;
 * a slot saved over again keeps only the one it had just before. Nothing here stops a save: a Redis failure is logged.
 */
export const PREVIOUS_SEC = 7 * 24 * 60 * 60;

export interface PreviousLayout {
  name: string;
  /** The layout as the slot had it (the client's JSON text). */
  data: unknown;
  /** When it had been saved (seconds). */
  saved: number;
  /** When it was replaced (seconds). */
  at: number;
  /** A shared outpost slot's: the outpost it was saved in. */
  from?: string;
}

const slotKey = (baseid: string, slot: number) => `io:plan:prev:${baseid}:${slot}`;

/** Keeps a slot's entry as its earlier version (not an empty one, nor one the new save leaves as it was). */
export const keepPreviousLayout = async (baseid: string, slot: number, entry: Record<string, unknown> | null | undefined, replacedBy?: unknown) => {
  if (!baseid || !entry || entry.data == null || entry.data === "") return;
  if (replacedBy !== undefined && JSON.stringify(entry.data) === JSON.stringify(replacedBy)) return;
  const kept: PreviousLayout = {
    name: String(entry.name ?? ""),
    data: entry.data,
    saved: Math.floor(Number(entry.saved) || 0),
    at: Math.floor(Date.now() / 1000),
    ...(entry.from != null && entry.from !== "" && { from: String(entry.from) }),
  };
  try {
    await redis.set(slotKey(baseid, slot), JSON.stringify(kept), "EX", String(PREVIOUS_SEC));
  } catch (err) {
    logger.warn(`Yard Planner: the earlier version of slot ${slot} of yard ${baseid} could not be kept: ${err}`);
  }
};

/** A slot's earlier version, or null. */
export const previousLayout = async (baseid: string, slot: number): Promise<PreviousLayout | null> => {
  try {
    const raw = await redis.get(slotKey(baseid, slot));
    if (!raw) return null;
    const parsed = JSON.parse(String(raw)) as PreviousLayout;
    return parsed && parsed.data != null ? parsed : null;
  } catch {
    return null;
  }
};

export const forgetPreviousLayout = async (baseid: string, slot: number) => {
  await redis.del(slotKey(baseid, slot)).catch(() => 0);
};

/** Every slot's (0-9) earlier version that is still kept: [{ slotid, name, saved, at, until, data }]. */
export const previousLayouts = async (baseid: string) => {
  const found = await Promise.all(Array.from({ length: 10 }, (_, slot) => previousLayout(baseid, slot)));
  const out: { slotid: number; name: string; saved: number; at: number; until: number; data: unknown; from?: string }[] = [];
  found.forEach((prev, slotid) => {
    if (prev) out.push({ slotid, name: prev.name, saved: prev.saved, at: prev.at, until: prev.at + PREVIOUS_SEC, data: prev.data, ...(prev.from && { from: prev.from }) });
  });
  return out;
};
