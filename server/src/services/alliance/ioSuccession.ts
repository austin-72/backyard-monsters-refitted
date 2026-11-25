import { AllianceRole } from "../../enums/Alliance.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { getLastSeen } from "../maproom/getLastSeen.js";

/**
 * Inferno-only (QoL #172): leader succession. When an alliance's leader hasn't been seen (their yard last saved, or
 * online now) for SUCCESSION_DAYS days, its most senior active officer (the earliest join date; seen within
 * ACTIVE_DAYS days) may take the lead, from their Overview: never by itself. The old leader becomes an officer.
 */
export const SUCCESSION_DAYS = 14;

/** (QoL #172) an officer seen within this many days counts as active (the Members tab's "inactive" is 7 days). */
export const ACTIVE_DAYS = 7;

const DAY = 24 * 60 * 60;

export interface IoSuccession {
  leaderId: number;
  leaderName: string;
  /** Seconds since the leader was last seen. */
  away: number;
  /** The officer who may take the lead (0 when none is active). */
  candidateId: number;
  candidateName: string;
}

/**
 * Whether an alliance's lead can be taken, and by whom.
 *
 * @param {number} allianceId - The alliance.
 * @returns {Promise<IoSuccession | null>} null while its leader has been seen within SUCCESSION_DAYS days.
 */
export const ioSuccession = async (allianceId: number): Promise<IoSuccession | null> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(
      `SELECT u.userid, u.username, u.alliance_role AS role, floor(extract(epoch FROM u.alliance_joined_at)) AS j, s.savetime
         FROM bym."user" u
         LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
        WHERE u.alliance_id = ? AND u.alliance_role IN (?, ?)`,
      [allianceId, AllianceRole.LEADER, AllianceRole.OFFICER]
    )
    .catch(() => [])) as { userid: number; username: string; role: string; j: string | number | null; savetime: string | number | null }[];

  const leader = rows.find((r) => r.role === AllianceRole.LEADER);
  if (!leader) return null;

  const now = getCurrentDateTime();
  // (online now counts as seen: the last-seen key lives 2 minutes, kept fresh by the game)
  const online = await getLastSeen(rows.map((r) => Number(r.userid)), BaseType.MAIN).catch(() => new Map<number, number>());
  const seen = (r: (typeof rows)[number]) => Math.max(Number(r.savetime) || 0, online.get(Number(r.userid)) ?? 0);

  const away = now - seen(leader);
  if (away < SUCCESSION_DAYS * DAY) return null;

  const officers = rows
    .filter((r) => r.role === AllianceRole.OFFICER && now - seen(r) < ACTIVE_DAYS * DAY)
    .sort((a, b) => (Number(a.j) || 9e12) - (Number(b.j) || 9e12) || Number(a.userid) - Number(b.userid));
  const first = officers[0];

  return {
    leaderId: Number(leader.userid),
    leaderName: String(leader.username),
    away,
    candidateId: first ? Number(first.userid) : 0,
    candidateName: first ? String(first.username) : "",
  };
};
