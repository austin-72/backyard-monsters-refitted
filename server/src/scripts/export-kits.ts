import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { MikroORM } from "@mikro-orm/postgresql";

import ormConfig from "../mikro-orm.config.js";
import { Save } from "../database/models/save.model.js";
import { World } from "../database/models/world.model.js";
import { WorldMapCell } from "../database/models/worldmapcell.model.js";
import { MapRoomCell } from "../enums/MapRoom.js";
import { renderKitPictures, type KitBuilding } from "../services/kits/kitPreview.js";

/**
 * Outpost kits from real outposts
 * ====================================================================
 * Build an outpost in the game exactly how a kit should look, then point this command at it:
 *
 *   bun src/scripts/export-kits.ts 1=-54,-130 2=-60,-128 3=-71,-140 4=... 5=... 6=...
 *
 *   docker compose exec web bun src/scripts/export-kits.ts 1=-54,-130 ...      (Docker)
 *
 * `N=x,y` puts the outpost standing on map cell (x, y) into kit slot N (1-6). Coordinates can be
 * typed the way the game shows them (negative) or as plain numbers. Slots you leave out keep
 * whatever they held before, so kits can be redone one at a time.
 *
 * Options:
 *   world=<uuid>   only needed when the server has more than one world
 *   name3="..."    set the display name of kit 3 (otherwise the old name, or "Kit 3", is kept)
 *   price3=r1,r2,r3[,shiny]
 *                  set kit 3's price in bone, coal, sulfur. Leave the shiny buy-out off and it is
 *                  worked out with the game's own top-up formula, ceil((sqrt(total / 2)) ^ 0.75)
 *
 * Output, in public/assets/kits/:
 *   inferno-kits.json      what the client downloads when the kit popup opens
 *   kit-N.png              140 x 90 thumbnail, rendered from the layout with the game's own building art
 *   kit-N-large.png        450 x 300 preview
 *
 * Prices: every kit gets `"price": "auto"`, which makes the client add up the real building costs.
 * To set a price by hand, edit inferno-kits.json:
 *   "price": { "r1": 3000000, "r2": 3000000, "r3": 1500000, "shiny": 300 }
 * Hand-set names and prices survive re-running the command.
 *
 * The files are served straight away. With Docker, docker-compose.yml binds this folder to
 * server/public/assets/kits on the host, so they land on disk and survive rebuilds on their own.
 * ====================================================================
 */

const KIT_SLOTS = 6;
const OUTPUT_DIR = path.join(process.cwd(), "public", "assets", "kits");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "inferno-kits.json");

const OUTPOST_HALL = 112;

interface Kit {
  slot: number;
  name: string;
  price: "auto" | { r1: number; r2: number; r3: number; shiny: number };
  source: { x: number; y: number; baseid: string };
  buildings: Record<string, KitBuilding>;
}

interface KitFile {
  version: number;
  kits: (Kit | null)[];
}

// --------------------------------------------------------------------------------------
// Arguments
// --------------------------------------------------------------------------------------

const slots = new Map<number, { x: number; y: number }>();
const names = new Map<number, string>();
const prices = new Map<number, { r1: number; r2: number; r3: number; shiny: number }>();
let worldArg: string | undefined;

for (const arg of process.argv.slice(2)) {
  const [key, ...rest] = arg.split("=");
  const value = rest.join("=");

  if (/^[1-6]$/.test(key)) {
    const match = value.match(/^\s*\(?\s*(-?\d+)\s*[,xX]\s*(-?\d+)\s*\)?\s*$/);
    if (!match) fail(`Could not read coordinates "${value}" for kit ${key}. Use N=x,y - for example 1=-54,-130`);
    // The game shows coordinates as negatives; the map itself uses the positive values.
    slots.set(Number(key), { x: Math.abs(Number(match![1])), y: Math.abs(Number(match![2])) });
  } else if (/^name[1-6]$/.test(key)) names.set(Number(key.slice(4)), value);
  else if (/^price[1-6]$/.test(key)) {
    const parts = value.split(/[,\s]+/).filter(Boolean).map((part) => Number(part.replace(/_/g, "")));
    if (parts.length < 3 || parts.length > 4 || parts.some((part) => !Number.isFinite(part) || part < 0))
      fail(`Could not read "${arg}". Use priceN=bone,coal,sulfur or priceN=bone,coal,sulfur,shiny`);

    const [r1, r2, r3] = parts;
    const shiny = parts[3] ?? Math.max(1, Math.ceil(Math.pow(Math.sqrt((r1 + r2 + r3) / 2), 0.75)));
    prices.set(Number(key.slice(5)), { r1, r2, r3, shiny });
  }
  else if (key === "world") worldArg = value;
  else fail(`Unknown argument "${arg}".`);
}

if (slots.size === 0 && names.size === 0 && prices.size === 0)
  fail("Nothing to do. Usage: bun src/scripts/export-kits.ts 1=x,y 2=x,y ... [world=<uuid>] [name1=\"...\"]");

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}


// --------------------------------------------------------------------------------------
// Export
// --------------------------------------------------------------------------------------

