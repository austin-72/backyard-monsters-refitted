import { devilEffects } from "../../../services/devil/devilContract.js";
import { isAttackActive } from "../../../services/base/isAttackActive.js";
import { flushWithFreshTotals, trackTotals } from "../../../services/base/freshTotals.js";
import { withMoveLock } from "../../../services/maproom/v2/moveGuard.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { checkPrice } from "../../../services/anticheat/requestChecks.js";
import { permissionErr } from "../../../errors/errors.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { runningPowerups } from "../../../services/alliance/powerups.js";
import { AlliancePowerupType } from "../../../enums/Alliance.js";
import { recordTakeover } from "../../../services/alliance/allianceOutposts.js";
import { User } from "../../../database/models/user.model.js";
import { postgres, redis } from "../../../server.js";
import { invalidateWorldsCache } from "../../../services/maproom/knownWorlds.js";
import { WorldMapCell } from "../../../database/models/worldmapcell.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import { BaseType } from "../../../enums/Base.js";
import { MapRoomCell, MapRoomVersion } from "../../../enums/MapRoom.js";
import {
  Operation,
  updateResources,
} from "../../../services/base/updateResources.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { validateRange } from "../../../services/maproom/v2/validateRange.js";
import { tribeForCell } from "../../../services/maproom/v2/tribeForCell.js";
import { TakeoverCellSchema } from "../../../schemas/TakeoverCellSchema.js";
import { takeoverCellErr, takeoverRefusedErr, shinyLockedErr, notEnoughShinyErr } from "../../../errors/errors.js";
import { isShinyLocked } from "../../../services/user/shinyLock.js";
import { questBump } from "../../../services/quests/questProgress.js";
import { questCellTaken } from "../../../services/quests/questHooks.js";
import { isUnder, underworldOn } from "../../../services/maproom/v2/underworld.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { kitPriced, prepareKit, standingHallFort, writeKitInto } from "./applyKit.js";
import { chargeKit, kitPriceTooLow } from "../../../services/maproom/v2/kitPay.js";
import { logger } from "../../../utils/logger.js";
import z from "zod";

/**
 * (QoL #330, 15 October) Take over and build a kit in one request: `kit`, the kit's buildings (as worldmapv2/applykit
 * takes them), and `kitcost`, its price in resources ({r1, r2, r3}, as the game worked it out: the kit window's
 * prices). Both optional; Inferno-only.
 */
const TakeoverKitSchema = z.object({
  kit: z
    .string()
    .transform((value) => JSON.parse(value) as unknown)
    .optional(),
  kitcost: z
    .string()
    .transform((value) => JSON.parse(value) as unknown)
    .optional(),
});

/** (18 October) A player's outpost is taken by its attacker this soon after the attack that destroyed it began. */
const OWN_ATTACK_WINDOW = 2 * 60 * 60;

/** The kit's price as sent: whole, finite, not negative, r1-r3 only (magma is never part of a kit's price). */
const kitPrice = (raw: unknown): Record<"r1" | "r2" | "r3", number> | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const price = { r1: 0, r2: 0, r3: 0 };
  for (const key of ["r1", "r2", "r3"] as const) {
    const value = Number((raw as Record<string, unknown>)[key] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > 2_000_000_000) return null;
    price[key] = Math.floor(value);
  }
  return price;
};

/**
 * (13 November, the user's: "Fit the curve to be ~2.5million for the first kit (minimum), ~5million 2nd, ~15million
 * 3rd, ~75million 4th, ~160million 5th, and ~600million for last kit (maximum), still based on the outpost value") a
 * player's outpost's takeover price: ln(price) = a·L³ + b·L² + c·L + d with L = ln(its empire value), rounded to
 * 250,000, between 2.5M and 600M; before half next to home, Conquest and the Depths. The game's is the same
 * (maproom_advanced/PopupTakeover.ioPlayerTakeoverPrice).
 */
export const PLAYER_TAKEOVER_CURVE = [0.016509073609409373, -0.6969864885013182, 10.776853179826519, -44.18606716220013] as const;
export const ioPlayerTakeoverPrice = (value: number) => {
  if (!(value > 0)) return 2_500_000;
  const [a, b, c, d] = PLAYER_TAKEOVER_CURVE;
  const l = Math.log(value);
  return Math.min(Math.max(Math.round(Math.exp(((a * l + b) * l + c) * l + d) / 250000) * 250000, 2_500_000), 600_000_000);
};

