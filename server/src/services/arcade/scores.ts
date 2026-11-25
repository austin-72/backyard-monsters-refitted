import { questArcadeRun } from "../quests/questHooks.js";
import { noteArcadeScore } from "../anticheat/requestChecks.js";
import { randomBytes, randomInt } from "crypto";

import { arcadeConfig, arcadeGame } from "../../config/ArcadeConfig.js";
import type { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { configuredAdmins } from "../admin/admin.js";

/**
 * Inferno-only: the Devil's Arcade's scores (config/ArcadeConfig.ts, table bym.arcade_score).
 *
 * Solo runs: the game asks for a run (`startRun`: an id, a seed), plays it and sends the score (`submitRun`).
 * The server keeps the run's start in Redis and refuses a score more than `maxPerSecond` times the seconds the
 * run took could earn (or above `maxScore`), and a run sent twice. Live matches are recorded by the arcade's
 * socket (`recordMatch`): a win or a loss, and the score of the match.
 */
export class ArcadeError extends Error {}

const RUN_KEY = (id: string) => `arcade-run:${id}`;

export interface BoardRow {
  uid: number;
  name: string;
  best: number;
  best2: number;
  runs: number;
  wins: number;
  losses: number;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Balthazar's Flight's course: the same for everyone for a week (Monday to Sunday, UTC), so the ghosts raced
 * fly the course the player flies. Its seed, from the week's number.
 */
export const flightSeed = () => {
  const week = Math.floor((Date.now() / 86_400_000 + 3) / 7);
  return ((week * 7919 + 13) % 2_147_483_000) + 1;
};

/**
 * Balthazar's Flight's week as a board's period ("wk" and the week's number, as flightSeed counts them): its
 * course changes every week, so an all-time board mixed courses (QoL #291, 14 October).
 */
export const flightWeek = (at = Date.now()) => `wk${Math.floor((at / 86_400_000 + 3) / 7)}`;

/** The players just above and below a place on a board (QoL #290: "Around you", for one outside the top). */
const AROUND = 2;
const aroundOf = async (from: string, where: string, order: string, params: unknown[], uid: number, cols: string) => {
  const rows = (await postgres.em.getConnection().execute(
    `WITH r AS (SELECT ${cols}, ROW_NUMBER() OVER (ORDER BY ${order}) AS place FROM ${from} WHERE ${where})
     SELECT r.* FROM r, (SELECT place AS mine FROM r WHERE uid = ?) m
      WHERE r.place BETWEEN m.mine - ${AROUND} AND m.mine + ${AROUND} ORDER BY r.place`,
    [...params, uid],
    "all",
  )) as Record<string, unknown>[];
  return rows.map((r) => ({
    uid: Number(r.uid),
    name: String(r.name),
    best: Number(r.best),
    best2: Number(r.best2),
    runs: Number(r.runs),
    wins: Number(r.wins ?? 0),
    losses: Number(r.losses ?? 0),
    place: Number(r.place),
  }));
};

/** A day's seed (Valgos Golf's Daily: the same course for everyone that day, UTC). */
export const daySeed = (day = today()) => {
  let h = 2166136261;
  for (const ch of `golf:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return (h % 2_147_483_000) + 1;
};

/** The admins' user ids (they are on no leaderboard, as on the game's others). */
let adminCache: { at: number; ids: Set<number> } | null = null;
export const adminIds = async (): Promise<Set<number>> => {
  if (adminCache && Date.now() - adminCache.at < 60_000) return adminCache.ids;
  const names = configuredAdmins();
  let ids = new Set<number>();
  if (names.length) {
    const rows = await postgres.em
      .getConnection()
      .execute<{ userid: number }[]>(`SELECT userid FROM bym."user" WHERE username IN (${names.map(() => "?").join(",")})`, names);
    ids = new Set(rows.map((row) => Number(row.userid)));
  }
  adminCache = { at: Date.now(), ids };
  return ids;
};

const checkGame = (game: unknown, mode: unknown) => {
  const g = arcadeGame(String(game ?? ""));
  if (!g) throw new ArcadeError("That game isn't in the arcade.");
  const m = String(mode ?? "");
  if (!g.modes.includes(m)) throw new ArcadeError("That game can't be played that way.");
  return { g, m };
};

/** The player's records, every game and mode (all time, and today's for the Siege's Daily). */
export const playerRecords = async (userid: number) => {
  const rows = (await postgres.em
    .getConnection()
    .execute(
      `SELECT game, mode, period, best, best2, runs, wins, losses FROM bym.arcade_score WHERE user_id = ? AND (period = '' OR period = ?)`,
      [userid, today()],
      "all",
    )) as Record<string, unknown>[];
  const out: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const key = String(r.game);
    out[key] ??= {};
    out[key][String(r.mode) + (r.period ? ":" + String(r.period) : "")] = {
      best: Number(r.best),
      best2: Number(r.best2),
      runs: Number(r.runs),
      wins: Number(r.wins),
      losses: Number(r.losses),
    };
  }
  return out;
};

/** status: the games and the player's records. */
export const arcadeStatus = async (user: User) => ({
  games: arcadeConfig.games.map((g) => ({ id: g.id, name: g.name, modes: g.modes })),
  records: await playerRecords(user.userid),
  day: today(),
});

/**
 * A leaderboard: the best `boardSize` of a game and mode (and period), and the player's own row and place.
 * Solo modes rank by best score (then best2); versus modes by wins (best), then fewest losses.
 */
export const board = async (user: User, game: unknown, mode: unknown, period: unknown = "") => {
  const { g, m } = checkGame(game, mode);
  const asked = String(period ?? "");
  const p = asked === "today" ? today() : asked === "week" ? flightWeek() : asked;
  if (p && !/^\d{4}-\d{2}-\d{2}$/.test(p) && !/^wk\d+$/.test(p)) throw new ArcadeError("Unknown day.");
  const admins = [...(await adminIds())];
  const notAdmin = admins.length ? `AND s.user_id NOT IN (${admins.map(() => "?").join(",")})` : "";
  const connection = postgres.em.getConnection();
  if (g.id === "hellgate" && m === "solo") return hellgateBoard(user, admins, notAdmin);
  const rows = (await connection.execute(
    `SELECT s.user_id AS uid, u.username AS name, s.best, s.best2, s.runs, s.wins, s.losses
       FROM bym.arcade_score s JOIN bym."user" u ON u.userid = s.user_id
      WHERE s.game = ? AND s.mode = ? AND s.period = ? AND (s.best > 0 OR s.wins > 0 OR s.runs > 0) ${notAdmin}
      ORDER BY s.best DESC, s.best2 DESC, s.losses ASC, s.best_at ASC
      LIMIT ?`,
    [g.id, m, p, ...admins, arcadeConfig.boardSize],
    "all",
  )) as Record<string, unknown>[];
  const top: BoardRow[] = rows.map((r) => ({
    uid: Number(r.uid),
    name: String(r.name),
    best: Number(r.best),
    best2: Number(r.best2),
    runs: Number(r.runs),
    wins: Number(r.wins),
    losses: Number(r.losses),
  }));
  const mine = (await connection.execute(
    `SELECT best, best2, runs, wins, losses, best_at FROM bym.arcade_score WHERE user_id = ? AND game = ? AND mode = ? AND period = ?`,
    [user.userid, g.id, m, p],
    "all",
  )) as Record<string, unknown>[];
  let me: (BoardRow & { place: number }) | null = null;
  if (mine.length) {
    const r = mine[0];
    const ahead = (await connection.execute(
      `SELECT count(*)::int AS n FROM bym.arcade_score s
        WHERE s.game = ? AND s.mode = ? AND s.period = ? ${notAdmin}
          AND (s.best > ? OR (s.best = ? AND s.best2 > ?) OR (s.best = ? AND s.best2 = ? AND s.losses < ?))`,
      [g.id, m, p, ...admins, r.best, r.best, r.best2, r.best, r.best2, r.losses],
      "all",
    )) as { n: number }[];
    me = {
      uid: user.userid,
      name: user.username,
      best: Number(r.best),
      best2: Number(r.best2),
      runs: Number(r.runs),
      wins: Number(r.wins),
      losses: Number(r.losses),
      place: Number(ahead[0]?.n ?? 0) + 1,
    };
  }
  const around =
    me && !top.some((t) => t.uid === user.userid)
      ? await aroundOf(
          `bym.arcade_score s JOIN bym."user" u ON u.userid = s.user_id`,
          `s.game = ? AND s.mode = ? AND s.period = ? AND (s.best > 0 OR s.wins > 0 OR s.runs > 0) ${notAdmin}`,
          `s.best DESC, s.best2 DESC, s.losses ASC, s.best_at ASC`,
          [g.id, m, p, ...admins],
          user.userid,
          `s.user_id AS uid, u.username AS name, s.best, s.best2, s.runs, s.wins, s.losses`,
        )
      : [];
  return { game: g.id, mode: m, period: p, top, me, around };
};

/**
 * (QoL #371) The player's place on a board, counted as `board` counts it (admins left out), and the row; null when
 * the player has no row there.
 */
export const placeOn = async (userid: number, game: string, mode: string, period: string) => {
  const connection = postgres.em.getConnection();
  const mine = (await connection.execute(
    `SELECT best, best2, runs, wins, losses FROM bym.arcade_score WHERE user_id = ? AND game = ? AND mode = ? AND period = ?`,
    [userid, game, mode, period],
    "all",
  )) as Record<string, unknown>[];
  if (!mine.length) return null;
  const r = mine[0];
  const admins = [...(await adminIds())];
  const notAdmin = admins.length ? `AND s.user_id NOT IN (${admins.map(() => "?").join(",")})` : "";
  const ahead = (await connection.execute(
    `SELECT count(*)::int AS n FROM bym.arcade_score s
      WHERE s.game = ? AND s.mode = ? AND s.period = ? ${notAdmin}
        AND (s.best > ? OR (s.best = ? AND s.best2 > ?) OR (s.best = ? AND s.best2 = ? AND s.losses < ?))`,
    [game, mode, period, ...admins, r.best, r.best, r.best2, r.best, r.best2, r.losses],
    "all",
  )) as { n: number }[];
  return {
    place: Number(ahead[0]?.n ?? 0) + 1,
    best: Number(r.best),
    best2: Number(r.best2),
    runs: Number(r.runs),
    wins: Number(r.wins),
    losses: Number(r.losses),
  };
};

/**
 * rank (QoL #371): the player's place on a game's board and their record there (a live match's result panel asks
 * for it once the match is recorded). place 0: not on the board yet.
 */
export const rank = async (user: User, game: unknown, mode: unknown, period: unknown = "") => {
  const { g, m } = checkGame(game, mode);
  const asked = String(period ?? "");
  const p = asked === "today" ? today() : asked === "week" ? flightWeek() : asked;
  if (p && !/^\d{4}-\d{2}-\d{2}$/.test(p) && !/^wk\d+$/.test(p)) throw new ArcadeError("Unknown day.");
  const row = await placeOn(user.userid, g.id, m, p);
  return { game: g.id, mode: m, period: p, place: row?.place ?? 0, wins: row?.wins ?? 0, losses: row?.losses ?? 0, runs: row?.runs ?? 0, best: row?.best ?? 0 };
};

/** A solo run begins: its id and seed (the game makes the run from the seed). */
export const startRun = async (user: User, game: unknown, mode: unknown) => {
  const { g, m } = checkGame(game, mode);
  if (!g.maxPerSecond) throw new ArcadeError("That game keeps its own scores.");
  // (9 October: only a solo mode is a run; a versus or race board counts wins, kept by the match, and a run
  // started in that mode wrote a made-up score over it)
  if (m !== g.modes[0] && !g.daily?.includes(m)) throw new ArcadeError("That game can't be played that way.");
  const id = randomBytes(12).toString("hex");
  const daily = Boolean(g.daily?.includes(m));
  const day = today();
  const seed = g.id === "flight" ? flightSeed() : daily ? daySeed(day) : randomInt(1, 2 ** 31 - 1);
  await redis.set(RUN_KEY(id), JSON.stringify({ uid: user.userid, game: g.id, mode: m, seed, at: Date.now(), day: daily ? day : "" }), "EX", String(arcadeConfig.runTimeout));
  return { run: id, seed, ...(daily ? { day } : {}) };
};

/** Writes a score into a record: the best kept, runs counted. */
export const recordScore = async (userid: number, game: string, mode: string, period: string, score: number, score2: number) => {
  questArcadeRun(userid, game, mode, score, score2);
  await postgres.em.getConnection().execute(
    `INSERT INTO bym.arcade_score (user_id, game, mode, period, best, best2, runs, best_at, last_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, now(), now())
     ON CONFLICT (user_id, game, mode, period) DO UPDATE SET
       runs = bym.arcade_score.runs + 1,
       last_at = now(),
       best_at = CASE WHEN EXCLUDED.best > bym.arcade_score.best OR (EXCLUDED.best = bym.arcade_score.best AND EXCLUDED.best2 > bym.arcade_score.best2)
                      THEN now() ELSE bym.arcade_score.best_at END,
       best2 = CASE WHEN EXCLUDED.best > bym.arcade_score.best OR (EXCLUDED.best = bym.arcade_score.best AND EXCLUDED.best2 > bym.arcade_score.best2)
                    THEN EXCLUDED.best2 ELSE bym.arcade_score.best2 END,
       best = GREATEST(bym.arcade_score.best, EXCLUDED.best)`,
    [userid, game, mode, period, score, score2],
  );
};

/** A live match played: a win, a loss or a draw; best = wins, best2 = the best score in a match. */
export const recordMatch = async (userid: number, game: string, mode: string, result: "win" | "loss" | "draw", score: number) => {
  const won = result === "win";
  const lost = result === "loss";
  await postgres.em.getConnection().execute(
    `INSERT INTO bym.arcade_score (user_id, game, mode, period, best, best2, runs, wins, losses, best_at, last_at)
       VALUES (?, ?, ?, '', ?, ?, 1, ?, ?, now(), now())
     ON CONFLICT (user_id, game, mode, period) DO UPDATE SET
       runs = bym.arcade_score.runs + 1,
       wins = bym.arcade_score.wins + EXCLUDED.wins,
       losses = bym.arcade_score.losses + EXCLUDED.losses,
       best = bym.arcade_score.wins + EXCLUDED.wins,
       best2 = GREATEST(bym.arcade_score.best2, EXCLUDED.best2),
       best_at = CASE WHEN EXCLUDED.wins > 0 THEN now() ELSE bym.arcade_score.best_at END,
       last_at = now()`,
    [userid, game, mode, won ? 1 : 0, Math.max(0, Math.round(score)), won ? 1 : 0, lost ? 1 : 0],
  );
};

/**
 * A solo run's score. Checked: the run is the player's, not sent before, and the score could be made in the
 * time the run took. Flight sends its path too (`ghost`), kept when it is the player's best.
 */
export const submitRun = async (user: User, run: unknown, score: unknown, score2: unknown, ghost: unknown) => {
  const key = RUN_KEY(String(run ?? ""));
  // (taken in one step: two submits of one run at once both read it before either deleted it, 9 October)
  const raw = await redis.getdel(key);
  if (!raw) {
    // (14 October, QoL #430: the same run sent again because its answer was lost: the first answer again)
    const done = await redis.get(`${key}:done`).catch(() => null);
    if (done) {
      const d = JSON.parse(done) as { uid: number; result: Record<string, unknown> };
      if (d.uid === user.userid) return { ...d.result, records: await playerRecords(user.userid) };
    }
    throw new ArcadeError("That run has ended or was never started.");
  }
  const r = JSON.parse(raw) as { uid: number; game: string; mode: string; seed: number; at: number; day?: string };
  if (r.uid !== user.userid) throw new ArcadeError("That run isn't yours.");
  const g = arcadeGame(r.game)!;
  const s = Math.floor(Number(score));
  // (13 October: the tie-break score as well: any number won every tie, and one too big for the table lost the run)
  const s2raw = Math.floor(Number(score2) || 0);
  const s2 = Number.isFinite(s2raw) ? Math.max(0, Math.min(s2raw, 10_000_000)) : 0;
  if (!Number.isFinite(s) || s < 0) throw new ArcadeError("That score isn't a number.");
  const seconds = Math.max(1, (Date.now() - r.at) / 1000);
  // (far past what the game can score: reported to the admins too, services/anticheat)
  await noteArcadeScore(user.userid, g, s, seconds, `${r.game} ${r.mode}`);
  if (s > g.maxScore || s > g.maxPerSecond * seconds + 100) throw new ArcadeError("That score can't be right.");
  // (18 October) the second number too (configured per game: ArcadeConfig score2)
  if (g.score2 && (s2 > g.score2[2] || s2 > g.score2[0] * seconds + g.score2[1])) throw new ArcadeError("That score can't be right.");
  // (a run sent too soon to have been played: Valgos Golf's best round is also its quickest, 9 October; 18 October:
  // also when only its second number (aces) is sent)
  if (g.minSeconds && seconds < g.minSeconds && (s > 0 || s2 > 0)) throw new ArcadeError("That score can't be right.");
  const before = (await postgres.em
    .getConnection()
    .execute(`SELECT best FROM bym.arcade_score WHERE user_id = ? AND game = ? AND mode = ? AND period = ''`, [user.userid, r.game, r.mode], "all")) as {
    best: number;
  }[];
  const previous = before.length ? Number(before[0].best) : 0;
  // (QoL #371: the place on the run's board before and after, for the result: "#7 (up 3)". A daily course's board
  // is its day's, as the game's page shows it; a ranking that fails costs the run nothing)
  const boardPeriod = r.day || "";
  const placeBefore = (await placeOn(user.userid, r.game, r.mode, boardPeriod).catch(() => null))?.place ?? 0;
  await recordScore(user.userid, r.game, r.mode, "", s, s2);
  // (a daily course: its day's board too, the day it was started on)
  if (r.day) await recordScore(user.userid, r.game, r.mode, r.day, s, s2);
  // (Balthazar's Flight: the week's board too, the week its course was flown in)
  if (r.game === "flight") await recordScore(user.userid, r.game, r.mode, flightWeek(r.at), s, s2);
  let ghostKept = false;
  if (r.game === "flight" && typeof ghost === "string" && ghost.length > 0 && ghost.length <= arcadeConfig.ghostMaxBytes && /^[0-9a-z,.:;-]*$/i.test(ghost)) {
    const res = (await postgres.em.getConnection().execute(
      `INSERT INTO bym.arcade_ghost (game, user_id, score, seed, data) VALUES ('flight', ?, ?, ?, ?)
       ON CONFLICT (game, user_id) DO UPDATE SET score = EXCLUDED.score, seed = EXCLUDED.seed, data = EXCLUDED.data, created_at = now()
       WHERE bym.arcade_ghost.score < EXCLUDED.score OR bym.arcade_ghost.seed <> EXCLUDED.seed
       RETURNING user_id`,
      [user.userid, s, r.seed, ghost],
      "all",
    )) as unknown[];
    ghostKept = res.length > 0;
  }
  const place = (await placeOn(user.userid, r.game, r.mode, boardPeriod).catch(() => null))?.place ?? 0;
  const result = { score: s, best: Math.max(previous, s), newBest: s > previous, ghostKept, place, placeBefore };
  await redis.set(`${key}:done`, JSON.stringify({ uid: user.userid, result }), "EX", "600").catch(() => null);
  return { ...result, records: await playerRecords(user.userid) };
};

/**
 * Balthazar's Flight's ghosts to race: the best run of all, the run just above the player's best, and the
 * player's own best (each a path of the same course: the course comes from the ghost's seed).
 */
export const ghosts = async (user: User) => {
  const admins = [...(await adminIds())];
  const notAdmin = admins.length ? `AND g.user_id NOT IN (${admins.map(() => "?").join(",")})` : "";
  const connection = postgres.em.getConnection();
  const pick = async (sql: string, params: unknown[]) =>
    (await connection.execute(
      `SELECT g.user_id AS uid, u.username AS name, g.score, g.seed, g.data FROM bym.arcade_ghost g JOIN bym."user" u ON u.userid = g.user_id
        WHERE g.game = 'flight' AND g.seed = ${flightSeed()} ${sql}`,
      params,
      "all",
    )) as Record<string, unknown>[];
  const out: Record<string, unknown>[] = [];
  const add = (rows: Record<string, unknown>[], role: string) => {
    for (const r of rows) {
      if (out.some((o) => o.uid === Number(r.uid))) continue;
      out.push({ uid: Number(r.uid), name: String(r.name), score: Number(r.score), seed: Number(r.seed), data: String(r.data), role });
    }
  };
  add(await pick(`${notAdmin} ORDER BY g.score DESC LIMIT 1`, admins), "best");
  const mine = await pick(`AND g.user_id = ?`, [user.userid]);
  const myScore = mine.length ? Number(mine[0].score) : 0;
  add(await pick(`AND g.user_id <> ? AND g.score > ? ${notAdmin} ORDER BY g.score ASC LIMIT 1`, [user.userid, myScore, ...admins]), "next");
  add(mine, "you");
  return { ghosts: out };
};

/** A ghost to race when no player comes to a Race: one near the player's best (or any). */
export const raceGhost = async (userid: number) => {
  const connection = postgres.em.getConnection();
  const seed = flightSeed();
  const mine = (await connection.execute(`SELECT score FROM bym.arcade_ghost WHERE game = 'flight' AND user_id = ? AND seed = ?`, [userid, seed], "all")) as {
    score: number;
  }[];
  const target = mine.length ? Number(mine[0].score) : 300;
  const rows = (await connection.execute(
    `SELECT g.user_id AS uid, u.username AS name, g.score, g.seed, g.data FROM bym.arcade_ghost g JOIN bym."user" u ON u.userid = g.user_id
      WHERE g.game = 'flight' AND g.seed = ? AND g.user_id <> ? ORDER BY abs(g.score - ?) ASC LIMIT 1`,
    [seed, userid, target],
    "all",
  )) as Record<string, unknown>[];
  if (!rows.length) return null;
  const r = rows[0];
  return { uid: Number(r.uid), name: String(r.name), score: Number(r.score), seed: Number(r.seed), data: String(r.data) };
};

/** Hellgate Defense Solo's board: its own table (services/td/hellgate.ts, the Leaderboards' Hellgate tab). */
const hellgateBoard = async (user: User, admins: number[], notAdmin: string) => {
  const connection = postgres.em.getConnection();
  const rows = (await connection.execute(
    `SELECT s.user_id AS uid, u.username AS name, s.best_wave AS best, s.best_kills AS best2, s.runs
       FROM bym.td_score s JOIN bym."user" u ON u.userid = s.user_id
      WHERE s.best_wave > 0 ${notAdmin}
      ORDER BY s.best_wave DESC, s.best_kills DESC, s.best_at ASC LIMIT ?`,
    [...admins, arcadeConfig.boardSize],
    "all",
  )) as Record<string, unknown>[];
  const top: BoardRow[] = rows.map((r) => ({ uid: Number(r.uid), name: String(r.name), best: Number(r.best), best2: Number(r.best2), runs: Number(r.runs), wins: 0, losses: 0 }));
  const mine = (await connection.execute(`SELECT best_wave, best_kills, runs FROM bym.td_score WHERE user_id = ?`, [user.userid], "all")) as Record<string, unknown>[];
  let me: (BoardRow & { place: number }) | null = null;
  if (mine.length && Number(mine[0].best_wave) > 0) {
    const r = mine[0];
    const ahead = (await connection.execute(
      `SELECT count(*)::int AS n FROM bym.td_score s WHERE (s.best_wave > ? OR (s.best_wave = ? AND s.best_kills > ?)) ${notAdmin}`,
      [r.best_wave, r.best_wave, r.best_kills, ...admins],
      "all",
    )) as { n: number }[];
    me = { uid: user.userid, name: user.username, best: Number(r.best_wave), best2: Number(r.best_kills), runs: Number(r.runs), wins: 0, losses: 0, place: Number(ahead[0]?.n ?? 0) + 1 };
  }
  const around =
    me && !top.some((t) => t.uid === user.userid)
      ? await aroundOf(
          `bym.td_score s JOIN bym."user" u ON u.userid = s.user_id`,
          `s.best_wave > 0 ${notAdmin}`,
          `s.best_wave DESC, s.best_kills DESC, s.best_at ASC`,
          [...admins],
          user.userid,
          `s.user_id AS uid, u.username AS name, s.best_wave AS best, s.best_kills AS best2, s.runs`,
        )
      : [];
  return { game: "hellgate", mode: "solo", period: "", top, me, around };
};
