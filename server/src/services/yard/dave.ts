import type { User } from "../../database/models/user.model.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { hfoFinalWaveWon } from "../events/hfo.js";
import { refreshChatUser } from "../../chat/chatControl.js";
import { BaseType } from "../../enums/Base.js";
import { isShinyLocked, visibleCredits } from "../user/shinyLock.js";
import { acceptedInvites, INVITE_UNLOCKS, inviteLockText, inviteLooksFree, invitesForLooks } from "../user/referrals.js";
import { outpostsHeld, playerLevel } from "./terrain.js";

/**
 * Inferno-only (10 October): the D.A.V.E. Club's choices besides the ground (that one: terrain.ts), kept on the
 * player (bym.user.io_dave):
 *
 *   chatColor   the colour of the player's name in chat (one of CHAT_COLORS; none: black)
 *   workerSkin  "inferno" (the Inferno's imps, the default), "overworld" (the overworld's builders), or (27 November)
 *               "frog" / "frog_red" (frogs that hop): the
 *               player's workers in every yard of theirs, as everyone sees them
 *   champSkins  { IC9: "frozen", IC10: "frozen" }: Korath's and Drull's frozen look, once Hell Freezes Over's last
 *               wave is won: the player's own Korath and Drull, at home, in attacks and to visitors
 *               (14 October) and the five champions' skins bought for Shiny (SHINY_SKINS: { IC24: "void" }...)
 *   ownedSkins  ["IC9.molten", ...]: the Shiny skins the player has bought (each champion's separately), theirs for good
 *
 * The chat reads the colour at sign-in and when it changes (chatControl's refresh); the yard's choices go out with
 * every load of the player's yards (io_dave), the player's own with the flags (io_dave too).
 */

export const CHAT_COLORS: Record<string, string> = {
  ember: "#D2491A",
  lava: "#E07000",
  gold: "#A87A00",
  moss: "#3E7D1E",
  emerald: "#0E8A5F",
  teal: "#0F7C8C",
  frost: "#2B8FD6",
  violet: "#7B3FBF",
  plum: "#9C2F8E",
  rose: "#C2185B",
  bone: "#8A7550",
  slate: "#4F5F70",
};

/**
 * Name effects (12 October), opened by inviting friends (INVITE_UNLOCKS.nameFx: 1, 2, 3 accepted). Kept in chatColor
 * like a colour; the chat sends their spec, which the game draws (BYMChat.ioNameHtml):
 *   grad:#a,#b        the name shaded from one colour to the next, letter by letter
 *   shine:#a,#b,#c    shaded through three, a bright light sweeping across it
 *   flow:#a,#b,...    the colours flowing along the name all the time
 * (A game too old to know them shows the name black; a game from before chat colours shows it as ever.)
 */
export const NAME_FX: Record<string, { name: string; spec: string }> = {
  fx_ember: { name: "Ember Glow", spec: "grad:#B0170B,#D8A000" },
  fx_brimstone: { name: "Brimstone", spec: "shine:#5E1A8C,#C2185B,#E65100" },
  fx_soulfire: { name: "Soulfire", spec: "flow:#1565C0,#00838F,#6A1B9A,#C2185B,#1565C0" },
  // (27 November, 72's suggestion: "more name colorings/animations based on outpost count and player level") new
  // moves the game draws (IoDave.fxHtml): pulse (the whole name breathing between two colours), fire (each letter
  // flickering through its colours), beat (a heartbeat: two quick throbs, then rest), spark (shaded, letters
  // twinkling bright now and then), chase (shaded, a bright band running back and forth)
  fx_sulfur: { name: "Sulfur Pulse", spec: "pulse:#7A6A00,#D8E030" },
  fx_magma: { name: "Magma Flow", spec: "flow:#7A1000,#E04000,#FFA000,#E04000,#7A1000" },
  fx_witchfire: { name: "Witchfire", spec: "fire:#0B5A20,#20A040,#90FF70" },
  fx_bloodstone: { name: "Heartstone", spec: "beat:#5A0010,#E01030" },
  fx_gilded: { name: "Gilded", spec: "spark:#7A5600,#D8A800,#FFF4C0" },
  fx_cinder: { name: "Cinder", spec: "fire:#4A1206,#C03A10,#FFB040" },
  fx_amethyst: { name: "Amethyst", spec: "chase:#3A1060,#8A40D0,#F0D0FF" },
  fx_hellforge: { name: "Hellforge", spec: "chase:#3A0A02,#C04010,#FFE0A0" },
};

