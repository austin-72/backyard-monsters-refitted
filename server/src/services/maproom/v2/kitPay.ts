import { createHash } from "node:crypto";
import type { Save } from "../../../database/models/save.model.js";
import type { User } from "../../../database/models/user.model.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { Status } from "../../../enums/StatusCodes.js";
import { redis } from "../../../server.js";
import { logger } from "../../../utils/logger.js";
import { buildingProps } from "../../anticheat/saveChecks.js";
import { isTestMode } from "../../admin/testMode.js";

/**
 * Kits paid on the server (18 October, SUSPECTED-BUGS.md: "Kits: any buildings at any level, at the price the game
 * names"). The game paid for a kit in its own save and then asked the server to build it, so a kit could be built
 * without paying at all, and a takeover's kit cost whatever the request said.
 *
 * Now the kit's price comes with the build request and the server charges it:
 *  - `pay` = {r: [bone, coal, sulfur], s: shiny, n: a name for this payment}. With resources (r), whatever the
 *    player is short of is made up with Shiny by the game's own formula, at most `s` (what the player agreed to);
 *    with r all 0, `s` is a Shiny buy-out.
 *  - The price may not be lower than the kit's buildings are worth: what they cost to build up to their levels
 *    (the outposts' own table), times KIT_FLOOR_SHARE for resources and KIT_SHINY_FLOOR_SHARE of the game's Shiny
 *    formula for a buy-out. The stock kits' prices are above that (checked when the shares were set): a forged
 *    kit can no longer be had for nothing.
 *  - `n` makes a payment once only: a build sent again (a lost answer, "Try again") is not charged again.
 */

/**
 * The lowest share of the buildings' own build costs a kit may be priced at. The stock kits are priced at 1.2 to 2.3
 * times their buildings' costs, kits without a price at 1, player kits at 2 or more (checked 18 October; since
 * 12 November the stock kits are priced by the game at twice their buildings' costs, a whole million down); the
 * rest is room for the game's kit conversion (InfernoKits.convert), which can count a few buildings differently.
 */
export const KIT_FLOOR_SHARE = 0.75;
/**
 * The lowest share of the game's Shiny buy-out formula (buyOutShiny) a kit's Shiny price may be. The stock kits'
 * Shiny prices (InfernoOnlyConfig.prices.kits: 50 to 1,000) are 0.034 to 0.073 of it; kits without one are 1.
 */
export const KIT_SHINY_FLOOR_SHARE = 0.02;

const PAID_FOR = 2 * 86_400;

export interface KitPay {
  r: [number, number, number];
  s: number;
  n: string;
  /** 1: resources only (player kits, several outposts at once): no Shiny for a shortfall. */
  o: number;
}

const whole = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 4e9 ? Math.floor(n) : null;
};

/** The payment as sent, or null when it isn't one (refused). */
export const parseKitPay = (raw: unknown): KitPay | null => {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const r = Array.isArray(o.r) && o.r.length === 3 ? o.r.map(whole) : null;
  const s = whole(o.s ?? 0);
  const n = typeof o.n === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(o.n) ? o.n : null;
  if (!r || r.some((x) => x === null) || s === null || !n) return null;
  return { r: r as [number, number, number], s, n, o: Number(o.o) === 1 ? 1 : 0 };
};

/** The game's Shiny buy-out for buildings worth `total` (InfernoKits.customCosts, the stock formula). */
export const buyOutShiny = (total: number) => Math.max(1, Math.ceil(Math.sqrt(total / 2) * 0.75));

/** The game's Shiny for a resource shortfall (popup_prefab.Select, PayForKit). */
export const shinyFor = (short: number) => (short > 0 ? Math.ceil(Math.pow(Math.sqrt(short / 2), 0.75)) : 0);

/**
 * What the kit's buildings cost to build up to their levels, and (12 November) to calcify up to their `fort`:
 * [r1, r2, r3] (the hall is standing already: only its calcification from `fortFrom`, applyKit.kitPriced). The game
 * counts the same (InfernoKits.addWorth, addHallFort).
 */
export const kitWorth = (buildings: Record<string, number>[]): [number, number, number] => {
  const table = buildingProps()?.outpost ?? null;
  const total: [number, number, number] = [0, 0, 0];
  if (!table) return total;
  for (const b of buildings) {
    const row = table[String(b.t)] as { costs?: number[][]; fortifyCosts?: number[][] } | undefined;
    const costs = Number(b.t) === 112 ? null : row?.costs;
    if (Array.isArray(costs)) {
      const levels = Math.max(1, Number(b.l ?? b.prefab ?? 1) || 1);
      for (let i = 0; i < levels && i < costs.length; i++) for (let k = 0; k < 3; k++) total[k] += Number(costs[i]?.[k]) || 0;
    }
    const fortCosts = row?.fortifyCosts;
    const fort = Math.max(0, Number(b.fort) || 0);
    const from = Math.max(0, Number(b.fortFrom) || 0);
    if (Array.isArray(fortCosts)) for (let i = from; i < fort && i < fortCosts.length; i++) for (let k = 0; k < 3; k++) total[k] += Number(fortCosts[i]?.[k]) || 0;
  }
  return total;
};

