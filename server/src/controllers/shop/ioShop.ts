import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { listPets, petsEnabled, petsForGame } from "../../services/pets/pets.js";
import {
  buyShopItem,
  giftTargets,
  setStatueChampion,
  shopEnabled,
  shopOf,
  shopView,
  ShopError,
  useCoat,
  useGuard,
  useHop,
  useTag,
  scoutReport,
} from "../../services/shop/ioShop.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (22 October): the Store's Extras (services/shop/ioShop.ts). Every answer is { error: 0, shop, ... } or
 * { error: "message" } (status 200: the game shows the message). `credits` is the balance after a purchase.
 */

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) }) as Record<string, unknown>;

const int = (v: unknown) => Math.floor(Number(v) || 0);

const answer = async (ctx: Parameters<KoaController>[0], work: (user: User) => Promise<Record<string, unknown>>) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!shopEnabled()) {
    ctx.body = { error: "That isn't sold here." };
    return;
  }
  try {
    const user: User = ctx.authUser;
    const out = await work(user);
    if (out.credits === null) delete out.credits;
    ctx.body = { error: 0, ...out };
  } catch (e) {
    if (e instanceof ShopError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Shop: ${e}`);
    ctx.body = { error: "Something went wrong in the shop. Try again." };
  }
};

/** The pets after a Golden Coat or a Name Tag (the game redraws them). */
const pets = async (user: User) => (petsEnabled() ? { pets: petsForGame(await listPets(user.userid)) } : {});

/** shop/info: the player's Extras, and who they can gift-wrap for. */
export const shopInfo: KoaController = async (ctx) => {
  await answer(ctx, async (user) => ({ shop: shopView(await shopOf(user.userid)), alliance: user.alliance_id ? 1 : 0, members: await giftTargets(user) }));
};

/** shop/buy (item, for: an alliance member's id for Gift Wrap). */
export const shopBuy: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await buyShopItem(user, String(p.item ?? ""), int(p.for))) }));
};

/** shop/coat (pet): a Golden Coat on a pet. */
export const shopCoat: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await useCoat(user, int(p.pet))), ...(await pets(user)) }));
};

/** shop/tag (pet, colour): a Name Tag on a named pet (a new colour is free). */
export const shopTag: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await useTag(user, int(p.pet), p.colour)), ...(await pets(user)) }));
};

/** shop/guard (baseid): an Outpost Guard on one of the player's outposts. */
export const shopGuard: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await useGuard(user, p.baseid)) }));
};

/** shop/hop (baseid): Short Hop, the main yard and one of the player's outposts nearby changing places. */
export const shopHop: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await useHop(user, int(p.baseid))) }));
};

/** shop/statue (champion, level?): the champion the player's Champion Statues show, and at which level (4-6). */
export const shopStatue: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, async (user) => ({ ...(await setStatueChampion(user, p.champion, p.level)) }));
};

/** (22 October, the user's pick #50) POST /shop/scout { baseid }: a Scout Report of a player's yard. */
export const shopScout: KoaController = async (ctx) => {
  const p = params(ctx);
  await answer(ctx, (user) => scoutReport(user, p.baseid));
};
