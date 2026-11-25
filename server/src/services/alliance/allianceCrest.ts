import { postgres } from "../../server.js";
import { Status } from "../../enums/StatusCodes.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";

/**
 * Inferno-only (14 October, the user's): an alliance's own crest, designed by its leader in the alliance's edit form
 * (client IoCrest) and shown in place of the preset shield wherever the alliance's shield is (not in chat). Free.
 *
 * Stored as seven numbers with dots between, `shape.pattern.field.second.emblem.emblemColour.rim`:
 *   shape 0-5, pattern 0-9, field and second colour 0-15 (the palette), emblem 0-24 (0 none), emblem colour 0-15,
 *   rim 0-3. NULL (or no crest given) is the preset shield (alliance.image).
 */
export const CREST_LIMITS = [6, 10, 16, 16, 25, 16, 4];

/**
 * The crest typed in a create or edit, made tidy: null to clear it ("" or "0"), undefined for not given, else the
 * seven numbers. A malformed one is an error (the game only sends what its designer makes).
 */
export const parseCrest = (raw: string | undefined): string | null | undefined => {
  if (raw === undefined) return undefined;
  const s = String(raw).trim();
  if (s === "" || s === "0") return null;
  const parts = s.split(".");
  if (parts.length !== CREST_LIMITS.length || !parts.every((p, i) => /^\d{1,2}$/.test(p) && Number(p) < CREST_LIMITS[i])) {
    throw new ClientSafeError({ message: "That crest could not be read.", status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
  }
  return parts.map(Number).join(".");
};

/**
 * Inferno-only (16 October, the user's): the Alliance Banner decoration (client building 170, IoAllianceBanner) shows
 * its yard owner's alliance shield: { image (the preset shield), crest (their own design, or null) }, or null when
 * the owner is in no alliance. Sent with every load of a yard (baseLoad: io_ally_banner).
 */
export const allianceBannerOf = async (allianceId: number): Promise<{ image: number; crest: string | null } | null> => {
  if (!allianceId) return null;
  const rows = (await postgres.em.getConnection().execute(`SELECT image, crest FROM bym.alliance WHERE id = ?`, [allianceId])) as { image: number | null; crest: string | null }[];
  const r = rows[0];
  if (!r) return null;
  return { image: Number(r.image) || 1, crest: r.crest ?? null };
};

/** The column, made if missing (migration 20261102_AllianceCrest does the same; a production server runs those by hand). */
export const ensureAllianceCrest = async (): Promise<void> => {
  await postgres.em.getConnection().execute(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS crest varchar(32) NULL`);
};
