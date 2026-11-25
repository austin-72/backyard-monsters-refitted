import { Status } from "../../enums/StatusCodes.js";
import { AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { requireAllianceMember } from "../../services/alliance/allianceAccess.js";
import { cleanJoinPolicy, getJoinPolicy, MAX_MIN_LEVEL, setJoinPolicy } from "../../services/alliance/ioJoinPolicy.js";
import { ioRestoreKept } from "../../services/alliance/ioDisbandKeep.js";
import { getAllianceData } from "../../services/alliance/allianceData.js";
import { tagOf } from "../../services/alliance/allianceTag.js";
import { calculateBaseLevel } from "../../services/base/calculateBaseLevel.js";
import { getGameLeaderboards, worldNames } from "../../services/leaderboards/gameLeaderboards.js";
import { permissionErr } from "../../errors/errors.js";
import { logger } from "../../utils/logger.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Inferno-only: the alliance's join policy (QoL #166), restoring a disbanded alliance (QoL #502), and the player card
 * the chat's name menu shows (QoL #187).
 */

const requireInferno = () => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
};

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) });

const refuse = (message: string, status: Status = Status.CONFLICT) =>
  new ClientSafeError({ message, status, data: {}, isClientFriendly: true });

/**
 * POST /alliance/joinpolicy (QoL #166): the player's alliance's join policy, { error: 0, policy: { mode, min_level },
 * max_level }. With `mode` ("open", "request" or "invite") and `min_level` (0 to 300): the leader sets it first.
 */
export const joinPolicyController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceMember(user);
  const p = params(ctx);
  if (p.mode !== undefined) {
    if (user.alliance_role !== AllianceRole.LEADER) throw refuse("Only the leader can change who can join.", Status.FORBIDDEN);
    const policy = cleanJoinPolicy(p.mode, p.min_level);
    if (!policy) throw refuse(`Choose open, by request or invite only, and a level from 0 to ${MAX_MIN_LEVEL}.`, Status.BAD_REQUEST);
    await setJoinPolicy(alliance.id, policy);
  }
  ctx.status = Status.OK;
  ctx.body = { error: 0, policy: await getJoinPolicy(alliance.id), max_level: MAX_MIN_LEVEL };
};

/**
 * POST /alliance/restore (QoL #502): the alliance the player disbanded in the last 14 days comes back, with them as its
 * leader (services/alliance/ioDisbandKeep.ts). { error: 0, name, alliancedata } ; refused (409) saying why.
 */
export const restoreAllianceController: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const restored = await ioRestoreKept(user);
  const alliancedata = await getAllianceData(user);
  ctx.status = Status.OK;
  ctx.body = { error: 0, name: restored.name, ...(alliancedata && { alliancedata }) };
};

// ---- the player card (QoL #187)

/** The leaderboards' ranks, worked out once per board (it is made again every 5 minutes). */
interface Ranks {
  at: number;
  /** uid -> [rank by empire value overall, rank on their world, how many on that world, home x, home y] */
  players: Map<number, [number, number, number, number, number]>;
  playerCount: number;
  /** uid -> rank on the Hellgate Defense board */
  defenders: Map<number, number>;
  defenderCount: number;
}

let ranks: Ranks | null = null;

const ranksNow = async (): Promise<Ranks | null> => {
  try {
    const board = await getGameLeaderboards();
    if (ranks && ranks.at === board.generatedAt) return ranks;
    const data = JSON.parse(board.raw.toString()) as { players?: unknown[][]; defenders?: unknown[][] };
    const players = (data.players ?? []).map((r) => ({ uid: Number(r[0]), world: Number(r[2]), empire: Number(r[5]) || 0, x: Number(r[6]), y: Number(r[7]) }));
    players.sort((a, b) => b.empire - a.empire);
    const perWorld = new Map<number, number>();
    const map = new Map<number, [number, number, number, number, number]>();
    players.forEach((p, i) => {
      const w = (perWorld.get(p.world) ?? 0) + 1;
      perWorld.set(p.world, w);
      map.set(p.uid, [i + 1, w, 0, p.x, p.y]);
    });
    for (const p of players) {
      const row = map.get(p.uid);
      if (row) row[2] = perWorld.get(p.world) ?? 0;
    }
    // (the board lists them most waves first already)
    const defenders = new Map<number, number>();
    (data.defenders ?? []).forEach((r, i) => defenders.set(Number(r[0]), i + 1));
    ranks = { at: board.generatedAt, players: map, playerCount: players.length, defenders, defenderCount: defenders.size };
    return ranks;
  } catch (err) {
    logger.warn(`Player card: no leaderboards (${err})`);
    return null;
  }
};

