import type { User } from "../../database/models/user.model.js";
import { noteMilestone } from "../../chat/chatBroadcasts.js";
import { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";

/**
 * Hell Freezes Over (the user's hell_freezes_over.md, 1 October): a one-time story event in the player's main
 * yard. Ice creeps in over three days, then 13 waves of ice cretins; winning them all frees the ice champion
 * Rimegrave (IC25), who is then unlocked in the Strongbox like any other monster.
 *
 *  - Off until an admin turns it on (admin panel, Status: Redis key `admin:hfo`). Turned off again, nobody new
 *    starts; anyone who started keeps going.
 *  - It starts for a player (on a load of their own yard, build mode) once every Inferno monster on Strongbox
 *    pages 1-5 is unlocked (Rimegrave and the ice cretins aside) and one page-5 champion (Korath, Drull or
 *    Ashkarr) is at Academy level 2 or more. That moment is t0.
 *  - Day N starts on a load of the yard, no earlier than t0 + N days, and only once day N-1's tasks are done:
 *      Day 1: small ice patches (6 at once, 1 more every 2 hours, 12 in all); all 12 cleared.
 *      Day 2: 5 big patches that can't be broken; a worker sent to try each of them.
 *      Day 3: every defence tower iced; all of them freed. That opens the waves at once (no wait).
 *    Each day's worker lines are dealt from a shuffled deck kept here, so every line is heard before any repeats.
 *    The game finds the free spots for the patches (it knows the yard) and tells the server where they went.
 *  - 13 waves, fought in the main yard (the game runs them). 3 tries each, counted when a wave starts; a win
 *    within them pays 5 shiny (155 for wave 13), once (bym.hfo_claim). All 3 lost: the wave is skipped and the
 *    next opens. Skipped waves can be replayed any time, without tries or pay. All 13 won: Rimegrave is free
 *    (state.done) and may be unlocked in the Strongbox (services/base/lockedMonsters.ts guards that).
 *
 * The player's progress is user.hfo (JSONB), read and written only here, with the player's row locked.
 */

export const HFO = {
  ADMIN_KEY: "admin:hfo",
  DAY: 86_400,
  SMALL_FIRST: 6,
  SMALL_TOTAL: 12,
  SMALL_EVERY: 2 * 3_600,
  BIG_TOTAL: 5,
  LINES: { d1: 6, d2: 5, d3: 4 } as Record<Deck, number>,
  WAVES: 13,
  TRIES: 3,
  WAVE_SHINY: 5,
  FINAL_SHINY: 155,
  /** A wave whose end never came is settled (lost) after this long, or when another starts. */
  FIGHT_WINDOW: 30 * 60,
  RIMEGRAVE: "IC25",
  CHAMPIONS: ["IC9", "IC10", "IC24"],
} as const;

type Deck = "d1" | "d2" | "d3";

/** Every monster on Strongbox pages 1-5 a player needs unlocked (client: CREATURELOCKER.ioHfoQualifyIds). */
export const qualifyMonsters = (): string[] => [
  "IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC15", "IC12", "IC14", "IC20",
  ...(infernoOnlyConfig.rezghul.enabled ? ["C19"] : []),
  ...HFO.CHAMPIONS,
];

/** A patch as stored: [id, x, y, frame]. */
type Patch = [number, number, number, number];

interface WaveState {
  /** Tries used (counted when a wave starts; replays of a skipped wave are not counted). */
  t: number;
  won?: number;
  skipped?: boolean;
}

export interface HfoState {
  t0: number;
  /** 0 waiting for Day 1, 1-3 the days, 4 the waves. */
  day: number;
  /** When each day started (index = day). */
  dayAt: number[];
  small: { spawned: number; cleared: number; patches: Patch[] };
  big: { spawned: number; patches: Patch[]; tried: number[] };
  towers: { iced: number[] | null; thawed: number[] };
  decks: Record<Deck, { left: number[]; heard: number[] }>;
  waves: Record<string, WaveState>;
  fight: { wave: number; id: number; at: number; replay: boolean } | null;
  last: { wave: number; result: "won" | "lost"; paid: number; replay: boolean; skipped: boolean; triesLeft: number; at: number } | null;
  done: number;
  seen: { frozen?: number; reveal?: number };
  nextId: number;
  /** Admin "Next day now": the next day starts on the next load whatever the time and tasks. */
  force?: boolean;
}

// ---------------------------------------------------------------------------------------------
// On or off (the admin switch)
// ---------------------------------------------------------------------------------------------

export const hfoEnabled = async (): Promise<boolean> => {
  if (!infernoOnlyConfig.enabled) return false;
  try {
    return (await redis.get(HFO.ADMIN_KEY)) === "on";
  } catch {
    return false;
  }
};

export const setHfoEnabled = async (on: boolean) => {
  if (on) await redis.set(HFO.ADMIN_KEY, "on");
  else await redis.del(HFO.ADMIN_KEY);
};

// ---------------------------------------------------------------------------------------------
// State, one request at a time per player
// ---------------------------------------------------------------------------------------------

type Em = typeof postgres.em;

const sqlAll = async <T = Record<string, unknown>>(em: Em, sql: string, params: unknown[] = []) =>
  (await em.getConnection().execute(sql, params, "all", em.getTransactionContext())) as T[];

const shuffled = (n: number, avoidFirst = -1): number[] => {
  const out = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // (a new deck never starts with the line just heard)
  if (out.length > 1 && out[0] === avoidFirst) [out[0], out[1]] = [out[1], out[0]];
  return out;
};

const freshState = (now: number): HfoState => ({
  t0: now,
  day: 0,
  dayAt: [now],
  small: { spawned: 0, cleared: 0, patches: [] },
  big: { spawned: 0, patches: [], tried: [] },
  towers: { iced: null, thawed: [] },
  decks: { d1: { left: shuffled(HFO.LINES.d1), heard: [] }, d2: { left: shuffled(HFO.LINES.d2), heard: [] }, d3: { left: shuffled(HFO.LINES.d3), heard: [] } },
  waves: {},
  fight: null,
  last: null,
  done: 0,
  seen: {},
  nextId: 1,
});

const parseState = (raw: unknown): HfoState | null => {
  try {
    const value = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!value || typeof value !== "object" || !("t0" in (value as object))) return null;
    return value as HfoState;
  } catch {
    return null;
  }
};

