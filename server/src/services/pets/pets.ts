import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { petsConfig } from "../../config/PetsConfig.js";
import { postgres } from "../../server.js";
import { isShinyLocked, visibleCredits } from "../user/shinyLock.js";
import { hfoChampionFree } from "../events/hfo.js";

/**
 * Inferno-only: pets (config/PetsConfig.ts). A pet is a row of bym.pet: which monster, and whether it is out in
 * the main yard or in storage. Bought here for Shiny (the balance and the new row in one transaction, the save
 * row locked so two purchases sent at once can't spend the same Shiny); put away or brought out here too. The
 * game draws the pets that are out (com/monsters/pets/IoPets.ts): sent with any main yard's load (io_pets),
 * the owner's or one being attacked or visited.
 */

export interface Pet {
  id: number;
  monster: string;
  out: boolean;
  /** Its name, if the player gave it one. */
  name: string | null;
  /** Fed growCost Magma: full size for good. */
  big: boolean;
  /** (QoL #503) Seconds since it was bought (the database's clock). */
  age: number;
  /** (22 October) A Golden Coat: "gold" (services/shop/ioShop.ts), or null. */
  coat?: string | null;
  /** (22 October) A Name Tag's colour ("rrggbb"), or null. */
  tag?: string | null;
}

export class PetError extends Error {}

/**
 * QoL #503: a pet given back. Within PET_RETURN_SECONDS of buying it, if it was never fed (grown), all its Shiny
 * comes back (Return); after that, or once fed, PET_RELEASE_PERCENT of it (Release). Constants here, not in
 * PetsConfig (server restart only either way).
 */
export const PET_RETURN_SECONDS = 600;
export const PET_RELEASE_PERCENT = 50;

type Em = typeof postgres.em;

const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

export const petsEnabled = () => infernoOnlyConfig.enabled && petsConfig.enabled;

/** A player's pets, oldest first. */
export const listPets = async (userid: number, em: Em = postgres.em): Promise<Pet[]> => {
  if (!petsEnabled() || !userid) return [];
  // (QoL #503: its age too, by the database's clock, so the game can offer Return within the first 10 minutes)
  // (22 October: its Golden Coat and Name Tag too, services/shop/ioShop.ts)
  const rows = await sql<{ id: number; monster: string; out: boolean; name: string | null; big: boolean; age: number | string | null; coat: string | null; tag: string | null }>(em,
    `SELECT id, monster, "out", name, big, FLOOR(EXTRACT(EPOCH FROM (now() - created_at)))::int AS age, coat, tag FROM bym.pet WHERE user_id = ? ORDER BY id`, [userid]);
  return rows.map((r) => ({ id: Number(r.id), monster: r.monster, out: Boolean(r.out), name: r.name ?? null, big: Boolean(r.big), age: Math.max(0, Number(r.age) || 0), coat: r.coat ?? null, tag: r.tag ?? null }));
};

/**
 * The pets as the game reads them: [[id, monster, out (0/1), name, full size (0/1), seconds since bought, Golden Coat
 * (0/1), Name Tag's colour ("rrggbb" or "")], ...].
 */
export const petsForGame = (pets: Pet[]) => pets.map((p) => [p.id, p.monster, p.out ? 1 : 0, p.name ?? "", p.big ? 1 : 0, p.age ?? 0, p.coat === "gold" ? 1 : 0, p.tag ?? ""]);

/**
 * The monsters a player can have as pets: Hell Freezes Over's only once they have won the event (pets they own
 * already are theirs anyway).
 */
export const petMonstersFor = async (userid: number): Promise<string[]> => {
  const event = new Set(petsConfig.eventMonsters);
  if (!petsConfig.monsters.some((m) => event.has(m))) return petsConfig.monsters;
  const won = userid ? await hfoChampionFree(userid).catch(() => false) : false;
  return won ? petsConfig.monsters : petsConfig.monsters.filter((m) => !event.has(m));
};

/** What the Pets tab needs to know (with the yard's load, and every answer). */
export const petsInfo = async (userid: number) => ({
  price: petsConfig.price,
  maxOut: petsConfig.maxOut,
  perKind: petsConfig.maxPerKind,
  nameLength: petsConfig.nameLength,
  growCost: petsConfig.growCost,
  monsters: await petMonstersFor(userid),
  // (QoL #503)
  returnSeconds: PET_RETURN_SECONDS,
  releasePercent: PET_RELEASE_PERCENT,
});

/**
 * A pet's name as kept: letters (any language), digits, spaces and a few marks, at most nameLength; an empty one is
 * no name. Anything else is refused.
 */
