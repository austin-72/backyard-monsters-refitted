/**
 * Inferno-only: the Yard Planner's path estimates (game/com/monsters/baseplanner/IoPlanPaths, 20 October), the
 * working out itself: one piece of code (PLAN_SOURCE), run on the game's thread or (21 October, the user's: more of
 * the game on other threads) in a background thread (a Web Worker), the same answers either way. While a building is
 * dragged with estimates shown, they were worked out again up to eight times a second on the game's thread, each a
 * dozen floods of the yard's grid a kind: the drag stuttered (tens of milliseconds each time, more on a big yard).
 * Now the planner hands the worker the plan (each building's place, size, kind and costs: IoPlanPaths.snapshot) and
 * goes on; the paths are drawn when they come back. A browser without workers works them out here, as before.
 *
 * A plan row: { x, y, fx, fy, fw, fh, type, p (it has props), b (it has a building), nt (its node's type), loot, costs:
 * [[x, y, w, h, cost], ...] }. An answer: { legs: [{ points: [x, y, ...], item: the row's index, wall, cells }], fallback, none }.
 */

export const PLAN_SOURCE = `
const CELL = 10, OPEN = 10, MAX_STOPS = 12;
function target(row) {
  if (!row || !row.p || !row.b) return false;
  const t = row.type;
  return t != "decoration" && t != "immovable" && t != "enemy" && t != "wall" && t != "trap" && t != "mushroom" && t != "gift" && t != "taunt" && t != "cage" && row.nt != 7;
}
function wants(kind, row) {
  if (!target(row)) return false;
  if (kind == "towers") return row.type == "tower";
  if (kind == "loot") return !!row.loot;
  return true;
}
function estimate(rows, sx, sy, kind, ax, ay, aw, ah) {
  const out = { legs: [], fallback: false, none: false };
  const g = {};
  g.ox = Math.floor(ax / CELL) * CELL;
  g.oy = Math.floor(ay / CELL) * CELL;
  g.w = (Math.ceil((ax + aw - g.ox) / CELL) + 1) | 0;
  g.h = (Math.ceil((ay + ah - g.oy) / CELL) + 1) | 0;
  const n = (g.w * g.h) | 0;
  g.cost = new Int32Array(n).fill(OPEN);
  g.wall = new Int32Array(n).fill(-1);
  g.depth = new Int32Array(n);
  g.hD = new Int32Array(n * 2 + 16); g.hI = new Int32Array(n * 2 + 16); g.hS = new Int32Array(n * 2 + 16);
  g.hn = 0; g.seq = 0;
  for (let i = 0; i < rows.length; i++) apply(g, rows[i], i, 1);
  const gone = [];
  let atx = sx, aty = sy;
  let stops = 0;
  while (stops < MAX_STOPS) {
    let own = false;
    for (let i = 0; i < rows.length; i++) if (!gone[i] && wants(kind, rows[i])) { own = true; break; }
    let first = -1, second = -1, d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (gone[i] || !(own ? wants(kind, row) : target(row))) continue;
      const fpx = row.x + row.fx, fpy = row.y + row.fy;
      const m = (row.fh * 0.5) | 0;
      const dx = atx - (fpx + m), dy = aty - (fpy + m);
      const d = Math.sqrt(dx * dx + dy * dy) - m;
      if (d < d1) { second = first; d2 = d1; first = i; d1 = d; }
      else if (d < d2) { second = i; d2 = d; }
    }
    if (first < 0) { out.none = stops == 0; break; }
    if (!own && kind != "any" && stops == 0) out.fallback = true;
    const a = leg(g, rows, atx, aty, first);
    let chosen = a;
    if (second >= 0) {
      const b = leg(g, rows, atx, aty, second);
      if (b.points.length < a.points.length && b.wall < 0) chosen = b;
    }
    const hit = chosen.wall >= 0 ? chosen.wall : chosen.target;
    out.legs.push({ points: chosen.points, item: hit, wall: chosen.wall >= 0, cells: (chosen.points.length / 2 - 1) | 0 });
    gone[hit] = true;
    apply(g, rows[hit], hit, -1);
    if (chosen.points.length >= 2) { atx = chosen.points[chosen.points.length - 2]; aty = chosen.points[chosen.points.length - 1]; }
    stops++;
  }
  return out;
}
function apply(g, row, index, sign) {
  if (!row || !row.b) return;
  for (const c0 of row.costs) {
    const c = (c0[4] | 0) * sign;
    const x0 = Math.floor((row.x + c0[0] - g.ox) / CELL) | 0;
    const y0 = Math.floor((row.y + c0[1] - g.oy) / CELL) | 0;
    const cw = Math.ceil(c0[2] / CELL) | 0, ch = Math.ceil(c0[3] / CELL) | 0;
    for (let x = x0; x < x0 + cw; x++) {
      if (x < 0 || x >= g.w) continue;
      for (let y = y0; y < y0 + ch; y++) {
        if (y < 0 || y >= g.h) continue;
        const k = (x * g.h + y) | 0;
        g.cost[k] = Math.max(2, g.cost[k] + c) | 0;
      }
    }
  }
  if (row.type == "wall") {
    const x0 = Math.floor((row.x - g.ox) / CELL) | 0, y0 = Math.floor((row.y - g.oy) / CELL) | 0;
    for (let x = x0; x < x0 + 2; x++) for (let y = y0; y < y0 + 2; y++) if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.wall[x * g.h + y] = sign > 0 ? index : -1;
  }
}
function cellOf(g, px, py) {
  const x = Math.min(g.w - 1, Math.max(0, Math.floor((px - g.ox) / CELL))) | 0;
  const y = Math.min(g.h - 1, Math.max(0, Math.floor((py - g.oy) / CELL))) | 0;
  return (x * g.h + y) | 0;
}
function leg(g, rows, fromx, fromy, t) {
  const W = g.w, H = g.h, D = g.depth, C = g.cost;
  D.fill(-1);
  g.hn = 0;
  const row = rows[t];
  const fpx = row.x + row.fx, fpy = row.y + row.fy;
  const x0 = Math.floor((fpx - g.ox) / CELL) | 0, y0 = Math.floor((fpy - g.oy) / CELL) | 0;
  const cw = Math.max(1, Math.round(row.fw / CELL)) | 0, ch = Math.max(1, Math.round(row.fh / CELL)) | 0;
  for (let x = x0; x < x0 + cw; x++) for (let y = y0; y < y0 + ch; y++) {
    if (x >= 0 && y >= 0 && x < W && y < H) { const k = (x * H + y) | 0; if (D[k] < 0) { D[k] = 0; push(g, 0, k); } }
  }
  const start = cellOf(g, fromx, fromy);
  while (g.hn > 0 && D[start] < 0) {
    const idx = pop(g);
    const d = D[idx];
    const cx = (idx / H) | 0, cy = (idx - cx * H) | 0;
    for (let nx = cx - 1; nx <= cx + 1; nx++) {
      if (nx < 0 || nx >= W) continue;
      for (let ny = cy - 1; ny <= cy + 1; ny++) {
        if (ny < 0 || ny >= H || (nx == cx && ny == cy)) continue;
        const ni = (nx * H + ny) | 0;
        if (D[ni] >= 0) continue;
        let cost = C[ni];
        if (nx != cx && ny != cy) cost = (cost * 1.5) | 0;
        D[ni] = (d + cost) | 0;
        push(g, D[ni], ni);
      }
    }
  }
  const points = [fromx, fromy];
  let wall = -1, cur = start, depth = D[start], steps = 0;
  while (depth > 0 && steps < W * H) {
    steps++;
    const cx = (cur / H) | 0, cy = (cur - cx * H) | 0;
    let found = false;
    for (let ox = -1; ox < 2 && wall < 0; ox++) {
      for (let oy = -1; oy < 2; oy++) {
        if (ox == 0 && oy == 0) continue;
        const nx = (cx + ox) | 0, ny = (cy + oy) | 0;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = (nx * H + ny) | 0;
        const nd = D[ni];
        if (nd >= 0 && nd < depth && nd > 0) {
          cur = ni; depth = nd; found = true;
          if (points.length > 2 && g.wall[ni] >= 0) { wall = g.wall[ni]; break; }
        }
      }
    }
    if (wall >= 0 || !found) break;
    const px = (cur / H) | 0, py = (cur - px * H) | 0;
    points.push(g.ox + px * CELL + CELL / 2, g.oy + py * CELL + CELL / 2);
  }
  return { points, wall, target: t };
}
// a binary heap of (depth, cell), equal depths in the order they came
function push(g, d, i) {
  const hD = g.hD, hI = g.hI, hS = g.hS;
  let k = g.hn++;
  const s = g.seq++;
  while (k > 0) {
    const p = ((k - 1) >> 1) | 0;
    if (hD[p] < d || (hD[p] == d && hS[p] < s)) break;
    hD[k] = hD[p]; hI[k] = hI[p]; hS[k] = hS[p];
    k = p;
  }
  hD[k] = d; hI[k] = i; hS[k] = s;
}
function pop(g) {
  const hD = g.hD, hI = g.hI, hS = g.hS;
  const top = hI[0];
  const n = --g.hn;
  if (n > 0) {
    const d = hD[n], i = hI[n], s = hS[n];
    let k = 0;
    while (true) {
      let c = (k * 2 + 1) | 0;
      if (c >= n) break;
      if (c + 1 < n && (hD[c + 1] < hD[c] || (hD[c + 1] == hD[c] && hS[c + 1] < hS[c]))) c++;
      if (d < hD[c] || (d == hD[c] && s < hS[c])) break;
      hD[k] = hD[c]; hI[k] = hI[c]; hS[k] = hS[c];
      k = c;
    }
    hD[k] = d; hI[k] = i; hS[k] = s;
  }
  return top;
}
`;

