import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
import { postgres } from "../../server.js";
import { logAdminAction } from "./admin.js";
import { deleteDesign, getDesign, saveDesign, type BuildingData, type Defenders } from "./designStore.js";
import { monsterStats } from "../../game-data/stats/monsterStats.js";

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
  writeFileSync(KIT_FILE, JSON.stringify(file, null, 2));
};

const kitName = (slot: number) => readKits().kits[slot - 1]?.name ?? "";

/** A kit's buildings as a yard's buildings: the hall first (id 0), the rest at the kit's levels. */
const kitToYard = (kit: Kit | null): BuildingData => {
  if (!kit || !kit.buildings) return structuredClone(EMPTY_KIT);
  const yard: BuildingData = {};
  for (const [id, b] of Object.entries(kit.buildings)) {
    yard[id] = { id: Number(b.id), t: b.t, X: b.X, Y: b.Y, l: b.t === OUTPOST_HALL ? 1 : Math.max(1, Number(b.prefab) || 1) };
  }
  return yard;
};

/** A yard's buildings as a kit's: exactly what export-kits.ts takes from an outpost. */
const yardToKit = (buildingdata: BuildingData): Record<string, KitBuilding> => {
  const source = Object.values(buildingdata).filter((b) => b && typeof b.t === "number");
  const hall = source.find((b) => b.t === OUTPOST_HALL);
  if (!hall) throw new DesignError("The kit has no outpost hall. Put one back before saving.");
  const buildings: Record<string, KitBuilding> = { "0": { t: OUTPOST_HALL, X: Number(hall.X), Y: Number(hall.Y), id: 0 } };
  let next = 1;
  for (const b of source) {
    if (b === hall || !OUTPOST_BUILDINGS.has(Number(b.t))) continue;
    buildings[String(next)] = { t: Number(b.t), X: Number(b.X), Y: Number(b.Y), id: next, prefab: Math.max(1, Number(b.l) || 1) };
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
      return {
        kind: "kit",
        key: String(i + 1),
        name: kit ? `Kit ${i + 1}: ${kit.name}` : `Kit ${i + 1} (empty)`,
        buildings: kit ? Object.keys(kit.buildings ?? {}).length : 0,
        ...describe(original),
      };
    }),
    tribes: ladders().flatMap((levels, tribe) =>
      levels.map((level) => {
        const key = `${tribe}-${level}`;
        const design = getDesign("tribe", key);
        const monsters = Object.values(currentDefenders("tribe", key).monsters).reduce((a, b) => a + b, 0);
        return { kind: "tribe", key, name: `${TRIBE_NAMES[tribe]} level ${level}`, buildings: count(currentLayout("tribe", key)), monsters, ...describe(design) };
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
export const openDesign = async (admin: User, kind: Kind, key: string) => {
  const k = parseKey(kind, key);
  const baseid = designBaseId(admin.userid, k.index);
  const buildingdata = currentLayout(kind, key);
  const now = getCurrentDateTime();
  const em = postgres.em.fork();
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

/** Saves the draft (which the game saved just before) as the layout in use. */
export const publishDesign = async (admin: User, baseid: string) => {
  const { kind, key, draft } = await draftOf(admin, baseid);
  const buildingdata = cleanBuildings((draft.buildingdata ?? {}) as BuildingData);
  const buildings = count(buildingdata);
  if (buildings === 0) throw new DesignError("The layout is empty.");

  if (kind === "kit") {
    const slot = Number(key);
    const file = readKits();
    const before = file.kits[slot - 1];
    // Kept once: the kit as it was before any admin changed it, for Reset.
    if (!getDesign("kit-original", key)) await saveDesign("kit-original", key, kitToYard(before), admin.username);
    const kit: Kit = {
      slot,
      name: before?.name ?? `Kit ${slot}`,
      price: before?.price ?? "auto",
      source: { designer: admin.username },
      buildings: yardToKit(buildingdata),
    };
    writeKit(slot, kit);
    await logAdminAction(admin, "design-save", null, `kit ${slot} "${kit.name}": ${Object.keys(kit.buildings).length} buildings`);
    return { saved: title(kind, key), buildings: Object.keys(kit.buildings).length, stored: 0 };
  }

  const defenders: Defenders = { monsters: countsOf(draft.monsters), academy: levelsOf(draft.academy) };
  await saveDesign(kind, key, buildingdata, admin.username, defenders);
  const housed = Object.values(defenders.monsters).reduce((a, b) => a + b, 0);
  await logAdminAction(admin, "design-save", null, `${title(kind, key)}: ${buildings} buildings, ${housed} monsters`);
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
    writeKit(slot, !hasHall || onlyHall ? null : {
      slot,
      name: before?.name ?? `Kit ${slot}`,
      price: before?.price ?? "auto",
      buildings: yardToKit(original.buildingdata),
    });
    await deleteDesign("kit-original", key);
  } else {
    if (!getDesign(kind, key)) throw new DesignError("This layout is the stock one already.");
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
// Yards already on the map
// ---------------------------------------------------------------------------------------------

/**
 * The stored yards a tribe level / Moloch base's strongholds have on the map now (made before the change),
 * not counting destroyed ones (their state is players' progress) or ones being attacked right now.
 * `countOnly`: how many; else they are deleted (the next look at the cell makes them again, from the design).
 */
const storedYards = async (kind: Kind, key: string, countOnly: boolean) => {
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
  const saves = (await em.find(Save, { ...where, destroyed: 0 } as never, { fields: ["baseid", "attackid", "savetime"] }))
    .filter((s) => !isGauntletBaseId(s.baseid) && !(s.attackid !== 0 && (s.savetime ?? 0) >= busySince));
  if (countOnly || saves.length === 0) return saves.length;
  const ids = saves.map((s) => s.baseid);
  const yards = await em.nativeDelete(Save, { baseid: { $in: ids }, type: BaseType.TRIBE });
  await em.nativeDelete(WorldMapCell, { base_type: MapRoomCell.WM, baseid: { $in: ids } });
  return yards;
};

/** Makes the stored yards of a tribe level (or a Moloch base's strongholds) again, with the layout in use. */
export const replaceOnMap = async (admin: User, kind: Kind, key: string) => {
  parseKey(kind, key);
  if (kind === "kit") throw new DesignError("Kits are not on the map: players' outposts keep what they built.");
  const replaced = await storedYards(kind, key, false);
  await logAdminAction(admin, "design-replace", null, `${title(kind, key)}: ${replaced} stored yards made again`);
  return { replaced };
};

/** Every draft of this admin goes (leaving the Designer). */
export const closeDesigns = async (admin: User) => {
  const em = postgres.em.fork();
  const from = designBaseId(admin.userid, 0);
  const to = designBaseId(admin.userid, 999);
  return em.nativeDelete(Save, { type: "design", userid: admin.userid, baseid: { $gte: from, $lte: to } } as never);
};
