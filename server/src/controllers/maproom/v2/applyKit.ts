import { devilEffects } from "../../../services/devil/devilContract.js";
import { flushWithFreshTotals, trackTotals } from "../../../services/base/freshTotals.js";
import z from "zod";

import { isUnder } from "../../../services/maproom/v2/underworld.js";
import { Save } from "../../../database/models/save.model.js";
import type { User } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { Status } from "../../../enums/StatusCodes.js";
import { baseUnderAttackErr, permissionErr } from "../../../errors/errors.js";
import { postgres } from "../../../server.js";
import { isAttackActive } from "../../../services/base/isAttackActive.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { logger } from "../../../utils/logger.js";
import { questBump } from "../../../services/quests/questProgress.js";
import { buildingProps } from "../../../services/anticheat/saveChecks.js";
import { chargeKit, parseKitPay } from "../../../services/maproom/v2/kitPay.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";

/**
 * Outpost kits, applied by the server
 * ====================================================================
 * Using a kit replaces an outpost. Doing that on the client alone leaves room for leftovers:
 * anything the running game still holds can be written back by its next save. So the server
 * does it instead:
 *
 *   1. the client lets its last save finish,
 *   2. it stops saving and calls this endpoint with the kit's buildings and price (`pay`: the server charges it,
 *      services/maproom/v2/kitPay.ts; until 18 October the client paid in its own save, so it could skip paying),
 *   3. the outpost save is wiped back to what a freshly taken-over outpost looks like and the
 *      kit is written into it,
 *   4. the client loads the outpost again from that save.
 *
 * Nothing from the old yard survives: buildings, damage, housed monsters, hatchery queues,
 * per-building loot state, stored decorations, siege and effect data are all reset here.
 * ====================================================================
 */

/** The Flinger (BUILDING5). */
const FLINGER = 5;

const OUTPOST_HALL = 112;
const MAX_BUILDINGS = 600;

/** Main-yard-only buildings never belong in an outpost. */
const FORBIDDEN_TYPES = new Set([11, 12, 14, 51]);

/** The kinds of building whose level goes no higher than their table's last level (as services/anticheat/saveChecks). */
const KIT_LEVELLED = new Set(["resource", "special", "tower", "wall", "trap"]);

const ApplyKitSchema = z.object({
  baseid: z.string(),
  buildings: z.string().transform((value) => JSON.parse(value) as unknown),
  pay: z.string().optional(),
});

const toInt = (value: unknown) => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);

/** (QoL #330) A kit's buildings checked and made ready, before anything is changed (KitEntry: what the outpost gets). */
export interface KitEntry {
  /** The kit's hall: where it goes, and (13 November) how far it is calcified (the hall standing keeps more, if it has more). */
  hall: { X: number; Y: number; fort?: number } | null;
  buildings: Record<string, number>[];
}

/** How far the outpost's own hall is calcified (0 when it has none). */
export const standingHallFort = (outpost: Save | null | undefined) => {
  const hall = Object.values((outpost?.buildingdata ?? {}) as Record<string, Record<string, unknown>>).find((b) => toInt(b?.t) === OUTPOST_HALL);
  return Math.min(4, Math.max(0, toInt(hall?.fort) ?? 0));
};

/**
 * (13 November) what a kit is priced for: its buildings and, when the kit's hall is calcified further than the hall
 * standing, those levels of the hall's calcification (an entry { t: 112, fort, fortFrom }: kitPay.kitWorth counts
 * fortFrom to fort, and no building costs for the hall, which is standing already).
 */
export const kitPriced = (prepared: KitEntry, standingFort: number): Record<string, number>[] => {
  const fort = Math.max(0, prepared.hall?.fort ?? 0);
  return fort > standingFort ? [...prepared.buildings, { t: OUTPOST_HALL, fort, fortFrom: standingFort }] : prepared.buildings;
};

/**
 * The kit's buildings, checked: refused (thrown) when malformed, before any save is touched. Main-yard-only
 * buildings are left out, and an underworld outpost's Flinger.
 * (QoL #330, 15 October: taken out of applyKit, so a takeover can build a kit in the same request.)
 */
