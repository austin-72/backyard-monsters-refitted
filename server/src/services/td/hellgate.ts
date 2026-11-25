import { Save } from "../../database/models/save.model.js";
import { hellgateWavesIn, noteHellgateRun } from "../anticheat/requestChecks.js";
import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: Hellgate Defense, the tower defense minigame (the button under the workers, above Moloch's
 * Gauntlet; the game's side is com/monsters/td). The user's design (6 October):
 *
 *  - A yard of its own, opened afresh for every run: an empty arena walled in on every side but two
 *    openings, at its far left and far right corners (as the yard is drawn). The monsters come in on the
 *    left; the Town Hall stands on the right just past the walls. The player gets walls to place with the
 *    Yard Planner between waves (the maze is locked while a wave is on), and buys towers with the run's gold.
 *  - Endless waves, harder and harder, the champions as bosses; the score is the waves survived. Free to
 *    play, for fun and the Leaderboards' Hellgate tab. Nothing in it is the player's: no resources, no
 *    shiny, nothing kept.
 *
 * The run's yard is a row of bym.save of type "td" belonging to the player, with a base id of its own
 * (7 followed by 14 digits: TD_BASE + the user id). Nothing else reads saves of that type; the game loads it
 * as one of the player's yards in build mode (baseLoad.ts tells it io_td), and its saves are taken and
 * dropped (baseSave.ts): nothing of the player's is written from it. td/finish records the run's result
 * in bym.td_score (the best wave, and the kills of that run), which the leaderboards read.
 */

export class HellgateError extends Error {}

const TD_BASE = 700_000_000_000_000;

export const tdBaseId = (userid: number) => String(TD_BASE + userid);

export const parseTdBaseId = (baseid: string | number | null | undefined) => {
  const text = String(baseid ?? "");
  if (text.length !== 15 || !text.startsWith("7")) return null;
  const userid = Number(text) - TD_BASE;
  return Number.isSafeInteger(userid) && userid > 0 ? { userid } : null;
};

export const isTdBaseId = (baseid: string | number | null | undefined) => parseTdBaseId(baseid) !== null;

// ---------------------------------------------------------------------------------------------
// The arena (grid units: a wall is 20 across, a tower 70, the Town Hall 130)
// ---------------------------------------------------------------------------------------------

/** Half the arena's inside: it runs from -HALF to HALF on both axes. */
const HALF = 320;
const WALL = 20;
/** How far the openings run along each side from their corner (the corner wall included). */
const GAP = 80;
const HALL = 130;
/** The Town Hall's top left, just past the right-hand opening. */
const HALL_AT = { X: HALF + 50, Y: -HALF - 50 - HALL };
/** Where the monsters come up out of the ground, past the left-hand opening. */
const SPAWN_AT = { X: -HALF - 115, Y: HALF + 115 };
/** Walls the run starts with (more come with some waves: the game's table). */
const START_WALLS = 50;
/** Enough to show in a resource bar (nothing in the arena costs resources). */
const PLENTY = 999_999_999;
/** The border's walls' level (the player's own are a level lower, so they can be told apart). */
const BORDER_LEVEL = 3;

/** What the game is told about the arena (it paths the monsters and checks the maze with it). */
export const arenaInfo = () => ({
  half: HALF,
  wall: WALL,
  gap: GAP,
  hall: [HALL_AT.X, HALL_AT.Y, HALL],
  spawn: [SPAWN_AT.X, SPAWN_AT.Y],
  walls: START_WALLS,
});

/** In an opening: the left one (low X, high Y corner) or the right one (high X, low Y). */
const inGap = (X: number, Y: number) => {
  const left = X === -HALF - WALL && Y >= HALF + WALL - GAP;
  const bottom = Y === HALF && X <= -HALF - WALL + GAP - WALL;
  const right = X === HALF && Y <= -HALF - WALL + GAP - WALL;
  const top = Y === -HALF - WALL && X >= HALF + WALL - GAP;
  return left || bottom || right || top;
};

/** The arena's buildings: the border walls and the Town Hall (id 0, as a yard's hall always is). */
export const arenaBuildings = () => {
  const data: Record<string, { id: number; t: number; X: number; Y: number; l: number }> = {};
  data["0"] = { id: 0, t: 14, X: HALL_AT.X, Y: HALL_AT.Y, l: 6 };
  let id = 1;
  const add = (X: number, Y: number) => {
    if (inGap(X, Y)) return;
    data[String(id)] = { id, t: 17, X, Y, l: BORDER_LEVEL };
    id++;
  };
  for (let Y = -HALF - WALL; Y <= HALF; Y += WALL) {
    add(-HALF - WALL, Y);
    add(HALF, Y);
  }
  for (let X = -HALF; X < HALF; X += WALL) {
    add(X, -HALF - WALL);
    add(X, HALF);
  }
  return data;
};

// ---------------------------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------------------------

interface ScoreRow {
  best_wave: number;
  best_kills: number;
  runs: number;
}

const scoreOf = async (userid: number): Promise<ScoreRow> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT best_wave, best_kills, runs FROM bym.td_score WHERE user_id = ?`, [userid], "all")) as ScoreRow[];
  return rows[0] ? { best_wave: Number(rows[0].best_wave), best_kills: Number(rows[0].best_kills), runs: Number(rows[0].runs) } : { best_wave: 0, best_kills: 0, runs: 0 };
};

/**
 * Makes (or makes again) the player's arena for a new run and says how the game should load it: {baseid,
 * arena, best}. The run starts now (td/finish checks the waves it reports against the time it took).
 */
export const openRun = async (user: User) => {
  const baseid = tdBaseId(user.userid);
  const now = getCurrentDateTime();
  const em = postgres.em.fork();
  // The game takes the home yard's id from a yard it loads as a main yard: the player's own.
  const home = await em.findOne(Save, { userid: user.userid, type: BaseType.MAIN }, { fields: ["homebaseid", "baseid", "worldid"] });
  if (!home) throw new HellgateError("Your yard isn't ready yet.");

  await em.nativeDelete(Save, { baseid, type: "td" });
  const run = em.create(
    Save,
    {
      baseid,
      type: "td",
      userid: user.userid,
      saveuserid: user.userid,
      worldid: null,
      wmid: 0,
      homebaseid: Number(home.homebaseid || home.baseid || 0),
      name: "Hellgate Defense",
      buildingdata: arenaBuildings(),
      buildinghealthdata: {},
      buildingresources: {},
      // (towers are bought with the run's gold, which the game keeps: these only let its build checks pass, as
      // in a Designer draft; building in the arena costs no resources, GLOBAL.ioFreeBuild)
      resources: { r1: PLENTY, r2: PLENTY, r3: PLENTY, r4: PLENTY, r1max: PLENTY, r2max: PLENTY, r3max: PLENTY, r4max: PLENTY },
      iresources: { r1: 0, r2: 0, r3: 0, r4: 0, r1max: 0, r2max: 0, r3max: 0, r4max: 0 },
      researchdata: {},
      monsters: {},
      academy: {},
      aiattacks: {},
      attacks: [],
      damage: 0,
      destroyed: 0,
      attackid: 0,
      protected: 0,
      credits: 0,
      tutorialstage: 205,
      createtime: now,
      savetime: now,
    } as never,
    { partial: true }
  ) as Save;
  em.persist(run);
  await em.flush();

  return { baseid, arena: arenaInfo(), best: await scoreOf(user.userid) };
};

/** What the game is told about the run it loads (baseLoad.ts: `io_td`). */
export const tdInfo = (save: Save) => ({ arena: arenaInfo(), started: Number(save.createtime) || 0 });

/** The quickest a wave can be fought, in seconds (the game's waves take far longer: this only stops nonsense). */
const MIN_WAVE_SECONDS = 6;
const MAX_WAVE = 999;

/**
 * The most monsters `waves` waves and the one under way can hold (IoTdWaves.make: 6 + 1.6 a wave, 70 at most;
 * a swarm wave twice that; a boss or two on top). Kills past it were never made (9 October: any number up to
 * 100,000 was taken, and they break ties on the board).
 */
const maxKills = (waves: number) => {
  let n = 0;
  for (let w = 1; w <= waves + 1; w++) n += 2 * Math.min(70, Math.round(6 + 1.6 * w)) + 1 + Math.floor(w / 30);
  return n;
};

// ---------------------------------------------------------------------------------------------
// (QoL #459, 15 October) A finish sent again: the game tries again when a finish got no answer (the network, a
// timeout), but the first may have been recorded and only its answer lost. Each recorded run's answer is kept a
// day under the run's id (its yard's createtime, which the game has as io_td.started): the same run finished
// again (td/finish or td/finish2 with `run`) is answered as it was the first time, not "not recorded".
// ---------------------------------------------------------------------------------------------

const DONE_KEY = (userid: number) => `td:done:${userid}`;
const DONE_TTL = 24 * 60 * 60;

/** Keeps a recorded run's answer under its id (v2: Hellgate Defense 2's). */
export const keepFinished = async (userid: number, runId: number, v2: boolean, answer: Record<string, unknown>) => {
  if (!(runId > 0)) return;
  try {
    await redis.set(DONE_KEY(userid), JSON.stringify({ run: runId, v2, answer }), "EX", String(DONE_TTL));
  } catch (err) {
    logger.warn(`Hellgate: the answer to run ${runId} of ${userid} couldn't be kept: ${err}`);
  }
};

