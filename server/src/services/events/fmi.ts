import { FMI_LAST_SURGE, waveMinSeconds } from "./waveTimes.js";
import type { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";
import { noteMilestone } from "../../chat/chatBroadcasts.js";
import { hfoFinalWaveWon } from "./hfo.js";
import { raiseTrophies, readTrophies, type Trophies } from "./trophies.js";

/**
 * Inferno-only (10 October): the Frozen Monster Invasions, the base game's Wild Monster Invasions 1 and 2 made the
 * Inferno's: 32 waves of Hell Freezes Over's ice cretins and the Inferno's champions (Korath, Drull, Ashkarr and
 * Rimegrave), fought in the player's main yard with the Compound frozen shut (the game: com/monsters/events/fmi).
 *
 *  - Every month, from the `startDay` (the 15th) for `days` days, UTC. The months take turns: Frozen Monster
 *    Invasion 1 in October 2026, 2 in November, 1 in December and so on (`firstMonth`).
 *  - Only for a player who has won Hell Freezes Over's last wave (wave 13).
 *  - The waves are fought in order, as often as it takes; progress belongs to that month's invasion and starts
 *    again with the next one. The server counts the wave started (fmi/wavestart: a fight id) and the wave won
 *    (fmi/waveend), so a wave is only ever won once it was started, and only the next one can be.
 *  - Each invasion has its totem (trophies.ts: fmi1, fmi2), won at wave 1 and raised at waves 10, 20, 30, 31 and 32
 *    (levels 2 to 6), as the base game's invasion totems were. It is the player's for good, at the highest level
 *    reached in any month.
 *
 * Admin test mode: always open, and its own progress (state.test, cleared when test mode is switched on:
 * services/admin/testMode.ts), so every wave can be tried; trophies are not won.
 * A player's progress (user.fmi) is only read and written with their row locked, through this file.
 *
 * (QoL #398, 16 October) The admin panel can open it now (for so many hours: that month's invasion, its progress
 * going on), close it now (until the next month: the next invasion comes on its day), or leave it to the calendar
 * (Redis admin:fmi, read here at most every 5 seconds); and start one player's progress this month again. With
 * nothing set, the calendar alone decides, as before.
 */

const config = () => infernoOnlyConfig.fmi;

export const FMI_DAY = 86_400;

/** A wave whose end never came is settled (lost) after this long, or when another starts. */
export const FMI_FIGHT_WINDOW = 45 * 60;

/** The totem's level after each wave won: [wave, level]. */
export const TOTEM_LEVELS: [number, number][] = [[1, 1], [10, 2], [20, 3], [30, 4], [31, 5], [32, 6]];

export const totemLevel = (won: number) => TOTEM_LEVELS.reduce((l, [w, lv]) => (won >= w ? lv : l), 0);

export interface FmiFight {
  wave: number;
  id: number;
  at: number;
}

export interface FmiState {
  /** The invasion this progress is for ("2026-10"). */
  key: string;
  kind: 1 | 2;
  /** The last wave won (0: none yet). */
  won: number;
  fight: FmiFight | null;
  last: { wave: number; result: "won" | "lost"; destroyed: number; at: number } | null;
  nextId: number;
  test?: FmiState | null;
}

export interface FmiWindow {
  key: string;
  kind: 1 | 2;
  open: boolean;
  startsAt: number;
  endsAt: number;
}

const monthIndex = (y: number, m: number) => y * 12 + m;

/** This month's invasion by the calendar alone (or, past its end, still this month's: the next one starts next month). */
const calendarWindow = (at = new Date()): FmiWindow => {
  const { startDay, days, firstMonth } = config();
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth();
  const startsAt = Date.UTC(y, m, startDay) / 1000;
  const endsAt = startsAt + days * FMI_DAY;
  const now = Math.floor(at.getTime() / 1000);
  const [fy, fm] = firstMonth.split("-").map(Number);
  const kind = (((monthIndex(y, m) - monthIndex(fy, fm - 1)) % 2) + 2) % 2 === 0 ? 1 : 2;
  return { key: `${y}-${String(m + 1).padStart(2, "0")}`, kind, open: now >= startsAt && now < endsAt, startsAt, endsAt };
};

// ---------------------------------------------------------------------------------------------
// (QoL #398) The admin panel's override: open now, closed now, or (none) the calendar
// ---------------------------------------------------------------------------------------------

const OVERRIDE_KEY = "admin:fmi";

export interface FmiOverride {
  state: "open" | "closed";
  /** From when, until when (epoch seconds). */
  since: number;
  until: number;
  /** The invasion it is for: opened, its progress goes on for the whole stretch (into the next month too). */
  key: string;
  kind: 1 | 2;
  by?: string;
}

let override: FmiOverride | null = null;
let overrideReadAt = 0;

/** The override as Redis has it, read at most every 5 seconds (a failed read keeps the last one known). One past its end goes. */
export const refreshFmiOverride = async (force = false): Promise<FmiOverride | null> => {
  if (!force && Date.now() - overrideReadAt < 5000) return override;
  overrideReadAt = Date.now();
  try {
    const raw = await redis.get(OVERRIDE_KEY);
    const o = raw ? (JSON.parse(raw) as FmiOverride) : null;
    if (o && (o.state === "open" || o.state === "closed") && Number(o.until) > getCurrentDateTime()) {
      override = o;
    } else {
      if (raw) await redis.del(OVERRIDE_KEY);
      override = null;
    }
  } catch {
    // (kept as it was)
  }
  return override;
};

/**
 * This month's invasion (or, past its end, still this month's: the next one starts next month), as the admin
 * panel's override has it at that moment: opened, the override's invasion, open until its end (or the calendar's,
 * if that is later); closed, shut, and over from when it was closed (so the next month's is the one shown).
 */
export const fmiWindow = (at = new Date()): FmiWindow => {
  const w = calendarWindow(at);
  const o = override;
  const t = Math.floor(at.getTime() / 1000);
  if (!o || t < o.since || t >= o.until) return w;
  if (o.state === "open") {
    const same = w.key === o.key;
    const startsAt = same && w.startsAt < o.since && w.endsAt >= o.since ? w.startsAt : o.since;
    const endsAt = same && w.startsAt <= o.until ? Math.max(o.until, w.endsAt) : o.until;
    return { key: o.key, kind: o.kind, open: true, startsAt, endsAt };
  }
  return { ...w, open: false, endsAt: w.key === o.key ? Math.min(w.endsAt, o.since) : w.endsAt };
};

/** Admin panel: open it now for `hours` (the config's days if not given), close it now (until next month), or back to the calendar. */
export const setFmiOverride = async (state: "open" | "closed" | "auto", hours?: number, by = ""): Promise<FmiOverride | null> => {
  await refreshFmiOverride(true);
  if (state === "auto") {
    await redis.del(OVERRIDE_KEY);
    return refreshFmiOverride(true);
  }
  const now = getCurrentDateTime();
  const at = new Date(now * 1000);
  // (open: the invasion open now if one is, so its progress goes on; else this month's)
  const current = fmiWindow(at);
  const base = state === "open" && current.open ? current : calendarWindow(at);
  const h = Math.max(1, Math.min(31 * 24, Math.round(Number(hours) || config().days * 24)));
  const until = state === "open" ? now + h * 3600 : Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1) / 1000;
  const o: FmiOverride = { state, since: now, until, key: base.key, kind: base.kind, by };
  await redis.set(OVERRIDE_KEY, JSON.stringify(o));
  return refreshFmiOverride(true);
};

