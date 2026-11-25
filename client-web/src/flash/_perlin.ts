/**
 * BitmapData.perlinNoise's pixels, worked out by one piece of code (PERLIN_SOURCE) that runs on the game's thread
 * or in background threads (Web Workers): the same pixels, bit for bit, either way.
 *
 * Inferno-only use (21 October, the user's: more of the game on other threads): a yard's ground is three to six
 * layers blended through Perlin noise masks, 1000 x 500 each (game/MAPBG.MakeTile), worked out as the yard loads:
 * about a second of the game's thread on a fast computer (each mask 200 to 300 ms), four or five on a phone, with
 * the game stopped. The masks depend only on the yard's seed, so as soon as the server's answer to a yard's load has
 * come (BASE.Load), they are worked out in background threads, several at once, and kept (perlinCached); the yard
 * is built when they are ready (a moment later, as if the answer had taken that much longer to come), and its
 * perlinNoise calls take them from here. A mask not ready (a browser without workers, a worker that failed, a yard
 * built before they came) is worked out on the game's thread, as before.
 */

export const PERLIN_SOURCE = `
// SVG 1.1 feTurbulence reference implementation (Perlin noise with a Park-Miller seeded lattice), which Flash's
// perlinNoise follows. What the reference works out again for every pixel is worked out once (prepare), and a
// whole bitmap is filled in one go (fill).
class Turbulence {
  constructor(seed) {
    this.lattice = new Int32Array(0x100 + 0x100 + 2);
    this.gradient = [];
    const BSize = 0x100;
    const RAND_m = 2147483647, RAND_a = 16807, RAND_q = 127773, RAND_r = 2836;
    if (seed <= 0) seed = -(seed % (RAND_m - 1)) + 1;
    if (seed > RAND_m - 1) seed = RAND_m - 1;
    const random = () => {
      let r = RAND_a * (seed % RAND_q) - RAND_r * Math.trunc(seed / RAND_q);
      if (r <= 0) r += RAND_m;
      seed = r;
      return r;
    };
    for (let k = 0; k < 4; k++) this.gradient.push(new Float64Array(2 * (BSize + BSize + 2)));
    let i = 0;
    for (let k = 0; k < 4; k++) {
      const g = this.gradient[k];
      for (i = 0; i < BSize; i++) {
        this.lattice[i] = i;
        for (let j = 0; j < 2; j++) g[2 * i + j] = ((random() % (BSize + BSize)) - BSize) / BSize;
        const s = Math.sqrt(g[2 * i] * g[2 * i] + g[2 * i + 1] * g[2 * i + 1]);
        g[2 * i] /= s; g[2 * i + 1] /= s;
      }
    }
    while (--i) {
      const k = this.lattice[i];
      const j = random() % BSize;
      this.lattice[i] = this.lattice[j];
      this.lattice[j] = k;
    }
    for (i = 0; i < BSize + 2; i++) {
      this.lattice[BSize + i] = this.lattice[i];
      for (let k = 0; k < 4; k++) { const g = this.gradient[k]; g[2 * (BSize + i)] = g[2 * i]; g[2 * (BSize + i) + 1] = g[2 * i + 1]; }
    }
  }
  prepare(fx, fy, octaves, fractal, stitch, tileX, tileY, tileW, tileH, offsets) {
    const PerlinN = 0x1000;
    const n = Math.max(0, octaves);
    const p = {
      fx, fy, octaves: n, fractal, stitch,
      ox: new Float64Array(n), oy: new Float64Array(n), mul: new Float64Array(n), ratio: new Float64Array(n),
      sw: new Float64Array(n), sh: new Float64Array(n), swx: new Float64Array(n), swy: new Float64Array(n),
    };
    let w = 0, h = 0, wx = 0, wy = 0;
    if (stitch) {
      if (fx !== 0) { const lo = Math.floor(tileW * fx) / tileW, hi = Math.ceil(tileW * fx) / tileW; fx = fx / lo < hi / fx ? lo : hi; }
      if (fy !== 0) { const lo = Math.floor(tileH * fy) / tileH, hi = Math.ceil(tileH * fy) / tileH; fy = fy / lo < hi / fy ? lo : hi; }
      w = Math.trunc(tileW * fx + 0.5); h = Math.trunc(tileH * fy + 0.5);
      wx = Math.trunc(tileX * fx + PerlinN + w); wy = Math.trunc(tileY * fy + PerlinN + h);
    }
    p.fx = fx; p.fy = fy;
    let mul = 1, ratio = 1;
    for (let o = 0; o < n; o++) {
      p.ox[o] = offsets[o][0]; p.oy[o] = offsets[o][1]; p.mul[o] = mul; p.ratio[o] = ratio;
      p.sw[o] = w; p.sh[o] = h; p.swx[o] = wx; p.swy[o] = wy;
      mul *= 2; ratio *= 2;
      if (stitch) { w *= 2; wx = 2 * wx - PerlinN; h *= 2; wy = 2 * wy - PerlinN; }
    }
    return p;
  }
  // every pixel of a w x h bitmap, row by row
  fill(c, w, h, p) {
    const BM = 0xff, PerlinN = 0x1000;
    const L = this.lattice, G = this.gradient[c];
    const fx = p.fx, fy = p.fy, st = p.stitch, fractal = p.fractal, octaves = p.octaves;
    const pox = p.ox, poy = p.oy, pmul = p.mul, pratio = p.ratio, psw = p.sw, psh = p.sh, pswx = p.swx, pswy = p.swy;
    const out = new Float64Array(w * h);
    for (let y = 0, k = 0; y < h; y++) {
      for (let x = 0; x < w; x++, k++) {
        let sum = 0;
        for (let o = 0; o < octaves; o++) {
          const mul = pmul[o];
          const vx = (x + pox[o]) * fx * mul, vy = (y + poy[o]) * fy * mul;
          let t = vx + PerlinN;
          let tt = Math.trunc(t);
          let bx0 = tt & BM, bx1 = (bx0 + 1) & BM;
          const rx0 = t - tt, rx1 = rx0 - 1;
          t = vy + PerlinN;
          tt = Math.trunc(t);
          let by0 = tt & BM, by1 = (by0 + 1) & BM;
          const ry0 = t - tt, ry1 = ry0 - 1;
          if (st) {
            const swx = pswx[o], sww = psw[o], swy = pswy[o], swh = psh[o];
            if (bx0 >= swx) bx0 -= sww;
            if (bx1 >= swx) bx1 -= sww;
            if (by0 >= swy) by0 -= swh;
            if (by1 >= swy) by1 -= swh;
          }
          bx0 &= BM; bx1 &= BM; by0 &= BM; by1 &= BM;
          const i = L[bx0], j = L[bx1];
          const b00 = 2 * L[i + by0], b10 = 2 * L[j + by0], b01 = 2 * L[i + by1], b11 = 2 * L[j + by1];
          const sx = rx0 * rx0 * (3 - 2 * rx0), sy = ry0 * ry0 * (3 - 2 * ry0);
          let u = rx0 * G[b00] + ry0 * G[b00 + 1];
          let v = rx1 * G[b10] + ry0 * G[b10 + 1];
          const a = u + sx * (v - u);
          u = rx0 * G[b01] + ry1 * G[b01 + 1];
          v = rx1 * G[b11] + ry1 * G[b11 + 1];
          const b = u + sx * (v - u);
          const n = a + sy * (b - a);
          sum += (fractal ? n : Math.abs(n)) / pratio[o];
        }
        out[k] = sum;
      }
    }
    return out;
  }
}

// The pixels perlinNoise writes (straight-alpha RGBA, as Flash stores them: premultiplied, then read back), for
// perlinArgs(...)'s list.
function perlinPixels(args) {
  const [w, h, transparent, baseX, baseY, numOctaves, randomSeed, stitch, fractalNoise, channelOptions, grayScale, offs] = args;
  const t = new Turbulence(randomSeed | 0);
  const fx = baseX ? 1 / baseX : 0, fy = baseY ? 1 / baseY : 0;
  const octaves = Math.max(0, numOctaves | 0);
  const d = new Uint8ClampedArray(w * h * 4);
  const prep = t.prepare(fx, fy, octaves, fractalNoise, stitch, 0, 0, w, h, offs);
  const field = [null, null, null, null];
  const need = (c) => (field[c] || (field[c] = t.fill(c, w, h, prep)));
  const chan = (c, k) => {
    const n = need(c)[k];
    const v = fractalNoise ? (n * 255 + 255) / 2 : n * 255;
    return Math.max(0, Math.min(255, Math.trunc(v)));
  };
  for (let y = 0, i = 0, k = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4, k++) {
      let r = 0, g = 0, b = 0, a = 255;
      if (grayScale) {
        r = g = b = chan(0, k);
      } else {
        if (channelOptions & 1) r = chan(0, k);
        if (channelOptions & 2) g = chan(1, k);
        if (channelOptions & 4) b = chan(2, k);
      }
      if (channelOptions & 8) a = chan(3, k);
      if (!transparent) a = 255;
      if (a === 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
      if (a < 255) {
        const q = a / 255;
        r = Math.min(255, Math.round(Math.round(r * q) / q));
        g = Math.min(255, Math.round(Math.round(g * q) / q));
        b = Math.min(255, Math.round(Math.round(b * q) / q));
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    }
  }
  return d;
}
`;

