import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { WorldMapCell } from "../../database/models/worldmapcell.model.js";
import { BaseType } from "../../enums/Base.js";
import { MapRoomCell } from "../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { getDefaultBaseData } from "../../game-data/getDefaultBaseData.js";
import { descentTemplate, molochStock } from "../../game-data/tribes/devil/molochStrongholds.js";
import { tribeTemplate } from "../maproom/v2/tribeSaveV2.js";
import { MOLOCH_WMID } from "../maproom/v2/tribeForCell.js";
import { OUTPOST_BUILDINGS } from "../maproom/v2/playerKits.js";
import { renderKitPictures, type KitBuilding } from "../kits/kitPreview.js";
import { isGauntletBaseId } from "../events/gauntlet.js";
import { ATTACK_TIMEOUT } from "../base/isAttackActive.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { postgres, redis } from "../../server.js";
import { isAdmin, logAdminAction } from "./admin.js";
import { isTestMode } from "./testMode.js";
import {
  addHistory,
  allDesigns,
  deleteDesign,
  designHistory,
  dropHistory,
  getDesign,
  HISTORY_KEPT,
  putDesign,
  saveDesign,
  type BuildingData,
  type Defenders,
} from "./designStore.js";
import { monsterStats } from "../../game-data/stats/monsterStats.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: the Designer (admins, in the game). A list of the outpost kits, every wild tribe level and
 * Moloch's 13 bases, each with Edit: the layout opens as a yard of its own in build mode (a "draft", below),
 * built and changed with the game's own tools, then saved back here.
 *
 *  - Kits (1-6): the draft is an outpost (the game's outpost buildings and limits, the outpost yard's size).
 *    Saving writes the kit into public/assets/kits/inferno-kits.json and draws its pictures, exactly as
 *    scripts/export-kits.ts does from a real outpost. The kit as it was before an admin first changed it is
 *    kept (io_design "kit-original"), so Reset puts it back.
 *  - Wild tribes (every level of each tribe's ladder, InfernoOnlyConfig.tribeSpawns.ladders) and Moloch's
 *    bases (descent bases 1-13: the Gauntlet's gates, and the Moloch strongholds at the levels in
 *    InfernoOnlyConfig.moloch.descentBases): no building limits and no yard edge. Saved in io_design
 *    (designStore.ts); the yard generators use them from then on. Reset goes back to the stock layout.
 *    Yards already stored on the map keep the layout they were made with until they are made again;
 *    replaceOnMap() does that for one tribe level (or the stronghold levels of a Moloch base) at once.
 *
 * Tribe and Moloch drafts also carry the monsters in the yard's Compounds and their levels (any number of each,
 * any level 1-6): the Designer's Monsters window sets them on the draft (setDefenders: its `monsters`, as
 * {id: how many}, and `academy`, as {id: {level}}), and Save stores them with the layout; the yard generators
 * use them in place of the stock yard's (tribeSaveV2, molochStrongholds). Reset puts the stock ones back too.
 *
 * A draft is a row of bym.save of type "design" belonging to the admin, with a base id of its own
 * (8 followed by 14 digits). Nothing else reads saves of that type; the game loads it as one of the admin's
 * own yards, and its saves write its buildings only (baseSave.ts): never resources, shiny, quests or anything
 * of the admin's. Opening a layout always starts the draft afresh from what is saved.
 *
 * 15 October (QoL #412-#420):
 *  - every save, reset, revert and import keeps the version it replaces (the last 5 of each layout, designStore
 *    addHistory); designTools lists them and useVersion puts one back ("Revert to previous": the newest);
 *  - checkDesign, before Save: what changed against the layout in use (buildings added, removed, moved or at
 *    another level; monsters) and whether someone saved the layout after this draft was made (#419: the layout
 *    in use when the draft was made is remembered, Redis designer:base:<draft base id>; Save then needs force);
 *  - copyFrom: the draft's buildings, or its monsters, from another layout;
 *  - setKitInfo: a kit's name and price in the kit file;
 *  - exportDesigns / importDesigns: the file scripts/export-designs.ts writes ("inferno-designs", version 1).
 *  - #416, "Try it": a practice attack on a tribe or Moloch draft, by its admin while test mode is on (tryItYard,
 *    below). The draft is never written by it.
 */

export class DesignError extends Error {}

export type Kind = "kit" | "tribe" | "moloch";

const DESIGN_BASE = 800_000_000_000_000;

/** The client's EnumYardType values the drafts are loaded as (MAIN_YARD, OUTPOST). */
const YARD_MAIN = 0;
const YARD_OUTPOST = 1;

const TRIBE_NAMES = ["Hellionnaire", "Kozmodeus", "Abaddonakki", "Beelzenaut"];
const GATE_NAMES = [
  "The Ashen Gate", "The Bone Moat", "The Cinder Wall", "The Iron Maw", "The Weeping Spires", "The Sulfur Pits",
  "The Chained Host", "The Blood Forge", "The Howling Keep", "The Obsidian Crown", "The Pyre of Kings",
  "The Last Bastion", "Moloch's Throne",
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

const KIT_SLOTS = 6;
const KIT_DIR = path.join(process.cwd(), "public", "assets", "kits");
const KIT_FILE = path.join(KIT_DIR, "inferno-kits.json");
const OUTPOST_HALL = 112;
/** Where a kit's outpost hall stands when a kit slot is still empty (as the stock kits have it). */
const EMPTY_KIT: BuildingData = { "0": { id: 0, t: OUTPOST_HALL, X: -65, Y: -55, l: 1 } };

/** Plenty to show in the draft's resource bar (building there is free anyway). */
const PLENTY = 999_999_999;

// ---------------------------------------------------------------------------------------------
// What can be designed
// ---------------------------------------------------------------------------------------------

const ladders = () => infernoOnlyConfig.tribeSpawns.ladders;

const parseKey = (kind: Kind, key: string) => {
  if (kind === "kit") {
    const slot = Number(key);
    if (!Number.isInteger(slot) || slot < 1 || slot > KIT_SLOTS) throw new DesignError(`There is no kit ${key}.`);
    return { slot, index: slot };
  }
  if (kind === "moloch") {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > 13) throw new DesignError(`There is no Moloch base ${key}.`);
    return { n, index: 100 + n };
  }
  if (kind === "tribe") {
    const match = /^(\d)-(\d{1,2})$/.exec(key);
    const tribe = match ? Number(match[1]) : -1;
    const level = match ? Number(match[2]) : -1;
    if (!match || !ladders()[tribe]?.includes(level)) throw new DesignError(`There is no wild tribe level ${key}.`);
    return { tribe, level, index: 200 + tribe * 100 + level };
  }
  throw new DesignError(`Unknown kind of layout: ${kind}.`);
};

export const designBaseId = (userid: number, index: number) => String(DESIGN_BASE + userid * 1000 + index);

/** The draft a base id belongs to: its admin and which layout it is. */
export const parseDesignBaseId = (baseid: string | number | null | undefined) => {
  const text = String(baseid ?? "");
  if (text.length !== 15 || !text.startsWith("8")) return null;
  const offset = Number(text) - DESIGN_BASE;
  if (!Number.isSafeInteger(offset) || offset <= 0) return null;
  const index = offset % 1000;
  const userid = Math.floor(offset / 1000);
  if (index >= 1 && index <= KIT_SLOTS) return { userid, kind: "kit" as Kind, key: String(index) };
  if (index >= 101 && index <= 113) return { userid, kind: "moloch" as Kind, key: String(index - 100) };
  if (index >= 200 && index < 600) {
    const tribe = Math.floor((index - 200) / 100);
    const level = (index - 200) % 100;
    if (ladders()[tribe]?.includes(level)) return { userid, kind: "tribe" as Kind, key: `${tribe}-${level}` };
  }
  return null;
};

export const isDesignBaseId = (baseid: string | number | null | undefined) => parseDesignBaseId(baseid) !== null;

/** Which stronghold levels are made from descent base n. */
const strongholdLevels = (n: number) =>
  Object.entries(infernoOnlyConfig.moloch.descentBases)
    .filter(([, bases]) => bases.includes(n))
    .map(([level]) => Number(level));