/** The invasion to show: this month's, or (past this month's end) next month's. */
export const fmiShown = (at = new Date()): FmiWindow => {
  const w = fmiWindow(at);
  if (Math.floor(at.getTime() / 1000) < w.endsAt) return w;
  return fmiWindow(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)));
};

export const fmiEnabled = () => infernoOnlyConfig.enabled && config().enabled;

type Em = typeof postgres.em;

const sqlAll = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

const fresh = (w: FmiWindow): FmiState => ({ key: w.key, kind: w.kind, won: 0, fight: null, last: null, nextId: 1 });

const parseState = (raw: unknown): FmiState | null => {
  try {
    const v = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!v || typeof v !== "object" || !("key" in (v as object))) return null;
    return v as FmiState;
  } catch {
    return null;
  }
};

/** The progress for this window (a new invasion: from the start; admin test mode: its own). */
const stateFor = (stored: FmiState | null, w: FmiWindow, test: boolean): { root: FmiState; s: FmiState } => {
  let root = stored && stored.key === w.key ? stored : { ...fresh(w), test: stored?.test ?? null };
  if (!test) return { root, s: root };
  if (!root.test || root.test.key !== w.key) root = { ...root, test: fresh(w) };
  return { root, s: root.test! };
};

const withFmi = <T>(userid: number, fn: (stored: FmiState | null, em: Em) => Promise<{ value: T; put?: FmiState }>): Promise<T> =>
  postgres.em.fork().transactional(async (em) => {
    const rows = await sqlAll<{ fmi: unknown }>(em, `SELECT fmi FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    if (!rows.length) throw new Error(`No player #${userid}.`);
    const { value, put } = await fn(parseState(rows[0].fmi), em);
    if (put) await sqlAll(em, `UPDATE bym."user" SET fmi = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(put), userid]);
    return value;
  });

const err = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

/** The window as admin test mode sees it: open now, this month's invasion. */
const testWindow = (): FmiWindow => {
  const w = fmiWindow();
  const now = getCurrentDateTime();
  return { ...w, open: true, startsAt: Math.min(w.startsAt, now), endsAt: Math.max(w.endsAt, now + FMI_DAY) };
};

/** What the game is told (flag io_fmi, and every answer): null when the player can't take part. */
export const fmiView = async (user: User, testMode = false, state?: FmiState | null) => {
  if (!fmiEnabled()) return null;
  const eligible = testMode || (await hfoFinalWaveWon(user.userid).catch(() => false));
  if (!eligible) return null;
  await refreshFmiOverride(); // (QoL #398)
  const now = getCurrentDateTime();
  const w = testMode ? testWindow() : fmiShown();
  if (state === undefined) {
    const rows = await sqlAll<{ fmi: unknown }>(postgres.em, `SELECT fmi FROM bym."user" WHERE userid = ?`, [user.userid]);
    state = parseState(rows[0]?.fmi);
  }
  const { s } = stateFor(state ?? null, w, testMode);
  const soon = !w.open && now < w.startsAt && w.startsAt - now <= config().showDaysBefore * FMI_DAY;
  return {
    kind: w.kind,
    key: w.key,
    open: w.open,
    soon,
    startsAt: w.startsAt,
    endsAt: w.endsAt,
    now,
    waves: config().waves,
    won: s.won,
    fight: s.fight,
    last: s.last,
    test: testMode,
    trophies: await readTrophies(user.userid),
  };
};

/** A wave starts: the next one, while the invasion is open. Ends the one before it if it never ended (lost). */
export const fmiWaveStart = async (user: User, wave: number, testMode: boolean) => {
  if (!fmiEnabled()) throw err("The Frozen Monster Invasion isn't on here.");
  if (!testMode && !(await hfoFinalWaveWon(user.userid).catch(() => false))) throw err("Win the last wave of Hell Freezes Over to take on the Frozen Monster Invasion.");
  await refreshFmiOverride(); // (QoL #398)
  const w = testMode ? testWindow() : fmiWindow();
  if (!w.open) throw err("The Frozen Monster Invasion isn't here yet. It comes on the 15th.");
  const now = getCurrentDateTime();
  const fight = await withFmi(user.userid, async (stored) => {
    const { root, s } = stateFor(stored, w, testMode);
    if (s.fight) s.last = { wave: s.fight.wave, result: "lost", destroyed: 100, at: now };
    s.fight = null;
    if (wave !== s.won + 1 || wave > config().waves) throw err(`Wave ${s.won + 1} is the one to fight now.`);
    s.fight = { wave, id: s.nextId++, at: now };
    return { value: s.fight, put: root };
  });
  return { fight, fmi: await fmiView(user, testMode) };
};

/** A wave ended: won (all attackers gone with the yard standing) or lost. A win raises the totem. */
export const fmiWaveEnd = async (user: User, wave: number, id: number, won: boolean, destroyed: number, testMode: boolean) => {
  if (!fmiEnabled()) throw err("The Frozen Monster Invasion isn't on here.");
  await refreshFmiOverride(); // (QoL #398)
  const w = testMode ? testWindow() : fmiWindow();
  const now = getCurrentDateTime();
  const outcome = await withFmi(user.userid, async (stored) => {
    const { root, s } = stateFor(stored, w, testMode);
    const fight = s.fight;
    if (!fight || fight.wave !== wave || fight.id !== id || now - fight.at > FMI_FIGHT_WINDOW) return { value: { stale: true, raised: null as Trophies | null } };
    s.fight = null;
    const least = waveMinSeconds(FMI_LAST_SURGE[s.kind], wave);
    if (won && !testMode && now - fight.at < least) {
      logger.warn(`Frozen Monster Invasion ${s.kind}: player #${user.userid} (${user.username}) reported wave ${wave} won after ${now - fight.at}s (it takes at least ${least}s): counted as lost`);
      won = false;
    }
    const pct = Math.max(0, Math.min(100, Math.round(destroyed) || 0));
    s.last = { wave, result: won ? "won" : "lost", destroyed: pct, at: now };
    let raised: Trophies | null = null;
    if (won) {
      s.won = Math.max(s.won, wave);
      if (!testMode) {
        const level = totemLevel(s.won);
        if (level > 0) raised = { [`fmi${s.kind}`]: level };
      }
    }
    return { value: { stale: false, raised }, put: root };
  });
  if (outcome.raised) {
    await raiseTrophies(user.userid, outcome.raised);
    if (wave === config().waves) {
      logger.info(`Frozen Monster Invasion ${w.kind}: player #${user.userid} (${user.username}) won all ${wave} waves`);
      noteMilestone(user.userid, `#name held off all ${wave} waves of the Frozen Monster Invasion!`);
    }
  }
  return { stale: outcome.stale, fmi: await fmiView(user, testMode) };
};