/**
 * Controller to handle the takeover of a cell on the world map via shiny or resources.
 *
 * Retrieve the cell that is being taken over, by querying it with the baseid from the client.
 * To transfer ownership, update properties on the user, user's save, the cell and the associated cell save.
 * The previous owner's outposts are updated to reflect the takeover.
 *
 * @param {Context} ctx - The Koa context object.
 * @throws Will throw an error if the base or base type is invalid.
 */
export const takeoverCell: KoaController = async (ctx) =>
  // (18 October) one map move at a time per player: takeovers, moves of the main yard (services/maproom/v2/moveGuard.ts)
  withMoveLock(ctx.authUser.userid, (message) => takeoverRefusedErr(message), () => takeoverCellLocked(ctx), "Your last takeover or move is still going through. Please wait a moment.");

const takeoverCellLocked: KoaController = async (ctx) => {
  const { baseid, resources, shiny } = TakeoverCellSchema.parse(ctx.request.body);

  const currentUser: User = ctx.authUser;
  const shinyLocked = isShinyLocked(currentUser);

  // (QoL #330) a kit built straight after, in the same request (checked before anything is changed)
  const kitRequest: { kit?: unknown; kitcost?: unknown } = infernoOnlyConfig.enabled ? TakeoverKitSchema.parse(ctx.request.body ?? {}) : {};
  const kitWanted = kitRequest.kit !== undefined && kitRequest.kit !== null;
  const kitCost = kitWanted ? kitPrice(kitRequest.kitcost) : null;
  if (kitWanted && (!kitCost || !(await checkPrice(currentUser, "takeoverkit", kitCost)))) throw permissionErr();

  if (shiny && shinyLocked) throw shinyLockedErr();
  // (Inferno-only: a negative price would add resources: services/anticheat)
  if (!(await checkPrice(currentUser, "takeovercell", resources, shiny))) throw permissionErr();
  // (13 October) something is paid: with Shiny, at least the price set for it (prices.takeoverOutpost); with
  // resources, some of each. Both were optional and taken as sent, so a takeover with neither was free. (The
  // resource price, worked out by the game from the yard, is not checked yet.)
  // (26 October, the user's: "Make sure that every alliance power up ... actually works") the alliance's Conquest
  // running: a quarter off the Shiny price too, as the game asks (PopupTakeover.ioShinyPrice); it was only off the
  // resources, so a takeover for the Shiny the game asked was refused
  const conquest =
    infernoOnlyConfig.enabled && Number(shiny) > 0 && currentUser.alliance_id
      ? (await runningPowerups(currentUser.alliance_id)).some((p) => p.id === AlliancePowerupType.CONQUEST)
      : false;
  const shinyBase = conquest
    ? Math.ceil(Number(infernoOnlyConfig.prices?.takeoverOutpost ?? 0) * 0.75)
    : Number(infernoOnlyConfig.prices?.takeoverOutpost ?? 0);
  {
    const shinyPrice = shinyBase;
    const paysShiny = Number(shiny) > 0;
    const res = (resources ?? {}) as Record<string, unknown>;
    const paysResources = ["r1", "r2", "r3", "r4"].every((k) => Number(res[k]) > 0);
    if (infernoOnlyConfig.enabled && !(paysShiny ? Number(shiny) >= shinyPrice : paysResources)) throw permissionErr();
  }

  await postgres.em.populate(currentUser, ["save"]);

  const userSave = currentUser.save!;
  trackTotals(userSave); // (18 October: its price written as a change on what the database holds: freshTotals.ts)

  // (16 October, bug report #96) a wild monster yard loaded twice at the same moment was made twice, with two map
  // cells (base/load now makes it once: services/maproom/yardLock.ts). Of such copies, the one attacked: the most
  // damaged (then the oldest); one cell was taken at random, often the untouched copy, and the takeover refused.
  const cells = await postgres.em.find(
    WorldMapCell,
    { baseid, world: userSave.worldid },
    { populate: ["save", "world"], orderBy: { cellid: "asc" } }
  );
  const cell = cells
    .filter((c) => c.save)
    .sort((a, b) => (Number(b.save!.damage) || 0) - (Number(a.save!.damage) || 0))[0] ?? cells[0] ?? null;
  if (cells.length > 1) logger.warn(`Takeover: ${cells.length} map cells for ${baseid} (made twice); the most damaged one taken, the others removed`);

  if (!cell || !cell.save || cell.save.type === BaseType.MAIN) {
    throw new Error(`Invalid base or base type. Base ID: ${baseid}`);
  }

  const cellSave = cell.save;

  // (21 October, bug report #96: a second "Use resources" on a yard just taken was told it wasn't destroyed enough,
  // 0%: a yard taken over is repaired. That it is already yours is said first.)
  if (infernoOnlyConfig.enabled && Number(cellSave.saveuserid) === currentUser.userid) throw takeoverRefusedErr("This yard is already yours.");

  // (16 October, bug report #96) said as it is, and the game reads the yard again (`refresh`): the 500 "failed
  // unexpectedly" said nothing (Inferno-only; production keeps its error)
  if (cellSave.damage < 90) {
    if (infernoOnlyConfig.enabled) throw takeoverRefusedErr(`This yard isn't destroyed enough to take over yet (${Math.floor(Number(cellSave.damage) || 0)}% of the 90% needed).`, Status.BAD_REQUEST);
    throw takeoverCellErr();
  }
  // Inferno-only (14 October, QoL #424): a second click on "Use resources" sent a second takeover, which took
  // the price again (the cell stays at 90%+ damage and nothing refused a cell already yours). Refused now, and
  // a takeover of the same cell is held for 15 s so two requests at once can't both go through.
  if (infernoOnlyConfig.enabled) {
    if (Number(cellSave.saveuserid) === currentUser.userid) throw takeoverRefusedErr("This yard is already yours.");
    // (18 October, SUSPECTED-BUGS.md) not while it is being attacked: the attack's next saves would write into the
    // new owner's outpost
    if (isAttackActive(cellSave)) throw takeoverRefusedErr("This yard is being attacked right now. Try again once the attack is over.");
    // (18 October) a player's outpost is taken by the player whose attack destroyed it. Its protection was ignored,
    // so a freshly taken outpost (still 90% damaged, under its new 12 hours of protection) could be taken from its
    // new owner at once, without an attack; and one whose protection had run out (the map shows it repaired: 0
    // damage) could still be taken by a hand-made request.
    if (cellSave.type === BaseType.OUTPOST) {
      const now = getCurrentDateTime();
      const last = cellSave.attacks?.at(-1);
      const ownAttack = !!last && last.name === currentUser.username && now - (Number(last.starttime) || 0) <= OWN_ATTACK_WINDOW;
      const shield = Number(cellSave.protected) || 0;
      if (!ownAttack && shield > now) throw takeoverRefusedErr("This yard is protected. It can be taken over straight after an attack of yours destroys it.");
      if (!ownAttack && shield > 0) throw takeoverRefusedErr("This yard has been repaired since it was destroyed. Destroy it in an attack first.");
    }
  }

  // (13 October) paid with resources: not far below the price. The game works it out (maproom_advanced/PopupTakeover)
  // from the yard: a tribe's level, or a player's yard's empire value, then half next to home and a quarter off with
  // the alliance's Conquest power-up; the server took any amount. The least taken is a quarter of the price (the game's
  // least is 0.375 of it; the quarter leaves room for a yard grown since the map was read).
  const depthsFactor = underworldOn() && isUnder(cell.x, cell.y) ? Math.max(1, Number(underworldConfig.takeoverCostMultiplier) || 1) : 1;
  if (infernoOnlyConfig.enabled && !(Number(shiny) > 0)) {
    // (a tribe's level as the map shows it: services/maproom/v2/tribeForCell, not its save's)
    const tribe = cellSave.type === BaseType.TRIBE;
    const value = Number(cellSave.empirevalue) || 0;
    const price = tribe
      ? Math.max(Math.round((Number(tribeForCell(userSave.worldid, cell.x, cell.y).level || 0) * 562500 - 14750000) / 250000) * 250000, 1000000)
      : // (13 November, the user's: fitted to the six ready-made kits' outposts, 2.5M to 600M; ioPlayerTakeoverPrice)
        ioPlayerTakeoverPrice(value);
    // (18 October, SUSPECTED-BUGS.md: the Depths of Hell ask twice the price; the least was a quarter of the plain one)
    const least = Math.floor(price * 0.25 * depthsFactor);
    const res = (resources ?? {}) as Record<string, unknown>;
    if (["r1", "r2", "r3", "r4"].some((k) => !(Number(res[k]) >= least))) throw permissionErr();
  }
  // (18 October) and with Shiny, the Depths' price too
  if (infernoOnlyConfig.enabled && Number(shiny) > 0 && depthsFactor > 1) {
    if (Number(shiny) < shinyBase * depthsFactor) throw permissionErr();
  }

  const mapversion: MapRoomVersion = cell.map_version;

  // (QoL #330: the kit's buildings checked now, before anything is changed; an underworld outpost gets no Flinger)
  const kitPrepared = kitWanted ? prepareKit(kitRequest.kit, isUnder(cell.x, cell.y)) : null;
  // (18 October) and its price: no lower than its buildings are worth (it was taken as sent: 0 was accepted)
  const kitPay = kitPrepared && kitCost ? { r: [kitCost.r1, kitCost.r2, kitCost.r3] as [number, number, number], s: 0, n: `takeover-${baseid}-${Date.now()}`, o: 1 } : null;
  if (kitPay && kitPrepared) {
    const low = kitPriceTooLow(kitPay, kitPriced(kitPrepared, standingHallFort(cellSave)));
    if (low) {
      logger.warn(`Takeover kit refused for player #${currentUser.userid} (${currentUser.username}): ${low}`);
      throw permissionErr();
    }
  }

  await validateRange(currentUser, userSave, mapversion, { attackCell: cell });

  // (QoL #424: once everything is checked, the cell is held for 15 s: a second request at the same moment is refused)
  if (infernoOnlyConfig.enabled) {
    const held = await redis.send("SET", [`io:takeover:${baseid}`, String(currentUser.userid), "NX", "EX", "15"]).catch(() => "OK");
    if (held !== "OK") throw takeoverRefusedErr("This yard is already being taken over. Wait a moment.");
  }

  // Shiny can't go below 0 (the database refuses it, which failed the whole request with a 500).
  if (shiny) {
    if (!(shiny > 0) || (userSave.credits ?? 0) < shiny) throw notEnoughShinyErr();
    userSave.credits -= shiny;
  }
  if (resources) {
    // (18 October, SUSPECTED-BUGS.md: taken without a look at what the player has: balances went below 0)
    if (infernoOnlyConfig.enabled) {
      const have = (userSave.resources ?? {}) as Record<string, unknown>;
      const price = resources as Record<string, unknown>;
      if (["r1", "r2", "r3", "r4"].some((k) => (Number(price[k]) || 0) > (Number(have[k]) || 0)))
        throw takeoverRefusedErr("You don't have the resources for this takeover.");
    }
    userSave.resources = updateResources(
      resources,
      userSave.resources ?? {},
      Operation.SUBTRACT
    );
  }

  // Inferno-only alliance outpost history: who it was taken from (before the save changes hands)
  const wasTribe = cellSave.type === BaseType.TRIBE;
  // (the quest book: the tribe yard's level, and whose it was, before it changes hands)
  const takenFrom = { tribe: wasTribe, level: Number(cellSave.level) || 0, owner: Number(cellSave.userid) || 0 };

  // Clean up previous owner's save if the cell was player-owned
  const previousOwner = await postgres.em.findOne(
    User,
    { userid: cellSave.userid },
    { populate: ["save"] }
  );

  if (previousOwner?.save) {
    const { outposts } = previousOwner.save;

    previousOwner.save.outposts = outposts.filter(
      ([x, y, id]) => !(x === cell.x && y === cell.y && id === baseid)
    );

    if (previousOwner.save.buildingresources)
      delete previousOwner.save.buildingresources[`b${baseid}`];

    postgres.em.persist(previousOwner);
  }

  // Update save
  const currentTime = getCurrentDateTime();
  const twelveHours = 12 * 60 * 60;

  // Transfer ownership of the save
  cellSave.saveuserid = currentUser.userid;
  cellSave.userid = userSave.userid;
  cellSave.homebaseid = userSave.homebaseid;
  cellSave.mapversion = mapversion;
  cellSave.name = userSave.name;
  cellSave.worldid = userSave.worldid;
  cellSave.createtime = currentTime;
  cellSave.protected = currentTime + twelveHours;
  // (18 October) the new owner's: no attack running on it, and not "destroyed" on the map until it is attacked
  // again (the owner's next save says how damaged it is)
  if (infernoOnlyConfig.enabled) {
    cellSave.attackid = 0;
    cellSave.damage = 0;
    cellSave.destroyed = 0;
  }
  cellSave.attacks = [];
  cellSave.resources = {};
  cellSave.tutorialstage = 205;
  cellSave.monsters = {};
    
  cellSave.takeoverDate = new Date();

  if (cellSave.type === BaseType.TRIBE) {
    cellSave.type = BaseType.OUTPOST;
    cellSave.buildingdata = {};
    cellSave.wmid = 0;
  }

  // Update cell
  cell.uid = currentUser.userid;
  cell.base_type = MapRoomCell.OUTPOST;

  // Update user
  userSave.outposts.push([cell.x, cell.y, baseid]);

  // (QoL #330, 15 October) the kit chosen in the takeover popup, built now: paid with resources (its price as the
  // kit window gives it, as applykit's payment is), written into the yard as worldmapv2/applykit writes it
  let kitBuildings = 0;
  if (kitPrepared && kitPay) {
    // (18 October: charged by kitPay, which refuses a kit the player can't pay for; it went below zero)
    await chargeKit(currentUser, userSave, kitPay, kitPriced(kitPrepared, standingHallFort(cellSave)), true, `takeover:${cell.x},${cell.y}`);
    kitBuildings = writeKitInto(cellSave, userSave, kitPrepared);
    // (13 November) the Devil's Contract's Kitbinder: a kit built while its price runs: no 12 hours' protection
    if ((await devilEffects(currentUser.userid)).kitNoProtection) cellSave.protected = 0;
  }

  const isOriginCell = cell.x === 0 && cell.y === 0;
  if (isOriginCell) cell.world.name = `${currentUser.username} Server`;

  // (18 October, SUSPECTED-BUGS.md) the other copies of a yard made twice go with it: they stayed, sharing the
  // outpost's id, so its owner could open the tribe copy (a permission error) and the map could show the tribe
  if (infernoOnlyConfig.enabled) {
    for (const other of cells) {
      if (other === cell) continue;
      if (other.save && other.save !== cellSave && other.save.type === BaseType.TRIBE) postgres.em.remove(other.save);
      postgres.em.remove(other);
    }
  }

  postgres.em.persist([cellSave, currentUser]);
  await flushWithFreshTotals(postgres.em, [userSave]);

  if (kitBuildings > 0) {
    logger.info(`Kit applied with the takeover of outpost ${baseid} by user ${currentUser.userid}: ${kitBuildings} buildings.`);
    void questBump(currentUser.userid, "kit_built");
  }

  if (isOriginCell) await invalidateWorldsCache();

  await recordTakeover({
    worldId: String(userSave.worldid ?? cell.world?.uuid ?? ""),
    x: cell.x,
    y: cell.y,
    baseid: String(baseid),
    taker: currentUser,
    previous: !wasTribe && previousOwner && previousOwner.userid !== currentUser.userid ? previousOwner : null,
  });

  // Inferno-only quest book: an outpost taken (from a player, or a tribe)
  void questBump(currentUser.userid, "captures");
  if (!wasTribe && previousOwner && previousOwner.userid !== currentUser.userid) void questBump(currentUser.userid, "captures_player");
  void questCellTaken(currentUser.userid, { x: cell.x, y: cell.y }, takenFrom, underworldOn() && isUnder(cell.x, cell.y));

  ctx.status = Status.OK;
  // (QoL #330: how many buildings the kit gave it, when one was built)
  ctx.body = { error: 0, ...(kitBuildings > 0 && { kit: kitBuildings }) };
};