const title = (kind: Kind, key: string) => {
  if (kind === "kit") return `Outpost kit ${key}` + (kitName(Number(key)) ? `: ${kitName(Number(key))}` : "");
  if (kind === "moloch") return `Moloch base ${key} (Gate ${ROMAN[Number(key) - 1]}: ${GATE_NAMES[Number(key) - 1]})`;
  const { tribe, level } = parseKey(kind, key) as { tribe: number; level: number };
  return `${TRIBE_NAMES[tribe]} level ${level}`;
};

// ---------------------------------------------------------------------------------------------
// Kits: public/assets/kits/inferno-kits.json (the file the game downloads, as export-kits.ts writes it)
// ---------------------------------------------------------------------------------------------

interface Kit {
  slot: number;
  name: string;
  price: "auto" | { r1: number; r2: number; r3: number; shiny: number };
  source?: unknown;
  buildings: Record<string, KitBuilding>;
}

interface KitFile {
  version: number;
  kits: (Kit | null)[];
}

/** QoL #418/#419: who saved a kit in the Designer and when (unix seconds), kept in its `source`. */
const kitSaved = (kit: Kit | null | undefined): { by: string | null; at: number } => {
  const source = (kit?.source ?? null) as { designer?: unknown; savedAt?: unknown } | null;
  return {
    by: source && typeof source.designer === "string" ? source.designer : null,
    at: source && Number.isFinite(Number(source.savedAt)) ? Number(source.savedAt) : 0,
  };
};

const readKits = (): KitFile => {
  let file: KitFile = { version: 0, kits: [] };
  if (existsSync(KIT_FILE)) {
    try {
      file = JSON.parse(readFileSync(KIT_FILE, "utf8"));
    } catch {
      throw new DesignError("The kit file (inferno-kits.json) could not be read.");
    }
  }
  file.kits = Array.from({ length: KIT_SLOTS }, (_, i) => file.kits?.[i] ?? null);
  return file;
};

const writeKit = (slot: number, kit: Kit | null) => {
  const file = readKits();
  file.kits[slot - 1] = kit;
  file.version = Date.now();
  mkdirSync(KIT_DIR, { recursive: true });
  if (kit) {
    const pictures = renderKitPictures(Object.values(kit.buildings));
    writeFileSync(path.join(KIT_DIR, `kit-${slot}.png`), pictures.thumb);
    writeFileSync(path.join(KIT_DIR, `kit-${slot}-large.png`), pictures.large);
  }
  // (QoL #271: the file as it was, kept first)
  backupKits();
  writeFileSync(KIT_FILE, JSON.stringify(file, null, 2));
};

// (QoL #271: before each write of inferno-kits.json, by a Designer save or reset or a restore, a copy of it is kept
// next to it, the last KIT_BACKUPS of them, named by the time (UTC): .inferno-kits.20261015-083512-345.json. The
// leading dot keeps them off the web: the static file server never serves hidden files.)
const KIT_BACKUPS = 5;
const KIT_BACKUP_NAME = /^\.inferno-kits\.(\d{8})-(\d{6})-(\d{3})\.json$/;

const kitBackupNames = () => {
  try {
    return readdirSync(KIT_DIR).filter((name) => KIT_BACKUP_NAME.test(name)).sort().reverse();
  } catch {
    return [];
  }
};

/** A copy of the kit file as it is now (none when there is no file yet); the oldest copies past KIT_BACKUPS removed. */
const backupKits = () => {
  try {
    if (!existsSync(KIT_FILE)) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").replace(".", "-").slice(0, 19);
    copyFileSync(KIT_FILE, path.join(KIT_DIR, `.inferno-kits.${stamp}.json`));
    for (const old of kitBackupNames().slice(KIT_BACKUPS)) unlinkSync(path.join(KIT_DIR, old));
  } catch (err) {
    // (a copy that could not be made never stops the save)
    logger.warn(`Designer: no backup of inferno-kits.json made: ${(err as Error).message}`);
  }
};

const backupTime = (name: string) => {
  const m = KIT_BACKUP_NAME.exec(name);
  if (!m) return 0;
  const [d, t, ms] = [m[1], m[2], m[3]];
  return Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 6), +ms);
};

/** QoL #271: the kept copies of the kit file, newest first, each with the kits in it (name and building count). */
export const listKitBackups = () => ({
  backups: kitBackupNames().map((name) => {
    let kits: { slot: number; name: string; buildings: number }[] | null = null;
    try {
      const file = JSON.parse(readFileSync(path.join(KIT_DIR, name), "utf8")) as KitFile;
      kits = Array.from({ length: KIT_SLOTS }, (_, i) => file.kits?.[i] ?? null).map((kit, i) => ({
        slot: i + 1,
        name: kit?.name ?? "",
        buildings: kit ? Object.keys(kit.buildings ?? {}).length : 0,
      }));
    } catch {
      kits = null;
    }
    let size = 0;
    try {
      size = statSync(path.join(KIT_DIR, name)).size;
    } catch {
      size = 0;
    }
    return { name, at: backupTime(name), size, kits };
  }),
  kept: KIT_BACKUPS,
});

/**
 * QoL #271: the kit file put back as one of its copies was (the file as it is now is copied first, so a restore can
 * itself be undone). Every kit's pictures are drawn again and the version changes, so games fetch them anew. The
 * kits' "as before any admin changed it" layouts (Reset) are not touched.
 */
export const restoreKitBackup = async (admin: User, name: string) => {
  if (!KIT_BACKUP_NAME.test(name) || !kitBackupNames().includes(name)) throw new DesignError("There is no such copy of the kit file.");
  let file: KitFile;
  try {
    file = JSON.parse(readFileSync(path.join(KIT_DIR, name), "utf8")) as KitFile;
  } catch {
    throw new DesignError("That copy of the kit file could not be read.");
  }
  if (!file || typeof file !== "object" || !Array.isArray(file.kits)) throw new DesignError("That copy is not a kit file.");
  file.kits = Array.from({ length: KIT_SLOTS }, (_, i) => file.kits[i] ?? null);
  mkdirSync(KIT_DIR, { recursive: true });
  file.kits.forEach((kit, i) => {
    if (!kit || !kit.buildings) return;
    const pictures = renderKitPictures(Object.values(kit.buildings));
    writeFileSync(path.join(KIT_DIR, `kit-${i + 1}.png`), pictures.thumb);
    writeFileSync(path.join(KIT_DIR, `kit-${i + 1}-large.png`), pictures.large);
  });
  file.version = Date.now();
  backupKits();
  writeFileSync(KIT_FILE, JSON.stringify(file, null, 2));
  const summary = file.kits.map((kit, i) => (kit ? `${i + 1} "${kit.name}"` : `${i + 1} empty`)).join(", ");
  await logAdminAction(admin, "design-kits-restore", null, `inferno-kits.json put back as ${name}: ${summary}`);
  return { restored: name, kits: file.kits.map((kit, i) => ({ slot: i + 1, name: kit?.name ?? "", buildings: kit ? Object.keys(kit.buildings ?? {}).length : 0 })) };
};

const kitName = (slot: number) => readKits().kits[slot - 1]?.name ?? "";

/** A kit's buildings as a yard's buildings: the hall first (id 0), the rest at the kit's levels. */
export const kitToYard = (kit: Kit | null): BuildingData => {
  if (!kit || !kit.buildings) return structuredClone(EMPTY_KIT);
  const yard: BuildingData = {};
  for (const [id, b] of Object.entries(kit.buildings)) {
    yard[id] = { id: Number(b.id), t: b.t, X: b.X, Y: b.Y, l: b.t === OUTPOST_HALL ? 1 : Math.max(1, Number(b.prefab) || 1) };
    // (12 November, the user's: "premade kits ... are not saving calcification levels") a kit's calcification shown
    // in the draft as the yard's (`fort`), so it is kept when the kit is saved again
    // (13 November: the hall's too)
    if (Number(b.fort) >= 1) yard[id].fort = Math.min(4, Math.trunc(Number(b.fort)));
  }
  return yard;
};