/** The player's progress as stored, or null (not started). No lock: for showing only. */
export const readHfo = async (userid: number, em: Em = postgres.em): Promise<HfoState | null> => {
  const rows = await sqlAll<{ hfo: unknown }>(em, `SELECT hfo FROM bym."user" WHERE userid = ?`, [userid]);
  return parseState(rows[0]?.hfo);
};

/** Runs `fn` with the player's row locked and their progress (null: not started); what it changes is written. */
const withHfo = <T>(userid: number, fn: (state: HfoState | null, em: Em, put: (s: HfoState | null) => void) => Promise<T>): Promise<T> =>
  postgres.em.fork().transactional(async (em) => {
    const rows = await sqlAll<{ hfo: unknown }>(em, `SELECT hfo FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    if (!rows.length) throw new Error(`No player #${userid}.`);
    const state = parseState(rows[0].hfo);
    const before = JSON.stringify(state);
    let next: HfoState | null = state;
    let replaced = false;
    const result = await fn(state, em, (s) => {
      next = s;
      replaced = true;
    });
    const after = JSON.stringify(next);
    if (replaced || after !== before) {
      await sqlAll(em, `UPDATE bym."user" SET hfo = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [next === null ? null : after, userid]);
    }
    return result;
  });

// ---------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------

/** Small patches the player may have by now: 6 when Day 1 starts, one more every 2 hours, 12 in all. */
export const smallAllowed = (state: HfoState, now: number) => {
  if (state.day < 1) return 0;
  const since = Math.max(0, now - (state.dayAt[1] ?? now));
  return Math.min(HFO.SMALL_TOTAL, HFO.SMALL_FIRST + Math.floor(since / HFO.SMALL_EVERY));
};

const heardAll = (state: HfoState, deck: Deck) => state.decks[deck].heard.length >= HFO.LINES[deck];

/** The current day's tasks are done (the next may start once its time has come). */
export const dayDone = (state: HfoState): boolean => {
  switch (state.day) {
    case 0:
      return true;
    case 1:
      return state.small.cleared >= HFO.SMALL_TOTAL && heardAll(state, "d1");
    case 2:
      return state.big.tried.length >= HFO.BIG_TOTAL && heardAll(state, "d2");
    case 3:
      return towersDone(state);
    default:
      return false;
  }
};

const towersDone = (state: HfoState) => {
  const iced = state.towers.iced;
  if (!iced) return false;
  const thawed = new Set(state.towers.thawed);
  // (the 4 lines are dealt with the first 4 towers freed; a yard with fewer towers is not held up by them)
  return iced.every((id) => thawed.has(id)) && (heardAll(state, "d3") || iced.length < HFO.LINES.d3);
};

/** When the next day may start (by time), or null (Day 3: the waves open as soon as it is done). */
export const nextDayAt = (state: HfoState) => (state.day < 3 ? state.t0 + (state.day + 1) * HFO.DAY : null);

/** On a load of the yard: the next day starts if its time has come and the current day is done. */
const advance = (state: HfoState, now: number): boolean => {
  let moved = false;
  while (state.day < 3) {
    const forced = Boolean(state.force);
    if (!forced && (!dayDone(state) || now < (nextDayAt(state) ?? Infinity))) break;
    state.force = false;
    state.day += 1;
    state.dayAt[state.day] = now;
    moved = true;
    if (forced) break;
  }
  if (state.day === 3 && !state.force && towersDone(state)) {
    // (a yard with no defence towers when Day 3 began: nothing to free, the waves open)
    state.day = 4;
    state.dayAt[4] = now;
    moved = true;
  }
  if (state.day === 3 && state.force) {
    // admin "Next day now" on Day 3: every tower counts as freed, the waves open
    state.force = false;
    state.towers.iced ??= [];
    state.towers.thawed = [...state.towers.iced];
    state.day = 4;
    state.dayAt[4] = now;
    moved = true;
  }
  return moved;
};

const deal = (state: HfoState, deck: Deck): number => {
  const d = state.decks[deck];
  if (!d.left.length) d.left = shuffled(HFO.LINES[deck], d.heard.length ? d.heard[d.heard.length - 1] : -1);
  const line = d.left.shift()!;
  if (!d.heard.includes(line)) d.heard.push(line);
  return line;
};

const waveOf = (state: HfoState, wave: number): WaveState => (state.waves[String(wave)] ??= { t: 0 });

/** The wave to fight: the first neither won nor skipped; WAVES + 1 when all are. */
export const currentWave = (state: HfoState) => {
  for (let w = 1; w <= HFO.WAVES; w++) {
    const s = state.waves[String(w)];
    if (!s?.won && !s?.skipped) return w;
  }
  return HFO.WAVES + 1;
};

const allWon = (state: HfoState) => {
  for (let w = 1; w <= HFO.WAVES; w++) if (!state.waves[String(w)]?.won) return false;
  return true;
};

export const waveShiny = (wave: number) => (wave === HFO.WAVES ? HFO.FINAL_SHINY : HFO.WAVE_SHINY);

/**
 * Does this player qualify: every Strongbox monster on pages 1-5 unlocked (Rimegrave aside). (Until 1 October,
 * night, one page-5 champion also had to be at Academy level 2; the user dropped that.)
 */
export const qualifies = (save: Pick<Save, "lockerdata"> | null | undefined): boolean => {
  if (!save) return false;
  const locker = (save.lockerdata ?? {}) as Record<string, { t?: number | string }>;
  return qualifyMonsters().every((id) => Number(locker[id]?.t) === 2);
};

// ---------------------------------------------------------------------------------------------
// What the game is told (flag io_hfo, and every answer below)
// ---------------------------------------------------------------------------------------------

export const hfoView = (state: HfoState, now = getCurrentDateTime()) => {
  const waves: number[][] = [];
  for (let w = 1; w <= HFO.WAVES; w++) {
    const s = state.waves[String(w)];
    waves.push([s?.t ?? 0, s?.won ? 1 : 0, s?.skipped ? 1 : 0]);
  }
  return {
    day: state.day,
    t0: state.t0,
    dayAt: state.dayAt,
    now,
    nextAt: nextDayAt(state),
    ready: dayDone(state),
    small: { allowed: smallAllowed(state, now), spawned: state.small.spawned, cleared: state.small.cleared, total: HFO.SMALL_TOTAL, every: HFO.SMALL_EVERY, patches: state.small.patches },
    big: { spawned: state.big.spawned, total: HFO.BIG_TOTAL, patches: state.big.patches, tried: state.big.tried },
    towers: state.towers,
    heard: { d1: state.decks.d1.heard.length, d2: state.decks.d2.heard.length, d3: state.decks.d3.heard.length },
    waves,
    current: currentWave(state),
    tries: HFO.TRIES,
    fight: state.fight ? { wave: state.fight.wave, id: state.fight.id, replay: state.fight.replay } : null,
    last: state.last,
    done: state.done,
    seen: state.seen,
  };
};

/**
 * The flag for the game (playerFlags.ts), on the player's own yards in build mode. `atLoad`: a base load (not
 * the half-minute poll): only then may the event start for the player or a new day begin.
 */
export const hfoFlag = async (user: User, atLoad: boolean, testMode = false): Promise<string | null> => {
  if (!infernoOnlyConfig.enabled) return null;
  const now = getCurrentDateTime();
  let state = await readHfo(user.userid);
  if (atLoad && !state && !user.save) await postgres.em.populate(user, ["save"]);
  if (atLoad) {
    const startNow = !state && !testMode && (await hfoEnabled()) && qualifies(user.save);
    const moveOn = !!state && state.day < 4 && (state.force || (dayDone(state) && (state.day === 3 || now >= (nextDayAt(state) ?? Infinity))));
    if (startNow || moveOn) {
      state = await withHfo(user.userid, async (stored, _em, put) => {
        let s = stored;
        if (!s) {
          s = freshState(now);
          put(s);
          logger.info(`Hell Freezes Over: started for player #${user.userid} (${user.username})`);
        }
        if (advance(s, now)) logger.info(`Hell Freezes Over: player #${user.userid} is on day ${s.day}`);
        return s;
      });
    }
  }
  return state ? JSON.stringify(hfoView(state, now)) : null;
};

