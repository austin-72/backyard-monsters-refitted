import { deflateSync, inflateSync } from "zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { MikroORM } from "@mikro-orm/postgresql";

import ormConfig from "../mikro-orm.config.js";
import { Save } from "../database/models/save.model.js";
import { World } from "../database/models/world.model.js";
import { WorldMapCell } from "../database/models/worldmapcell.model.js";
import { MapRoomCell } from "../enums/MapRoom.js";
import { previewSprites } from "../game-data/kits/previewSprites.js";

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

interface KitBuilding {
  t: number;
  X: number;
  Y: number;
  id: number;
  prefab?: number;
}

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
// Preview images (pure JS PNG writer; nothing to install)
// --------------------------------------------------------------------------------------

/** Footprint edge lengths, in yard units, by building type. Only used to draw previews. */
const FOOTPRINT: Record<number, number> = {
  // Taken from each building class's _footprint in the client.
  1: 70, 2: 70, 3: 70, 4: 70, 5: 90, 6: 80, 8: 100, 9: 80, 10: 100, 11: 90, 12: 70, 13: 100,
  14: 160, 17: 20, 21: 70, 24: 20, 26: 80, 112: 130, 128: 160, 129: 70, 130: 70, 132: 70,
};

type Color = [number, number, number];

const colorOf = (type: number): Color => {
  if (type === OUTPOST_HALL || type === 14) return [255, 255, 255];
  if (type === 17) return [205, 195, 170]; // bone walls
  if (type === 24) return [255, 220, 60]; // traps
  if ([21, 129, 130, 132].includes(type)) return [255, 90, 40]; // towers
  if (type === 128) return [200, 90, 255]; // compound
  if (type >= 1 && type <= 4) return [90, 220, 110]; // harvesters
  return [90, 170, 255];
};

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Uint8Array) => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};

const encodePng = (width: number, height: number, rgb: Uint8Array) => {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bit, truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
};

// ---- real building art ---------------------------------------------------------------------------

interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");
const bitmapCache = new Map<string, Bitmap | null>();

/** Minimal PNG reader: 8 bit RGBA / RGB, not interlaced - which is what every building sprite is. */
const readPng = (file: string): Bitmap | null => {
  if (bitmapCache.has(file)) return bitmapCache.get(file)!;
  let bitmap: Bitmap | null = null;

  try {
    const bytes = readFileSync(file);
    if (bytes.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");

    let offset = 8;
    let width = 0;
    let height = 0;
    let channels = 0;
    const idat: Buffer[] = [];

    while (offset < bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      const body = bytes.subarray(offset + 8, offset + 8 + length);

      if (type === "IHDR") {
        width = body.readUInt32BE(0);
        height = body.readUInt32BE(4);
        const colorType = body[9];
        if (body[8] !== 8 || body[12] !== 0 || (colorType !== 6 && colorType !== 2)) throw new Error("unsupported PNG flavour");
        channels = colorType === 6 ? 4 : 3;
      } else if (type === "IDAT") idat.push(body);
      else if (type === "IEND") break;

      offset += 12 + length;
    }

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const pixels = new Uint8Array(width * height * 4);
    let previous = new Uint8Array(stride);

    for (let y = 0; y < height; y++) {
      const filter = raw[y * (stride + 1)];
      const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));

      for (let i = 0; i < stride; i++) {
        const left = i >= channels ? line[i - channels] : 0;
        const up = previous[i];
        const upLeft = i >= channels ? previous[i - channels] : 0;
        let predictor = 0;

        if (filter === 1) predictor = left;
        else if (filter === 2) predictor = up;
        else if (filter === 3) predictor = (left + up) >> 1;
        else if (filter === 4) {
          const estimate = left + up - upLeft;
          const dl = Math.abs(estimate - left);
          const du = Math.abs(estimate - up);
          const dul = Math.abs(estimate - upLeft);
          predictor = dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
        }
        line[i] = (line[i] + predictor) & 0xff;
      }

      for (let x = 0; x < width; x++) {
        pixels[(y * width + x) * 4] = line[x * channels];
        pixels[(y * width + x) * 4 + 1] = line[x * channels + 1];
        pixels[(y * width + x) * 4 + 2] = line[x * channels + 2];
        pixels[(y * width + x) * 4 + 3] = channels === 4 ? line[x * channels + 3] : 255;
      }
      previous = line;
    }
    bitmap = { width, height, data: pixels };
  } catch {
    bitmap = null;
  }

  bitmapCache.set(file, bitmap);
  return bitmap;
};

