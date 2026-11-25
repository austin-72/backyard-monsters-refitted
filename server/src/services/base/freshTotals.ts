import type { EntityManager } from "@mikro-orm/postgresql";

import type { Save } from "../../database/models/save.model.js";
import { logger } from "../../utils/logger.js";
import { notEnoughShinyErr } from "../../errors/errors.js";

/**
 * A save's Shiny and resources written as changes, not as whole values (18 October, SUSPECTED-BUGS.md: "A save
 * writes stale Shiny and resources over changes made at the same moment", "Two takeovers at once: paid once").
 *
 * A request loads the player's main yard at its start, works out new Shiny and resources from that copy, and
 * writes them back at the end, many awaits later. Anything that changed them in between (a pet bought, a daily
 * reward, a skin, another takeover) was written over: a purchase given back, or a reward lost.
 *
 * Now the request notes the totals it started from (`trackTotals`), and its flush (`flushWithFreshTotals`) locks the
 * saves' rows, reads what they hold now, and writes what they hold now plus this request's own change, in the
 * same transaction as the rest of its writes. Two such requests at once wait for each other; a change made by a
 * single SQL update (credits = credits - n) is kept either way.
 */

export interface Totals {
  credits: number;
  resources: Record<string, unknown>;
  iresources: Record<string, unknown>;
}

const COUNTED = /^r[1-4](max)?$/;
const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {});
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** The totals as they are now. */
export const totalsOf = (save: Save): Totals => ({
  credits: num(save.credits),
  resources: asObject(save.resources),
  iresources: asObject((save as unknown as { iresources?: unknown }).iresources),
});

/** Each tracked save's totals as the request found them (or as its last fresh flush left them). */
const BEFORE = new WeakMap<object, Totals>();

/** Notes the totals the request starts from: call it as soon as a save is loaded, before anything changes them. */
export const trackTotals = (...saves: (Save | null | undefined)[]) => {
  for (const s of saves) if (s && !BEFORE.has(s)) BEFORE.set(s, totalsOf(s));
};

/**
 * A change already in the database that this request also made on its copy (so it shows at once): a Gauntlet
 * stage's reward paid by its own SQL update, say. Left out of what the fresh flush adds, or it would count twice.
 */
export const alreadyWritten = (save: Save | null | undefined, change: { credits?: number; resources?: Record<string, number> }) => {
  const b = save ? BEFORE.get(save) : undefined;
  if (!b) return;
  b.credits += num(change.credits);
  for (const [k, v] of Object.entries(change.resources ?? {})) if (COUNTED.test(k)) b.resources[k] = num(b.resources[k]) + num(v);
};

/** Now's values plus this request's change, key by key (only the counted keys: r1-r4 and their limits). */
const rebase = (mine: unknown, before: Record<string, unknown>, now: unknown): Record<string, unknown> | null => {
  // (a field this request didn't load, or a save without it: left alone)
  if (mine === undefined || mine === null) return null;
  const cur = asObject(mine);
  const dbNow = asObject(now);
  let changed = false;
  const out: Record<string, unknown> = { ...cur };
  for (const key of new Set([...Object.keys(cur), ...Object.keys(before), ...Object.keys(dbNow)])) {
    if (!COUNTED.test(key)) continue;
    const delta = num(cur[key]) - num(before[key]);
    const next = Math.round(num(dbNow[key]) + delta);
    if (next !== num(cur[key]) || !(key in cur)) {
      if (!(key in cur) && !(key in dbNow) && delta === 0) continue;
      changed = true;
      out[key] = next;
    }
  }
  return changed ? out : null;
};

/**
 * Flushes the request's changes, each tracked save's Shiny and resources written as its change on what the
 * database holds at that moment (the rows locked, in one transaction with the rest). Saves not tracked
 * (trackTotals) flush as usual.
 */
export const flushWithFreshTotals = async (em: EntityManager, saves: (Save | null | undefined)[]) => {
  const live = [...new Set(saves.filter((s): s is Save => Boolean(s && s.basesaveid && BEFORE.has(s))))];
  if (!live.length) return em.flush();
  await em.begin();
  try {
    for (const save of live) {
      const before = BEFORE.get(save)!;
      const rows = (await em
        .getConnection()
        .execute(`SELECT credits, resources, iresources FROM bym.save WHERE basesaveid = ? FOR UPDATE`, [save.basesaveid], "all", em.getTransactionContext())) as {
        credits: unknown;
        resources: unknown;
        iresources: unknown;
      }[];
      const now = rows[0];
      if (!now) continue;

      const delta = num(save.credits) - before.credits;
      let credits = num(now.credits) + delta;
      if (credits < 0) {
        // (22 October: a spend more than the database holds now (another request spent it meanwhile: a pet, a Pit
        // stake, a takeover, another yard's save) is refused, the whole flush rolled back: kept at 0, the second
        // spend was free, and a pet given back refunded it, again and again)
        if (delta < 0) {
          logger.warn(`Save ${save.basesaveid}: Shiny would go below 0 (${num(now.credits)} now, ${delta} this request): refused`);
          throw notEnoughShinyErr();
        }
        logger.warn(`Save ${save.basesaveid}: Shiny would go below 0 (${num(now.credits)} now, ${delta} this request): kept at 0`);
        credits = 0;
      }
      if (save.credits !== undefined && credits !== num(save.credits)) save.credits = credits;

      const resources = rebase(save.resources, before.resources, now.resources);
      if (resources) save.resources = resources as Save["resources"];
      const holder = save as unknown as { iresources?: unknown };
      const iresources = rebase(holder.iresources, before.iresources, now.iresources);
      if (iresources) holder.iresources = iresources;
    }
    await em.flush();
    await em.commit();
  } catch (e) {
    await em.rollback().catch(() => undefined);
    throw e;
  }
  // (what the database holds now: a later flush in the same request adds only what changes after this)
  for (const save of live) BEFORE.set(save, totalsOf(save));
};