/** Rimegrave may be unlocked: the player won all 13 waves. */
export const hfoChampionFree = async (userid: number) => Boolean((await readHfo(userid))?.done);

// ---------------------------------------------------------------------------------------------
// The game's requests (controllers/events/hfo.ts)
// ---------------------------------------------------------------------------------------------

const err = (message: string, status = Status.CONFLICT) => new ClientSafeError({ message, status, data: {}, isClientFriendly: true });

const notStarted = () => err("Hell Freezes Over hasn't started for you.");

const toInt = (value: unknown) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : 0;
};

const parseList = (raw: unknown): unknown[] => {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

/** Patches the game placed: [[x, y, frame], ...]. Only as many as the player may have by now. */
export const hfoSpawn = (user: User, kind: string, raw: unknown) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    const now = getCurrentDateTime();
    const list = parseList(raw)
      .filter((p): p is unknown[] => Array.isArray(p) && p.length >= 3)
      .map((p) => [toInt(p[0]), toInt(p[1]), Math.max(1, toInt(p[2]))] as [number, number, number])
      .filter(([x, y]) => Math.abs(x) <= 2000 && Math.abs(y) <= 2000);
    const add = (target: Patch[], count: number, frames: number) => {
      const placed = list.slice(0, Math.max(0, count));
      for (const [x, y, f] of placed) target.push([state.nextId++, x, y, Math.min(frames, f)]);
      return placed.length;
    };
    if (kind === "small") {
      if (state.day < 1) throw err("Not yet.");
      state.small.spawned += add(state.small.patches, smallAllowed(state, now) - state.small.spawned, 5);
    } else if (kind === "big") {
      if (state.day < 2) throw err("Not yet.");
      state.big.spawned += add(state.big.patches, HFO.BIG_TOTAL - state.big.spawned, 3);
    } else throw err("small or big.", Status.BAD_REQUEST);
    return { hfo: hfoView(state, now) };
  });

