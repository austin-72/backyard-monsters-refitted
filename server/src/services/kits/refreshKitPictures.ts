import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { renderKitPictures, type KitBuilding } from "./kitPreview.js";

/**
 * Inferno-only: the kit pictures are drawn once, when a kit is saved, with the building art of the day. When the
 * art or the way it is drawn changes, KIT_PICTURES goes up by one and every kit's pictures are drawn again at the
 * next server start, from the layouts already stored: the server's kits (public/assets/kits/inferno-kits.json, its
 * `pictures` field says which drawing they have) and every player's own kits (users' player_kits; a marker file,
 * public/assets/kits/player/.pictures, says which drawing they have). Picture file names do not change.
 *
 *   2 (29 September): every level band of the generators, the outpost hall's Inferno art, anim2 and anim3
 *     (the Magma Pump's chimney, the Coal and Sulfur works' moving parts), the Cinder Coil and Obsidian Mortar.
 *   3 (29 September, evening): the Monster Juicer's restyled art (inferno_juicer_v2.zip).
 */
export const KIT_PICTURES = 3;

const KIT_DIR = path.join(process.cwd(), "public", "assets", "kits");
const KIT_FILE = path.join(KIT_DIR, "inferno-kits.json");
const PLAYER_DIR = path.join(KIT_DIR, "player");
const PLAYER_MARKER = path.join(PLAYER_DIR, ".pictures");

/** Server kits: returns how many were drawn again (0 when they are already up to date). */
export const refreshServerKits = (): number => {
  if (!existsSync(KIT_FILE)) return 0;
  const file = JSON.parse(readFileSync(KIT_FILE, "utf8"));
  if (Number(file.pictures) >= KIT_PICTURES) return 0;
  let drawn = 0;
  (file.kits ?? []).forEach((kit: { slot?: number; buildings?: Record<string, KitBuilding> } | null, i: number) => {
    if (!kit || !kit.buildings) return;
    const slot = Number(kit.slot) || i + 1;
    const pictures = renderKitPictures(Object.values(kit.buildings));
    writeFileSync(path.join(KIT_DIR, `kit-${slot}.png`), pictures.thumb);
    writeFileSync(path.join(KIT_DIR, `kit-${slot}-large.png`), pictures.large);
    drawn++;
  });
  file.pictures = KIT_PICTURES;
  // (the client asks for the pictures with ?v=<version>: a new version fetches the new ones)
  file.version = Date.now();
  writeFileSync(KIT_FILE, JSON.stringify(file, null, 2));
  return drawn;
};

/** Players' kits: returns how many were drawn again. */
export const refreshPlayerKits = async (): Promise<number> => {
  if (existsSync(PLAYER_MARKER) && Number(readFileSync(PLAYER_MARKER, "utf8")) >= KIT_PICTURES) return 0;
  const conn = postgres.em.getConnection();
  const rows = (await conn.execute(`SELECT player_kits FROM bym."user" WHERE player_kits IS NOT NULL`, [], "all")) as { player_kits: unknown }[];
  let drawn = 0;
  for (const row of rows) {
    const kits = (typeof row.player_kits === "string" ? JSON.parse(row.player_kits) : row.player_kits) as
      | ({ image?: string; buildings?: Record<string, KitBuilding> } | null)[]
      | null;
    for (const kit of kits ?? []) {
      if (!kit || !kit.buildings || !kit.image || !/^[a-f0-9]{24}$/.test(kit.image)) continue;
      const pictures = renderKitPictures(Object.values(kit.buildings));
      writeFileSync(path.join(PLAYER_DIR, `${kit.image}.png`), pictures.thumb);
      writeFileSync(path.join(PLAYER_DIR, `${kit.image}-large.png`), pictures.large);
      drawn++;
    }
  }
  if (existsSync(PLAYER_DIR) || drawn > 0) writeFileSync(PLAYER_MARKER, String(KIT_PICTURES));
  return drawn;
};

/** At startup: both, logged, never stopping the server. */
export const refreshKitPictures = async () => {
  try {
    const server = refreshServerKits();
    const players = await refreshPlayerKits();
    if (server || players) logger.info(`Kit pictures drawn again (drawing ${KIT_PICTURES}): ${server} server kits, ${players} player kits`);
  } catch (err) {
    logger.warn(`Kit pictures could not be drawn again: ${err}`);
  }
};