/** A yard's buildings as a kit's: exactly what export-kits.ts takes from an outpost. */
export const yardToKit = (buildingdata: BuildingData): Record<string, KitBuilding> => {
  const source = Object.values(buildingdata).filter((b) => b && typeof b.t === "number");
  const hall = source.find((b) => b.t === OUTPOST_HALL);
  if (!hall) throw new DesignError("The kit has no outpost hall. Put one back before saving.");
  const buildings: Record<string, KitBuilding> = { "0": { t: OUTPOST_HALL, X: Number(hall.X), Y: Number(hall.Y), id: 0 } };
  // (13 November) and how far the hall is calcified: a kit built from it calcifies the outpost's hall so far
  if (Number(hall.fort) >= 1) buildings["0"].fort = Math.min(4, Math.trunc(Number(hall.fort)));
  let next = 1;
  for (const b of source) {
    if (b === hall || !OUTPOST_BUILDINGS.has(Number(b.t))) continue;
    buildings[String(next)] = { t: Number(b.t), X: Number(b.X), Y: Number(b.Y), id: next, prefab: Math.max(1, Number(b.l) || 1) };
    // (12 November) and how far it is calcified: it was dropped, so a pre-made kit could never have any
    if (Number(b.fort) >= 1) buildings[String(next)].fort = Math.min(4, Math.trunc(Number(b.fort)));
    next++;
  }
  if (next === 1) throw new DesignError("The kit has nothing in it but the hall.");
  return buildings;
};

// ---------------------------------------------------------------------------------------------
// Stock layouts
// ---------------------------------------------------------------------------------------------

/** The layout a design starts from and goes back to on Reset. */
const stockLayout = (kind: Kind, key: string): BuildingData => {
  const k = parseKey(kind, key) as unknown as Record<string, number>;
  if (kind === "tribe") return structuredClone((tribeTemplate(k.tribe, k.level).buildingdata ?? {}) as BuildingData);
  if (kind === "moloch") return structuredClone((molochStock(k.n)?.buildingdata ?? {}) as BuildingData);
  const original = getDesign("kit-original", key);
  return original ? structuredClone(original.buildingdata) : kitToYard(readKits().kits[k.slot - 1]);
};

/** The layout in use now: the designed one, or the stock one. */
const currentLayout = (kind: Kind, key: string): BuildingData => {
  if (kind === "kit") return kitToYard(readKits().kits[Number(key) - 1]);
  const design = getDesign(kind, key);
  return design ? structuredClone(design.buildingdata) : stockLayout(kind, key);
};

const count = (data: BuildingData) => Object.values(data).filter((b) => b && typeof b.t === "number").length;

// ---------------------------------------------------------------------------------------------
// QoL #419: which version of a layout is in use (a fingerprint), and which one a draft was made from
// ---------------------------------------------------------------------------------------------

/** JSON with every object's keys sorted (Postgres keeps a JSON object's keys in its own order). */
const canon = (v: unknown): string =>
  v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
    : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v ?? null);

const same = (a: unknown, b: unknown) => canon(a ?? {}) === canon(b ?? {});

const hash = (v: unknown) => createHash("sha1").update(canon(v)).digest("hex").slice(0, 24);

/** The layout in use: its fingerprint, and who saved it when (unix seconds; 0: not known). */
const inUse = (kind: Kind, key: string): { fp: string; by: string | null; at: number } => {
  if (kind === "kit") {
    const kit = readKits().kits[Number(key) - 1];
    return { fp: hash(kit ? kit.buildings : "empty"), ...kitSaved(kit) };
  }
  const design = getDesign(kind, key);
  return { fp: hash(design ? { b: design.buildingdata, m: design.defenders } : "stock"), by: design?.updatedBy ?? null, at: design?.updatedAt ?? 0 };
};

const DRAFT_BASE_TTL = 30 * 24 * 3600;
const draftBaseKey = (baseid: string) => `designer:base:${baseid}`;

/** Remembers which version of the layout a draft was made from (or was last saved as). */
const setDraftBase = async (baseid: string, fp: string) => {
  await redis.set(draftBaseKey(baseid), fp, "EX", String(DRAFT_BASE_TTL)).catch(() => null);
};

/** The version a draft was made from; null when not known (then no warning is given). */
const draftBase = async (baseid: string): Promise<string | null> => {
  const v = await redis.get(draftBaseKey(baseid)).catch(() => null);
  return v ? String(v) : null;
};

// ---------------------------------------------------------------------------------------------
// Monsters in the Compounds
// ---------------------------------------------------------------------------------------------

/** The monsters a Designer may put in a yard: the Inferno's, and Rezghul (C19), who is one of them here. */
const designerMonster = (id: string) => (id.startsWith("IC") || id === "C19") && Boolean(monsterStats[id]);

const MAX_OF_ONE = 999;

/** A save's `monsters` as {id: how many} (its plain map, its "housed" block, or lists of monsters). */
const countsOf = (monsters: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!monsters || typeof monsters !== "object") return out;
  const block = (monsters as Record<string, unknown>).housed;
  const from = (block && typeof block === "object" ? block : monsters) as Record<string, unknown>;
  for (const [id, v] of Object.entries(from)) {
    if (!designerMonster(id)) continue;
    const n = Array.isArray(v) ? v.length : Math.floor(Number(v));
    if (n > 0) out[id] = Math.min(MAX_OF_ONE, n);
  }
  return out;
};

/** A save's `academy` as {id: {level}} (levels 1-6; other fields dropped). */
const levelsOf = (academy: unknown): Record<string, { level: number }> => {
  const out: Record<string, { level: number }> = {};
  if (!academy || typeof academy !== "object") return out;
  for (const [id, v] of Object.entries(academy as Record<string, unknown>)) {
    if (!designerMonster(id)) continue;
    const level = Math.floor(Number(v && typeof v === "object" ? (v as { level?: unknown }).level : v));
    if (level >= 1) out[id] = { level: Math.min(6, level) };
  }
  return out;
};

/** The monsters and levels a tribe level or Moloch base has now: the designed ones, or the stock yard's. */
const currentDefenders = (kind: "tribe" | "moloch", key: string): Defenders => {
  const design = getDesign(kind, key);
  if (design?.defenders) return structuredClone(design.defenders) as Defenders;
  const k = parseKey(kind, key) as unknown as Record<string, number>;
  const stock = (kind === "tribe" ? tribeTemplate(k.tribe, k.level) : molochStock(k.n)) as
    | { monsters?: unknown; academy?: unknown }
    | undefined;
  return { monsters: countsOf(stock?.monsters), academy: levelsOf(stock?.academy) };
};

// ---------------------------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------------------------

export const listDesigns = () => {
  const kits = readKits().kits;
  const describe = (design: ReturnType<typeof getDesign>) =>
    design ? { custom: true, by: design.updatedBy, at: design.updatedAt } : { custom: false };
  return {
    kits: kits.map((kit, i) => {
      const original = getDesign("kit-original", String(i + 1));
      // (QoL #418: when the kit itself was last saved in the Designer, and by whom, when it says so)
      const saved = kitSaved(kit);
      return {
        kind: "kit",
        key: String(i + 1),
        name: kit ? `Kit ${i + 1}: ${kit.name}` : `Kit ${i + 1} (empty)`,
        buildings: kit ? Object.keys(kit.buildings ?? {}).length : 0,
        ...describe(original),
        ...(original && saved.at > 0 ? { by: saved.by, at: saved.at } : {}),
        versions: designHistory("kit", String(i + 1)).length,
      };
    }),
    tribes: ladders().flatMap((levels, tribe) =>
      levels.map((level) => {
        const key = `${tribe}-${level}`;
        const design = getDesign("tribe", key);
        const monsters = Object.values(currentDefenders("tribe", key).monsters).reduce((a, b) => a + b, 0);
        return { kind: "tribe", key, name: `${TRIBE_NAMES[tribe]} level ${level}`, buildings: count(currentLayout("tribe", key)), monsters, ...describe(design), versions: designHistory("tribe", key).length };
      })
    ),
    moloch: Array.from({ length: 13 }, (_, i) => {
      const key = String(i + 1);
      const levels = strongholdLevels(i + 1);
      return {
        kind: "moloch",
        key,
        name: `Gate ${ROMAN[i]}: ${GATE_NAMES[i]}`,
        note: levels.length ? `also Moloch strongholds at level ${levels.join(" and ")}` : "",
        buildings: count(currentLayout("moloch", key)),
        monsters: Object.values(currentDefenders("moloch", key).monsters).reduce((a, b) => a + b, 0),
        ...describe(getDesign("moloch", key)),
        versions: designHistory("moloch", key).length,
      };
    }),
  };
};

// ---------------------------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------------------------

/**
 * Makes (or makes again) the admin's draft of a layout and says how the game should load it:
 * {baseid, yardtype, title, free}. `free`: no building limits and no yard edge (tribes and Moloch).
 */
