// A maxed Inferno Under Hall 6 yard: every building TH6 allows, each at its top level, the defences spread among
// the rest. No walls, no traps, no defending monsters (the towers alone).
export const FP = { 1: 70, 2: 70, 3: 70, 4: 70, 5: 90, 6: 80, 8: 100, 9: 80, 10: 100, 11: 90, 12: 70, 13: 80, 14: 160, 16: 80, 21: 70, 26: 80, 51: 90, 113: 80, 128: 160, 129: 70, 130: 70, 132: 70, 141: 90, 144: 70, 145: 70 };
export const TOWERS = { 21: 7, 130: 7, 129: 6, 132: 6, 144: 6, 145: 6 };
export const TOWER_COUNT = { 21: 6, 130: 6, 129: 4, 132: 3, 144: 3, 145: 2 };
// [type, count, level]
export const OTHERS = [[1, 6, 10], [2, 6, 10], [3, 6, 10], [4, 6, 10], [6, 5, 10], [13, 5, 3], [26, 2, 5], [8, 1, 5], [9, 1, 3], [10, 1, 1], [11, 1, 1], [12, 1, 1], [16, 1, 1], [5, 1, 4], [51, 1, 4], [113, 1, 1], [128, 1, 6], [141, 1, 5]];
export function layout(towerLevel = null, gap = 10) {
  const R = 400, G = 10, N = (2 * R) / G;
  const used = new Uint8Array(N * N);
  const fits = (x, y, s) => { if (x < -R || y < -R || x + s > R || y + s > R) return false; for (let i = (x + R) / G; i < (x + s + R) / G; i++) for (let j = (y + R) / G; j < (y + s + R) / G; j++) if (used[i * N + j]) return false; return true; };
  const take = (x, y, s) => { for (let i = (x + R) / G; i < (x + s + R) / G; i++) for (let j = (y + R) / G; j < (y + s + R) / G; j++) used[i * N + j] = 1; };
  // spiral of candidate points from the centre (by distance, then angle)
  const pts = [];
  for (let x = -R; x < R; x += G) for (let y = -R; y < R; y += G) pts.push([x, y, Math.hypot(x + 5, y + 5), Math.atan2(y, x)]);
  pts.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
  const out = {}; let id = 0;
  const place = (t, l, gap = 10) => {
    const s = FP[t] || 80;
    for (const [px, py] of pts) {
      const x = px - Math.floor(s / 2 / G) * G, y = py - Math.floor(s / 2 / G) * G;
      // (a gap of `gap` round each, so paths stay open)
      if (fits(x - gap, y - gap, s + 2 * gap) || (gap && fits(x, y, s) && false)) { take(x, y, s); out[id] = { X: x, Y: y, t, id, l }; id++; return true; }
    }
    // tighter: no gap
    for (const [px, py] of pts) { const x = px - Math.floor(s / 2 / G) * G, y = py - Math.floor(s / 2 / G) * G; if (fits(x, y, s)) { take(x, y, s); out[id] = { X: x, Y: y, t, id, l }; id++; return true; } }
    return false;
  };
  place(14, 6, gap);
  // the rest: big ones first, then towers mixed in evenly among the small ones
  const big = [], small = [], towers = [];
  for (const [t, n, l] of OTHERS) for (let i = 0; i < n; i++) ((FP[t] || 80) > 80 ? big : small).push([t, l]);
  for (const [t, n] of Object.entries(TOWER_COUNT)) for (let i = 0; i < n; i++) towers.push([Number(t), towerLevel ?? TOWERS[t]]);
  // interleave towers by type
  towers.sort((a, b) => (a[0] * 7 + towers.indexOf(a)) % 5 - (b[0] * 7 + towers.indexOf(b)) % 5);
  const order = [...big];
  const every = small.length / towers.length;
  let k = 0;
  for (let i = 0; i < small.length; i++) { order.push(small[i]); if (k < towers.length && i + 1 >= (k + 1) * every - 0.001) order.push(towers[k++]); }
  while (k < towers.length) order.push(towers[k++]);
  const failed = [];
  for (const [t, l] of order) if (!place(t, l, gap)) failed.push(t);
  return { buildings: out, failed };
}
if (process.argv[1] && process.argv[1].endsWith("layout.mjs")) {
  const { buildings, failed } = layout(null, Number(process.env.GAP ?? 10));
  console.log(Object.keys(buildings).length, "placed; failed:", failed);
  // ascii map
  const N = 40, grid = Array.from({ length: N }, () => Array(N).fill("."));
  for (const b of Object.values(buildings)) { const s = (FP[b.t] || 80); for (let x = b.X; x < b.X + s; x += 20) for (let y = b.Y; y < b.Y + s; y += 20) { const i = Math.floor((x + 400) / 20), j = Math.floor((y + 400) / 20); if (grid[j] && grid[j][i] !== undefined) grid[j][i] = TOWER_COUNT[b.t] ? "T" : b.t === 14 ? "H" : "o"; } }
  console.log(grid.map((r) => r.join("")).join("\n"));
}
