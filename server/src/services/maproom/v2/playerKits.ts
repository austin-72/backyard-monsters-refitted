import { randomBytes } from "crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { Save } from "../../../database/models/save.model.js";
import { renderKitPictures, type KitBuilding } from "../../kits/kitPreview.js";
import { User, type PlayerKit } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres, redis } from "../../../server.js";
import { logger } from "../../../utils/logger.js";

/**
 * Inferno-only: every player has 6 kit slots of their own (pages 3 and 4 of the kit popup, slots 7-12),
 * seen by nobody else. (QoL #337, 15 October: 6, was 3; a kit can be renamed or deleted.)
 * Saving copies the layout of one of their outposts as it is stored on the
 * server (the client saves the outpost first, so this is its current state): every building an
 * outpost can build, with its position and current level. Decorations are not saved. The price is worked out by the
 * client from the building costs (InfernoKits.customCosts); player kits cannot be bought with shiny.
 *
 * Each saved kit gets the same two pictures as the server's kits (services/kits/kitPreview.ts),
 * written to public/assets/kits/player/<random id>.png and <random id>-large.png.
 */

// (QoL #337: 6 slots, was 3; kits saved in slots 1-3 stay where they are)
export const PLAYER_KIT_SLOTS = 6;

/** The kit popup cannot place more than this, and applyKit refuses more. */
const MAX_BUILDINGS = 600;

const OUTPOST_HALL = 112;

/**
 * What a devil outpost can build (client: GLOBAL.IO_OUTPOST_QUANTITY). Only these go into a player kit;
 * decorations and anything else stay behind. Keep the two lists in step.
 */
export const OUTPOST_BUILDINGS = new Set([
  1, 2, 3, 4, // bone, coal, sulfur, magma harvesters
  5, // flinger
  9, // monster juicer
  10, // yard planner
  13, // hatchery
  16, // hatchery control center
  17, // bone blocks
  21, // sharpshooter tower
  24, // booby trap
  117, // heavy trap (21 November: 2 an outpost)
  128, // compound
  129, // quake tower
  130, // blast tower
  132, // magma tower
  144, // cinder coil
  145, // obsidian mortar
]);

export class PlayerKitError extends Error {}

const PICTURE_DIR = path.join(process.cwd(), "public", "assets", "kits", "player");

export const removePictures = (image?: string) => {
  if (!image || !/^[a-f0-9]{24}$/.test(image)) return;
  for (const file of [`${image}.png`, `${image}-large.png`]) rmSync(path.join(PICTURE_DIR, file), { force: true });
};

/** Draws the kit's pictures and returns their file stem, or undefined if they could not be written. */
const writePictures = (buildings: PlayerKit["buildings"]) => {
  try {
    const image = randomBytes(12).toString("hex");
    const pictures = renderKitPictures(Object.values(buildings) as KitBuilding[]);
    if (!existsSync(PICTURE_DIR)) mkdirSync(PICTURE_DIR, { recursive: true });
    writeFileSync(path.join(PICTURE_DIR, `${image}.png`), pictures.thumb);
    writeFileSync(path.join(PICTURE_DIR, `${image}-large.png`), pictures.large);
    return image;
  } catch (err) {
    logger.error(`Player kit pictures could not be written: ${err}`);
    return undefined;
  }
};

const toInt = (value: unknown) => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);

export const playerKits = (user: User): (PlayerKit | null)[] => {
  const stored = Array.isArray(user.player_kits) ? user.player_kits : [];
  return Array.from({ length: PLAYER_KIT_SLOTS }, (_, i) => stored[i] ?? null);
};

export const KIT_NAME_MAX = 24;

