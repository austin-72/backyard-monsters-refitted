import type { User } from "../../database/models/user.model.js";
import type { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";
import { noteMilestone } from "../../chat/chatBroadcasts.js";
import { visibleCredits } from "../user/shinyLock.js";
import { logPlayerAction } from "../user/playerLog.js";

/**
 * Inferno-only (20 October, the user's): Trick or Treat, the Inferno's Halloween (the game: com/monsters/events/tot).
 *
 *  - From `startsAt` to `endsAt` (config trickOrTreat: 30 October to 2 November, Chicago time), from the button under
 *    Moloch's Gauntlet's on the player's own main yard: a window with one door for each wild tribe (the Hellionnaires,
 *    the Kozmodeus, the Abaddonakki, the Beelzenauts and Moloch's). Each door is knocked on once.
 *  - Behind it, an even chance (rolled here, kept: a reload can't roll again): a treat, `shiny` Shiny at once; or a
 *    trick, the tribe's `horde` level-`hordeLevel` Zagnoids round the player's yard, a real raid (it takes real loot
 *    and the buildings mend as after any raid), recorded for its replay. Every one of them killed: the `shiny` after all.
 *  - A trick has to be faced before the next door (state "pending" until the raid starts, "fighting" during it). One
 *    left pending (the game closed) comes when the player is home again, event over or not. A fight whose end never
 *    came (the game reloaded during it) counts as lost after `fightMinutes`, or at once when the game says so.
 *  - Every player who knocked on a door gets `pumpkins` Mini-Pumpkins (decoration `pumpkinBuilding`) in their storage
 *    once it is over, the first time they come home within `pumpkinDays` days (giftPumpkins: base/load).
 *  - Admin test mode: always open, its own doors (state.test, cleared each time test mode starts), forcing a door's
 *    result if asked (force: treat or trick), a trick cleared at any speed; the test mode's snapshot puts the yard
 *    (and its Shiny) back.
 *  - The admin override (Redis admin:tot, read at most every 5 seconds): open or closed until a time, as the Frozen
 *    Monster Invasion's.
 *
 * A player's doors (bym.user.io_tot) are only read and written with their row locked, through this file.
 */

const config = () => infernoOnlyConfig.trickOrTreat;

/** The tribes, in the doors' order (the game's TRIBES: the canonical names; the Inferno's are shown). */
export const TOT_TRIBES = ["legionnaire", "kozu", "abunakki", "dreadnaut", "moloch"] as const;
export type TotTribe = (typeof TOT_TRIBES)[number];

/** Shown in chat (the names the game shows: TRIBES.DEVIL_NAMES), and whose door it is. */
const TRIBE_NAMES: Record<TotTribe, string> = {
  legionnaire: "the Hellionnaires",
  kozu: "the Kozmodeus",
  abunakki: "the Abaddonakki",
  dreadnaut: "the Beelzenauts",
  moloch: "Moloch's horde",
};

const DOOR_OF: Record<TotTribe, string> = {
  legionnaire: "the Hellionnaires' door",
  kozu: "the Kozmodeus' door",
  abunakki: "the Abaddonakki's door",
  dreadnaut: "the Beelzenauts' door",
  moloch: "Moloch's door",
};

export interface TotDoor {
  /** treat or trick */
  r: "treat" | "trick";
  /** paid (a treat), pending (a trick not begun), fighting, won, lost */
  s: "paid" | "pending" | "fighting" | "won" | "lost";
  id: number;
  at: number;
  startedAt?: number;
  endedAt?: number;
  killed?: number;
}

export interface TotState {
  /** The event this is for (its start's year). */
  key: string;
  doors: Partial<Record<TotTribe, TotDoor>>;
  nextId: number;
  /** When its Mini-Pumpkins were given (0: not yet). */
  pumpkins?: number;
  test?: TotState | null;
}

export interface TotWindow {
  key: string;
  open: boolean;
  startsAt: number;
  endsAt: number;
}

const epoch = (iso: string) => Math.floor(Date.parse(iso) / 1000);

const calendarWindow = (now = getCurrentDateTime()): TotWindow => {
  const startsAt = epoch(config().startsAt);
  const endsAt = epoch(config().endsAt);
  return { key: String(new Date(startsAt * 1000).getUTCFullYear()), open: now >= startsAt && now < endsAt, startsAt, endsAt };
};

// ---------------------------------------------------------------------------------------------
// The admin override: open now, closed now, or (none) the calendar (Redis admin:tot)
// ---------------------------------------------------------------------------------------------

const OVERRIDE_KEY = "admin:tot";

export interface TotOverride {
  state: "open" | "closed";
  since: number;
  until: number;
  by?: string;
}

let override: TotOverride | null = null;
let overrideReadAt = 0;

export const refreshTotOverride = async (force = false): Promise<TotOverride | null> => {
  if (!force && Date.now() - overrideReadAt < 5000) return override;
  overrideReadAt = Date.now();
  try {
    const raw = await redis.get(OVERRIDE_KEY);
    const o = raw ? (JSON.parse(raw) as TotOverride) : null;
    if (o && (o.state === "open" || o.state === "closed") && Number(o.until) > getCurrentDateTime()) override = o;
    else {
      if (raw) await redis.del(OVERRIDE_KEY);
      override = null;
    }
  } catch {
    // (kept as it was)
  }
  return override;
};

/** Admin: open it now for `hours` (closing at the later of that and the calendar's end), close it now (for `hours`), or back to the calendar. */
export const setTotOverride = async (state: "open" | "closed" | "auto", hours = 24, by = ""): Promise<TotOverride | null> => {
  if (state === "auto") {
    await redis.del(OVERRIDE_KEY);
    return refreshTotOverride(true);
  }
  const now = getCurrentDateTime();
  const h = Math.max(1, Math.min(31 * 24, Math.round(Number(hours) || 24)));
  await redis.set(OVERRIDE_KEY, JSON.stringify({ state, since: now, until: now + h * 3600, by } satisfies TotOverride));
  return refreshTotOverride(true);
};

/** The event as it is now: the calendar's, or the override's while one holds. */
export const totWindow = (now = getCurrentDateTime()): TotWindow => {
  const w = calendarWindow(now);
  const o = override;
  if (!o || now < o.since || now >= o.until) return w;
  if (o.state === "open") return { ...w, open: true, startsAt: Math.min(w.startsAt, o.since), endsAt: o.until };
  return { ...w, open: false, endsAt: Math.min(w.endsAt, o.since) };
};

export const totEnabled = () => infernoOnlyConfig.enabled && config().enabled;

const testWindow = (now = getCurrentDateTime()): TotWindow => {
  const w = totWindow(now);
  return { ...w, open: true, startsAt: Math.min(w.startsAt, now), endsAt: Math.max(w.endsAt, now + 86_400) };
};

type Em = typeof postgres.em;

const sqlAll = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

const err = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

const fresh = (key: string): TotState => ({ key, doors: {}, nextId: 1, pumpkins: 0 });

const parseState = (raw: unknown): TotState | null => {
  try {
    const v = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!v || typeof v !== "object" || !("key" in (v as object))) return null;
    const s = v as TotState;
    if (!s.doors || typeof s.doors !== "object") s.doors = {};
    return s;
  } catch {
    return null;
  }
};

