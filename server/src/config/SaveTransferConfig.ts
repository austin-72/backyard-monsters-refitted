export const SAVE_CODE_PREFIX = "bymr-save";

export const SAVE_CODE_VERSION = 1;

export const SAVE_CODE_ALGORITHM = "Ed25519";

export const MAX_SAVE_CODE_LENGTH = 1024 * 1024;

export const MAX_DECOMPRESSED_PAYLOAD_BYTES = 32 * 1024 * 1024;

/**
 * Whether this server accepts save codes on registration.
 *
 * @returns {boolean} True when SAVE_IMPORT is "enabled".
 */
export const isSaveImportEnabled = () => process.env.SAVE_IMPORT === "enabled";
