import { Save } from "../../database/models/save.model.js";
import { noteMilestone } from "../../chat/chatBroadcasts.js";
import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { descentTemplate } from "../../game-data/tribes/devil/molochStrongholds.js";
import type { SaveData } from "../../types/EntityData.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { updateResources } from "../base/updateResources.js";
import { logger } from "../../utils/logger.js";
import { questBest } from "../quests/questProgress.js";

/**
 * Moloch's Gauntlet: a monthly event, a ladder of Moloch yards attacked from the main yard (not the map).
 *
 *  - Open for the first `days` days of each month (UTC), or when an admin opens it (admin panel). Progress
 *    belongs to the calendar month (UTC): on the 1st everything starts again and every reward can be won
 *    again. An admin's "Close now" lasts until the next month's opening at most.
 *  - Stage N is the Inferno's descent yard N (weakest first). Every player gets their own copy of each
 *    yard, stored as a tribe Save with a baseid of its own (gauntletBaseId), so its damage stays between
 *    attempts and the normal attack load and save do the fighting.
 *  - A stage is beaten when an attack ends with `winPercent`% of it destroyed. Beating it pays its reward
 *    and opens the next stage.
 *  - `attempts` attempts per yard: an attempt is counted when the attack starts. When they are used up
 *    without beating it, the yard is fully healed, its attempts start again, and its reward is lost for
 *    good this month: beating it later still opens the next stage, but pays nothing.
 *
 * Paid once, whatever happens: every reward paid is a row of bym.gauntlet_claim, keyed by player, month
 * and stage, written in the same transaction as the shiny and resources. A second payment of the same
 * stage in the same month can't be written (the key), so nothing pays twice: not two saves at once, not a
 * save sent again, not an attack that never ended settled twice, not an admin's "Start again".
 * A player's progress (user.gauntlet) is only read and written with that player's row locked, one request
 * at a time, and only through this file (it is not an entity property, so a stale copy of the user can't
 * write it back). Every save to a Gauntlet yard must belong to the attack the server started last on it
 * (its attack id, this month, within 30 minutes); anything else is refused and writes nothing.
 *
 * Admin test mode plays a test ladder of its own (user.gauntlet.test, yards with their own baseids): always
 * open, counted like the real one so every stage can be tried, but nothing is paid and nothing is claimed,
 * and it goes when test mode is switched off (clearTestGauntlet). The real ladder is left alone meanwhile.
 */

const config = () => infernoOnlyConfig.gauntlet;

type Resources = { r1: number; r2: number; r3: number; r4: number };
type Reward = { shiny: number } & Resources;

/** How long after an attack starts its saves are taken (attacks last minutes; this is generous). */
export const GAUNTLET_ATTACK_WINDOW = 30 * 60;

export interface GauntletStage {
  /** Attempts used on this yard since it was last healed. */
  a: number;
  /** When it was beaten (epoch seconds). */
  won?: number;
  /** Its reward was lost: every attempt used up once without beating it. */
  lost?: boolean;
  /** Test ladder only: beaten with its reward on (shown as paid; nothing is). */
  paid?: boolean;
}

export interface GauntletResult {
  stage: number;
  result: "won" | "failed" | "healed";
  /** What was paid (won with the reward still on). */
  reward?: Reward;
  /** Reward already lost when it was beaten. */
  lost?: boolean;
  /** Beaten again after an admin started the ladder again: paid the first time, not again. */
  already?: boolean;
  /** Admin test mode: what it would have paid (nothing is). */
  test?: boolean;
  attemptsLeft?: number;
  at: number;
}

/** The attack running now (the only one whose saves are taken). */
export interface GauntletFight {
  stage: number;
  attackid: number;
  at: number;
}

export interface GauntletState {
  month: string;
  stages: Record<string, GauntletStage>;
  last?: GauntletResult | null;
  fight?: GauntletFight | null;
  /** Admin test mode's ladder. */
  test?: GauntletState | null;
}

// ---------------------------------------------------------------------------------------------
// When it is open
// ---------------------------------------------------------------------------------------------

const OVERRIDE_KEY = "admin:gauntlet";

interface Override {
  state: "open" | "closed";
  /** Until when (epoch seconds). Closed: the next month's opening at most. */
  until?: number;
}