export const openDesign = async (admin: User, kind: Kind, key: string, resume = "") => {
  const k = parseKey(kind, key);
  const baseid = designBaseId(admin.userid, k.index);
  const buildingdata = currentLayout(kind, key);
  const now = getCurrentDateTime();
  const em = postgres.em.fork();
  const answer = { baseid, yardtype: kind === "kit" ? YARD_OUTPOST : YARD_MAIN, title: title(kind, key), free: kind !== "kit" ? 1 : 0, kind, key };
  // (14 October, QoL #287: a draft saved after it was made, and not published, is the admin's unsaved work: they
  // are asked first ("resume" empty), and "1" opens it as it is; "0" (or no draft) makes it again from the layout)
  const draftNow = await em.findOne(Save, { baseid, type: "design" } as never, { fields: ["savetime", "buildingdata", "monsters"] });
  // (keys sorted: Postgres keeps a JSON object's keys in its own order: canon, above)
  const changed =
    draftNow &&
    (!same(cleanBuildings((draftNow.buildingdata ?? {}) as BuildingData), cleanBuildings((buildingdata ?? {}) as BuildingData)) ||
      (kind !== "kit" && !same(countsOf(draftNow.monsters), currentDefenders(kind as "tribe" | "moloch", key).monsters)));
  if (draftNow && changed) {
    if (resume === "") return { ...answer, askResume: 1, draftAt: Number(draftNow.savetime) };
    if (resume === "1") return answer;
  }
  // The game takes the home yard's id from a yard it loads as a main yard: the admin's own, not the template's.
  const home = await em.findOne(Save, { userid: admin.userid, type: BaseType.MAIN }, { fields: ["homebaseid", "baseid"] });

  let scaffold: Record<string, unknown>;
  if (kind === "kit") {
    scaffold = getDefaultBaseData(admin, BaseType.OUTPOST) as Record<string, unknown>;
  } else {
    const template = kind === "tribe"
      ? tribeTemplate((k as { tribe: number }).tribe, (k as { level: number }).level)
      : descentTemplate((k as { n: number }).n);
    const { baseid: _reserved, cellid: _cell, ...rest } = (template ?? {}) as Record<string, unknown>;
    // the monsters in its Compounds and their levels, as {id: how many} and {id: {level}}
    const defenders = currentDefenders(kind as "tribe" | "moloch", key);
    scaffold = { ...rest, monsters: defenders.monsters, academy: defenders.academy };
  }

  await em.nativeDelete(Save, { baseid, type: "design" });
  const draft = em.create(
    Save,
    {
      ...scaffold,
      baseid,
      type: "design",
      userid: admin.userid,
      saveuserid: admin.userid,
      worldid: null,
      wmid: 0,
      homebaseid: Number(home?.homebaseid || home?.baseid || 0),
      name: title(kind, key).slice(0, 60),
      buildingdata,
      buildinghealthdata: {},
      buildingresources: {},
      resources: { r1: PLENTY, r2: PLENTY, r3: PLENTY, r4: PLENTY, r1max: PLENTY, r2max: PLENTY, r3max: PLENTY, r4max: PLENTY },
      aiattacks: {},
      attacks: [],
      damage: 0,
      destroyed: 0,
      attackid: 0,
      protected: 0,
      credits: 0,
      createtime: now,
      savetime: now,
    } as never,
    { partial: true }
  ) as Save;
  em.persist(draft);
  await em.flush();
  // (QoL #419: the version in use now is the one this draft starts from; a continued draft keeps its own)
  await setDraftBase(baseid, inUse(kind, key).fp);

  return { baseid, yardtype: kind === "kit" ? YARD_OUTPOST : YARD_MAIN, title: title(kind, key), free: kind !== "kit" ? 1 : 0, kind, key };
};

/** What the game is told about a draft it loads (baseLoad.ts: `io_design`). */
export const designInfo = (baseid: string) => {
  const parsed = parseDesignBaseId(baseid);
  if (!parsed) return null;
  return { kind: parsed.kind, key: parsed.key, title: title(parsed.kind, parsed.key), free: parsed.kind !== "kit" ? 1 : 0 };
};

/** The admin's draft, checked to be theirs. */
const draftOf = async (admin: User, baseid: string) => {
  const parsed = parseDesignBaseId(baseid);
  if (!parsed || parsed.userid !== admin.userid) throw new DesignError("That is not one of your designs.");
  const draft = await postgres.em.fork().findOne(Save, { baseid, type: "design", userid: admin.userid });
  if (!draft) throw new DesignError("The design is not open any more. Open it again from the Designer.");
  return { ...parsed, draft };
};

/**
 * Saves the draft (which the game saved just before) as the layout in use.
 * QoL #419: when the layout in use is not the one the draft was made from (another admin saved, reset, reverted or
 * imported it meanwhile), nothing is saved and the answer says so ({conflict: 1, by, at}) unless `force`.
 * QoL #412: the version it replaces is kept (when there was a designed one and it differs).
 */
export const publishDesign = async (admin: User, baseid: string, force = false) => {
  const { kind, key, draft } = await draftOf(admin, baseid);
  const buildingdata = cleanBuildings((draft.buildingdata ?? {}) as BuildingData);
  const buildings = count(buildingdata);
  if (buildings === 0) throw new DesignError("The layout is empty.");

  const now = inUse(kind, key);
  const base = await draftBase(baseid);
  if (!force && base && base !== now.fp) return { conflict: 1, by: now.by ?? "", at: now.at, saved: title(kind, key) };

  if (kind === "kit") {
    const slot = Number(key);
    const file = readKits();
    const before = file.kits[slot - 1];
    const kitBuildings = yardToKit(buildingdata);
    // Kept once: the kit as it was before any admin changed it, for Reset.
    if (!getDesign("kit-original", key)) await saveDesign("kit-original", key, kitToYard(before), admin.username);
    if (before && !same(before.buildings, kitBuildings)) await addHistory("kit", key, kitToYard(before), null, kitSaved(before).by, kitSaved(before).at);
    const kit: Kit = {
      slot,
      name: before?.name ?? `Kit ${slot}`,
      price: before?.price ?? "auto",
      // (QoL #418: who saved it, and when)
      source: { designer: admin.username, savedAt: getCurrentDateTime() },
      buildings: kitBuildings,
    };
    writeKit(slot, kit);
    await setDraftBase(baseid, inUse(kind, key).fp);
    await logAdminAction(admin, "design-save", null, `kit ${slot} "${kit.name}": ${Object.keys(kit.buildings).length} buildings${base && base !== now.fp ? " (over a newer save)" : ""}`);
    return { saved: title(kind, key), buildings: Object.keys(kit.buildings).length, stored: 0 };
  }

  const defenders: Defenders = { monsters: countsOf(draft.monsters), academy: levelsOf(draft.academy) };
  const before = getDesign(kind, key);
  if (before && !same({ b: before.buildingdata, m: before.defenders }, { b: buildingdata, m: defenders })) {
    await addHistory(kind, key, before.buildingdata, before.defenders, before.updatedBy, before.updatedAt);
  }
  await saveDesign(kind, key, buildingdata, admin.username, defenders);
  await setDraftBase(baseid, inUse(kind, key).fp);
  const housed = Object.values(defenders.monsters).reduce((a, b) => a + b, 0);
  await logAdminAction(admin, "design-save", null, `${title(kind, key)}: ${buildings} buildings, ${housed} monsters${base && base !== now.fp ? " (over a newer save)" : ""}`);
  return { saved: title(kind, key), buildings, stored: await storedYards(kind, key, true) };
};

/**
 * The Monsters window: puts these monsters in the draft's Compounds ({id: how many}, 0 or none to leave one
 * out) at these levels ({id: level 1-6}). Tribes and Moloch only (a kit is a layout; its outpost's monsters are
 * the player's). Stored with the layout on Save.
 */
