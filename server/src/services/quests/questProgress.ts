import { inTestModeQuick } from "../admin/testMode.js";
import { createHash } from "crypto";

import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { BaseType } from "../../enums/Base.js";
import type { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { outpostTally } from "../alliance/allianceOutposts.js";
import { calculateBaseLevel } from "../base/calculateBaseLevel.js";
import { lastWildAttack } from "../user/wildAttacks.js";
import {
  CHESTS,
  CLIENT_EVENTS,
  DAILY_BONUS,
  DAILY_COUNT,
  DAILY_POOL,
  QUEST_CATEGORIES,
  QUESTS,
  SPECIAL_EVENTS,
  STRONGBOX_PAGES,
  DECORATION,
  TOWER_TOP,
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
const sql = <T = Record<string, unknown>>(query: string, params: unknown[] = [], em?: Em | null) => {
  const m = em ?? postgres.em;
  // (null: on a connection of its own, outside any transaction the caller is in)
  return m.getConnection().execute<T[]>(query, params, "all", em === null ? undefined : m.getTransactionContext());
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
    // (Inferno-only, 14 October, QoL #278: nothing done in admin test mode counts, as in the game, which
    // already skips its own quest events then: the test's free kits and captures aren't undone)
    if (await inTestModeQuick(userid)) return;
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
           ELSE jsonb_build_object('date', ?::text, 'c', jsonb_build_object(?::text, ?::bigint), 'claimed', '[]'::jsonb,
             'prev', CASE WHEN quest_progress.daily->>'date' = ? THEN quest_progress.daily - 'prev' ELSE NULL END)
         END,
         updated_at = now()`,
      [userid, key, n, day, daily, key, n, key, key, n, daily, day, key, key, n, day, key, n, dayBefore(day)]
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
      const found = await sql<{ userid: number }>(
        `SELECT userid FROM bym."user" WHERE lower(username) IN (${names.map(() => "?").join(",")}) AND userid <> ?`,
        [...names, userid]
      );
      if (found.length > 0) await questBump(userid, "chat_mention");
      // (8 October: and those mentioned, "Popular")
      for (const f of found) await questBump(Number(f.userid), "mentioned");
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
  if (SPECIAL_EVENTS.has(type)) return questSpecialEvent(userid, type, Number(n) || 0);
  // (a hatch of any one kind of monster: the quests that name one, and "every kind")
  const rule = CLIENT_EVENTS[type] ?? (/^hatch_(IC\d{1,2}|C\d{1,2})$/.test(type) ? { max: 200, everyMs: 0 } : undefined);
  if (!rule) return false;
  let amount = Math.max(1, Math.min(rule.max, Math.floor(Number(n) || 1)));
  // (13 October) the most resources seen: no more than the yard holds (a little over, its save trailing the game):
  // any number was the player's best
  if (type === "res_peak") {
    const rows = (await postgres.em.getConnection().execute(
      `SELECT GREATEST(COALESCE((resources->>'r1')::numeric, 0), COALESCE((resources->>'r2')::numeric, 0), COALESCE((resources->>'r3')::numeric, 0), COALESCE((resources->>'r4')::numeric, 0)) AS most FROM bym.save WHERE userid = ? AND type = 'main' LIMIT 1`,
      [userid], "all")) as { most: string | number }[];
    const most = Number(rows[0]?.most ?? 0) || 0;
    amount = Math.min(amount, Math.floor(most * 1.25) + 1_000_000);
  }
  if (rule.everyMs > 0) {
    const key = `quest:ev:${userid}:${type}`;
    if ((await redis.set(key, "1", "PX", String(rule.everyMs), "NX")) !== "OK") return false;
  }
  if (rule.mode === "max") await questBest(userid, type, amount);
  else await questBump(userid, type, amount);
  return true;
};

/**
 * The reports that aren't plain counts (SPECIAL_EVENTS): a map cell looked at (counted once a cell), resources
 * spent (today's total, kept as the best day), every resource at its limit (how many hours in a row so far: the
 * game says so every few minutes while the player is in the yard, and says when a storage is seen below its limit,
 * which ends the run).
 */
/** (18 October) The main yard's resources and their limits now, for the special reports' checks. */
const mainResources = async (userid: number) => {
  const rows = (await postgres.em.getConnection().execute(`SELECT resources FROM bym.save WHERE userid = ? AND type = 'main' LIMIT 1`, [userid], "all")) as { resources: Record<string, unknown> | null }[];
  const r = rows[0]?.resources ?? {};
  const num = (k: string) => Math.max(0, Number(r[k]) || 0);
  return { have: [1, 2, 3, 4].map((i) => num(`r${i}`)), max: [1, 2, 3, 4].map((i) => num(`r${i}max`)) };
};

/** (18 October) At most one report of a kind every `ms` (the special reports had no limit at all). */
const specialAllowed = async (userid: number, type: string, ms: number) =>
  (await redis.set(`quest:ev:${userid}:${type}`, "1", "PX", String(ms), "NX").catch(() => "OK")) === "OK";

const questSpecialEvent = async (userid: number, type: string, n: number) => {
  try {
    if (type === "map_view") {
      const cell = Math.floor(n);
      if (!(cell > 0 && cell < 1_000_000)) return false;
      // (18 October, SUSPECTED-BUGS.md: no limit, and the set dropped random cells past 500, so the same cells
      // counted again) a cell a second at most; up to MAP_VIEWS_KEPT cells remembered, then no more counted
      if (!(await specialAllowed(userid, type, 1000))) return false;
      const key = `quest:views:${userid}`;
      if (Number(await redis.send("SCARD", [key])) >= MAP_VIEWS_KEPT) return false;
      if ((await redis.sadd(key, String(cell))) === 1) await questBump(userid, "map_views");
      return true;
    }
    if (type === "spent") {
      // (18 October, SUSPECTED-BUGS.md: any amount, as often as sent) a report a second at most, and no more than
      // the yard holds and can hold
      if (!(await specialAllowed(userid, type, 1000))) return false;
      const yard = await mainResources(userid);
      const most = yard.have.reduce((a, b) => a + b, 0) + yard.max.reduce((a, b) => a + b, 0);
      const amount = Math.max(0, Math.min(2_000_000_000, most, Math.floor(n)));
      if (!amount) return false;
      const key = `quest:spent:${userid}:${questDay()}`;
      const total = Number(await redis.send("INCRBY", [key, String(amount)]));
      await redis.expire(key, 2 * 86400);
      await questBest(userid, "spend_day", total);
      return true;
    }
    if (type === "allcap_off") {
      // (a storage seen below its limit: the run is over)
      await redis.del(`quest:allcap:${userid}`);
      return true;
    }
    if (type === "allcap") {
      // (18 October, SUSPECTED-BUGS.md: taken on the game's word, so two reports two days apart made 47 full hours)
      // the yard's stored resources really at their limits (within 10%: its save trails the game), else the run ends
      if (!(await specialAllowed(userid, type, 30_000))) return false;
      const yard = await mainResources(userid);
      if (!yard.max.every((m, i) => m > 0 && yard.have[i] >= m * 0.9)) {
        await redis.del(`quest:allcap:${userid}`);
        return false;
      }
      const key = `quest:allcap:${userid}`;
      const now = Date.now();
      const [start, last] = ((await redis.get(key)) ?? "0:0").split(":").map(Number);
      // (full when last seen and full again: the run goes on, even across a night away; not seen for two days: a fresh one)
      const since = !start || now - last > 2 * 86_400_000 ? now : start;
      await redis.set(key, `${since}:${now}`, "EX", String(3 * 86400));
      await questBest(userid, "allcap_seen", 1);
      const hours = Math.floor((now - since) / 3_600_000);
      if (hours > 0) await questBest(userid, "allcap_hours", hours);
      return true;
    }
  } catch (err) {
    logger.warn(`Quests: ${type} for player #${userid}: ${err}`);
  }
  return false;
};

/** (18 October) Map cells remembered as looked at, at most (the quests ask for far fewer). */
const MAP_VIEWS_KEPT = 5000;

// ---- what the player has done

/** One day's daily quests: the day, its counters, what was collected and which were picked. */
interface DailyRow {
  date?: string;
  c?: Record<string, number>;
  claimed?: string[];
  picked?: string[];
  /** (QoL #119) the daily quest swapped by the day's free reroll (none yet: undefined). */
  rerolled?: string;
}

/** The UTC day before `day` ("2026-10-14" -> "2026-10-13"). */
const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/**
 * Inferno-only (14 October, QoL #4): a new day used to wipe yesterday's daily quests, collected or not. Now the
 * day before is kept (as `prev`) for one more day, and its quests that were done but not collected can still
 * be collected (shown as "Yesterday: ...").
 */
const rollDaily = (daily: Row["daily"], today: string): Row["daily"] => {
  if (daily.date === today) return daily;
  const yesterday = dayBefore(today);
  const prev = daily.date === yesterday ? { date: daily.date, c: daily.c ?? {}, claimed: daily.claimed ?? [], picked: daily.picked } : null;
  return { date: today, c: {}, claimed: [], prev };
};

interface Row {
  counters: Record<string, number>;
  claimed: Record<string, number>;
  daily: DailyRow & { prev?: DailyRow | null };
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
      // (8 October) blocks, traps and decorations standing; a tower at its highest level
      if (lvl > 0) {
        if (b.t === 17 || b.t === 24) v[`count_b${b.t}`] = (v[`count_b${b.t}`] ?? 0) + 1;
        if (DECORATION(b.t)) v.count_deco = (v.count_deco ?? 0) + 1;
        if (TOWER_TOP[b.t] && lvl >= TOWER_TOP[b.t]) v.tower_maxed = 1;
      }
    }
    const locker = json(save.lockerdata) as Record<string, { t?: number }>;
    for (const page of Object.keys(STRONGBOX_PAGES)) {
      v[`page${page}`] = pageMonsters(Number(page)).filter((id) => locker[id]?.t === 2).length;
    }
    for (const [id, a] of Object.entries(json(save.academy)) as [string, { level?: number }][]) {
      if (/^IC\d+$/.test(id) || id === "C19") {
        v.academy_max = Math.max(v.academy_max ?? 0, Number(a?.level ?? 0));
        if (Number(a?.level ?? 0) >= 3) v.academy_3 = (v.academy_3 ?? 0) + 1;
      }
    }
    v.page5_done = (v.page5 ?? 0) >= pageMonsters(5).length && pageMonsters(5).length > 0 ? 1 : 0;
  }
  // (from the counters: hatched every kind, one of the three champions, every kind of catapult ammo, every tribe at its top)
  v.hatch_kinds = allMonsters().filter((id) => (v[`hatch_${id}`] ?? 0) > 0).length;
  v.hatch_big = (v.hatch_IC9 ?? 0) + (v.hatch_IC10 ?? 0) + (v.hatch_IC24 ?? 0);
  v.ammo_kinds = ["ammo_decoy", "ammo_jars", "ammo_sulfur"].filter((k) => (v[k] ?? 0) > 0).length;
  v.tribe_top_kinds = ["L", "K", "A", "D"].filter((t) => (v[`win_${t}_top`] ?? 0) > 0).length;

  const held = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym.world_map_cell WHERE uid = ? AND base_type = 3 AND map_version = 2 AND destroyed_at IS NULL`,
    [userid],
    em
  );
  v.outposts = Number(held[0]?.n ?? 0);

  if (user.alliance_id) {
    v.alliance = 1;
    try {
      const rel = await sql<{ n: string }>(`SELECT count(*) AS n FROM bym.alliance_relationship WHERE alliance_id = ?`, [user.alliance_id], em);
      v.relations = Number(rel[0]?.n ?? 0);
      const joined = await sql<{ d: number | null }>(
        `SELECT floor(extract(epoch FROM now() - alliance_joined_at) / 86400) AS d FROM bym."user" WHERE userid = ? AND alliance_joined_at IS NOT NULL`,
        [userid],
        em
      );
      v.alliance_days = Math.max(0, Number(joined[0]?.d ?? 0));
    } catch {
      // (before migration 20261020)
    }
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

  // The Pit's values, kept while the player's bets are as they were (fps pass, 11 October: worked out from every
  // bet each time the book was read or an event came, 160 ms for a player with 18,000 bets, more as they bet)
  const pitSig = (
    await sql<{ n: string; m: string | null; s: string | null; ns: string; nr: string }>(
      `SELECT count(*) AS n, max(id) AS m, max(settled_at)::text AS s, count(*) FILTER (WHERE status = 'settled') AS ns,
              count(*) FILTER (WHERE status = 'refunded') AS nr FROM bym.casino_bet WHERE user_id = ?`,
      [userid],
      em
    )
  )[0];
  const sig = `${pitSig?.n}|${pitSig?.m}|${pitSig?.s}|${pitSig?.ns}|${pitSig?.nr}`;
  let pit = pitCache.get(userid);
  if (!pit || pit.sig !== sig) {
    const pv: Record<string, number> = {};
    const bets = await sql<{ game: string; n: string; jackpots: string }>(
      `SELECT game, count(*) AS n, count(*) FILTER (WHERE game IN ('slots', 'fortune', 'favor') AND outcome->>'line' = 'jackpot') AS jackpots
         FROM bym.casino_bet WHERE user_id = ? AND status <> 'refunded' GROUP BY game`,
      [userid],
      em
    );
    pv.pit_rounds = 0;
    pv.pit_jackpot = 0;
    for (const b of bets) {
      pv[`pit_${b.game}`] = Number(b.n);
      pv.pit_rounds += Number(b.n);
      pv.pit_jackpot += Number(b.jackpots);
    }
    // (read outside the caller's transaction: a failed query there would end it)
    await pitValues(userid, pv, null);
    pit = { sig, v: pv };
    pitCache.delete(userid);
    pitCache.set(userid, pit);
    if (pitCache.size > 2000) pitCache.delete(pitCache.keys().next().value!);
  }
  Object.assign(v, pit.v);

  await arcadeValues(userid, v, null);

  // (QoL #119, 15 October: when the next wild monster attack can start, in seconds: minHours after the last on any of
  // the player's yards, as the game plans it (WMATTACK.ioNextAttackTime); the daily "Hold off the wild" needs it today)
  if (infernoOnlyConfig.wildAttacks?.enabled) {
    try {
      const last = await lastWildAttack(user);
      v.wild_next = last > 0 ? last + Number(infernoOnlyConfig.wildAttacks.minHours ?? 23) * 3600 : 0;
    } catch {
      // (left out: the daily stays possible)
    }
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

/** The Pit's values by player, with the signature of the bets they came from (questValues). */
const pitCache = new Map<number, { sig: string; v: Record<string, number> }>();

/** Every monster on the Strongbox's pages (Rezghul only while he is enabled): "hatch every kind". */
const allMonsters = () => Object.keys(STRONGBOX_PAGES).flatMap((p) => pageMonsters(Number(p)));

/**
 * The Pit's feats (8 October), from the player's settled bets: a blackjack, a split's two hands won, the most
 * right guesses in one Higher or Lower game, The Undertaker's Offer kept to the end / a deal / a deal below what
 * the coffin held / 5x from the coffin, Devil's Dice banked after 5 throws or more, Balthazar's Ascent above 10x,
 * King Wormzer won on, the Derby won on the field's longest odds, Moloch's Favor days in a row, 10 rounds lost in
 * a row and a round won after that.
 */
const pitValues = async (userid: number, v: Record<string, number>, em?: Em | null) => {
  try {
    const r = (
      await sql<Record<string, string | null>>(
        `SELECT
           count(*) FILTER (WHERE game = 'blackjack' AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(outcome->'hands', '[]'::jsonb)) h WHERE h->>'result' = 'blackjack')) AS bj_natural,
           count(*) FILTER (WHERE game = 'blackjack' AND jsonb_array_length(COALESCE(outcome->'hands', '[]'::jsonb)) = 2
                             AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(outcome->'hands') h WHERE COALESCE(h->>'result', '') <> 'win')) AS bj_split2,
           count(*) FILTER (WHERE game = 'deal' AND outcome->>'end' IN ('keep', 'swap')) AS deal_keep,
           count(*) FILTER (WHERE game = 'deal' AND outcome->>'end' = 'deal') AS deal_deal,
           count(*) FILTER (WHERE game = 'deal' AND outcome->>'end' = 'deal'
                             AND (outcome->>'multiplier')::numeric < (outcome->'prizes'->>((outcome->>'kept')::int))::numeric) AS deal_under,
           count(*) FILTER (WHERE game = 'deal' AND outcome->>'end' IN ('keep', 'swap') AND (outcome->>'multiplier')::numeric >= 5) AS deal_top,
           count(*) FILTER (WHERE game = 'dice' AND outcome->>'cashed' IS NOT NULL AND (outcome->>'at')::int >= 5) AS dice_brave,
           count(*) FILTER (WHERE game = 'ascent' AND outcome->>'cashed' IS NOT NULL AND (outcome->>'cashed')::numeric > 10) AS ascent_10,
           count(*) FILTER (WHERE game = 'roulette' AND payout > 0 AND outcome->>'monster' = 'wormzer') AS roulette_king,
           max(CASE WHEN game = 'hilo' THEN (SELECT count(*) FROM jsonb_array_elements(COALESCE(outcome->'guesses', '[]'::jsonb)) g
                                              WHERE g->>0 <> 'skip' AND g->>1 = 'true') END) AS hilo_best
         FROM bym.casino_bet WHERE user_id = ? AND status = 'settled'`,
        [userid],
        em
      )
    )[0];
    for (const k of ["bj_natural", "bj_split2", "deal_keep", "deal_deal", "deal_under", "deal_top", "dice_brave", "ascent_10", "roulette_king", "hilo_best"]) {
      v[k] = Number(r?.[k] ?? 0) || 0;
    }
    const derby = await sql<{ n: string }>(
      `SELECT count(*) AS n FROM bym.casino_bet b JOIN bym.casino_round r ON r.id = b.round_id
        WHERE b.user_id = ? AND b.game = 'derby' AND b.status = 'settled' AND b.payout > 0
          AND (b.outcome->>'odds')::numeric >= (SELECT max((x->>'odds')::numeric) FROM jsonb_array_elements(r.params->'runners') x)`,
      [userid],
      em
    );
    v.derby_long = Number(derby[0]?.n ?? 0);
    const days = await sql<{ d: string }>(
      `SELECT DISTINCT to_char(created_at AT TIME ZONE 'utc', 'YYYY-MM-DD') AS d FROM bym.casino_bet WHERE user_id = ? AND game = 'favor' ORDER BY d`,
      [userid],
      em
    );
    let run = 0;
    let best = 0;
    let prev = 0;
    for (const { d } of days) {
      const t = Date.parse(`${d}T00:00:00Z`);
      run = prev && t - prev === 86_400_000 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = t;
    }
    v.favor_streak = best;
    // (rounds: a win pays more than the stake; a push, or less, is no win)
    const streaks = (
      await sql<{ longest: string | null; comebacks: string | null }>(
        `WITH b AS (SELECT id, payout > stake AS w FROM bym.casino_bet WHERE user_id = ? AND status = 'settled' AND game <> 'favor'),
              g AS (SELECT id, w, row_number() OVER (ORDER BY id) - row_number() OVER (PARTITION BY w ORDER BY id) AS grp FROM b),
              runs AS (SELECT max(id) AS e, count(*) AS n FROM g WHERE NOT w GROUP BY grp)
         SELECT COALESCE(max(n), 0) AS longest,
                count(*) FILTER (WHERE n >= 10 AND EXISTS (SELECT 1 FROM b WHERE b.w AND b.id > runs.e)) AS comebacks
           FROM runs`,
        [userid],
        em
      )
    )[0];
    v.pit_lose10 = Number(streaks?.longest ?? 0) >= 10 ? 1 : 0;
    v.pit_comeback = Number(streaks?.comebacks ?? 0);
  } catch (err) {
    logger.warn(`Quests: the Pit's values for player #${userid}: ${err}`);
  }
};

