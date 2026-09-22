import alea from "alea";
import { createNoise2D, type NoiseFunction2D as Noise } from "simplex-noise";

import { MapRoom2, Terrain } from "../../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { generateNoise, getTerrainHeight } from "./generateMap.js";

/**
 * Tribe territories
 * ====================================================================
 * Decides which wild monster tribe, at which level, lives on a Map Room 2 cell.
 *
 * Stock MR2 paints tribes in diagonal stripes ((x + y) % 4). Here the map is carved into
 * small territories instead, each grown around a "seat":
 *
 *  - Seats sit on a jittered grid, one per `spacing` x `spacing` bucket, always on land.
 *  - A cell belongs to the nearest seat. Distances are measured after bending the map with
 *    two noise fields (`warp` = slow, `swirl` = fine), which is what makes borders organic.
 *  - Close to a border a cell may defect to the neighbouring tribe (`blendWidth`).
 *  - Level is highest at the seat and steps down towards the border. Each tribe only uses
 *    its own fixed ladder of levels (the same sets the stock server produces), and every
 *    rung gets an equal share of cells.
 *  - Some seats are ruled by Moloch: the seat's single peak cell becomes a stronghold.
 *
 * Every land cell is a tribe cell; nothing is left empty.
 *
 * REPEATABILITY: everything is a pure function of (world uuid, x, y, config). The world uuid
 * seeds the noise fields (exactly like the terrain in generateMap.ts) and salts every hash,
 * so a world always regenerates identically - across restarts, across processes, and in
 * whatever order cells are requested - while different worlds get different layouts.
 * Nothing is stored in the database. Per-world caches below only memoise pure results.
 * ====================================================================
 */

const W = MapRoom2.WIDTH;
const H = MapRoom2.HEIGHT;

/** Index into enums/Tribes.ts `Tribes` for ordinary tribes. */
export type TribeIndex = 0 | 1 | 2 | 3;

export interface TerritoryCell {
  /** 0-3, or "moloch". */
  tribe: TribeIndex | "moloch";
  level: number;
  /** Moloch only: stable per-stronghold number, used to vary which yard loads. */
  variant: number;
}

interface Seat {
  x: number;
  y: number;
  tribe: TribeIndex;
  moloch: boolean;
  variant: number;
  /** Lazily resolved: the one land cell that ends up closest to the seat after warping. */
  peak?: [number, number];
}

interface WorldState {
  seed: number;
  terrain: Noise;
  warpX: Noise;
  warpY: Noise;
  swirlX: Noise;
  swirlY: Noise;
  blend: Noise;
  /** Lazy terrain cache. 0 = not computed yet (real heights are always > 0). */
  heights: Uint8Array;
  seats: Map<number, Seat>;
  /** Cumulative distribution of `t` over land cells, see buildCdf(). */
  cdf: Float64Array | null;
}

const worlds = new Map<string, WorldState>();

// --------------------------------------------------------------------------------------
// Seeded primitives
// --------------------------------------------------------------------------------------

