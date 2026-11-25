import { randomUUID } from "node:crypto";

import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { SAVE_CODE_PREFIX, SAVE_CODE_VERSION } from "../../config/SaveTransferConfig.js";
import {
  PORTABLE_SAVE_KEYS,
  PortableSaveSchema,
  type PortableSave,
  type SaveCodePayload,
} from "../../schemas/SaveTransferSchemas.js";
import { noSaveToExportErr, saveExportDisabledErr } from "../../errors/errors.js";
import { getSigningKey } from "./saveSigningKeys.js";
import { encodeSaveCode } from "./saveCode.js";

/**
 * The name written into this server's exports, so a custom server can show where a save came from.
 *
 * @returns {string} SAVE_EXPORT_ISSUER, else SERVER_URL, else BASE_URL:PORT.
 */
export const getIssuerName = (): string =>
  process.env.SAVE_EXPORT_ISSUER?.trim() ||
  process.env.SERVER_URL?.trim() ||
  `${process.env.BASE_URL ?? "http://localhost"}:${process.env.PORT ?? 3001}`;

/**
 * Copies the portable keys off a save, normalised by PortableSaveSchema (for example,
 * points and basevalue are always strings) so every export has the same shape. Empty
 * columns are left out, so the importing server keeps its new-player default for them.
 *
 * @param {Save} save - A main or inferno save.
 * @returns {PortableSave} The portable part of the save.
 */
const pickPortable = (save: Save): PortableSave => {
  const picked: Record<string, unknown> = {};

  for (const key of PORTABLE_SAVE_KEYS) {
    const value = save[key as keyof Save];

    if (value !== undefined && value !== null) picked[key] = value;
  }

  return PortableSaveSchema.parse(picked);
};

/**
 * Builds and signs an export of the player's main yard, inferno yard and account
 * progress. Nothing identifying beyond their user id and username is included -
 * no email address, password hash or Discord details.
 *
 * @param {User} user - The authenticated player.
 * @returns {Promise<{ code: string; payload: SaveCodePayload }>} The signed save code and what it contains.
 * @throws {ClientSafeError} If exports are not configured or the player has no yard yet.
 */
export const buildSaveExport = async (user: User) => {
  const key = getSigningKey();

  if (!key) throw saveExportDisabledErr();

  await postgres.em.populate(user, ["save", "infernosave"]);

  if (!user.save) throw noSaveToExportErr();

  const payload: SaveCodePayload = {
    format: SAVE_CODE_PREFIX,
    version: SAVE_CODE_VERSION,
    exportId: randomUUID(),
    exportedAt: new Date().toISOString(),
    issuer: { name: getIssuerName(), keyId: key.keyId },
    account: {
      userid: user.userid,
      username: user.username,
      timeplayed: user.timeplayed,
      stats: (user.stats ?? null) as SaveCodePayload["account"]["stats"],
    },
    saves: {
      main: pickPortable(user.save),
      inferno: user.infernosave ? pickPortable(user.infernosave) : null,
    },
  };

  return { code: encodeSaveCode(payload), payload };
};
