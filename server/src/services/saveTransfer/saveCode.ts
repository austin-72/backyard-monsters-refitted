import { sign, verify } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  MAX_DECOMPRESSED_PAYLOAD_BYTES,
  MAX_SAVE_CODE_LENGTH,
  SAVE_CODE_PREFIX,
  SAVE_CODE_VERSION,
} from "../../config/SaveTransferConfig.js";
import { SaveCodePayloadSchema, type SaveCodePayload } from "../../schemas/SaveTransferSchemas.js";
import {
  saveCodeInvalidErr,
  saveCodeSignatureErr,
  saveCodeUntrustedErr,
  saveCodeVersionErr,
  saveExportDisabledErr,
} from "../../errors/errors.js";
import { getImportSourceKeys, getSigningKey } from "./saveSigningKeys.js";

/*
 * A save code is one line of text with four dot-separated fields after the prefix:
 *
 *   bymr-save.1.<keyId>.<payload>.<signature>
 *
 * - keyId: 16 hex characters identifying the signing key
 * - payload: base64url of the gzipped JSON payload
 * - signature: base64url Ed25519 signature of everything before the last dot
 *
 * Every character is a letter, digit, "-", "_" or ".", so the code survives being
 * copied, pasted, posted in a form or saved to a text file unchanged.
 */

/**
 * The whole code in one pattern: version, key id, payload, signature. No field's
 * characters include ".", so matching takes time proportional to the code's length
 * whatever an unauthenticated caller sends.
 */
const SAVE_CODE = new RegExp(`^${SAVE_CODE_PREFIX}\\.(\\d{1,4})\\.([0-9a-f]{16})\\.([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$`);

/**
 * Compresses, encodes and signs a payload with this server's key.
 *
 * @param {SaveCodePayload} payload - The export contents.
 * @returns {string} The save code to hand to the player.
 * @throws {ClientSafeError} If this server has no signing key configured.
 */
export const encodeSaveCode = (payload: SaveCodePayload): string => {
  const key = getSigningKey();

  if (!key) throw saveExportDisabledErr();

  const encoded = gzipSync(JSON.stringify(payload)).toString("base64url");
  const signed = `${SAVE_CODE_PREFIX}.${SAVE_CODE_VERSION}.${key.keyId}.${encoded}`;
  const signature = sign(null, Buffer.from(signed, "utf8"), key.privateKey).toString("base64url");

  return `${signed}.${signature}`;
};

/**
 * Checks a pasted save code and returns its contents.
 *
 * In order: the code's shape, its version, that it was signed by one of the source
 * server's keys, and the signature. Only then is the payload decompressed and validated.
 *
 * @param {string} input - The code as the player pasted it. Whitespace, including line
 * breaks a text editor may have added, is ignored.
 * @returns {SaveCodePayload} The verified payload.
 * @throws {ClientSafeError} Describing the first check that failed.
 */
export const decodeSaveCode = (input: string): SaveCodePayload => {
  if (input.length > MAX_SAVE_CODE_LENGTH) throw saveCodeInvalidErr();

  const code = input.replace(/\s+/g, "");
  const match = SAVE_CODE.exec(code);

  if (!match) throw saveCodeInvalidErr();

  const [, version, keyId, payload, signature] = match;

  if (version !== String(SAVE_CODE_VERSION)) throw saveCodeVersionErr();

  const publicKey = getImportSourceKeys().get(keyId);

  if (!publicKey) throw saveCodeUntrustedErr();

  const signed = code.slice(0, code.lastIndexOf("."));

  let isSigned = false;

  try {
    isSigned = verify(null, Buffer.from(signed, "utf8"), publicKey, Buffer.from(signature, "base64url"));
  } catch {
    // A signature of the wrong length makes some runtimes throw rather than return false.
  }

  if (!isSigned) throw saveCodeSignatureErr();

  let json: unknown;

  try {
    const inflated = gunzipSync(Buffer.from(payload, "base64url"), { maxOutputLength: MAX_DECOMPRESSED_PAYLOAD_BYTES });
    json = JSON.parse(inflated.toString("utf8"));
  } catch {
    throw saveCodeInvalidErr();
  }

  const parsed = SaveCodePayloadSchema.safeParse(json);

  // Signed by a trusted key, so a mismatch here means a bug in the exporting server.
  if (!parsed.success || parsed.data.issuer.keyId !== keyId || parsed.data.version !== SAVE_CODE_VERSION) {
    throw saveCodeInvalidErr();
  }

  return parsed.data;
};
