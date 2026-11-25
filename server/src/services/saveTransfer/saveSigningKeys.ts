import { createHash, createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";

import { logger } from "../../utils/logger.js";

export interface SigningKey {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicKeyBase64: string;
  keyId: string;
}

/**
 * The first 16 hex characters of the SHA-256 of a public key's SPKI DER encoding.
 *
 * @param {KeyObject} publicKey - An Ed25519 public key.
 * @returns {string} The key id.
 */
export const computeKeyId = (publicKey: KeyObject): string => {
  const der = publicKey.export({ format: "der", type: "spki" });

  return createHash("sha256").update(der).digest("hex").slice(0, 16);
};

/**
 * Parses a private key given as base64 PKCS#8 DER or a PEM block.
 *
 * @param {string} raw - The SAVE_EXPORT_PRIVATE_KEY value.
 * @returns {KeyObject} The private key.
 */
const parsePrivateKey = (raw: string): KeyObject => {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");

  if (value.includes("BEGIN")) return createPrivateKey(value.replace(/\\n/g, "\n"));

  return createPrivateKey({ key: Buffer.from(value, "base64"), format: "der", type: "pkcs8" });
};

let signingKey: SigningKey | null | undefined;

/**
 * This server's export signing key, read once from SAVE_EXPORT_PRIVATE_KEY.
 *
 * @returns {SigningKey | null} The key, or null when it is missing or invalid.
 */
export const getSigningKey = (): SigningKey | null => {
  if (signingKey !== undefined) return signingKey;

  const raw = process.env.SAVE_EXPORT_PRIVATE_KEY;

  if (!raw?.trim()) {
    logger.warn("SAVE_EXPORT_PRIVATE_KEY is not set, save exports are disabled. Run `bun run keys:save-export` to create one.");
    return (signingKey = null);
  }

  try {
    const privateKey = parsePrivateKey(raw);

    if (privateKey.asymmetricKeyType !== "ed25519") {
      logger.error(`SAVE_EXPORT_PRIVATE_KEY must be an Ed25519 key, got ${privateKey.asymmetricKeyType}. Save exports are disabled.`);
      return (signingKey = null);
    }

    const publicKey = createPublicKey(privateKey);

    signingKey = {
      privateKey,
      publicKey,
      publicKeyBase64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
      keyId: computeKeyId(publicKey),
    };
  } catch (err) {
    logger.error(`SAVE_EXPORT_PRIVATE_KEY could not be read, save exports are disabled: ${(err as Error).message}`);
    signingKey = null;
  }

  return signingKey;
};

/**
 * Parses a public key given as base64 SPKI DER or a PEM block.
 *
 * @param {string} raw - One entry of SAVE_IMPORT_SOURCE_KEYS.
 * @returns {KeyObject} The public key.
 */
const parsePublicKey = (raw: string): KeyObject => {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");

  if (value.includes("BEGIN")) return createPublicKey(value.replace(/\\n/g, "\n"));

  return createPublicKey({ key: Buffer.from(value, "base64"), format: "der", type: "spki" });
};

let sourceKeys: Map<string, KeyObject> | undefined;

/**
 * The source server's public keys by key id, read once from SAVE_IMPORT_SOURCE_KEYS.
 * Unreadable or non-Ed25519 entries are logged and skipped.
 *
 * @returns {Map<string, KeyObject>} Source keys by key id.
 */
export const getImportSourceKeys = (): Map<string, KeyObject> => {
  if (sourceKeys) return sourceKeys;

  sourceKeys = new Map();

  const entries = (process.env.SAVE_IMPORT_SOURCE_KEYS ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    try {
      const key = parsePublicKey(entry);

      if (key.asymmetricKeyType !== "ed25519") {
        logger.error(`Ignoring save import source key that is not Ed25519: ${entry.slice(0, 16)}...`);
        continue;
      }

      sourceKeys.set(computeKeyId(key), key);
    } catch (err) {
      logger.error(`Ignoring unreadable save import source key ${entry.slice(0, 16)}...: ${(err as Error).message}`);
    }
  }

  if (sourceKeys.size === 0) logger.warn("SAVE_IMPORT_SOURCE_KEYS has no usable keys, so every save code will be refused.");

  return sourceKeys;
};