export const prepareKit = (buildings: unknown, underworld: boolean): KitEntry => {
  if (!buildings || typeof buildings !== "object" || Array.isArray(buildings)) throw new Error("applyKit: buildings must be an object.");

  const entries = Object.values(buildings as Record<string, Record<string, unknown>>);
  if (entries.length === 0 || entries.length > MAX_BUILDINGS) throw new Error(`applyKit: ${entries.length} buildings.`);

  const prepared: KitEntry = { hall: null, buildings: [] };
  // (18 October, SUSPECTED-BUGS.md: any buildings at any level were written as sent: 600 towers at level 50 on an
  // outpost. Now as the outposts' own building table allows: kinds an outpost can have, no more of each than it can
  // have, no higher than their last level. What doesn't fit is left out, as main-yard buildings always were.)
  const table = buildingProps()?.outpost ?? null;
  const counted: Record<string, number> = {};
  for (const building of entries) {
    const type = toInt(building?.t);
    const x = toInt(building?.X);
    const y = toInt(building?.Y);

    if (type === null || type <= 0 || x === null || y === null) throw new Error("applyKit: malformed building.");
    if (FORBIDDEN_TYPES.has(type)) continue;
    // Inferno-only: an underworld outpost has no Flinger (services/maproom/v2/underworld.ts): a kit's is left out.
    if (underworld && type === FLINGER) continue;

    if (type === OUTPOST_HALL) {
      prepared.hall = { X: x, Y: y };
      // (13 November) and how far the kit's hall is calcified: the user's "saved kits are not saving with the calcification"
      const hallFort = toInt(building.fort);
      const hallMost = Math.max(0, Number(table?.[String(OUTPOST_HALL)]?.fortify) || 0);
      if (hallFort !== null && hallFort >= 1 && hallMost > 0) prepared.hall.fort = Math.min(hallFort, hallMost);
      continue;
    }

    let most = 50;
    let mostFort = 0;
    if (table) {
      const row = table[String(type)];
      const allowed = row && Array.isArray(row.quantity) ? Math.max(0, ...row.quantity.map((n) => Number(n) || 0)) : 0;
      if (!row || allowed <= 0) continue;
      counted[type] = (counted[type] ?? 0) + 1;
      if (counted[type] > allowed) continue;
      if (row.levels > 0 && KIT_LEVELLED.has(row.type)) most = Math.min(most, row.levels);
      mostFort = Math.max(0, Number(row.fortify) || 0);
    }

    const entry: Record<string, number> = { t: type, X: x, Y: y };
    const level = toInt(building.l);
    const prefab = toInt(building.prefab);

    // Finished at its kit level (the Inferno's client sends every kit so, bought with resources or with shiny).
    // A building sent with only `prefab` is left for the client to build up, as the stock game did with resources.
    if (level !== null && level >= 1) entry.l = Math.min(level, most);
    else entry.prefab = Math.min(Math.max(1, prefab ?? 1), most);
    // (12 November) calcified as the kit has it, where an outpost's building of that kind can be; a kit dropped it
    // until then. It is in the kit's price (kitPay.kitWorth).
    const fort = toInt(building.fort);
    if (fort !== null && fort >= 1 && mostFort > 0) entry.fort = Math.min(fort, mostFort);

    prepared.buildings.push(entry);
  }
  return prepared;
};

/**
 * Writes a prepared kit into an outpost's save: back to a freshly taken-over outpost, then the kit (the hall
 * standing keeps its level). The owner's auto-bank line for it goes too. Returns how many buildings it now has.
 * The caller persists and flushes.
 */
