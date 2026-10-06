import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { buyPet, listPets, namePet, petsEnabled, petsForGame, petsInfo, placePet, PetError } from "../../services/pets/pets.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: the Pets tab's requests (services/pets/pets.ts). Answers { error: 0, pets: [[id, monster, out]],
 * price, maxOut, monsters, credits? } or { error: "message" } (status 200: the game shows the message).
 */

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) }) as Record<string, unknown>;

const answer = async (ctx: Parameters<KoaController>[0], work: () => Promise<Record<string, unknown>>) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!petsEnabled()) {
    ctx.body = { error: "Pets aren't here." };
    return;
  }
  try {
    const user: User = ctx.authUser;
    ctx.body = { error: 0, ...(await petsInfo(user.userid)), ...(await work()) };
  } catch (e) {
    if (e instanceof PetError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Pets: ${e}`);
    ctx.body = { error: "Something went wrong with your pets. Try again." };
  }
};

/** pets/list: the player's pets. */
export const petsList: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await answer(ctx, async () => ({ pets: petsForGame(await listPets(user.userid)) }));
};

/** pets/buy (monster): one more pet, for Shiny. */
export const petsBuy: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const monster = String(params(ctx).monster ?? "").slice(0, 16);
  await answer(ctx, async () => {
    const r = await buyPet(user, monster);
    return { pets: petsForGame(r.pets), credits: r.credits, bought: r.pet.id };
  });
};

/** pets/place (id, out 0/1): a pet brought out into the yard, or put in storage. */
export const petsPlace: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  const id = Math.floor(Number(p.id) || 0);
  const out = String(p.out) === "1" || p.out === true;
  await answer(ctx, async () => ({ pets: petsForGame(await placePet(user, id, out)) }));
};

/** pets/name (id, name): a pet named, or its name taken away (an empty name). */
export const petsName: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  const id = Math.floor(Number(p.id) || 0);
  await answer(ctx, async () => ({ pets: petsForGame(await namePet(user, id, p.name)) }));
};
