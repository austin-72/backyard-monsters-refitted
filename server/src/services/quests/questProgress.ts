import { createHash } from "crypto";

import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { BaseType } from "../../enums/Base.js";
import type { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { outpostTally } from "../alliance/allianceOutposts.js";
import { calculateBaseLevel } from "../base/calculateBaseLevel.js";
import {
  CHESTS,
  CLIENT_EVENTS,
  DAILY_BONUS,
  DAILY_COUNT,
  DAILY_POOL,
  QUEST_CATEGORIES,
  QUESTS,
  STRONGBOX_PAGES,
  questById,
  type DailyDef,
  type QuestDef,
  type Reward,
} from "./questBook.js";

/**
 * Inferno-only: each player's quest book (bym.quest_progress: migration 20261008_AddQuestBook).
 *
 * - `counters`: things the server and the game count (chat lines, captures, warts picked, wins...), all
 *   since the quest book came in. Some are "best so far" instead (bank, streak, gauntlet_best...).
 * - `claimed`: the quests and chests collected, with when.
 * - `daily`: today's (UTC) counters and the daily quests collected, started again each day.
 * - `forced`: quests an admin marked ready.
 *
 * What a quest counts is either such a counter or something read when asked (questValues): building
 * levels and the Strongbox from the main yard's save, outposts held, the alliance, friends invited,
 * bookmarks, Brimstone Pit bets, the Gauntlet. So a player who already did something has it at once.
 *
 * Rewards are paid by the server, into the main yard (as Moloch's Gauntlet pays), once.
 */

type Em = ReturnType<typeof postgres.orm.em.fork>;

/** A query, in `em`'s transaction when it has one (without the context it would run on its own connection). */
const sql = <T = Record<string, unknown>>(query: string, params: unknown[] = [], em?: Em) => {
  const m = em ?? postgres.em;
  return m.getConnection().execute<T[]>(query, params, "all", m.getTransactionContext());
};

/** Today, UTC: daily quests change at midnight UTC. */
export const questDay = (at = new Date()) => at.toISOString().slice(0, 10);

const DAILY_KEYS = new Set(DAILY_POOL.map((d) => d.key));

const enabled = () => infernoOnlyConfig.enabled;

// ---- counting

/**
 * Adds to a counter (and to today's, when a daily quest counts it). Never throws: a quest counter must not
 * fail what it counts.
 */
export const questBump = async (userid: number, key: string, n = 1) => {
  if (!enabled() || !userid || !(n > 0)) return;
  try {
    const day = questDay();
    const daily = DAILY_KEYS.has(key);
    await sql(
      `INSERT INTO bym.quest_progress (userid, counters, daily)
         VALUES (?, jsonb_build_object(?::text, ?::bigint),
                 jsonb_build_object('date', ?::text, 'c', CASE WHEN ? THEN jsonb_build_object(?::text, ?::bigint) ELSE '{}'::jsonb END, 'claimed', '[]'::jsonb))
       ON CONFLICT (userid) DO UPDATE SET
         counters = quest_progress.counters || jsonb_build_object(?::text, COALESCE((quest_progress.counters->>?)::bigint, 0) + ?::bigint),
         daily = CASE
           WHEN NOT ? THEN quest_progress.daily
           WHEN quest_progress.daily->>'date' = ? THEN jsonb_set(quest_progress.daily, '{c}',
             COALESCE(quest_progress.daily->'c', '{}'::jsonb) || jsonb_build_object(?::text, COALESCE((quest_progress.daily->'c'->>?)::bigint, 0) + ?::bigint))
           ELSE jsonb_build_object('date', ?::text, 'c', jsonb_build_object(?::text, ?::bigint), 'claimed', '[]'::jsonb)
         END,
         updated_at = now()`,
      [userid, key, n, day, daily, key, n, key, key, n, daily, day, key, key, n, day, key, n]
    );
  } catch (err) {
    logger.warn(`Quests: counting ${key} for player #${userid} failed: ${err}`);
  }
};

/** Keeps the best so far (a streak, the biggest bank, the furthest gate). */
export const questBest = async (userid: number, key: string, value: number) => {
  if (!enabled() || !userid || !(value > 0)) return;
  try {
    await sql(
      `INSERT INTO bym.quest_progress (userid, counters) VALUES (?, jsonb_build_object(?::text, ?::bigint))
       ON CONFLICT (userid) DO UPDATE SET
         counters = quest_progress.counters || jsonb_build_object(?::text, GREATEST(COALESCE((quest_progress.counters->>?)::bigint, 0), ?::bigint)),
         updated_at = now()`,
      [userid, key, Math.floor(value), key, key, Math.floor(value)]
    );
  } catch (err) {
    logger.warn(`Quests: keeping ${key} for player #${userid} failed: ${err}`);
  }
};

// ---- chat (server/src/chat/chatRooms.ts postMessage)

const MENTION = /@([A-Za-z0-9_\-.]{2,24})/g;

/**
 * A chat line was posted. Global lines count once a minute at most and only when different from the last
 * counted (so the quests can't be farmed by repeating a word); Alliance lines, mentions of a real player and
 * shared places once each line.
 */
export const questChat = async (userid: number, where: "global" | "alliance", body: string) => {
  if (!enabled() || !userid) return;
  try {
    if (where === "global") {
      const key = `quest:chat:${userid}`;
      const hash = createHash("sha1").update(body.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
      const last = await redis.get(key);
      const [lastAt, lastHash] = (last ?? "0:").split(":");
      if (Date.now() - Number(lastAt) >= 60_000 && hash !== lastHash) {
        await redis.set(key, `${Date.now()}:${hash}`);
        await redis.expire(key, 3600);
        await questBump(userid, "chat_global");
      }
    } else {
      await questBump(userid, "chat_alliance");
    }
    if (/\[map:\d{1,3},\d{1,3}/.test(body)) await questBump(userid, "chat_share");
    const names = [...new Set([...body.matchAll(MENTION)].map((m) => m[1].toLowerCase()))].slice(0, 5);
    if (names.length) {
      const found = await sql<{ n: string }>(
        `SELECT count(*) AS n FROM bym."user" WHERE lower(username) IN (${names.map(() => "?").join(",")}) AND userid <> ?`,
        [...names, userid]
      );
      if (Number(found[0]?.n ?? 0) > 0) await questBump(userid, "chat_mention");
    }
  } catch (err) {
    logger.warn(`Quests: chat for player #${userid}: ${err}`);
  }
};

// ---- alliance invites (the invite row doesn't say who sent it)

const inviterKey = (inviteId: number) => `quest:inviter:${inviteId}`;

/** An officer or the leader invited a player (controllers/alliance/inviteUser.ts). */
export const questInviteSent = async (inviteId: number, inviterId: number) => {
  if (!enabled() || !inviteId) return;
  try {
    await redis.set(inviterKey(inviteId), String(inviterId), "EX", String(35 * 86400));
  } catch (err) {
    logger.warn(`Quests: invite #${inviteId}: ${err}`);
  }
};

/**
 * A player joined: the one who invited them counts it (an invite accepted), or the officer or leader who
 * let them in (a request accepted).
 */
export const questInviteAccepted = async (inviteId: number, answeredBy: number, wasInvite: boolean) => {
  if (!enabled()) return;
  try {
    const by = wasInvite ? Number((await redis.get(inviterKey(inviteId))) ?? 0) : answeredBy;
    if (by) await questBump(by, "invite_accepted");
    if (wasInvite) await redis.del(inviterKey(inviteId));
  } catch (err) {
    logger.warn(`Quests: invite #${inviteId} accepted: ${err}`);
  }
};

/**
 * Something the game reports (POST /quests/event): only the kinds in CLIENT_EVENTS, each report held to its
 * most and to how often it may come.
 */
export const questClientEvent = async (userid: number, type: string, n: number) => {
  const rule = CLIENT_EVENTS[type];
  if (!rule) return false;
  const amount = Math.max(1, Math.min(rule.max, Math.floor(Number(n) || 1)));
  if (rule.everyMs > 0) {
    const key = `quest:ev:${userid}:${type}`;
    if ((await redis.set(key, "1", "PX", String(rule.everyMs), "NX")) !== "OK") return false;
  }
  if (rule.mode === "max") await questBest(userid, type, amount);
  else await questBump(userid, type, amount);
  return true;
};

// ---- what the player has done

interface Row {
  counters: Record<string, number>;
  claimed: Record<string, number>;
  daily: { date?: string; c?: Record<string, number>; claimed?: string[]; picked?: string[] };
  forced: Record<string, boolean>;
}

const readRow = async (userid: number, em?: Em, lock = false): Promise<Row> => {
  const rows = await sql<Row>(
    `SELECT counters, claimed, daily, forced FROM bym.quest_progress WHERE userid = ?${lock ? " FOR UPDATE" : ""}`,
    [userid],
    em
  );
  const r = rows[0];
  return {
    counters: (r?.counters as Record<string, number>) ?? {},
    claimed: (r?.claimed as Record<string, number>) ?? {},
    daily: (r?.daily as Row["daily"]) ?? {},
    forced: (r?.forced as Record<string, boolean>) ?? {},
  };
};

const TOWERS = [21, 129, 130, 132, 144, 145];

const pageMonsters = (page: number) => (STRONGBOX_PAGES[page] ?? []).filter((id) => id !== "C19" || infernoOnlyConfig.rezghul.enabled);

const json = (v: unknown): Record<string, unknown> => {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return v as Record<string, unknown>;
};

/** Every value a quest can count, for one player (counters, then what is read from the yard and the database). */
export const questValues = async (user: User, row: Row, em?: Em) => {
  const v: Record<string, number> = {};
  for (const [k, n] of Object.entries(row.counters)) v[k] = Number(n) || 0;
  const userid = user.userid;

  const save = (
    await sql<{ buildingdata: unknown; lockerdata: unknown; academy: unknown; points: string; basevalue: string }>(
      `SELECT buildingdata, lockerdata, academy, points, basevalue FROM bym.save WHERE userid = ? AND type = ? LIMIT 1`,
      [userid, BaseType.MAIN],
      em
    )
  )[0];
  if (save) {
    v.yard_level = calculateBaseLevel(String(save.points ?? "0"), String(save.basevalue ?? "0"));
    for (const b of Object.values(json(save.buildingdata)) as { t?: number; l?: number; cB?: number }[]) {
      if (!b || typeof b.t !== "number") continue;
      // (a building still being put up isn't there yet)
      const lvl = b.cB && b.cB > 0 && !b.l ? 0 : Number(b.l ?? 1);
      const k = `b${b.t}`;
      v[k] = Math.max(v[k] ?? 0, lvl);
      if (TOWERS.includes(b.t)) v.tower_max = Math.max(v.tower_max ?? 0, lvl);
    }
    const locker = json(save.lockerdata) as Record<string, { t?: number }>;
    for (const page of Object.keys(STRONGBOX_PAGES)) {
      v[`page${page}`] = pageMonsters(Number(page)).filter((id) => locker[id]?.t === 2).length;
    }
    for (const [id, a] of Object.entries(json(save.academy)) as [string, { level?: number }][]) {
      if (/^IC\d+$/.test(id) || id === "C19") v.academy_max = Math.max(v.academy_max ?? 0, Number(a?.level ?? 0));
    }
  }

  const held = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym.world_map_cell WHERE uid = ? AND base_type = 3 AND map_version = 2 AND destroyed_at IS NULL`,
    [userid],
    em
  );
  v.outposts = Number(held[0]?.n ?? 0);

  if (user.alliance_id) {
    v.alliance = 1;
    try {
      v.alliance_gain7 = (await outpostTally(user.alliance_id, 7)).gained;
      const rank = await sql<{ r: number }>(`SELECT value_world_rank AS r FROM bym.alliance_stats WHERE alliance_id = ?`, [user.alliance_id], em);
      v.alliance_top3 = rank[0] && Number(rank[0].r) > 0 && Number(rank[0].r) <= 3 ? 1 : 0;
    } catch {
      // (before migrations 20261006 / 20261007)
    }
  }

  const friends = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym."user" WHERE referred_by = ? AND referral_result = 'paid'`,
    [userid],
    em
  );
  v.referrals = Number(friends[0]?.n ?? 0);

  v.bookmarks = Number(json((user as unknown as { bookmarks?: unknown }).bookmarks).mbms ?? 0) || 0;

  const bets = await sql<{ game: string; n: string; jackpots: string }>(
    `SELECT game, count(*) AS n, count(*) FILTER (WHERE game IN ('slots', 'fortune', 'favor') AND outcome->>'line' = 'jackpot') AS jackpots
       FROM bym.casino_bet WHERE user_id = ? AND status <> 'refunded' GROUP BY game`,
    [userid],
    em
  );
  v.pit_rounds = 0;
  v.pit_jackpot = 0;
  for (const b of bets) {
    v[`pit_${b.game}`] = Number(b.n);
    v.pit_rounds += Number(b.n);
    v.pit_jackpot += Number(b.jackpots);
  }

  v.streak = Math.max(v.streak ?? 0, Number(user.login_streak ?? 0));
  try {
    const gate = await sql<{ s: number | null }>(`SELECT max(stage) AS s FROM bym.gauntlet_claim WHERE userid = ?`, [userid], em);
    v.gauntlet_best = Math.max(v.gauntlet_best ?? 0, Number(gate[0]?.s ?? 0));
  } catch {
    // (no Gauntlet table)
  }
  return v;
};

/** Today's values for the daily quests (the Pit's rounds are read from its bets). */
const dailyValues = async (userid: number, row: Row, em?: Em) => {
  const day = questDay();
  const v: Record<string, number> = {};
  if (row.daily.date === day) for (const [k, n] of Object.entries(row.daily.c ?? {})) v[k] = Number(n) || 0;
  const pit = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym.casino_bet WHERE user_id = ? AND status <> 'refunded' AND created_at >= (now() AT TIME ZONE 'utc')::date`,
    [userid],
    em
  );
  v.pit_rounds = Number(pit[0]?.n ?? 0);
  return v;
};

/** Whether the player can do a daily quest now (its `needs`). */
const canDo = (d: DailyDef, v: Record<string, number>, user: User) =>
  (d.needs ?? []).every((n) =>
    n === "level3" ? (v.yard_level ?? 1) >= 3 : n === "shiny" ? !user.shiny_locked : n.startsWith("b") ? (v[n] ?? 0) >= 1 : true
  );

/**
 * The daily quests a player has today: three (fewer while fewer can be done) of the ones they can do,
 * different for each player. Kept for the day once picked (row.daily.picked), so building something
 * halfway through the day doesn't swap them.
 */
export const dailyPick = (userid: number, v: Record<string, number>, user: User, row: Row, day = questDay()): DailyDef[] => {
  if (row.daily.date === day && Array.isArray(row.daily.picked)) {
    const kept = row.daily.picked.map((id) => DAILY_POOL.find((d) => d.id === id)).filter((d): d is DailyDef => Boolean(d));
    if (kept.length) return kept;
  }
  const scored = DAILY_POOL.filter((d) => canDo(d, v, user)).map((d) => ({ d, s: createHash("sha1").update(`${userid}:${day}:${d.id}`).digest().readUInt32BE(0) }));
  return scored.sort((a, b) => a.s - b.s).slice(0, DAILY_COUNT).map((x) => x.d);
};

// ---- the book as the game draws it

export type QuestState = "locked" | "progress" | "ready" | "claimed";

const targetOf = (q: QuestDef) => (q.key.startsWith("page") ? pageMonsters(Number(q.key.slice(4))).length : q.target);

const rewardOf = (r: Reward, shiny = 0) => ({ r1: r[0], r2: r[1], r3: r[2], r4: r[3], shiny });

interface Computed {
  quests: { def: QuestDef; target: number; value: number; state: QuestState }[];
  chests: { id: string; cat: string; done: number; total: number; state: QuestState; reward: ReturnType<typeof rewardOf> }[];
  daily: { def: DailyDef; value: number; state: QuestState }[];
  bonus: QuestState;
}

const compute = (row: Row, v: Record<string, number>): Computed => {
  const claimed = row.claimed;
  const quests = QUESTS.map((def) => {
    const target = targetOf(def);
    const value = row.forced[def.id] ? target : Math.min(target, v[def.key] ?? 0);
    const state: QuestState = claimed[def.id]
      ? "claimed"
      : def.parent && !claimed[def.parent]
        ? "locked"
        : value >= target
          ? "ready"
          : "progress";
    return { def, target, value, state };
  });
  const chests = CHESTS.filter((c) => c.cat !== "book").map((c) => {
    const needed = QUESTS.filter((x) => x.cat === c.cat && !x.optional);
    const done = needed.filter((x) => claimed[x.id]).length;
    const state: QuestState = claimed[c.id] ? "claimed" : done >= needed.length ? "ready" : "progress";
    return { id: c.id, cat: c.cat, done, total: needed.length, state, reward: rewardOf(c.r, c.shiny) };
  });
  const book = CHESTS.find((c) => c.cat === "book")!;
  const chestsDone = chests.filter((c) => c.state === "claimed").length;
  chests.push({
    id: book.id,
    cat: "book",
    done: chestsDone,
    total: chests.length,
    state: claimed[book.id] ? "claimed" : chestsDone >= chests.length ? "ready" : "progress",
    reward: rewardOf(book.r, book.shiny),
  });
  return { quests, chests, daily: [], bonus: "progress" };
};

/** The whole book for one player: computed, with today's daily quests. */
const computeAll = async (user: User, row: Row, em?: Em, known?: { v: Record<string, number>; dv: Record<string, number> }): Promise<Computed> => {
  const v = known?.v ?? (await questValues(user, row, em));
  const dv = known?.dv ?? (await dailyValues(user.userid, row, em));
  const base = compute(row, v);
  const today = questDay();
  const dailyClaimed = row.daily.date === today ? new Set(row.daily.claimed ?? []) : new Set<string>();
  const picked = dailyPick(user.userid, v, user, row, today);
  if (row.daily.date !== today) row.daily = { date: today, c: {}, claimed: [] };
  if (!Array.isArray(row.daily.picked)) row.daily.picked = picked.map((d) => d.id);
  base.daily = picked.map((def) => {
    const value = Math.min(def.target, dv[def.key] ?? 0);
    const state: QuestState = dailyClaimed.has(def.id) ? "claimed" : value >= def.target ? "ready" : "progress";
    return { def, value, state };
  });
  base.bonus = dailyClaimed.has("bonus") ? "claimed" : base.daily.every((d) => d.state === "claimed") ? "ready" : "progress";
  return base;
};

const msToMidnight = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
};

/** GET|POST /quests/status: the book, as the game draws it. */
export const questStatus = async (user: User) => {
  const row = await readRow(user.userid);
  const before = JSON.stringify(row.daily.picked ?? null) + (row.daily.date ?? "");
  const c = await computeAll(user, row);
  // (today's daily quests, kept once picked: a bump the same day keeps them, a new day picks again)
  if (JSON.stringify(row.daily.picked ?? null) + (row.daily.date ?? "") !== before) {
    await sql(
      `INSERT INTO bym.quest_progress (userid, daily) VALUES (?, ?::jsonb)
       ON CONFLICT (userid) DO UPDATE SET daily = CASE
         WHEN quest_progress.daily->>'date' = ? THEN jsonb_set(quest_progress.daily, '{picked}', ?::jsonb)
         ELSE ?::jsonb END, updated_at = now()`,
      [user.userid, JSON.stringify(row.daily), row.daily.date, JSON.stringify(row.daily.picked ?? []), JSON.stringify(row.daily)]
    );
  }
  const ready = c.quests.filter((x) => x.state === "ready").length + c.chests.filter((x) => x.state === "ready").length +
    c.daily.filter((x) => x.state === "ready").length + (c.bonus === "ready" ? 1 : 0);
  return {
    categories: QUEST_CATEGORIES,
    quests: c.quests.map(({ def, target, value, state }) => ({
      id: def.id,
      cat: def.cat,
      parent: def.parent,
      tmpl: def.tmpl,
      vars: def.vars ?? [],
      icon: def.icon,
      go: def.go ?? "",
      target,
      value,
      state,
      reward: rewardOf(def.r, def.shiny ?? 0),
      optional: def.optional === true,
      staff: def.staff === true,
      leader: def.leader === true,
    })),
    chests: c.chests,
    daily: {
      date: questDay(),
      endsIn: Math.floor(msToMidnight() / 1000),
      quests: c.daily.map(({ def, value, state }) => ({
        id: def.id,
        tmpl: def.tmpl,
        vars: [def.target],
        icon: def.icon,
        go: def.go ?? "",
        target: def.target,
        value,
        state,
        reward: rewardOf(def.r, def.shiny),
      })),
      bonus: { state: c.bonus, reward: rewardOf(DAILY_BONUS.r, DAILY_BONUS.shiny) },
    },
    claimed: c.quests.filter((x) => x.state === "claimed").length,
    total: c.quests.length,
    ready,
  };
};

// ---- collecting

const QUEST_ERROR = (message: string) => Object.assign(new Error(message), { quest: true });

/**
 * POST /quests/claim { ids: "id,id" | "all" }: collects what is ready, in one transaction, and pays it
 * into the main yard. "all" keeps going while collecting opens more that are ready already (a tree's next
 * quests, then the chest). Returns what was collected and the main yard's shiny and resources now.
 */
export const questClaim = async (user: User, ids: string[] | "all") => {
  const em = postgres.orm.em.fork();
  return em.transactional(async (tx) => {
    await sql(`INSERT INTO bym.quest_progress (userid) VALUES (?) ON CONFLICT DO NOTHING`, [user.userid], tx as Em);
    const row = await readRow(user.userid, tx as Em, true);
    const wanted = ids === "all" ? null : new Set(ids);
    const got: string[] = [];
    const sum = { r1: 0, r2: 0, r3: 0, r4: 0, shiny: 0 };
    const add = (r: { r1: number; r2: number; r3: number; r4: number; shiny: number }) => {
      sum.r1 += r.r1;
      sum.r2 += r.r2;
      sum.r3 += r.r3;
      sum.r4 += r.r4;
      sum.shiny += r.shiny;
    };
    const today = questDay();
    if (row.daily.date !== today) row.daily = { date: today, c: {}, claimed: [] };
    row.daily.claimed = row.daily.claimed ?? [];
    // (what was done doesn't change while collecting: read it once)
    const known = { v: await questValues(user, row, tx as Em), dv: await dailyValues(user.userid, row, tx as Em) };
    for (let pass = 0; pass < 20; pass++) {
      const c = await computeAll(user, row, tx as Em, known);
      let more = false;
      for (const x of c.quests) {
        if (x.state !== "ready" || (wanted && !wanted.has(x.def.id))) continue;
        row.claimed[x.def.id] = Math.floor(Date.now() / 1000);
        add(rewardOf(x.def.r, x.def.shiny ?? 0));
        got.push(x.def.id);
        more = true;
      }
      for (const x of c.chests) {
        if (x.state !== "ready" || (wanted && !wanted.has(x.id))) continue;
        row.claimed[x.id] = Math.floor(Date.now() / 1000);
        add(x.reward);
        got.push(x.id);
        more = true;
      }
      for (const x of c.daily) {
        const id = `daily:${x.def.id}`;
        if (x.state !== "ready" || (wanted && !wanted.has(id))) continue;
        row.daily.claimed.push(x.def.id);
        add(rewardOf(x.def.r, x.def.shiny));
        got.push(id);
        more = true;
      }
      if (c.bonus === "ready" && (!wanted || wanted.has("daily:bonus"))) {
        row.daily.claimed.push("bonus");
        add(rewardOf(DAILY_BONUS.r, DAILY_BONUS.shiny));
        got.push("daily:bonus");
        more = true;
      }
      // (one at a time when asked for by id: the tree's next quests are the player's to see first)
      if (!more || wanted) break;
    }
    if (!got.length) throw QUEST_ERROR("Nothing to collect.");
    await sql(
      `UPDATE bym.quest_progress SET claimed = ?::jsonb, daily = ?::jsonb, updated_at = now() WHERE userid = ?`,
      [JSON.stringify(row.claimed), JSON.stringify(row.daily), user.userid],
      tx as Em
    );
    const paid = await sql<{ credits: number; resources: Record<string, number> }>(
      `UPDATE bym.save SET credits = COALESCE(credits, 0) + ?,
         resources = COALESCE(resources, '{}'::jsonb) || jsonb_build_object(
           'r1', COALESCE((resources->>'r1')::numeric, 0) + ?, 'r2', COALESCE((resources->>'r2')::numeric, 0) + ?,
           'r3', COALESCE((resources->>'r3')::numeric, 0) + ?, 'r4', COALESCE((resources->>'r4')::numeric, 0) + ?)
       WHERE userid = ? AND type = ? RETURNING credits, resources`,
      [sum.shiny, sum.r1, sum.r2, sum.r3, sum.r4, user.userid, BaseType.MAIN],
      tx as Em
    );
    if (paid.length !== 1) throw QUEST_ERROR("Your main yard isn't ready yet.");
    return { claimed: got, reward: sum, credits: Number(paid[0].credits), resources: paid[0].resources };
  });
};

// ---- admin (the player's card)

export const questAdminView = async (user: User) => {
  const status = await questStatus(user);
  const row = await readRow(user.userid);
  return { status, counters: row.counters, forced: Object.keys(row.forced) };
};

/** Marks a quest ready (support: something that happened before the book was counting). */
export const questAdminForce = async (userid: number, id: string) => {
  if (!questById.has(id)) throw QUEST_ERROR("No such quest.");
  await sql(
    `INSERT INTO bym.quest_progress (userid, forced) VALUES (?, jsonb_build_object(?::text, true))
     ON CONFLICT (userid) DO UPDATE SET forced = quest_progress.forced || jsonb_build_object(?::text, true), updated_at = now()`,
    [userid, id, id]
  );
};

/** Takes a quest (or chest) back to not collected; "all" starts the book again (counters kept). */
export const questAdminReset = async (userid: number, id: string) => {
  if (id === "all") {
    await sql(`UPDATE bym.quest_progress SET claimed = '{}'::jsonb, forced = '{}'::jsonb, daily = '{}'::jsonb, updated_at = now() WHERE userid = ?`, [userid]);
    return;
  }
  await sql(`UPDATE bym.quest_progress SET claimed = claimed - ?::text, forced = forced - ?::text, updated_at = now() WHERE userid = ?`, [id, id, userid]);
};
