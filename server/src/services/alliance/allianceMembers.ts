import { BaseType } from "../../enums/Base.js";
import { holdingsOf } from "./allianceOutposts.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { getLastSeenVisible as getLastSeen } from "../maproom/getLastSeen.js";
import { ALLIANCE_MEMBER_FIELDS, toAllianceMember, type AllianceMember } from "./allianceMember.js";

/**
 * Builds the Members tab roster for one alliance.
 *
 * @param {number} allianceId - The alliance whose roster is being read.
 * @returns {Promise<AllianceMember[]>} Members ordered by empire points (Inferno: empire value), highest first.
 */
export const getAllianceMembers = async (allianceId: number): Promise<AllianceMember[]> => {
  const members = await postgres.em.find(
    User,
    { alliance_id: allianceId },
    {
      fields: ALLIANCE_MEMBER_FIELDS,
      orderBy: { userid: "ASC" },
    },
  );

  const lastSeen = await getLastSeen(members.map((member) => member.userid), BaseType.MAIN);
  const now = getCurrentDateTime();

  const roster = members
    .map((member) => toAllianceMember(member, lastSeen, now))
    .filter((member) => member !== null);

  // Inferno-only: each member's outposts and empire value on the map
  if (infernoOnlyConfig.enabled) {
    const holdings = await holdingsOf(roster.map((m) => m.user_id));
    for (const m of roster) {
      const h = holdings.get(m.user_id);
      m.outposts = h?.outposts ?? 0;
      m.empire = h?.empire ?? 0;
      // (Inferno ranks by empire value: the lists' "points" column shows it, and the roster is ordered by it)
      m.points = m.empire;
    }
    // (QoL #175: when each joined, for the Members tab's Joined column: user.alliance_joined_at, migration 20261020;
    // left out where the column isn't there yet)
    const joined = (await postgres.em
      .getConnection()
      .execute(
        `SELECT userid, floor(extract(epoch FROM alliance_joined_at)) AS j FROM bym."user" WHERE alliance_id = ? AND alliance_joined_at IS NOT NULL`,
        [allianceId]
      )
      .catch(() => [])) as { userid: number; j: string | number | null }[];
    const joinedBy = new Map(joined.map((r) => [Number(r.userid), Number(r.j) || 0]));
    for (const m of roster) {
      const j = joinedBy.get(m.user_id);
      if (j) m.joined = j;
    }
  }

  return roster.sort((member, other) => other.points - member.points);
};