// ---------------------------------------------------------------------------------------------
// (QoL #398) For the admin panel
// ---------------------------------------------------------------------------------------------

/**
 * The invasion as the game is shown it now, the calendar's (what it would be with no override), the override, and
 * the players' progress in it: how many fought a wave, and how many have won each number of waves (0 to `waves`).
 */
export const fmiAdminState = async () => {
  await refreshFmiOverride(true);
  const shown = fmiShown();
  const waves = config().waves;
  const rows = await sqlAll<{ won: number; n: number }>(
    postgres.em,
    `SELECT LEAST(GREATEST(COALESCE((fmi->>'won')::int, 0), 0), ?)::int AS won, count(*)::int AS n
       FROM bym."user" WHERE fmi IS NOT NULL AND fmi->>'key' = ? GROUP BY 1 ORDER BY 1`,
    [waves, shown.key]
  ).catch(() => []);
  const byWon: number[] = new Array(waves + 1).fill(0);
  for (const r of rows) byWon[Math.max(0, Math.min(waves, Number(r.won) || 0))] += Number(r.n) || 0;
  const fighting = await sqlAll<{ n: number }>(
    postgres.em,
    `SELECT count(*)::int AS n FROM bym."user" WHERE fmi IS NOT NULL AND fmi->>'key' = ? AND jsonb_typeof(fmi->'fight') = 'object' AND COALESCE((fmi->'fight'->>'at')::bigint, 0) > ?`,
    [shown.key, getCurrentDateTime() - FMI_FIGHT_WINDOW]
  ).catch(() => [{ n: 0 }]);
  return {
    enabled: fmiEnabled(),
    shown,
    calendar: calendarWindow(),
    override,
    waves,
    players: byWon.reduce((a, b) => a + b, 0),
    byWon,
    fightingNow: Number(fighting[0]?.n ?? 0),
  };
};

/**
 * One player's progress in the invasion started again (no waves won, no wave under way). Their totems stay: they
 * are theirs for good. Answers what it was ("no progress" when there was none).
 */
export const fmiAdminReset = async (userid: number): Promise<string> => {
  await refreshFmiOverride(true);
  const w = fmiShown();
  return withFmi(userid, async (stored) => {
    const was = stored && stored.key === w.key ? `${stored.won} wave(s) won${stored.fight ? `, fighting wave ${stored.fight.wave}` : ""}` : "no progress";
    if (!stored || stored.key !== w.key) return { value: was };
    return { value: was, put: { ...fresh(w), nextId: Math.max(1, Number(stored.nextId) || 1), test: stored.test ?? null } };
  });
};