/** A worker cleared a small patch: it goes, and a Day 1 line is dealt. */
export const hfoClear = (user: User, id: number) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    const index = state.small.patches.findIndex((p) => p[0] === id);
    if (index < 0) return { line: 0, hfo: hfoView(state) };
    state.small.patches.splice(index, 1);
    state.small.cleared += 1;
    return { line: deal(state, "d1"), hfo: hfoView(state) };
  });

/** A worker tried a big patch (it holds): a Day 2 line; only the first try at each patch counts. */
export const hfoTry = (user: User, id: number) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    if (!state.big.patches.some((p) => p[0] === id)) return { line: 0, hfo: hfoView(state) };
    if (!state.big.tried.includes(id)) state.big.tried.push(id);
    return { line: deal(state, "d2"), hfo: hfoView(state) };
  });

/** Day 3: the towers the game iced (once). */
export const hfoTowers = (user: User, raw: unknown) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    let frozen = false;
    if (state.day === 3 && !state.towers.iced) {
      state.towers.iced = [...new Set(parseList(raw).map(toInt).filter((id) => id > 0))].slice(0, 500);
      if (towersDone(state)) {
        // no defence towers to free: the waves open now
        state.day = 4;
        state.dayAt[4] = getCurrentDateTime();
        frozen = true;
      }
    }
    return { frozen, hfo: hfoView(state) };
  });