/** estimate(rows, startX, startY, kind, areaX, areaY, areaW, areaH), worked out on this thread. */
export const planEstimateHere: (rows: any[], sx: number, sy: number, kind: string, ax: number, ay: number, aw: number, ah: number) => any =
  new Function(PLAN_SOURCE + "\nreturn estimate;")() as any;

const WORKER_SOURCE = PLAN_SOURCE + `
onmessage = (ev) => {
  const m = ev.data;
  try {
    const out = {};
    for (const j of m.jobs) out[j.kind] = estimate(m.rows, j.sx, j.sy, j.kind, j.ax, j.ay, j.aw, j.ah);
    postMessage({ id: m.id, out });
  } catch (e) {
    postMessage({ id: m.id, error: String(e && e.message || e) });
  }
};
`;

let worker: Worker | null = null;
let broken = false;
let nextId = 1;
const waiting = new Map<number, (out: any) => void>();

/** For tests: estimates asked of the worker, answered, failed. */
export const planWorkerStats = { asked: 0, answered: 0, failed: 0 };

function start(): Worker | null {
  if (worker || broken) return worker;
  try {
    if (typeof Worker !== "function" || typeof Blob !== "function") {
      broken = true;
      return null;
    }
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
    worker.onmessage = (ev: MessageEvent) => {
      const r = ev.data || {};
      const done = waiting.get(r.id);
      waiting.delete(r.id);
      if (r.error) {
        planWorkerStats.failed++;
        broken = true;
      } else {
        planWorkerStats.answered++;
      }
      if (done) done(r.error ? null : r.out);
    };
    worker.onerror = () => {
      broken = true;
      planWorkerStats.failed++;
      for (const [, done] of waiting) done(null);
      waiting.clear();
    };
  } catch {
    broken = true;
    worker = null;
  }
  return worker;
}

/** Whether estimates can be worked out in the background thread (and haven't failed there). */
export function planWorkerAvailable(): boolean {
  return !broken && start() != null;
}

/** The estimates for these jobs ({kind, sx, sy, ax, ay, aw, ah}) on this plan; done({kind: answer}), or done(null): failed. */
export function planWorkerEstimate(rows: any[], jobs: any[], done: (out: any) => void): boolean {
  const w = start();
  if (!w) return false;
  const id = nextId++;
  waiting.set(id, done);
  w.postMessage({ id, rows, jobs });
  planWorkerStats.asked++;
  return true;
}