/** A kit name as the player typed it: one line of plain text, no markup, at most KIT_NAME_MAX characters. */
export const cleanKitName = (name: unknown, slot: number) => {
  const cleaned = String(name ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f<>&"]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, KIT_NAME_MAX);
  return cleaned || `My Kit ${slot}`;
};

/** Saves one of the player's outposts into kit slot 1-6, replacing what was there. */
export const savePlayerKit = async (user: User, baseid: string, slot: number, name?: unknown) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > PLAYER_KIT_SLOTS) throw new PlayerKitError("There is no such kit slot.");

  const outpost = await postgres.em.findOne(Save, { baseid, type: BaseType.OUTPOST, saveuserid: user.userid });
  if (!outpost) throw new PlayerKitError("You can only save your own outposts as kits.");

  const buildings: PlayerKit["buildings"] = {};
  let nextId = 1;

  for (const building of Object.values((outpost.buildingdata ?? {}) as Record<string, Record<string, unknown>>)) {
    const type = toInt(building?.t);
    const x = toInt(building?.X);
    const y = toInt(building?.Y);
    if (type === null || type <= 0 || x === null || y === null) continue;

    if (type === OUTPOST_HALL) {
      buildings["0"] = { t: OUTPOST_HALL, X: x, Y: y, id: 0 };
      // (13 November) and how far the hall is calcified: the user's "saved kits are not saving with the calcification"
      const hallFort = toInt(building.fort);
      if (hallFort !== null && hallFort >= 1) buildings["0"].fort = Math.min(hallFort, 4);
      continue;
    }

    if (!OUTPOST_BUILDINGS.has(type)) continue; // decorations and anything an outpost cannot build

    buildings[String(nextId)] = { t: type, X: x, Y: y, id: nextId, prefab: Math.min(Math.max(1, toInt(building.l) ?? 1), 50) };
    // (12 November) and how far it is calcified: built so again, and in the kit's price
    const fort = toInt(building.fort);
    if (fort !== null && fort >= 1) buildings[String(nextId)].fort = Math.min(fort, 4);
    nextId++;
  }

  const count = Object.keys(buildings).filter((key) => key !== "0").length;
  if (count === 0) throw new PlayerKitError("This outpost has no buildings to save.");
  if (count > MAX_BUILDINGS) throw new PlayerKitError("This outpost has too many buildings to save as a kit.");

  const kits = playerKits(user);
  const replaced = kits[slot - 1]?.image;
  // (QoL #492: the kit it replaces is kept 7 days, for Restore)
  await keepPreviousKit(user.userid, slot, kits[slot - 1]);
  kits[slot - 1] = { name: cleanKitName(name, slot), savedAt: Math.floor(Date.now() / 1000), buildings, image: writePictures(buildings) };
  user.player_kits = kits;
  await postgres.em.flush();
  removePictures(replaced);

  logger.info(`Player kit ${slot} saved by user ${user.userid} from outpost ${baseid}: ${count} buildings.`);
  return kits;
};

/** (QoL #337) The kit in slot 1-6, or an error when the slot is not there or empty. */
const filledSlot = (user: User, slot: number) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > PLAYER_KIT_SLOTS) throw new PlayerKitError("There is no such kit slot.");
  const kits = playerKits(user);
  const kit = kits[slot - 1];
  if (!kit) throw new PlayerKitError("That kit slot is empty.");
  return { kits, kit };
};

/** (QoL #337) Renames the kit in slot 1-6 (cleaned as when it was saved). Answers every slot. */
export const renamePlayerKit = async (user: User, slot: number, name: unknown) => {
  const { kits, kit } = filledSlot(user, slot);
  const renamed = { ...kit, name: cleanKitName(name, slot) };
  kits[slot - 1] = renamed;
  await postgres.em.nativeUpdate(User, { userid: user.userid }, { player_kits: kits });
  user.player_kits = kits;
  logger.info(`Player kit ${slot} of user ${user.userid} renamed "${kit.name}" -> "${renamed.name}".`);
  return kits;
};

