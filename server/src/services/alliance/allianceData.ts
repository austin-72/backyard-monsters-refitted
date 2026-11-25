import { AllianceRole } from "../../enums/Alliance.js";
import { tagOf } from "./allianceTag.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { getUserAlliance } from "./allianceAccess.js";
import { getAllianceRelationships, type Relationship } from "./relationships.js";

interface AllianceData {
  alliance_id: number;
  name: string;
  image: number;
  /** Inferno-only (14 October): the alliance's designed crest, or null for the preset shield. */
  crest: string | null;
  is_leader: boolean;
  relationships: Relationship;
  /** Inferno-only (13 October): the alliance's chat tag. */
  tag?: string;
}

export interface AllianceRosterEntry {
  alliance_id: number;
  name: string;
  image: number;
  crest: string | null;
  relationships: Relationship;
}

/**
 * Builds the base-load alliancedata payload for a user, or null when they are
 * unaffiliated.
 *
 * @param {User} user - The base owner being loaded.
 * @returns {Promise<AllianceData | null>} The payload, or null if the user has no alliance.
 */
export const getAllianceData = async (user: User): Promise<AllianceData | null> => {
  const alliance = await getUserAlliance(user);

  if (!alliance) return null;

  const { id, name, image } = alliance;
  const crest = alliance.crest ?? null;

  const isLeader = user.alliance_role === AllianceRole.LEADER;
  const relationships = await getAllianceRelationships(id);

  return { alliance_id: id, name, image, crest, is_leader: isLeader, relationships, tag: tagOf(alliance) };
};

/**
 * Builds the map room alliancedata roster - one entry per alliance visible in a
 * chunk of cells, rather than the single object above describing the viewer's own.
 *
 * @param {number[]} allianceIds - Distinct alliance ids referenced by the chunk.
 * @returns {Promise<AllianceRosterEntry[]>} One entry per alliance that exists.
 */
export const getAllianceRoster = async (allianceIds: number[]): Promise<AllianceRosterEntry[]> => {
  if (!allianceIds.length) return [];

  const alliances = await postgres.em.find(
    Alliance,
    { id: { $in: allianceIds } },
    { fields: ["id", "name", "image", "crest"] }
  );

  return alliances.map(({ id, name, image, crest }) => ({
    alliance_id: id,
    name,
    image,
    crest: crest ?? null,
    relationships: {},
  }));
};
