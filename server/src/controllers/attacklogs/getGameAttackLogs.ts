import { AttackLogs } from "../../database/models/attacklogs.model.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { replaysForLogs } from "../../services/replays/replays.js";
import { WorldMapCell } from "../../database/models/worldmapcell.model.js";
import { MapRoomCell } from "../../enums/MapRoom.js";

/** The most recent this many of each side are listed. */
const LIMIT = 60;

const lootOf = (loot: unknown) => {
  const l = (loot ?? {}) as Record<string, unknown>;
  return ["r1", "r2", "r3", "r4"].map((k) => Math.max(0, Math.round(Number(l[k]) || 0)));
};

const seconds = (d: Date | null | undefined) => (d ? Math.floor(new Date(d).getTime() / 1000) : 0);

/**
 * Inferno-only: the game's attack logs (the top bar's Attack Logs button, IoAttackLogs.ts). Always fresh,
 * the player's own only.
 *
 * - no `id`: { error: 0, now, mine: [...], onme: [...] }, the most recent first, each row
 *   [id, attacktime, other side's name, other side's userid (0: a tribe), yard type, x, y, level, damage,
 *    buildings destroyed, ended (0/1), [loot r1..r4], replay key ("": none)] (and, for attacks on the player, the
 *   attacker's main yard: x, y, or -1, -1);
 * - `id`: { error: 0, id, report } the battle report of one of the player's logs (its html, as the attack's
 *   client wrote it: ATTACK.LogRead).
 *
 * Inferno-only (QoL #93, 15 October):
 * - the list also says whether each side has older logs (`more: { mine, onme }`) and, asked with `day=1`, the last
 *   24 hours' totals (`day: { mine: [attacks, r1, r2, r3, r4], onme: [...] }`: the attacks and the loot taken / lost);
 * - `side` ("mine" | "onme") and `before` (a log id from that side): the page of that side's logs older than it,
 *   { error: 0, now, side, rows: [...], more }.
 *
 * Inferno-only (QoL #634, 15 October): `recent=1`: { error: 0, now, recent: [...] }, the attacks on the player in the
 * last two hours only (recentOnMe), with whether each outpost attacked has been taken; the game asks every minute
 * while the player has outposts (IoWelcomeBack's outpost watch).
 */
