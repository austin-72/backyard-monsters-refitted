/**
 * Inferno-only (21 October, the user's: the game using more than one thread): the Watch broadcast's pictures made in a
 * background thread (a Web Worker). Being watched, the game sent its screen 10 to 15 times a second, and each time,
 * on the game's own thread, read it back pixel by pixel, compared it with the last one sent, square by square, and
 * put the changed squares together into one picture: about 9 ms a picture on a fast computer, a third of a slow
 * phone's time. Now the game only takes a snapshot of what it shows (createImageBitmap: the browser's own, quick) and
 * hands it over; the worker does the rest (OffscreenCanvas) and hands back the bytes to send, the same bytes as
 * before (game/com/monsters/replays/IoWatch.ts castFrame: "IOW2", kind, square size, width, height, how many
 * squares, where each is, then the picture).
 *
 * Where the browser can't (no OffscreenCanvas in a worker, no workers, or the worker fails), `available` is false and
 * IoWatch makes its pictures on the game's thread, as it did.
 */

const WORKER_SOURCE = `
let prev = null, prevW = 0, prevH = 0, canvas = null, ctx = null, atlas = null, actx = null, typeOk = {};
async function encode(c, type, quality) {
  // (the type asked for, where this browser's worker makes it; else JPEG: an unknown type comes back as a PNG,
  // many times the size)
  if (typeOk[type] !== false) {
    const b = await c.convertToBlob({ type, quality });
    if (b && b.type === type) { typeOk[type] = true; return b; }
    typeOk[type] = false;
  }
  return c.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}
onmessage = async (ev) => {
  const m = ev.data;
  if (m.reset) { prev = null; return; }
  const bmp = m.bmp;
  try {
    const w = bmp.width, h = bmp.height, T = m.tile;
    if (!canvas || canvas.width !== w || canvas.height !== h) { canvas = new OffscreenCanvas(w, h); ctx = canvas.getContext("2d", { willReadFrequently: true }); }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const pixels = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
    const cols = Math.ceil(w / T), rows = Math.ceil(h / T);
    let key = m.key || !prev || prev.length !== pixels.length || prevW !== w || prevH !== h;
    const changed = [];
    if (!key) {
      for (let ty = 0; ty < rows; ty++) {
        const y0 = ty * T, y1 = Math.min(h, y0 + T);
        for (let tx = 0; tx < cols; tx++) {
          const x0 = tx * T, x1 = Math.min(w, x0 + T);
          let diff = false;
          for (let y = y0; y < y1 && !diff; y++) {
            const row = y * w;
            for (let x = x0; x < x1; x++) if (pixels[row + x] !== prev[row + x]) { diff = true; break; }
          }
          if (diff) changed.push(tx, ty);
        }
      }
      if (!changed.length) { postMessage({ id: m.id, none: true }); return; }
      if (changed.length / 2 > cols * rows * m.keyShare) key = true;
    }
    prev = pixels; prevW = w; prevH = h;
    let source = canvas, count = 0;
    if (!key) {
      count = changed.length / 2;
      const across = Math.min(count, 16), down = Math.ceil(count / across);
      if (!atlas) { atlas = new OffscreenCanvas(across * T, down * T); actx = atlas.getContext("2d"); }
      if (atlas.width !== across * T || atlas.height !== down * T) { atlas.width = across * T; atlas.height = down * T; }
      actx.clearRect(0, 0, atlas.width, atlas.height);
      for (let i = 0; i < count; i++) {
        const tx = changed[i * 2], ty = changed[i * 2 + 1];
        const tw = Math.min(T, w - tx * T), th = Math.min(T, h - ty * T);
        actx.drawImage(canvas, tx * T, ty * T, tw, th, (i % across) * T, ((i / across) | 0) * T, tw, th);
      }
      source = atlas;
    }
    const head = new Uint8Array(12 + count * 2);
    head[0] = 73; head[1] = 79; head[2] = 87; head[3] = 50;
    head[4] = key ? 0 : 1; head[5] = T;
    head[6] = w & 255; head[7] = (w >> 8) & 255; head[8] = h & 255; head[9] = (h >> 8) & 255;
    head[10] = count & 255; head[11] = (count >> 8) & 255;
    for (let j = 0; j < count * 2; j++) head[12 + j] = changed[j];
    const blob = await encode(source, m.type, m.quality);
    const buf = await new Blob([head, blob]).arrayBuffer();
    postMessage({ id: m.id, buf, key }, [buf]);
  } catch (e) {
    try { bmp.close(); } catch (e2) {}
    prev = null;
    postMessage({ id: m.id, error: String(e && e.message || e) });
  }
};
`;

/** One picture's result: the bytes to send (and whether it was a whole picture), nothing changed, or a failure. */
export interface CastResult {
  buf?: ArrayBuffer;
  key?: boolean;
  none?: boolean;
  error?: string;
}

let worker: Worker | null = null;
let broken = false;
let nextId = 1;
const waiting = new Map<number, (r: CastResult) => void>();

function start(): Worker | null {
  if (worker || broken) return worker;
  try {
    if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function" || typeof createImageBitmap !== "function") {
      broken = true;
      return null;
    }
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
    worker.onmessage = (ev: MessageEvent) => {
      const r = ev.data || {};
      const done = waiting.get(r.id);
      waiting.delete(r.id);
      if (r.error) broken = true; // (once failed, the game's own thread makes them, as before)
      if (done) done(r);
    };
    worker.onerror = () => {
      broken = true;
      for (const [, done] of waiting) done({ error: "worker" });
      waiting.clear();
    };
  } catch {
    broken = true;
    worker = null;
  }
  return worker;
}

/** Whether pictures can be made in the background thread (and haven't failed there). */
export function castWorkerAvailable(): boolean {
  return !broken && start() != null;
}

/** The last picture sent forgotten: the next one is whole (a new connection, a picture not sent). */
export function castWorkerReset(): void {
  if (worker) worker.postMessage({ reset: true });
}

/**
 * The picture made from a snapshot of `canvas` in the background thread: the same bytes as IoWatch.castFrame, or
 * `none` (nothing changed), or `error` (made on the game's thread from then on).
 */
export function castWorkerFrame(canvas: HTMLCanvasElement, opts: { key: boolean; tile: number; keyShare: number; type: string; quality: number }): Promise<CastResult> {
  const w = start();
  if (!w) return Promise.resolve({ error: "unavailable" });
  return createImageBitmap(canvas).then(
    (bmp) =>
      new Promise<CastResult>((resolve) => {
        // (22 October: the thread gone while the snapshot was taken (it failed to load, or failed since): it would never
        // answer, and the Watch's broadcast stood still for good; and an answer that never comes: made here from then on)
        if (broken || worker !== w) {
          try { bmp.close(); } catch { /* gone */ }
          resolve({ error: "worker" });
          return;
        }
        const id = nextId++;
        const timer = setTimeout(() => {
          if (waiting.delete(id)) {
            broken = true;
            resolve({ error: "timeout" });
          }
        }, 5000);
        waiting.set(id, (r: CastResult) => { clearTimeout(timer); resolve(r); });
        w.postMessage({ id, bmp, key: opts.key, tile: opts.tile, keyShare: opts.keyShare, type: opts.type, quality: opts.quality }, [bmp]);
      }),
    () => ({ error: "snapshot" }),
  );
}

/** For tests: whether the background thread is in use, and how many pictures it made. */
export const castWorkerStats = { made: 0, none: 0, failed: 0 };