export const cleanPetName = (raw: unknown): string | null => {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  if ([...name].length > petsConfig.nameLength) throw new PetError(`A pet's name can be at most ${petsConfig.nameLength} letters long.`);
  if (!/^[\p{L}\p{N} '.!?&-]+$/u.test(name)) throw new PetError("A pet's name can only have letters, numbers, spaces and . ' ! ? & -");
  return name;
};

/**
 * Buys a pet of one monster for petsConfig.price Shiny. It comes out into the yard if fewer than maxOut are
 * out, else into storage. Returns the pets and the balance left.
 */
export const buyPet = async (user: User, monster: string): Promise<{ pets: Pet[]; credits: number; pet: Pet }> => {
  if (!petsEnabled()) throw new PetError("Pets aren't on sale here.");
  if (!petsConfig.monsters.includes(monster)) throw new PetError("That monster can't be a pet.");
  if (!(await petMonstersFor(user.userid)).includes(monster)) throw new PetError("Win Hell Freezes Over to have its monsters as pets.");
  if (isShinyLocked(user)) throw new PetError("Shiny is turned off on your account, so you can't buy pets.");
  const price = petsConfig.price;
  const result = await postgres.em.fork().transactional(async (em) => {
    const bal = await sql<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!bal.length) throw new PetError("Your yard could not be found.");
    if (bal[0].credits < price) throw new PetError(`A pet costs ${price} Shiny: you don't have enough.`);
    const owned = await listPets(user.userid, em);
    if (owned.length >= petsConfig.maxOwned) throw new PetError(`You have ${owned.length} pets already: that's as many as one keeper can have.`);
    if (owned.filter((p) => p.monster === monster).length >= petsConfig.maxPerKind) {
      throw new PetError(`You have ${petsConfig.maxPerKind} of these already: that's as many of one monster as you can have.`);
    }
    const out = owned.filter((p) => p.out).length < petsConfig.maxOut;
    const paid = await sql<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
      [price, user.userid, BaseType.MAIN, price]);
    if (paid.length !== 1) throw new PetError(`A pet costs ${price} Shiny: you don't have enough.`);
    const made = await sql<{ id: number }>(em, `INSERT INTO bym.pet (user_id, monster, "out") VALUES (?, ?, ?) RETURNING id`, [user.userid, monster, out]);
    const pet: Pet = { id: Number(made[0].id), monster, out, name: null, big: false, age: 0, coat: null, tag: null };
    return { pets: [...owned, pet], credits: paid[0].credits, pet };
  });
  // The request's own copy of the save (if loaded) must not later write back an older balance.
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return { ...result, credits: visibleCredits(user, result.credits) };
};

/** Brings a pet out into the yard (if fewer than maxOut are out) or puts it in storage. Returns the pets. */
export const placePet = async (user: User, id: number, out: boolean): Promise<Pet[]> => {
  if (!petsEnabled()) throw new PetError("Pets aren't here.");
  return postgres.em.fork().transactional(async (em) => {
    // (the player's pets locked: two requests at once can't bring out a third)
    const mine = await sql<{ id: number; out: boolean }>(em, `SELECT id, "out" FROM bym.pet WHERE user_id = ? ORDER BY id FOR UPDATE`, [user.userid]);
    const pet = mine.find((p) => Number(p.id) === id);
    if (!pet) throw new PetError("That pet isn't yours.");
    if (out && !pet.out && mine.filter((p) => p.out).length >= petsConfig.maxOut) {
      throw new PetError(`Only ${petsConfig.maxOut} pets can be out in your yard at once: put one away first.`);
    }
    await sql(em, `UPDATE bym.pet SET "out" = ? WHERE id = ? AND user_id = ? RETURNING id`, [out, id, user.userid]);
    return listPets(user.userid, em);
  });
};

/** Names a pet (or takes its name away: an empty one). Returns the pets. */
export const namePet = async (user: User, id: number, raw: unknown): Promise<Pet[]> => {
  if (!petsEnabled()) throw new PetError("Pets aren't here.");
  const name = cleanPetName(raw);
  const done = await sql<{ id: number }>(postgres.em.fork(), `UPDATE bym.pet SET name = ? WHERE id = ? AND user_id = ? RETURNING id`, [name, id, user.userid]);
  if (done.length !== 1) throw new PetError("That pet isn't yours.");
  return listPets(user.userid);
};

/**
 * Feeds a pet petsConfig.growCost Magma: full size for good (10 October). The Magma is taken from the main yard's
 * save here (the save row locked; the game sends its own spending as changes, so it only takes the same amount
 * off what it shows, without sending it). Returns the pets and the Magma the save has left.
 */