/** Cards made in the last minute, by user id. */
const cards = new Map<number, { at: number; card: Record<string, unknown> }>();

const CARD_MS = 60_000;

const makeCard = async (userid: number): Promise<Record<string, unknown> | null> => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT u.userid, u.username, u.alliance_id, u.alliance_role, s.baseid, s.points, s.basevalue, s.worldid, s.createtime
       FROM bym."user" u LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
      WHERE u.userid = ?`,
    [userid]
  )) as { userid: number; username: string; alliance_id: number | null; alliance_role: string | null; baseid: string | null; points: string | null; basevalue: string | null; worldid: string | null; createtime: number | null }[];
  const u = rows[0];
  if (!u) return null;
  const outposts = (await postgres.em
    .getConnection()
    .execute(`SELECT count(*)::int AS n FROM bym.save WHERE type = 'outpost' AND saveuserid = ?`, [userid])
    .catch(() => [])) as { n: number }[];
  const td = (await postgres.em
    .getConnection()
    .execute(`SELECT best_wave, best_kills FROM bym.td_score WHERE user_id = ?`, [userid])
    .catch(() => [])) as { best_wave: number; best_kills: number }[];
  const world = u.worldid ? (await worldNames([u.worldid]).catch(() => new Map<string, string>())).get(u.worldid) ?? "" : "";
  const alliance = u.alliance_id ? await postgres.em.findOne(Alliance, { id: u.alliance_id }, { fields: ["id", "name", "tag"] }) : null;
  const r = await ranksNow();
  const mine = r?.players.get(userid);
  const hg = r?.defenders.get(userid);
  return {
    user_id: u.userid,
    name: u.username,
    level: u.points != null ? calculateBaseLevel(String(u.points), String(u.basevalue ?? "0")) : 0,
    world,
    world_id: u.worldid ?? "",
    outposts: Number(outposts[0]?.n) || 0,
    base_id: u.baseid ? String(u.baseid) : "",
    joined: Number(u.createtime) || 0,
    alliance: alliance ? { id: alliance.id, name: alliance.name, tag: tagOf(alliance), role: u.alliance_role ?? "member" } : null,
    // (the leaderboards' ranks; none for a player who isn't on them, admins and banned accounts among them)
    rank: mine ? mine[0] : 0,
    rank_of: r?.playerCount ?? 0,
    world_rank: mine ? mine[1] : 0,
    world_rank_of: mine ? mine[2] : 0,
    home: mine && mine[3] >= 0 ? { x: mine[3], y: mine[4] } : null,
    hellgate: td[0] ? { wave: Number(td[0].best_wave) || 0, kills: Number(td[0].best_kills) || 0, rank: hg ?? 0, rank_of: r?.defenderCount ?? 0 } : null,
  };
};

/**
 * GET or POST /playercard { userid } (QoL #187): what the chat's name menu shows at its top: level, world, outposts,
 * the leaderboards' ranks, the best Hellgate Defense run, when they started, their alliance, and their yard's base id
 * (View yard, QoL #188). Each player's card is kept a minute. { error: 0, card } ; { error: 0, card: null } for no one.
 */
export const playerCardController: KoaController = async (ctx) => {
  requireInferno();
  const userid = Math.floor(Number(params(ctx).userid));
  if (!Number.isSafeInteger(userid) || userid <= 0) throw permissionErr();
  const now = Date.now();
  let hit = cards.get(userid);
  if (!hit || now - hit.at > CARD_MS) {
    const card = await makeCard(userid);
    if (cards.size > 5000) {
      for (const [k, v] of cards) if (now - v.at > CARD_MS) cards.delete(k);
      if (cards.size > 5000) cards.clear();
    }
    hit = { at: now, card: card ?? {} };
    if (card) cards.set(userid, hit);
    else {
      ctx.status = Status.OK;
      ctx.body = { error: 0, card: null };
      return;
    }
  }
  ctx.set("Cache-Control", "private, max-age=60");
  ctx.status = Status.OK;
  ctx.body = { error: 0, card: hit.card };
};
