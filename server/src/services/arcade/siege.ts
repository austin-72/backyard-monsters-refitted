import { questArcadeWin } from "../quests/questHooks.js";
import { createHash, randomInt } from "crypto";

import { Save } from "../../database/models/save.model.js";
import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { descentTemplate } from "../../game-data/tribes/devil/molochStrongholds.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { logger } from "../../utils/logger.js";
import { recordMatch, recordScore } from "./scores.js";
import { sendMail } from "../mail/sendMail.js";

/**
 * Inferno-only: Siege, the Devil's Arcade's attack game (the user's pick, 7 October). A yard (one of Moloch's
 * strongholds, as its Designer layout stands) and an army, the same for everyone who plays that yard: the
 * monsters are the arcade's, not the player's (nothing of theirs is used, lost or won), at the army's level.
 * The score is how much of the yard is wrecked, and how fast (from the first monster flung).
 *
 *  - Daily: one yard and army a day (UTC), from the day; three attacks, the best counts on the day's board
 *    (period = the day).
 *  - Duel: a challenge to a named player (or open to anyone): both attack the same yard with the same army, one
 *    after the other; the more wrecked wins (equal: the faster). A duel not answered in DUEL_DAYS expires.
 *
 * Each attack is a row of bym.arcade_siege (the duel's two attacks are one row) and makes the player's siege
 * yard afresh (bym.save, type tribe, base id 6e14 + the user id, like Moloch's Gauntlet's), attacked in
 * "wmattack" mode from the game (IoSiege). Its saves are answered and not written (baseSave.ts); the game sends
 * the result at the end (finish), checked against the time the attack took.
 */
export class SiegeError extends Error {}

const SIEGE_BASE = 600_000_000_000_000;
export const siegeBaseId = (userid: number) => String(SIEGE_BASE + userid);
export const parseSiegeBaseId = (baseid: string | number | null | undefined) => {
  const n = Number(baseid);
  if (!Number.isFinite(n) || n <= SIEGE_BASE || n >= SIEGE_BASE + 100_000_000_000) return null;
  return { userid: n - SIEGE_BASE };
};
export const isSiegeBaseId = (baseid: string | number | null | undefined) => parseSiegeBaseId(baseid) !== null;

export const DAILY_TRIES = 3;
export const DUEL_DAYS = 3;
/** An attack's clock (seconds): the attack ends when it runs out. */
export const SIEGE_SECONDS = 180;

/** Monsters an army is made of: [id, how many at strength 1]. Spurtz always come. */
const POOL: [string, number][] = [
  ["IC2", 7],
  ["IC3", 6],
  ["IC4", 7],
  ["IC5", 3],
  ["IC6", 3],
  ["IC7", 9],
  ["IC8", 2],
  ["IC12", 4],
  ["IC14", 5],
  ["IC15", 7],
  ["IC20", 3],
];

const today = () => new Date().toISOString().slice(0, 10);

const seedOf = (text: string) => parseInt(createHash("sha256").update(text).digest("hex").slice(0, 8), 16) % 2_000_000_000 + 1;

