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

/**
 * bymr-save.<version>.<keyId>.<payload>.<signature>, where payload is gzipped JSON and
 * signature covers everything before the last dot, both base64url.
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
 * Verifies a pasted save code and returns its contents. The payload is only read once
 * the signature checks out.
 *
 * @param {string} input - The code as pasted. Whitespace is ignored.
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
    isSigned = false;
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

  if (!parsed.success || parsed.data.issuer.keyId !== keyId || parsed.data.version !== SAVE_CODE_VERSION) {
    throw saveCodeInvalidErr();
  }

  return parsed.data;
};
