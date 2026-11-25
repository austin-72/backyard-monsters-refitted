import type { Context } from "koa";
import { storeItems } from "../../../../game-data/store/storeItems.js";
import { Save } from "../../../../database/models/save.model.js";
import { updateCredits } from "../../../../services/base/updateCredits.js";
import { getCurrentDateTime } from "../../../../utils/getCurrentDateTime.js";
import { isShinyLocked } from "../../../../services/user/shinyLock.js";
import { isShinyGain } from "../../../../game-data/store/purchaseKeys.js";
import { notEnoughShinyErr, shinyLockedErr } from "../../../../errors/errors.js";
import { purchaseKeys } from "../../../../game-data/store/purchaseKeys.js";
import type { JsonObject } from "../../../../types/JsonObject.js";
import { infernoOnlyConfig } from "../../../../config/InfernoOnlyConfig.js";
import { logger } from "../../../../utils/logger.js";

/**
 * Applies a purchase to the save: grants the item, sets any expiry, then settles the cost.
 *
 * @param {Context} ctx - The Koa context object
 * @param {[string, number]} purchaseData - The item key and quantity sent by the client
 * @param {Save} save - The save the purchase applies to
 * @throws {ClientSafeError} If a locked account tries to spend shiny
 */
export const purchaseHandler = (ctx: Context, purchaseData: [string, number], save: Save, shownStore: JsonObject | null = null) => {
  if (!purchaseData) return;

  const [item, sent] = purchaseData;
  const quantity = Number(sent);

  // Inferno-only: every worker is there from the start, so none is for sale (and a sacrificed one stays gone:
  // services/workers/sacrifice.ts)
  if (infernoOnlyConfig.enabled && item === "BEW") return;

  const isGain = isShinyGain(item);
  const shinyLocked = isShinyLocked(ctx.authUser);

  if (shinyLocked && !isGain) throw shinyLockedErr();

  // (13 October) a whole number of at least one, and no more than the Shiny there is: the cost was taken as
  // max(0, credits - cost), so with no Shiny everything in the store was free (protection, instant finishes...), and a
  // part of one (0.2) cost a fifth but gave all of it
  // (not taken, the save still is: as services/anticheat/saveChecks does with a quantity of none or less)
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000_000) return;
  if (!isGain && !shinyLocked) {
    const credits = Number(ctx.authUser?.save?.credits ?? 0);
    // (18 October, SUSPECTED-BUGS.md: checked by the outpost's own store record, which is never written, so always
    // its first price, and charged by the main yard's, floored at 0: the 10th packing level for 50 Shiny) checked by
    // the record it is charged from; bought in an outpost at a price that record no longer has: not taken (the save
    // still is), as a quantity of none is; the main yard shows the real price
    const charged = purchaseCost(item, quantity, save.storedata ?? {});
    if (infernoOnlyConfig.enabled && shownStore && charged !== purchaseCost(item, quantity, shownStore)) {
      logger.warn(`Purchase of ${quantity} ${item} in an outpost by #${ctx.authUser?.userid}: priced ${purchaseCost(item, quantity, shownStore)} there, ${charged} by the main yard's record: not taken`);
      return;
    }
    if (charged > credits) throw notEnoughShinyErr();
  }

  const currentTime = getCurrentDateTime();

  const storeData: JsonObject = save.storedata || {};
  storeData[item] = {
    q: (storeData[item]?.q || 0) + quantity,
  };

  // Determine expiry if the item has a duration
  const storeItem = storeItems[item];
  if ((storeItem?.du ?? 0) > 0) {
    storeData[item].e = currentTime + storeItem.du;
  }

  save.storedata = storeData;

  // Apply damage protection for protection items, stacking onto any existing active protection
  if (item === "PRO1" || item === "PRO2" || item === "PRO3") {
    const baseTime = save.protected > currentTime ? save.protected : currentTime;

    save.protected = baseTime + storeItem.du * quantity;
  }

  updateCredits(ctx, save, item, quantity);
};

/**
 * What a purchase costs in Shiny, as updateCredits takes it (13 October): a key bought by amount (the quantity is the
 * Shiny), or the store item's price, the next one of a scaling price (by how many are owned) times the quantity.
 */
const purchaseCost = (item: string, quantity: number, store: JsonObject): number => {
  if (purchaseKeys.has(item)) return quantity;
  const c = storeItems[item]?.c;
  if (!c || !c.length) return 0;
  // (the price at the step updateCredits charges for: the count once these are added, less one. The count is the one
  // the game priced it from: an outpost's own store record when bought in an outpost, mapSaveData)
  const owned = Number((store as Record<string, { q?: number }>)?.[item]?.q ?? 0) | 0;
  const each = c.length > 1 ? Number(c[Math.min(Math.max(0, owned + quantity - 1), c.length - 1)]) : Number(c[0]);
  return Number.isFinite(each) ? each * quantity : 0;
};