/**
 * A tower freed (`gone`: it isn't in the yard any more, so it counts as freed with no line). The last one opens
 * the waves (`frozen`: the game shows "Hell has frozen over!").
 */
export const hfoThaw = (user: User, id: number, gone: boolean) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    if (state.day !== 3 || !state.towers.iced?.includes(id) || state.towers.thawed.includes(id)) return { line: 0, frozen: false, hfo: hfoView(state) };
    state.towers.thawed.push(id);
    const line = gone ? 0 : deal(state, "d3");
    let frozen = false;
    if (towersDone(state)) {
      state.day = 4;
      state.dayAt[4] = getCurrentDateTime();
      frozen = true;
      logger.info(`Hell Freezes Over: player #${user.userid} freed every tower, the waves are open`);
    }
    return { line, frozen, hfo: hfoView(state) };
  });

/** A wave whose end never came: lost. */
const settle = (state: HfoState) => {
  const fight = state.fight;
  if (!fight) return;
  state.fight = null;
  const s = waveOf(state, fight.wave);
  if (!fight.replay && !s.won && s.t >= HFO.TRIES) s.skipped = true;
  state.last = { wave: fight.wave, result: "lost", paid: 0, replay: fight.replay, skipped: Boolean(s.skipped), triesLeft: Math.max(0, HFO.TRIES - s.t), at: getCurrentDateTime() };
};

/** A wave starts: the one to fight (a try counted), or a skipped one again (a replay: no tries, no pay). */
export const hfoWaveStart = (user: User, wave: number) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    if (state.day < 4) throw err("The waves haven't begun.");
    if (!Number.isInteger(wave) || wave < 1 || wave > HFO.WAVES) throw err("No such wave.", Status.BAD_REQUEST);
    if (state.fight) settle(state);
    const s = waveOf(state, wave);
    const current = currentWave(state);
    let replay = false;
    if (wave === current) {
      if (s.t >= HFO.TRIES) throw err("No tries left on that wave.");
      s.t += 1;
    } else if (s.skipped && !s.won) replay = true;
    else throw err("That wave can't be fought now.");
    const id = Math.floor(Math.random() * 999_999) + 1;
    state.fight = { wave, id, at: getCurrentDateTime(), replay };
    return { fight: { wave, id, replay }, hfo: hfoView(state) };
  });

/** Pays a wave's shiny into the main yard, once (bym.hfo_claim), in the caller's transaction. */
const claim = async (em: Em, userid: number, wave: number): Promise<number> => {
  const shiny = waveShiny(wave);
  const claimed = await sqlAll(em, `INSERT INTO bym.hfo_claim (userid, wave, shiny) VALUES (?, ?, ?) ON CONFLICT DO NOTHING RETURNING wave`, [userid, wave, shiny]);
  if (!claimed.length) return 0;
  const paid = await sqlAll(em, `UPDATE bym.save SET credits = COALESCE(credits, 0) + ? WHERE userid = ? AND type = ? RETURNING basesaveid`, [shiny, userid, BaseType.MAIN]);
  if (paid.length !== 1) throw new Error(`Hell Freezes Over: no main yard to pay wave ${wave} into for player #${userid}.`);
  return shiny;
};

