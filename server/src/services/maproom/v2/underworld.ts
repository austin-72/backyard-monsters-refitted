import { MapRoom2, Terrain } from "../../../enums/MapRoom.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { generateNoise, getTerrainHeight } from "./generateMap.js";

/**
 * Inferno-only: the Underworld, a 10 x 10 layer of the map below the Inferno (config/UnderworldConfig.ts).
 *
 * Its cells live in the same world as the overworld's, at x and y origin .. origin + 9 (500-509), so a takeover,
 * an outpost, an attack and a baseid work there as anywhere. It does not wrap: it is a small island.
 *
 * Portals, fixed for each world: the centres of its `portals` biggest lava pools (ties for the last place all
 * count, up to `maxPortals`). The centre of a pool is its lava cell nearest the middle of the pool. A portal at
 * X, Y in the overworld comes out at X / 40, Y / 40 in the underworld (rounded down), or the nearest free cell when
 * another portal is there already. Both ends are lava cells: nobody can attack or take a portal.
 *
 * Range, the way the game measures it (hex cells, odd columns half a cell down):
 *  - into the underworld: one of your overworld yards with a portal within its Flinger range reaches the
 *    underworld cells next to (within 1 of) that portal's underworld end;
 *  - in the underworld: an outpost there reaches the cells next to it (range 1: it has no Flinger);
 *  - out of it: an outpost of yours next to an underworld portal reaches the overworld cells within 5 of the
 *    portal's overworld end.
 */

export interface Portal {
  /** Its number (0: the biggest pool). */
  i: number;
  /** The overworld end (a lava cell). */
  x: number;
  y: number;
  /** The underworld end (origin-based: 500-509). */
  ux: number;
  uy: number;
}

export const underworldOn = () => infernoOnlyConfig.enabled && underworldConfig.enabled;

/** Is x, y an underworld cell? */
export const isUnder = (x: number, y: number) => {
  const { origin, size } = underworldConfig;
  return x >= origin && y >= origin && x < origin + size && y < origin + size;
};

/** Is x, y in the overworld (0-399)? */
export const isOver = (x: number, y: number) => x >= 0 && y >= 0 && x < MapRoom2.WIDTH && y < MapRoom2.HEIGHT;

/** The terrain height of any cell of the map, in either layer. */
export const cellHeight = (worldid: string, x: number, y: number) =>
  isUnder(x, y) ? underworldConfig.height : getTerrainHeight(generateNoise(worldid), x, y);

const axial = (x: number, y: number) => [x, y - (x - (x & 1)) / 2];

/** Cells between two cells (hex), with no wrapping (the underworld). */
export const hexDistance = (x1: number, y1: number, x2: number, y2: number) => {
  const [q1, r1] = axial(x1, y1);
  const [q2, r2] = axial(x2, y2);
  const dq = q2 - q1;
  const dr = r2 - r1;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
};

/** Cells between two overworld cells (hex), across the map's wrapped edges (400 is even: columns keep their parity). */
export const hexDistanceWrapped = (x1: number, y1: number, x2: number, y2: number) => {
  let best = Number.MAX_SAFE_INTEGER;
  for (const sx of [-MapRoom2.WIDTH, 0, MapRoom2.WIDTH]) {
    for (const sy of [-MapRoom2.HEIGHT, 0, MapRoom2.HEIGHT]) {
      best = Math.min(best, hexDistance(x1, y1, x2 + sx, y2 + sy));
    }
  }
  return best;
};

/** The six cells around a cell (hex, odd-q offset), not wrapped. */
const neighbours = (x: number, y: number): [number, number][] => {
  const [q, r] = axial(x, y);
  return [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  ].map(([dq, dr]) => {
    const nq = q + dq;
    const nr = r + dr;
    return [nq, nr + (nq - (nq & 1)) / 2] as [number, number];
  });
};

const wrap = (value: number, size: number) => ((value % size) + size) % size;

const portalCache = new Map<string, Portal[]>();

/**
 * The world's portals (computed once per world: they never change). Lava pools are found over the whole wrapped
 * 400 x 400 map, cells joined by their hex sides.
 */
