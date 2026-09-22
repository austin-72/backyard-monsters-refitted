import { creditReferral } from "../../../../services/user/referrals.js";
import { Save } from "../../../../database/models/save.model.js";
import { User } from "../../../../database/models/user.model.js";
import { postgres } from "../../../../server.js";
import { BaseMode } from "../../../../enums/Base.js";
import { logger } from "../../../../utils/logger.js";
import { balancedReward } from "../../../../services/base/balancedReward.js";
import { resetInvasionWaves } from "../../../../services/events/wmi/invasionUtils.js";
import { isAttackActive } from "../../../../services/base/isAttackActive.js";
import { baseUnderAttackErr, permissionErr } from "../../../../errors/errors.js";
import { infernoOnlyConfig } from "../../../../config/InfernoOnlyConfig.js";
import { joinOrCreateWorld } from "../../../../services/maproom/v2/joinOrCreateWorld.js";
import { MapRoomVersion } from "../../../../enums/MapRoom.js";
import { Maproom } from "../../../../database/models/maproom.model.js";
import { Reward } from "../../../../enums/Rewards.js";

/**
 * Inferno-only: there is no Map Room 1 and no Town Hall 6 gate. The first time a save is
 * loaded it is dropped onto a Map Room 2 world and flagged as upgraded, so the client
 * boots directly into the MR2 experience. Also migrates accounts that existed before the
 * server was switched to inferno-only.
 */
/**
 * Inferno-only: the stock server hands out overworld event rewards as the Town Hall levels up
 * (balancedReward: the Krallen champion and King of the Hill data at level 6, Korath at 7...).
 * None of that exists in the Inferno - there is no champion cage - and the client's reward system
 * is switched off in Inferno yards, so a save carrying them fails to load. Never grant them, and
 * strip them from saves that already have them.
 */
const OVERWORLD_REWARDS = new Set<string>([Reward.KRALLEN, Reward.KORATH, Reward.REZGHUL, Reward.DIAMOND_SPURTZ]);

const stripOverworldRewards = (save: Save) => {
  let changed = false;

  if (save.krallen != null) {
    save.krallen = null;
    changed = true;
  }
  if (Array.isArray(save.champion) && save.champion.length > 0) {
    save.champion = [];
    changed = true;
  }
  if (save.rewards) {
    for (const key of Object.keys(save.rewards)) {
      if (OVERWORLD_REWARDS.has(key)) {
        delete save.rewards[key];
        changed = true;
      }
    }
  }
  return changed;
};

const ensureInfernoWorld = async (user: User, save: Save) => {
  if (!infernoOnlyConfig.enabled) return;
  if (save.mapversion === MapRoomVersion.V2 && save.worldid && save.homebase) return;

  await joinOrCreateWorld(user, save);
  save.mr2upgraded = true;
  save.mapversion = MapRoomVersion.V2;

  const maproom1 = await postgres.em.findOne(Maproom, { userid: user.userid });
  if (maproom1) postgres.em.remove(maproom1);

  postgres.em.persist(save);
  await postgres.em.flush();
};

/**
 * Retrieves the save data for the user based on the provided `baseid`.
 * If the baseid matches the user's save, it returns the existing save.
 * Otherwise, it attempts to find and load the requested base.
 * If no save is found for the baseid, return null.
 *
 * @param {User} user - The authenticated user object.
 * @param {string} baseid - The base identifier for the requested save.
 * @returns {Promise<Save | null>} The user's save object or null if not found.
 */
export const baseModeBuild = async (user: User, baseid: string) => {
  const userSave = user.save;

  // If no user save is found, setup MR1 & create a default save for the user.
  if (!userSave) {
    logger.info("User save not found; creating a default save.");
    const newSave = await Save.createMainSave(postgres.em, user);
    await ensureInfernoWorld(user, newSave);
    await creditReferral(user, newSave);
    return newSave;
  }

  // Default mode only runs once on initial base load
  if (baseid === BaseMode.DEFAULT) {
    if (isAttackActive(userSave)) throw baseUnderAttackErr();

    await ensureInfernoWorld(user, userSave);

    if (infernoOnlyConfig.enabled) stripOverworldRewards(userSave);
    else await balancedReward(userSave);

    if (userSave.stats?.other) resetInvasionWaves(userSave.stats.other);

    postgres.em.persist(userSave);
    await postgres.em.flush();
    return userSave;
  }

  if (baseid !== userSave.baseid) {
    const baseSave = await postgres.em.findOne(Save, { baseid });

    if (!baseSave) throw new Error(`Base save not found for baseid: ${baseid}`);
    if (baseSave.userid !== user.userid) throw permissionErr();
    if (isAttackActive(baseSave)) throw baseUnderAttackErr();

    return baseSave;
  }

  if (isAttackActive(userSave)) throw baseUnderAttackErr();
  return userSave;
};
