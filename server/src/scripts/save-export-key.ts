import { generateKeyPairSync } from "node:crypto";
import { computeKeyId } from "../services/saveTransfer/saveSigningKeys.js";

/**
 * Generates an Ed25519 key pair for signing save exports.
 *
 * Usage: bun run keys:save-export
 *
 * Put SAVE_EXPORT_PRIVATE_KEY in this server's .env and keep it secret: anyone holding it
 * can forge exports from this server. The public key is safe to share: servers that import
 * from this one put it in SAVE_IMPORT_SOURCE_KEYS. It is also served at
 * GET /api/<version>/saveexport/key once the server is running.
 */
const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const privateDer = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const publicDer = publicKey.export({ format: "der", type: "spki" }).toString("base64");

console.log(`
# Add to this server's .env (keep secret):
SAVE_EXPORT_PRIVATE_KEY=${privateDer}

# Public key (key id ${computeKeyId(publicKey)}), for servers that import from this one:
# SAVE_IMPORT_SOURCE_KEYS=${publicDer}
`);
