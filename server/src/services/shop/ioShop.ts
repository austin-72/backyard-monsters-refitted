import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { MapRoomCell, MapRoomVersion } from "../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { isShinyLocked, visibleCredits } from "../user/shinyLock.js";
import { isTestMode } from "../admin/testMode.js";
import { hexDistanceWrapped, isUnder } from "../maproom/v2/underworld.js";
import { withMoveLock } from "../maproom/v2/moveGuard.js";
import { petsEnabled } from "../pets/pets.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (22 October, the user's picks from the Shiny store proposals): the Store's Extras. Ten items, priced in
 * InfernoOnlyConfig.prices.shop and charged here, never at a price the game sends:
 *
 *   drone    Harvest Drone         7 days   the main yard's harvesters bank themselves (the game: IoShop)
 *   manual   Training Manual       7 days   Strongbox unlocks 25% faster (started while it runs)
 *   scholar  Academy Scholarship   7 days   Academy training 25% faster (started while it runs)
 *   insure   Raid Insurance        24 hours half of what one raid takes comes back (insurancePayout, from the attack's
 *                                           own saves: the loss the server took, never more)
 *   treats   Pet Treats            24 hours the pets do tricks and the zoomies by themselves (seen by visitors too)
 *   hop      Short Hop             token    the main yard moved up to HOP_CELLS cells, onto a wild yard (useHop)
 *   guard    Outpost Guard         token    one outpost protected GUARD_SECONDS (useGuard)
 *   coat     Golden Coat           token    one pet gilded for good (bym.pet.coat)
 *   tag      Name Tag              token    a coloured tag for one named pet's name (bym.pet.tag)
 *   statue   Champion Statue       token    building 171, the player's champion in bronze (placed from the build
 *                                           menu: the save pays BUILDING171, or a token: takeStatueToken)
 *
 * (22 October, later: the user's picks #35, #47 and #50 from Round 2 of the proposals, sold in the Store's own tabs,
 * not the Extras':)
 *   apprentice  Apprentice        72 hours one more worker in the main yard (the game: QUEUE.Spawn); one at a time, and
 *                                          APPRENTICE_GAP between one's start and the next's (Construction)
 *   repair      Repair Crew       7 days   the yards' buildings repaired at once after a raid (the game: IoShop)
 *                                          (Speed-Ups)
 *   scout       Scout Report      per look a player's yard's towers by level, its traps by kind (not where) and its
 *                                          last 3 defences, from the map; the same yard again that day free
 *                                          (scoutReport) (Combat)
 *
 * Gift Wrap: any of them bought for an alliance member, at the same price; a timed one starts (or runs longer) for
 * them, the others wait for them as tokens; they are told who it was from (notices) the next time their yard loads.
 *
 * A timed item bought again runs that much longer (up to TIMED_MOST periods ahead); it never adds to its own effect.
 * Tokens: bought ahead (or gifted) and spent when used; using one with none bought pays the price then.
 *
 * Everything is in one transaction per request: the buyer's main save locked and charged (credits >= price) first,
 * then the player's bym.user.io_shop row locked and written: two requests at once can't spend the same Shiny or the
 * same token. Not in admin test mode (its Shiny is put back afterwards, what it bought would not be).
 */

export const SHOP_ITEMS = ["drone", "manual", "scholar", "insure", "hop", "guard", "coat", "treats", "tag", "statue", "apprentice", "repair", "scout"] as const;
export type ShopItem = (typeof SHOP_ITEMS)[number];

type PriceKey = keyof typeof infernoOnlyConfig.prices.shop;
const PRICE_KEY: Record<ShopItem, PriceKey> = {
  drone: "harvestDrone",
  manual: "trainingManual",
  scholar: "academyScholarship",
  insure: "raidInsurance",
  hop: "shortHop",
  guard: "outpostGuard",
  coat: "goldenCoat",
  treats: "petTreats",
  tag: "nameTag",
  statue: "championStatue",
  apprentice: "apprentice",
  repair: "repairCrew",
  scout: "scoutReport",
};

const DAY = 24 * 3600;

/** The timed items and how long one runs. */
export const TIMED: Partial<Record<ShopItem, number>> = { drone: 7 * DAY, manual: 7 * DAY, scholar: 7 * DAY, treats: DAY, apprentice: 3 * DAY, repair: 7 * DAY };
/** From one Apprentice's start to the next's, at least this long. */
export const APPRENTICE_GAP = 7 * DAY;
/** A Scout Report: the yards looked at today kept (free again that day), no more than this many. */
const SCOUTED_MOST = 200;
/** Towers and traps as a Scout Report counts them (the building types: game-data/anticheat/buildingProps.json). */
const SCOUT_TOWERS = [20, 21, 23, 25, 115, 118, 129, 130, 132, 144, 145];
const SCOUT_TRAPS = [24, 117];
/** A timed item bought again runs longer, but no more than this many of it ahead. */
export const TIMED_MOST = 4;
/** The items kept as tokens until used. */
export const TOKENS: ShopItem[] = ["hop", "guard", "coat", "tag", "statue"];
/** No more than this many of one token held. */
export const TOKENS_MOST = 10;
export const INSURANCE_SECONDS = DAY;
export const GUARD_SECONDS = 12 * 3600;
/** An outpost guarded no further ahead than this. */
export const GUARD_MOST_AHEAD = 48 * 3600;
export const HOP_CELLS = 10;
/** Short Hop's wait before the next move, as any move of the main yard. */
export const HOP_COOLDOWN = DAY;
/** The champions a statue can show (the game's IoSkins.CHAMPIONS). */
export const STATUE_CHAMPIONS = ["IC9", "IC10", "IC24", "IC25", "IC32"];
/**
 * (23 October, the user's: "the level should be selectable so that it can show lvl 4 or 5 or 6 champs") The champions
 * a statue can show at level 4, 5 or 6 (their sheets: korath_4..6, dragon_4..6, rimegrave_4..6); the others have one
 * look. Free to change, as the champion.
 */
export const STATUE_LEVELS: Record<string, number[]> = { IC9: [4, 5, 6], IC10: [4, 5, 6], IC25: [4, 5, 6] };
/** What a statue shows: "IC9-5" (a champion with levels), "IC24" (one without). */
export const statueLook = (id: string | null, level: number | null): string | null => {
  if (!id) return null;
  const levels = STATUE_LEVELS[id];
  if (!levels) return id;
  return `${id}-${level && levels.includes(level) ? level : levels[0]}`;
};
/** The Name Tag's colours ("rrggbb"). */
export const TAG_COLOURS = ["d23a2a", "e8892a", "e8c22a", "4fae3a", "2a9ec8", "3a5ad2", "8a3ad2", "d23a9e", "f4f0e6", "2a2420"];
/** Gift notices kept for a player who hasn't seen them. */
const GIFTS_MOST = 20;

export class ShopError extends Error {}

export const shopEnabled = () => infernoOnlyConfig.enabled;

export const priceOf = (item: ShopItem): number => Math.max(1, Math.floor(Number(infernoOnlyConfig.prices.shop[PRICE_KEY[item]]) || 0));

export const isShopItem = (item: unknown): item is ShopItem => SHOP_ITEMS.includes(item as ShopItem);

export interface Insurance {
  /** Covers a raid that starts before this. */
  until: number;
  /** The attack it paid for ("baseid:attackid"): it covers that attack's saves only. */
  key?: string;
  /** What it has paid back, by resource. */
  paid?: Record<string, number>;
  at?: number;
  /** The player was told of the payout. */
  told?: number;
}

export interface Gift {
  from: string;
  item: ShopItem;
  at: number;
}

export interface ShopState {
  until: Record<string, number>;
  tokens: Record<string, number>;
  ins: Insurance | null;
  statue: string | null;
  /** The statue's champion's level (STATUE_LEVELS), or null (its first). */
  statueLevel: number | null;
  gifts: Gift[];
  /** When an item was last started (the Apprentice's gap). */
  last: Record<string, number>;
  /** The yards Scout-Reported today (a day number: UTC days), free again that day. */
  scout: { day: number; ids: string[] } | null;
}

export const emptyShop = (): ShopState => ({ until: {}, tokens: {}, ins: null, statue: null, statueLevel: null, gifts: [], last: {}, scout: null });

export const parseShop = (raw: unknown): ShopState => {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  const s = emptyShop();
  if (!v || typeof v !== "object") return s;
  const o = v as Record<string, unknown>;
  const nums = (x: unknown) => {
    const out: Record<string, number> = {};
    if (x && typeof x === "object") for (const [k, n] of Object.entries(x)) if (Number.isFinite(Number(n)) && Number(n) > 0) out[k] = Math.floor(Number(n));
    return out;
  };
  s.until = nums(o.until);
  s.tokens = nums(o.tokens);
  if (o.ins && typeof o.ins === "object" && Number((o.ins as Insurance).until) > 0) s.ins = o.ins as Insurance;
  if (typeof o.statue === "string" && STATUE_CHAMPIONS.includes(o.statue)) s.statue = o.statue;
  if (s.statue && STATUE_LEVELS[s.statue]?.includes(Number(o.statueLevel))) s.statueLevel = Number(o.statueLevel);
  if (Array.isArray(o.gifts)) s.gifts = (o.gifts as Gift[]).filter((g) => g && isShopItem(g.item)).slice(-GIFTS_MOST);
  s.last = nums(o.last);
  const sc = o.scout as { day?: unknown; ids?: unknown } | undefined;
  if (sc && typeof sc === "object" && Number.isFinite(Number(sc.day)) && Array.isArray(sc.ids)) {
    s.scout = { day: Math.floor(Number(sc.day)), ids: (sc.ids as unknown[]).map(String).slice(-SCOUTED_MOST) };
  }
  return s;
};

type Em = typeof postgres.em;

const sql = async <T = Record<string, unknown>>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

/** A player's shop state (read only). */
export const shopOf = async (userid: number, em: Em = postgres.em): Promise<ShopState> => {
  if (!userid) return emptyShop();
  const rows = await sql<{ io_shop: unknown }>(em, `SELECT io_shop FROM bym."user" WHERE userid = ?`, [userid]);
  return parseShop(rows[0]?.io_shop);
};

/** Runs fn on a player's state with their row locked (inside `em`'s transaction), writing back what it returns. */
const withShop = async <T>(em: Em, userid: number, fn: (state: ShopState) => T | Promise<T>): Promise<{ value: T; state: ShopState }> => {
  const rows = await sql<{ io_shop: unknown }>(em, `SELECT io_shop FROM bym."user" WHERE userid = ? FOR UPDATE`, [userid]);
  if (!rows.length) throw new ShopError("That player could not be found.");
  const state = parseShop(rows[0].io_shop);
  const value = await fn(state);
  await sql(em, `UPDATE bym."user" SET io_shop = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(state), userid]);
  return { value, state };
};

/** The main save locked (always first: every request here locks it before the player's row, so none wait on each other). */
const lockSave = async (em: Em, userid: number) => {
  const rows = await sql<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [userid, BaseType.MAIN]);
  if (!rows.length) throw new ShopError("Your yard could not be found.");
  return Number(rows[0].credits) || 0;
};

/** Takes the price from the main save (locked by lockSave): the balance left. */
const charge = async (em: Em, userid: number, item: ShopItem): Promise<number> => {
  const price = priceOf(item);
  const paid = await sql<{ credits: number }>(em,
    `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
    [price, userid, BaseType.MAIN, price]);
  if (paid.length !== 1) throw new ShopError(`That costs ${price} Shiny: you don't have enough.`);
  return Number(paid[0].credits);
};

/** The request's own copy of the save (if loaded) must not later write back an older balance. */
const tellCredits = (user: User, credits: number | null) => {
  if (credits == null) return;
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
};

const title = (item: ShopItem) =>
  ({
    drone: "a Harvest Drone",
    manual: "a Training Manual",
    scholar: "an Academy Scholarship",
    insure: "Raid Insurance",
    hop: "a Short Hop",
    guard: "an Outpost Guard",
    coat: "a Golden Coat",
    treats: "Pet Treats",
    tag: "a Name Tag",
    statue: "a Champion Statue",
    apprentice: "an Apprentice",
    repair: "a Repair Crew",
    scout: "a Scout Report",
  })[item];

const days = (seconds: number) => {
  const d = Math.round(seconds / DAY);
  return d >= 1 ? `${d} day${d === 1 ? "" : "s"}` : `${Math.max(1, Math.round(seconds / 3600))} hours`;
};

/** Gives one item to a state (bought or a gift): a timed one runs (longer), insurance starts, a token is kept. */
export const grant = (state: ShopState, item: ShopItem, now: number, forOther: boolean): void => {
  const who = forOther ? "They have" : "You have";
  if (item === "scout") throw new ShopError("A Scout Report is had from the map: pick a player's yard there.");
  const seconds = TIMED[item];
  // (an Apprentice: one at a time, and a gap from one's start to the next's)
  if (item === "apprentice") {
    if ((state.until.apprentice ?? 0) > now) throw new ShopError(`${who} an Apprentice already.`);
    const next = (state.last.apprentice ?? 0) + APPRENTICE_GAP;
    if (next > now) throw new ShopError(`${forOther ? "Their" : "Your"} next Apprentice can start in ${days(next - now)}.`);
    state.until.apprentice = now + (seconds ?? 3 * DAY);
    state.last.apprentice = now;
    return;
  }
  if (seconds) {
    const from = Math.max(now, state.until[item] ?? 0);
    if (from - now + seconds > seconds * TIMED_MOST) throw new ShopError(`${who} ${days(from - now)} of ${title(item)} already: that's as far ahead as it goes.`);
    state.until[item] = from + seconds;
    return;
  }
  if (item === "insure") {
    if (state.ins && state.ins.until > now && !state.ins.key) throw new ShopError(`${who} Raid Insurance already.`);
    state.ins = { until: now + INSURANCE_SECONDS };
    return;
  }
  const held = state.tokens[item] ?? 0;
  if (held >= TOKENS_MOST) throw new ShopError(`${who} ${held} of ${title(item)} waiting already: use one first.`);
  state.tokens[item] = held + 1;
};

/** Is the insurance covering a raid now (bought, not run out, not used on another raid)? */
export const insuranceActive = (state: ShopState, now: number) => !!state.ins && state.ins.until > now && !state.ins.key;

/** What the game is told of a player's own state (their yard's load, and every answer). */
export const shopView = (state: ShopState, now = getCurrentDateTime()) => {
  const until: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.until)) if (v > now) until[k] = v;
  const prices: Record<string, number> = {};
  for (const item of SHOP_ITEMS) prices[item] = priceOf(item);
  return {
    prices,
    timed: TIMED,
    tokens: state.tokens,
    until,
    insured: insuranceActive(state, now) ? state.ins!.until : 0,
    statue: state.statue,
    statueLevel: state.statue ? Number(statueLook(state.statue, state.statueLevel)?.split("-")[1]) || null : null,
    statueLevels: STATUE_LEVELS,
    hopCells: HOP_CELLS,
    guardHours: GUARD_SECONDS / 3600,
    tagColours: TAG_COLOURS,
    // (the Apprentice: when the next can start; the yards scouted today, free again)
    apprenticeNext: (state.last.apprentice ?? 0) + APPRENTICE_GAP,
    scouted: state.scout && state.scout.day === Math.floor(now / DAY) ? state.scout.ids : [],
    now,
  };
};

