import { createHash } from "crypto";

import { MapRoom2, Terrain } from "../enums/MapRoom.js";
import { generateNoise, getTerrainHeight } from "../services/maproom/v2/generateMap.js";
import { tribeForCell } from "../services/maproom/v2/tribeForCell.js";

/**
 * Prints a fingerprint and a summary of every wild monster cell of a Map Room 2 world.
 *
 *   bun src/scripts/verify-tribe-spawns.ts <world-uuid> [forward|reverse]
 *
 * The layout is a pure function of the world uuid and config/InfernoOnlyConfig.ts, so the
 * fingerprint must be identical on every run, on every machine, and whichever order the
 * cells are visited in. It only changes when the config (or the algorithm) changes - which
 * is also the moment persisted tribe saves have to be wiped.
 */
const [worldid, order = "forward"] = process.argv.slice(2);

if (!worldid) {
  console.error("usage: bun src/scripts/verify-tribe-spawns.ts <world-uuid> [forward|reverse]");
  process.exit(1);
}

const noise = generateNoise(worldid);
const land: [number, number][] = [];

for (let y = 0; y < MapRoom2.HEIGHT; y++)
  for (let x = 0; x < MapRoom2.WIDTH; x++)
    if (getTerrainHeight(noise, x, y) > Terrain.WATER3) land.push([x, y]);

const visit = order === "reverse" ? [...land].reverse() : land;
const cells = new Map<number, string>();
const levels: Record<string, Record<number, number>> = {};

for (const [x, y] of visit) {
  const { tribe, level, wmid, variant } = tribeForCell(worldid, x, y);

  cells.set(y * MapRoom2.WIDTH + x, `${tribe}:${level}:${wmid}:${variant}`);
  (levels[tribe] ??= {})[level] = (levels[tribe][level] ?? 0) + 1;
}

const fingerprint = createHash("sha256");
for (const [x, y] of land) fingerprint.update(`${cells.get(y * MapRoom2.WIDTH + x)};`);

console.log(`world ${worldid}: ${land.length} tribe cells, fingerprint ${fingerprint.digest("hex").slice(0, 16)}`);

for (const [tribe, counts] of Object.entries(levels)) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const spread = Object.entries(counts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([level, count]) => `${level}: ${((100 * count) / total).toFixed(1)}%`)
    .join("  ");

  console.log(`  ${tribe.padEnd(12)} ${String(total).padStart(6)} cells   ${spread}`);
}
