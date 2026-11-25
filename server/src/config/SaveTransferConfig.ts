/**
 * Settings for save transfer: a player exports their yard from the main server as a
 * signed save code, then pastes it once when registering on a custom server.
 *
 * The exporting server signs every code with its Ed25519 key. A server with imports
 * turned on only accepts codes signed by the source server's keys, and accepts each
 * source account (by user id) once, ever. See docs/save-transfer.md.
 */

/** First segment of every save code. Part of the signed bytes. */
export const SAVE_CODE_PREFIX = "bymr-save";

/** Second segment of every save code. Bumped when the payload shape changes. */
export const SAVE_CODE_VERSION = 1;

/** The signature algorithm used for save codes. */
export const SAVE_CODE_ALGORITHM = "Ed25519";

/**
 * Longest code accepted on import. A very large real yard is under 200 KB; the limit
 * bounds the work the register route, which needs no sign-in, does on a pasted code.
 */
export const MAX_SAVE_CODE_LENGTH = 1024 * 1024;

/**
 * Upper bound on a decompressed payload, so a malformed code cannot inflate into
 * something enormous. Checked only after the signature.
 */
export const MAX_DECOMPRESSED_PAYLOAD_BYTES = 32 * 1024 * 1024;

/**
 * Whether this server accepts save codes on registration. Off unless SAVE_IMPORT is
 * "enabled", matching the other switches in example.env.
 *
 * @returns {boolean} True only for "enabled" (case-insensitive).
 */
export const isSaveImportEnabled = () => process.env.SAVE_IMPORT?.trim().toLowerCase() === "enabled";
