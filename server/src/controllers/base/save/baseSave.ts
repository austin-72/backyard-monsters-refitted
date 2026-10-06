import type { KoaController } from "../../../utils/KoaController.js";
import { gauntletSaveCheck, healYard, isGauntletBaseId, parseGauntletBaseId } from "../../../services/events/gauntlet.js";
import { Save } from "../../../database/models/save.model.js";
import { User } from "../../../database/models/user.model.js";
import { postgres, redis } from "../../../server.js";
import { buildSaveData, mapSaveData, pickKeys, SAVE_REPLY_KEYS } from "../../../services/base/mapSaveData.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { logger } from "../../../utils/logger.js";
import { Status } from "../../../enums/StatusCodes.js";
import { SaveKeys } from "../../../enums/SaveKeys.js";
import { BaseSaveSchema } from "../../../schemas/BaseSaveSchema.js";
import { resourcesHandler } from "./handlers/resourceHandler.js";
import { purchaseHandler } from "./handlers/purchaseHandler.js";
import { academyHandler } from "./handlers/academyHandler.js";
import { BaseType } from "../../../enums/Base.js";
import { permissionErr, saveFailureErr } from "../../../errors/errors.js";
import { attackLootHandler } from "./handlers/attackLootHandler.js";
import { defenderLootHandler } from "./handlers/defenderLootHandler.js";
import { monsterUpdateHandler } from "./handlers/monsterUpdateHandler.js";
import { validateSave } from "../../../scripts/anticheat/anticheat.js";
import { getOutpostOwnerSave } from "../../../services/base/getOutpostOwnerSave.js";
import { advanceBuildingTimers } from "../../../services/base/advanceBuildingTimers.js";
import { championHandler } from "./handlers/championHandler.js";
import { buildingDataHandler } from "./handlers/buildingDataHandler.js";
import { takeoverCellMR3, type TakeoverData } from "../../../services/maproom/v3/takeoverCellMR3.js";
import { damageProtection } from "../../../services/maproom/v2/damageProtection.js";
import { isMR3Structure } from "../../../services/maproom/v3/utils/isMR3Structure.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { MapRoomVersion } from "../../../enums/MapRoom.js";
import { MR1_TRIBE_IDS } from "../../../game-data/tribes/v1/index.js";
import { scaledMR1Tribes } from "../../../services/maproom/v1/scaledMR1Tribes.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { EVENT_LOCKED_MONSTER, guardLockerData, INSTANT_UNLOCK_ITEM } from "../../../services/base/lockedMonsters.js";
import { hfoChampionFree } from "../../../services/events/hfo.js";
import { isTestMode, isTestModeOn } from "../../../services/admin/testMode.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { isAdmin } from "../../../services/admin/admin.js";
import { updateAttackLog } from "../../../services/base/createAttackLog.js";

/** Save keys a test-mode admin's saves do not write (the leaderboards and levels others see). */
const TEST_MODE_KEEP = new Set<string>(["points", "basevalue", "empirevalue"]);

const testModeEndedErr = () =>
  new ClientSafeError({
    message: "Admin test mode has been switched off. Please reload the game.",
    status: Status.CONFLICT,
    data: {},
    isClientFriendly: true,
  });

/**
 * The yard an attack is saving to is gone: a wild monster yard rebuilt or reset (an admin tool) while the
 * attack was running. A 409, not a 500: nothing failed, the attack just can't be saved any more.
 */
const yardGoneErr = () =>
  new ClientSafeError({
    message: "This yard has been reset since the attack started, so the attack can't be saved. Please return home.",
    status: Status.CONFLICT,
    data: {},
    isClientFriendly: true,
  });

/** How long after an attack starts its saves are taken (attacks last minutes; this is generous). */
const ATTACK_SAVE_WINDOW = 30 * 60;

/** Whole numbers for the attack fields stored in integer columns (damage, destroyed, locked, protected, over). */
const INT_KEYS = new Set<string>(["damage", "destroyed", "locked", "protected", "over"]);
const toInt = (value: unknown) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(-2147483648, Math.min(2147483647, n)) : 0;
};

/**
 * Controller responsible for saving the user's base data.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} A promise that resolves when the base save process is complete.
 * @throws Will throw an error if the save operation fails.
 */
