import { rewardCredits } from "../../../game-data/store/purchaseKeys.js";
import { acceptedInvites } from "../../../services/user/referrals.js";
import { flushWithFreshTotals, trackTotals } from "../../../services/base/freshTotals.js";
import { sanitizeSigns } from "../../../services/yard/signs.js";
import { isSiegeBaseId, noteSiegeSave, parseSiegeBaseId } from "../../../services/arcade/siege.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { gauntletCatapult, gauntletSaveCheck, healYard, isGauntletBaseId, parseGauntletBaseId } from "../../../services/events/gauntlet.js";
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
import { capWorkers } from "../../../services/workers/sacrifice.js";
import { purchaseHandler } from "./handlers/purchaseHandler.js";
import { academyHandler } from "./handlers/academyHandler.js";
import { BaseType } from "../../../enums/Base.js";
import { permissionErr, saveFailureErr } from "../../../errors/errors.js";
import { attackLootHandler } from "./handlers/attackLootHandler.js";
import { defenderLootHandler } from "./handlers/defenderLootHandler.js";
import { monsterUpdateHandler } from "./handlers/monsterUpdateHandler.js";
import { validateSave } from "../../../scripts/anticheat/anticheat.js";
import { attackStarted, checkSave } from "../../../services/anticheat/saveChecks.js";
import { ATTACK_TIMEOUT, isAttackActive } from "../../../services/base/isAttackActive.js";
import { checkLoot } from "../../../services/anticheat/lootChecks.js";
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
import { BASILISK_ID, EVENT_LOCKED_MONSTER, guardLockerData, unlockPayOf } from "../../../services/base/lockedMonsters.js";
import { basiliskFree } from "../../../services/events/basilisk.js";
import { hfoChampionFree } from "../../../services/events/hfo.js";
import { isTestMode, isTestModeOn } from "../../../services/admin/testMode.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { isAdmin } from "../../../services/admin/admin.js";
import { gainsOf, updateAttackLog } from "../../../services/base/createAttackLog.js";
import { endLiveAttack, liveAttackOn, watchingErr } from "../../../services/replays/liveAttacks.js";
import { isAttackSave, tryItRunning, tryItYard } from "../../../services/admin/designs.js";
import { insurancePayout, takeStatueToken } from "../../../services/shop/ioShop.js";

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

/**
 * How long after an attack starts its saves are taken. (18 October, SUSPECTED-BUGS.md: "Attack saves are accepted for
 * 30 minutes, after the owner is already home": the owner may load home ATTACK_TIMEOUT after the attack began, its
 * defenders healed, while a late or forged save could still take loot and write back the yard as it was then.) Now
 * the attack's own most: 5 minutes (7 with an alliance war declared), its monsters' 2-minute retreat, and room for the
 * last save on its way, so a save the attack itself sends is never refused.
 */