const orm = await MikroORM.init({ ...ormConfig, debug: false });
const em = orm.em.fork();

try {
  const worlds = await em.find(World, {});
  let world: World | undefined;

  if (worldArg) world = worlds.find((candidate) => candidate.uuid === worldArg);
  else if (worlds.length === 1) world = worlds[0];

  if (!world && slots.size > 0) {
    fail(
      worldArg
        ? `No world with uuid ${worldArg}.`
        : `This server has ${worlds.length} worlds. Add world=<uuid>:\n${worlds.map((w) => `  ${w.uuid}`).join("\n")}`,
    );
  }

  let file: KitFile = { version: 0, kits: [] };

  if (existsSync(OUTPUT_FILE)) {
    try {
      file = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
    } catch {
      console.warn(`${OUTPUT_FILE} could not be read and is being replaced.`);
    }
  }

  file.kits = Array.from({ length: KIT_SLOTS }, (_, index) => file.kits?.[index] ?? null);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [slot, { x, y }] of [...slots].sort((a, b) => a[0] - b[0])) {
    const cell = await em.findOne(WorldMapCell, { world: world!.uuid, x, y });

    if (!cell || cell.base_type !== MapRoomCell.OUTPOST)
      fail(`Kit ${slot}: there is no outpost on cell (${x}, ${y}) of world ${world!.uuid}.`);

    const save = await em.findOne(Save, { baseid: cell!.baseid });
    const buildingdata = (save?.buildingdata ?? {}) as Record<string, Record<string, unknown>>;
    const source = Object.values(buildingdata).filter((b) => b && typeof b.t === "number");

    if (!save || source.length === 0) fail(`Kit ${slot}: the outpost on (${x}, ${y}) has no saved buildings yet.`);

    const unfinished = source.filter((b) => b.t !== OUTPOST_HALL && !(Number(b.l) >= 1));
    if (unfinished.length > 0)
      console.warn(`Kit ${slot}: ${unfinished.length} building(s) were still under construction and are exported at level 1.`);

    // Hall first with id 0, everything else renumbered, exactly like the stock kit data.
    const hall = source.find((b) => b.t === OUTPOST_HALL);
    if (!hall) fail(`Kit ${slot}: the outpost on (${x}, ${y}) has no outpost hall.`);

    const buildings: Record<string, KitBuilding> = { "0": { t: OUTPOST_HALL, X: Number(hall!.X), Y: Number(hall!.Y), id: 0 } };
    let nextId = 1;

    for (const building of source) {
      if (building === hall) continue;
      buildings[String(nextId)] = {
        t: Number(building.t),
        X: Number(building.X),
        Y: Number(building.Y),
        id: nextId,
        prefab: Math.max(1, Number(building.l) || 1),
      };
      nextId++;
    }

    const previous = file.kits[slot - 1];
    file.kits[slot - 1] = {
      slot,
      name: names.get(slot) ?? previous?.name ?? `Kit ${slot}`,
      price: prices.get(slot) ?? previous?.price ?? "auto",
      source: { x, y, baseid: cell!.baseid },
      buildings,
    };

    const list = Object.values(buildings);
    const pictures = renderKitPictures(list);
    writeFileSync(path.join(OUTPUT_DIR, `kit-${slot}.png`), pictures.thumb);
    writeFileSync(path.join(OUTPUT_DIR, `kit-${slot}-large.png`), pictures.large);

    const counts = new Map<number, number>();
    for (const b of list) counts.set(b.t, (counts.get(b.t) ?? 0) + 1);
    console.log(
      `Kit ${slot} "${file.kits[slot - 1]!.name}" <- outpost at (-${x}, -${y}): ${list.length} buildings ` +
        `[${[...counts].sort((a, b) => a[0] - b[0]).map(([t, n]) => `t${t}x${n}`).join(" ")}]`,
    );
  }

  for (const [slot, name] of names) {
    const kit = file.kits[slot - 1];
    if (kit) kit.name = name;
    else console.warn(`name${slot} ignored: kit ${slot} has no layout yet.`);
  }
  for (const [slot, price] of prices) {
    const kit = file.kits[slot - 1];
    if (kit) kit.price = price;
    else console.warn(`price${slot} ignored: kit ${slot} has no layout yet.`);
  }

  file.version = Date.now();
  writeFileSync(OUTPUT_FILE, JSON.stringify(file, null, 2));

  const describe = (kit: Kit) =>
    kit.price === "auto" ? "price auto" : `${kit.price.r1} / ${kit.price.r2} / ${kit.price.r3}, ${kit.price.shiny} shiny`;
  const filled = file.kits.map((kit, index) => (kit ? `${index + 1}: ${kit.name} (${describe(kit)})` : `${index + 1}: (empty)`));
  console.log(`\nWrote ${OUTPUT_FILE}\n  ${filled.join("\n  ")}`);
  console.log("\nLive now: reopen the kit popup in the game. (Docker: the folder is bound to server/public/assets/kits on the host.)\n");
} finally {
  await orm.close(true);
}