/** This event's doors (another year's: from the start; test mode: its own). */
const stateFor = (stored: TotState | null, key: string, test: boolean): { root: TotState; s: TotState } => {
  let root = stored && stored.key === key ? stored : { ...fresh(key), test: stored?.test ?? null };
  if (!test) return { root, s: root };
  if (!root.test || root.test.key !== key) root = { ...root, test: fresh(key) };
  return { root, s: root.test! };
};

/** A fight that never ended, long enough ago: lost. True if one was. */
const settleStale = (s: TotState, now: number): boolean => {
  let changed = false;
  for (const t of TOT_TRIBES) {
    const d = s.doors[t];
    if (d && d.s === "fighting" && now - Number(d.startedAt ?? d.at) > config().fightMinutes * 60) {
      d.s = "lost";
      d.endedAt = now;
      changed = true;
    }
  }
  return changed;
};

const withTot = <T>(userid: number, fn: (stored: TotState | null, em: Em) => Promise<{ value: T; put?: TotState }>): Promise<T> =>
  postgres.em.fork().transactional(async (em) => {
    const rows = await sqlAll<{ io_tot: unknown }>(em, `SELECT io_tot FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    if (!rows.length) throw new Error(`No player #${userid}.`);
    const { value, put } = await fn(parseState(rows[0].io_tot), em);
    if (put) await sqlAll(em, `UPDATE bym."user" SET io_tot = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(put), userid]);
    return value;
  });

/** The Shiny paid into the player's main yard, in the same transaction. Its new balance. */
const pay = async (em: Em, userid: number, shiny: number): Promise<number> => {
  const paid = await sqlAll<{ credits: number }>(em, `UPDATE bym.save SET credits = COALESCE(credits, 0) + ? WHERE userid = ? AND type = ? RETURNING credits`, [shiny, userid, BaseType.MAIN]);
  if (paid.length !== 1) throw new Error("no main yard to pay into");
  return Number(paid[0].credits);
};

/** The request's own copy of the save must not later write back an older balance. */
const keepCredits = (user: User, credits: number | null) => {
  if (credits != null && user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
};

const tribeOf = (raw: unknown): TotTribe => {
  const t = String(raw ?? "").toLowerCase() as TotTribe;
  if (!(TOT_TRIBES as readonly string[]).includes(t)) throw err("There's no such door.");
  return t;
};

/** What the game is told (flag io_tot, and every answer): null when there's nothing to show. */
export const totView = async (user: User, testMode = false, state?: TotState | null) => {
  if (!totEnabled()) return null;
  await refreshTotOverride();
  const now = getCurrentDateTime();
  const w = testMode ? testWindow(now) : totWindow(now);
  if (state === undefined) {
    const rows = await sqlAll<{ io_tot: unknown }>(postgres.em, `SELECT io_tot FROM bym."user" WHERE userid = ?`, [user.userid]);
    state = parseState(rows[0]?.io_tot);
  }
  const { s } = stateFor(state ?? null, w.key, testMode);
  settleStale(s, now);
  const soon = !w.open && now < w.startsAt && w.startsAt - now <= config().showDaysBefore * 86_400;
  // (a trick left to face shows the button, event over or not)
  const waiting = TOT_TRIBES.some((t) => s.doors[t]?.s === "pending" || s.doors[t]?.s === "fighting");
  if (!w.open && !soon && !waiting && !testMode) return null;
  return {
    open: w.open,
    soon,
    startsAt: w.startsAt,
    endsAt: w.endsAt,
    now,
    shiny: config().shiny,
    horde: config().horde,
    level: config().hordeLevel,
    monster: config().monster,
    pumpkins: config().pumpkins,
    doors: s.doors,
    tribes: TOT_TRIBES,
    test: testMode,
  };
};

/**
 * A knock on a tribe's door: its treat (the Shiny paid now) or its trick (the raid to come), rolled once. While a
 * trick waits to be faced, no other door is knocked on. Test mode can force the result.
 */
export const totKnock = async (user: User, rawTribe: unknown, testMode: boolean, force?: unknown) => {
  if (!totEnabled()) throw err("Trick or Treat isn't on here.");
  const tribe = tribeOf(rawTribe);
  await refreshTotOverride();
  const now = getCurrentDateTime();
  const w = testMode ? testWindow(now) : totWindow(now);
  if (!w.open) throw err(now < w.startsAt ? "The doors open on 30 October." : "Trick or Treat is over for this year.");
  const forced = testMode && (force === "treat" || force === "trick") ? (force as "treat" | "trick") : null;
  const outcome = await withTot(user.userid, async (stored, em) => {
    const { root, s } = stateFor(stored, w.key, testMode);
    settleStale(s, now);
    const had = s.doors[tribe];
    if (had) return { value: { door: had, credits: null as number | null, fresh: false }, put: root };
    const waiting = TOT_TRIBES.find((t) => s.doors[t]?.s === "pending" || s.doors[t]?.s === "fighting");
    if (waiting) throw err(`Fight off the Zagnoids from ${TRIBE_NAMES[waiting]} first!`);
    const r: "treat" | "trick" = forced ?? (crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? "treat" : "trick");
    const door: TotDoor = { r, s: r === "treat" ? "paid" : "pending", id: s.nextId++, at: now };
    s.doors[tribe] = door;
    const credits = r === "treat" ? await pay(em, user.userid, config().shiny) : null;
    return { value: { door, credits, fresh: true }, put: root };
  });
  keepCredits(user, outcome.credits);
  if (outcome.fresh) {
    logger.info(`Trick or Treat: '${user.username}' knocked on ${tribe}'s door: ${outcome.door.r}${testMode ? " (test)" : ""}`);
    void logPlayerAction(user.userid, user.username, "trick_or_treat", { tribe, result: outcome.door.r, test: testMode }).catch(() => {});
    if (!testMode && outcome.door.r === "trick") noteMilestone(user.userid, `#name knocked on ${DOOR_OF[tribe]}... TRICK! ${config().horde.toLocaleString("en-US")} Zagnoids are coming for their yard!`);
  }
  return {
    tribe,
    door: outcome.door,
    credits: outcome.credits == null ? null : visibleCredits(user, outcome.credits),
    paid: outcome.fresh && outcome.door.r === "treat" ? config().shiny : 0,
    tot: await totView(user, testMode),
  };
};

/** The trick's raid begins (its Zagnoids round the yard). Event over or not: a trick is always faced. */
export const totTrickStart = async (user: User, rawTribe: unknown, id: number, testMode: boolean) => {
  if (!totEnabled()) throw err("Trick or Treat isn't on here.");
  const tribe = tribeOf(rawTribe);
  await refreshTotOverride();
  const now = getCurrentDateTime();
  const key = (testMode ? testWindow(now) : totWindow(now)).key;
  const door = await withTot(user.userid, async (stored) => {
    const { root, s } = stateFor(stored, key, testMode);
    settleStale(s, now);
    const d = s.doors[tribe];
    if (!d || d.r !== "trick" || d.id !== id) throw err("That door's trick isn't waiting.");
    if (d.s === "pending") {
      d.s = "fighting";
      d.startedAt = now;
    } else if (d.s !== "fighting") throw err("That trick is over.");
    return { value: d, put: root };
  });
  return { tribe, door, tot: await totView(user, testMode) };
};

/**
 * The trick's raid is over: cleared (every Zagnoid killed) pays the Shiny after all. A clear sooner than any yard
 * could kill them (`trickMinSeconds`) counts as not cleared. A stale or unknown fight changes nothing.
 */
export const totTrickEnd = async (user: User, rawTribe: unknown, id: number, cleared: boolean, killed: number, testMode: boolean) => {
  if (!totEnabled()) throw err("Trick or Treat isn't on here.");
  const tribe = tribeOf(rawTribe);
  await refreshTotOverride();
  const now = getCurrentDateTime();
  const key = (testMode ? testWindow(now) : totWindow(now)).key;
  const outcome = await withTot(user.userid, async (stored, em) => {
    const { root, s } = stateFor(stored, key, testMode);
    const d = s.doors[tribe];
    if (!d || d.r !== "trick" || d.id !== id || d.s !== "fighting") return { value: { door: d ?? null, credits: null as number | null, won: false, stale: true } };
    const took = now - Number(d.startedAt ?? d.at);
    if (took > config().fightMinutes * 60) {
      d.s = "lost";
      d.endedAt = now;
      return { value: { door: d, credits: null, won: false, stale: true }, put: root };
    }
    let won = cleared;
    // (admin test mode: practice, any speed)
    if (won && !testMode && took < config().trickMinSeconds) {
      logger.warn(`Trick or Treat: '${user.username}' reported ${tribe}'s ${config().horde} Zagnoids all killed after ${took}s (it takes at least ${config().trickMinSeconds}s): counted as lost`);
      won = false;
    }
    d.s = won ? "won" : "lost";
    d.endedAt = now;
    d.killed = Math.max(0, Math.min(config().horde, Math.round(Number(killed)) || 0));
    const credits = won ? await pay(em, user.userid, config().shiny) : null;
    return { value: { door: d, credits, won, stale: false }, put: root };
  });
  keepCredits(user, outcome.credits);
  if (!outcome.stale) {
    logger.info(`Trick or Treat: '${user.username}' ${outcome.won ? "killed every one" : "didn't stop"} of ${tribe}'s Zagnoids (${outcome.door?.killed ?? 0} killed)${testMode ? " (test)" : ""}`);
    if (outcome.won && !testMode) noteMilestone(user.userid, `#name destroyed all ${config().horde.toLocaleString("en-US")} Zagnoids sent by ${TRIBE_NAMES[tribe]}, and got a treat after all!`);
  }
  return {
    tribe,
    door: outcome.door,
    won: outcome.won,
    stale: outcome.stale,
    credits: outcome.credits == null ? null : visibleCredits(user, outcome.credits),
    paid: outcome.won ? config().shiny : 0,
    tot: await totView(user, testMode),
  };
};

/**
 * Once the event is over: a player who knocked on any door (not in test mode) gets the Mini-Pumpkins, put in their
 * main yard's storage (researchdata "b" + building) as the yard is loaded, once (the user row says so first, so two
 * loads at once can't both give them). How many were given (0: none now).
 *
 * (24 October, SUSPECTED-BUGS.md "the Mini-Pumpkins can be lost": the mark was saved in its own transaction and the
 * storage in a later save of the whole yard, so a failed save lost them. Both are one transaction now, the storage
 * added in place on the yard's row. None while the admin's test mode is on (its end puts the storage back, and kept
 * the mark).)
 */
export const giftTotPumpkins = async (user: User, baseSave: Save): Promise<number> => {
  if (!totEnabled() || !config().pumpkins) return 0;
  await refreshTotOverride();
  const now = getCurrentDateTime();
  const w = totWindow(now);
  if (w.open || now < w.endsAt || now > w.endsAt + config().pumpkinDays * 86_400) return 0;
  const { isTestMode } = await import("../admin/testMode.js");
  if (await isTestMode(user)) return 0;
  const n = config().pumpkins;
  const k = "b" + config().pumpkinBuilding;
  const given = await withTot(user.userid, async (stored, em) => {
    if (!stored || stored.key !== w.key || Number(stored.pumpkins) > 0) return { value: false };
    if (!TOT_TRIBES.some((t) => stored.doors[t])) return { value: false };
    const rows = await sqlAll<{ ok: number }>(
      em,
      `UPDATE bym.save SET researchdata = jsonb_set(
         CASE WHEN jsonb_typeof(researchdata) = 'object' THEN researchdata ELSE '{}'::jsonb END, ?::text[],
         to_jsonb(CASE WHEN jsonb_typeof(researchdata -> ?) = 'number' THEN (researchdata ->> ?)::numeric ELSE 0 END + ?))
       WHERE basesaveid = ? RETURNING 1 AS ok`,
      [`{${k}}`, k, k, n, baseSave.basesaveid]
    );
    if (!rows.length) return { value: false };
    stored.pumpkins = now;
    return { value: true, put: stored };
  });
  if (!given) return 0;
  // (the yard as it is sent back: the same storage the row has now)
  const had = (baseSave.researchdata && typeof baseSave.researchdata === "object" ? baseSave.researchdata : {}) as Record<string, unknown>;
  baseSave.researchdata = { ...had, [k]: (Number(had[k]) || 0) + n };
  logger.info(`Trick or Treat: '${user.username}' got ${n} Mini-Pumpkins`);
  return n;
};

/**
 * The admin panel: the event as the game is shown it now, the calendar's (what it would be with no override), the
 * override, and the players' doors this year: how many knocked, treats, tricks won, lost and still to face.
 */
export const totAdminState = async () => {
  await refreshTotOverride(true);
  const shown = totWindow();
  const rows = await sqlAll<{ t: string; r: string; s: string; n: number }>(
    postgres.em,
    `SELECT d.key AS t, d.value->>'r' AS r, d.value->>'s' AS s, count(*)::int AS n
       FROM bym."user" u, jsonb_each(CASE WHEN jsonb_typeof(u.io_tot->'doors') = 'object' THEN u.io_tot->'doors' ELSE '{}'::jsonb END) d
      WHERE u.io_tot IS NOT NULL AND u.io_tot->>'key' = ? GROUP BY 1, 2, 3`,
    [shown.key]
  ).catch(() => []);
  const players = await sqlAll<{ n: number; pumpkins: number }>(
    postgres.em,
    `SELECT count(*)::int AS n, count(*) FILTER (WHERE COALESCE((io_tot->>'pumpkins')::bigint, 0) > 0)::int AS pumpkins
       FROM bym."user" WHERE io_tot IS NOT NULL AND io_tot->>'key' = ? AND io_tot->'doors' <> '{}'::jsonb`,
    [shown.key]
  ).catch(() => [{ n: 0, pumpkins: 0 }]);
  const sum = (f: (r: { r: string; s: string }) => boolean) => rows.filter(f).reduce((a, r) => a + Number(r.n), 0);
  return {
    enabled: totEnabled(),
    shown,
    calendar: calendarWindow(),
    override,
    players: Number(players[0]?.n ?? 0),
    pumpkinsGiven: Number(players[0]?.pumpkins ?? 0),
    knocks: sum(() => true),
    treats: sum((r) => r.r === "treat"),
    tricksWon: sum((r) => r.s === "won"),
    tricksLost: sum((r) => r.s === "lost"),
    tricksWaiting: sum((r) => r.s === "pending" || r.s === "fighting"),
  };
};

/** Test mode starts: fresh test doors. */
export const clearTestTot = async (userid: number) => {
  await postgres.em.getConnection().execute(`UPDATE bym."user" SET io_tot = io_tot - 'test' WHERE userid = ? AND io_tot IS NOT NULL RETURNING userid`, [userid], "all");
};

/** (Migration 20261111_TrickOrTreat does the same) the column, made if missing: a production server runs its migrations by hand. */
export const ensureTrickOrTreat = async (): Promise<void> => {
  await postgres.em.getConnection().execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS io_tot jsonb NULL`);
};