export const getGameAttackLogs: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "There are no attack logs here." };
    return;
  }
  const { userid }: User = ctx.authUser;
  const params = { ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) } as Record<string, unknown>;
  const em = postgres.em.fork();

  // (18 October: 1e309 became Infinity, which the query wrote as a column name: a 500)
  const id = Number.isSafeInteger(Math.floor(Number(params.id))) ? Math.floor(Number(params.id)) : 0;
  if (id > 0) {
    const log = await em.findOne(AttackLogs, { id, $or: [{ attacker_userid: userid }, { defender_userid: userid }] });
    if (!log) {
      ctx.body = { error: "That attack log isn't here any more." };
      return;
    }
    const report = (log.attackreport ?? {}) as Record<string, unknown>;
    ctx.body = { error: 0, id, report: typeof report.html === "string" ? report.html : "" };
    return;
  }

  // Inferno-only (QoL #634, 15 October): `recent=1`, the game's check every minute while the player is online
  // with outposts: only the attacks on them in the last RECENT_MS, and for each on an outpost whether the outpost is
  // still theirs (`taken` 1: its cell has another owner now, or is gone).
  if (params.recent && params.recent !== "0") {
    ctx.body = { error: 0, now: Math.floor(Date.now() / 1000), recent: await recentOnMe(em, userid) };
    return;
  }

  const fields = [
    "id", "attacktime", "attacker_userid", "attacker_username", "defender_userid", "defender_username",
    "type", "x", "y", "level", "damage", "destroyed", "ended", "loot",
  ] as const;
  const sideWhere = (side: "mine" | "onme") =>
    side === "mine" ? { attacker_userid: userid } : { defender_userid: userid, attacker_userid: { $ne: userid } };
  // (QoL #93: one more than shown, to know there are older ones; the id breaks ties in time, for the pages)
  const page = async (side: "mine" | "onme", older: { at: Date; id: number } | null) => {
    const where = older
      ? { $and: [sideWhere(side), { $or: [{ attacktime: { $lt: older.at } }, { attacktime: older.at, id: { $lt: older.id } }] }] }
      : sideWhere(side);
    const got = await em.find(AttackLogs, where as never, { orderBy: { attacktime: "DESC", id: "DESC" }, limit: LIMIT + 1, fields });
    return { logs: got.slice(0, LIMIT), more: got.length > LIMIT };
  };

  // Inferno-only (QoL #93, 15 October): "Load older", a page of one side's logs older than `before`
  const before = Number.isSafeInteger(Math.floor(Number(params.before))) ? Math.floor(Number(params.before)) : 0;
  const side = params.side === "onme" ? "onme" : params.side === "mine" ? "mine" : null;
  if (before > 0 && side) {
    const from = await em.findOne(AttackLogs, { id: before, ...sideWhere(side) } as never, { fields: ["id", "attacktime"] as never });
    if (!from) {
      ctx.body = { error: "That attack log isn't here any more." };
      return;
    }
    const older = await page(side, { at: from.attacktime, id: from.id });
    const replaysOlder = await replaysForLogs(older.logs.map((l) => l.id));
    const homesOlder = side === "onme" ? await homesOf(em, older.logs) : new Map<number, [number, number]>();
    ctx.body = {
      error: 0,
      now: Math.floor(Date.now() / 1000),
      side,
      rows: older.logs.map((l) => rowOf(l, side === "mine", replaysOlder, homesOlder)),
      more: older.more,
    };
    return;
  }

  // (the totals only when asked for, `day`: the window asks, the top bar's check for new attacks doesn't)
  const wantDay = Boolean(params.day) && params.day !== "0";
  const [minePage, onmePage, day] = await Promise.all([page("mine", null), page("onme", null), wantDay ? lastDay(em, userid) : Promise.resolve(undefined)]);
  const mine = minePage.logs;
  const onme = onmePage.logs;
  // Inferno-only: the attacks with a replay (player against player) carry its key, last in the row
  const replays = await replaysForLogs([...mine, ...onme].map((l) => l.id));
  // (QoL #89, 14 October: Revenge on "Attacks on me": where each attacker's main yard is now, last in the row)
  const homes = await homesOf(em, onme);
  ctx.body = {
    error: 0,
    now: Math.floor(Date.now() / 1000),
    mine: mine.map((l) => rowOf(l, true, replays, homes)),
    onme: onme.map((l) => rowOf(l, false, replays, homes)),
    // (QoL #93)
    more: { mine: minePage.more, onme: onmePage.more },
    day,
  };
};

type Em = ReturnType<typeof postgres.em.fork>;

/** (QoL #634) How far back `recent` looks, and the most rows it sends. */
const RECENT_MS = 2 * 60 * 60 * 1000;
const RECENT_MAX = 20;

/**
 * Inferno-only (QoL #634): the attacks on the player in the last RECENT_MS, newest first, each
 * { id, at, name, uid, type, x, y, damage, ended (0/1), taken (0/1) }. `taken` only for an outpost: its cell
 * (by the log's baseid) belongs to someone else now, or no longer exists.
 */
