import { randomInt } from "crypto";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";

/**
 * Inferno-only (13 November, the user's): the Devil's Contract. The contracts and their numbers are
 * InfernoOnlyConfig.devil (sent to the game as the flag io_devil); the game draws the offer (IoDevilWindow) and does
 * what a contract in force does (IoDevil). This keeps who was offered what, who signed what and when, and is the only
 * one that decides it:
 *
 *   - An offer: `offerSize` contracts picked at random when the player's main yard loads (or the game asks: state),
 *     no sooner than `offerHours` after the last offer was answered (signed or refused). It waits until answered.
 *   - Never one that would stack: a contract still in force (its boon or its price running, or Hoarder's Seal's
 *     burn not done yet) blocks every contract that touches one of its areas, itself included. Fewer than
 *     `offerSize` left: those few; none: no offer until one ends.
 *   - sign: one of the offer's contracts, from now: its boon and its price each for their own hours.
 *   - refuse: all three gone; the next offer `offerHours` later.
 *   - settle: Hoarder's Seal's burn done by the game when its boon ended (the game holds the resources).
 *
 * The state is bym.user.io_devil (migration 20261116_DevilContract; ensureDevilContract does the same at start):
 *   { offer: { ids, at } | null, answered: seconds, active: [{ id, at, boonUntil, priceUntil, settled? }], signed: n }
 * Each request locks the player's row, so two answers at once can't both count.
 */

const HOUR = 3600;

export type DevilEntry = { id: string; at: number; boonUntil: number; priceUntil: number; settled?: number };
export type DevilState = { offer: { ids: string[]; at: number } | null; answered: number; active: DevilEntry[]; signed: number };

export class DevilError extends Error {}

export const devilEnabled = () => infernoOnlyConfig.enabled && Boolean(infernoOnlyConfig.devil?.enabled);

const cfg = () => infernoOnlyConfig.devil;
const contracts = () => cfg().contracts as Record<string, { areas: string[]; boon: Record<string, any>; price: Record<string, any> }>;

type Em = typeof postgres.em;
const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

const emptyState = (): DevilState => ({ offer: null, answered: 0, active: [], signed: 0 });

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const parseDevil = (raw: unknown): DevilState => {
  let v: any = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return emptyState();
  const known = contracts();
  const offer =
    v.offer && Array.isArray(v.offer.ids) ? { ids: v.offer.ids.map(String).filter((id: string) => known[id]), at: num(v.offer.at) } : null;
  const active: DevilEntry[] = Array.isArray(v.active)
    ? v.active
        .filter((e: any) => e && known[String(e.id)])
        .map((e: any) => ({ id: String(e.id), at: num(e.at), boonUntil: num(e.boonUntil), priceUntil: num(e.priceUntil), ...(e.settled ? { settled: num(e.settled) } : {}) }))
    : [];
  return { offer: offer && offer.ids.length ? offer : null, answered: num(v.answered), active, signed: num(v.signed) };
};

/** Does this entry still hold anything: its boon or its price running, or Hoarder's Seal's burn not yet done. */
const inForce = (e: DevilEntry, now: number) => {
  if (now < e.boonUntil || now < e.priceUntil) return true;
  const def = contracts()[e.id];
  return Boolean(def?.price?.burnOver) && !e.settled;
};

/**
 * Kept though no longer in force: Second Shift's entry for 30 days after its boon, so the game still knows his worker
 * may be out finishing the job he was on (IoDevil.spawnCount). It blocks no offer.
 */
const kept = (e: DevilEntry, now: number) =>
  inForce(e, now) || (num(contracts()[e.id]?.boon?.workers) > 0 && now - e.boonUntil < 30 * 24 * HOUR);

/** The entries still worth keeping (the rest are dropped when the state is written). */
const prune = (state: DevilState, now: number) => {
  state.active = state.active.filter((e) => kept(e, now));
};

/** The contracts an offer could hold now: none sharing an area with one in force, nor one in force itself. */
export const offerable = (state: DevilState, now: number): string[] => {
  const all = contracts();
  const blocked = new Set<string>();
  for (const e of state.active) if (inForce(e, now)) for (const a of all[e.id]?.areas ?? []) blocked.add(a);
  const running = new Set(state.active.filter((e) => inForce(e, now)).map((e) => e.id));
  return Object.keys(all).filter((id) => !running.has(id) && !(all[id].areas ?? []).some((a) => blocked.has(a)));
};

/** Due an offer now? (None waiting, and `offerHours` since the last was answered.) */
const offerDue = (state: DevilState, now: number) => !state.offer && now - state.answered >= Math.max(1, num(cfg().offerHours)) * HOUR;

/** Picks `offerSize` of the offerable ones at random. */
const pick = (ids: string[]): string[] => {
  const pool = ids.slice();
  const out: string[] = [];
  const size = Math.max(1, Math.floor(num(cfg().offerSize)) || 3);
  while (pool.length && out.length < size) out.push(pool.splice(randomInt(pool.length), 1)[0]);
  return out;
};