/** The month progress belongs to: the calendar month, UTC ("2026-10"). */
export const monthKey = (date = new Date()) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const nextMonthStart = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000;

export interface GauntletWindow {
  open: boolean;
  /** The month progress counts for: always this calendar month (UTC). */
  month: string;
  /** Open: when it closes. Closed: when it opens next. Epoch seconds. */
  closesAt: number | null;
  opensAt: number | null;
  /** Set by an admin (admin panel) rather than the calendar. */
  forced: boolean;
}

const readOverride = async (now: number): Promise<Override | null> => {
  try {
    const raw = await redis.get(OVERRIDE_KEY);
    if (!raw) return null;
    const override = JSON.parse(raw) as Override;
    // A "Close now" from before it had an end: it ends with this month.
    if (override.state === "closed" && !override.until) {
      override.until = nextMonthStart(new Date(now * 1000));
      await redis.set(OVERRIDE_KEY, JSON.stringify(override));
    }
    if (!override.until || override.until <= now) {
      await redis.del(OVERRIDE_KEY);
      return null;
    }
    return override;
  } catch {
    return null;
  }
};

export const gauntletWindow = async (at = new Date()): Promise<GauntletWindow> => {
  const month = monthKey(at);
  if (!config().enabled) return { open: false, month, closesAt: null, opensAt: null, forced: false };

  const now = Math.floor(at.getTime() / 1000);
  const { days } = config();
  const nextStart = nextMonthStart(at);
  const calendarOpen = at.getUTCDate() <= days;
  const calendarClose = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), days + 1) / 1000;
  const override = await readOverride(now);

  if (override?.state === "open") {
    // Opened by an admin: until then, or the calendar's end if that is later.
    const closesAt = calendarOpen ? Math.max(override.until!, calendarClose) : override.until!;
    return { open: true, month, closesAt, opensAt: null, forced: true };
  }
  if (override?.state === "closed" || !calendarOpen) {
    return { open: false, month, closesAt: null, opensAt: nextStart, forced: override?.state === "closed" };
  }
  return { open: true, month, closesAt: calendarClose, opensAt: null, forced: false };
};

/**
 * Admin panel: open it now (for `days` days), close it now (until the next month's opening at most: the
 * 1st always opens it), or back to the calendar.
 */
export const setGauntletOverride = async (state: "open" | "closed" | "auto") => {
  if (state === "auto") {
    await redis.del(OVERRIDE_KEY);
    return;
  }
  const until = state === "open" ? getCurrentDateTime() + config().days * 86400 : nextMonthStart(new Date());
  await redis.set(OVERRIDE_KEY, JSON.stringify({ state, until } satisfies Override));
};

// ---------------------------------------------------------------------------------------------
// The yards
// ---------------------------------------------------------------------------------------------

/** 15 digits starting with 9: above every Map Room 2 baseid (14 digits) and Map Room 3's (15, starting with 3). */
const GAUNTLET_BASE = 900_000_000_000_000;
/** Admin test mode's yards: stage + 50. */
const TEST_OFFSET = 50;

export const gauntletBaseId = (userid: number, stage: number, test = false) =>
  String(GAUNTLET_BASE + userid * 100 + (test ? TEST_OFFSET : 0) + stage);

/** The player and stage of a Gauntlet yard's baseid, or null for any other yard. */
export const parseGauntletBaseId = (baseid: string | number | null | undefined) => {
  const text = String(baseid ?? "");
  if (text.length !== 15 || !text.startsWith("9")) return null;
  const offset = Number(text) - GAUNTLET_BASE;
  const raw = offset % 100;
  const test = raw > TEST_OFFSET;
  const stage = test ? raw - TEST_OFFSET : raw;
  const userid = Math.floor(offset / 100);
  if (!Number.isSafeInteger(offset) || offset <= 0 || stage < 1 || stage > Math.min(config().stages, TEST_OFFSET - 1)) return null;
  return { userid, stage, test };
};

export const isGauntletBaseId = (baseid: string | number | null | undefined) => parseGauntletBaseId(baseid) !== null;

const yardIds = (userid: number, test = false) => Array.from({ length: config().stages }, (_, i) => gauntletBaseId(userid, i + 1, test));

