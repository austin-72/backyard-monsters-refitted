import { BaseMode, BaseType } from "../../../../enums/Base.js";
import { MapRoomCell, MapRoomVersion } from "../../../../enums/MapRoom.js";
import { World } from "../../../../database/models/world.model.js";
import { WorldMapCell } from "../../../../database/models/worldmapcell.model.js";
import { postgres } from "../../../../server.js";
import { damageProtection } from "../../../../services/maproom/v2/damageProtection.js";
import { Save } from "../../../../database/models/save.model.js";
import { User } from "../../../../database/models/user.model.js";
import { tribeSaveHandler } from "../../../../services/maproom/tribeSaveHandler.js";
import { getCurrentDateTime } from "../../../../utils/getCurrentDateTime.js";
import { isUnder } from "../../../../services/maproom/v2/underworld.js";
import { underworldConfig } from "../../../../config/UnderworldConfig.js";
import { validateRange } from "../../../../services/maproom/v2/validateRange.js";
import { getGeneratedCells, cellKey } from "../../../../services/maproom/v3/generateCells.js";
import { infernoOnlyConfig } from "../../../../config/InfernoOnlyConfig.js";
import { createAttackLog } from "../../../../services/base/createAttackLog.js";
import { updateResources, Operation } from "../../../../services/base/updateResources.js";
import { isAttackActive } from "../../../../services/base/isAttackActive.js";
import { baseUnderAttackErr, baseProtectedErr, userOnlineErr, shinyLockedErr } from "../../../../errors/errors.js";
import { redis } from "../../../../server.js";
import { MR1_TRIBE_IDS } from "../../../../game-data/tribes/v1/index.js";
import { expireWildSave } from "./baseModeView.js";
import { registerAttacker } from "../../../../services/maproom/v1/registerAttacker.js";
import { isShinyLocked } from "../../../../services/user/shinyLock.js";
import { isTestMode, isTestModeOn } from "../../../../services/admin/testMode.js";
import {
  generateNoise,
  getTerrainHeight,
} from "../../../../services/maproom/v2/generateMap.js";

export interface AttackDetails {
  fbid?: string;
  name: string;
  pic_square?: string;
  friend: number;
  count: number;
  starttime: number;
  seen: boolean;
}

interface BaseModeAttack {
  user: User;
  baseid: string;
  mapversion?: MapRoomVersion;
  attackCost?: { resources?: number[]; shiny?: number };
}

/**
 * Processes an attack from a user against a specific base
 *
 * @param {BaseModeAttack} options - Attack options
 * @returns Result of range validation check
 */
