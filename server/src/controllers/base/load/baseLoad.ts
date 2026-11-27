import { devilEffects, devilEnabled, devilState } from "../../../services/devil/devilContract.js";
import { giftTotPumpkins } from "../../../services/events/trickOrTreat.js";
import { logger } from "../../../utils/logger.js";
import { addPlayerFlags } from "../../../services/user/playerFlags.js";
import { checkAttackLoad } from "../../../services/anticheat/requestChecks.js";
import { notePool } from "../../../services/anticheat/lootChecks.js";
import { gauntletAttack, isGauntletBaseId } from "../../../services/events/gauntlet.js";
import { referralsEnabled, takeReferralNotice } from "../../../services/user/referrals.js";
import { getRequiredBuild } from "../../../services/clientBuild.js";
import { healDefenders } from "../../../services/base/defenderHealth.js";
import { MOLOCH_WMID } from "../../../services/maproom/v2/tribeForCell.js";
import { devConfig } from "../../../config/GameConfig.js";
import { Save } from "../../../database/models/save.model.js";
import { postgres, redis } from "../../../server.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { storeItems } from "../../../game-data/store/storeItems.js";
import { User } from "../../../database/models/user.model.js";
import { getFlags } from "../../../game-data/flags.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { ATTACK_MODES, BaseMode, BaseType } from "../../../enums/Base.js";
import { EnumYardType } from "../../../enums/EnumYardType.js";
import { MapRoomVersion } from "../../../enums/MapRoom.js";
import { WORLD_SIZE } from "../../../config/MapRoom2Config.js";
import { RESOURCE_PRODUCTION_RATES, RESOURCE_CAPACITIES, DEFENDER_DAMAGE_REDUCTION, STRONGHOLD_BONUSES, STRUCTURE_RANGE } from "../../../config/MapRoom3Config.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { getDefenderCoords, isDefensiveStructure } from "../../../services/maproom/v3/getDefenderCoords.js";
import { getHexDistance } from "../../../services/maproom/v3/getHexNeighborOffsets.js";
import { Status } from "../../../enums/StatusCodes.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { baseModeView } from "./modes/baseModeView.js";
import { baseModeBuild } from "./modes/baseModeBuild.js";
import { baseModeAttack } from "./modes/baseModeAttack.js";
import { infernoModeDescent } from "./modes/infernoModeDescent.js";
import { infernoModeView } from "./modes/infernoModeView.js";
import { infernoModeAttack } from "./modes/infernoModeAttack.js";
import { infernoModeBuild } from "./modes/infernoModeBuild.js";
import { validateAttack } from "../../../services/maproom/validateAttack.js";
import { BaseLoadSchema } from "../../../schemas/BaseLoadSchema.js";
import { discordAgeErr } from "../../../errors/errors.js";
import { EnumBaseRelationship } from "../../../enums/EnumBaseRelationship.js";
import { canAttack } from "../../../services/base/canAttack.js";
import { isTestMode } from "../../../services/admin/testMode.js";
import { createMR1Tribes } from "../../../services/maproom/v1/createMR1Tribes.js";
import { MR1_TRIBES } from "../../../enums/Tribes.js";
import { MR1_TRIBE_IDS } from "../../../game-data/tribes/v1/index.js";
import { calculateBaseLevel } from "../../../services/base/calculateBaseLevel.js";
import { RESOURCE_KEYS } from "../../../services/base/updateResources.js";
import { mapSaveData } from "../../../services/base/mapSaveData.js";
import { clearExpiredStoreItems } from "../../../services/base/clearExpiredStoreItems.js";
import { extractTownHall } from "../../../utils/extractTownHall.js";
import { getChatChannel, getOrCreateChatToken } from "../../../chat/chatChannels.js";
import { allianceBannerOf } from "../../../services/alliance/allianceCrest.js";
import { getAllianceData } from "../../../services/alliance/allianceData.js";
import { runningPowerups } from "../../../services/alliance/powerups.js";
import { cellRelationship, findRelationships } from "../../../services/alliance/relationships.js";
import { INFERNO_CHAT_CHANNEL } from "../../../config/ChatConfig.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { AlliancePowerupType } from "../../../enums/Alliance.js";
import { daveForYard } from "../../../services/yard/dave.js";
import { helpedBy, pendingHelp, yardHelpEnabled } from "../../../services/yard/yardHelp.js";
import { terrainEnabled, terrainOf, terrainsFor } from "../../../services/yard/terrain.js";
import { listPets, petsEnabled, petsForGame, petsInfo } from "../../../services/pets/pets.js";
import { shopEnabled, shopOf, shopView, statueOf, takeShopNotices, treatsUntil } from "../../../services/shop/ioShop.js";
import { replayYard, startReplay } from "../../../services/replays/replays.js";
import { liveAttacksOn, liveWatchFor, noteLiveAttack } from "../../../services/replays/liveAttacks.js";
import { permissionErr } from "../../../errors/errors.js";
import { designInfo, endTryIt, isDesignBaseId, parseDesignBaseId, tryItYard } from "../../../services/admin/designs.js";
import { isTdBaseId, parseTdBaseId, tdInfo } from "../../../services/td/hellgate.js";
import { td2Info } from "../../../services/td/hellgate2.js";
import { isSiegeBaseId, siegeYard } from "../../../services/arcade/siege.js";
import { isAdmin } from "../../../services/admin/admin.js";
import { withYardLock } from "../../../services/maproom/yardLock.js";