/** (QoL #337) Empties slot 1-6 and removes the kit's pictures. Answers every slot. */
export const deletePlayerKit = async (user: User, slot: number) => {
  const { kits, kit } = filledSlot(user, slot);
  // (QoL #492: a deleted kit is kept 7 days too, for Restore)
  await keepPreviousKit(user.userid, slot, kit);
  kits[slot - 1] = null;
  await postgres.em.nativeUpdate(User, { userid: user.userid }, { player_kits: kits });
  user.player_kits = kits;
  removePictures(kit.image);
  logger.info(`Player kit ${slot} of user ${user.userid} ("${kit.name}") deleted.`);
  return kits;
};

// ---- Inferno-only (QoL #492, 15 October): a kit saved over or deleted is kept 7 days, one a slot, and can be restored

export const KIT_PREVIOUS_SEC = 7 * 24 * 60 * 60;

const previousKey = (userid: number, slot: number) => `io:kit:prev:${userid}:${slot}`;

interface PreviousKit {
  name: string;
  savedAt: number;
  buildings: PlayerKit["buildings"];
  /** When it was replaced (seconds). */
  at: number;
}

/** Keeps a kit as its slot's earlier version (its pictures are drawn again if it is restored). A Redis failure is logged. */
const keepPreviousKit = async (userid: number, slot: number, kit: PlayerKit | null | undefined) => {
  if (!kit || !kit.buildings) return;
  const kept: PreviousKit = { name: kit.name, savedAt: Number(kit.savedAt) || 0, buildings: kit.buildings, at: Math.floor(Date.now() / 1000) };
  try {
    await redis.set(previousKey(userid, slot), JSON.stringify(kept), "EX", String(KIT_PREVIOUS_SEC));
  } catch (err) {
    logger.warn(`Player kit ${slot} of user ${userid}: the earlier version could not be kept: ${err}`);
  }
};

const previousKit = async (userid: number, slot: number): Promise<PreviousKit | null> => {
  try {
    const raw = await redis.get(previousKey(userid, slot));
    if (!raw) return null;
    const parsed = JSON.parse(String(raw)) as PreviousKit;
    return parsed && parsed.buildings && typeof parsed.buildings === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** The kit slots (1-6) with an earlier version still kept: [{ slot, name, savedAt, at, until, count }]. */
export const previousPlayerKits = async (user: User) => {
  const found = await Promise.all(Array.from({ length: PLAYER_KIT_SLOTS }, (_, i) => previousKit(user.userid, i + 1)));
  const out: { slot: number; name: string; savedAt: number; at: number; until: number; count: number }[] = [];
  found.forEach((prev, i) => {
    if (prev) {
      const count = Object.keys(prev.buildings).filter((key) => key !== "0").length;
      out.push({ slot: i + 1, name: prev.name, savedAt: prev.savedAt, at: prev.at, until: prev.at + KIT_PREVIOUS_SEC, count });
    }
  });
  return out;
};

/**
 * Puts a slot's earlier version back (1-6), with its pictures drawn again. What the slot has now becomes its earlier
 * version in turn (so a Restore can itself be undone); an empty slot just gets the kit back. Answers every slot.
 */
export const restorePlayerKit = async (user: User, slot: number) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > PLAYER_KIT_SLOTS) throw new PlayerKitError("There is no such kit slot.");
  const prev = await previousKit(user.userid, slot);
  if (!prev) throw new PlayerKitError("There's no earlier version of that kit (they are kept 7 days).");
  const kits = playerKits(user);
  const current = kits[slot - 1];
  const restored: PlayerKit = { name: cleanKitName(prev.name, slot), savedAt: Math.floor(Number(prev.savedAt) || Date.now() / 1000), buildings: prev.buildings, image: writePictures(prev.buildings) };
  kits[slot - 1] = restored;
  await postgres.em.nativeUpdate(User, { userid: user.userid }, { player_kits: kits });
  user.player_kits = kits;
  if (current) {
    await keepPreviousKit(user.userid, slot, current);
    removePictures(current.image);
  } else {
    await redis.del(previousKey(user.userid, slot)).catch(() => 0);
  }
  logger.info(`Player kit ${slot} of user ${user.userid}: the earlier version ("${restored.name}") restored.`);
  return kits;
};