export const setDefenders = async (admin: User, baseid: string, monsters: unknown, levels: unknown) => {
  const { kind, draft } = await draftOf(admin, baseid);
  if (kind === "kit") throw new DesignError("A kit has no monsters of its own: an outpost's are its player's.");
  if (!monsters || typeof monsters !== "object" || Array.isArray(monsters)) throw new DesignError("Which monsters?");
  const counts: Record<string, number> = {};
  for (const [id, v] of Object.entries(monsters as Record<string, unknown>)) {
    if (!designerMonster(id)) throw new DesignError(`Not a monster for an Inferno yard: ${id}.`);
    const n = Math.floor(Number(v));
    if (!(n >= 0 && n <= MAX_OF_ONE)) throw new DesignError(`${id}: from 0 to ${MAX_OF_ONE}.`);
    if (n > 0) counts[id] = n;
  }
  const academy = levelsOf(draft.academy);
  for (const [id, v] of Object.entries((levels && typeof levels === "object" ? levels : {}) as Record<string, unknown>)) {
    if (!designerMonster(id)) throw new DesignError(`Not a monster for an Inferno yard: ${id}.`);
    const level = Math.floor(Number(v));
    if (!(level >= 1 && level <= 6)) throw new DesignError(`${id}: level 1 to 6.`);
    academy[id] = { level };
  }
  const em = postgres.em.fork();
  await em.nativeUpdate(Save, { baseid, type: "design", userid: admin.userid } as never, { monsters: counts, academy } as never);
  return { monsters: counts, levels: Object.fromEntries(Object.entries(academy).map(([id, a]) => [id, a.level])) };
};

/** Back to the stock layout (kits: as the kit was before an admin first changed it). */
export const resetDesign = async (admin: User, kind: Kind, key: string) => {
  parseKey(kind, key);
  if (kind === "kit") {
    const original = getDesign("kit-original", key);
    if (!original) throw new DesignError("This kit has not been changed in the Designer.");
    const slot = Number(key);
    const before = readKits().kits[slot - 1];
    const hasHall = Object.values(original.buildingdata).some((b) => b.t === OUTPOST_HALL);
    const onlyHall = count(original.buildingdata) <= 1;
    // (QoL #412: the kit as it was is kept, so a Reset can be undone with "Revert to previous")
    if (before) await addHistory("kit", key, kitToYard(before), null, kitSaved(before).by, kitSaved(before).at);
    writeKit(slot, !hasHall || onlyHall ? null : {
      slot,
      name: before?.name ?? `Kit ${slot}`,
      price: before?.price ?? "auto",
      source: { designer: admin.username, savedAt: getCurrentDateTime() },
      buildings: yardToKit(original.buildingdata),
    });
    await deleteDesign("kit-original", key);
  } else {
    const before = getDesign(kind, key);
    if (!before) throw new DesignError("This layout is the stock one already.");
    // (QoL #412: kept, so a Reset can be undone)
    await addHistory(kind, key, before.buildingdata, before.defenders, before.updatedBy, before.updatedAt);
    await deleteDesign(kind, key);
  }
  await logAdminAction(admin, "design-reset", null, `${title(kind, key)} back to the stock layout`);
  return { reset: title(kind, key), stored: kind === "kit" ? 0 : await storedYards(kind, key, true) };
};

/**
 * The buildings as the game saved them, minus what belongs to one yard's life and not to a layout: build,
 * upgrade, repair and fortify countdowns, health, repairs, helpers, hatchery queues.
 */
const cleanBuildings = (data: BuildingData): BuildingData => {
  const out: BuildingData = {};
  for (const [id, b] of Object.entries(data)) {
    if (!b || typeof b !== "object" || typeof b.t !== "number") continue;
    // (kept: type, place, level, fortification "fort", and a harvester's own settings)
    const { cB: _cB, cU: _cU, cF: _cF, cR: _cR, hp: _hp, rE: _rE, hl: _hl, ti: _ti, rIP: _rIP, rPS: _rPS, ...rest } = b as Record<string, unknown>;
    out[id] = rest;
  }
  return out;
};

// ---------------------------------------------------------------------------------------------
// 15 October, QoL #416: "Try it", a practice attack on the draft on screen
// ---------------------------------------------------------------------------------------------

/** A Try it is over by then at the latest (the next build load of the draft, or leaving the Designer, ends it). */
const TRY_IT_TTL = 2 * 3600;
const tryItKey = (userid: number) => `designer:tryit:${userid}`;

/**
 * The draft as the Designer's "Try it" attacks it (baseLoad.ts, wmattack): only the admin's own tribe or Moloch draft,
 * and (`start`, the attack's load) only while test mode is on. It is read with an entity manager of its own that is
 * never flushed, and changed there only, in memory: a wild monster yard of nobody's, as a Siege yard is (type tribe,
 * no owner), so the game attacks it as one: not as the admin's own yard, without the design bar (io_design), with the
 * resources its template has (not the draft's plenty) and no map cell. Its row is never written: the attack's saves
 * are answered without writing (baseSave.ts), and while it runs (`start` notes it, until the draft is opened again in
 * build mode or the Designer is left) so is every save sent to the draft.
 */
export const tryItYard = async (admin: User, baseid: string, start: boolean): Promise<Save> => {
  const parsed = parseDesignBaseId(baseid);
  if (!isAdmin(admin) || !parsed || parsed.userid !== admin.userid) throw new DesignError("That is not one of your designs.");
  if (parsed.kind === "kit") throw new DesignError("Try it is for wild tribe and Moloch layouts.");
  if (start && !(await isTestMode(admin))) throw new DesignError("Try it needs admin test mode on.");
  // (its own entity manager, never flushed and not used again: nothing changed below can reach the database)
  const em = postgres.em.fork();
  const yard = await em.findOne(Save, { baseid, type: "design", userid: admin.userid } as never);
  if (!yard) throw new DesignError("The design is not open any more. Open it again from the Designer.");
  if (start) await redis.set(tryItKey(admin.userid), baseid, "EX", String(TRY_IT_TTL));
  const k = parseKey(parsed.kind, parsed.key) as unknown as Record<string, number>;
  const stock = (parsed.kind === "tribe" ? tribeTemplate(k.tribe, k.level) : descentTemplate(k.n)) as { resources?: unknown } | undefined;
  const loot = stock?.resources && typeof stock.resources === "object" ? structuredClone(stock.resources) : { r1: 0, r2: 0, r3: 0, r4: 0 };
  yard.type = BaseType.TRIBE;
  yard.userid = 0;
  yard.saveuserid = 0;
  // (a tribe level's yards are that tribe's, as tribeForCell makes them; a Moloch base, as a Siege's yard is: 0)
  yard.wmid = parsed.kind === "tribe" ? k.tribe * 10 + 1 : 0;
  if (parsed.kind === "tribe") yard.level = k.level;
  yard.resources = loot as never;
  yard.buildinghealthdata = {};
  yard.attacks = [];
  yard.attackid = 0;
  yard.damage = 0;
  yard.destroyed = 0;
  yard.protected = 0;
  return yard;
};

/** A Try it on this draft is running (tryItYard noted it). */
export const tryItRunning = async (userid: number, baseid: string) =>
  String((await redis.get(tryItKey(userid)).catch(() => null)) ?? "") === String(baseid);

/** The Try it is over: the draft's saves are taken again. */
export const endTryIt = async (userid: number) => {
  await redis.del(tryItKey(userid)).catch(() => null);
};

/** A save the game sends from an attack (BASE.SaveB: only out of build mode does it send these). */
export const isAttackSave = (body: Record<string, unknown>) =>
  body.attackid !== undefined || body.attackreport !== undefined || body.attackloot !== undefined || body.attackcreatures !== undefined;

// ---------------------------------------------------------------------------------------------
// Yards already on the map
// ---------------------------------------------------------------------------------------------

/**
 * The stored yards a tribe level / Moloch base's strongholds have on the map now (made before the change),
 * not counting destroyed ones (their state is players' progress) or ones being attacked right now.
 * `countOnly`: how many; else they are deleted (the next look at the cell makes them again, from the design).
 */