type Stronghold = { level: number; cell?: { x: number; y: number } | null };

const STRONGHOLD_FIELDS = ["level", "cell.x", "cell.y"] as const;

const LEGACY_INFERNO_MODES = new Set<string>([
  BaseMode.IBUILD, BaseMode.IATTACK, BaseMode.IWMATTACK, BaseMode.IDESCENT,
  BaseMode.IVIEW, BaseMode.IHELP, BaseMode.IWMVIEW,
]);

const INFERNO_SAVE_MODES = new Set<string>([BaseMode.IBUILD, BaseMode.IATTACK, BaseMode.IWMATTACK]);

/**
 * Controller responsible for loading base modes based on the user's request.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} A promise that resolves when the base load process is complete.
 * @throws Will throw an error if the base load process fails.
 */
/** (16 October, bug reports #96, #97) the loads that may make a yard on the spot: one at a time per yard (yardLock.ts). */
const YARD_MAKING_MODES = new Set<string>([BaseMode.VIEW, BaseMode.ATTACK, BaseMode.WMVIEW, BaseMode.WMATTACK]);

export const baseLoad: KoaController = async (ctx) => {
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const baseid = String(body.baseid ?? "");
  if (baseid && YARD_MAKING_MODES.has(String(body.type ?? ""))) return withYardLock(baseid, () => baseLoadOne(ctx));
  return baseLoadOne(ctx);
};