export const portalsFor = (worldid: string): Portal[] => {
  const cached = portalCache.get(worldid);
  if (cached) return cached;

  const W = MapRoom2.WIDTH;
  const H = MapRoom2.HEIGHT;
  const noise = generateNoise(worldid);
  const lava = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (getTerrainHeight(noise, x, y) <= Terrain.WATER3) lava[x * H + y] = 1;
    }
  }

  // Pools: flood fill (iterative), each as its cells.
  const seen = new Uint8Array(W * H);
  const pools: { cells: [number, number][]; first: number }[] = [];
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const start = x * H + y;
      if (!lava[start] || seen[start]) continue;
      seen[start] = 1;
      const cells: [number, number][] = [];
      const stack: [number, number][] = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        cells.push([cx, cy]);
        // (x stays a real column number before wrapping, so the parity of the neighbours is right: 400 is even)
        for (const [nx, ny] of neighbours(cx, cy)) {
          const wx = wrap(nx, W);
          const wy = wrap(ny, H);
          const key = wx * H + wy;
          if (lava[key] && !seen[key]) {
            seen[key] = 1;
            stack.push([wx, wy]);
          }
        }
      }
      pools.push({ cells, first: start });
    }
  }

  // The biggest pools (the same size: the one found first, top left, first), with ties for the last place.
  pools.sort((a, b) => b.cells.length - a.cells.length || a.first - b.first);
  const { portals: wanted, maxPortals, origin, size, scale } = underworldConfig;
  let count = Math.min(wanted, pools.length);
  while (count < pools.length && count < maxPortals && pools[count].cells.length === pools[wanted - 1]?.cells.length) count++;

  const taken = new Set<number>();
  const portals: Portal[] = [];
  for (let i = 0; i < count; i++) {
    const { cells } = pools[i];
    // The middle of the pool, measured from its first cell (a pool can run over the map's edge).
    const [x0, y0] = cells[0];
    let sx = 0;
    let sy = 0;
    for (const [cx, cy] of cells) {
      let dx = cx - x0;
      let dy = cy - y0;
      if (dx > W / 2) dx -= W;
      if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H;
      if (dy < -H / 2) dy += H;
      sx += dx;
      sy += dy;
    }
    const mx = wrap(Math.round(x0 + sx / cells.length), W);
    const my = wrap(Math.round(y0 + sy / cells.length), H);
    // Its lava cell nearest the middle (the same distance: the lowest x, then y).
    let best = cells[0];
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const cell of cells) {
      const d = hexDistanceWrapped(cell[0], cell[1], mx, my);
      if (d < bestD || (d === bestD && (cell[0] < best[0] || (cell[0] === best[0] && cell[1] < best[1])))) {
        best = cell;
        bestD = d;
      }
    }
    const [px, py] = best;

    // Its underworld end: X / 40, Y / 40, or the nearest free cell (rings outwards, in a fixed order).
    const u0 = Math.min(size - 1, Math.floor(px / scale));
    const v0 = Math.min(size - 1, Math.floor(py / scale));
    let end: [number, number] | null = null;
    for (let ring = 0; ring < size * 2 && !end; ring++) {
      for (let u = 0; u < size && !end; u++) {
        for (let v = 0; v < size && !end; v++) {
          if (hexDistance(u0, v0, u, v) !== ring || taken.has(u * 100 + v)) continue;
          end = [u, v];
        }
      }
    }
    if (!end) break; // (more portals than cells: never with 10 x 10)
    taken.add(end[0] * 100 + end[1]);
    portals.push({ i: portals.length, x: px, y: py, ux: origin + end[0], uy: origin + end[1] });
  }

  portalCache.set(worldid, portals);
  return portals;
};

/** The portal at an overworld cell, or one at an underworld cell. */
export const portalAt = (worldid: string, x: number, y: number): Portal | undefined =>
  portalsFor(worldid).find((p) => (p.x === x && p.y === y) || (p.ux === x && p.uy === y));

const levelCache = new Map<string, Map<number, number>>();

/**
 * An underworld stronghold's level. The cells nearest a portal are the easiest: the strongholds are ranked by how
 * far each is from its nearest underworld portal (the same distance: by a fixed number of each cell) and split
 * into as many equal groups as there are levels, the nearest group the lowest level (38, 42, 46, 50).
 */