const ATTACK_SAVE_WINDOW = Math.max(ATTACK_TIMEOUT, 7 * 60) + 2 * 60 + 60;

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
  // (18 October: its Shiny and resources are written as this save's change on what the database holds when it is
  // written, not as the whole values worked out from this copy: services/base/freshTotals.ts)
  trackTotals(userSave);

  const body = ctx.request.body as Record<string, unknown>;
  const saveData = BaseSaveSchema.parse(body);

  // Admin test mode (services/admin/testMode.ts). A game still in test mode after it was switched off
  // (another device, a login elsewhere) must not write its test yard over the one put back.
  const testMode = await isTestMode(user);
  if (String(body.iotest ?? "") === "1" && !testMode) throw testModeEndedErr();

  const { basesaveid } = saveData;
  const baseSave = Number.isInteger(basesaveid) && basesaveid > 0 ? await postgres.em.findOne(Save, { basesaveid }) : null;
  trackTotals(baseSave);

  if (!baseSave && MR1_TRIBE_IDS.has(saveData.baseid)) {
    // (18 October, SUSPECTED-BUGS.md: this path took any loot, with no attack and none of the checks) there is no
    // Map Room 1 on an Inferno-only server
    if (infernoOnlyConfig.enabled) throw saveFailureErr();
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
    // (QoL #416: the Designer's "Try it", a practice attack on the draft: none of its saves is written, the draft
    // stays as it was. A save from an attack says so (BASE.SaveB), and while a Try it runs every save sent to the
    // draft is taken as one. Answered as a practice attack's saves are, from the yard as the attack has it.)
    if (isAttackSave(body) || (await tryItRunning(user.userid, baseSave.baseid))) {
      const tried = await tryItYard(user, baseSave.baseid, false).catch(() => null);
      ctx.status = Status.OK;
      ctx.body = { error: 0, ...(tried ? pickKeys(buildSaveData(tried, user, null) as Record<string, unknown>, SAVE_REPLY_KEYS) : { baseid: baseSave.baseid }), basesaveid: baseSave.basesaveid };
      return;
    }
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

  // A Siege attack (the Devil's Arcade, services/arcade/siege.ts): its yard is the player's alone, nothing of the
  // attack is kept (no damage, loot, monsters used or points); the result comes at the end (arcade siege finish).
  if (isSiegeBaseId(baseSave.baseid)) {
    if (parseSiegeBaseId(baseSave.baseid)!.userid !== user.userid) throw permissionErr();
    noteSiegeSave(user.userid, body.damage);
    baseSave.savetime = getCurrentDateTime();
    ctx.status = Status.OK;
    ctx.body = { error: 0, ...pickKeys(buildSaveData(baseSave, user, null) as Record<string, unknown>, SAVE_REPLY_KEYS), basesaveid: baseSave.basesaveid };
    return;
  }

  // A Hellgate Defense run (services/td/hellgate.ts): nothing of it is kept, and nothing the game sends with its
  // saves (the player's resources, quests, stats...) is taken. Answered as saved, so the game carries on.
  if (baseSave.type === "td") {
    if (baseSave.userid !== user.userid) throw permissionErr();
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

  // (18 October, the user's: attacks while the player is online, services/replays/liveAttacks.ts) the owner's save of
  // a yard another player is attacking now: refused (the yard is the attacker's until the attack is over), and the
  // owner's game shows the attack instead
  if (isOwner && !testMode && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST)) {
    const attack = await liveAttackOn(baseSave);
    if (attack) throw watchingErr(attack);
  }

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

  await validateSave(user, baseSave, body);

  // Inferno-only: the cheat detector (services/anticheat): what no fair game can send is reported, and what would
  // gain from it left out; an attack save with no attack started on the yard is refused.
  const cheatCheck = { user, baseSave, body, saveData: saveData as unknown as Parameters<typeof checkSave>[0]["saveData"], isOwner, isAttack, gauntlet };
  await checkSave(cheatCheck);
  if (!(await attackStarted(cheatCheck))) throw permissionErr();

  // (18 October, SUSPECTED-BUGS.md: the stage was decided, and paid, before the save was checked, so a save the
  // checks refused had still paid) decided once the save has passed them
  // (18 October, SUSPECTED-BUGS.md: the "no catapults" trophy relied on the game's own report of a shot) a save
  // that pays for catapult shots (its loot's negative part: a Gauntlet yard holds none) marks the month as well,
  // before the stage is decided
  if (gauntlet && saveData.attackloot && Object.keys(gauntletSpending(saveData.attackloot)).length) await gauntletCatapult(user, testMode);
  const gauntletOutcome = gauntlet ? await gauntletSaveCheck(user, baseSave, body, Boolean(saveData.over), testMode) : null;

  const storedHealthData = baseSave.buildinghealthdata;

  // Hell Freezes Over: Rimegrave may only be unlocked once the player has won the event (lockedMonsters.ts).
  const rimegraveFree = typeof body.lockerdata === "string" && body.lockerdata.includes(`"${EVENT_LOCKED_MONSTER}"`) ? await hfoChampionFree(user.userid) : false;
  // (13 October) the Basilisk, once the player has won 200 battles (services/events/basilisk.ts)
  const basiliskFreeNow = typeof body.lockerdata === "string" && body.lockerdata.includes(`"${BASILISK_ID}"`) ? await basiliskFree(user.userid) : false;

  // (18 October, SUSPECTED-BUGS.md: a save the server took but whose answer was lost came again with the same
  // resource changes, and they counted twice) Inferno-only: the game names its resource changes (`ioseq`) until a
  // save of them is answered; a save with the name of the last one taken adds only what has changed since.
  let seqKey: string | null = null;
  let seqSent: Record<string, number> | null = null;
  if (infernoOnlyConfig.enabled && !isAttack && typeof body.ioseq === "string" && /^[A-Za-z0-9_-]{6,40}$/.test(body.ioseq) && typeof body.resources === "string") {
    let sent: Record<string, unknown> | null = null;
    try {
      sent = JSON.parse(body.resources as string);
    } catch {
      sent = null;
    }
    if (sent && typeof sent === "object") {
      seqKey = `save:seq:${baseSave.basesaveid}`;
      seqSent = Object.fromEntries(["r1", "r2", "r3", "r4"].map((k) => [k, Number(sent![k]) || 0]));
      const prev = JSON.parse((await redis.get(seqKey).catch(() => null)) ?? "null") as { seq?: string; r?: Record<string, number> } | null;
      if (prev && prev.seq === body.ioseq && prev.r) {
        const only = { ...sent };
        for (const k of ["r1", "r2", "r3", "r4"]) only[k] = (Number(sent[k]) || 0) - (Number(prev.r[k]) || 0);
        body.resources = JSON.stringify(only);
        logger.info(`Save ${baseSave.basesaveid} (${user.username}): resent; only the resources changed since taken (${JSON.stringify(seqSent)} sent, ${JSON.stringify(prev.r)} taken)`);
      }
    }
  }

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

      // (the game always sends both; a save without them was a 500)
      case SaveKeys.POINTS:
        if (value != null) baseSave.points = value.toString();
        break;

      case SaveKeys.BASEVALUE:
        if (value != null) baseSave.basevalue = value.toString();
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
          // Inferno-only: the D.A.V.E. Club's signs, their messages made safe (services/yard/signs.ts)
          if (infernoOnlyConfig.enabled) sanitizeSigns(saveData.buildingdata);
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
              (id, why) => logger.warn(`Save ${baseSave.basesaveid} (${user.username}): ${id} unlock refused: ${why ?? "never started"}`),
              !isAttack ? unlockPayOf(saveData.purchase) : undefined,
              rimegraveFree,
              basiliskFreeNow
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
          // Inferno-only: a sacrificed worker stays gone (services/workers/sacrifice.ts)
          if (key === "storedata" && !isAttack && baseSave.type === BaseType.MAIN) parsed = capWorkers(parsed, baseSave.storedata);
          save[key] = parsed;
        }
    }

    if (isOutpostOwner) updateOutposts(userSave, baseSave, key);
  }

  // (18 October, SUSPECTED-BUGS.md: range came from the Flinger level the game wrote, so flinger=4 with no Flinger
  // had full range.) Inferno-only: the level of the Flinger standing in the yard (BUILDING5), as saved.
  if (infernoOnlyConfig.enabled && !isAttack && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST) && baseSave.buildingdata) {
    let level = 0;
    for (const b of Object.values(baseSave.buildingdata as Record<string, { t?: unknown; l?: unknown }>)) if (Number(b?.t) === 5) level = Math.max(level, b?.l == null ? 1 : Number(b.l) || 0); // (a level 1 building's save has no level)
    if (Number(baseSave.flinger) !== level) baseSave.flinger = level;
  }

  // (18 October, SUSPECTED-BUGS.md: the invite and fan Shiny were paid to anyone who asked once) Inferno-only: an
  // invite reward only when that many invited players have joined; the fan reward not at all (there is no fan page)
  if (infernoOnlyConfig.enabled && !isAttack && saveData.purchase && String(saveData.purchase[0]) in rewardCredits) {
    const item = String(saveData.purchase[0]);
    const need = ({ QINVITE1: 1, QINVITE5: 5, QINVITE10: 10 } as Record<string, number>)[item] ?? 0;
    const joined = need > 0 ? await acceptedInvites(user.userid).catch(() => 0) : 0;
    if (!(need > 0 && joined >= need)) {
      logger.warn(`Save ${baseSave.basesaveid} (${user.username}): ${item} not paid (${joined} invited player(s) joined, ${need || "none"} needed)`);
      saveData.purchase = undefined as unknown as typeof saveData.purchase;
    }
  }

  // (22 October) a Champion Statue placed with one kept for it (bought ahead in the Extras, or a gift): that, not Shiny
  // (services/shop/ioShop.ts)
  if (infernoOnlyConfig.enabled && !isAttack && saveData.purchase && String(saveData.purchase[0]) === "BUILDING171" && Number(saveData.purchase[1]) === 1 && (await takeStatueToken(user.userid).catch(() => false))) {
    logger.info(`Save ${baseSave.basesaveid} (${user.username}): a Champion Statue placed with one kept for it`);
    saveData.purchase = undefined as unknown as typeof saveData.purchase;
  }

  // (an outpost's purchase priced by the game from the outpost's own store record: checked against that)
  if (!isAttack && saveData.purchase) purchaseHandler(ctx, saveData.purchase, userSave, baseSave.type === BaseType.OUTPOST ? (baseSave.storedata ?? {}) : null);

  const outpostOwnerSave = await getOutpostOwnerSave(baseSave, user);
  // (only its resources are loaded when it is another player's: its Shiny is left alone)
  const ownerTotals = outpostOwnerSave as unknown as Save | null;
  trackTotals(ownerTotals);

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
    let lootPaid = 0;
    // (18 October) what this save credited the attacker, for the defender's loss (defenderLootHandler)
    let lootCredited: Record<string, unknown> | null = null;
    if (saveData.attackloot) {
      // (more than the yard held: its gains left out, services/anticheat/lootChecks.ts)
      const attackloot = gauntlet ? saveData.attackloot : ((await checkLoot(user, baseSave, saveData.attackloot)) as typeof saveData.attackloot);
      attackLootHandler(gauntlet ? gauntletSpending(saveData.attackloot) : attackloot, userSave);
      // (18 October: the loot the quest book counts is what was paid, checked, not the game's report)
      if (!gauntlet) lootPaid = gainsOf(attackloot);
      if (!gauntlet) lootCredited = (attackloot ?? null) as Record<string, unknown> | null;
    }

    if (saveData.resources) {
      const lootTarget = outpostOwnerSave ?? baseSave;

      if (baseSave.type === BaseType.OUTPOST && !outpostOwnerSave) {
        logger.error(`Outpost ${baseSave.baseid} has no owner main save - loot applied to a dead column`);
      }

      const held = { ...((lootTarget.resources ?? {}) as Record<string, number>) };
      defenderLootHandler(saveData.resources, lootTarget, undefined, infernoOnlyConfig.enabled ? lootCredited : undefined);
      // (22 October) Raid Insurance: half of what this raid takes comes back to its insured player (the loss the server
      // just took, by resource; services/shop/ioShop.ts insurancePayout)
      // (the yard's player: an outpost's owner's main yard is what an outpost's raid takes from)
      const insured = Number(baseSave.saveuserid) || 0;
      if (infernoOnlyConfig.enabled && !testMode && !gauntlet && insured > 0 && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST)) {
        const after = (lootTarget.resources ?? {}) as Record<string, number>;
        const loss: Record<string, number> = {};
        for (const k of ["r1", "r2", "r3", "r4"]) loss[k] = Math.max(0, (Number(held[k]) || 0) - (Number(after[k]) || 0));
        const back = await insurancePayout(insured, `${baseSave.baseid}:${baseSave.attackid}`, loss).catch((e) => {
          logger.error(`Raid Insurance: ${e}`);
          return {} as Record<string, number>;
        });
        if (Object.keys(back).length) {
          const paid = { ...after };
          for (const [k, n] of Object.entries(back)) paid[k] = (Number(paid[k]) || 0) + n;
          lootTarget.resources = paid as typeof lootTarget.resources;
        }
      }
      postgres.em.persist(lootTarget);
    }

    postgres.em.persist(userSave);
    await flushWithFreshTotals(postgres.em, [userSave, baseSave, ownerTotals]);

    // Inferno-only: the attacker's attack log gets the damage, loot and report so far (createAttackLog.ts).
    if (!testMode) await updateAttackLog(user, baseSave, { over: saveData.over, lootreport: body.lootreport, paid: lootPaid });

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

  // (13 October) the attack's end is the attacker's to say: an owner's save with "over" while an attack runs on the
  // yard ended it (the attacker's next saves were refused, and the owner's older health kept). A stale one (past
  // isAttackActive's 7 minutes) the owner's save still clears.
  // (Only a main yard or an outpost: the Gauntlet's, Hellgate's and the arcade's yards are attacked by their owner.)
  const othersAttack = baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST;
  if (saveData.over && (isAttack || !othersAttack || !isAttackActive(baseSave))) baseSave.attackid = 0;

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
  await flushWithFreshTotals(postgres.em, [userSave, baseSave, ownerTotals]);
  // (18 October) the attack is over: no longer watched as live
  if (isAttack && saveData.over) await endLiveAttack(baseSave.baseid);
  // (18 October) what this save's resource changes were, by their name, for a save of them sent again
  if (seqKey && seqSent) await redis.set(seqKey, JSON.stringify({ seq: body.ioseq, r: seqSent }), "EX", "3600").catch(() => null);

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