const baseLoadOne: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { baseid, type, mapversion, attackData, attackcost } = BaseLoadSchema.parse(ctx.request.body);
  // Inferno-only: an attack replay's yard, as it was when the attack began (view mode, the replay's key)
  const replayKey = infernoOnlyConfig.enabled && type === BaseMode.VIEW ? String((ctx.request.body as Record<string, unknown>)?.replay ?? "").slice(0, 24) : "";
  let replayView: Awaited<ReturnType<typeof replayYard>> | null = null;

  // Inferno-only: the main yard *is* the inferno yard. The legacy inferno realm (separate
  // save, descent, MR1-style inferno map) does not exist, so its load modes are refused.
  if (infernoOnlyConfig.enabled && LEGACY_INFERNO_MODES.has(type)) throw permissionErr();

  // A Moloch's Gauntlet yard is only ever attacked, from the Gauntlet (services/events/gauntlet.ts): no
  // viewing it, no inferno attack on it (that would skip counting the attempt).
  if (isGauntletBaseId(baseid) && type !== BaseMode.ATTACK && type !== BaseMode.WMATTACK) throw permissionErr();

  // A Designer draft (services/admin/designs.ts) is only ever opened, in build mode, by the admin it belongs to.
  // (QoL #416: or attacked by them, as a wild monster yard (wmattack), while test mode is on: the Designer's "Try it")
  if (isDesignBaseId(baseid) && (!(type === BaseMode.BUILD || (type === BaseMode.WMATTACK && (await isTestMode(user)))) || !isAdmin(user) || parseDesignBaseId(baseid)!.userid !== user.userid))
    throw permissionErr();
  // (QoL #416: the draft opened again in build mode: a Try it on it is over, and its saves are taken again)
  if (isDesignBaseId(baseid) && type === BaseMode.BUILD) await endTryIt(user.userid);

  // A Siege yard (the Devil's Arcade, services/arcade/siege.ts) is only ever attacked, by its player, from the arcade.
  if (isSiegeBaseId(baseid) && type !== BaseMode.ATTACK && type !== BaseMode.WMATTACK) throw permissionErr();

  // A Hellgate Defense run's yard (services/td/hellgate.ts) is only ever opened, in build mode, by its player.
  if (isTdBaseId(baseid) && (type !== BaseMode.BUILD || parseTdBaseId(baseid)!.userid !== user.userid)) throw permissionErr();

  await postgres.em.populate(user, INFERNO_SAVE_MODES.has(type) ? ["save", "infernosave"] : ["save"]);

  let baseSave: Save | null = null;

  switch (type) {
    case BaseMode.BUILD:
      baseSave = await baseModeBuild(user, baseid);
      redis.setex(`last-seen:main:${user.userid}`, 120, getCurrentDateTime().toString());
      break;

    case BaseMode.VIEW:
    case BaseMode.IVIEW:
      if (replayKey) {
        // (any yard the replay was of, wherever it is now: the replay says what it looked like)
        replayView = await replayYard(user, replayKey).catch(() => null);
        // (13 October: an imported replay names any base id: a Designer draft or a Hellgate run is still its owner's only)
        if (replayView && (isDesignBaseId(replayView.baseid) || isTdBaseId(replayView.baseid))) replayView = null;
        baseSave = replayView ? await postgres.em.findOne(Save, { baseid: replayView.baseid }) : null;
        if (!baseSave) {
          ctx.status = Status.OK;
          ctx.body = { error: replayView ? "That yard is gone, so its replay can't be shown." : "That replay isn't here any more." };
          return;
        }
        break;
      }
      baseSave = await baseModeView(baseid, mapversion, user.save!.worldid, user);
      break;

    case BaseMode.ATTACK:
      if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();

      // (Inferno-only: Map Room 3's attack payment can't come from an Inferno game: services/anticheat)
      if (!isGauntletBaseId(baseid) && !isSiegeBaseId(baseid) && !(await checkAttackLoad(user, mapversion, attackcost, baseid))) throw permissionErr();
      await validateAttack(user, attackData, mapversion);
      // Moloch's Gauntlet (services/events/gauntlet.ts): the player's own ladder yard, not a map cell.
      baseSave = isGauntletBaseId(baseid)
        ? await gauntletAttack(user, baseid, await isTestMode(user))
        : isSiegeBaseId(baseid)
          ? await siegeYard(user, baseid).catch(() => {
              throw permissionErr();
            })
          : await baseModeAttack({ user, baseid, mapversion, attackCost: attackcost });
      break;

    case BaseMode.IDESCENT:
      baseSave = await infernoModeDescent(user);
      break;

    case BaseMode.IBUILD:
      baseSave = await infernoModeBuild(user);
      break;

    case BaseMode.IWMVIEW:
      baseSave = await infernoModeView(user, baseid);
      break;

    case BaseMode.IATTACK:
      if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();

      await validateAttack(user, attackData, mapversion);
      baseSave = await infernoModeAttack(user, baseid);
      break;

    case BaseMode.IWMATTACK:
      if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();
      
      await validateAttack(user, attackData, mapversion);
      baseSave = await infernoModeAttack(user, baseid);
      break;

    case BaseMode.WMVIEW:
      baseSave = await baseModeView(baseid, mapversion, user.save!.worldid, user);
      break;

    case BaseMode.WMATTACK:
      if (!ctx.meetsDiscordAgeCheck && !MR1_TRIBE_IDS.has(baseid)) throw discordAgeErr();
      
      // (Inferno-only: Map Room 3's attack payment can't come from an Inferno game: services/anticheat)
      if (!isGauntletBaseId(baseid) && !isSiegeBaseId(baseid) && !(await checkAttackLoad(user, mapversion, attackcost, baseid))) throw permissionErr();
      await validateAttack(user, attackData, mapversion);
      baseSave = isGauntletBaseId(baseid)
        ? await gauntletAttack(user, baseid, await isTestMode(user))
        : isSiegeBaseId(baseid)
          ? await siegeYard(user, baseid).catch(() => {
              throw permissionErr();
            })
          : isDesignBaseId(baseid)
            ? // (QoL #416: the Designer's "Try it": the admin's draft as a wild monster yard of nobody's, read and changed
              // apart, never written; no attack record, no map cell: services/admin/designs.ts tryItYard)
              await tryItYard(user, baseid, true).catch(() => {
                throw permissionErr();
              })
            : await baseModeAttack({ user, baseid, mapversion, attackCost: attackcost });
      break;

    default:
      // (18 October: a type the game never sends is the request's fault: 400, not a server bug)
      throw new ClientSafeError({ message: `That kind of yard load isn't known (${String(type).slice(0, 20)}).`, status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
  }

  if (!baseSave) throw new Error("Base save not found.");

  const userSave = user.save!;
  const isOwner = user.userid === baseSave.userid;
  const isInferno = baseSave.type === BaseType.INFERNO;
  const isAttack = ATTACK_MODES.has(type);

  // The client always reports map version 1 on the first load of a session, before the response has
  // told it otherwise. Inferno-only accounts are never on Map Room 1, so no MR1 tribes for them.
  if (type === BaseMode.BUILD && mapversion === MapRoomVersion.V1 && !infernoOnlyConfig.enabled) {
    userSave.level = calculateBaseLevel(userSave.points, userSave.basevalue);
    
    const mr1Tribes = await createMR1Tribes(userSave, MR1_TRIBES);
    const wmstatus = new Map(userSave.wmstatus.map((status) => [status[0], status]));

    mr1Tribes.forEach((tribe) => wmstatus.set(tribe[0], tribe));
    userSave.wmstatus = [...wmstatus.values()];
    
    postgres.em.persist(userSave);
    await postgres.em.flush();
  }

  if (isOwner && clearExpiredStoreItems(baseSave)) {
    postgres.em.persist(baseSave);
    await postgres.em.flush();
  }

  // Inferno-only: the owner coming home heals whoever survived the raids (see defenderHealth.ts).
  if (infernoOnlyConfig.enabled && isOwner && type === BaseMode.BUILD && healDefenders(baseSave)) {
    postgres.em.persist(baseSave);
    await postgres.em.flush();
  }

  // (Inferno-only, 20 October: Trick or Treat over, its Mini-Pumpkins put in the main yard's storage, once: said to the
  // game by the flag io_tot_gift)
  const totGift =
    infernoOnlyConfig.enabled && isOwner && type === BaseMode.BUILD && baseSave.basesaveid === user.save?.basesaveid
      ? await giftTotPumpkins(user, baseSave).catch((err) => {
          logger.error(`Trick or Treat: Mini-Pumpkins not given to '${user.username}': ${err}`);
          return 0;
        })
      : 0;

  const filteredSave = await mapSaveData(baseSave, user);
  // Inferno-only has no tutorial (it is an overworld walkthrough); production would otherwise send stage 0.
  const isTutorialEnabled = devConfig.skipTutorial || infernoOnlyConfig.enabled ? 205 : filteredSave.tutorialstage;

  const flags = getFlags();
  // Version control: a client that was already running learns here that a newer one was published.
  flags.io_build = getRequiredBuild();
  // Invite link, login streak, admin button, announcement (also sent with every updatesaved poll).
  // (Hell Freezes Over starts, or moves to its next day, only on the player's own main yard: not an outpost or a design)
  const mainYard = isOwner && type === BaseMode.BUILD && baseSave.basesaveid === user.save?.basesaveid;
  await addPlayerFlags(flags, user, isOwner && type === BaseMode.BUILD, mainYard);
  if (referralsEnabled() && isOwner && type === BaseMode.BUILD) {
    // Any one-time referral notice waiting for the player.
    flags.io_notice = await takeReferralNotice(user);
  }
  if (totGift > 0) flags.io_tot_gift = totGift;
  flags.discordOldEnough = Number(ctx.meetsDiscordAgeCheck);

  const townHall = extractTownHall(userSave.buildingdata || {});

  flags.maproom2 = userSave.mr2upgraded || (townHall && townHall.l >= 6) ? 1 : 0;
  flags.mr2upgraded = userSave.mr2upgraded ? 1 : 0;

  if (infernoOnlyConfig.enabled) {
    flags.maproom2 = 1;
    flags.mr2upgraded = 1;
  }

  let totalResourceRate = 0;
  let totalResourceCapacity = 0;
  let totalStrongholdBonus = 0;
  let totalDefenderStrongholdBonus = 0;
  let defenderReduction = 0;

  if (mapversion === MapRoomVersion.V3) {
    // Sum production rate and storage capacity from all player-owned MR3 resource outposts.
    if (isOwner && !isInferno) {
      const resourceOutposts = await postgres.em.find(
        Save,
        {
          saveuserid: user.userid,
          type: BaseType.OUTPOST,
          wmid: EnumYardType.RESOURCE,
        },
        { fields: ["level"] },
      );

      for (const { level } of resourceOutposts) {
        totalResourceRate += RESOURCE_PRODUCTION_RATES[level];
        totalResourceCapacity += RESOURCE_CAPACITIES[level];
      }

      // Auto-bank calculates and applies resources accumulated since the player's last session.
      if (type === BaseMode.BUILD && totalResourceRate > 0) {
        const now = getCurrentDateTime();
        const lastAccumulated = userSave.buildingresources?.t;

        if (lastAccumulated) {
          const elapsed = now - lastAccumulated;
          const accumulated = Math.floor(totalResourceRate * elapsed);

          if (accumulated > 0 && userSave.resources) {
            for (const resource of RESOURCE_KEYS)
              userSave.resources[resource] += accumulated;
          }
        }

        userSave.buildingresources!.t = now;
        postgres.em.persist(userSave);
        await postgres.em.flush();
      }
    }

    // Strongholds boost monster damage (attacker) and tower damage (defender),
    // but only if the target cell falls within their attack range.
    if (type === BaseMode.ATTACK && baseSave.cell) {
      const targetCell: WorldMapCell = baseSave.cell;

      const [attackerStrongholds, defenderStrongholds] = await Promise.all([
        postgres.em.find(
          Save,
          {
            saveuserid: user.userid,
            type: BaseType.OUTPOST,
            wmid: EnumYardType.STRONGHOLD,
          },
          { populate: ["cell"], fields: STRONGHOLD_FIELDS },
        ),

        postgres.em.find(
          Save,
          {
            saveuserid: baseSave.saveuserid,
            type: BaseType.OUTPOST,
            wmid: EnumYardType.STRONGHOLD,
          },
          { populate: ["cell"], fields: STRONGHOLD_FIELDS },
        ),
      ]);

      const strongholdBonus = (strongholds: Stronghold[]) => {
        let bonus = 0;

        for (const { level, cell } of strongholds) {
          const distance = cell && getHexDistance(cell.x, cell.y, targetCell.x, targetCell.y);
            
          if (distance && distance <= STRUCTURE_RANGE[EnumYardType.STRONGHOLD][level])
            bonus += STRONGHOLD_BONUSES[level];
        }
        return bonus;
      };

      totalStrongholdBonus = strongholdBonus(attackerStrongholds);
      totalDefenderStrongholdBonus = strongholdBonus(defenderStrongholds);
    }
  }

  // Set damage reduction buff for attacking bases with defenders
  if (mapversion === MapRoomVersion.V3 && !isOwner && type === BaseMode.ATTACK) {
    const attackedCell = baseSave.cell;

    if (attackedCell?.uid && isDefensiveStructure(attackedCell.base_type)) {
      const defenderCoords = getDefenderCoords(attackedCell.x, attackedCell.y, attackedCell.base_type);

      const defenderCells = await postgres.em.find(WorldMapCell, {
        $and: [
          { $or: defenderCoords.map(([x, y]) => ({ x, y })) },
          { base_type: EnumYardType.FORTIFICATION },
          { uid: attackedCell.uid },
          { map_version: MapRoomVersion.V3 },
          { world: user.save!.worldid },
        ],
      });

      defenderReduction = DEFENDER_DAMAGE_REDUCTION[defenderCells.length];
    }
  }

  // Admin test mode attacks any yard (practice attacks, services/admin/testMode.ts).
  const attackAllowed = (await isTestMode(user)) || canAttack(userSave, baseSave, mapversion);

  let baseOwner;

  if (isOwner) {
    baseOwner = user;
  } else {
    baseOwner = await postgres.em.findOne(
      User,
      { userid: baseSave.userid },
      { fields: ["pic_square", "alliance_id"] }
    );
  }

  const avatar = baseOwner?.pic_square;
  let chattoken: string | undefined;
  let chatchannel: string | undefined;

  if (isOwner) {
    chattoken = await getOrCreateChatToken(user.userid);
    chatchannel = isInferno ? INFERNO_CHAT_CHANNEL : getChatChannel(userSave.mapversion);
  }

  const isOwnMainYard = isOwner && !isInferno;
  const isOverworldAttack = isAttack && !isInferno;

  const ownerAllianceId = isInferno ? 0 : (baseOwner?.alliance_id ?? 0);
  const flaggedAlliances = ownerAllianceId ? [ownerAllianceId] : [];
  
  const stances = await findRelationships(user.alliance_id, flaggedAlliances);

  const alliance = isOwnMainYard ? await getAllianceData(user) : null;
  const powerups = isOwnMainYard ? await runningPowerups(user.alliance_id) : [];

  const attpowerups = isOverworldAttack ? await runningPowerups(user.alliance_id) : [];
  // Inferno-only (26 October, the user's: "Make sure that every alliance power up ... actually works"): attacking another
  // player's yard, its alliance's running Armament (towers' and blocks' hit points, traps' damage), for the attacker's
  // game, which plays the defence. It was only ever sent to the yard's owner, so it never defended against anyone.
  const defpowerups =
    infernoOnlyConfig.enabled && isOverworldAttack && ownerAllianceId && ownerAllianceId !== user.alliance_id
      ? (await runningPowerups(ownerAllianceId)).filter((p) => p.id === AlliancePowerupType.ARMAMENT)
      : [];

  const relationship = isOwnMainYard
    ? EnumBaseRelationship.SELF
    : cellRelationship(user.alliance_id, ownerAllianceId, stances);

  if (infernoOnlyConfig.enabled && filteredSave.stats && typeof filteredSave.stats === "object")
    (filteredSave.stats as Record<string, unknown>).inferno = 0;

  const response: Record<string, unknown> = {
    ...filteredSave,
    relationship,
    canattack: attackAllowed,
    flags,
    worldsize: WORLD_SIZE,
    error: 0,
    id: filteredSave.basesaveid,
    storeitems: storeItems,
    tutorialstage: isTutorialEnabled,
    currenttime: getCurrentDateTime(),
    pic_square: avatar,
    chatservers: [process.env.CHAT_WS_HOST!],
    ...(isAttack && { attpowerups }),
    ...(defpowerups.length ? { io_defpowerups: defpowerups } : {}),
    ...(isOwner && {
      chatenabled: 1,
      chattoken,
      chatchannel,
      ...(alliance && { alliancedata: alliance }),
      powerups,
    }),
  };

  if (isOwner && !isInferno && mapversion === MapRoomVersion.V3) {
    response.player = { buffs: { 2: totalResourceRate, 10: totalResourceCapacity } };
  }

  if (defenderReduction > 0) {
    response.player = { buffs: { 1: defenderReduction } };
  }

  // Inferno-only: a Moloch stronghold tells the client how much its silos and hall may pay out.
  if (infernoOnlyConfig.enabled && baseSave.type === BaseType.TRIBE && baseSave.wmid === MOLOCH_WMID) {
    const caps = infernoOnlyConfig.moloch.lootCaps[baseSave.level] ?? underworldConfig.lootCaps[baseSave.level];
    if (caps) response.io_lootcap = { silo: caps.silo, hall: caps.hall };
  }

  if (type === BaseMode.ATTACK && mapversion === MapRoomVersion.V3) {
    if (totalStrongholdBonus > 0) response.attackingplayer = { buffs: { 5: totalStrongholdBonus } };
    if (totalDefenderStrongholdBonus > 0) response.defendingplayer = { buffs: { 6: totalDefenderStrongholdBonus } };
  }

  // Inferno-only: the cheat detector notes what the yard attacked holds, the most its loot can be (services/anticheat/lootChecks.ts)
  if (isAttack && !replayView && !isGauntletBaseId(baseSave.baseid) && !isSiegeBaseId(baseSave.baseid)) await notePool(user, baseSave, response);

  // Inferno-only: an attack replay shows the yard as it was when the attack began, with no monsters of its own (the
  // recording has the battle's), and the attack on another player's yard starts its replay (services/replays).
  if (replayView) {
    response.buildingdata = replayView.yard.buildingdata ?? {};
    response.buildinghealthdata = replayView.yard.buildinghealthdata ?? {};
    response.mushrooms = replayView.yard.mushrooms ?? {};
    response.monsters = {};
    response.champion = null;
    response.io_replay_view = { key: replayKey };
  } else if (type === BaseMode.ATTACK && !(await isTestMode(user))) {
    const key = await startReplay(user, baseSave);
    // (18 October, the user's: an attack on a player's yard is noted for its player to watch, services/replays/
    // liveAttacks.ts; and when they are playing, the attacker's game sends its recording in short parts at once)
    const defenderOnline = liveAttacksOn() && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST) && baseSave.saveuserid !== user.userid
      ? Number((await redis.get(`last-seen:main:${baseSave.saveuserid}`).catch(() => null)) ?? 0) >= getCurrentDateTime() - 90
      : false;
    if (key) response.io_replay = { key, rec: 1, ...(defenderOnline ? { live: 1 } : {}) };
    if (!isGauntletBaseId(baseSave.baseid) && !isSiegeBaseId(baseSave.baseid)) await noteLiveAttack(user, baseSave, key);
  }

  // (18 October, the user's) the player's own yard under another player's attack: its game shows the attack instead
  // (the yard can't be played meanwhile: its saves are refused)
  if (type === BaseMode.BUILD && liveAttacksOn()) {
    const watch = await liveWatchFor(user, baseSave);
    if (watch) response.io_watch = watch;
  }

  // Inferno-only: a main yard's pets (services/pets/pets.ts): all of them for its owner (the Pets tab shows the
  // stored ones too), the ones out for anyone else (an attacker, a visitor). Never in an outpost. (Not in a replay.)
  if (petsEnabled() && baseSave.type === BaseType.MAIN && !replayView) {
    const pets = await listPets(baseSave.userid);
    response.io_pets = petsForGame(isOwner ? pets : pets.filter((p) => p.out));
    if (isOwner) response.io_petinfo = await petsInfo(baseSave.userid);
    // (22 October) Pet Treats: until when they do tricks and the zoomies by themselves (services/shop/ioShop.ts)
    response.io_pet_treats = await treatsUntil(Number(baseSave.userid)).catch(() => 0);
  }

  // Inferno-only (22 October): the Store's Extras (services/shop/ioShop.ts): the player's own, with their main yard
  // (and, once, gifts from alliance members and what Raid Insurance paid back); and for anyone loading a yard, the
  // champion its Champion Statues show
  if (shopEnabled() && !replayView && baseSave.type !== "design") {
    if (isOwner && baseSave.type === BaseType.MAIN && type === BaseMode.BUILD) {
      const notices = await takeShopNotices(user.userid).catch(() => ({ gifts: [], insurance: null }));
      response.io_shop = shopView(await shopOf(user.userid));
      if (notices.gifts.length || notices.insurance) response.io_shop_notices = notices;
    }
    if (Number(baseSave.userid) > 0) response.io_statue = await statueOf(Number(baseSave.userid)).catch(() => null);
  }

  // Inferno-only (13 November): the Devil's Contract (services/devil/devilContract.ts). The player's own main yard: the
  // offer (made now if one is due) and what they signed. Any player's main yard or outpost: what its owner's contracts
  // do now (io_devil_yard), for the towers and traps of the game that plays its defence.
  if (devilEnabled() && !replayView && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST)) {
    if (isOwner && baseSave.type === BaseType.MAIN && type === BaseMode.BUILD) {
      response.io_devil = await devilState(user.userid).catch((err) => {
        logger.error(`Devil's Contract: state for '${user.username}' not read: ${err}`);
        return null;
      });
    }
    const owner = Number(baseSave.saveuserid || baseSave.userid) || 0;
    if (owner > 0) response.io_devil_yard = await devilEffects(owner).catch(() => ({}));
  }

  // Inferno-only: the ground its owner chose for a main yard (the D.A.V.E. Club; services/yard/terrain.ts), for
  // everyone who loads it; and for the owner, the grounds they may choose.
  if (terrainEnabled() && baseSave.type === BaseType.MAIN && !replayView) {
    response.io_terrain = await terrainOf(baseSave.userid);
    if (isOwner) response.io_terrains = await terrainsFor(baseSave.userid);
  }

  // Inferno-only (27 November, 72's suggestion): helping out (services/yard/yardHelp.ts): for the owner in build mode,
  // the helps their game hasn't taken yet for this yard; for a visitor, the jobs here they have helped with
  if (yardHelpEnabled() && !replayView && (baseSave.type === BaseType.MAIN || baseSave.type === BaseType.OUTPOST)) {
    const owner = Number(baseSave.saveuserid || baseSave.userid) || 0;
    if (isOwner && type === BaseMode.BUILD) response.io_help = await pendingHelp(user.userid, baseSave.baseid).catch(() => []);
    else if (owner > 0 && owner !== user.userid) response.io_helped = await helpedBy(user.userid, baseSave.baseid).catch(() => []);
  }

  // Inferno-only: its owner's D.A.V.E. Club looks (services/yard/dave.ts): the workers' and the champions', for
  // everyone who loads one of their yards (a main yard or an outpost).
  if (infernoOnlyConfig.enabled && Number(baseSave.userid) > 0 && !replayView && baseSave.type !== "design") {
    response.io_dave = await daveForYard(Number(baseSave.userid));
  }

  // Inferno-only (16 October): the yard owner's alliance shield, for the Alliance Banner decoration (client
  // IoAllianceBanner): { image, crest }, or null for no alliance
  if (infernoOnlyConfig.enabled && Number(baseSave.userid) > 0 && baseSave.type !== "design") {
    response.io_ally_banner = await allianceBannerOf(Number(baseOwner?.alliance_id ?? 0)).catch(() => null);
  }

  // Inferno-only: a Designer draft, so the game shows the design bar and lifts the limits (GLOBAL.ioDesign).
  if (baseSave.type === "design") {
    response.io_design = designInfo(baseSave.baseid);
    // its monsters' levels are the draft's (the Monsters window), not the admin's own Academy's
    response.academy = baseSave.academy ?? {};
  }

  // Inferno-only: a Hellgate Defense run, so the game plays it (GLOBAL.ioTd): the arena, when the run began
  if (baseSave.type === "td") {
    // (Hellgate Defense 2's runs: their map and settings, io_td.v2; services/td/hellgate2.ts)
    response.io_td = (await td2Info(baseSave)) ?? tdInfo(baseSave);
    response.academy = {};
  }

  // Only send descent tribe IDs (201-213) to the client
  if (type === BaseMode.IDESCENT) {
    const wmstatus = (filteredSave.wmstatus ?? []).filter(baseid => baseid[0] >= 201 && baseid[0] <= 213);

    response.resources = filteredSave.iresources;
    response.wmstatus = wmstatus;
  }

  ctx.status = Status.OK;
  ctx.body = response;
};
