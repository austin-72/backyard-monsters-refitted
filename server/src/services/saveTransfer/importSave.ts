import { postgres } from "../../server.js";
import { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { SaveImport } from "../../database/models/saveimport.model.js";
import { MapRoomVersion } from "../../enums/MapRoom.js";
import { MAX_RESOURCE_CAPACITY } from "../../config/MapRoom2Config.js";
import { isSaveImportEnabled } from "../../config/SaveTransferConfig.js";
import type { PortableSave, SaveCodePayload } from "../../schemas/SaveTransferSchemas.js";
import { saveAlreadyImportedErr, saveImportDisabledErr } from "../../errors/errors.js";
import { RESOURCE_KEYS } from "../base/updateResources.js";
import { extractTownHall } from "../../utils/extractTownHall.js";
import type { JsonObject } from "../../types/JsonObject.js";
import type { PostgresEM } from "../../types/PostgresEM.js";
import { decodeSaveCode } from "./saveCode.js";

export interface ImportedSaveSummary {
  /** The server the save came from. */
  from: string;
  /** The player's username on that server. */
  username: string;
  townHallLevel: number | null;
}

/**
 * Checks a save code given at registration, before the account is created.
 *
 * @param {string} code - The code the player pasted.
 * @returns {Promise<SaveCodePayload>} The verified save.
 * @throws {ClientSafeError} If imports are off, the code fails verification, or its
 * source account has already been imported here.
 */
export const readSaveCodeForRegistration = async (code: string): Promise<SaveCodePayload> => {
  if (!isSaveImportEnabled()) throw saveImportDisabledErr();

  const payload = decodeSaveCode(code);
  const existing = await postgres.em.findOne(SaveImport, { source_userid: payload.account.userid });

  if (existing) throw saveAlreadyImportedErr();

  return payload;
};

/**
 * Writes the portable fields of a save code onto a save. Nulls are skipped, keeping the
 * new save's default: exports leave empty columns out, and champion can't be null.
 *
 * @param {Save} save - The destination save.
 * @param {PortableSave} portable - The verified portable fields.
 */
const applyPortable = (save: Save, portable: PortableSave) => {
  const target = save as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(portable)) {
    if (value !== undefined && value !== null) target[key] = value;
  }
};

/**
 * Starts an imported yard on Map Room 1, since a world position can't carry over between
 * servers. Resources above the normal cap (only possible on Map Room 3) are brought down
 * to it, as when leaving Map Room 3. The MR2 unlock is kept, so the player can join a map
 * room in game.
 *
 * @param {Save} save - The imported main save.
 * @param {PortableSave} portable - The fields it was imported from.
 */
const startOnMapRoom1 = (save: Save, portable: PortableSave) => {
  if (portable.mapversion === MapRoomVersion.V3 && save.resources) {
    for (const key of RESOURCE_KEYS) {
      if (Number(save.resources[key]) > MAX_RESOURCE_CAPACITY) save.resources[key] = MAX_RESOURCE_CAPACITY;
    }
  }

  save.mapversion = MapRoomVersion.V1;
};

/**
 * Gives a newly registered account the yard from a verified save code, and records the
 * import so the source account can't be imported again.
 *
 * Runs inside the registration transaction: if anything fails, neither the account nor
 * the import record is kept. If two registrations race with the same source account,
 * the save_import primary key lets only one of them commit.
 *
 * @param {PostgresEM} em - The registration transaction's entity manager.
 * @param {User} user - The account just created, already flushed so it has a user id.
 * @param {SaveCodePayload} payload - The verified save code.
 * @returns {Promise<ImportedSaveSummary>} What was imported, to show the player.
 */
export const applyImportedSave = async (em: PostgresEM, user: User, payload: SaveCodePayload): Promise<ImportedSaveSummary> => {
  const { main, inferno } = payload.saves;

  const mainSave = await Save.createMainSave(em, user);

  // Created before the main save is written: createInfernoSave resets the main save's iresources.
  if (inferno) applyPortable(await Save.createInfernoSave(em, user), inferno);

  applyPortable(mainSave, main);
  startOnMapRoom1(mainSave, main);

  user.timeplayed = payload.account.timeplayed;
  user.stats = payload.account.stats as JsonObject | null;

  const record = em.create(SaveImport, {
    source_userid: payload.account.userid,
    source_username: payload.account.username,
    source_key_id: payload.issuer.keyId,
    userid: user.userid,
    export_id: payload.exportId,
    exported_at: new Date(payload.exportedAt),
  });

  em.persist([mainSave, user, record]);
  await em.flush();

  return {
    from: payload.issuer.name,
    username: payload.account.username,
    townHallLevel: extractTownHall((main.buildingdata ?? {}) as JsonObject)?.l ?? null,
  };
};
