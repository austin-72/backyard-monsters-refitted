import type { User } from "../../database/models/user.model.js";
import { anticheatRefuses, checked, flagCheat } from "./cheatReports.js";

/**
 * Inferno-only: the cheat detector's checks of requests other than yard saves (cheatReports.ts). Each returns
 * whether the request may go on (false: refused).
 */

const who = (user: User) => ({ userid: user.userid, username: user.username });

/**
 * An attack load with Map Room 3's payment: the Inferno-only game is never on Map Room 3 (setMapVersion refuses
 * it, and the game sends `attackcost` only from Map Room 3's attack popup), and the payment is taken from the
 * request (a negative one paid the attacker).
 */
export const checkAttackLoad = async (user: User, mapversion: unknown, attackcost: unknown, baseid: unknown): Promise<boolean> => {
  if (!(await checked(user))) return true;
  const v = Number(mapversion);
  const cost = attackcost != null && attackcost !== "" ? attackcost : null;
  if (v !== 3 && cost == null) return true;
  const refuse = anticheatRefuses();
  await flagCheat(who(user), "map_room_3_cost", { baseid: String(baseid ?? ""), mapversion: mapversion ?? null, attackcost: cost }, { refused: refuse });
  return !refuse;
};

/**
 * A price the game sends (a takeover, a move): every amount a whole number of zero or more (the game's prices are
 * never negative: PopupTakeover, PopupInfoEnemy, MapRoom, PopupRelocateMe).
 */
export const checkPrice = async (user: User, what: string, resources: unknown, shiny?: unknown): Promise<boolean> => {
  if (!(await checked(user))) return true;
  const bad: Record<string, unknown> = {};
  if (resources != null) {
    let r: unknown = resources;
    if (typeof r === "string") {
      try {
        r = JSON.parse(r);
      } catch {
        r = null;
      }
    }
    if (r && typeof r === "object") {
      for (const [k, n] of Object.entries(r as Record<string, unknown>)) {
        if (!/^r[1-4]$/.test(k)) continue;
        const x = Number(n);
        if (!Number.isFinite(x) || x < 0) bad[k] = n;
      }
    }
  }
  if (shiny != null && shiny !== "") {
    const x = Number(shiny);
    if (!Number.isFinite(x) || x < 0) bad.shiny = shiny;
  }
  if (!Object.keys(bad).length) return true;
  const refuse = anticheatRefuses();
  await flagCheat(who(user), "negative_price", { request: what, price: bad }, { refused: refuse });
  return !refuse;
};

/** An own yard sent to the old Inferno save route, which the Inferno-only game never uses for its own yards. */
export const checkLegacySave = async (user: User, baseid: unknown): Promise<boolean> => {
  if (!(await checked(user))) return true;
  const refuse = anticheatRefuses();
  await flagCheat(who(user), "legacy_save_route", { baseid: String(baseid ?? "") }, { refused: refuse });
  return !refuse;
};

/**
 * The score a Devil's Arcade game can't reach in `seconds`, played as no one can: five times the arcade's own most a
 * second (config/ArcadeConfig.ts, which refuses what is over it), that most doubling every 30 seconds (games
 * whose points grow with the level: Magma Stack's rows are worth the level times as much, its levels coming every
 * ten rows; Breakout's bricks and Swarm's wave bonuses likewise), and 1,000 on top. Magma Stack at ten pieces a
 * second, every one a four-row clear, stays under it for minutes; the best players place three or four.
 */
export const arcadeScoreOutOfReach = (game: { maxPerSecond: number }, seconds: number) =>
  5 * game.maxPerSecond * seconds * (1 + seconds / 30) + 1000;

/**
 * A Devil's Arcade score no one can make in the time the run took, or (`final`, a run's last score) Valgos Golf's
 * past 990 (nine holes take a stroke each at least) or its nine holes in less than half the least time the balls'
 * drops alone take. The arcade's own limits refuse less than this; this reports what is far past them.
 * A live score (Versus, Race: `final` false) of Golf is 999 less the strokes so far, not earned over time: only a
 * run's last score of Golf is checked.
 */
export const noteArcadeScore = async (
  userid: number,
  game: { id: string; maxPerSecond: number; maxScore: number; minSeconds?: number },
  score: number,
  seconds: number,
  where: string,
  final = true,
) => {
  if (!(game.maxPerSecond > 0)) return;
  const golf = game.id === "golf";
  const far = (!golf && score > arcadeScoreOutOfReach(game, seconds))
    || (final && golf && score > 990)
    || (final && game.minSeconds ? seconds < game.minSeconds / 2 && score > 0 : false);
  if (!far) return;
  await flagCheat({ userid }, "arcade_score_impossible",
    { game: game.id, where, score, seconds: Math.round(seconds), outOfReach: golf ? (final && score > 990 ? 990 : null) : Math.round(arcadeScoreOutOfReach(game, seconds)) },
    { refused: true });
};

/**
 * Hellgate Defense: the least time `waves` waves take (IoTdWaves.make): each wave's monsters come one after
 * another, `gap` ms apart (a swarm's at 45% of it, twice as many; a boss wave's half as many, then the bosses), and a
 * wave ends only after its last; double speed at most (IoTd's fast forward: GLOBAL.ioStepScale 2).
 */
export const hellgateLeastSeconds = (waves: number) => {
  let ms = 0;
  for (let w = 1; w <= waves; w++) {
    const count = Math.min(70, Math.round(6 + 1.6 * w));
    const gap = Math.max(320, 1100 - 25 * w);
    const boss = w % 10 === 0;
    const swarm = w % 5 === 0 && !boss;
    if (swarm) ms += (count * 2 - 1) * Math.floor(gap * 0.45);
    else if (boss) {
      const bosses = 1 + Math.floor(w / 30);
      ms += (Math.floor(count / 2) - 1) * gap + 2500 + 1500 * (bosses - 1);
    } else ms += (count - 1) * gap;
  }
  return ms / 1000 / 2;
};

/**
 * (18 October, SUSPECTED-BUGS.md: waves were taken at 6 s each, half or less of the game's own fastest) The most
 * waves a run can have cleared in `seconds`, by the game's own timing (hellgateLeastSeconds), with HELLGATE_SLACK
 * for a slow clock or a late request, and 15 s.
 */
export const HELLGATE_SLACK = 1.25;
export const hellgateWavesIn = (seconds: number) => {
  const budget = Math.max(0, Number(seconds) || 0) * HELLGATE_SLACK + 15;
  let ms = 0;
  for (let w = 1; w <= 999; w++) {
    const count = Math.min(70, Math.round(6 + 1.6 * w));
    const gap = Math.max(320, 1100 - 25 * w);
    const boss = w % 10 === 0;
    const swarm = w % 5 === 0 && !boss;
    if (swarm) ms += (count * 2 - 1) * Math.floor(gap * 0.45);
    else if (boss) ms += (Math.floor(count / 2) - 1) * gap + 2500 + 1500 * Math.floor(w / 30);
    else ms += (count - 1) * gap;
    if (ms / 1000 / 2 > budget) return w - 1;
  }
  return 999;
};

/** A Hellgate Defense run's waves in less than half the least time they take (and 5 s): reported. */
export const noteHellgateRun = async (user: User, waves: number, elapsed: number) => {
  if (!(waves > 0) || !(await checked(user))) return;
  const least = hellgateLeastSeconds(Math.min(waves, 999));
  if (elapsed >= least / 2 - 5) return;
  await flagCheat(who(user), "hellgate_too_fast", { waves, seconds: elapsed, leastSeconds: Math.round(least) }, { refused: true });
};