const recentOnMe = async (em: Em, userid: number) => {
  const logs = await em.find(
    AttackLogs,
    { defender_userid: userid, attacker_userid: { $ne: userid }, attacktime: { $gte: new Date(Date.now() - RECENT_MS) } } as never,
    { orderBy: { attacktime: "DESC", id: "DESC" }, limit: RECENT_MAX, fields: ["id", "attacktime", "attacker_userid", "attacker_username", "type", "x", "y", "damage", "ended", "baseid"] as never },
  );
  const outpostIds = [...new Set(logs.filter((l) => l.type === "outpost" && l.baseid).map((l) => String(l.baseid)))];
  const owners = new Map<string, number>();
  if (outpostIds.length) {
    const cells = await em.find(WorldMapCell, { baseid: { $in: outpostIds } } as never, { fields: ["baseid", "uid"] as never });
    // (a cell of the player's with that base id, of any map version, counts as still theirs)
    for (const c of cells as unknown as { baseid: string; uid: number }[]) {
      if (!owners.has(String(c.baseid)) || Number(c.uid) === userid) owners.set(String(c.baseid), Number(c.uid));
    }
  }
  return logs.map((l) => {
    const owner = l.baseid ? owners.get(String(l.baseid)) : undefined;
    return {
      id: l.id,
      at: seconds(l.attacktime),
      name: l.attacker_username,
      uid: l.attacker_userid,
      type: l.type,
      x: l.x ?? -1,
      y: l.y ?? -1,
      damage: l.damage ?? 0,
      ended: l.ended ? 1 : 0,
      taken: l.type === "outpost" && l.baseid && owner !== userid ? 1 : 0,
    };
  });
};

type LogRow = Pick<AttackLogs, "id" | "attacktime" | "attacker_userid" | "attacker_username" | "defender_userid" | "defender_username" | "type" | "x" | "y" | "level" | "damage" | "destroyed" | "ended" | "loot">;

/** Where each attacker's main yard is now (their home cell), by userid. */
const homesOf = async (em: Em, logs: LogRow[]) => {
  const attackers = [...new Set(logs.map((l) => Number(l.attacker_userid)).filter((id) => id > 0))];
  const homes = new Map<number, [number, number]>();
  if (attackers.length) {
    const cells = await em.find(WorldMapCell, { uid: { $in: attackers }, base_type: MapRoomCell.HOMECELL } as never, { fields: ["uid", "x", "y"] as never });
    for (const c of cells as unknown as { uid: number; x: number; y: number }[]) homes.set(Number(c.uid), [Number(c.x), Number(c.y)]);
  }
  return homes;
};

/** A log as the game lists it (see the top). */
const rowOf = (l: LogRow, attacker: boolean, replays: Map<number, string>, homes: Map<number, [number, number]>) => [
  l.id,
  seconds(l.attacktime),
  attacker ? l.defender_username : l.attacker_username,
  attacker ? l.defender_userid : l.attacker_userid,
  l.type,
  l.x ?? -1,
  l.y ?? -1,
  l.level ?? 0,
  l.damage ?? 0,
  l.destroyed ?? 0,
  l.ended ? 1 : 0,
  lootOf(l.loot),
  replays.get(l.id) ?? "",
  ...(attacker ? [] : homes.get(Number(l.attacker_userid)) ?? [-1, -1]),
];

/** The most logs read for the 24 hours' totals (a side), far more than anyone attacks in a day. */
const DAY_MAX = 2000;

/**
 * Inferno-only (QoL #93): the last 24 hours, each side: how many attacks, and the loot (r1..r4) the player took
 * (their attacks) or lost (attacks on them).
 */
const lastDay = async (em: Em, userid: number) => {
  const since = new Date(Date.now() - 86_400_000);
  const sum = async (where: Record<string, unknown>) => {
    const logs = await em.find(AttackLogs, { ...where, attacktime: { $gte: since } } as never, { fields: ["id", "loot"] as never, limit: DAY_MAX });
    const out = [logs.length, 0, 0, 0, 0];
    for (const l of logs as unknown as { loot?: unknown }[]) {
      const loot = lootOf(l.loot);
      for (let i = 0; i < 4; i++) out[i + 1] += loot[i];
    }
    return out;
  };
  const [mine, onme] = await Promise.all([sum({ attacker_userid: userid }), sum({ defender_userid: userid, attacker_userid: { $ne: userid } })]);
  return { mine, onme };
};