interface Layer {
  bitmap: Bitmap;
  x: number;
  y: number;
  /** Part of the bitmap to draw (frame 0 of a sprite sheet). */
  width: number;
  height: number;
}

const levelOf = (building: KitBuilding) => Math.max(1, Number(building.prefab ?? (building as unknown as { l?: number }).l ?? 1));

/** The sprites the game itself would draw for this building, positioned in yard pixels. */
const layersOf = (building: KitBuilding): Layer[] => {
  const art = previewSprites[building.t];
  if (!art) return [];

  const levels = Object.keys(art.levels).map(Number).sort((p, q) => p - q);
  const level = levels.filter((candidate) => candidate <= levelOf(building)).pop() ?? levels[0];
  const sprite = art.levels[level];
  const originX = Math.floor(building.X - building.Y);
  const originY = Math.floor((building.X + building.Y) / 2);
  const layers: Layer[] = [];

  if (sprite.top) {
    const bitmap = readPng(path.join(ASSETS_DIR, art.base, sprite.top[0]));
    if (bitmap) layers.push({ bitmap, x: originX + sprite.top[1], y: originY + sprite.top[2], width: bitmap.width, height: bitmap.height });
  }
  if (sprite.anim) {
    const bitmap = readPng(path.join(ASSETS_DIR, art.base, sprite.anim[0]));
    if (bitmap) {
      layers.push({
        bitmap,
        x: originX + sprite.anim[1],
        y: originY + sprite.anim[2],
        width: Math.min(bitmap.width, sprite.anim[3]),
        height: Math.min(bitmap.height, sprite.anim[4]),
      });
    }
  }
  return layers;
};

/**
 * Renders the kit with the game's own building art, the way the yard draws it (isometric, back to
 * front), then scales the result into each preview size. A building whose art cannot be read falls
 * back to a flat coloured footprint, so a preview is always produced.
 */