export const growPet = async (user: User, id: number): Promise<{ pets: Pet[]; magma: number }> => {
  if (!petsEnabled()) throw new PetError("Pets aren't here.");
  const cost = petsConfig.growCost;
  return postgres.em.fork().transactional(async (em) => {
    const save = await sql<{ r4: string | null }>(em, `SELECT resources->>'r4' AS r4 FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!save.length) throw new PetError("Your yard could not be found.");
    const pet = await sql<{ id: number; big: boolean }>(em, `SELECT id, big FROM bym.pet WHERE id = ? AND user_id = ? FOR UPDATE`, [id, user.userid]);
    if (!pet.length) throw new PetError("That pet isn't yours.");
    if (pet[0].big) throw new PetError("This pet is full size already.");
    const magma = Math.floor(Number(save[0].r4) || 0);
    if (magma < cost) throw new PetError(`Growing a pet takes ${cost.toLocaleString("en-US")} Magma: your yard has ${magma.toLocaleString("en-US")}.`);
    const left = await sql<{ r4: string }>(em,
      `UPDATE bym.save SET resources = jsonb_set(COALESCE(resources, '{}'::jsonb), '{r4}', to_jsonb(FLOOR((resources->>'r4')::numeric) - ?)) WHERE userid = ? AND type = ? AND (resources->>'r4')::numeric >= ? RETURNING resources->>'r4' AS r4`,
      [cost, user.userid, BaseType.MAIN, cost]);
    if (left.length !== 1) throw new PetError(`Growing a pet takes ${cost.toLocaleString("en-US")} Magma.`);
    await sql(em, `UPDATE bym.pet SET big = true WHERE id = ? AND user_id = ? RETURNING id`, [id, user.userid]);
    return { pets: await listPets(user.userid, em), magma: Math.floor(Number(left[0].r4)) };
  });
};

/** QoL #503: what a pet gives back now: all its Shiny (Return) or PET_RELEASE_PERCENT of it (Release). */
export const petRefund = (big: boolean, age: number, price: number = petsConfig.price): { refund: number; returned: boolean } => {
  const returned = !big && age >= 0 && age <= PET_RETURN_SECONDS;
  return { refund: returned ? price : Math.floor((price * PET_RELEASE_PERCENT) / 100), returned };
};

/**
 * QoL #503: a pet given back for Shiny (Return within PET_RETURN_SECONDS if never fed, else Release). One
 * transaction: the main save's row locked first (as buyPet and growPet lock it, so they queue behind each other),
 * then the pet's row deleted with RETURNING, and only a deleted row is paid for: a second request for the same pet
 * (sent twice, or from two tabs) finds no row and pays nothing. `expect` is what the game showed: if the pet is
 * now worth less (the 10 minutes ran out on the way), nothing happens and the player is told, so no one gets
 * less than they agreed to. Returns the pets, the balance and what came back.
 */
export const releasePet = async (user: User, id: number, expect: number): Promise<{ pets: Pet[]; credits: number; refund: number; returned: boolean }> => {
  if (!petsEnabled()) throw new PetError("Pets aren't here.");
  if (!id) throw new PetError("That pet isn't yours.");
  const result = await postgres.em.fork().transactional(async (em) => {
    const bal = await sql<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!bal.length) throw new PetError("Your yard could not be found.");
    const gone = await sql<{ big: boolean; age: number | string | null }>(em,
      `DELETE FROM bym.pet WHERE id = ? AND user_id = ? RETURNING big, FLOOR(EXTRACT(EPOCH FROM (now() - created_at)))::int AS age`, [id, user.userid]);
    if (gone.length !== 1) throw new PetError("That pet isn't yours (or it has gone already).");
    const { refund, returned } = petRefund(Boolean(gone[0].big), Number(gone[0].age) || 0);
    if (expect > 0 && refund < expect) {
      // (thrown: the transaction is rolled back, the pet stays)
      throw new PetError(`The 10 minutes to return this pet have passed: releasing it now gives ${refund} Shiny back. Try again if that's fine.`);
    }
    const paid = await sql<{ credits: number }>(em, `UPDATE bym.save SET credits = credits + ? WHERE userid = ? AND type = ? RETURNING credits`, [refund, user.userid, BaseType.MAIN]);
    if (paid.length !== 1) throw new PetError("Your yard could not be found.");
    return { pets: await listPets(user.userid, em), credits: paid[0].credits, refund, returned };
  });
  // The request's own copy of the save (if loaded) must not later write back an older balance.
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = result.credits;
  return { ...result, credits: visibleCredits(user, result.credits) };
};