export const writeKitInto = (outpost: Save, userSave: Save, prepared: KitEntry): number => {
  // Keep the hall that is standing (its level belongs to the outpost, not to the kit); take only its position from the kit.
  const standingHall = Object.values((outpost.buildingdata ?? {}) as Record<string, Record<string, unknown>>).find(
    (building) => toInt(building?.t) === OUTPOST_HALL,
  );

  const kit: Record<string, Record<string, number>> = {};
  const hallLevel = Math.max(1, toInt(standingHall?.l) ?? 1);
  // (12 November: and its calcification, which a kit used to take off it; 13 November: or the kit's, when the kit's
  // hall is calcified further, as it was paid for: kitPriced)
  const hallFort = Math.max(standingHallFort(outpost), Math.min(4, Math.max(0, prepared.hall?.fort ?? 0)));
  kit["0"] = prepared.hall
    ? { t: OUTPOST_HALL, X: prepared.hall.X, Y: prepared.hall.Y, id: 0, l: hallLevel }
    : { t: OUTPOST_HALL, X: toInt(standingHall?.X) ?? -65, Y: toInt(standingHall?.Y) ?? -65, id: 0, l: hallLevel };
  if (hallFort > 0) kit["0"].fort = hallFort;

  let nextId = 1;
  for (const building of prepared.buildings) {
    kit[String(nextId)] = { ...building, id: nextId };
    nextId++;
  }

  // Back to a freshly taken-over outpost, then the kit.
  outpost.buildingdata = kit as unknown as Save["buildingdata"];
  outpost.buildinghealthdata = {};
  outpost.buildingkeydata = {};
  outpost.buildingresources = {};
  outpost.researchdata = {};
  outpost.aiattacks = {};
  // Inferno-only (14 October, QoL #276): the housed monsters stay (they were deleted with the buildings). The
  // game culls on its next load any that the kit's Compounds can't hold, as it does for any yard over capacity.
  const housed = (outpost.monsters as Record<string, unknown> | null)?.housed;
  outpost.monsters = (housed && typeof housed === "object" ? { housed } : {}) as Save["monsters"];
  outpost.mushrooms = {};
  outpost.inventory = {};
  outpost.siege = {};
  outpost.loot = {};
  outpost.champion = [];
  outpost.effects = [];
  outpost.damage = 0;
  outpost.destroyed = 0;
  outpost.locked = 0;

  // The owner's main yard mirrors each outpost's harvesters for auto-banking; the next outpost save rebuilds it.
  if (userSave.buildingresources) delete userSave.buildingresources[`b${outpost.baseid}`];

  return Object.keys(kit).length;
};

export const applyKit: KoaController = async (ctx) => {
  const { baseid, buildings, pay: payRaw } = ApplyKitSchema.parse(ctx.request.body);
  const user: User = ctx.authUser;

  await postgres.em.populate(user, ["save"]);
  const userSave = user.save!;
  trackTotals(userSave); // (18 October: the kit's price written as a change on what the database holds: freshTotals.ts)

  const outpost = await postgres.em.findOne(Save, { baseid, type: BaseType.OUTPOST, saveuserid: user.userid });
  if (!outpost) throw permissionErr();
  if (isAttackActive(outpost)) throw baseUnderAttackErr();

  // Inferno-only: an underworld outpost has no Flinger (services/maproom/v2/underworld.ts): a kit's is left out.
  const underworld = (userSave.outposts ?? []).some(([x, y, id]) => String(id) === String(baseid) && isUnder(Number(x), Number(y)));

  const prepared = prepareKit(buildings, underworld);
  // (18 October) the kit is paid here, by the server: its price checked against what its buildings are worth
  let paid: Awaited<ReturnType<typeof chargeKit>> | null = null;
  if (infernoOnlyConfig.enabled) {
    const pay = parseKitPay(payRaw);
    if (!pay) throw new ClientSafeError({ message: "The game has been updated: reload it, then build the kit again.", status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
    paid = await chargeKit(user, userSave, pay, kitPriced(prepared, standingHallFort(outpost)), pay.o === 1, `outpost:${baseid}`);
  }
  const count = writeKitInto(outpost, userSave, prepared);
  // (13 November) the Devil's Contract's Kitbinder: a kit built while its price runs leaves the outpost unprotected
  if ((await devilEffects(user.userid)).kitNoProtection) outpost.protected = 0;

  postgres.em.persist([outpost, userSave]);
  try {
    await flushWithFreshTotals(postgres.em, [userSave]);
  } catch (e) {
    await paid?.done(false);
    throw e;
  }
  if (paid && (paid.charged.r1 || paid.charged.r2 || paid.charged.r3 || paid.charged.shiny))
    logger.info(`Kit paid for outpost ${baseid} by user ${user.userid}: ${JSON.stringify(paid.charged)}`);

  logger.info(`Kit applied to outpost ${baseid} of user ${user.userid}: ${count} buildings.`);

  void questBump(user.userid, "kit_built");

  ctx.status = Status.OK;
  ctx.body = { error: 0, buildings: count, ...(paid && { paid: paid.charged, credits: userSave.credits, resources: userSave.resources }) };
};
