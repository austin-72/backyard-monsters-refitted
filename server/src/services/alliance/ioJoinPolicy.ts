import { postgres, redis } from "../../server.js";
import { calculateBaseLevel } from "../base/calculateBaseLevel.js";

/**
 * Inferno-only (QoL #166): who can join an alliance, set by its leader.
 *  - "open":    anyone at or over the minimum level joins at once (Browse's Join);
 *  - "request": they ask, the leader or an officer answers (the stock way, and the default);
 *  - "invite":  no one can ask; the leader and officers invite.
 * With a minimum level (0: none), checked by the server on every join and request (controllers/alliance/requestJoin.ts).
 *
 * Kept in Redis without expiry (io:al:policy:<alliance id>): the alliance table has no JSON column and this needs no
 * migration. A disbanded alliance's policy lapses with the alliance's 14-day keep (services/alliance/ioDisbandKeep.ts),
 * and is kept for good again when the alliance is restored.
 */
export type JoinMode = "open" | "request" | "invite";

export interface JoinPolicy {
  mode: JoinMode;
  min_level: number;
}

export const JOIN_MODES: readonly JoinMode[] = ["open", "request", "invite"];

export const DEFAULT_JOIN_POLICY: JoinPolicy = { mode: "request", min_level: 0 };

/** The highest minimum level a leader can ask for. */
export const MAX_MIN_LEVEL = 300;

export const joinPolicyKey = (allianceId: number) => `io:al:policy:${allianceId}`;

export const parseJoinPolicy = (raw: unknown): JoinPolicy => {
  if (!raw) return { ...DEFAULT_JOIN_POLICY };
  try {
    const p = JSON.parse(String(raw)) as Partial<JoinPolicy>;
    const mode = JOIN_MODES.includes(p.mode as JoinMode) ? (p.mode as JoinMode) : DEFAULT_JOIN_POLICY.mode;
    const min = Math.floor(Number(p.min_level) || 0);
    return { mode, min_level: Math.max(0, Math.min(MAX_MIN_LEVEL, min)) };
  } catch {
    return { ...DEFAULT_JOIN_POLICY };
  }
};

/** An alliance's policy (the default when none was set, or Redis can't be read). */
export const getJoinPolicy = async (allianceId: number): Promise<JoinPolicy> =>
  parseJoinPolicy(await redis.get(joinPolicyKey(allianceId)).catch(() => null));

/** The policies of a page of alliances (Browse), in one MGET. */
export const getJoinPolicies = async (allianceIds: number[]): Promise<Map<number, JoinPolicy>> => {
  const out = new Map<number, JoinPolicy>();
  if (!allianceIds.length) return out;
  const raws = ((await redis.send("MGET", allianceIds.map(joinPolicyKey)).catch(() => null)) as (string | null)[] | null) ?? [];
  allianceIds.forEach((id, i) => out.set(id, parseJoinPolicy(raws[i] ?? null)));
  return out;
};

/** The leader's choice, checked: an unknown mode or a level out of range is refused (null). */
export const cleanJoinPolicy = (mode: unknown, minLevel: unknown): JoinPolicy | null => {
  if (!JOIN_MODES.includes(String(mode) as JoinMode)) return null;
  const min = Math.floor(Number(minLevel ?? 0));
  if (!Number.isFinite(min) || min < 0 || min > MAX_MIN_LEVEL) return null;
  return { mode: String(mode) as JoinMode, min_level: min };
};

/** Saves the policy, without expiry; the default is simply removed. */
export const setJoinPolicy = async (allianceId: number, policy: JoinPolicy): Promise<void> => {
  if (policy.mode === DEFAULT_JOIN_POLICY.mode && policy.min_level === 0) {
    await redis.del(joinPolicyKey(allianceId));
    return;
  }
  await redis.set(joinPolicyKey(allianceId), JSON.stringify(policy));
};

/** (QoL #502) A disbanded alliance's policy lapses with its keep; a restored one's is kept for good again. */
export const keepJoinPolicyFor = async (allianceId: number, seconds: number): Promise<void> => {
  await redis.expire(joinPolicyKey(allianceId), seconds).catch(() => 0);
};

export const persistJoinPolicy = async (allianceId: number): Promise<void> => {
  await redis.send("PERSIST", [joinPolicyKey(allianceId)]).catch(() => 0);
};

/** A player's level (their main yard's, as the Members tab shows it), 0 when they have no yard yet. */
export const playerLevel = async (userid: number): Promise<number> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT s.points, s.basevalue FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid WHERE u.userid = ?`, [userid])
    .catch(() => [])) as { points: string | null; basevalue: string | null }[];
  if (!rows[0]) return 0;
  return calculateBaseLevel(String(rows[0].points ?? "0"), String(rows[0].basevalue ?? "0"));
};
