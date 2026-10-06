import { randomBytes } from "crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { Save } from "../../../database/models/save.model.js";
import { renderKitPictures, type KitBuilding } from "../../kits/kitPreview.js";
import { User, type PlayerKit } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres } from "../../../server.js";
import { logger } from "../../../utils/logger.js";

/**
 * Inferno-only: every player has 3 kit slots of their own (page 3 of the kit popup, slots 7-9),
 * seen by nobody else. Saving copies the layout of one of their outposts as it is stored on the
 * server (the client saves the outpost first, so this is its current state): every building an
 * outpost can build, with its position and current level. Decorations are not saved. The price is worked out by the
 * client from the building costs (InfernoKits.customCosts); player kits cannot be bought with shiny.
 *
 * Each saved kit gets the same two pictures as the server's kits (services/kits/kitPreview.ts),
 * written to public/assets/kits/player/<random id>.png and <random id>-large.png.
 */

export const PLAYER_KIT_SLOTS = 3;

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

/** Saves one of the player's outposts into kit slot 1-3, replacing what was there. */
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
      continue;
    }

    if (!OUTPOST_BUILDINGS.has(type)) continue; // decorations and anything an outpost cannot build

    buildings[String(nextId)] = { t: type, X: x, Y: y, id: nextId, prefab: Math.min(Math.max(1, toInt(building.l) ?? 1), 50) };
    nextId++;
  }

  const count = Object.keys(buildings).filter((key) => key !== "0").length;
  if (count === 0) throw new PlayerKitError("This outpost has no buildings to save.");
  if (count > MAX_BUILDINGS) throw new PlayerKitError("This outpost has too many buildings to save as a kit.");

  const kits = playerKits(user);
  const replaced = kits[slot - 1]?.image;
  kits[slot - 1] = { name: cleanKitName(name, slot), savedAt: Math.floor(Date.now() / 1000), buildings, image: writePictures(buildings) };
  user.player_kits = kits;
  await postgres.em.flush();
  removePictures(replaced);

  logger.info(`Player kit ${slot} saved by user ${user.userid} from outpost ${baseid}: ${count} buildings.`);
  return kits;
};
