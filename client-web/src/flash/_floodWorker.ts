/**
 * Inferno-only (21 October, the user's: more of the game on other threads): the monsters' path floods worked out
 * in a background thread (a Web Worker). A monster's way to its target comes from a flood of the yard's 260 x 260
 * grid out from the target, each cell's depth its cost to get there (game/com/monsters/pathing/PATHING: one flood a
 * target, shared by every monster going there). In a battle the floods start again each time a building falls, and
 * they shared up to 5 ms of every game step on the game's thread (several steps a frame): monsters waited for their
 * ways, and the game for them.
 *
 * Now the game hands the worker its grid (each cell's cost, and which have a building, for the floods that don't go
 * round walls) once when it changes, then each flood's target cells; the worker floods the whole grid, round by round
 * exactly as PATHING.ExpandFlood does (the same depths, cell for cell), and hands back the depths. The monsters then
 * get their ways from it on the game's thread, in a game step, as before (PATHING.Path). A flood the worker hasn't
 * answered within a moment, a browser without workers, or a worker that failed: flooded on the game's thread, as before.
 */

const WORKER_SOURCE = `
let costs = null, walls = null, gen = -1, gw = 260, gh = 260;
function flood(targets, ignoreWalls) {
  const cells = gw * gh;
  const D = new Int32Array(cells).fill(-1);
  let E = [], N = [];
  for (let k = 0; k < targets.length; k++) {
    const ti = targets[k];
    if (D[ti] < 0) { D[ti] = 0; E.push(ti); }
  }
  let limit = 9999999;
  const C = costs, W = walls;
  // (PATHING.ExpandFlood, round after round, till the edge is empty)
  while (E.length) {
    const n = E.length;
    let minDepth = 9999999, nn = 0, i = 0;
    N.length = 0;
    while (i < n) {
      const idx = E[i++];
      const d = D[idx];
      if (d <= limit) {
        const cx = (idx / gh) | 0;
        const cy = (idx - cx * gh) | 0;
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
          if (nx >= 0 && nx < gw) {
            for (let ny = cy - 1; ny <= cy + 1; ny++) {
              if (ny >= 0 && ny < gh && !(nx == cx && ny == cy)) {
                const ni = (nx * gh + ny) | 0;
                if (D[ni] < 0) {
                  let cost = C[ni];
                  if (ignoreWalls && W[ni]) cost = 20;
                  if (nx != cx && ny != cy) cost = (cost * 1.5) | 0;
                  const nd = (d + cost) | 0;
                  D[ni] = nd;
                  N[nn++] = ni;
                  if (nd < minDepth) minDepth = nd;
                }
              }
            }
          }
        }
      } else {
        N[nn++] = idx;
        if (d < minDepth) minDepth = d;
      }
    }
    N.length = nn;
    const t = E; E = N; N = t;
    limit = minDepth;
  }
  return D;
}
// (the floods asked for, worked out one at a time between messages: a newer grid, come meanwhile, makes those
// asked on an older one stale at once, not flooded for nothing)
const queue = [];
let busy = false;
function next() {
  busy = false;
  const m = queue.shift();
  if (!m) return;
  if (m.gen !== gen || !costs) postMessage({ id: m.id, gen: m.gen, stale: true });
  else {
    try {
      const depth = flood(m.targets, m.ignoreWalls);
      postMessage({ id: m.id, gen: m.gen, depth }, [depth.buffer]);
    } catch (e) {
      postMessage({ id: m.id, gen: m.gen, error: String(e && e.message || e) });
    }
  }
  if (queue.length) { busy = true; setTimeout(next, 0); }
}
onmessage = (ev) => {
  const m = ev.data;
  if (m.grid) { costs = m.costs; walls = m.walls; gen = m.gen; gw = m.gw; gh = m.gh; return; }
  queue.push(m);
  if (!busy) { busy = true; setTimeout(next, 0); }
};
`;

/** A flood's answer: its depths (index x * gh + y, -1 not reached: the whole grid is flooded), or none. */
export interface FloodAnswer {
  id: number;
  gen: number;
  depth?: Int32Array;
  stale?: boolean;
  error?: string;
}

let worker: Worker | null = null;
let broken = false;
let nextId = 1;
let sentGen = -1;
let onAnswer: ((a: FloodAnswer) => void) | null = null;
/** (22 October) The floods asked and not answered yet, by id: their grid's generation. */
const pending = new Map<number, number>();

/** For tests: floods asked of the worker, answered, answered too late or for an older grid, and failures. */
export const floodWorkerStats = { asked: 0, answered: 0, stale: 0, failed: 0, fellBack: 0, grids: 0 };

function start(): Worker | null {
  if (worker || broken) return worker;
  try {
    if (typeof Worker !== "function" || typeof Blob !== "function") {
      broken = true;
      return null;
    }
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
    worker.onmessage = (ev: MessageEvent) => {
      const a = (ev.data || {}) as FloodAnswer;
      pending.delete(a.id);
      if (a.error) {
        floodWorkerStats.failed++;
        broken = true;
      } else if (a.stale) {
        floodWorkerStats.stale++;
      } else {
        floodWorkerStats.answered++;
      }
      if (onAnswer) onAnswer(a);
    };
    worker.onerror = () => {
      broken = true;
      floodWorkerStats.failed++;
      // (22 October: the floods asked told at once (worked out here), not left to wait their 40 steps each)
      const asked = [...pending];
      pending.clear();
      for (const [id, gen] of asked) if (onAnswer) onAnswer({ id, gen, error: "worker" });
    };
  } catch {
    broken = true;
    worker = null;
  }
  return worker;
}

/** Whether floods can be worked out in the background thread (and haven't failed there). */
export function floodWorkerAvailable(): boolean {
  return !broken && start() != null;
}

/** Where the worker's answers go (PATHING). */
export function floodWorkerListen(fn: (a: FloodAnswer) => void): void {
  onAnswer = fn;
}

/** The grid the floods are worked out on (copies: the game keeps changing its own), as generation `gen`. */
export function floodWorkerGrid(gen: number, gw: number, gh: number, costs: Int32Array, walls: Uint8Array): void {
  const w = start();
  if (!w) return;
  const c = new Int32Array(costs);
  const wl = new Uint8Array(walls);
  w.postMessage({ grid: true, gen, gw, gh, costs: c, walls: wl }, [c.buffer, wl.buffer]);
  sentGen = gen;
  floodWorkerStats.grids++;
}

/** The generation of the grid the worker has. */
export function floodWorkerGen(): number {
  return sentGen;
}

/** A flood out from these target cells (index x * gh + y), on grid `gen`: its id (the answer's), or 0. */
export function floodWorkerAsk(gen: number, targets: number[], ignoreWalls: boolean): number {
  const w = start();
  if (!w || broken) return 0;
  const id = nextId++;
  pending.set(id, gen);
  w.postMessage({ id, gen, targets, ignoreWalls: !!ignoreWalls });
  floodWorkerStats.asked++;
  return id;
}