/**
 * The arcade's (8 October): from its records (bym.arcade_score: a solo run's best score and, kept by the quests'
 * counters `ars_<game>_<mode>_s2`, its best second number in any run; a match's wins) and Hellgate's (td_score).
 * Also the player's best rank on an all-time board, and how long they have been #1 (kept in Redis: reading the
 * book writes nothing to the database).
 */
const arcadeValues = async (userid: number, v: Record<string, number>, em?: Em | null) => {
  try {
    const rows = await sql<{ game: string; mode: string; period: string; best: string; best2: string; runs: string; wins: string }>(
      `SELECT game, mode, period, best, best2, runs, wins FROM bym.arcade_score WHERE user_id = ?`,
      [userid],
      em
    );
    const played = new Set<string>();
    const max = (k: string, n: number) => (v[k] = Math.max(v[k] ?? 0, n));
    const add = (k: string, n: number) => (v[k] = (v[k] ?? 0) + n);
    for (const r of rows) {
      const best = Number(r.best) || 0;
      const best2 = Number(r.best2) || 0;
      const runs = Number(r.runs) || 0;
      const wins = Number(r.wins) || 0;
      if (runs > 0) played.add(r.game);
      add(`ar_${r.game}_wins`, r.period === "" ? wins : 0);
      if (r.period === "") add(`ar_${r.game}_${r.mode}_wins`, wins);
      if (r.game === "hellgate" && r.mode === "coop") max("ar_hellgate_coop_best", best);
      if (r.game === "siege" && r.mode === "daily") {
        add("ar_siege_daily_runs", runs);
        max("siege_wreck", best);
      }
      if (r.game === "siege" && r.mode === "duel") max("siege_wreck", best2);
      if (r.game === "wormzer") {
        max("ar_wormzer_len", best);
        max("ar_wormzer_kills", best2);
      }
      if (r.mode === "solo" || (r.game === "golf" && r.mode === "daily")) {
        // (a solo run's: best the score, best2 its second number)
        if (r.game === "flight") max("ar_flight_score", best);
        if (r.game === "smash") max("ar_smash_chain", best2);
        if (r.game === "breakout") max("ar_breakout_level", best2);
        if (r.game === "stack") max("ar_stack_rows", best2);
        if (r.game === "swarm") max("ar_swarm_wave", best2);
        if (r.game === "runner") max("ar_runner_metres", best2);
        if (r.game === "golf") {
          max("ar_golf_aces", best2);
          // (golf's best is 999 less the strokes)
          if (best >= 999 - 18) v.golf_daily_par = 1;
        }
      }
    }
    // (the best second numbers of any run, not only the best one's: the counters)
    const s2 = (game: string, mode: string) => Number(v[`ars_${game}_${mode}_s2`] ?? 0);
    max("ar_wormzer_kills", Math.max(s2("wormzer", "solo"), s2("wormzer", "live")));
    max("ar_smash_chain", s2("smash", "solo"));
    max("ar_breakout_level", s2("breakout", "solo"));
    max("ar_stack_rows", s2("stack", "solo"));
    max("ar_swarm_wave", s2("swarm", "solo"));
    max("ar_runner_metres", s2("runner", "solo"));
    max("ar_golf_aces", s2("golf", "daily"));
    if (Number(v.ars_golf_daily_s1 ?? 0) >= 999 - 18) v.golf_daily_par = 1;
    const td = (await sql<{ w: string; runs: string }>(`SELECT best_wave AS w, runs FROM bym.td_score WHERE user_id = ?`, [userid], em))[0];
    v.hg_wave = Number(td?.w ?? 0);
    if (Number(td?.runs ?? 0) > 0) played.add("hellgate");
    v.ar_games = played.size;
    // the boards: the best rank on any all-time board (an arcade game's and mode's, Hellgate's waves)
    const ranked = await sql<{ r: string | null }>(
      `SELECT min(r) AS r FROM (SELECT user_id, rank() OVER (PARTITION BY game, mode ORDER BY best DESC, best2 DESC) AS r
                                  FROM bym.arcade_score WHERE period = '' AND best > 0) x WHERE user_id = ?`,
      [userid],
      em
    );
    let rank = Number(ranked[0]?.r ?? 0) || 0;
    if (v.hg_wave > 0) {
      const above = await sql<{ n: string }>(`SELECT count(*) AS n FROM bym.td_score WHERE best_wave > ?`, [v.hg_wave], em);
      const r2 = Number(above[0]?.n ?? 0) + 1;
      rank = rank > 0 ? Math.min(rank, r2) : r2;
    }
    v.arcade_top10 = rank > 0 && rank <= 10 ? 1 : 0;
    const sinceKey = `quest:top1since:${userid}`;
    const seenKey = `quest:top1seen:${userid}`;
    if (rank === 1) {
      await redis.set(sinceKey, String(Date.now()), "NX");
      await redis.set(seenKey, "1");
      v.arcade_top1_days = Math.floor((Date.now() - Number((await redis.get(sinceKey)) ?? Date.now())) / 86_400_000);
    } else {
      await redis.del(sinceKey);
      v.arcade_top1_days = 0;
    }
    v.arcade_top1 = (await redis.get(seenKey)) ? 1 : 0;
  } catch (err) {
    logger.warn(`Quests: the arcade's values for player #${userid}: ${err}`);
  }
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

/** (QoL #119) a wild attack must be able to start this long before midnight UTC (its warning, the fight) to count today. */
const WILD_MARGIN_S = 15 * 60;

/** Whether the next wild monster attack can start on `day` (UTC) in time (v.wild_next: questValues; 0 or none: yes). */
const wildToday = (v: Record<string, number>, day: string) =>
  !(v.wild_next > 0) || v.wild_next <= (Date.parse(`${day}T00:00:00Z`) + 86_400_000) / 1000 - WILD_MARGIN_S;

/** Whether the player can do a daily quest now (its `needs`). */
const canDo = (d: DailyDef, v: Record<string, number>, user: User, day = questDay()) =>
  (d.needs ?? []).every((n) =>
    n === "level3"
      ? (v.yard_level ?? 1) >= 3
      : n === "shiny"
        ? !user.shiny_locked
        : // (QoL #119, 15 October: "Hold off the wild" only when an attack can still come before the day ends)
          n === "wildtoday"
          ? wildToday(v, day)
          : n.startsWith("b")
            ? (v[n] ?? 0) >= 1
            : true
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
  const scored = DAILY_POOL.filter((d) => canDo(d, v, user, day)).map((d) => ({ d, s: createHash("sha1").update(`${userid}:${day}:${d.id}`).digest().readUInt32BE(0) }));
  return scored.sort((a, b) => a.s - b.s).slice(0, DAILY_COUNT).map((x) => x.d);
};

/**
 * Inferno-only (QoL #119, 15 October): POST /quests/reroll { id }: the day's one free reroll. Today's daily quest `id`
 * (not done, not collected) is swapped for another the player can do and doesn't have today, in its place; the server
 * keeps that the day's reroll is used (daily.rerolled). Throws a quest error (shown as it is) when it can't.
 */
export const questReroll = async (user: User, id: string) => {
  // (each refusal with a code the game words in the player's language: io_q2_reroll_<code>)
  const refuse = (code: string, message: string) => Object.assign(QUEST_ERROR(message), { code });
  const em = postgres.orm.em.fork();
  return em.transactional(async (tx) => {
    await sql(`INSERT INTO bym.quest_progress (userid) VALUES (?) ON CONFLICT DO NOTHING`, [user.userid], tx as Em);
    const row = await readRow(user.userid, tx as Em, true);
    const today = questDay();
    row.daily = rollDaily(row.daily, today);
    if (row.daily.rerolled) throw refuse("used", "You have used today's free reroll.");
    const v = await questValues(user, row, tx as Em);
    const dv = await dailyValues(user.userid, row, tx as Em);
    const picked = dailyPick(user.userid, v, user, row, today);
    const at = picked.findIndex((d) => d.id === id);
    if (at < 0) throw refuse("notdaily", "That isn't one of today's daily quests.");
    const old = picked[at];
    if ((row.daily.claimed ?? []).includes(old.id) || (dv[old.key] ?? 0) >= old.target) throw refuse("done", "That one is done: collect it instead.");
    const taken = new Set(picked.map((d) => d.id));
    // (one not done already today: the day's counters count every daily kind, picked or not)
    const next = DAILY_POOL.filter((d) => !taken.has(d.id) && canDo(d, v, user, today) && (dv[d.key] ?? 0) < d.target)
      .map((d) => ({ d, s: createHash("sha1").update(`${user.userid}:${today}:${d.id}:reroll`).digest().readUInt32BE(0) }))
      .sort((a, b) => a.s - b.s)[0]?.d;
    if (!next) throw refuse("none", "There is no other daily quest to swap in today.");
    const ids = picked.map((d) => d.id);
    ids[at] = next.id;
    row.daily.picked = ids;
    row.daily.rerolled = old.id;
    await sql(`UPDATE bym.quest_progress SET daily = ?::jsonb, updated_at = now() WHERE userid = ?`, [JSON.stringify(row.daily), user.userid], tx as Em);
    return { from: old.id, to: next.id };
  });
};

// ---- the book as the game draws it

export type QuestState = "locked" | "progress" | "ready" | "claimed" | "classified";

/** "Master of all": every quest but the classified ones (and those only an alliance's staff can do). */
const MASTER_OF = () => QUESTS.filter((x) => !x.reveal && !x.staff && !x.leader && x.key !== "book_all");

const targetOf = (q: QuestDef) =>
  /^page\d$/.test(q.key)
    ? pageMonsters(Number(q.key.slice(4))).length
    : q.key === "hatch_kinds"
      ? allMonsters().length
      : q.key === "book_all"
        ? MASTER_OF().length
        : q.target;

/** Is a quest shown (not classified)? Once collected (or marked ready by an admin) it always is. */
const revealed = (def: QuestDef, row: Row, v: Record<string, number>) =>
  !def.reveal || Boolean(row.claimed[def.id]) || Boolean(row.forced[def.id]) || (v[def.reveal.key] ?? 0) >= def.reveal.at;

const rewardOf = (r: Reward, shiny = 0) => ({ r1: r[0], r2: r[1], r3: r[2], r4: r[3], shiny });

interface Computed {
  quests: { def: QuestDef; target: number; value: number; state: QuestState }[];
  chests: { id: string; cat: string; done: number; total: number; state: QuestState; reward: ReturnType<typeof rewardOf> }[];
  daily: { def: DailyDef; value: number; state: QuestState }[];
  bonus: QuestState;
  /** Yesterday's daily quests done but not collected (QoL #4). */
  yesterday: { def: DailyDef; value: number; state: QuestState }[];
}

const compute = (row: Row, v: Record<string, number>): Computed => {
  const claimed = row.claimed;
  // (what depends on what has been collected: every category chest, every quest but the classified)
  v.chests_all = CHESTS.filter((c) => c.cat !== "book").every((c) => claimed[c.id]) ? 1 : 0;
  v.book_all = MASTER_OF().filter((x) => claimed[x.id]).length;
  const quests = QUESTS.map((def) => {
    const target = targetOf(def);
    const value = row.forced[def.id] ? target : Math.min(target, v[def.key] ?? 0);
    const state: QuestState = claimed[def.id]
      ? "claimed"
      : !revealed(def, row, v)
        ? "classified"
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
  return { quests, chests, daily: [], bonus: "progress", yesterday: [] };
};

/** The whole book for one player: computed, with today's daily quests. */
const computeAll = async (user: User, row: Row, em?: Em, known?: { v: Record<string, number>; dv: Record<string, number>; pv?: Record<string, number> }): Promise<Computed> => {
  const v = known?.v ?? (await questValues(user, row, em));
  const dv = known?.dv ?? (await dailyValues(user.userid, row, em));
  const base = compute(row, v);
  const today = questDay();
  const dailyClaimed = row.daily.date === today ? new Set(row.daily.claimed ?? []) : new Set<string>();
  const picked = dailyPick(user.userid, v, user, row, today);
  row.daily = rollDaily(row.daily, today);
  if (!Array.isArray(row.daily.picked)) row.daily.picked = picked.map((d) => d.id);
  base.daily = picked.map((def) => {
    const value = Math.min(def.target, dv[def.key] ?? 0);
    const state: QuestState = dailyClaimed.has(def.id) ? "claimed" : value >= def.target ? "ready" : "progress";
    return { def, value, state };
  });
  base.bonus = dailyClaimed.has("bonus") ? "claimed" : base.daily.every((d) => d.state === "claimed") ? "ready" : "progress";
  // (yesterday's, done but not collected: still collectable today)
  const prev = row.daily.prev;
  if (prev && prev.date === dayBefore(today) && Array.isArray(prev.picked)) {
    const pv = known?.pv ?? (await prevDailyValues(user.userid, prev, em));
    const prevClaimed = new Set(prev.claimed ?? []);
    for (const id of prev.picked) {
      const def = DAILY_POOL.find((d) => d.id === id);
      if (!def || prevClaimed.has(id) || (pv[def.key] ?? 0) < def.target) continue;
      base.yesterday.push({ def, value: def.target, state: "ready" });
    }
  }
  return base;
};

/** The day before's counters (as dailyValues, for `prev`). */
const prevDailyValues = async (userid: number, prev: DailyRow, em?: Em) => {
  const v: Record<string, number> = {};
  for (const [k, n] of Object.entries(prev.c ?? {})) v[k] = Number(n) || 0;
  const pit = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym.casino_bet WHERE user_id = ? AND status <> 'refunded'
       AND created_at >= ?::date AND created_at < ?::date + 1`,
    [userid, prev.date, prev.date],
    em
  );
  v.pit_rounds = Number(pit[0]?.n ?? 0);
  return v;
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
    c.daily.filter((x) => x.state === "ready").length + (c.bonus === "ready" ? 1 : 0) + c.yesterday.length;
  return {
    categories: QUEST_CATEGORIES,
    quests: c.quests.map(({ def, target, value, state }) =>
      state === "classified"
        ? // (classified: what it is, what it needs and what it pays stay secret)
          { id: def.id, cat: def.cat, parent: def.parent, tmpl: "classified", vars: [], icon: "secret", go: "", target: 0, value: 0, state,
            reward: rewardOf([0, 0, 0, 0], 0), optional: true, staff: false, leader: false, classified: true }
        : {
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
            classified: Boolean(def.reveal),
          }),
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
      })).concat(c.yesterday.map(({ def, value, state }) => ({
        id: `prev:${def.id}`,
        tmpl: def.tmpl,
        vars: [def.target],
        icon: def.icon,
        go: "",
        target: def.target,
        value,
        state,
        reward: rewardOf(def.r, def.shiny),
        yesterday: true,
      }) as any)),
      bonus: { state: c.bonus, reward: rewardOf(DAILY_BONUS.r, DAILY_BONUS.shiny) },
      // (QoL #119: today's free reroll not used yet)
      reroll: !row.daily.rerolled,
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
  const result = await questClaimInner(user, ids);
  // daily quests done (counted after: the row is locked inside)
  const daily = result.claimed.filter((id) => id.startsWith("daily:") && id !== "daily:bonus").length;
  if (daily) await questBump(user.userid, "daily_done", daily);
  return result;
};

const questClaimInner = async (user: User, ids: string[] | "all") => {
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
    row.daily = rollDaily(row.daily, today);
    row.daily.claimed = row.daily.claimed ?? [];
    // (what was done doesn't change while collecting: read it once)
    const known = {
      v: await questValues(user, row, tx as Em),
      dv: await dailyValues(user.userid, row, tx as Em),
      pv: row.daily.prev ? await prevDailyValues(user.userid, row.daily.prev, tx as Em) : {},
    };
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
      for (const x of c.yesterday) {
        const id = `daily:prev:${x.def.id}`;
        if (x.state !== "ready" || (wanted && !wanted.has(id)) || !row.daily.prev) continue;
        row.daily.prev.claimed = [...(row.daily.prev.claimed ?? []), x.def.id];
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
