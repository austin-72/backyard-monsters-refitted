import { deflateSync, inflateSync } from "zlib";
import { readFileSync } from "fs";
import path from "path";

import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { previewSprites } from "../../game-data/kits/previewSprites.js";

/**
 * Outpost kit pictures, drawn from a kit's layout with the game's own building art (pure JS PNG
 * reader/writer; nothing to install). Used by scripts/export-kits.ts for the server's kits and by
 * services/maproom/v2/playerKits.ts for the players' own. Asset paths are relative to the server's
 * working directory (public/assets), as the server and the script both run from server/.
 */

const OUTPOST_HALL = 112;

export interface KitBuilding {
  t: number;
  X: number;
  Y: number;
  id: number;
  prefab?: number;
}

// --------------------------------------------------------------------------------------

/** Footprint edge lengths, in yard units, by building type. Only used to draw previews. */
const FOOTPRINT: Record<number, number> = {
  // Taken from each building class's _footprint in the client.
  1: 70, 2: 70, 3: 70, 4: 70, 5: 90, 6: 80, 8: 100, 9: 80, 10: 100, 11: 90, 12: 70, 13: 100,
  14: infernoOnlyConfig.enabled ? 130 : 160, 15: 160, 16: 100, 17: 20, 21: 70, 24: 20, 26: 80, 51: 90, 112: 130, 128: 160, 129: 70, 130: 70, 132: 70,
  144: 70, 145: 70,
};

type Color = [number, number, number];

const colorOf = (type: number): Color => {
  if (type === OUTPOST_HALL || type === 14) return [255, 255, 255];
  if (type === 17) return [205, 195, 170]; // bone walls
  if (type === 24) return [255, 220, 60]; // traps
  if ([21, 129, 130, 132, 144, 145].includes(type)) return [255, 90, 40]; // towers
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
  // the anim strips over the top, in the yard's order (frame 0 of each)
  for (const strip of [sprite.anim, sprite.anim2, sprite.anim3]) {
    if (!strip) continue;
    const bitmap = readPng(path.join(ASSETS_DIR, art.base, strip[0]));
    if (bitmap) {
      layers.push({
        bitmap,
        x: originX + strip[1],
        y: originY + strip[2],
        width: Math.min(bitmap.width, strip[3]),
        height: Math.min(bitmap.height, strip[4]),
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

/** The two pictures every kit has: a 140 x 90 thumbnail and a 450 x 300 preview. */
export const renderKitPictures = (buildings: KitBuilding[]) => {
  const yard = renderYard(buildings);
  return { thumb: drawPreview(yard, 140, 90), large: drawPreview(yard, 450, 300) };
};