const storedYards = async (kind: Kind, key: string, countOnly: boolean, untouchedOnly = false) => {
  const em = postgres.em.fork();
  let where: Record<string, unknown>;
  if (kind === "tribe") {
    const { tribe, level } = parseKey(kind, key) as { tribe: number; level: number };
    where = { type: BaseType.TRIBE, wmid: tribe * 10 + 1, level };
  } else if (kind === "moloch") {
    const levels = strongholdLevels(Number(key));
    if (levels.length === 0) return 0;
    where = { type: BaseType.TRIBE, wmid: MOLOCH_WMID, level: { $in: levels } };
  } else {
    return 0;
  }
  const busySince = getCurrentDateTime() - ATTACK_TIMEOUT;
  const saves = (await em.find(Save, { ...where, destroyed: 0 } as never, { fields: ["baseid", "attackid", "savetime", "damage"] }))
    .filter((s) => !isGauntletBaseId(s.baseid) && !(s.attackid !== 0 && (s.savetime ?? 0) >= busySince))
    // (14 October, QoL #286: "untouched only" leaves damaged yards, players' progress, as they are)
    .filter((s) => !untouchedOnly || !(Number(s.damage) > 0));
  if (countOnly || saves.length === 0) return saves.length;
  const ids = saves.map((s) => s.baseid);
  const yards = await em.nativeDelete(Save, { baseid: { $in: ids }, type: BaseType.TRIBE });
  await em.nativeDelete(WorldMapCell, { base_type: MapRoomCell.WM, baseid: { $in: ids } });
  return yards;
};

/** Makes the stored yards of a tribe level (or a Moloch base's strongholds) again, with the layout in use. */
export const replaceOnMap = async (admin: User, kind: Kind, key: string, untouchedOnly = false) => {
  parseKey(kind, key);
  if (kind === "kit") throw new DesignError("Kits are not on the map: players' outposts keep what they built.");
  const replaced = await storedYards(kind, key, false, untouchedOnly);
  await logAdminAction(admin, "design-replace", null, `${title(kind, key)}: ${replaced} stored yards made again${untouchedOnly ? " (untouched only)" : ""}`);
  return { replaced };
};

/**
 * 14 October, QoL #286: before Remake, how many stored yards it would make again and how many of those are
 * damaged (made again, they come back fresh, with full health and loot, wiping players' partial progress).
 */
export const storedCounts = async (kind: Kind, key: string) => {
  parseKey(kind, key);
  if (kind === "kit") return { total: 0, untouched: 0 };
  const total = await storedYards(kind, key, true);
  const untouched = await storedYards(kind, key, true, true);
  return { total, untouched };
};

/** Every draft of this admin goes (leaving the Designer). */
export const closeDesigns = async (admin: User) => {
  // (QoL #416: and a "Try it" noted for them is over)
  await endTryIt(admin.userid);
  const em = postgres.em.fork();
  const from = designBaseId(admin.userid, 0);
  const to = designBaseId(admin.userid, 999);
  return em.nativeDelete(Save, { type: "design", userid: admin.userid, baseid: { $gte: from, $lte: to } } as never);
};

// ---------------------------------------------------------------------------------------------
// 15 October, QoL #415 / #419: before Save, what changed, and whether someone saved meanwhile
// ---------------------------------------------------------------------------------------------

/**
 * What changed between two layouts. Buildings are paired up by type: first those standing at the same place,
 * then the same building id (moved), then the nearest of the same type (moved; a kit's ids are numbered afresh at
 * each save). What is left over was added or taken away. `added` / `removed`: {building type: how many}.
 */
