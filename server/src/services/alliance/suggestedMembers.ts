import type { FilterQuery } from "@mikro-orm/core";
import { BaseType } from "../../enums/Base.js";
import { AllianceInviteStatus, AllianceInviteType } from "../../enums/Alliance.js";
import { inviteCutoff } from "./allianceInvites.js";
import { AllianceInvite } from "../../database/models/allianceinvite.model.js";
import type { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { getLastSeenVisible as getLastSeen } from "../maproom/getLastSeen.js";
import { getCachedWorlds } from "../maproom/knownWorlds.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { holdingsOf } from "./allianceOutposts.js";
import { ALLIANCE_MEMBER_FIELDS, toAllianceMember, type AllianceMember, type LoadedMember } from "./allianceMember.js";
import { calculateBaseLevel } from "../base/calculateBaseLevel.js";

export const SUGGESTED_LIMIT = 50;

/**
 * Builds the Suggested tab's candidate list for one alliance.
 *
 * Candidates are unaffiliated players on the alliance's own Map Room version, newest
 * player first. Ordering on save.savetime is what makes the list worth reading: an
 * invite only pays off if it reaches someone still playing.
 *
 * Anyone with a pending exchange already open with this alliance is left out.
 *
 * @param {Alliance} alliance - The alliance doing the recruiting.
 * @returns {Promise<AllianceMember[]>} Candidate rows, most recently active first.
 */
export const getSuggestedMembers = async (alliance: Alliance): Promise<AllianceMember[]> => {
  const worlds = await getCachedWorlds();

  const worldIds = worlds
    .filter((world) => world.map_version === alliance.map_version)
    .map((world) => world.uuid);

  if (worldIds.length === 0) return [];

  // (Inferno-only, QoL #164: a lapsed invite no longer counts: they can be invited again)
  const invite = await postgres.em.find(
    AllianceInvite,
    infernoOnlyConfig.enabled
      ? { alliance_id: alliance.id, status: AllianceInviteStatus.PENDING, $or: [{ type: AllianceInviteType.REQUEST }, { created_at: { $gt: inviteCutoff() } }] }
      : { alliance_id: alliance.id, status: AllianceInviteStatus.PENDING },
    { fields: ["user_id"] },
  );

  const alreadyAsked = invite.map((invite) => invite.user_id);

  const candidates = await postgres.em.find(
    User,
    {
      alliance_id: null,
      userid: { $nin: alreadyAsked },
      save: { type: BaseType.MAIN, worldid: { $in: worldIds } },
    },
    {
      fields: ALLIANCE_MEMBER_FIELDS,
      orderBy: { save: { savetime: "DESC" } },
      limit: SUGGESTED_LIMIT,
    },
  );

  const lastSeen = await getLastSeen(candidates.map((user) => user.userid), BaseType.MAIN);
  const now = getCurrentDateTime();

  const rows = candidates
    .map((user) => toAllianceMember(user, lastSeen, now))
    .filter((user) => user !== null);

  // Inferno: empire value in the Empire column, as everywhere else in the alliances
  if (infernoOnlyConfig.enabled) {
    const holdings = await holdingsOf(rows.map((row) => row.user_id));
    for (const row of rows) row.points = holdings.get(row.user_id)?.empire ?? 0;
  }

  return rows;
};

/**
 * Inferno-only (QoL #163): the Recruit tab's filters. `world`: only players on this world (the recruiter's own);
 * `minLevel`: at least this level; `activeSec`: seen (saved) within this many seconds; `page`: 0 first.
 */
export interface SuggestedFilters {
  world?: string | null;
  minLevel?: number;
  activeSec?: number;
  page?: number;
}

export interface SuggestedPage {
  members: AllianceMember[];
  page: number;
  more: boolean;
  total: number;
}

/** (QoL #163) With a minimum level, how many of the most recently active candidates are looked through. */
const LEVEL_SCAN = 1000;

/**
 * Inferno-only (QoL #163): as getSuggestedMembers, a page of SUGGESTED_LIMIT at a time with the Recruit tab's filters.
 * The level is worked out from the save's points and value (calculateBaseLevel), not stored, so with a minimum
 * level the newest LEVEL_SCAN candidates are read and filtered here; otherwise the page is read as it is.
 *
 * @param {Alliance} alliance - The alliance doing the recruiting.
 * @param {SuggestedFilters} filters - What the recruiter narrowed it to.
 * @returns {Promise<SuggestedPage>} The page's rows, its number, whether another follows, and how many in all.
 */
export const getSuggestedPage = async (alliance: Alliance, filters: SuggestedFilters = {}): Promise<SuggestedPage> => {
  const page = Math.max(0, Math.min(1000, Math.floor(Number(filters.page) || 0)));
  const minLevel = Math.max(0, Math.min(500, Math.floor(Number(filters.minLevel) || 0)));
  const activeSec = Math.max(0, Math.floor(Number(filters.activeSec) || 0));
  const none: SuggestedPage = { members: [], page, more: false, total: 0 };

  const worlds = await getCachedWorlds();

  let worldIds = worlds
    .filter((world) => world.map_version === alliance.map_version)
    .map((world) => world.uuid);

  if (filters.world !== undefined) worldIds = filters.world ? worldIds.filter((id) => id === filters.world) : [];

  if (worldIds.length === 0) return none;

  // (a lapsed invite no longer counts: they can be invited again, QoL #164)
  const invite = await postgres.em.find(
    AllianceInvite,
    { alliance_id: alliance.id, status: AllianceInviteStatus.PENDING, $or: [{ type: AllianceInviteType.REQUEST }, { created_at: { $gt: inviteCutoff() } }] },
    { fields: ["user_id"] },
  );

  const alreadyAsked = invite.map((invite) => invite.user_id);
  const now = getCurrentDateTime();

  const where: FilterQuery<User> = {
    alliance_id: null,
    userid: { $nin: alreadyAsked },
    save: { type: BaseType.MAIN, worldid: { $in: worldIds }, ...(activeSec > 0 && { savetime: { $gt: now - activeSec } }) },
  };

  let candidates: LoadedMember[];
  let total: number;

  if (minLevel > 1) {
    const scanned = await postgres.em.find(User, where, {
      fields: ALLIANCE_MEMBER_FIELDS,
      orderBy: { save: { savetime: "DESC" } },
      limit: LEVEL_SCAN,
    });
    const matching = scanned.filter((user) => user.save && calculateBaseLevel(user.save.points, user.save.basevalue) >= minLevel);
    total = matching.length;
    candidates = matching.slice(page * SUGGESTED_LIMIT, (page + 1) * SUGGESTED_LIMIT);
  } else {
    [candidates, total] = await postgres.em.findAndCount(User, where, {
      fields: ALLIANCE_MEMBER_FIELDS,
      orderBy: { save: { savetime: "DESC" } },
      limit: SUGGESTED_LIMIT,
      offset: page * SUGGESTED_LIMIT,
    });
  }

  const lastSeen = await getLastSeen(candidates.map((user) => user.userid), BaseType.MAIN);

  const rows = candidates
    .map((user) => toAllianceMember(user, lastSeen, now))
    .filter((user) => user !== null);

  const holdings = await holdingsOf(rows.map((row) => row.user_id));
  for (const row of rows) row.points = holdings.get(row.user_id)?.empire ?? 0;

  return { members: rows, page, more: (page + 1) * SUGGESTED_LIMIT < total, total };
};