/** perlinNoise's arguments as one list (the pixels' key): w, h, transparent, then perlinNoise's own, offsets as [x, y]. */
export function perlinArgs(w: number, h: number, transparent: boolean, baseX: number, baseY: number, numOctaves: number, randomSeed: number, stitch: boolean,
  fractalNoise: boolean, channelOptions: number, grayScale: boolean, offsets: any[] | null): any[] {
  const octaves = Math.max(0, numOctaves | 0);
  const offs: [number, number][] = [];
  for (let i = 0; i < octaves; i++) { const p = offsets?.[i]; offs.push([p ? +p.x : 0, p ? +p.y : 0]); }
  return [w | 0, h | 0, !!transparent, +baseX, +baseY, octaves, randomSeed | 0, !!stitch, !!fractalNoise, channelOptions | 0, !!grayScale, offs];
}

/** The pixels for perlinArgs(...)'s list, worked out on this thread. */
export const perlinHere: (args: any[]) => Uint8ClampedArray = new Function(PERLIN_SOURCE + "\nreturn perlinPixels;")() as any;

// ---- the pixels worked out ahead, in background threads, and kept for a while

/** The most kept (each 1000 x 500 mask is 2 MB): a yard's three, and the last yard's. */
const KEEP = 6;
const kept = new Map<string, Uint8ClampedArray>();
const keyOf = (args: any[]) => JSON.stringify(args);

