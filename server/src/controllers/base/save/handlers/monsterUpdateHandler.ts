import { Save } from "../../../../database/models/save.model.js";
import { updateMonsters } from "../../../../services/base/updateMonsters.js";

export interface MonsterUpdate {
  m: {
    housed: {};
    hid: [];
    space: number;
    hcc: [];
    overdrivetime: number;
    h: [];
    hstage: [];
    hcount: number;
    saved: number;
  };
  baseid: number;
}

type MonsterUpdatePayload = MonsterUpdate[] | Record<string, unknown>;

/**
 * Handles the `monsterupdate` save key after an attack, persisting monster state
 * back to the attacking player's save. Branches on format to support both map versions.
 *
 * MR3: The client sends a plain object keyed by creatureID, where each value is an array
 * of per-creep state objects `{ health, ownerID, q }`, with an optional `Q` heal queue.
 *
 * MR2: The client sends an array of cell updates `[{ baseid, m: housingState }, ...]`.
 * The entry matching the attacker's baseid updates `userSave.monsters`; remaining entries
 * update other bases (e.g. outpost housing) via `updateMonsters`.
 *
 * @param {MonsterUpdatePayload} monsters - Parsed monsterupdate payload
 * @param {Save} userSave - The attacking user's save to update
 */
export const monsterUpdateHandler = async (monsters: MonsterUpdatePayload, userSave: Save) => {
  if (!Array.isArray(monsters)) {
    userSave.monsters = monsters;
    return;
  }

  // Entries without a yard id (a map cell the client had no id for) or without monsters are skipped.
  const valid = monsters.filter(
    (entry): entry is MonsterUpdate =>
      !!entry && typeof entry === "object" && entry.baseid != null && String(entry.baseid) !== "" &&
      String(entry.baseid) !== "NaN" && !!entry.m && typeof entry.m === "object"
  );

  if (valid.length > 0) {
    const authMonsters = valid.find(({ baseid }) => String(baseid) === String(userSave.baseid));

    const monsterUpdates = valid.filter(({ baseid }) => String(baseid) !== String(userSave.baseid));

    if (authMonsters) userSave.monsters = authMonsters.m;

    if (monsterUpdates.length > 0) await updateMonsters(monsterUpdates, userSave.saveuserid);
  }
};