const checkBuyer = async (user: User) => {
  if (!shopEnabled()) throw new ShopError("That isn't sold here.");
  if (isShinyLocked(user)) throw new ShopError("Shiny is turned off on your account, so you can't buy this.");
  if (await isTestMode(user)) throw new ShopError("Not in admin test mode: its Shiny is put back afterwards.");
};

/** Alliance members a player can gift-wrap for (not themselves). */
export const giftTargets = async (user: User): Promise<{ id: number; name: string }[]> => {
  if (!user.alliance_id) return [];
  const rows = await sql<{ userid: number; username: string }>(postgres.em,
    `SELECT userid, username FROM bym."user" WHERE alliance_id = ? AND userid <> ? AND banned = false ORDER BY lower(username)`,
    [user.alliance_id, user.userid]);
  return rows.map((r) => ({ id: Number(r.userid), name: String(r.username) }));
};

/**
 * Buys an item: for the player, or gift-wrapped for an alliance member (`forUserId`). Returns the buyer's balance and
 * their own state (a gift leaves it as it was).
 */
export const buyShopItem = async (user: User, item: unknown, forUserId = 0) => {
  await checkBuyer(user);
  if (!isShopItem(item)) throw new ShopError("That isn't for sale.");
  if ((item === "coat" || item === "treats" || item === "tag") && !petsEnabled()) throw new ShopError("Pets aren't here.");
  let target = user.userid;
  let targetName = user.username;
  if (forUserId && forUserId !== user.userid) {
    const rows = await sql<{ userid: number; username: string; alliance_id: number | null; banned: boolean }>(postgres.em,
      `SELECT userid, username, alliance_id, banned FROM bym."user" WHERE userid = ?`, [forUserId]);
    const them = rows[0];
    if (!them || them.banned) throw new ShopError("That player could not be found.");
    if (!user.alliance_id) throw new ShopError("Gift Wrap is for alliance members: join an alliance first.");
    if (Number(them.alliance_id) !== Number(user.alliance_id)) throw new ShopError(`${them.username} isn't in your alliance: gifts are for alliance members.`);
    target = Number(them.userid);
    targetName = String(them.username);
  }
  const gift = target !== user.userid;
  const now = getCurrentDateTime();
  const result = await postgres.em.fork().transactional(async (em) => {
    await lockSave(em, user.userid);
    const credits = await charge(em, user.userid, item);
    const { state } = await withShop(em, target, (s) => {
      grant(s, item, now, gift);
      if (gift) s.gifts = [...s.gifts, { from: user.username, item, at: now }].slice(-GIFTS_MOST);
    });
    return { credits, state };
  });
  tellCredits(user, result.credits);
  if (gift) logger.info(`Gift Wrap: '${user.username}' gave '${targetName}' ${item} (${priceOf(item)} Shiny)`);
  const own = gift ? await shopOf(user.userid) : result.state;
  return { credits: visibleCredits(user, result.credits), shop: shopView(own, now), gift: gift ? targetName : null };
};