export const baseModeAttack = async ({ user, baseid, mapversion, attackCost }: BaseModeAttack) => {
  const userSave = user.save!;
  let save: Save | null = null;

  if (mapversion === MapRoomVersion.V1 && MR1_TRIBE_IDS.has(baseid)) {
    save = await tribeSaveHandler(baseid, mapversion, null, user);
  } else {
    save = await postgres.em.findOne(Save, { baseid });
    if (!save) save = await tribeSaveHandler(baseid, mapversion, userSave.worldid, user);
  }

  if (!save) throw new Error(`Save not found for baseid: ${baseid}`);

  const practice = await isTestMode(user);

  // Map Room 2 range first, before anything is written: it was checked after the attack was recorded (the
  // attacker's protection gone, the yard marked under attack) and failed with a 500.
  if (!practice && mapversion === MapRoomVersion.V2) {
    const at =
      (await postgres.em.findOne(WorldMapCell, { baseid })) ??
      ({ x: parseInt(baseid.slice(-6, -3)), y: parseInt(baseid.slice(-3)), baseid } as unknown as WorldMapCell);
    await validateRange(user, save, mapversion, { attackCell: at });
  }

  // A wild monster yard: rebuilt if nobody attacked it for 12 hours (as viewing it does), and its
  // savetime moved to this attack, so it isn't rebuilt (its row deleted) while this attack is running.
  if (save.type === BaseType.TRIBE && mapversion !== MapRoomVersion.V1 && mapversion !== MapRoomVersion.V3 && !practice) {
    save = await expireWildSave(save, baseid, mapversion ?? MapRoomVersion.V2, userSave.worldid, user);
    if (!save) throw new Error(`Save not found for baseid: ${baseid}`);
    save.savetime = getCurrentDateTime();
  }

  // Admin test mode: a practice attack on any yard (protection, an owner online and range do not
  // stop it), and nothing is marked on the yard: no attack record, no attack log, no lost protection.
  // The attack's saves write nothing to it either (baseSave.ts). A tribe yard seen for the first time is
  // still stored with its map cell, as viewing it does.

  if (save.type !== BaseType.TRIBE && !practice) {
    if (save.protected > getCurrentDateTime()) throw baseProtectedErr();

    // An admin testing (services/admin/testMode.ts): their yards hold the test shiny and resources.
    if (await isTestModeOn(save.saveuserid)) throw baseProtectedErr();

    if (isAttackActive(save)) throw baseUnderAttackErr();

    if (save.type === BaseType.MAIN) {
      const lastSeen = await redis.get(`last-seen:${BaseType.MAIN}:${save.userid}`);
      if (lastSeen && parseInt(lastSeen) >= getCurrentDateTime() - 60) throw userOnlineErr();
    }
    // (No truces: they were taken out of the game, 4 October.)
  }

  if (!practice && save.attacks.length > 3) save.attacks = save.attacks.slice(-2);

  // Track the details of the attack
  const attackDetails: AttackDetails = {
    fbid: "",
    name: user.username,
    pic_square: user.pic_square ?? undefined,
    friend: 0,
    count: 1,
    starttime: getCurrentDateTime(),
    seen: false,
  };

  if (save.type != BaseType.TRIBE && !practice) save.attacks.push(attackDetails);

  if (!practice && (save.type !== BaseType.TRIBE || mapversion !== MapRoomVersion.V1)) {
    await damageProtection(userSave, BaseMode.ATTACK);
  }

  if (!practice) save.attackid = Math.floor(Math.random() * 99999) + 1;

  if (mapversion !== MapRoomVersion.V1) {
    let cell = await postgres.em.findOne(WorldMapCell, { baseid });

    if (!cell) {
      const cellX = parseInt(baseid.slice(-6, -3));
      const cellY = parseInt(baseid.slice(-3));

      const world = await postgres.em.findOne(World, { uuid: userSave.worldid });

      if (!world) throw new Error("No world found.");

      if (mapversion === MapRoomVersion.V3) {
        const genCell = getGeneratedCells().get(cellKey(cellX, cellY));

        cell = new WorldMapCell(world, cellX, cellY, genCell?.altitude ?? 0);
        cell.uid = save.saveuserid;
        cell.base_type = genCell?.type ?? save.wmid;
        cell.map_version = MapRoomVersion.V3;
        cell.baseid = baseid;
      } else {
        // (Inferno-only: an underworld cell is flat land: services/maproom/v2/underworld.ts)
        const terrainHeight = isUnder(cellX, cellY) ? underworldConfig.height : getTerrainHeight(generateNoise(world.uuid), cellX, cellY);

        cell = new WorldMapCell(world, cellX, cellY, terrainHeight);
        cell.uid = save.saveuserid;
        cell.base_type = MapRoomCell.WM;
        cell.map_version = MapRoomVersion.V2;
        cell.baseid = baseid;
      }
    }

    save.cell = cell;
    postgres.em.persist(cell);
  }

  // Handle attack cost for MR3 attack range
  if (mapversion === MapRoomVersion.V3 && attackCost) {
    if (attackCost.resources) {
      const [r1, r2, r3] = attackCost.resources;
      updateResources({ r1, r2, r3 }, userSave.resources!, Operation.SUBTRACT);
    } else if (attackCost.shiny) {
      const shinyLocked = isShinyLocked(user);

      if (shinyLocked) throw shinyLockedErr();
      
      userSave.credits = Math.max(0, userSave.credits - attackCost.shiny);
    }
  }

  const isMR1Tribe = mapversion === MapRoomVersion.V1 && save.type === BaseType.TRIBE;

  if (practice) {
    // Only a tribe yard that was not stored yet is stored (unchanged); nothing else is written.
    if (save.type === BaseType.TRIBE && !isMR1Tribe) {
      postgres.em.persist(save);
      await postgres.em.flush();
    }
    return save;
  }

  if (!isMR1Tribe) postgres.em.persist(save);

  postgres.em.persist(userSave);
  await postgres.em.flush();

  // Create an attack log and update neighbour attack counters
  if (save.type !== BaseType.TRIBE) {
    const defender = await postgres.em.findOne(User, {
      userid: save.saveuserid,
    });

    if (!defender) throw new Error("Defender user not found.");

    if (mapversion === MapRoomVersion.V1) await registerAttacker(user, defender);
    await createAttackLog(user, defender, save)
  } else if (infernoOnlyConfig.enabled && !isMR1Tribe) {
    // Inferno-only: tribe and Moloch yards are in the attack logs too (no defender: the tribe's name).
    await createAttackLog(user, null, save);
  }

  return mapversion === MapRoomVersion.V2 ? save : await validateRange(user, save, mapversion, { baseid });
};