/** For tests: how many were worked out in the background, taken from here, worked out on this thread; failures. */
export const perlinStats = { made: 0, hits: 0, here: 0, failed: 0, available: false };

/** Pixels worked out ahead for this list of arguments, or null. */
export function perlinCached(args: any[]): Uint8ClampedArray | null {
  const k = keyOf(args);
  const px = kept.get(k);
  if (!px) {
    perlinStats.here++;
    return null;
  }
  // (the most recently used last)
  kept.delete(k);
  kept.set(k, px);
  perlinStats.hits++;
  return px;
}

function keep(k: string, px: Uint8ClampedArray): void {
  kept.delete(k);
  kept.set(k, px);
  while (kept.size > KEEP) kept.delete(kept.keys().next().value as string);
}

const WORKER_SOURCE = PERLIN_SOURCE + `
onmessage = (ev) => {
  const m = ev.data;
  try {
    const px = perlinPixels(m.args);
    postMessage({ id: m.id, px }, [px.buffer]);
  } catch (e) {
    postMessage({ id: m.id, error: String(e && e.message || e) });
  }
};
`;

let workers: Worker[] | null = null;
let broken = false;
let nextId = 1;
let turn = 0;
const waiting = new Map<number, (px: Uint8ClampedArray | null) => void>();
const inFlight = new Map<string, Promise<void>>();
/** Settles once a worker's pixels have been checked against this thread's (false: not used). */
let checked: Promise<boolean> | null = null;

function ask(args: any[]): Promise<Uint8ClampedArray | null> {
  const ws = workers;
  if (!ws || !ws.length) return Promise.resolve(null);
  const w = ws[turn++ % ws.length];
  return new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    w.postMessage({ id, args });
  });
}

function start(): boolean {
  if (workers || broken) return !broken && !!workers;
  try {
    if (typeof Worker !== "function" || typeof Blob !== "function" || typeof URL === "undefined") {
      broken = true;
      return false;
    }
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const cores = Number((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2);
    const n = Math.max(1, Math.min(3, cores - 1));
    workers = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(url);
      w.onmessage = (ev: MessageEvent) => {
        const r = ev.data || {};
        const done = waiting.get(r.id);
        waiting.delete(r.id);
        if (r.error) perlinStats.failed++;
        if (done) done(r.px instanceof Uint8ClampedArray ? r.px : null);
      };
      w.onerror = () => {
        broken = true;
        perlinStats.failed++;
        for (const [, done] of waiting) done(null);
        waiting.clear();
      };
      workers.push(w);
    }
    // (a small one first: the worker's pixels must be this thread's exactly, or none are used)
    const probe = perlinArgs(24, 12, true, 7, 5, 2, 12345, true, false, 15, false, null);
    checked = ask(probe).then((px) => {
      const here = perlinHere(probe);
      const same = !!px && px.length === here.length && px.every((v, i) => v === here[i]);
      if (!same) broken = true;
      return same;
    });
  } catch {
    broken = true;
    workers = null;
    return false;
  }
  perlinStats.available = true;
  return true;
}

/** Whether pixels can be worked out in background threads (and haven't failed there). */
export function perlinWorkersAvailable(): boolean {
  return !broken && start();
}

/** For tests: everything kept forgotten. */
export function perlinForget(): void {
  kept.clear();
}

/** Whether these pixels are kept already. */
export function perlinHave(args: any[]): boolean {
  return kept.has(keyOf(args));
}

/**
 * The pixels for these lists of arguments worked out in background threads and kept (those kept already, or being
 * worked out, aren't asked again). Settles when all are in, or after `timeoutMs`, whichever first; never fails.
 */
export function perlinPrefetch(list: any[][], timeoutMs: number): Promise<void> {
  if (!perlinWorkersAvailable()) return Promise.resolve();
  const jobs: Promise<void>[] = [];
  for (const args of list) {
    const k = keyOf(args);
    if (kept.has(k)) continue;
    let job = inFlight.get(k);
    if (!job) {
      job = (checked ?? Promise.resolve(true))
        .then((ok) => (ok && !broken ? ask(args) : null))
        .then((px) => {
          if (px && !broken) {
            keep(k, px);
            perlinStats.made++;
          }
        })
        .finally(() => inFlight.delete(k));
      inFlight.set(k, job);
    }
    jobs.push(job);
  }
  if (!jobs.length) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, timeoutMs));
    Promise.all(jobs).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