const renderYard = (buildings: KitBuilding[]): Bitmap => {
  const iso = (x: number, y: number): [number, number] => [x - y, (x + y) / 2];
  const items = buildings
    .map((building) => {
      const size = FOOTPRINT[building.t] ?? 70;
      const quad = [iso(building.X, building.Y), iso(building.X + size, building.Y), iso(building.X + size, building.Y + size), iso(building.X, building.Y + size)];
      return { building, size, quad, layers: layersOf(building), depth: (building.X + building.Y) / 2 + size / 2 };
    })
    .sort((p, q) => p.depth - q.depth);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    for (const [x, y] of item.quad) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (const layer of item.layers) {
      minX = Math.min(minX, layer.x);
      maxX = Math.max(maxX, layer.x + layer.width);
      minY = Math.min(minY, layer.y);
      maxY = Math.max(maxY, layer.y + layer.height);
    }
  }

  const margin = 24;
  const width = Math.max(1, Math.ceil(maxX - minX) + margin * 2);
  const height = Math.max(1, Math.ceil(maxY - minY) + margin * 2);
  const canvas = new Uint8Array(width * height * 4);

  // Scorched ground with a little grain, so the yard does not float on a flat colour.
  for (let i = 0; i < width * height; i++) {
    const grain = ((Math.imul(i, 2654435761) >>> 24) % 9) - 4;
    canvas.set([64 + grain, 38 + grain, 30 + grain, 255], i * 4);
  }

  const blend = (px: number, py: number, r: number, g: number, b: number, alpha: number) => {
    if (px < 0 || py < 0 || px >= width || py >= height || alpha === 0) return;
    const at = (py * width + px) * 4;
    const a = alpha / 255;
    canvas[at] = r * a + canvas[at] * (1 - a);
    canvas[at + 1] = g * a + canvas[at + 1] * (1 - a);
    canvas[at + 2] = b * a + canvas[at + 2] * (1 - a);
  };

  for (const item of items) {
    // A soft footprint under every building: reads as a shadow and shows the tile it occupies.
    const quad = item.quad.map(([x, y]) => [x - minX + margin, y - minY + margin]);
    const left = Math.floor(Math.min(...quad.map((p) => p[0])));
    const right = Math.ceil(Math.max(...quad.map((p) => p[0])));
    const top = Math.floor(Math.min(...quad.map((p) => p[1])));
    const bottom = Math.ceil(Math.max(...quad.map((p) => p[1])));
    const [r, g, b] = item.layers.length > 0 ? [0, 0, 0] : colorOf(item.building.t);

    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        let inside = true;
        for (let k = 0; k < 4 && inside; k++) {
          const [ax, ay] = quad[k];
          const [bx, by] = quad[(k + 1) % 4];
          if ((bx - ax) * (py + 0.5 - ay) - (by - ay) * (px + 0.5 - ax) < 0) inside = false;
        }
        if (inside) blend(px, py, r, g, b, item.layers.length > 0 ? 70 : 255);
      }
    }

    for (const layer of item.layers) {
      const baseX = Math.round(layer.x - minX + margin);
      const baseY = Math.round(layer.y - minY + margin);

      for (let sy = 0; sy < layer.height; sy++) {
        for (let sx = 0; sx < layer.width; sx++) {
          const at = (sy * layer.bitmap.width + sx) * 4;
          blend(baseX + sx, baseY + sy, layer.bitmap.data[at], layer.bitmap.data[at + 1], layer.bitmap.data[at + 2], layer.bitmap.data[at + 3]);
        }
      }
    }
  }
  return { width, height, data: canvas };
};

/** Fits the rendered yard into a preview of the given size (area-averaged, centred, letterboxed). */
const drawPreview = (yard: Bitmap, width: number, height: number) => {
  const pixels = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) pixels.set([38, 22, 18], i * 3);

  const scale = Math.min(width / yard.width, height / yard.height, 1.5);
  const drawnWidth = Math.max(1, Math.round(yard.width * scale));
  const drawnHeight = Math.max(1, Math.round(yard.height * scale));
  const offsetX = Math.floor((width - drawnWidth) / 2);
  const offsetY = Math.floor((height - drawnHeight) / 2);

  for (let y = 0; y < drawnHeight; y++) {
    for (let x = 0; x < drawnWidth; x++) {
      const x0 = Math.floor(x / scale);
      const y0 = Math.floor(y / scale);
      const x1 = Math.max(x0 + 1, Math.min(yard.width, Math.floor((x + 1) / scale)));
      const y1 = Math.max(y0 + 1, Math.min(yard.height, Math.floor((y + 1) / scale)));
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const at = (sy * yard.width + sx) * 4;
          r += yard.data[at];
          g += yard.data[at + 1];
          b += yard.data[at + 2];
          count++;
        }
      }
      if (count === 0) continue;
      pixels.set([r / count, g / count, b / count], ((y + offsetY) * width + x + offsetX) * 3);
    }
  }
  return encodePng(width, height, pixels);
};

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
    const yard = renderYard(list);
    writeFileSync(path.join(OUTPUT_DIR, `kit-${slot}.png`), drawPreview(yard, 140, 90));
    writeFileSync(path.join(OUTPUT_DIR, `kit-${slot}-large.png`), drawPreview(yard, 450, 300));

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
