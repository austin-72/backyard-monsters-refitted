import { ALLIANCE_NAME_MAX_LENGTH, ALLIANCE_NAME_MIN_LENGTH } from "../../config/AllianceConfig.js";
import {
  allianceNameBannedErr,
  allianceNameTooLongErr,
  allianceNameTooShortErr,
} from "../../errors/errors.js";

const LEADING_CHARACTER = /^[\p{L}\p{N}]/u;

/**
 * Rejects an alliance name that is too short, too long, or opens with a symbol.
 * (Inferno-only, 7 October, the user's call: no word filter on what players write to each other.)
 *
 * Checked here rather than in the Zod schema because a failed parse surfaces as
 * a generic support error, while each of these needs a message the player can
 * act on.
 *
 * @param {string} name - The proposed alliance name, already trimmed.
 * @throws {ClientSafeError} When the name breaks any of the rules.
 */
export const assertNameAllowed = (name: string) => {
  if (name.length < ALLIANCE_NAME_MIN_LENGTH) throw allianceNameTooShortErr();
  if (name.length > ALLIANCE_NAME_MAX_LENGTH) throw allianceNameTooLongErr();
  
  if (!LEADING_CHARACTER.test(name)) throw allianceNameBannedErr();
  // (18 October, SUSPECTED-BUGS.md: a name with markup restyled the invite dialogs other players open, and the kick
  // letter's subject) no angle brackets or control characters
  if (/[\u0000-\u001f\u007f<>]/.test(name)) throw allianceNameBannedErr();
};

/**
 * An alliance description: any words allowed. (Inferno-only, 7 October, the user's call: no word filter on what players write to each other.)
 * Kept so its callers stay as they are.
 *
 * @param {string} _description - The proposed alliance description.
 */
export const assertDescriptionAllowed = (_description: string) => {};