/** FNV-1a: world uuid -> 32 bit seed. */
const seedOf = (worldid: string) => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < worldid.length; i++) {
    hash ^= worldid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Integer hash of (seed, x, y, salt). Uses Math.imul only, so it is identical on every platform. */
const hash = (seed: number, x: number, y: number, salt: number) => {
  let h = (seed ^ Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt + 1, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

const unit = (seed: number, x: number, y: number, salt: number) => hash(seed, x, y, salt) / 4294967296;

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** Shortest distance between two coordinates on a wrapping axis. */
const wrapDelta = (a: number, b: number, size: number) => {
  const delta = Math.abs(a - b);
  return Math.min(delta, size - delta);
};

const getWorld = (worldid: string): WorldState => {
  let world = worlds.get(worldid);

  if (!world) {
    const noise = (name: string) => createNoise2D(alea(`${worldid}:tribes:${name}`));

    world = {
      seed: seedOf(worldid),
      terrain: generateNoise(worldid),
      warpX: noise("warpx"),
      warpY: noise("warpy"),
      swirlX: noise("swirlx"),
      swirlY: noise("swirly"),
      blend: noise("blend"),
      heights: new Uint8Array(W * H),
      seats: new Map(),
      cdf: null,
    };
    worlds.set(worldid, world);
  }
  return world;
};

const isLand = (world: WorldState, x: number, y: number) => {
  const index = wrap(y, H) * W + wrap(x, W);
  let height = world.heights[index];

  if (height === 0) {
    height = Math.max(1, Math.min(255, getTerrainHeight(world.terrain, wrap(x, W), wrap(y, H))));
    world.heights[index] = height;
  }
  return height > Terrain.WATER3;
};

// --------------------------------------------------------------------------------------
// Geometry
// --------------------------------------------------------------------------------------

/** Buckets per axis. Spacings that do not divide the map (6, 7...) get fractional buckets so the map still wraps. */
const bucketCount = () => Math.max(1, Math.round(W / infernoOnlyConfig.tribeSpawns.spacing));

/** Where a cell lands once the map is bent. Not wrapped - callers wrap. */
const warped = (world: WorldState, x: number, y: number): [number, number] => {
  const { warp, warpScale, swirl, swirlScale } = infernoOnlyConfig.tribeSpawns;
  let dx = 0;
  let dy = 0;

  if (warp > 0) {
    dx += warp * world.warpX(x / warpScale, y / warpScale);
    dy += warp * world.warpY(x / warpScale, y / warpScale);
  }
  if (swirl > 0) {
    dx += swirl * world.swirlX(x / swirlScale, y / swirlScale);
    dy += swirl * world.swirlY(x / swirlScale, y / swirlScale);
  }
  return [x + dx, y + dy];
};

const getSeat = (world: WorldState, bucketX: number, bucketY: number): Seat => {
  const buckets = bucketCount();
  const bx = wrap(bucketX, buckets);
  const by = wrap(bucketY, buckets);
  const key = by * buckets + bx;

  let seat = world.seats.get(key);
  if (seat) return seat;

  const { seed } = world;
  const size = W / buckets;
  let x = 0;
  let y = 0;

  // Jittered position inside the bucket; retry a few times so the seat stands on land.
  for (let attempt = 0; attempt < 10; attempt++) {
    x = Math.min(W - 1, Math.floor((bx + unit(seed, bx, by, 12 + attempt * 7)) * size));
    y = Math.min(H - 1, Math.floor((by + unit(seed, bx, by, 13 + attempt * 7)) * size));
    if (isLand(world, x, y)) break;
  }

  const { moloch } = infernoOnlyConfig;

  seat = {
    x,
    y,
    tribe: (hash(seed, bx, by, 15) % 4) as TribeIndex,
    moloch: moloch.enabled && hash(seed, bx, by, 16) % 1000 < moloch.perThousandSeats,
    variant: hash(seed, bx, by, 17),
  };

  world.seats.set(key, seat);
  return seat;
};

/** The two seats closest to a (warped) position. */
const twoNearest = (world: WorldState, px: number, py: number) => {
  const size = W / bucketCount();
  const wx = wrap(px, W);
  const wy = wrap(py, H);
  const bx = Math.floor(wx / size);
  const by = Math.floor(wy / size);

  let first: Seat | null = null;
  let firstDistance = Infinity;
  let second: Seat | null = null;
  let secondDistance = Infinity;

  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const seat = getSeat(world, bx + i, by + j);
      const distance = Math.hypot(wrapDelta(wx, seat.x, W), wrapDelta(wy, seat.y, H));

      if (distance < firstDistance) {
        second = first;
        secondDistance = firstDistance;
        first = seat;
        firstDistance = distance;
      } else if (distance < secondDistance && seat !== first) {
        second = seat;
        secondDistance = distance;
      }
    }
  }

  return { first: first!, firstDistance, second: second!, secondDistance };
};

/** 0 at the seat, 1 on the border - whatever the territory's size or shape. */
const borderProgress = (firstDistance: number, secondDistance: number) =>
  Math.min(1, (2 * firstDistance) / (firstDistance + secondDistance || 1));

/**
 * The seat's peak cell: the land cell that lands closest to the seat once warped. Heavy
 * warping folds the map, so several cells can be local minima - scanning a window once and
 * keeping the single best makes the peak (and any Moloch stronghold) exactly one cell.
 */
const peakOf = (world: WorldState, seat: Seat): [number, number] => {
  if (seat.peak) return seat.peak;

  const { warp, swirl } = infernoOnlyConfig.tribeSpawns;
  const radius = Math.ceil(warp + swirl) + 2;

  let best: [number, number] = [seat.x, seat.y];
  let bestDistance = Infinity;

  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      if (!isLand(world, seat.x + i, seat.y + j)) continue;

      const [qx, qy] = warped(world, seat.x + i, seat.y + j);
      const distance = Math.hypot(qx - seat.x, qy - seat.y);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = [wrap(seat.x + i, W), wrap(seat.y + j, H)];
      }
    }
  }

  seat.peak = best;
  return best;
};