const diffBuildings = (before: BuildingData, after: BuildingData) => {
  const list = (data: BuildingData) =>
    Object.entries(data)
      .filter(([, b]) => b && typeof b.t === "number")
      .map(([id, b]) => ({ id, t: Number(b.t), X: Number(b.X), Y: Number(b.Y), l: Math.max(1, Math.floor(Number(b.l)) || 1) }));
  const a = list(before);
  const b = list(after);
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  let moved = 0;
  let levels = 0;
  const pair = (i: number, j: number, move: boolean) => {
    usedA.add(i);
    usedB.add(j);
    if (move) moved++;
    if (a[i].l !== b[j].l) levels++;
  };
  const at = new Map<string, number[]>();
  a.forEach((x, i) => {
    const k = `${x.t}:${x.X}:${x.Y}`;
    at.set(k, [...(at.get(k) ?? []), i]);
  });
  b.forEach((y, j) => {
    const i = (at.get(`${y.t}:${y.X}:${y.Y}`) ?? []).find((n) => !usedA.has(n));
    if (i !== undefined) pair(i, j, false);
  });
  const byId = new Map(a.map((x, i) => [x.id, i]));
  b.forEach((y, j) => {
    if (usedB.has(j)) return;
    const i = byId.get(y.id);
    if (i !== undefined && !usedA.has(i) && a[i].t === y.t) pair(i, j, true);
  });
  b.forEach((y, j) => {
    if (usedB.has(j)) return;
    let best = -1;
    let dist = Infinity;
    a.forEach((x, i) => {
      if (usedA.has(i) || x.t !== y.t) return;
      const d = (x.X - y.X) ** 2 + (x.Y - y.Y) ** 2;
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best >= 0) pair(best, j, true);
  });
  const added: Record<string, number> = {};
  const removed: Record<string, number> = {};
  b.forEach((y, j) => {
    if (!usedB.has(j)) added[y.t] = (added[y.t] ?? 0) + 1;
  });
  a.forEach((x, i) => {
    if (!usedA.has(i)) removed[x.t] = (removed[x.t] ?? 0) + 1;
  });
  return { added, removed, moved, levels, before: a.length, after: b.length };
};

/**
 * The Designer's check before Save (the game saved the draft just before): what Save would change against the
 * layout in use, and `conflict` 1 (with who saved it and when) when the layout in use is not the one the draft was
 * made from. `notes`: what Save would refuse or leave out. Nothing is changed.
 * monsters / levels: [[monster id, now, after Save], ...] (tribes and Moloch).
 */
export const checkDesign = async (admin: User, baseid: string) => {
  const { kind, key, draft } = await draftOf(admin, baseid);
  let after = cleanBuildings((draft.buildingdata ?? {}) as BuildingData);
  const notes: string[] = [];
  let left = 0;
  if (kind === "kit") {
    try {
      const kitBuildings = yardToKit(after);
      left = count(after) - Object.keys(kitBuildings).length;
      after = kitToYard({ slot: Number(key), name: "", price: "auto", buildings: kitBuildings });
    } catch (err) {
      if (!(err instanceof DesignError)) throw err;
      notes.push(err.message);
    }
  } else if (count(after) === 0) {
    notes.push("The layout is empty.");
  }
  const diff = diffBuildings(cleanBuildings(currentLayout(kind, key)), after);
  const monsters: [string, number, number][] = [];
  const levels: [string, number, number][] = [];
  if (kind !== "kit") {
    const now = currentDefenders(kind, key);
    const counts = countsOf(draft.monsters);
    const academy = levelsOf(draft.academy);
    for (const id of [...new Set([...Object.keys(now.monsters), ...Object.keys(counts)])].sort()) {
      const was = now.monsters[id] ?? 0;
      const will = counts[id] ?? 0;
      if (was !== will) monsters.push([id, was, will]);
      if (will > 0) {
        const lw = now.academy[id]?.level ?? 1;
        const ln = academy[id]?.level ?? 1;
        if (lw !== ln) levels.push([id, lw, ln]);
      }
    }
  }
  const use = inUse(kind, key);
  const base = await draftBase(baseid);
  const conflict = Boolean(base && base !== use.fp);
  const unchanged = notes.length === 0 && left === 0 && monsters.length === 0 && levels.length === 0 &&
    Object.keys(diff.added).length === 0 && Object.keys(diff.removed).length === 0 && diff.moved === 0 && diff.levels === 0;
  return {
    kind,
    key,
    title: title(kind, key),
    ...diff,
    left,
    monsters,
    levels,
    notes,
    unchanged: unchanged ? 1 : 0,
    conflict: conflict ? 1 : 0,
    by: use.by ?? "",
    at: use.at,
  };
};

// ---------------------------------------------------------------------------------------------
// 15 October, QoL #412 / #413 / #417: the design bar's Tools window
// ---------------------------------------------------------------------------------------------

const sumOf = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/** The layouts a draft can start from or take monsters from: kits from kits, tribes and Moloch from either. */
const sourcesFor = (kind: Kind) => {
  const lists = listDesigns();
  if (kind === "kit") return lists.kits.filter((k) => k.buildings > 0).map((k) => ({ kind: k.kind, key: k.key, name: k.name }));
  return [...lists.tribes, ...lists.moloch].map((r) => ({ kind: r.kind, key: r.key, name: r.kind === "moloch" ? `Moloch ${r.name}` : r.name }));
};

/**
 * What the Tools window shows for the draft on screen: the kept versions of its layout (newest first: id, when
 * it was saved, by whom, how many buildings, how many monsters (-1: the stock yard's)), the layouts it can start
 * from, and for a kit its name and price.
 */
export const designTools = async (admin: User, baseid: string) => {
  const { kind, key } = await draftOf(admin, baseid);
  const versions = designHistory(kind, key).map((v) => ({
    id: v.id,
    at: v.updatedAt,
    by: v.updatedBy ?? "",
    buildings: count(v.buildingdata),
    monsters: kind === "kit" ? 0 : v.defenders ? sumOf(v.defenders.monsters) : -1,
  }));
  const use = inUse(kind, key);
  let kit: { name: string; price: Kit["price"]; empty: number } | null = null;
  if (kind === "kit") {
    const k = readKits().kits[Number(key) - 1];
    kit = { name: k?.name ?? "", price: k?.price ?? "auto", empty: k ? 0 : 1 };
  }
  return { kind, key, title: title(kind, key), versions, kept: HISTORY_KEPT, current: { by: use.by ?? "", at: use.at }, sources: sourcesFor(kind), kit };
};

/**
 * QoL #412: a kept version of a layout put back in use (the one in use is kept in its place, so this can be
 * undone too). "Revert to previous" is the newest one.
 */
export const useVersion = async (admin: User, kind: Kind, key: string, id: string) => {
  parseKey(kind, key);
  const version = designHistory(kind, key).find((v) => v.id === id);
  if (!version) throw new DesignError("That version is not kept any more. Open the Tools again.");
  if (kind === "kit") {
    const slot = Number(key);
    const before = readKits().kits[slot - 1];
    const buildings = yardToKit(version.buildingdata);
    if (!getDesign("kit-original", key)) await saveDesign("kit-original", key, kitToYard(before), admin.username);
    await dropHistory(kind, key, id);
    if (before) await addHistory(kind, key, kitToYard(before), null, kitSaved(before).by, kitSaved(before).at);
    writeKit(slot, {
      slot,
      name: before?.name ?? `Kit ${slot}`,
      price: before?.price ?? "auto",
      source: { designer: admin.username, savedAt: getCurrentDateTime() },
      buildings,
    });
    await logAdminAction(admin, "design-revert", null, `${title(kind, key)}: the version saved ${new Date(version.updatedAt * 1000).toISOString()} by ${version.updatedBy ?? "?"} put back`);
    return { saved: title(kind, key), buildings: Object.keys(buildings).length, stored: 0 };
  }
  const before = getDesign(kind, key);
  await dropHistory(kind, key, id);
  if (before) await addHistory(kind, key, before.buildingdata, before.defenders, before.updatedBy, before.updatedAt);
  await putDesign(kind, key, version.buildingdata, admin.username, version.defenders);
  await logAdminAction(admin, "design-revert", null, `${title(kind, key)}: the version saved ${new Date(version.updatedAt * 1000).toISOString()} by ${version.updatedBy ?? "?"} put back`);
  return { saved: title(kind, key), buildings: count(version.buildingdata), stored: await storedYards(kind, key, true) };
};

/**
 * QoL #413: the draft's buildings ("buildings"), or the monsters in its Compounds and their levels ("monsters"),
 * taken from another layout as it is in use. Only the draft changes (Save makes it the layout in use); the game
 * loads the draft again afterwards.
 */
export const copyFrom = async (admin: User, baseid: string, fromKind: Kind, fromKey: string, what: string) => {
  const { kind } = await draftOf(admin, baseid);
  parseKey(fromKind, fromKey);
  if ((kind === "kit") !== (fromKind === "kit")) {
    throw new DesignError(kind === "kit" ? "A kit can only start from another kit (an outpost's buildings)." : "A wild tribe or Moloch layout can only start from another wild tribe or Moloch layout.");
  }
  const em = postgres.em.fork();
  if (what === "buildings") {
    if (fromKind === "kit" && !readKits().kits[Number(fromKey) - 1]) throw new DesignError(`Kit ${fromKey} is empty.`);
    const buildingdata = currentLayout(fromKind, fromKey);
    if (count(buildingdata) === 0) throw new DesignError(`${title(fromKind, fromKey)} has no buildings.`);
    await em.nativeUpdate(Save, { baseid, type: "design", userid: admin.userid } as never, { buildingdata, buildinghealthdata: {} } as never);
  } else if (what === "monsters") {
    if (kind === "kit") throw new DesignError("A kit has no monsters of its own: an outpost's are its player's.");
    const defenders = currentDefenders(fromKind as "tribe" | "moloch", fromKey);
    await em.nativeUpdate(Save, { baseid, type: "design", userid: admin.userid } as never, { monsters: defenders.monsters, academy: defenders.academy } as never);
  } else {
    throw new DesignError("Copy what: buildings or monsters?");
  }
  return { copied: title(fromKind, fromKey), what };
};

const KIT_NAME_MAX = 32;
const MAX_PRICE = 2_000_000_000;

/** The shiny buy-out export-kits.ts gives a hand-set price that names none. */
const autoShiny = (r1: number, r2: number, r3: number) => Math.max(1, Math.ceil(Math.pow(Math.sqrt((r1 + r2 + r3) / 2), 0.75)));

const cleanKitTitle = (name: unknown) => String(name ?? "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, KIT_NAME_MAX);

/** A kit price as sent: "auto", or {r1, r2, r3[, shiny]} (whole numbers, 0 or more); null when it can't be read. */
const readPrice = (price: unknown): Kit["price"] | null => {
  let p = price;
  if (typeof p === "string" && p.trim() !== "auto") {
    try {
      p = JSON.parse(p);
    } catch {
      return null;
    }
  }
  if (p === "auto" || (typeof p === "string" && p.trim() === "auto")) return "auto";
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const o = p as Record<string, unknown>;
  const n = (v: unknown) => {
    const x = Math.floor(Number(v));
    return Number.isFinite(x) && x >= 0 && x <= MAX_PRICE ? x : NaN;
  };
  const r1 = n(o.r1);
  const r2 = n(o.r2);
  const r3 = n(o.r3);
  if ([r1, r2, r3].some(Number.isNaN)) return null;
  const given = o.shiny === undefined || o.shiny === null || o.shiny === "" ? NaN : n(o.shiny);
  return { r1, r2, r3, shiny: Number.isNaN(given) ? autoShiny(r1, r2, r3) : given };
};

/** QoL #417: a kit's name and price in the kit file (its layout is left as it is). */
export const setKitInfo = async (admin: User, key: string, name: unknown, price: unknown) => {
  const { slot } = parseKey("kit", key) as { slot: number };
  const kit = readKits().kits[slot - 1];
  if (!kit) throw new DesignError(`Kit ${slot} has no layout yet: save one first.`);
  const clean = cleanKitTitle(name);
  if (!clean) throw new DesignError("A kit needs a name.");
  const p = readPrice(price);
  if (!p) throw new DesignError("The price is \"auto\" or bone, coal and sulfur (and shiny), whole numbers.");
  const old = { name: kit.name, price: kit.price };
  writeKit(slot, { ...kit, name: clean, price: p });
  await logAdminAction(admin, "design-kitinfo", null, `kit ${slot}: "${old.name}" -> "${clean}", price ${JSON.stringify(old.price)} -> ${JSON.stringify(p)}`);
  return { name: clean, price: p };
};

// ---------------------------------------------------------------------------------------------
// 15 October, QoL #420: export and import ("inferno-designs" version 1, as scripts/export-designs.ts writes it)
// ---------------------------------------------------------------------------------------------

/** Everything made in the Designer, in the export script's format (the kept versions not included). */
export const exportDesigns = () => {
  const designs = allDesigns();
  let kits: unknown = null;
  if (existsSync(KIT_FILE)) {
    try {
      kits = JSON.parse(readFileSync(KIT_FILE, "utf8"));
    } catch {
      throw new DesignError("The kit file (inferno-kits.json) could not be read.");
    }
  }
  const file = { format: "inferno-designs", version: 1, exportedAt: new Date().toISOString(), designs, kits };
  return {
    file: JSON.stringify(file, null, 1),
    designs: designs.filter((d) => d.kind !== "kit-original").length,
    kits: kits && Array.isArray((kits as KitFile).kits) ? (kits as KitFile).kits.filter(Boolean).length : 0,
  };
};

const MAX_IMPORT_BYTES = 6_000_000;
const MAX_IMPORT_BUILDINGS = 2000;

/** An imported layout's buildings, checked (each a building type, a place, a level); a reason when unusable. */
const importBuildings = (data: unknown): BuildingData | string => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "no buildings";
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return "no buildings";
  if (entries.length > MAX_IMPORT_BUILDINGS) return `more than ${MAX_IMPORT_BUILDINGS} buildings`;
  const out: BuildingData = {};
  for (const [id, raw] of entries) {
    if (!/^\d{1,6}$/.test(id)) return `building id "${id.slice(0, 20)}"`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return `building ${id} is not a building`;
    const b = raw as Record<string, unknown>;
    const t = Number(b.t);
    const X = Number(b.X);
    const Y = Number(b.Y);
    if (!Number.isInteger(t) || t < 1 || t > 999) return `building ${id}: no building type`;
    if (!Number.isFinite(X) || !Number.isFinite(Y) || Math.abs(X) > 5000 || Math.abs(Y) > 5000) return `building ${id}: no place in the yard`;
    if (b.l !== undefined && !(Number.isInteger(Number(b.l)) && Number(b.l) >= 0 && Number(b.l) <= 100)) return `building ${id}: level ${String(b.l).slice(0, 10)}`;
    if (b.prefab !== undefined && !(Number.isInteger(Number(b.prefab)) && Number(b.prefab) >= 0 && Number(b.prefab) <= 100)) return `building ${id}: level ${String(b.prefab).slice(0, 10)}`;
    if (JSON.stringify(b).length > 4000) return `building ${id} carries too much`;
    out[id] = { ...b, t, X, Y };
  }
  return cleanBuildings(out);
};

/**
 * QoL #420: a designs file put in use (`apply`), or only looked at (the answer says what it holds and what would
 * change). Wild tribe and Moloch layouts in it (with their monsters; none given: the stock yard's) replace the ones
 * in use; kits in it replace the kit in their slot (one write of the kit file, copied first). Layouts and kit
 * slots the file has nothing for are left as they are; its "kit-original" rows and kept versions belong to the
 * server it came from and are not taken. Every layout or kit replaced is kept as a version first (Revert).
 */
export const importDesigns = async (admin: User, text: unknown, apply: boolean) => {
  const raw = typeof text === "string" ? text : JSON.stringify(text ?? null);
  if (raw.length > MAX_IMPORT_BYTES) throw new DesignError("That file is too big to be a designs file.");
  let file: Record<string, unknown>;
  try {
    file = JSON.parse(raw);
  } catch {
    throw new DesignError("That is not a designs file (it is not JSON).");
  }
  if (!file || typeof file !== "object" || file.format !== "inferno-designs") throw new DesignError("That is not a Designer export (format \"inferno-designs\").");
  if (Number(file.version) !== 1) throw new DesignError(`Version ${String(file.version).slice(0, 10)} of the designs file is not known here (1 is).`);

  const skipped: string[] = [];
  const layouts = new Map<string, { kind: "tribe" | "moloch"; key: string; buildingdata: BuildingData; defenders: Defenders | null; changed: boolean }>();
  for (const row of (Array.isArray(file.designs) ? file.designs : []).slice(0, 500) as Record<string, unknown>[]) {
    const kind = String(row?.kind ?? "").slice(0, 20);
    const key = String(row?.key ?? "").slice(0, 40);
    if (kind === "kit-original" || kind.startsWith("hist-")) continue;
    if (kind !== "tribe" && kind !== "moloch") {
      skipped.push(`${kind} ${key}: not a wild tribe or Moloch layout`);
      continue;
    }
    try {
      parseKey(kind, key);
    } catch (err) {
      skipped.push(`${kind} ${key}: ${(err as Error).message}`);
      continue;
    }
    const buildingdata = importBuildings(row.buildingdata);
    if (typeof buildingdata === "string") {
      skipped.push(`${title(kind, key)}: ${buildingdata}`);
      continue;
    }
    const defenders = row.monsters && typeof row.monsters === "object" ? { monsters: countsOf(row.monsters), academy: levelsOf(row.academy) } : null;
    const design = getDesign(kind, key);
    const changed = !design || !same({ b: design.buildingdata, m: design.defenders }, { b: buildingdata, m: defenders });
    layouts.set(`${kind}:${key}`, { kind, key, buildingdata, defenders, changed });
  }

  const kitsNow = readKits();
  const kits: { slot: number; kit: Kit; changed: boolean }[] = [];
  const kitFile = file.kits as { kits?: unknown } | null | undefined;
  if (kitFile && typeof kitFile === "object" && Array.isArray(kitFile.kits)) {
    (kitFile.kits as unknown[]).slice(0, KIT_SLOTS).forEach((k, i) => {
      const slot = i + 1;
      if (!k) return;
      const kit = k as Record<string, unknown>;
      const checked = importBuildings(kit.buildings);
      if (typeof checked === "string") {
        skipped.push(`kit ${slot}: ${checked}`);
        return;
      }
      let buildings: Record<string, KitBuilding>;
      try {
        buildings = yardToKit(kitToYard({ slot, name: "", price: "auto", buildings: checked as unknown as Record<string, KitBuilding> }));
      } catch (err) {
        skipped.push(`kit ${slot}: ${(err as Error).message}`);
        return;
      }
      const before = kitsNow.kits[slot - 1];
      const name = cleanKitTitle(kit.name) || before?.name || `Kit ${slot}`;
      let price = readPrice(kit.price);
      if (!price) {
        skipped.push(`kit ${slot}: its price could not be read (the price in use is kept)`);
        price = before?.price ?? "auto";
      }
      const changed = !before || !same(before.buildings, buildings) || before.name !== name || !same(before.price, price);
      kits.push({ slot, kit: { slot, name, price, source: { designer: `${admin.username} (import)`, savedAt: getCurrentDateTime() }, buildings }, changed });
    });
  }

  const all = [...layouts.values()];
  const summary = {
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt.slice(0, 40) : "",
    tribes: all.filter((l) => l.kind === "tribe").length,
    tribesChanged: all.filter((l) => l.kind === "tribe" && l.changed).length,
    moloch: all.filter((l) => l.kind === "moloch").length,
    molochChanged: all.filter((l) => l.kind === "moloch" && l.changed).length,
    kits: kits.map((k) => ({ slot: k.slot, name: k.kit.name, buildings: Object.keys(k.kit.buildings).length, changed: k.changed ? 1 : 0 })),
    skipped: skipped.slice(0, 20),
    skippedCount: skipped.length,
  };
  if (!apply) return { preview: 1, ...summary };

  const by = `${admin.username} (import)`;
  for (const l of all) {
    if (!l.changed) continue;
    const before = getDesign(l.kind, l.key);
    if (before) await addHistory(l.kind, l.key, before.buildingdata, before.defenders, before.updatedBy, before.updatedAt);
    await putDesign(l.kind, l.key, l.buildingdata, by, l.defenders);
  }
  const kitChanges = kits.filter((k) => k.changed);
  if (kitChanges.length) {
    const fileNow = readKits();
    for (const { slot, kit } of kitChanges) {
      const before = fileNow.kits[slot - 1];
      if (!getDesign("kit-original", String(slot))) await saveDesign("kit-original", String(slot), kitToYard(before), admin.username);
      if (before && !same(before.buildings, kit.buildings)) await addHistory("kit", String(slot), kitToYard(before), null, kitSaved(before).by, kitSaved(before).at);
      fileNow.kits[slot - 1] = kit;
    }
    mkdirSync(KIT_DIR, { recursive: true });
    for (const { slot, kit } of kitChanges) {
      const pictures = renderKitPictures(Object.values(kit.buildings));
      writeFileSync(path.join(KIT_DIR, `kit-${slot}.png`), pictures.thumb);
      writeFileSync(path.join(KIT_DIR, `kit-${slot}-large.png`), pictures.large);
    }
    fileNow.version = Date.now();
    // (one copy of the kit file as it was, QoL #271, then one write)
    backupKits();
    writeFileSync(KIT_FILE, JSON.stringify(fileNow, null, 2));
  }
  const changedCount = all.filter((l) => l.changed).length;
  await logAdminAction(admin, "design-import", null,
    `designs file of ${summary.exportedAt || "?"}: ${changedCount} layouts and ${kitChanges.length} kits replaced, ${skipped.length} skipped`);
  return { imported: 1, layoutsReplaced: changedCount, kitsReplaced: kitChanges.length, ...summary };
};