export const baseSave: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);

  const userSave = user.save!;

  const body = ctx.request.body as Record<string, unknown>;
  const saveData = BaseSaveSchema.parse(body);

  // Admin test mode (services/admin/testMode.ts). A game still in test mode after it was switched off
  // (another device, a login elsewhere) must not write its test yard over the one put back.
  const testMode = await isTestMode(user);
  if (String(body.iotest ?? "") === "1" && !testMode) throw testModeEndedErr();

  const { basesaveid } = saveData;
  const baseSave = Number.isInteger(basesaveid) && basesaveid > 0 ? await postgres.em.findOne(Save, { basesaveid }) : null;

  if (!baseSave && MR1_TRIBE_IDS.has(saveData.baseid)) {
    const tribeSave = await scaledMR1Tribes(user, saveData);
    const filteredSave = await mapSaveData(tribeSave, user);

    ctx.status = Status.OK;
    ctx.body = { error: 0, ...filteredSave };
    return;
  }

  if (!baseSave) {
    if (Number(body.attackid ?? 0) !== 0 || String(saveData.baseid ?? "") !== String(userSave.baseid)) throw yardGoneErr();
    throw saveFailureErr();
  }

  // A Designer draft (services/admin/designs.ts): its admin's saves write its buildings, and nothing else. The
  // game sends the admin's real resources, quests, stats and so on with every save; none of it is taken.
  if (baseSave.type === "design") {
    if (baseSave.userid !== user.userid || !isAdmin(user)) throw permissionErr();
    if (saveData.buildingdata != null) baseSave.buildingdata = saveData.buildingdata;
    baseSave.buildinghealthdata = {};
    baseSave.id = baseSave.savetime;
    baseSave.savetime = getCurrentDateTime();
    postgres.em.persist(baseSave);
    await postgres.em.flush();
    ctx.status = Status.OK;
    ctx.body = { error: 0, ...pickKeys(buildSaveData(baseSave, user, null) as Record<string, unknown>, SAVE_REPLY_KEYS), basesaveid: baseSave.basesaveid };
    return;
  }

  const isOwner = baseSave.saveuserid === user.userid;
  const isOutpostOwner = isOwner && baseSave.type === BaseType.OUTPOST;
  const isAttack = !isOwner && baseSave.attackid !== 0;

  // Test mode attacks are practice: nothing is written to the yard attacked (another player's or a tribe's).
  // Moloch's Gauntlet's test ladder is the admin's own, played for real (services/events/gauntlet.ts).
  if (!isOwner && testMode && !isGauntletBaseId(baseSave.baseid)) {
    const practiceOwnerSave = await getOutpostOwnerSave(baseSave, user);
    ctx.status = Status.OK;
    ctx.body = { error: 0, ...pickKeys(buildSaveData(baseSave, user, practiceOwnerSave) as Record<string, unknown>, SAVE_REPLY_KEYS), basesaveid: baseSave.basesaveid };
    return;
  }

  // Not the owner and not in an attack
  if (!isOwner && baseSave.attackid === 0) throw permissionErr();

  // A player's yard is written by the player attacking it only: the attack loaded last (one at a time,
  // baseModeAttack) must be this user's, and recent. Before this, anyone could write to any yard left
  // with an attack id (every attack that never sent its last save left one).
  if (isAttack && baseSave.type !== BaseType.TRIBE) {
    const last = baseSave.attacks?.at(-1);
    if (!last || last.name !== user.username || getCurrentDateTime() - (last.starttime ?? 0) > ATTACK_SAVE_WINDOW)
      throw permissionErr();
  }

  // A Moloch's Gauntlet yard is its player's own: nobody else writes to it, and only the attack running on
  // it (the one the server started last) does. Its last save decides the stage (beaten and paid once, or
  // one attempt gone): services/events/gauntlet.ts.
  const gauntlet = isAttack && isGauntletBaseId(baseSave.baseid);
  if (gauntlet && parseGauntletBaseId(baseSave.baseid)?.userid !== user.userid) throw permissionErr();
  const gauntletOutcome = gauntlet ? await gauntletSaveCheck(user, baseSave, body, Boolean(saveData.over), testMode) : null;

  await validateSave(user, baseSave, body);

  const storedHealthData = baseSave.buildinghealthdata;

  // Hell Freezes Over: Rimegrave may only be unlocked once the player has won the event (lockedMonsters.ts).
  const rimegraveFree = typeof body.lockerdata === "string" && body.lockerdata.includes(`"${EVENT_LOCKED_MONSTER}"`) ? await hfoChampionFree(user.userid) : false;

  // Standard save logic
  for (const key of isAttack ? Save.attackSaveKeys : Save.saveKeys) {
    const value = body[key] as string;

    // Test mode leaves the rankings as they were: points and values are not written while it is on.
    if (testMode && TEST_MODE_KEEP.has(key)) continue;

    switch (key) {
      case SaveKeys.RESOURCES:
        if (isOutpostOwner) {
          resourcesHandler(userSave, value, { skipCapacity: true });
        } else {
          resourcesHandler(baseSave, value);
        }
        break;

      case SaveKeys.POINTS:
        baseSave.points = value.toString();
        break;

      case SaveKeys.BASEVALUE:
        baseSave.basevalue = value.toString();
        break;

      case SaveKeys.IRESOURCES:
        resourcesHandler(baseSave, value, { key: SaveKeys.IRESOURCES });
        break;

      case SaveKeys.ACADEMY:
        academyHandler(ctx, baseSave);
        break;

      case SaveKeys.BUILDINGDATA:
        if (saveData.buildingdata == null) break;

        if (isAttack) {
          buildingDataHandler(saveData.buildingdata, baseSave);
        } else {
          baseSave[SaveKeys.BUILDINGDATA] = saveData.buildingdata;
        }
        break;

      case SaveKeys.CHAMPION:
        if (isAttack) {
          if (saveData.attackerchampion) {
            userSave.champion = saveData.attackerchampion;
          }

          if (saveData.champion) {
            championHandler(saveData.champion, baseSave);
          }
        } else {
          if (saveData.champion) {
            baseSave.champion = saveData.champion;
          }
        }
        break;

      case "lockerdata": {
        if (!value) break;
        let lockerdata: unknown;
        try {
          lockerdata = JSON.parse(value);
        } catch (_) {
          lockerdata = value;
        }
        // Inferno-only: Korath, Drull, Rezghul and Ashkarr are unlocked in the Strongbox only (lockedMonsters.ts).
        baseSave.lockerdata = (infernoOnlyConfig.enabled && !testMode
          ? guardLockerData(
              lockerdata,
              baseSave.lockerdata,
              (id) => logger.warn(`Save ${baseSave.basesaveid} (${user.username}): ${id} unlock refused, never started`),
              !isAttack && saveData.purchase?.[0] === INSTANT_UNLOCK_ITEM ? 1 : 0,
              rimegraveFree
            )
          : lockerdata) as Save["lockerdata"];
        break;
      }

      case SaveKeys.ATTACKERSIEGE:
        if (isAttack) {
          userSave.siege = saveData.attackersiege;
        }
        break;

      default:
        if (value) {
          const save = baseSave as unknown as Record<string, unknown>;
          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch (_) {
            parsed = value;
          }
          if (INT_KEYS.has(key)) parsed = toInt(parsed);
          // Building health is a map: the browser build can send the text "undefined" for none, which,
          // stored, broke the yard's next attack save (advanceBuildingTimers).
          if (key === "buildinghealthdata" && (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))) break;
          save[key] = parsed;
        }
    }

    if (isOutpostOwner) updateOutposts(userSave, baseSave, key);
  }

  if (!isAttack && saveData.purchase) purchaseHandler(ctx, saveData.purchase, userSave);

  const outpostOwnerSave = await getOutpostOwnerSave(baseSave, user);

  let takeoverData: TakeoverData | null = null;

  if (isAttack) {
    if (saveData.monsterupdate) {
      await monsterUpdateHandler(saveData.monsterupdate, userSave);
    }

    if (saveData.attackcreatures) {
      userSave.monsters = saveData.attackcreatures;
    }

    // attackloot is the attacker's resources since the last save: loot taken plus what the catapults spent
    // (negative). Moloch's Gauntlet yards hold no loot, the stage reward replaces it (services/events/gauntlet.ts),
    // but the catapults' spending is real: only the negative part is kept there. (It used to be dropped whole,
    // so shots in the Gauntlet cost nothing; the user's, 4 October.)
    if (saveData.attackloot) {
      attackLootHandler(gauntlet ? gauntletSpending(saveData.attackloot) : saveData.attackloot, userSave);
    }

    if (saveData.resources) {
      const lootTarget = outpostOwnerSave ?? baseSave;

      if (baseSave.type === BaseType.OUTPOST && !outpostOwnerSave) {
        logger.error(`Outpost ${baseSave.baseid} has no owner main save - loot applied to a dead column`);
      }

      defenderLootHandler(saveData.resources, lootTarget);
      postgres.em.persist(lootTarget);
    }

    postgres.em.persist(userSave);
    await postgres.em.flush();

    // Inferno-only: the attacker's attack log gets the damage, loot and report so far (createAttackLog.ts).
    if (!testMode) await updateAttackLog(user, baseSave, { over: saveData.over, lootreport: body.lootreport });

    // MR3 Takeover Logic:
    // If the attack is over and damage >= 90, trigger takeover or destroy logic.
    // MR3 capturable structures (RESOURCE, STRONGHOLD, FORTIFICATION) allow re-capture
    // from OUTPOST type (player-owned) in addition to first capture from TRIBE type.
    if (saveData.over && baseSave.damage >= 90) {
      if (isMR3Structure(baseSave.wmid)) {
        if (baseSave.type === BaseType.TRIBE || baseSave.type === BaseType.OUTPOST) {
          takeoverData = await takeoverCellMR3(baseSave, user, userSave);
        }
      } else if (baseSave.type === BaseType.TRIBE) {
        const cell = await postgres.em.findOne(WorldMapCell, {
          baseid: baseSave.baseid,
          map_version: MapRoomVersion.V3,
        });

        if (cell && !cell.destroyed_at) cell.destroyed_at = new Date();
      }
    }
    // Grant damage protection to the defender main yard when the attack ends.
    const isProtectable = baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST;

    if (saveData.over && isProtectable && !isMR3Structure(baseSave.wmid)) {
      await damageProtection(baseSave);
    }
  }

  // Moloch's Gauntlet: the last failed attempt heals the yard (its reward is lost; gauntletSaveCheck).
  if (gauntletOutcome?.heal) healYard(baseSave, parseGauntletBaseId(baseSave.baseid)!.stage);

  baseSave.attackid = saveData.over ? 0 : baseSave.attackid;

  const now = getCurrentDateTime();

  // Attack saves store health from the attacker's replay but keep buildingdata from the DB,
  // so the owner's countdowns are brought up to the attack before savetime moves to it.
  if (isAttack && baseSave.buildingdata) {
    baseSave.buildingdata = advanceBuildingTimers(baseSave.buildingdata, storedHealthData, now - baseSave.savetime);
  }

  baseSave.id = baseSave.savetime;
  baseSave.savetime = now;

  if (!isAttack) {
    await redis.setex(`last-seen:main:${user.userid}`, 120, getCurrentDateTime().toString());
  }

  // Test mode switched off (and the account put back) while this save was on its way: writing it now
  // would put the test yard back over the restored one.
  if (testMode && !(await isTestModeOn(user.userid))) throw testModeEndedErr();

  postgres.em.persist(baseSave);
  await postgres.em.flush();

  const filteredSave = pickKeys(buildSaveData(baseSave, user, outpostOwnerSave) as Record<string, unknown>, SAVE_REPLY_KEYS);

  const responseBody = {
    error: 0,
    ...filteredSave,
    basesaveid: baseSave.basesaveid,
    ...(takeoverData && { takeover: takeoverData }),
  };

  ctx.status = Status.OK;
  ctx.body = responseBody;
};

const updateOutposts = (
  userSave: Save,
  baseSave: Save,
  key: keyof Save
) => {
  if (key === SaveKeys.BUILDING_RESOURCES && userSave.buildingresources) {
    userSave.buildingresources[`b${baseSave.baseid}`] = baseSave.buildingresources?.[`b${baseSave.baseid}`];
    userSave.buildingresources["t"] = getCurrentDateTime();
  }

  if (key === SaveKeys.QUESTS) {
    userSave.quests = baseSave.quests;
  }
};

/** Of a Gauntlet save's attackloot, only what was spent (each of r1-r4 at most 0). */
const gauntletSpending = (loot: object): Record<string, number> => {
  const spent: Record<string, number> = {};
  for (const key of ["r1", "r2", "r3", "r4"]) {
    const value = Number((loot as Record<string, unknown>)?.[key]);
    if (Number.isFinite(value) && value < 0) spent[key] = Math.trunc(value);
  }
  return spent;
};