const refuse = (message: string, status = Status.CONFLICT) => new ClientSafeError({ message, status, data: {}, isClientFriendly: true });

/** The kit's price is too low for its buildings: the reason, or null when it is fine. */
export const kitPriceTooLow = (pay: KitPay, buildings: Record<string, number>[]): string | null => {
  const worth = kitWorth(buildings);
  const worthTotal = worth[0] + worth[1] + worth[2];
  if (worthTotal <= 0) return null; // (no cost table: nothing to go by)
  const asked = pay.r[0] + pay.r[1] + pay.r[2];
  if (asked === 0) {
    const least = Math.ceil(buyOutShiny(worthTotal) * KIT_SHINY_FLOOR_SHARE);
    return pay.s >= least ? null : `a buy-out of ${pay.s} Shiny for buildings worth ${worthTotal} (at least ${least})`;
  }
  const least = Math.ceil(worthTotal * KIT_FLOOR_SHARE);
  return asked >= least ? null : `${asked} resources for buildings worth ${worthTotal} (at least ${least})`;
};

/**
 * Charges a kit to the player's main yard save (`userSave`), before the kit is written; the caller flushes both
 * together, and calls `done(false)` if that fails (so a retry can pay). Throws a refusal the player can read when
 * the price is too low or they can't pay. Returns what was charged.
 */
export const chargeKit = async (
  user: User,
  userSave: Save,
  pay: KitPay,
  buildings: Record<string, number>[],
  resourcesOnly: boolean,
  target: string = "",
): Promise<{ charged: { r1: number; r2: number; r3: number; shiny: number }; done: (ok: boolean) => Promise<void> }> => {
  const none = { charged: { r1: 0, r2: 0, r3: 0, shiny: 0 }, done: async () => {} };
  const low = kitPriceTooLow(pay, buildings);
  if (low) {
    logger.warn(`Kit refused for player #${user.userid} (${user.username}): ${low}`);
    throw refuse("That kit's price isn't right. Open the kit window again.", Status.FORBIDDEN);
  }
  if (await isTestMode(user)) return none; // (admin test mode: everything is free, and put back when it ends)

  const key = `kitpay:${user.userid}:${pay.n}`;
  // (22 October: what was paid for kept with the payment's name: the same name sent again for another outpost, or
  // another kit, built it free for 2 days. Only this same build sent again (a lost answer, "Try again") is not charged.)
  const what = `${target}|${createHash("sha1").update(JSON.stringify([buildings, pay.r, pay.s, pay.o ?? 0])).digest("hex")}`;
  if ((await redis.set(key, what, "EX", String(PAID_FOR), "NX").catch(() => "OK")) !== "OK") {
    const had = await redis.get(key).catch(() => null);
    if (had === what || had === null) return none; // (paid already, for this very build)
    logger.warn(`Kit refused for player #${user.userid} (${user.username}): payment "${pay.n}" already used for another build`);
    throw refuse("That kit's payment was for another build. Open the kit window again.", Status.FORBIDDEN);
  }
  const done = async (ok: boolean) => {
    if (!ok) await redis.del(key).catch(() => 0);
  };

  try {
    const res = (userSave.resources ?? {}) as Record<string, number>;
    const credits = Number(userSave.credits) || 0;
    const take = [0, 0, 0];
    let short = 0;
    for (let k = 0; k < 3; k++) {
      const have = Math.max(0, Number(res[`r${k + 1}`]) || 0);
      take[k] = Math.min(have, pay.r[k]);
      short += pay.r[k] - take[k];
    }
    const asked = pay.r[0] + pay.r[1] + pay.r[2];
    const shiny = asked === 0 ? pay.s : shinyFor(short);
    if (asked > 0 && short > 0 && resourcesOnly) throw refuse("You don't have the resources for that kit any more.");
    if (asked > 0 && shiny > pay.s) throw refuse(`You're short of more resources than when you chose the kit: it needs ${shiny} Shiny now. Open the kit window again.`);
    if (shiny > credits) throw refuse("You don't have enough Shiny for that kit.");

    const next = { ...res };
    for (let k = 0; k < 3; k++) next[`r${k + 1}`] = (Number(res[`r${k + 1}`]) || 0) - take[k];
    userSave.resources = next as Save["resources"];
    if (shiny > 0) userSave.credits = credits - shiny;
    return { charged: { r1: take[0], r2: take[1], r3: take[2], shiny }, done };
  } catch (e) {
    await done(false);
    throw e;
  }
};
