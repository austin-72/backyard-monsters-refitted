import { AllianceRole } from "../../enums/Alliance.js";
import { Status } from "../../enums/StatusCodes.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { permissionErr } from "../../errors/errors.js";
import { requireAllianceMember } from "./allianceAccess.js";

/**
 * Inferno-only (16 October, QoL #174): what an alliance's leader lets its officers do, switched in the Overview:
 *   powerups     start a charged power-up (activatepowerup; speeding one up is open to every member already)
 *   relations    flag another alliance as foe, neutral or ally (changerelationship)
 *   description  change the alliance's description (editalliance: the description only; the name, tag, shield and
 *                crest stay the leader's)
 * Kept in bym.alliance.officer_perms (migration 20261107_OfficerPerms). A key missing is the rule before: the leader
 * only, so nothing changes until a leader switches one on.
 */
export const OFFICER_PERMS = ["powerups", "relations", "description"] as const;

export type OfficerPerm = (typeof OFFICER_PERMS)[number];

export type OfficerPerms = Record<OfficerPerm, boolean>;

const DEFAULTS: OfficerPerms = { powerups: false, relations: false, description: false };

/** Why an officer is refused, by switch. */
const REFUSED: Record<OfficerPerm, string> = {
  powerups: "Your leader hasn't allowed officers to start power-ups.",
  relations: "Your leader hasn't allowed officers to set relationships with other alliances.",
  description: "Your leader hasn't allowed officers to edit the description.",
};

/** The alliance's switches, each one true or false (missing or unreadable: the default, off). */
export const officerPermsOf = (alliance: { officer_perms?: unknown } | null | undefined): OfficerPerms => {
  const out: OfficerPerms = { ...DEFAULTS };
  const raw = alliance?.officer_perms;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of OFFICER_PERMS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "boolean") out[k] = v;
    }
  }
  return out;
};

/** Whether this player may do `perm` in their alliance: its leader always; an officer when the leader allows it. */
export const canInAlliance = (user: User, alliance: Alliance, perm: OfficerPerm): boolean => {
  if (user.alliance_id !== alliance.id) return false;
  if (user.alliance_role === AllianceRole.LEADER) return true;
  return infernoOnlyConfig.enabled && user.alliance_role === AllianceRole.OFFICER && officerPermsOf(alliance)[perm];
};

/**
 * The guard for the three routes: the player's alliance, when they lead it or are an officer the leader lets do
 * `perm`. An officer who isn't let is told so; anyone else gets the route's own refusal (`refuse`), as before.
 */
export const requireAlliancePerm = async (user: User, perm: OfficerPerm, refuse: () => Error = permissionErr): Promise<Alliance> => {
  const alliance = await requireAllianceMember(user);
  if (canInAlliance(user, alliance, perm)) return alliance;
  if (infernoOnlyConfig.enabled && user.alliance_role === AllianceRole.OFFICER) {
    throw new ClientSafeError({ message: REFUSED[perm], status: Status.FORBIDDEN, data: {}, isClientFriendly: true });
  }
  throw refuse();
};

/** A switch sent by the game: "1" / "0", "true" / "false", or a boolean; undefined when it wasn't sent or can't be read. */
export const parseSwitch = (raw: unknown): boolean | undefined => {
  if (typeof raw === "boolean") return raw;
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "on") return true;
  if (s === "0" || s === "false" || s === "off") return false;
  return undefined;
};