/** A wave ended: won (every ice cretin gone) or lost (the yard 99% destroyed, or given up). */
export const hfoWaveEnd = async (user: User, wave: number, id: number, won: boolean) => {
  const outcome = await withHfo(user.userid, async (state, em) => {
    if (!state) throw notStarted();
    const fight = state.fight;
    if (!fight || fight.wave !== wave || fight.id !== id) return { stale: true, paid: 0, hfo: hfoView(state) };
    state.fight = null;
    const s = waveOf(state, wave);
    let paid = 0;
    if (won) {
      const first = !s.won;
      s.won ??= getCurrentDateTime();
      s.skipped = false;
      if (first && !fight.replay && s.t <= HFO.TRIES) paid = await claim(em, user.userid, wave);
    } else if (!fight.replay && s.t >= HFO.TRIES) s.skipped = true;
    state.last = { wave, result: won ? "won" : "lost", paid, replay: fight.replay, skipped: Boolean(s.skipped), triesLeft: Math.max(0, HFO.TRIES - s.t), at: getCurrentDateTime() };
    if (!state.done && allWon(state)) {
      state.done = getCurrentDateTime();
      logger.info(`Hell Freezes Over: player #${user.userid} (${user.username}) won all ${HFO.WAVES} waves: Rimegrave is free`);
      noteMilestone(user.userid, "#name beat Hell Freezes Over and freed Rimegrave, the ice champion!");
    }
    return { stale: false, paid, hfo: hfoView(state) };
  });
  // (this request's copy of the main yard, so the shiny shows at once and a later write keeps it)
  if (outcome.paid && user.save) user.save.credits = (user.save.credits ?? 0) + outcome.paid;
  return outcome;
};

/** The game showed a one-time moment: "frozen" (Hell has frozen over!) or "reveal" (Rimegrave freed). */
export const hfoSeen = (user: User, what: string) =>
  withHfo(user.userid, async (state) => {
    if (!state) throw notStarted();
    if (what === "frozen" || what === "reveal") state.seen[what] ??= getCurrentDateTime();
    return { hfo: hfoView(state) };
  });

/** The event window (and anything else that wants it now). */
export const hfoStatus = async (user: User) => {
  const state = await withHfo(user.userid, async (s) => {
    if (s?.fight && getCurrentDateTime() - s.fight.at > HFO.FIGHT_WINDOW) settle(s);
    return s;
  });
  return { enabled: await hfoEnabled(), hfo: state ? hfoView(state) : null };
};

// ---------------------------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------------------------

/** A player's progress in one line's worth of numbers. */
export const hfoProgress = async (userid: number) => {
  const state = await readHfo(userid);
  if (!state) return null;
  const view = hfoView(state);
  const won = view.waves.filter((w) => w[1]).length;
  const skipped = view.waves.filter((w) => w[2] && !w[1]).length;
  const paid = (await sqlAll<{ total: number }>(postgres.em, `SELECT COALESCE(SUM(shiny), 0)::int AS total FROM bym.hfo_claim WHERE userid = ?`, [userid]))[0]?.total ?? 0;
  return {
    started: state.t0,
    day: state.day,
    nextAt: view.nextAt,
    ready: view.ready,
    small: `${state.small.cleared}/${HFO.SMALL_TOTAL} cleared (${state.small.spawned} spawned)`,
    big: `${state.big.tried.length}/${HFO.BIG_TOTAL} tried`,
    towers: state.towers.iced ? `${state.towers.thawed.length}/${state.towers.iced.length} freed` : "-",
    won,
    skipped,
    current: view.current,
    paid,
    done: state.done,
  };
};

/** Counts for the Status card. */
export const hfoCounts = async () => {
  const rows = await sqlAll<{ started: number; waves: number; done: number }>(
    postgres.em,
    `SELECT count(*)::int AS started, (count(*) FILTER (WHERE (hfo->>'day')::int >= 4))::int AS waves,
            (count(*) FILTER (WHERE COALESCE((hfo->>'done')::bigint, 0) > 0))::int AS done
     FROM bym."user" WHERE hfo IS NOT NULL`
  );
  return { enabled: await hfoEnabled(), ...(rows[0] ?? { started: 0, waves: 0, done: 0 }) };
};

/** Starts it for a player now, whatever the switch and whether they qualify. */
export const hfoAdminStart = (userid: number) =>
  withHfo(userid, async (state, _em, put) => {
    if (state) throw err("It has already started for this player.");
    put(freshState(getCurrentDateTime()));
  });

/** The next day starts on the player's next load of their yard, whatever the time and tasks. */
export const hfoAdminNextDay = (userid: number) =>
  withHfo(userid, async (state) => {
    if (!state) throw err("It hasn't started for this player.");
    if (state.day >= 4) throw err("The player is already on the waves.");
    state.force = true;
    return state.day + 1;
  });

/** Clears the player's progress (they may start again). Shiny paid stays paid, and is not paid again. */
export const hfoAdminReset = (userid: number) =>
  withHfo(userid, async (_state, _em, put) => {
    put(null);
  });