/** What the game is told: the offer (if any), what's signed and still in force, the next offer's earliest time. */
export const devilView = (state: DevilState, now = getCurrentDateTime()) => ({
  offer: state.offer ? state.offer.ids : null,
  offerAt: state.offer ? state.offer.at : 0,
  active: state.active.filter((e) => kept(e, now)),
  next: state.offer ? 0 : state.answered + Math.max(1, num(cfg().offerHours)) * HOUR,
  now,
});

/**
 * The effects a player's contracts have now (the multipliers, as InfernoOnlyConfig.devil names them; workers and
 * kitNoProtection added up): their boons while the boon runs, their prices while the price runs.
 */
export const effectsOf = (state: DevilState, now = getCurrentDateTime()): Record<string, any> => {
  const out: Record<string, any> = {};
  const all = contracts();
  const add = (fx: Record<string, any>) => {
    for (const [k, v] of Object.entries(fx ?? {})) {
      if (k === "hours" || k === "burnOver") continue;
      if (k === "production" && v && typeof v === "object") {
        const p = (out.production ??= {});
        for (const [r, m] of Object.entries(v)) p[r] = (p[r] ?? 1) * num(m);
      } else if (k === "workers" || k === "kitNoProtection") out[k] = (out[k] ?? 0) + num(v);
      else out[k] = (out[k] ?? 1) * num(v);
    }
  };
  for (const e of state.active) {
    const def = all[e.id];
    if (!def) continue;
    if (now < e.boonUntil) add(def.boon);
    if (now < e.priceUntil) add(def.price);
  }
  return out;
};

/** A player's state, read only. */
export const devilOf = async (userid: number, em: Em = postgres.em): Promise<DevilState> => {
  if (!userid) return emptyState();
  const rows = await sql<{ io_devil: unknown }>(em, `SELECT io_devil FROM bym."user" WHERE userid = ?`, [userid]);
  return parseDevil(rows[0]?.io_devil);
};

/** The effects of a player's contracts in force now (empty when the Devil's Contract is off). */
export const devilEffects = async (userid: number): Promise<Record<string, any>> => {
  if (!devilEnabled() || !userid) return {};
  return effectsOf(await devilOf(userid));
};

/** Runs fn on the player's state with their row locked, writing back what it leaves. */
const withDevil = async <T>(userid: number, fn: (state: DevilState, now: number) => T | Promise<T>): Promise<{ value: T; state: DevilState }> =>
  postgres.em.transactional(async (em) => {
    const rows = await sql<{ io_devil: unknown }>(em, `SELECT io_devil FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    if (!rows.length) throw new DevilError("That player could not be found.");
    const state = parseDevil(rows[0].io_devil);
    const now = getCurrentDateTime();
    const value = await fn(state, now);
    prune(state, now);
    await sql(em, `UPDATE bym."user" SET io_devil = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(state), userid]);
    return { value, state };
  });

/** The state for the game, with an offer made first if one is due (the player's main yard, or the game asking). */
export const devilState = async (userid: number) => {
  if (!devilEnabled()) return null;
  const { state } = await withDevil(userid, (s, now) => {
    if (offerDue(s, now)) {
      const ids = pick(offerable(s, now));
      if (ids.length) s.offer = { ids, at: now };
    }
  });
  return devilView(state);
};

/** Signs one of the waiting offer's contracts: from now, its boon and its price for their hours. */
export const signDevil = async (userid: number, id: string) => {
  if (!devilEnabled()) throw new DevilError("The Devil isn't dealing on this server.");
  const { state } = await withDevil(userid, (s, now) => {
    if (!s.offer) throw new DevilError("There's no offer to sign.");
    if (!s.offer.ids.includes(id)) throw new DevilError("That contract isn't on offer.");
    // (checked again: a contract in force since the offer was made, through another way, still can't stack)
    if (!offerable(s, now).includes(id)) throw new DevilError("That contract would stack with one still in force.");
    const def = contracts()[id];
    const hours = (fx: Record<string, any>) => Math.max(0, num(fx?.hours)) * HOUR;
    s.active.push({ id, at: now, boonUntil: now + hours(def.boon), priceUntil: now + hours(def.price) });
    s.offer = null;
    s.answered = now;
    s.signed += 1;
  });
  return devilView(state);
};

/** Refuses the waiting offer: all of it. */
export const refuseDevil = async (userid: number) => {
  if (!devilEnabled()) throw new DevilError("The Devil isn't dealing on this server.");
  const { state } = await withDevil(userid, (s, now) => {
    if (!s.offer) throw new DevilError("There's no offer to refuse.");
    s.offer = null;
    s.answered = now;
  });
  return devilView(state);
};

/** Hoarder's Seal's burn done by the game (its boon over): the entry can go. */
export const settleDevil = async (userid: number, id: string) => {
  const { state } = await withDevil(userid, (s, now) => {
    for (const e of s.active) if (e.id === id && now >= e.boonUntil && !e.settled) e.settled = now;
  });
  return devilView(state);
};

/** For a server whose migrations are run by hand. */
export const ensureDevilContract = async (): Promise<void> => {
  await postgres.em.getConnection().execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS io_devil jsonb NULL`);
};