/** The descent yard a stage uses (201 is the first); stages past 13 repeat the last one. */
const template = (stage: number): SaveData => {
  const number = Math.min(13, Math.max(1, stage));
  // (with the layout an admin designed for that descent base, if any: services/admin/designs.ts)
  const found = descentTemplate(number);
  if (!found) throw new Error(`No descent yard ${number} for Gauntlet stage ${stage}.`);
  return found;
};

/** The level shown for a stage: from about 4 up to 50 at the last one. */
export const stageLevel = (stage: number) => Math.max(1, Math.round((stage * 50) / config().stages));

export const stageReward = (stage: number): Reward => {
  const { stages, stageShiny, finalShiny, finalResources } = config();
  const share = stage / stages;
  const round = (amount: number) => Math.round((amount * share) / 100_000) * 100_000;
  return {
    shiny: stageShiny + (stage === stages ? finalShiny : 0),
    r1: round(finalResources.r1),
    r2: round(finalResources.r2),
    r3: round(finalResources.r3),
    r4: round(finalResources.r4),
  };
};

type Em = typeof postgres.em;

/** A fresh copy of a stage's yard for this player: no loot in it (the stage reward replaces loot). */
const newYard = (em: Em, userid: number, stage: number, test: boolean): Save => {
  const { baseid: _reserved, ...yard } = template(stage);
  return em.create(
    Save,
    {
      ...yard,
      baseid: gauntletBaseId(userid, stage, test),
      type: BaseType.TRIBE,
      wmid: 0,
      userid: 0,
      saveuserid: 0,
      worldid: null,
      level: stageLevel(stage),
      name: `Moloch's Gauntlet ${stage}`,
      resources: { r1: 0, r2: 0, r3: 0, r4: 0 },
      buildingresources: {},
      buildinghealthdata: {},
      damage: 0,
      destroyed: 0,
      attackid: 0,
      savetime: getCurrentDateTime(),
      createtime: getCurrentDateTime(),
    } as never,
    { partial: true }
  ) as Save;
};

const healedMonsters = (stage: number) => JSON.parse(JSON.stringify(template(stage).monsters ?? {}));

/** Fully healed: no damage, its defenders back. */
export const healYard = (yard: Save, stage: number) => {
  yard.buildinghealthdata = {};
  yard.damage = 0;
  yard.destroyed = 0;
  yard.monsters = healedMonsters(stage);
};

// ---------------------------------------------------------------------------------------------
// Progress, one request at a time per player
// ---------------------------------------------------------------------------------------------

const sqlAll = async <T = Record<string, unknown>>(em: Em, sql: string, params: unknown[] = []) =>
  (await em.getConnection().execute(sql, params, "all", em.getTransactionContext())) as T[];

const parseState = (raw: unknown): GauntletState | null => {
  const value = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
  if (!value || typeof value !== "object") return null;
  const state = value as GauntletState;
  state.stages ??= {};
  return state;
};

const freshState = (month: string): GauntletState => ({ month, stages: {}, last: null, fight: null });

/** The player's progress as stored (no lock: for showing only). This month's, or a fresh one. */
export const readState = async (userid: number, month = monthKey(), test = false): Promise<GauntletState> => {
  const rows = await sqlAll<{ gauntlet: unknown }>(postgres.em, `SELECT gauntlet FROM bym."user" WHERE userid = ?`, [userid]);
  const root = parseState(rows[0]?.gauntlet);
  const stored = test ? parseState(root?.test) : root;
  return stored && stored.month === month ? stored : freshState(month);
};

/**
 * Runs `fn` in a transaction with the player's row locked (so a player's Gauntlet requests run one after
 * the other) and their progress for this calendar month: a new month starts it again (last month's yards
 * are removed). What `fn` changes in the state is written when it returns; if it throws, nothing is.
 */