/**
 * Pays for using a token item: a token kept if there is one, else its price. Inside `em`'s transaction, with the save
 * locked first (lockSave). Returns the balance (null when a token paid).
 */
const payToUse = async (em: Em, user: User, item: ShopItem, state: ShopState): Promise<number | null> => {
  if ((state.tokens[item] ?? 0) > 0) {
    state.tokens[item] -= 1;
    if (state.tokens[item] <= 0) delete state.tokens[item];
    return null;
  }
  if (isShinyLocked(user)) throw new ShopError("Shiny is turned off on your account, so you can't buy this.");
  return charge(em, user.userid, item);
};

/**
 * A Scout Report (22 October, the user's pick #50): a player's yard (main or outpost, not the player's own) as it is:
 * its towers by kind and level, its traps by kind (not where), and its last 3 defences (when, how much was destroyed).
 * The first look at a yard each day (UTC) costs the price; the same yard again that day is free.
 */
export const scoutReport = async (user: User, baseid: unknown) => {
  await checkBuyer(user);
  const id = String(baseid ?? "");
  if (!/^\d{1,20}$/.test(id) || id === "0") throw new ShopError("That yard could not be found.");
  const rows = await sql<{ userid: number; type: string; buildingdata: unknown; username: string }>(postgres.em,
    `SELECT s.userid, s.type, s.buildingdata, u.username FROM bym.save s JOIN bym."user" u ON u.userid = s.userid
      WHERE s.baseid = ? AND s.type IN (?, ?) LIMIT 1`, [id, BaseType.MAIN, BaseType.OUTPOST]);
  const target = rows[0];
  if (!target) throw new ShopError("That yard could not be found: Scout Reports are for players' yards.");
  if (Number(target.userid) === user.userid) throw new ShopError("That's your own yard.");
  const now = getCurrentDateTime();
  const day = Math.floor(now / DAY);
  const r = await postgres.em.fork().transactional(async (em) => {
    await lockSave(em, user.userid);
    let credits: number | null = null;
    const { state } = await withShop(em, user.userid, async (st) => {
      if (!st.scout || st.scout.day !== day) st.scout = { day, ids: [] };
      if (!st.scout.ids.includes(id)) {
        credits = await charge(em, user.userid, "scout");
        st.scout.ids = [...st.scout.ids, id].slice(-SCOUTED_MOST);
      }
    });
    return { credits, state };
  });
  tellCredits(user, r.credits);
  // (read only, after: the yard as it is saved)
  let data: unknown = target.buildingdata;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const towers = new Map<string, number>();
  const traps = new Map<number, number>();
  for (const b of Object.values((data ?? {}) as Record<string, { t?: number; l?: number; cB?: number }>)) {
    if (!b || typeof b.t !== "number") continue;
    // (one still being put up isn't there yet)
    const lvl = b.cB && b.cB > 0 && !b.l ? 0 : Math.max(1, Math.floor(Number(b.l ?? 1)));
    if (lvl <= 0) continue;
    if (SCOUT_TOWERS.includes(b.t)) towers.set(`${b.t}:${lvl}`, (towers.get(`${b.t}:${lvl}`) ?? 0) + 1);
    else if (SCOUT_TRAPS.includes(b.t)) traps.set(b.t, (traps.get(b.t) ?? 0) + 1);
  }
  const defences = await sql<{ at: number; damage: number }>(postgres.em,
    `SELECT extract(epoch from attacktime)::int AS at, damage FROM bym.attack_logs WHERE baseid = ? ORDER BY attacktime DESC LIMIT 3`, [id]);
  const report = {
    name: String(target.username),
    outpost: target.type === BaseType.OUTPOST,
    towers: [...towers.entries()].map(([k, n]) => [Number(k.split(":")[0]), Number(k.split(":")[1]), n]).sort((a, b) => a[0] - b[0] || b[1] - a[1]),
    traps: [...traps.entries()].map(([t, n]) => [t, n]),
    defences: defences.map((d) => ({ at: Number(d.at), damage: Math.round(Number(d.damage) || 0) })),
  };
  return { credits: r.credits == null ? null : visibleCredits(user, r.credits), shop: shopView(r.state, now), report };
};