/** (27 November) The name effects opened by holding outposts (as the grounds: terrain.ts), and by the player's level. */
export const NAME_FX_OUTPOSTS: Record<string, number> = { fx_sulfur: 50, fx_magma: 100, fx_witchfire: 250, fx_bloodstone: 500, fx_gilded: 1000 };
export const NAME_FX_LEVELS: Record<string, number> = { fx_cinder: 30, fx_amethyst: 40, fx_hellforge: 50 };

/** A chatColor's look for the chat: a colour's #hex or a name effect's spec, or null. */
// (13 October: own keys only: "constructor" or "toString" passed as a colour and was stored)
const isColor = (c: string) => Object.hasOwn(CHAT_COLORS, c);
const isFx = (c: string) => Object.hasOwn(NAME_FX, c);
const lookOf = (c: string | null | undefined): string | null => (c ? ((isColor(c) ? CHAT_COLORS[c] : null) ?? (isFx(c) ? NAME_FX[c].spec : null)) : null);

// (27 November, 72's suggestion) and the frogs, green and red, that hop all around
export const WORKER_SKINS = ["inferno", "overworld", "frog", "frog_red"] as const;
/** (14 October) Korath, Drull, Ashkarr, Rimegrave and the Basilisk. */
export const CHAMPIONS = ["IC9", "IC10", "IC24", "IC25", "IC32"] as const;
/**
 * The frozen look (Korath and Drull, from Hell Freezes Over) and the skins sold for Shiny (every champion). 26 October,
 * the user's: "Add 4 more champion skins per each champion. 3 that only cost 200 shiny and once that costs 600 (solid
 * gold)": Crimson, Abyss and Storm, and Solid Gold.
 */
export const SHINY_SKINS = ["molten", "void", "gilded", "bone", "venom", "crimson", "abyss", "storm", "solidgold"] as const;
export const CHAMP_SKINS = ["frozen", ...SHINY_SKINS] as const;
/** A Shiny skin's price, each champion's each (SKIN_PRICES; the first five SKIN_PRICE). */
export const SKIN_PRICE = 400;
export const SKIN_PRICES: Record<string, number> = { crimson: 200, abyss: 200, storm: 200, solidgold: 600 };
export const skinPrice = (skin: string) => SKIN_PRICES[skin] ?? SKIN_PRICE;
const FROZEN_CHAMPIONS = ["IC9", "IC10"];
const isShinySkin = (s: string) => (SHINY_SKINS as readonly string[]).includes(s);

export interface DaveChoices {
  chatColor?: string | null;
  workerSkin?: string | null;
  champSkins?: Record<string, string>;
  ownedSkins?: string[];
}

export class DaveError extends Error {}

const parse = (raw: unknown): DaveChoices => {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object") return {};
    const out: DaveChoices = {};
    const c = (v as DaveChoices).chatColor;
    if (typeof c === "string" && (isColor(c) || isFx(c))) out.chatColor = c;
    const w = (v as DaveChoices).workerSkin;
    if (w && (WORKER_SKINS as readonly string[]).includes(w)) out.workerSkin = w;
    const s = (v as DaveChoices).champSkins;
    if (s && typeof s === "object") {
      out.champSkins = {};
      for (const k of CHAMPIONS) if ((CHAMP_SKINS as readonly string[]).includes(String(s[k]))) out.champSkins[k] = String(s[k]);
    }
    const o = (v as DaveChoices).ownedSkins;
    if (Array.isArray(o)) {
      out.ownedSkins = [...new Set(o.map(String).filter((x) => {
        const [c, k] = x.split(".");
        return (CHAMPIONS as readonly string[]).includes(c) && isShinySkin(k);
      }))];
    }
    return out;
  } catch {
    return {};
  }
};

export const readDave = async (userid: number): Promise<DaveChoices> => {
  if (!infernoOnlyConfig.enabled || !userid) return {};
  const rows = (await postgres.em.getConnection().execute(`SELECT io_dave FROM bym."user" WHERE userid = ?`, [userid])) as { io_dave: unknown }[];
  return parse(rows[0]?.io_dave);
};

/** A player's name colour for the chat (a #hex, or a name effect's spec), or null. */
export const chatColorOf = async (userid: number): Promise<string | null> => {
  const d = await readDave(userid);
  return lookOf(d.chatColor);
};