const withState = <T>(userid: number, fn: (state: GauntletState, em: Em) => Promise<T>, test = false): Promise<T> =>
  postgres.em.fork().transactional(async (em) => {
    const month = monthKey();
    const rows = await sqlAll<{ gauntlet: unknown }>(em, `SELECT gauntlet FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    if (!rows.length) throw new Error(`No player #${userid}.`);
    const root = parseState(rows[0].gauntlet);
    // Admin test mode's ladder lives inside the real one's record (which it leaves as it is).
    const stored = test ? parseState(root?.test) : root;
    let state = stored;
    if (!state || state.month !== month) {
      const ids = yardIds(userid, test);
      await sqlAll(em, `DELETE FROM bym.save WHERE type = ? AND baseid IN (${ids.map(() => "?").join(", ")}) RETURNING basesaveid`, [BaseType.TRIBE, ...ids]);
      state = freshState(month);
      // (a new month's real ladder keeps the test one, if any)
      if (!test && root?.test) state.test = root.test;
    }
    const before = state === stored ? JSON.stringify(state) : "";
    const result = await fn(state, em);
    const after = JSON.stringify(state);
    if (after !== before) {
      const write = test ? JSON.stringify({ ...(root ?? freshState(month)), test: state }) : after;
      await sqlAll(em, `UPDATE bym."user" SET gauntlet = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [write, userid]);
    }
    return result;
  });

const stageOf = (state: GauntletState, stage: number): GauntletStage => (state.stages[String(stage)] ??= { a: 0 });

/** The stage being fought: the first one not beaten; stages + 1 when all are. */
export const currentStage = (state: GauntletState) => {
  for (let stage = 1; stage <= config().stages; stage++) if (!state.stages[String(stage)]?.won) return stage;
  return config().stages + 1;
};

/** The stages paid this month (bym.gauntlet_claim; the test ladder: as it marked them). */
const paidStages = async (em: Em, userid: number, month: string, test = false, state?: GauntletState) =>
  test
    ? new Set(Object.entries(state?.stages ?? {}).filter(([, s]) => s.paid).map(([stage]) => Number(stage)))
    : new Set(
    (await sqlAll<{ stage: number }>(em, `SELECT stage FROM bym.gauntlet_claim WHERE userid = ? AND month = ?`, [userid, month])).map((row) =>
      Number(row.stage)
    )
  );

/**
 * Pays a stage's reward into the main yard, in the caller's transaction, if it was not paid this month:
 * the claim row and the payment are written together or not at all. Returns what was paid, or null.
 */
const claimReward = async (em: Em, userid: number, month: string, stage: number): Promise<Reward | null> => {
  const reward = stageReward(stage);
  const claimed = await sqlAll(
    em,
    `INSERT INTO bym.gauntlet_claim (userid, month, stage, shiny, r1, r2, r3, r4) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT DO NOTHING RETURNING stage`,
    [userid, month, stage, reward.shiny, reward.r1, reward.r2, reward.r3, reward.r4]
  );
  if (!claimed.length) return null;
  const paid = await sqlAll(
    em,
    `UPDATE bym.save SET credits = COALESCE(credits, 0) + ?,
       resources = COALESCE(resources, '{}'::jsonb) || jsonb_build_object(
         'r1', COALESCE((resources->>'r1')::numeric, 0) + ?, 'r2', COALESCE((resources->>'r2')::numeric, 0) + ?,
         'r3', COALESCE((resources->>'r3')::numeric, 0) + ?, 'r4', COALESCE((resources->>'r4')::numeric, 0) + ?)
     WHERE userid = ? AND type = ? RETURNING basesaveid`,
    [reward.shiny, reward.r1, reward.r2, reward.r3, reward.r4, userid, BaseType.MAIN]
  );
  // No main yard to pay into: the claim goes too (the transaction is rolled back).
  if (paid.length !== 1) throw new Error(`Gauntlet: no main yard to pay stage ${stage} into for player #${userid}.`);
  return reward;
};

/**
 * The payment, on this request's copy of the main yard as well, so it shows at once and a later write of
 * that copy keeps it (the database has it already).
 */
const mirrorReward = (mainSave: Save | undefined | null, reward: Reward | null | undefined) => {
  if (!mainSave || !reward) return;
  mainSave.credits = (mainSave.credits ?? 0) + reward.shiny;
  mainSave.resources = updateResources({ r1: reward.r1, r2: reward.r2, r3: reward.r3, r4: reward.r4 }, (mainSave.resources ?? {}) as never) as never;
};

/**
 * An attack on the stage being fought ends with `damage`% of the yard destroyed: beaten (and paid, once),
 * or one attempt gone; the last failed attempt loses the reward and heals the yard (`heal`: the caller does
 * it). The attack is over: no more of its saves are taken.
 */
const finish = async (em: Em, userid: number, state: GauntletState, stage: number, damage: number, test = false) => {
  const s = stageOf(state, stage);
  const at = getCurrentDateTime();
  state.fight = null;
  let heal = false;
  let reward: Reward | null = null;
  if (damage >= config().winPercent) {
    const firstWin = !s.won;
    s.won = at;
    if (test) {
      // Admin test mode: what it would pay, shown; nothing is paid or claimed.
      const would = s.lost || s.paid ? null : stageReward(stage);
      if (would) s.paid = true;
      state.last = { stage, result: "won", reward: would ?? undefined, lost: Boolean(s.lost), already: false, test: true, at };
      return { heal, reward: null };
    }
    reward = s.lost ? null : await claimReward(em, userid, state.month, stage);
    // Inferno-only quest book: the furthest gate beaten
    void questBest(userid, "gauntlet_best", stage);
    state.last = { stage, result: "won", reward: reward ?? undefined, lost: Boolean(s.lost), already: !s.lost && !reward, at };
    logger.info(
      `Gauntlet: stage ${stage} beaten by player #${userid} (${state.month})${reward ? `, paid ${reward.shiny} shiny` : s.lost ? " (reward lost)" : " (paid already)"}`
    );
    if (firstWin && stage === config().stages) noteMilestone(userid, "#name conquered Moloch's Gauntlet this month!");
  } else if (s.a >= config().attempts) {
    s.lost = true;
    s.a = 0;
    heal = true;
    state.last = { stage, result: "healed", lost: true, attemptsLeft: config().attempts, at, ...(test && { test: true }) };
  } else {
    state.last = { stage, result: "failed", lost: Boolean(s.lost), attemptsLeft: config().attempts - s.a, at, ...(test && { test: true }) };
  }
  return { heal, reward };
};

/** The yard of a stage as stored: its damage, and a heal written straight to it. */
const yardDamage = async (em: Em, userid: number, stage: number, test: boolean) =>
  Number(
    (await sqlAll<{ damage: number }>(em, `SELECT damage FROM bym.save WHERE type = ? AND baseid = ?`, [BaseType.TRIBE, gauntletBaseId(userid, stage, test)]))[0]
      ?.damage ?? 0
  );

const healStored = (em: Em, userid: number, stage: number, test: boolean) =>
  sqlAll(
    em,
    `UPDATE bym.save SET buildinghealthdata = '{}'::jsonb, damage = 0, destroyed = 0, monsters = CAST(? AS jsonb), attackid = 0
     WHERE type = ? AND baseid = ? RETURNING basesaveid`,
    [JSON.stringify(healedMonsters(stage)), BaseType.TRIBE, gauntletBaseId(userid, stage, test)]
  );

/**
 * An attack that never sent its last save (the game closed, the connection lost) ends by what its last
 * save left: `olderThan` 0 ends it whatever its age (another attack is starting), otherwise only once its
 * saves are no longer taken.
 */
const settleOpenFight = async (em: Em, userid: number, state: GauntletState, olderThan: number, test = false) => {
  const fight = state.fight;
  if (!fight) return null;
  if (fight.stage !== currentStage(state)) {
    state.fight = null;
    return null;
  }
  if (getCurrentDateTime() - fight.at < olderThan) return null;
  const { heal, reward } = await finish(em, userid, state, fight.stage, await yardDamage(em, userid, fight.stage, test), test);
  if (heal) await healStored(em, userid, fight.stage, test);
  return reward;
};

// ---------------------------------------------------------------------------------------------
// The game's requests
// ---------------------------------------------------------------------------------------------

/** The whole ladder, for the Gauntlet window in the game. */
export const gauntletStatus = async (user: User, testMode = false) => {
  // Admin test mode: the test ladder, always open.
  const window: GauntletWindow = testMode
    ? { open: true, month: monthKey(), closesAt: null, opensAt: null, forced: true }
    : await gauntletWindow();
  const { stages, attempts, winPercent } = config();
  const ids = yardIds(user.userid, testMode);
  const { state, damage, paid, reward } = await withState(
    user.userid,
    async (state, em) => {
      const reward = await settleOpenFight(em, user.userid, state, GAUNTLET_ATTACK_WINDOW, testMode);
      const rows = await sqlAll<{ baseid: string; damage: number }>(
        em,
        `SELECT baseid, damage FROM bym.save WHERE type = ? AND baseid IN (${ids.map(() => "?").join(", ")})`,
        [BaseType.TRIBE, ...ids]
      );
      return {
        state,
        reward,
        damage: new Map(rows.map((row) => [String(row.baseid), Number(row.damage ?? 0)])),
        paid: await paidStages(em, user.userid, state.month, testMode, state),
      };
    },
    testMode
  );
  mirrorReward(user.save, reward);
  const current = currentStage(state);

  return {
    open: window.open,
    forced: window.forced,
    test: testMode,
    month: state.month,
    closesAt: window.closesAt,
    opensAt: window.opensAt,
    now: getCurrentDateTime(),
    winPercent,
    attempts,
    current,
    finished: current > stages,
    stages: Array.from({ length: stages }, (_, i) => {
      const stage = i + 1;
      const s = state.stages[String(stage)] ?? { a: 0 };
      const fighting = state.fight?.stage === stage;
      // Attempts used up by attacks that never ended properly: it is healed (and its reward lost) when
      // the next attack starts, so that is what the player is shown.
      const spent = !s.won && !fighting && s.a >= attempts;
      return {
        stage,
        baseid: gauntletBaseId(user.userid, stage, testMode),
        level: stageLevel(stage),
        won: Boolean(s.won),
        lost: Boolean(s.lost) || spent,
        /** Its reward was paid this month (so it pays nothing more, even beaten again). */
        paid: paid.has(stage),
        attemptsLeft: s.won ? 0 : spent ? attempts : Math.max(0, attempts - s.a),
        damage: s.won ? 100 : spent ? 0 : (damage.get(gauntletBaseId(user.userid, stage, testMode)) ?? 0),
        reward: stageReward(stage),
      };
    }),
    last: state.last ?? null,
  };
};

const closedErr = () =>
  new ClientSafeError({ message: "Moloch's Gauntlet is closed. It opens again on the 1st of the month.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
const wrongStageErr = () =>
  new ClientSafeError({ message: "That yard of the Gauntlet is not the one to fight now. Open the Gauntlet again to see where you are.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
const attackEndedErr = () =>
  new ClientSafeError({ message: "This Gauntlet attack has already ended, so it can't be saved. Please return home.", status: Status.CONFLICT, data: {}, isClientFriendly: true });
const testLadderErr = (testMode: boolean) =>
  new ClientSafeError({
    message: testMode
      ? "In admin test mode you play the Gauntlet's test ladder. Open the Gauntlet again."
      : "That was the Gauntlet's test ladder, and admin test mode is off. Open the Gauntlet again.",
    status: Status.CONFLICT,
    data: {},
    isClientFriendly: true,
  });
const notYoursErr = () =>
  new ClientSafeError({ message: "That yard of the Gauntlet is not yours.", status: Status.FORBIDDEN, data: {}, isClientFriendly: true });

/**
 * An attack on a Gauntlet yard starts (base/load, attack mode): only the stage being fought, only while
 * it is open. Ends the attack before it if it never ended, counts the attempt, heals a yard whose attempts
 * are used up (its reward lost), and gives the attack an id of its own: only its saves are taken.
 * Returns the yard to attack.
 */
export const gauntletAttack = async (user: User, baseid: string, testMode: boolean): Promise<Save> => {
  const parsed = parseGauntletBaseId(baseid);
  if (!parsed || parsed.userid !== user.userid) throw notYoursErr();
  if (parsed.test !== testMode) throw testLadderErr(testMode);
  // (admin test mode's ladder is always open)
  if (!testMode && !(await gauntletWindow()).open) throw closedErr();
  const { stage } = parsed;

  const outcome = await withState(
    user.userid,
    async (state, em) => {
      const reward = await settleOpenFight(em, user.userid, state, 0, testMode);
      if (currentStage(state) !== stage) return { error: "stage" as const, reward };

      let yard = await em.findOne(Save, { type: BaseType.TRIBE, baseid: gauntletBaseId(user.userid, stage, testMode) });
      if (!yard) {
        yard = newYard(em, user.userid, stage, testMode);
        em.persist(yard);
      }

      const s = stageOf(state, stage);
      if (s.a >= config().attempts) {
        // Its attempts were used up (an old progress record): healed, reward lost.
        healYard(yard, stage);
        s.lost = true;
        s.a = 0;
      }
      s.a += 1;
      const attackid = Math.floor(Math.random() * 99999) + 1;
      yard.attackid = attackid;
      yard.savetime = getCurrentDateTime();
      state.fight = { stage, attackid, at: getCurrentDateTime() };
      await em.flush();
      return { basesaveid: yard.basesaveid, reward };
    },
    testMode
  );

  mirrorReward(user.save, outcome.reward);
  if ("error" in outcome) throw wrongStageErr();
  const yard = await postgres.em.findOne(Save, { basesaveid: outcome.basesaveid }, { refresh: true });
  if (!yard) throw wrongStageErr();
  return yard;
};

const toInt = (value: unknown) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Every save to a Gauntlet yard during an attack (base/save), before anything of it is written: it must be
 * the player's own yard and belong to the attack running on it (the one the server started last, this
 * month, not ended, within GAUNTLET_ATTACK_WINDOW). Anything else is refused, so a save sent again, a
 * second game or a stale attack writes nothing and pays nothing. The attack's last save (`over`) ends it:
 * beaten and paid (once), or one attempt gone. Returns `heal`: the last failed attempt, the caller heals
 * the yard after writing the save.
 */
export const gauntletSaveCheck = async (user: User, yard: Save, body: Record<string, unknown>, over: boolean, testMode = false) => {
  const parsed = parseGauntletBaseId(yard.baseid);
  if (!parsed || parsed.userid !== user.userid) throw notYoursErr();
  if (parsed.test !== testMode) throw testLadderErr(testMode);
  const { stage } = parsed;
  const attackid = toInt(body.attackid);
  const damage = body.damage !== undefined && body.damage !== null && body.damage !== "" ? toInt(body.damage) : Number(yard.damage ?? 0);

  const outcome = await withState(user.userid, async (state, em) => {
    const fight = state.fight;
    const s = stageOf(state, stage);
    const live =
      !!fight &&
      fight.stage === stage &&
      fight.attackid === attackid &&
      fight.attackid === Number(yard.attackid) &&
      getCurrentDateTime() - fight.at <= GAUNTLET_ATTACK_WINDOW &&
      !s.won &&
      currentStage(state) === stage;
    if (!live) return { refused: true, heal: false, reward: null };
    if (!over) return { refused: false, heal: false, reward: null };
    return { refused: false, ...(await finish(em, user.userid, state, stage, damage, testMode)) };
  }, testMode);

  if (outcome.refused) {
    logger.warn(`Gauntlet: save refused for player #${user.userid}, stage ${stage} (attack ${attackid}, not the attack running)`);
    throw attackEndedErr();
  }
  mirrorReward(user.save, outcome.reward);
  return { heal: outcome.heal };
};

// ---------------------------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------------------------

/** A player's progress this month. */
export const gauntletProgress = async (user: User) => {
  const state = await readState(user.userid);
  const stage = currentStage(state);
  const paid = await paidStages(postgres.em, user.userid, state.month);
  return {
    month: state.month,
    stage,
    finished: stage > config().stages,
    lost: Object.values(state.stages).filter((s) => s.lost).length,
    paid: paid.size,
  };
};

/**
 * Starts the player's ladder again this month: yards healed (removed), progress cleared. Rewards already
 * paid this month are not paid again (bym.gauntlet_claim keeps them).
 */
export const resetGauntlet = async (user: User) =>
  withState(user.userid, async (state, em) => {
    const ids = yardIds(user.userid);
    await sqlAll(em, `DELETE FROM bym.save WHERE type = ? AND baseid IN (${ids.map(() => "?").join(", ")}) RETURNING basesaveid`, [BaseType.TRIBE, ...ids]);
    state.stages = {};
    state.last = null;
    state.fight = null;
  });

/** Admin test mode switched on or off: its test ladder and yards go (the real ladder stays as it was). */
export const clearTestGauntlet = async (userid: number) =>
  postgres.em.fork().transactional(async (em) => {
    const ids = yardIds(userid, true);
    await sqlAll(em, `SELECT userid FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
    await sqlAll(em, `DELETE FROM bym.save WHERE type = ? AND baseid IN (${ids.map(() => "?").join(", ")}) RETURNING basesaveid`, [BaseType.TRIBE, ...ids]);
    await sqlAll(em, `UPDATE bym."user" SET gauntlet = gauntlet - 'test' WHERE userid = ? AND gauntlet IS NOT NULL RETURNING userid`, [userid]);
  });