/** A stream of numbers from a seed (the same seed, the same yard and army). */
const stream = (seed: number) => {
  let s = seed % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** The yard and army a seed makes: Moloch stronghold 3 to 10, an army sized for it, at a level from 1 to 4. */
export const siegeSpec = (seed: number) => {
  const r = stream(seed);
  const stronghold = 3 + Math.floor(r() * 8);
  const level = 1 + Math.floor((stronghold - 1) / 3);
  const strength = 0.9 + stronghold * 0.16;
  const army: Record<string, number> = { IC1: Math.round(22 * strength) };
  const pool = POOL.slice();
  for (let k = 0; k < 4; k++) {
    const [id, n] = pool.splice(Math.floor(r() * pool.length), 1)[0];
    army[id] = Math.max(1, Math.round(n * strength));
  }
  return { seed, stronghold, level, army, seconds: SIEGE_SECONDS };
};

export const dailySpec = (day = today()) => siegeSpec(seedOf(`siege-daily-${day}`));

const sql = async <T = Record<string, unknown>>(q: string, params: unknown[] = []) =>
  (await postgres.em.getConnection().execute(q, params, "all")) as T[];

/** The player's siege yard, made afresh for an attack: the stronghold as the seed says, untouched. */
const makeYard = async (user: User, spec: ReturnType<typeof siegeSpec>) => {
  const template = descentTemplate(spec.stronghold);
  if (!template) throw new SiegeError("That yard couldn't be made. Try again later.");
  const em = postgres.em.fork();
  const baseid = siegeBaseId(user.userid);
  await em.nativeDelete(Save, { baseid });
  const { baseid: _reserved, ...yard } = template;
  const save = em.create(
    Save,
    {
      ...yard,
      baseid,
      type: BaseType.TRIBE,
      wmid: 0,
      userid: 0,
      saveuserid: 0,
      worldid: null,
      level: spec.stronghold * 4,
      name: "Siege",
      resources: { r1: 0, r2: 0, r3: 0, r4: 0 },
      buildingresources: {},
      buildinghealthdata: {},
      damage: 0,
      destroyed: 0,
      attackid: 0,
      savetime: getCurrentDateTime(),
      createtime: getCurrentDateTime(),
    } as never,
    { partial: true },
  ) as Save;
  em.persist(save);
  await em.flush();
  return baseid;
};

/** A siege yard is only ever attacked, by its own player (baseLoad.ts). */
export const siegeYard = async (user: User, baseid: string): Promise<Save> => {
  const parsed = parseSiegeBaseId(baseid);
  if (!parsed || parsed.userid !== user.userid) throw new SiegeError("That isn't your siege.");
  const yard = await postgres.em.findOne(Save, { baseid }, { refresh: true });
  if (!yard) throw new SiegeError("That siege is over.");
  return yard;
};

/** An attack's result; `pending` while it is being made (an attack left unfinished stays at nothing wrecked). */
interface Result {
  pct: number;
  tenths: number;
  pending?: boolean;
}

/** A pending attack older than this counts as it stands (nothing wrecked). */
const PENDING_MINUTES = 30;

interface SiegeRow {
  id: number;
  kind: string;
  day: string;
  challenger: number;
  rival: number | null;
  seed: number;
  state: string;
  challenger_result: Result | null;
  rival_result: Result | null;
  winner: number | null;
  created_at: string;
  updated_at: string;
  cname?: string;
  rname?: string;
}

/** The attack under way for each player: which row, which side, since when (one at a time). */
const running = new Map<number, { id: number; side: "challenger" | "rival"; at: number; damage?: number; saves?: number; mode?: string; marked?: boolean; firstHit?: number }>();

/**
 * (18 October, SUSPECTED-BUGS.md: "Siege results come entirely from the game: any wreck %, and a time of 0") The
 * fastest any attack wrecks: a save may say no more than SIEGE_MOST_PCT_PER_SECOND for each second since the yard
 * was loaded (100% in 20 s; the army is flung a monster at a time and the stronghold's walls and hall stand long
 * after), and a result's time is no less than SIEGE_LEAST_TENTHS_PER_PCT for each percent wrecked (100% in 15 s),
 * nor than the time from the first save that wrecked anything to the finish.
 */
export const SIEGE_MOST_PCT_PER_SECOND = 5;
export const SIEGE_LEAST_TENTHS_PER_PCT = 1.5;
/** Room for the network around the server's own clock (tenths). */
const SIEGE_CLOCK_SLACK = 30;

/** An attack running longer than this is given up (its result counted as it stands: settle). */
const RUN_LIMIT_MS = PENDING_MINUTES * 60_000;

/** The running attack, if it isn't stale (one started and never finished blocked its duel for good; 9 October). */
const runningOf = (userid: number) => {
  const run = running.get(userid);
  if (run && Date.now() - run.at > RUN_LIMIT_MS) {
    running.delete(userid);
    return undefined;
  }
  return run;
};

/**
 * A save of the player's siege yard during the attack (baseSave.ts): the most wrecked it has said so far, which
 * the result at the end may not go much past (9 October: the result was the game's word alone).
 */
export const noteSiegeSave = (userid: number, damage: unknown) => {
  const run = runningOf(userid);
  const d = Number(damage);
  if (!run || !Number.isFinite(d)) return;
  const most = Math.floor(((Date.now() - run.at) / 1000) * SIEGE_MOST_PCT_PER_SECOND);
  if (d > most) logger.warn(`Arcade: Siege attack ${run.id}: a save said ${d}% ${Math.round((Date.now() - run.at) / 1000)} s in: counted ${most}%`);
  run.damage = Math.max(run.damage ?? 0, Math.min(100, most, Math.max(0, d)));
  if (run.damage > 0 && !run.firstHit) run.firstHit = Date.now();
  run.saves = (run.saves ?? 0) + 1;
  // (QoL #538: a Daily try that has wrecked something is a try, whatever happens to it now; marked on its row once:
  // one with nothing reported, lost to a crash or a reload, is given back: dailyTries)
  if (run.mode === "daily" && !run.marked && run.damage > 0) {
    run.marked = true;
    void sql(`UPDATE bym.arcade_siege SET challenger_result = ?::jsonb, updated_at = now() WHERE id = ? AND kind = 'daily' AND challenger_result IS NULL`, [JSON.stringify({ pct: 0, tenths: SIEGE_SECONDS * 10, pending: true }), run.id]).catch((e) => {
      run.marked = false;
      logger.warn(`Arcade: Siege attack ${run.id} couldn't be marked: ${e}`);
    });
  }
};

/**
 * Inferno-only (QoL #538, 15 October): the day's Daily tries. A try used to count from its start, so one lost to a
 * crash or a reload before the attack had done anything was gone. Now a try counts once it has reported something
 * wrecked (noteSiegeSave marks its row) or has finished; a started try with nothing reported is given back: the
 * next Daily start uses that row again (the same yard and army: the day's). `spent`: the tries counted; `unused`:
 * the rows given back (the first is reused).
 */
const dailyTries = async (userid: number, day: string) => {
  const rows = await sql<{ id: number; spent: boolean }>(
    `SELECT id, (state <> 'open' OR challenger_result IS NOT NULL) AS spent FROM bym.arcade_siege WHERE kind = 'daily' AND day = ? AND challenger = ? ORDER BY id`,
    [day, userid],
  );
  const run = running.get(userid);
  let spent = 0;
  const unused: number[] = [];
  for (const r of rows) {
    // (the try running now with something wrecked but its mark not written yet counts too)
    if (r.spent || (run && run.id === Number(r.id) && (run.damage ?? 0) > 0)) spent++;
    else unused.push(Number(r.id));
  }
  return { spent, unused };
};

const names = async (ids: number[]) => {
  const out = new Map<number, string>();
  const list = ids.filter((x) => x);
  if (!list.length) return out;
  for (const r of await sql<{ userid: number; username: string }>(`SELECT userid, username FROM bym."user" WHERE userid IN (${list.map(() => "?").join(",")})`, list))
    out.set(Number(r.userid), String(r.username));
  return out;
};

/** A duel with both attacks in: the winner (more wrecked; equal, the faster), recorded for both. */
const resolve = async (id: number) => {
  const d = (await sql<SiegeRow>(`SELECT * FROM bym.arcade_siege WHERE id = ? AND kind = 'duel'`, [id]))[0];
  if (!d || d.state === "done" || !d.rival) return;
  const a = d.challenger_result;
  const b = d.rival_result;
  if (!a || !b || a.pending || b.pending) return;
  const winner = a.pct > b.pct || (a.pct === b.pct && a.tenths < b.tenths) ? d.challenger : b.pct > a.pct || (a.pct === b.pct && b.tenths < a.tenths) ? d.rival : null;
  const done = await sql(`UPDATE bym.arcade_siege SET state = 'done', winner = ?, updated_at = now() WHERE id = ? AND state <> 'done' RETURNING id`, [winner, d.id]);
  if (!done.length) return;
  for (const [uid, r] of [
    [d.challenger, a],
    [d.rival, b],
  ] as [number, Result][]) {
    await recordMatch(uid, "siege", "duel", winner === null ? "draw" : winner === uid ? "win" : "loss", Math.round(r.pct * 10));
    if (winner === uid) questArcadeWin(uid, true);
  }
  const nm = await names([d.challenger, d.rival]);
  logger.info(`Arcade: Siege duel ${d.id}: ${nm.get(d.challenger)} ${a.pct}% v ${nm.get(d.rival)} ${b.pct}%`);
};

/** Old business: duels nobody answered expire; attacks left unfinished count as they stand; duels then resolved. */
const settle = async (userid: number) => {
  await sql(`UPDATE bym.arcade_siege SET state = 'expired', updated_at = now()
              WHERE kind = 'duel' AND state IN ('open', 'waiting') AND rival_result IS NULL AND created_at < now() - interval '${DUEL_DAYS} days'`);
  const stale = await sql<SiegeRow>(
    `SELECT * FROM bym.arcade_siege WHERE kind = 'duel' AND state IN ('open', 'waiting') AND (challenger = ? OR rival = ?)
        AND updated_at < now() - interval '${PENDING_MINUTES} minutes'
        AND ((challenger_result->>'pending') = 'true' OR (rival_result->>'pending') = 'true')`,
    [userid, userid],
  );
  for (const d of stale) {
    for (const [column, r] of [
      ["challenger_result", d.challenger_result],
      ["rival_result", d.rival_result],
    ] as [string, Result | null][]) {
      if (r && r.pending && !(runningOf(column === "challenger_result" ? d.challenger : (d.rival ?? 0))?.id === d.id)) {
        await sql(`UPDATE bym.arcade_siege SET ${column} = ?::jsonb, state = CASE WHEN state = 'open' THEN 'waiting' ELSE state END WHERE id = ?`, [JSON.stringify({ pct: 0, tenths: SIEGE_SECONDS * 10 }), d.id]);
      }
    }
    await resolve(d.id);
  }
};

/** status: the day's Daily (tries left, best), the player's duels, open duels to take. */
const status = async (user: User) => {
  const day = today();
  const spec = dailySpec(day);
  // (QoL #538: tries that never reported anything aren't counted)
  const counted = await dailyTries(user.userid, day);
  const tries = counted.spent;
  const best = (await sql<{ best: number; best2: number }>(`SELECT best, best2 FROM bym.arcade_score WHERE user_id = ? AND game = 'siege' AND mode = 'daily' AND period = ?`, [user.userid, day]))[0];
  await settle(user.userid);
  const duels = await sql<SiegeRow>(
    `SELECT s.*, c.username AS cname, r.username AS rname FROM bym.arcade_siege s JOIN bym."user" c ON c.userid = s.challenger LEFT JOIN bym."user" r ON r.userid = s.rival
      WHERE s.kind = 'duel' AND (s.challenger = ? OR s.rival = ?) ORDER BY s.created_at DESC LIMIT 12`,
    [user.userid, user.userid],
  );
  const open = await sql<SiegeRow>(
    `SELECT s.*, c.username AS cname FROM bym.arcade_siege s JOIN bym."user" c ON c.userid = s.challenger
      WHERE s.kind = 'duel' AND s.state = 'waiting' AND s.rival IS NULL AND s.challenger <> ? ORDER BY s.created_at DESC LIMIT 8`,
    [user.userid],
  );
  return {
    day,
    // (QoL #132: the server's clock, for the duels' "expires in")
    now: Math.floor(Date.now() / 1000),
    daily: { ...spec, tries, triesLeft: Math.max(0, DAILY_TRIES - tries), best: best ? { pct: Number(best.best) / 10, tenths: 36000 - Number(best.best2) } : null, givenBack: counted.unused.length > 0 },
    duels: duels.map((d) => duelView(d, user.userid)),
    open: open.map((d) => ({ id: d.id, challenger: d.cname, result: d.challenger_result, created: d.created_at, expires: expiresAt(d) })),
  };
};

/**
 * Inferno-only (QoL #132, 15 October): when a duel not answered yet expires (unix seconds; settle expires it
 * DUEL_DAYS after it was made), or 0 for one that is over or answered.
 */
const expiresAt = (d: SiegeRow) => {
  if (d.state === "done" || d.state === "expired" || d.rival_result) return 0;
  const made = new Date(d.created_at as unknown as string).getTime();
  return Number.isFinite(made) ? Math.floor(made / 1000) + DUEL_DAYS * 86400 : 0;
};

const duelView = (d: SiegeRow, me: number) => {
  const mine = d.challenger === me ? "challenger" : "rival";
  const myResult = mine === "challenger" ? d.challenger_result : d.rival_result;
  const theirs = mine === "challenger" ? d.rival_result : d.challenger_result;
  return {
    id: d.id,
    state: d.state,
    rival: mine === "challenger" ? (d.rname ?? null) : d.cname,
    youChallenged: mine === "challenger",
    you: myResult,
    them: d.state === "done" ? theirs : theirs ? { pct: -1, tenths: -1, pending: Boolean(theirs.pending) } : null,
    canAttack: !myResult && d.state !== "done" && d.state !== "expired" && (mine === "challenger" || d.rival === me || d.rival === null),
    won: d.state === "done" ? (d.winner === me ? 1 : d.winner === null ? 0 : -1) : null,
    created: d.created_at,
    // (QoL #132)
    expires: expiresAt(d),
  };
};

/** Starts an attack: the row's yard made, the attack noted as running. */
const startAttack = async (user: User, row: { id: number; seed: number }, side: "challenger" | "rival", mode: string) => {
  const spec = siegeSpec(row.seed);
  const baseid = await makeYard(user, spec);
  if (mode === "duel") {
    // (one attack a side: started is as good as made; one left unfinished counts as nothing wrecked)
    const column = side === "challenger" ? "challenger_result" : "rival_result";
    await sql(`UPDATE bym.arcade_siege SET ${column} = ?::jsonb, updated_at = now() WHERE id = ?`, [JSON.stringify({ pct: 0, tenths: SIEGE_SECONDS * 10, pending: true }), row.id]);
  }
  running.set(user.userid, { id: row.id, side, at: Date.now(), mode });
  return { attack: row.id, mode, baseid, ...spec };
};

const daily = async (user: User) => {
  const day = today();
  // (QoL #538: a try with nothing reported, lost to a crash or a reload, isn't counted: its row is used again)
  const { spent, unused } = await dailyTries(user.userid, day);
  if (spent >= DAILY_TRIES) throw new SiegeError(`You've had your ${DAILY_TRIES} tries at today's Siege. A new yard comes at midnight (UTC).`);
  const spec = dailySpec(day);
  if (unused.length) {
    const again = await sql<{ id: number }>(`UPDATE bym.arcade_siege SET updated_at = now() WHERE id = ? AND state = 'open' AND challenger_result IS NULL RETURNING id`, [unused[0]]);
    if (again.length) {
      logger.info(`Arcade: Siege Daily ${unused[0]}: ${user.username}'s try lost before it did anything, given back`);
      return { ...(await startAttack(user, { id: unused[0], seed: spec.seed }, "challenger", "daily")), givenBack: true };
    }
  }
  const row = (await sql<{ id: number }>(`INSERT INTO bym.arcade_siege (kind, day, challenger, seed, state) VALUES ('daily', ?, ?, ?, 'open') RETURNING id`, [day, user.userid, spec.seed]))[0];
  return startAttack(user, { id: row.id, seed: spec.seed }, "challenger", "daily");
};

/** A duel: challenges a player by name (or anyone, with no name), and the challenger attacks first. */
const challenge = async (user: User, name: unknown) => {
  const n = String(name ?? "").trim();
  let rival: number | null = null;
  if (n) {
    const found = await sql<{ userid: number }>(`SELECT userid FROM bym."user" WHERE lower(username) = lower(?)`, [n]);
    if (!found.length) throw new SiegeError(`There's no player called ${n}.`);
    rival = Number(found[0].userid);
    if (rival === user.userid) throw new SiegeError("You can't duel yourself.");
  }
  const pending = (await sql<{ n: number }>(`SELECT count(*)::int AS n FROM bym.arcade_siege WHERE kind = 'duel' AND challenger = ? AND state IN ('open', 'waiting')`, [user.userid]))[0].n;
  if (pending >= 5) throw new SiegeError("You have five duels waiting already. Let them finish first.");
  const seed = randomInt(1, 2_000_000_000);
  const row = (await sql<{ id: number }>(`INSERT INTO bym.arcade_siege (kind, day, challenger, rival, seed, state) VALUES ('duel', ?, ?, ?, ?, 'open') RETURNING id`, [today(), user.userid, rival, seed]))[0];
  return startAttack(user, { id: row.id, seed }, "challenger", "duel");
};

/** The other side of a duel: a duel the player was challenged to, or an open one they take. */
const answer = async (user: User, id: unknown) => {
  const rows = await sql<SiegeRow>(`SELECT * FROM bym.arcade_siege WHERE id = ? AND kind = 'duel'`, [Number(id)]);
  const d = rows[0];
  if (!d || d.state === "done" || d.state === "expired") throw new SiegeError("That duel is over.");
  if (d.challenger === user.userid) {
    if (d.challenger_result) throw new SiegeError("You've made your attack in that duel.");
    return startAttack(user, d, "challenger", "duel");
  }
  if (d.rival !== null && d.rival !== user.userid) throw new SiegeError("That duel isn't yours.");
  if (d.rival_result) throw new SiegeError("You've made your attack in that duel.");
  if (d.rival === null) {
    // (an open duel: the first to take it is the rival)
    const took = await sql(`UPDATE bym.arcade_siege SET rival = ?, updated_at = now() WHERE id = ? AND rival IS NULL RETURNING id`, [user.userid, d.id]);
    if (!took.length) throw new SiegeError("Someone else took that duel first.");
  }
  return startAttack(user, d, "rival", "duel");
};

/**
 * The end of an attack: how much was wrecked (0 to 100) and how long it took (tenths of a second, from the
 * first monster flung). Checked: the attack is the one running, and it didn't take less time than it says.
 */
const finish = async (user: User, attack: unknown, pct: unknown, tenths: unknown) => {
  const run = runningOf(user.userid);
  if (!run || run.id !== Number(attack)) throw new SiegeError("That attack isn't running.");
  running.delete(user.userid);
  let p = Math.round(Number(pct) * 10) / 10;
  let t = Math.round(Number(tenths));
  if (!Number.isFinite(p) || p < 0) p = 0;
  // (no more than the yard's saves said, give or take the last moments and the walls)
  const said = run.damage ?? 0;
  if (p > said + 10) logger.warn(`Arcade: Siege attack ${run.id}: ${p}% sent, the saves said ${said}% (${run.saves ?? 0} saves)`);
  p = Math.min(100, p, said + 10);
  logger.info(`Arcade: Siege attack ${run.id} finished: ${p}% (the saves said ${said}%, ${run.saves ?? 0} saves)`);
  if (!Number.isFinite(t) || t < 0) t = 0;
  const elapsed = Math.ceil((Date.now() - run.at) / 100);
  if (t > elapsed + 50) t = elapsed;
  t = Math.min(t, SIEGE_SECONDS * 10 + 600);
  // (no faster than the saves showed it going, nor than any attack can wreck that much)
  const least = Math.max(Math.ceil(p * SIEGE_LEAST_TENTHS_PER_PCT), run.firstHit ? Math.floor((Date.now() - run.firstHit) / 100) - SIEGE_CLOCK_SLACK : 0);
  if (t < least) {
    logger.warn(`Arcade: Siege attack ${run.id}: ${p}% in ${t / 10} s sent; counted ${least / 10} s`);
    t = least;
  }
  const result = { pct: p, tenths: t };
  const rows = await sql<SiegeRow>(`SELECT * FROM bym.arcade_siege WHERE id = ?`, [run.id]);
  const d = rows[0];
  if (!d) throw new SiegeError("That attack is gone.");
  await postgres.em.fork().nativeDelete(Save, { baseid: siegeBaseId(user.userid) });
  if (d.kind === "daily") {
    await sql(`UPDATE bym.arcade_siege SET challenger_result = ?::jsonb, state = 'done', updated_at = now() WHERE id = ?`, [JSON.stringify(result), d.id]);
    await recordScore(user.userid, "siege", "daily", d.day, Math.round(p * 10), 36000 - t);
    return { result, ...(await status(user)) };
  }
  // a duel: this side's attack in, and when both are in, the winner
  const column = run.side === "challenger" ? "challenger_result" : "rival_result";
  await sql(`UPDATE bym.arcade_siege SET ${column} = ?::jsonb, state = CASE WHEN state = 'open' THEN 'waiting' ELSE state END, updated_at = now() WHERE id = ?`, [JSON.stringify(result), d.id]);
  await resolve(d.id);
  // Inferno-only (QoL #132, 15 October): the challenger has attacked: the player challenged by name is told by mail
  // that it's their turn (not when they have started theirs already)
  if (run.side === "challenger" && d.rival && !d.rival_result) void duelTurnMail(user, d, result);
  return { result, ...(await status(user)) };
};

/** (QoL #132) "Your turn" to the player challenged: what the challenger did, and how long the duel waits. Never fails. */
const duelTurnMail = async (challenger: User, d: SiegeRow, result: Result) => {
  try {
    const left = expiresAt({ ...d, rival_result: null }) - Math.floor(Date.now() / 1000);
    if (!d.rival || left <= 0) return;
    const days = Math.floor(left / 86400);
    const hours = Math.floor((left % 86400) / 3600);
    const waits = days > 0 ? `${days} day${days === 1 ? "" : "s"}${hours > 0 ? ` ${hours} h` : ""}` : `${Math.max(1, hours)} h`;
    const secs = result.tenths / 10;
    const time = `${Math.floor(secs / 60)}:${(secs % 60 < 10 ? "0" : "") + (secs % 60).toFixed(1)}`;
    await sendMail(
      challenger.userid,
      d.rival,
      "Siege duel: your turn",
      `${challenger.username} challenged you to a Siege duel in the Devil's Arcade and wrecked ${Math.round(result.pct * 10) / 10}% of the yard in ${time}. ` +
        `Your turn: the same yard, the same army. Open the Devil's Arcade, then Siege and Duels. The duel waits ${waits} more for your attack.`,
    );
  } catch (e) {
    logger.warn(`Arcade: Siege duel ${d.id}: the turn mail wasn't sent: ${e}`);
  }
};

/** POST arcade, action siege: op = status | daily | challenge (name) | answer (id) | finish (attack, pct, tenths). */
export const siegeAction = async (user: User, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  switch (String(body.op ?? "status")) {
    case "status":
      return status(user);
    case "daily":
      return daily(user);
    case "challenge":
      return challenge(user, body.name);
    case "answer":
      return answer(user, body.id);
    case "finish":
      return finish(user, body.attack, body.pct, body.tenths);
    default:
      throw new SiegeError("Unknown siege action.");
  }
};