/** The colours of several players' names, for the chat's history. */
export const chatColorsOf = async (userids: number[]): Promise<Map<number, string>> => {
  const out = new Map<number, string>();
  if (!infernoOnlyConfig.enabled || !userids.length) return out;
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT userid, io_dave->>'chatColor' AS c FROM bym."user" WHERE userid IN (${userids.map(() => "?").join(",")})`, userids)) as { userid: number; c: string | null }[];
  for (const r of rows) {
    const look = lookOf(r.c);
    if (look) out.set(Number(r.userid), look);
  }
  return out;
};

/** What a yard's visitors see of its owner's choices. */
export const daveForYard = async (userid: number) => {
  const d = await readDave(userid);
  return { workerSkin: d.workerSkin ?? "inferno", champSkins: d.champSkins ?? {} };
};

/** The player's own, with what the window can offer them. */
export const daveForOwner = async (userid: number) => {
  const d = await readDave(userid);
  const frozen = await hfoFinalWaveWon(userid).catch(() => false);
  const invites = await acceptedInvites(userid).catch(() => 0);
  const nameFx = Object.entries(NAME_FX).map(([id, fx]) => ({ id, name: fx.name, spec: fx.spec, need: INVITE_UNLOCKS.nameFx[id] ?? 0, needOutposts: NAME_FX_OUTPOSTS[id] ?? 0, needLevel: NAME_FX_LEVELS[id] ?? 0 }));
  return {
    chatColor: d.chatColor ?? null,
    workerSkin: d.workerSkin ?? "inferno",
    champSkins: d.champSkins ?? {},
    // (14 October) the Shiny skins bought, and their price
    ownedSkins: d.ownedSkins ?? [],
    skinPrice: SKIN_PRICE,
    // (26 October) each skin's own price
    skinPrices: Object.fromEntries(SHINY_SKINS.map((s) => [s, skinPrice(s)])),
    chatColors: CHAT_COLORS,
    frozenUnlocked: frozen,
    // (12 October) the invite-only looks: the name effects, and how many friends have joined through the link
    nameFx,
    invites,
    // (admins and moderators: every invite-only look, without inviting)
    inviteFree: await inviteLooksFree(userid).catch(() => false),
    inviteGrounds: INVITE_UNLOCKS.grounds,
    // (27 November) what opens the outpost and level looks: how many outposts the player holds, and their level
    outposts: await outpostsHeld(userid).catch(() => 0),
    level: await playerLevel(userid).catch(() => 0),
  };
};

/** A choice made: key chatColor (a colour's name, or "" for none), workerSkin, or champSkin.IC9 / champSkin.IC10 ("frozen" or ""). */
export const setDave = async (user: User, key: string, raw: unknown) => {
  if (!infernoOnlyConfig.enabled) throw new DaveError("The D.A.V.E. Club isn't open here.");
  const value = String(raw ?? "");
  const now = await readDave(user.userid);
  if (key === "chatColor") {
    if (value && !isColor(value) && !isFx(value)) throw new DaveError("There is no such colour.");
    const need = isFx(value) ? Number(INVITE_UNLOCKS.nameFx[value] ?? 0) : 0;
    if (need > 0) {
      if ((await invitesForLooks(user.userid)) < need) throw new DaveError(inviteLockText(need, await acceptedInvites(user.userid)));
    }
    const outpostsNeed = NAME_FX_OUTPOSTS[value] ?? 0;
    if (outpostsNeed > 0) {
      const held = await outpostsHeld(user.userid);
      if (held < outpostsNeed) throw new DaveError(`Hold ${outpostsNeed.toLocaleString("en-US")} outposts to have this look (you hold ${held.toLocaleString("en-US")}).`);
    }
    const levelNeed = NAME_FX_LEVELS[value] ?? 0;
    if (levelNeed > 0) {
      const level = await playerLevel(user.userid);
      if (level < levelNeed) throw new DaveError(`Reach level ${levelNeed} to have this look (you are level ${level}).`);
    }
    now.chatColor = value || null;
  } else if (key === "workerSkin") {
    if (!(WORKER_SKINS as readonly string[]).includes(value)) throw new DaveError("There is no such look for workers.");
    now.workerSkin = value;
  } else if (key.startsWith("champSkin.") && (CHAMPIONS as readonly string[]).includes(key.slice("champSkin.".length))) {
    const id = key.slice("champSkin.".length);
    if (value && !(CHAMP_SKINS as readonly string[]).includes(value)) throw new DaveError("There is no such look.");
    if (value === "frozen" && !FROZEN_CHAMPIONS.includes(id)) throw new DaveError("There is no such look.");
    if (value === "frozen" && !(await hfoFinalWaveWon(user.userid).catch(() => false))) throw new DaveError("Win the last wave of Hell Freezes Over to freeze your champions.");
    if (isShinySkin(value) && !(now.ownedSkins ?? []).includes(`${id}.${value}`)) throw new DaveError(`Buy that skin first (${skinPrice(value)} Shiny).`);
    now.champSkins = { ...(now.champSkins ?? {}) };
    if (value) now.champSkins[id] = value;
    else delete now.champSkins[id];
  } else {
    throw new DaveError("There is no such choice.");
  }
  // (18 October, SUSPECTED-BUGS.md: the whole record was written back from a copy read without a lock, so a skin
  // bought at the same moment was lost) only the choice made is written
  const conn = postgres.em.getConnection();
  if (key.startsWith("champSkin.")) {
    const id = key.slice("champSkin.".length);
    if (now.champSkins?.[id])
      await conn.execute(
        `UPDATE bym."user" SET io_dave = jsonb_set(COALESCE(io_dave, '{}'::jsonb) || jsonb_build_object('champSkins', COALESCE(io_dave->'champSkins', '{}'::jsonb)), ARRAY['champSkins', ?::text], to_jsonb(?::text)) WHERE userid = ? RETURNING userid`,
        [id, now.champSkins[id], user.userid]
      );
    else await conn.execute(`UPDATE bym."user" SET io_dave = COALESCE(io_dave, '{}'::jsonb) #- ARRAY['champSkins', ?::text] WHERE userid = ? RETURNING userid`, [id, user.userid]);
  } else {
    const patch = key === "chatColor" ? { chatColor: now.chatColor ?? null } : { workerSkin: now.workerSkin };
    await conn.execute(`UPDATE bym."user" SET io_dave = COALESCE(io_dave, '{}'::jsonb) || CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(patch), user.userid]);
  }
  if (key === "chatColor") await refreshChatUser(user.userid).catch(() => undefined);
  return daveForOwner(user.userid);
};

/**
 * (14 October, the user's) A champion's Shiny skin bought (key champSkin.IC24, value one of SHINY_SKINS) and put on:
 * the Shiny taken and the skin recorded in one transaction, the main yard's save locked (as pets do: two sent at once
 * can't spend the same Shiny). Already owned: just put on, for nothing.
 */
export const buyDave = async (user: User, key: string, raw: unknown) => {
  if (!infernoOnlyConfig.enabled) throw new DaveError("The D.A.V.E. Club isn't open here.");
  const id = key.startsWith("champSkin.") ? key.slice("champSkin.".length) : "";
  const skin = String(raw ?? "");
  if (!(CHAMPIONS as readonly string[]).includes(id) || !isShinySkin(skin)) throw new DaveError("There is no such skin.");
  const own = `${id}.${skin}`;
  if ((await readDave(user.userid)).ownedSkins?.includes(own)) return { dave: await setDave(user, key, skin), credits: null };
  if (isShinyLocked(user)) throw new DaveError("Shiny is turned off on your account, so you can't buy skins.");
  const price = skinPrice(skin);
  const credits = await postgres.em.fork().transactional(async (em) => {
    const conn = em.getConnection();
    const bal = (await conn.execute(`SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN], "all", em.getTransactionContext())) as { credits: number }[];
    if (!bal.length) throw new DaveError("Your yard could not be found.");
    if (Number(bal[0].credits) < price) throw new DaveError(`That skin costs ${price} Shiny: you don't have enough.`);
    const rows = (await conn.execute(`SELECT io_dave FROM bym."user" WHERE userid = ? FOR UPDATE`, [user.userid], "all", em.getTransactionContext())) as { io_dave: unknown }[];
    const d = parse(rows[0]?.io_dave);
    if (d.ownedSkins?.includes(own)) return null;
    const paid = (await conn.execute(
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
      [price, user.userid, BaseType.MAIN, price], "all", em.getTransactionContext())) as { credits: number }[];
    if (paid.length !== 1) throw new DaveError(`That skin costs ${price} Shiny: you don't have enough.`);
    d.ownedSkins = [...(d.ownedSkins ?? []), own];
    d.champSkins = { ...(d.champSkins ?? {}), [id]: skin };
    await conn.execute(`UPDATE bym."user" SET io_dave = CAST(? AS jsonb) WHERE userid = ? RETURNING userid`, [JSON.stringify(d), user.userid], "all", em.getTransactionContext());
    return Number(paid[0].credits);
  });
  // (the request's own copy of the save must not later write back an older balance)
  if (credits != null && user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
  return { dave: await daveForOwner(user.userid), credits: credits == null ? null : visibleCredits(user, credits) };
};