/**
 * The answer a run was recorded with, if `runId` is the run last recorded (null: it isn't, or none was sent).
 * `wait`: a finish sent twice at once, the other one still recording it: asks again for up to 2 seconds.
 */
export const finishedBefore = async (userid: number, runId: unknown, v2: boolean, wait = false): Promise<Record<string, unknown> | null> => {
  const id = Math.floor(Number(runId));
  if (!Number.isFinite(id) || id <= 0) return null;
  for (let i = 0; i < (wait ? 8 : 1); i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 250));
    try {
      const raw = await redis.get(DONE_KEY(userid));
      const kept = raw ? (JSON.parse(raw) as { run?: number; v2?: boolean; answer?: Record<string, unknown> }) : null;
      if (kept && Number(kept.run) === id && Boolean(kept.v2) === v2 && kept.answer) return kept.answer;
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * The run is over (lost, or left): `wave` waves survived, `kills` monsters killed. The best wave is kept (and
 * the kills of that run: they break ties on the board). A run is recorded once; its yard is gone afterwards.
 * A linked run (Versus, Co-op) only lets its yard go. `runId` (QoL #459): the run's id, io_td.started; the same
 * run finished again is answered as the first time (`repeat: true`).
 */
export const finishRun = async (user: User, wave: unknown, kills: unknown, linked: unknown = 0, runId: unknown = 0) => {
  const baseid = tdBaseId(user.userid);
  const em = postgres.em.fork();
  const run = await em.findOne(Save, { baseid, type: "td", userid: user.userid });
  if (!run) {
    // (QoL #459: recorded already, its answer lost on the way)
    const kept = Number(linked) === 1 ? null : await finishedBefore(user.userid, runId, false);
    if (kept) return { ...kept, best: await scoreOf(user.userid), repeat: true };
    return { recorded: false, best: await scoreOf(user.userid) };
  }
  // (18 October, SUSPECTED-BUGS.md: a Hellgate 2 run, its Hellforge perks and all, could be finished here, onto the
  // Hellgate 1 board, its settings left behind) a run with Hellgate 2's settings is Hellgate 2's to finish
  if (Number(linked) !== 1) {
    const { runMeta, finishRun2 } = await import("./hellgate2.js");
    if (await runMeta(user.userid)) return finishRun2(user, wave, kills, 0, runId);
  }
  // A Versus or Co-op run (the Devil's Arcade) isn't a solo run: its result is the arcade's (services/arcade/relay.ts)
  if (Number(linked) === 1) {
    await em.nativeDelete(Save, { baseid, type: "td" });
    return { recorded: false, best: await scoreOf(user.userid) };
  }
  // (13 October) the run claimed first: of two finishes sent at once only the one that takes its yard records it
  if ((await em.nativeDelete(Save, { baseid, type: "td", userid: user.userid })) !== 1) {
    // (QoL #459: the other one's answer, once it has it)
    const kept = await finishedBefore(user.userid, runId, false, true);
    if (kept) return { ...kept, best: await scoreOf(user.userid), repeat: true };
    return { recorded: false, best: await scoreOf(user.userid) };
  }

  const elapsed = Math.max(0, getCurrentDateTime() - Number(run.createtime || 0));
  let waves = Math.floor(Number(wave));
  if (!Number.isFinite(waves) || waves < 0) waves = 0;
  // (waves far faster than they can come: reported to the admins, services/anticheat)
  await noteHellgateRun(user, waves, elapsed);
  // (no more waves than there was time to fight)
  // (18 October: and no more than the game's own timing allows, services/anticheat hellgateWavesIn)
  const possible = Math.min(Math.floor(elapsed / MIN_WAVE_SECONDS), hellgateWavesIn(elapsed));
  if (waves > possible) {
    logger.warn(`Hellgate: ${user.username} reported ${waves} waves in ${elapsed} s; counted ${possible}`);
    waves = possible;
  }
  waves = Math.min(MAX_WAVE, waves);
  let killed = Math.floor(Number(kills));
  if (!Number.isFinite(killed) || killed < 0) killed = 0;
  killed = Math.min(killed, maxKills(waves));

  // (better than the best stored when the row is written, not when it was read: two runs at once kept the lower)
  const BETTER = "(EXCLUDED.best_wave > bym.td_score.best_wave OR (EXCLUDED.best_wave = bym.td_score.best_wave AND EXCLUDED.best_kills > bym.td_score.best_kills))";
  const before = await scoreOf(user.userid);
  const better = waves > before.best_wave || (waves === before.best_wave && killed > before.best_kills);
  await em.getConnection().execute(
    `INSERT INTO bym.td_score (user_id, best_wave, best_kills, runs, best_at, last_at)
       VALUES (?, ?, ?, 1, now(), now())
     ON CONFLICT (user_id) DO UPDATE SET
       runs = bym.td_score.runs + 1,
       last_at = now(),
       best_wave = CASE WHEN ${BETTER} THEN EXCLUDED.best_wave ELSE bym.td_score.best_wave END,
       best_kills = CASE WHEN ${BETTER} THEN EXCLUDED.best_kills ELSE bym.td_score.best_kills END,
       best_at = CASE WHEN ${BETTER} THEN now() ELSE bym.td_score.best_at END`,
    [user.userid, waves, killed]
  );
  const answer = { recorded: true, wave: waves, kills: killed, newBest: better && waves > 0, best: await scoreOf(user.userid) };
  // (QoL #459: kept for a finish of this run sent again)
  await keepFinished(user.userid, Number(run.createtime) || 0, false, answer);
  return answer;
};

/** The player's best, for the game's start screen. */
export const runStatus = async (user: User) => ({ best: await scoreOf(user.userid) });