/** A Golden Coat on one of the player's pets, for good. */
export const useCoat = async (user: User, petId: number) => {
  await checkBuyer(user);
  if (!petsEnabled()) throw new ShopError("Pets aren't here.");
  const now = getCurrentDateTime();
  const r = await postgres.em.fork().transactional(async (em) => {
    await lockSave(em, user.userid);
    return withShop(em, user.userid, async (state) => {
      const pet = await sql<{ id: number; coat: string | null }>(em, `SELECT id, coat FROM bym.pet WHERE id = ? AND user_id = ? FOR UPDATE`, [petId, user.userid]);
      if (!pet.length) throw new ShopError("That pet isn't yours.");
      if (pet[0].coat === "gold") throw new ShopError("This pet has its Golden Coat already.");
      const credits = await payToUse(em, user, "coat", state);
      await sql(em, `UPDATE bym.pet SET coat = 'gold' WHERE id = ? AND user_id = ? RETURNING id`, [petId, user.userid]);
      return credits;
    });
  });
  tellCredits(user, r.value);
  return { credits: r.value == null ? null : visibleCredits(user, r.value), shop: shopView(r.state, now) };
};

/** A Name Tag (its colour, one of TAG_COLOURS) on one of the player's named pets: a new colour later is free. */
export const useTag = async (user: User, petId: number, colour: unknown) => {
  await checkBuyer(user);
  if (!petsEnabled()) throw new ShopError("Pets aren't here.");
  const c = String(colour ?? "").toLowerCase().replace(/^#/, "");
  if (!TAG_COLOURS.includes(c)) throw new ShopError("Pick one of the tag's colours.");
  const now = getCurrentDateTime();
  const r = await postgres.em.fork().transactional(async (em) => {
    await lockSave(em, user.userid);
    return withShop(em, user.userid, async (state) => {
      const pet = await sql<{ id: number; tag: string | null; name: string | null }>(em, `SELECT id, tag, name FROM bym.pet WHERE id = ? AND user_id = ? FOR UPDATE`, [petId, user.userid]);
      if (!pet.length) throw new ShopError("That pet isn't yours.");
      if (!pet[0].name) throw new ShopError("Give this pet a name first: the tag shows it.");
      const credits = pet[0].tag ? null : await payToUse(em, user, "tag", state);
      await sql(em, `UPDATE bym.pet SET tag = ? WHERE id = ? AND user_id = ? RETURNING id`, [c, petId, user.userid]);
      return credits;
    });
  });
  tellCredits(user, r.value);
  return { credits: r.value == null ? null : visibleCredits(user, r.value), shop: shopView(r.state, now) };
};

/** An Outpost Guard on one of the player's outposts: protected GUARD_SECONDS more (from now, or its protection's end). */
export const useGuard = async (user: User, baseid: unknown) => {
  await checkBuyer(user);
  const id = String(baseid ?? "").slice(0, 64);
  if (!/^\d+$/.test(id)) throw new ShopError("Pick one of your outposts.");
  const now = getCurrentDateTime();
  const r = await postgres.em.fork().transactional(async (em) => {
    await lockSave(em, user.userid);
    return withShop(em, user.userid, async (state) => {
      const rows = await sql<{ protected: number | null; attackid: number | null; attacks: unknown }>(em,
        `SELECT s.protected, s.attackid, s.attacks FROM bym.world_map_cell c JOIN bym.save s ON s.baseid = c.baseid AND s.type = ?
          WHERE c.baseid = ? AND c.uid = ? AND c.base_type = ? AND c.map_version = ? FOR UPDATE OF s`,
        [BaseType.OUTPOST, id, user.userid, MapRoomCell.OUTPOST, MapRoomVersion.V2]);
      if (!rows.length) throw new ShopError("That isn't one of your outposts.");
      const o = rows[0];
      const attacks = (Array.isArray(o.attacks) ? o.attacks : []) as { starttime?: number }[];
      const last = attacks.at(-1);
      if (Number(o.attackid) && last && now - Number(last.starttime ?? 0) < 7 * 60) throw new ShopError("That outpost is being attacked: guard it once the attack is over.");
      const from = Math.max(now, Number(o.protected) || 0);
      if (from + GUARD_SECONDS - now > GUARD_MOST_AHEAD) throw new ShopError("That outpost is protected for long enough already.");
      const credits = await payToUse(em, user, "guard", state);
      await sql(em, `UPDATE bym.save SET protected = ? WHERE baseid = ? AND type = ? RETURNING baseid`, [from + GUARD_SECONDS, id, BaseType.OUTPOST]);
      return { credits, until: from + GUARD_SECONDS };
    });
  });
  tellCredits(user, r.value.credits);
  return { credits: r.value.credits == null ? null : visibleCredits(user, r.value.credits), shop: shopView(r.state, now), protectedUntil: r.value.until };
};

/** Why a cell can't be hopped to, or null: a wild yard of the overworld within HOP_CELLS of the main yard. */
export const hopRefusal = (home: { x: number; y: number }, to: { x: number; y: number } | null, under: boolean, attacked: boolean): string | null => {
  if (!to) return "Pick one of your own outposts on the map.";
  const d = hexDistanceWrapped(home.x, home.y, to.x, to.y);
  if (d < 1) return "That's where your yard is now.";
  if (d > HOP_CELLS) return `A Short Hop goes up to ${HOP_CELLS} cells: that outpost is ${d} away.`;
  if (under) return "Your main yard can't move into the Depths.";
  if (attacked) return "That outpost is being attacked right now. Hop once the attack is over.";
  return null;
};

/**
 * Short Hop (23 October, the user's: "short hop should only apply to outposts you have already taken, not just any
 * random wild tribe"): the main yard and one of the player's own outposts up to HOP_CELLS away change places: the
 * main yard stands where the outpost was, the outpost where the main yard was (both kept; the Map Room's Move Main
 * Yard Here costs far more and gives the outpost up). As moves are: one at a time, none mid-attack, then a day before
 * the next. (22 October it moved the main yard onto any wild monster yard nearby.)
 */
export const useHop = async (user: User, baseid: number) => {
  await checkBuyer(user);
  const refuse = (message: string) => new ShopError(message);
  return withMoveLock(user.userid, refuse, async () => {
    const now = getCurrentDateTime();
    const r = await postgres.em.fork().transactional(async (em) => {
      await lockSave(em, user.userid);
      const saves = await sql<{ basesaveid: number; worldid: string | null; cantmovetill: number | null; attackid: number | null; attacks: unknown; outposts: unknown }>(em,
        `SELECT basesaveid, worldid, cantmovetill, attackid, attacks, outposts FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]);
      const save = saves[0];
      if (!save?.worldid) throw refuse("Your yard is not on the map yet.");
      const wait = Number(save.cantmovetill) || 0;
      if (wait > now) throw refuse(`You moved recently: you can move again in ${days(wait - now)}.`);
      const attacked = (attackid: unknown, list: unknown) => {
        const attacks = (Array.isArray(list) ? list : []) as { starttime?: number }[];
        const last = attacks.at(-1);
        return Boolean(Number(attackid)) && !!last && now - Number(last.starttime ?? 0) < 30 * 60;
      };
      if (attacked(save.attackid, save.attacks)) throw refuse("Your yard is being attacked. Move when the attack is over.");
      const homes = await sql<{ cellid: number; x: number; y: number; terrain_height: number; world_id: string }>(em,
        `SELECT cellid, x, y, terrain_height, world_id FROM bym.world_map_cell WHERE uid = ? AND base_type = ? AND map_version = ? AND world_id = ? AND destroyed_at IS NULL FOR UPDATE`,
        [user.userid, MapRoomCell.HOMECELL, MapRoomVersion.V2, save.worldid]);
      const home = homes[0];
      if (!home) throw refuse("Your yard is not on the map yet.");
      const outs = Number.isInteger(baseid) && baseid > 0 ? await sql<{ cellid: number; x: number; y: number; terrain_height: number }>(em,
        `SELECT cellid, x, y, terrain_height FROM bym.world_map_cell WHERE baseid = ? AND uid = ? AND base_type = ? AND map_version = ? AND world_id = ? AND destroyed_at IS NULL FOR UPDATE`,
        [String(baseid), user.userid, MapRoomCell.OUTPOST, MapRoomVersion.V2, home.world_id]) : [];
      const out = outs[0];
      const outSave = out ? (await sql<{ attackid: number | null; attacks: unknown }>(em, `SELECT attackid, attacks FROM bym.save WHERE baseid = ? AND userid = ? AND type = ?`, [String(baseid), user.userid, BaseType.OUTPOST]))[0] : null;
      const to = out ? { x: Number(out.x), y: Number(out.y) } : null;
      const why = hopRefusal({ x: Number(home.x), y: Number(home.y) }, to, !!to && isUnder(to.x, to.y), !!outSave && attacked(outSave.attackid, outSave.attacks));
      if (why || !out || !to) throw refuse(why ?? "Pick one of your own outposts on the map.");
      const { value: credits, state } = await withShop(em, user.userid, (s) => payToUse(em, user, "hop", s));
      // (the two change places: the main yard's cell to the outpost's spot, the outpost's to the main yard's)
      await sql(em, `UPDATE bym.world_map_cell SET x = ?, y = ?, terrain_height = ? WHERE cellid = ? RETURNING cellid`, [to.x, to.y, Number(out.terrain_height), home.cellid]);
      await sql(em, `UPDATE bym.world_map_cell SET x = ?, y = ?, terrain_height = ? WHERE cellid = ? RETURNING cellid`, [Number(home.x), Number(home.y), Number(home.terrain_height), out.cellid]);
      const outposts = (Array.isArray(save.outposts) ? save.outposts : []) as unknown[][];
      const moved = outposts.map((o) => (Array.isArray(o) && String(o[2]) === String(baseid) ? [Number(home.x), Number(home.y), o[2]] : o));
      await sql(em, `UPDATE bym.save SET homebase = CAST(? AS jsonb), outposts = CAST(? AS jsonb), cantmovetill = ? WHERE basesaveid = ? RETURNING basesaveid`,
        [JSON.stringify([String(to.x), String(to.y)]), JSON.stringify(moved), now + HOP_COOLDOWN, save.basesaveid]);
      return { credits, state, from: [Number(home.x), Number(home.y)], to: [to.x, to.y], outposts: moved };
    });
    tellCredits(user, r.credits);
    if (user.save && typeof user.save === "object") {
      const s = user.save as unknown as { homebase?: string[]; cantmovetill?: number; outposts?: unknown[] };
      if ("homebase" in s) s.homebase = [String(r.to[0]), String(r.to[1])];
      if ("cantmovetill" in s) s.cantmovetill = now + HOP_COOLDOWN;
      if ("outposts" in s) s.outposts = r.outposts;
    }
    logger.info(`Short Hop: '${user.username}' and their outpost ${baseid} changed places: ${r.from.join(",")} <-> ${r.to.join(",")}`);
    return { credits: r.credits == null ? null : visibleCredits(user, r.credits), shop: shopView(r.state, now), coords: r.to };
  });
};

/** The champion the player's statues show: one they have unlocked (free to change). */
export const setStatueChampion = async (user: User, champion: unknown, level?: unknown) => {
  if (!shopEnabled()) throw new ShopError("That isn't sold here.");
  const id = String(champion ?? "");
  if (!STATUE_CHAMPIONS.includes(id)) throw new ShopError("Pick one of the champions.");
  const rows = await sql<{ lockerdata: unknown }>(postgres.em, `SELECT lockerdata FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN]);
  if (!unlockedChampions(rows[0]?.lockerdata).includes(id)) throw new ShopError("Unlock that champion in the Strongbox first.");
  // (23 October: and the level it shows, of the champions with three: 4, 5 or 6)
  const levels = STATUE_LEVELS[id];
  const lvl = level == null || level === "" ? null : Number(level);
  if (lvl != null && (!levels || !levels.includes(lvl))) throw new ShopError("Pick level 4, 5 or 6.");
  const now = getCurrentDateTime();
  const r = await postgres.em.fork().transactional((em) => withShop(em, user.userid, (s) => {
    s.statue = id;
    s.statueLevel = levels ? (lvl ?? levels[0]) : null;
  }));
  return { shop: shopView(r.state, now) };
};

/** The champions unlocked in a save's Strongbox data. */
export const unlockedChampions = (lockerdata: unknown): string[] => {
  let v = lockerdata;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return [];
  const data = v as Record<string, { t?: unknown }>;
  return STATUE_CHAMPIONS.filter((id) => Number(data[id]?.t) === 2);
};

/** The champion a yard's statues show (its owner's choice, else their first unlocked one), or null. */
export const statueOf = async (userid: number): Promise<string | null> => {
  if (!shopEnabled() || !userid) return null;
  const state = await shopOf(userid);
  if (state.statue) return statueLook(state.statue, state.statueLevel);
  const rows = await sql<{ lockerdata: unknown }>(postgres.em, `SELECT lockerdata FROM bym.save WHERE userid = ? AND type = ?`, [userid, BaseType.MAIN]);
  return statueLook(unlockedChampions(rows[0]?.lockerdata)[0] ?? null, null);
};

/** A Champion Statue placed from the build menu with a token kept for it: the token spent (the save then pays nothing). */
export const takeStatueToken = async (userid: number): Promise<boolean> => {
  const rows = await sql(postgres.em,
    `UPDATE bym."user" SET io_shop = jsonb_set(io_shop, '{tokens,statue}', to_jsonb(((io_shop->'tokens'->>'statue')::int) - 1))
      WHERE userid = ? AND jsonb_typeof(io_shop->'tokens'->'statue') = 'number' AND (io_shop->'tokens'->>'statue')::int > 0 RETURNING userid`,
    [userid]);
  return rows.length === 1;
};

/** When a yard's pets have treats until (its owner's Pet Treats), or 0. */
export const treatsUntil = async (userid: number): Promise<number> => {
  if (!shopEnabled() || !userid) return 0;
  const t = (await shopOf(userid)).until.treats ?? 0;
  return t > getCurrentDateTime() ? t : 0;
};

/**
 * Raid Insurance: an attack's save took `loss` from an insured player's main yard (by resource, what the server took):
 * half of it comes back. One raid: the first attack that takes something while it is bought ("baseid:attackid"); that
 * attack's later saves are covered too; no other. Returns what comes back (none: {}).
 */
export const insurancePayout = async (userid: number, key: string, loss: Record<string, number>): Promise<Record<string, number>> => {
  if (!shopEnabled() || !userid || !key) return {};
  const lost = Object.entries(loss).filter(([, n]) => Number(n) > 0);
  if (!lost.length) return {};
  const now = getCurrentDateTime();
  const rows = await sql<{ io_shop: unknown }>(postgres.em, `SELECT io_shop FROM bym."user" WHERE userid = ?`, [userid]);
  const peek = parseShop(rows[0]?.io_shop).ins;
  if (!peek || (peek.key ? peek.key !== key : peek.until <= now)) return {};
  const r = await postgres.em.fork().transactional((em) => withShop(em, userid, (s) => {
    const ins = s.ins;
    if (!ins) return {};
    if (ins.key ? ins.key !== key : ins.until <= now) return {};
    const back: Record<string, number> = {};
    for (const [k, n] of lost) back[k] = Math.floor(Number(n) / 2);
    ins.key = key;
    ins.at = ins.at ?? now;
    ins.paid = ins.paid ?? {};
    for (const [k, n] of Object.entries(back)) ins.paid[k] = (ins.paid[k] ?? 0) + n;
    delete ins.told;
    return back;
  }));
  return r.value;
};

/**
 * What a player is to be told when their yard loads, once: gifts from alliance members, and what Raid Insurance paid
 * back. Taken off their state as it is read.
 */
export const takeShopNotices = async (userid: number): Promise<{ gifts: Gift[]; insurance: Record<string, number> | null }> => {
  if (!shopEnabled() || !userid) return { gifts: [], insurance: null };
  const peek = await shopOf(userid);
  const insurancePaid = peek.ins?.paid && !peek.ins.told;
  if (!peek.gifts.length && !insurancePaid) return { gifts: [], insurance: null };
  const r = await postgres.em.fork().transactional((em) => withShop(em, userid, (s) => {
    const gifts = s.gifts;
    s.gifts = [];
    let insurance: Record<string, number> | null = null;
    if (s.ins?.paid && !s.ins.told) {
      insurance = s.ins.paid;
      s.ins.told = getCurrentDateTime();
    }
    return { gifts, insurance };
  }));
  return r.value;
};

/** (Migration 20261112_IoShop does the same) the columns and the power-ups' check, made if missing at start. */
export const ensureIoShop = async (): Promise<void> => {
  const run = (q: string) => postgres.em.getConnection().execute(q);
  await run(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS io_shop jsonb NULL`);
  await run(`ALTER TABLE bym.pet ADD COLUMN IF NOT EXISTS coat varchar(16) NULL`);
  await run(`ALTER TABLE bym.pet ADD COLUMN IF NOT EXISTS tag varchar(8) NULL`);
  await run(`ALTER TABLE bym.alliance_powerup DROP CONSTRAINT IF EXISTS alliance_powerup_type_check`);
  await run(`ALTER TABLE bym.alliance_powerup ADD CONSTRAINT alliance_powerup_type_check
    CHECK (powerup IN ('ap_armament', 'ap_conquest', 'ap_declarewar', 'ap_harvestmoon', 'ap_buildersguild'))`);
  // (22 October, later: migration 20261113_PowerupTiers) a power-up's tier and its planned start
  await run(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS tier smallint NOT NULL DEFAULT 1`);
  await run(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_at integer NULL`);
  await run(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_tier smallint NULL`);
  await run(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_by integer NULL`);
};