export const underLevel = (worldid: string, x: number, y: number) => {
  let levels = levelCache.get(worldid);
  if (!levels) {
    const { origin, size, levelsByDistance } = underworldConfig;
    const portals = portalsFor(worldid);
    const cells: { key: number; d: number; v: number }[] = [];
    for (let cx = origin; cx < origin + size; cx++) {
      for (let cy = origin; cy < origin + size; cy++) {
        if (portals.some((p) => p.ux === cx && p.uy === cy)) continue;
        let d = Number.MAX_SAFE_INTEGER;
        for (const p of portals) d = Math.min(d, hexDistance(cx, cy, p.ux, p.uy));
        cells.push({ key: cx * 1000 + cy, d, v: underVariant(worldid, cx, cy) });
      }
    }
    cells.sort((a, b) => a.d - b.d || a.v - b.v);
    levels = new Map();
    cells.forEach((cell, index) => {
      const group = Math.min(levelsByDistance.length - 1, Math.floor((index * levelsByDistance.length) / cells.length));
      levels!.set(cell.key, levelsByDistance[group]);
    });
    levelCache.set(worldid, levels);
  }
  return levels.get(x * 1000 + y) ?? underworldConfig.levelsByDistance[0];
};

/** A fixed number for an underworld cell, to pick among its level's descent bases. */
export const underVariant = (worldid: string, x: number, y: number) => {
  let hash = 0x811c9dc5;
  const text = `${worldid}:under:${x}:${y}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** One of a player's yards, as range needs it. */
export interface RangeYard {
  x: number;
  y: number;
  baseid: string;
  /** Its own range in cells (main yard: 2 + 2 x Flinger level; outpost: its Flinger level; underworld: 1). */
  range: number;
}

/** Leeway for Declare War (the server doesn't know whether it is on: the client checks the exact range). */
export const DECLARE_WAR_RANGE = 2;

/**
 * The portals an overworld yard of the player opens (has within its range, Declare War included): by portal
 * number, the yards and how far each is from the portal.
 */
export const openEntries = (worldid: string, yards: RangeYard[]) => {
  const out = new Map<number, { yard: RangeYard; d: number }[]>();
  for (const p of portalsFor(worldid)) {
    for (const yard of yards) {
      if (!isOver(yard.x, yard.y) || yard.range <= 0) continue;
      const d = hexDistanceWrapped(yard.x, yard.y, p.x, p.y);
      if (d > yard.range + DECLARE_WAR_RANGE) continue;
      if (!out.has(p.i)) out.set(p.i, []);
      out.get(p.i)!.push({ yard, d });
    }
  }
  return out;
};

/** The portals an underworld outpost of the player is next to: by portal number, the outposts and how far. */
export const openExits = (worldid: string, yards: RangeYard[]) => {
  const out = new Map<number, { yard: RangeYard; d: number }[]>();
  for (const p of portalsFor(worldid)) {
    for (const yard of yards) {
      if (!isUnder(yard.x, yard.y)) continue;
      const d = hexDistance(yard.x, yard.y, p.ux, p.uy);
      if (d > underworldConfig.outpostRange) continue;
      if (!out.has(p.i)) out.set(p.i, []);
      out.get(p.i)!.push({ yard, d });
    }
  }
  return out;
};

/**
 * Can the player's yards reach this cell through the underworld (into it, in it, or out of it)? `yards` are all of
 * their yards (main and outposts, both layers). Overworld-to-overworld range is the stock check's (validateRange).
 */
export const underworldReaches = (worldid: string, x: number, y: number, yards: RangeYard[]) => {
  const portals = portalsFor(worldid);
  if (isUnder(x, y)) {
    // in it: an outpost next to it
    if (yards.some((yard) => isUnder(yard.x, yard.y) && hexDistance(yard.x, yard.y, x, y) <= underworldConfig.outpostRange)) return true;
    // into it: a portal next to it, opened from above
    const entries = openEntries(worldid, yards);
    return portals.some((p) => hexDistance(p.ux, p.uy, x, y) <= 1 && (entries.get(p.i)?.length ?? 0) > 0);
  }
  if (!isOver(x, y)) return false;
  // out of it: a portal within 5 of the cell, with an outpost of theirs next to its underworld end
  const exits = openExits(worldid, yards);
  return portals.some(
    (p) => hexDistanceWrapped(p.x, p.y, x, y) <= underworldConfig.exitRange && (exits.get(p.i)?.length ?? 0) > 0,
  );
};

/** For tests and the admin tools: forget the portals worked out (a world's terrain never changes otherwise). */
export const clearPortalCache = () => {
  portalCache.clear();
  levelCache.clear();
};