// --------------------------------------------------------------------------------------
// Even level spread
// --------------------------------------------------------------------------------------

const CDF_BINS = 256;

/**
 * The share of a territory within border-progress `t` of its seat is far from linear in `t`
 * (area grows roughly with t squared; warp, swirl and blend bend it further), so a linear
 * falloff would pile most cells onto the lowest levels. Instead the real distribution of `t`
 * is measured once per world from a fixed, seeded sample of land cells, and each cell's `t`
 * is mapped through it. Every rung of a ladder then holds an equal share of cells, for any
 * spacing / warp / swirl. Land only: seats are snapped onto land, so lava sits further out.
 */
const buildCdf = (world: WorldState) => {
  const { cdfSamples } = infernoOnlyConfig.tribeSpawns;
  const histogram = new Float64Array(CDF_BINS);
  let taken = 0;

  for (let i = 0; taken < cdfSamples && i < cdfSamples * 20; i++) {
    const x = hash(world.seed, i, 1, 71) % W;
    const y = hash(world.seed, i, 2, 72) % H;
    if (!isLand(world, x, y)) continue;

    const [px, py] = warped(world, x, y);
    const { firstDistance, secondDistance } = twoNearest(world, px, py);
    const t = borderProgress(firstDistance, secondDistance);

    histogram[Math.min(CDF_BINS - 1, Math.floor(t * CDF_BINS))]++;
    taken++;
  }

  const cdf = new Float64Array(CDF_BINS + 1);
  for (let bin = 0; bin < CDF_BINS; bin++) cdf[bin + 1] = cdf[bin] + histogram[bin] / Math.max(1, taken);

  world.cdf = cdf;
  return cdf;
};

/** Share of land cells that are closer to their seat than this one. 0 at the seat, 1 on the border. */
const rankOf = (world: WorldState, t: number) => {
  const cdf = world.cdf ?? buildCdf(world);
  const position = Math.min(CDF_BINS - 0.001, t * CDF_BINS);
  const bin = Math.floor(position);

  return cdf[bin] + (cdf[bin + 1] - cdf[bin]) * (position - bin);
};

// --------------------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------------------

/**
 * @param {string} worldid - World uuid; seeds everything
 * @param {number} cellX
 * @param {number} cellY
 * @returns {TerritoryCell} The tribe and level living on this cell
 */
export const territoryCell = (worldid: string, cellX: number, cellY: number): TerritoryCell => {
  const world = getWorld(worldid);
  const { blendWidth, ladders } = infernoOnlyConfig.tribeSpawns;

  const [px, py] = warped(world, cellX, cellY);
  const { first, firstDistance, second, secondDistance } = twoNearest(world, px, py);

  const [peakX, peakY] = peakOf(world, first);
  const isPeak = peakX === cellX && peakY === cellY;

  if (isPeak && first.moloch) {
    const levels = infernoOnlyConfig.moloch.levels;
    return { tribe: "moloch", level: levels[first.variant % levels.length], variant: first.variant };
  }

  // Border blend: 50% right on the line, fading to nothing `blendWidth` cells in. The roll comes
  // from a fine noise field rather than per-cell static, so defectors form small pockets.
  let owner = first;
  const gap = secondDistance - firstDistance;

  if (!isPeak && blendWidth > 0 && gap < blendWidth && second.tribe !== first.tribe) {
    const chance = 0.5 * (1 - gap / blendWidth);
    const roll = 0.5 + 0.5 * world.blend(cellX / 2.2, cellY / 2.2);
    if (roll < chance) owner = second;
  }

  const ladder = ladders[owner.tribe];
  const top = ladder.length - 1;

  if (isPeak) return { tribe: owner.tribe, level: ladder[top], variant: 0 };

  const rank = rankOf(world, borderProgress(firstDistance, secondDistance));
  const rung = top - Math.min(top, Math.floor(rank * ladder.length));

  return { tribe: owner.tribe, level: ladder[rung], variant: 0 };
};

/** Test / tooling hook: forget memoised state (results are unaffected - they are pure). */
export const clearTerritoryCache = () => worlds.clear();
