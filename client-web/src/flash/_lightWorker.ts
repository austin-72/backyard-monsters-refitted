/**
 * Inferno-only (21 October, the user's: the game using more than one thread): the yard lighting's one-off pictures
 * made in a background thread (a Web Worker): a building's shadow (cast from its picture, softened) and the
 * Halloween webs on it (game/com/monsters/rendering/IoLighting). Made all at once when a yard loads, when the light
 * changes or the webs grow, they held the game's thread up for 20 to 30 ms (a slow phone's: four times that), a
 * stutter. Now the game hands the worker a snapshot of the building's picture (createImageBitmap: the browser's own,
 * quick) and goes on; the picture comes back a moment later, and until then the building keeps the one it had.
 *
 * The drawing itself is one piece of code (LIGHT_SOURCE), run in the worker, or on the game's thread where the
 * browser can't run it in one (no OffscreenCanvas in a worker, no workers, or the worker failed): the same pictures
 * either way. What moves (a building's moving parts, the workers, the pets, the monsters) is drawn on the game's
 * thread as before: its shadow changes every few frames, in step with its picture.
 */

const LIGHT_SOURCE = `
function rnd(seed) { const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); }

// (a picture's pixels, read through a canvas of its own)
function pixelsOf(src, make) {
  const w = src.width | 0, h = src.height | 0;
  const c = make(w, h);
  c.ctx.drawImage(src, 0, 0);
  return { w, h, d: c.ctx.getImageData(0, 0, w, h).data };
}
function solid(a, x, y) { return x >= 0 && y >= 0 && x < a.w && y < a.h && a.d[(y * a.w + x) * 4 + 3] > 60; }
function edgeBox(a) {
  let x0 = a.w, y0 = a.h, x1 = 0, y1 = 0;
  for (let y = 0; y < a.h; y += 2) for (let x = 0; x < a.w; x += 2) if (solid(a, x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0) { x0 = 0; y0 = 0; x1 = a.w; y1 = a.h; }
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

// ---- a shadow: every point above the foot moved along the ground away from the light by its height times the
// slant (sx, sy); the rows below the foot are on the ground already. Softened (blur px). Its colour: the paint.
function castShadow(src, p, make) {
  const w = src.width | 0;
  const relX = p.relX, relY = p.relY, sx = p.sx, sy = p.sy;
  const clipH = Math.max(0, Math.min(src.height, -relY)) | 0;
  if (w < 2 || clipH < 2) return null;
  const xs = [], ys = [];
  for (const [u, v] of [[0, 0], [w, 0], [0, clipH], [w, clipH]]) { const h = -relY - v; xs.push(relX + u + h * sx); ys.push(h * sy); }
  const blur = Math.max(0, p.blur || 0);
  const pad = Math.ceil(blur * 2.5) + 1;
  const bx = Math.floor(Math.min(...xs)) - pad, by = Math.floor(Math.min(...ys)) - pad;
  const bw = Math.min(2048, Math.ceil(Math.max(...xs) - bx) + pad) | 0, bh = Math.min(2048, Math.ceil(Math.max(...ys) - by) + pad) | 0;
  if (bw < 2 || bh < 2) return null;
  const out = make(bw, bh), ctx = out.ctx;
  ctx.save();
  if (blur > 0.05) { try { ctx.filter = "blur(" + blur.toFixed(1) + "px)"; } catch (e) {} }
  ctx.setTransform(1, 0, -sx, -sy, relX + (-relY) * sx - bx, (-relY) * sy - by);
  ctx.drawImage(src, 0, 0, w, clipH, 0, 0, w, clipH);
  ctx.restore();
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = p.colour;
  ctx.fillRect(0, 0, bw, bh);
  ctx.globalCompositeOperation = "source-over";
  return { canvas: out.canvas, ox: bx, oy: by };
}

// ---- a pen, as Flash's Graphics: a line's style for what's drawn next, each piece stroked as it's drawn
function rgba(rgb, a) { return "rgba(" + ((rgb >> 16) & 255) + "," + ((rgb >> 8) & 255) + "," + (rgb & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
function line(ctx, width, rgb, a, path) { ctx.lineWidth = width; ctx.strokeStyle = rgba(rgb, a); ctx.beginPath(); path(); ctx.stroke(); }

// a web held at its anchors (each [x, y, its angle from the hub], in order round it)
function drawHeldWeb(ctx, hx, hy, anchors, alpha, seed) {
  const r = (i) => rnd(seed * 3.7 + i * 1.31);
  const n = anchors.length;
  const linked = (i) => { const p = anchors[i], q = anchors[(i + 1) % n]; let d = q[2] - p[2]; if (d < 0) d += Math.PI * 2; return d < Math.PI * 0.6; };
  // (a film, very faint, across where it is closed)
  ctx.fillStyle = rgba(0xD8D8DE, 0.07);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (!linked(i)) continue;
    const p = anchors[i], q = anchors[(i + 1) % n];
    ctx.moveTo(hx, hy); ctx.lineTo(hx + (p[0] - hx) * 0.8, hy + (p[1] - hy) * 0.8); ctx.lineTo(hx + (q[0] - hx) * 0.8, hy + (q[1] - hy) * 0.8); ctx.closePath();
  }
  ctx.fill();
  // spokes
  line(ctx, 1, 0xD4D4DA, alpha, () => { for (const p of anchors) { ctx.moveTo(hx, hy); ctx.lineTo(p[0], p[1]); } });
  // rings
  const rings = 5 + ((r(1) * 3) | 0);
  for (let k = 1; k <= rings; k++) {
    const f = (k - 0.3 + r(k) * 0.4) / (rings + 0.5);
    line(ctx, 0.8, 0xD8D8DE, alpha * (0.55 + 0.45 * (1 - f)), () => {
      for (let i = 0; i < n; i++) {
        if (!linked(i) || r(k * 31 + i) < 0.12) continue;
        const p = anchors[i], q = anchors[(i + 1) % n];
        const ax = hx + (p[0] - hx) * f, ay = hy + (p[1] - hy) * f, bx = hx + (q[0] - hx) * f, by = hy + (q[1] - hy) * f;
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx + (hx - mx) * 0.18, my + (hy - my) * 0.18 + 1.5, bx, by);
      }
    });
  }
  // a loose strand from the edge, hanging
  const p = anchors[(r(77) * n) | 0];
  const sx = hx + (p[0] - hx) * 0.7, sy = hy + (p[1] - hy) * 0.7;
  line(ctx, 0.8, 0xE2E2E8, alpha * 0.7, () => { ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 2, sy + 6, sx + (r(78) - 0.5) * 6, sy + 10 + r(79) * 8); });
}

// ---- a building's webs: across the gaps in its own outline, tied to it (or the ground at its foot) all round; in the
// corner with the ground where it has none; its roof dusty; threads hanging where it overhangs. p: seed, footY (its foot,
// down from the picture's top), webs, webAlpha, dust.
function webLayer(src, p, make) {
  const a = pixelsOf(src, make);
  if (a.w < 12 || a.h < 12) return null;
  const box = edgeBox(a);
  const seed = p.seed, R = 54;
  const fy = Math.max(box.y + 8, Math.min(p.footY, box.y + box.h + 30));
  const held = (x, y) => { if (solid(a, x | 0, y | 0)) return true; return y >= fy && x >= box.x && x <= box.x + box.w; };
  const dirs = [];
  for (let k = 0; k < 12; k++) { const ang = k * Math.PI / 6 + 0.13; dirs.push([Math.cos(ang), Math.sin(ang), ang]); }
  const cast = (hx, hy) => { const hits = []; for (const d of dirs) for (let s = 4; s <= R; s += 3) { const x = hx + d[0] * s, y = hy + d[1] * s; if (held(x, y)) { hits.push([x, y, d[2], s]); break; } } return hits; };
  const widest = (hits) => { if (hits.length < 2) return Math.PI * 2; let gap = 0; for (let i = 0; i < hits.length; i++) { const nx = i + 1 < hits.length ? hits[i + 1][2] : hits[0][2] + Math.PI * 2; gap = Math.max(gap, nx - hits[i][2]); } return gap; };
  const held1 = [], corner = [];
  for (let y = box.y + 4; y < fy; y += 6) {
    for (let x = box.x - 10; x <= box.x + box.w + 10; x += 6) {
      if (held(x, y)) continue;
      const hits = cast(x, y);
      if (hits.length < 4) continue;
      const near = Math.min(...hits.map((h) => h[3]));
      const mean = hits.reduce((s, h) => s + h[3], 0) / hits.length;
      if (near < 6 || mean < 10) continue;
      const gap = widest(hits);
      const ground = hits.some((h) => h[1] >= fy && !solid(a, h[0] | 0, h[1] | 0));
      const score = hits.length - Math.abs(mean - 26) / 8;
      if (gap <= Math.PI * 0.7 && hits.length >= 6) held1.push({ x, y, hits, score: score + 4 });
      else if (gap <= Math.PI * 1.05 && ground && hits.length >= 5) corner.push({ x, y, hits, score });
    }
  }
  const base = Math.max(1, Math.min(4, 1 + Math.floor(box.w * box.h / 7000)));
  // (up to 100%: that share of the buildings have their webs (the same ones, more as it grows); past it, more on each)
  const amount = Number(p.webs);
  const want = (amount >= 1 ? Math.round(base * amount) : rnd(seed * 0.61 + 3) < amount ? base : 0) | 0;
  const dust = Number(p.dust);
  const picked = [];
  const pick = (list) => {
    list.sort((u, v) => v.score - u.score || rnd(seed + u.x) - rnd(seed + v.x));
    for (const c of list) { if (picked.length >= want) return; if (picked.every((q) => (q.x - c.x) * (q.x - c.x) + (q.y - c.y) * (q.y - c.y) >= 1600)) picked.push(c); }
  };
  pick(held1);
  if (!picked.length) pick(corner);
  // where it overhangs (solid, with nothing under it for a way): threads hang there
  let eaves = [];
  for (let x = box.x + 3; x < box.x + box.w - 3 && eaves.length < 12; x += 5) {
    for (let y = box.y; y < Math.min(fy - 20, box.y + box.h * 0.75); y += 2) {
      if (solid(a, x | 0, y | 0) && !held(x, y + 3)) {
        let clear = true;
        for (let k = 3; k <= 24; k += 3) if (held(x, y + k)) { clear = false; break; }
        if (clear) eaves.push([x, y + 1]);
        break;
      }
    }
  }
  if (want <= 0) eaves = [];
  if (!picked.length && !eaves.length && dust <= 0) return null;
  const P = 4, W = a.w + P * 2, H = Math.ceil(Math.max(a.h, fy + R)) + P;
  const out = make(W, H), ctx = out.ctx;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  let i = 0;
  for (const c of picked) drawHeldWeb(ctx, c.x + P, c.y + P, c.hits.map((h) => [h[0] + P, h[1] + P, h[2]]), p.webAlpha, seed * 7 + i++);
  // threads hanging from a few of its eaves, some with a clump of old web
  let spider = null, hung = 0;
  for (let k = 0; k < eaves.length && hung < 4; k++) {
    if (rnd(seed * 13 + k) > 0.45) continue;
    const e = eaves[k], len = 8 + rnd(seed + k * 5) * 18, x = e[0] + P, y = e[1] + P;
    line(ctx, 1, 0xD6D6DC, Math.min(1, p.webAlpha * 1.1), () => { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (rnd(seed + k) - 0.5) * 5, y + len * 0.6, x + (rnd(seed * 3 + k) - 0.5) * 4, y + len); });
    if (rnd(seed * 17 + k) < 0.5) { ctx.fillStyle = rgba(0xD6D6DC, 0.3); ctx.beginPath(); ctx.ellipse(x, y + len - 0.5, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (!spider) spider = [e[0], e[1]];
    hung++;
  }
  if (!spider && eaves.length) spider = [eaves[0][0], eaves[0][1]];
  // its roof furred with old web: fine grey threads and a dusty film, in its outline, fading downward
  if (dust > 0) {
    const fur = make(a.w, a.h), f = fur.ctx;
    const top = box.y, span = Math.max(6, Math.min(fy, box.y + box.h) - box.y) * 0.5;
    f.fillStyle = "rgba(205,205,212," + Math.min(0.5, 0.12 * dust).toFixed(3) + ")";
    f.fillRect(box.x, top, box.w, span);
    f.lineWidth = 0.7;
    const count = Math.round(Math.min(70, box.w * 0.45) * dust) | 0;
    for (let k = 0; k < count; k++) {
      const x0 = box.x + rnd(seed * 31 + k) * box.w, y0 = top + rnd(seed * 17 + k * 3) * span;
      const ang = (rnd(seed * 5 + k * 7) - 0.5) * 1.2, len = 8 + rnd(seed + k * 11) * 22;
      f.strokeStyle = "rgba(225,225,232," + (0.14 + rnd(k * 13 + seed) * 0.2).toFixed(2) + ")";
      f.beginPath(); f.moveTo(x0, y0); f.quadraticCurveTo(x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5 + 3, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); f.stroke();
    }
    f.globalCompositeOperation = "destination-in";
    const fade = f.createLinearGradient(0, top, 0, top + span);
    fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(0.6, "rgba(0,0,0,0.6)"); fade.addColorStop(1, "rgba(0,0,0,0)");
    f.fillStyle = fade; f.fillRect(0, 0, a.w, a.h);
    f.drawImage(src, 0, 0);
    f.globalCompositeOperation = "source-over";
    ctx.drawImage(fur.canvas, P, P);
  }
  return { canvas: out.canvas, ox: -P, oy: -P, spider, count: picked.length, hubs: picked.map((c) => [c.x, c.y]) };
}
`;

const WORKER_SOURCE = `${LIGHT_SOURCE}
const make = (w, h) => { const canvas = new OffscreenCanvas(Math.max(1, w), Math.max(1, h)); return { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true }) }; };
onmessage = (ev) => {
  const m = ev.data;
  try {
    const r = m.kind === "web" ? webLayer(m.bmp, m.p, make) : castShadow(m.bmp, m.p, make);
    m.bmp.close();
    if (!r) { postMessage({ id: m.id, none: true }); return; }
    const img = r.canvas.transferToImageBitmap();
    const out = { ...r, canvas: undefined, img };
    postMessage({ id: m.id, r: out }, [img]);
  } catch (e) {
    try { m.bmp.close(); } catch (e2) {}
    postMessage({ id: m.id, error: String((e && e.message) || e) });
  }
};
`;

/** A picture made: `img` (an ImageBitmap from the worker, or a canvas made here), where it goes, and more for webs. */
export interface LightPicture {
  img: CanvasImageSource & { width: number; height: number };
  ox: number;
  oy: number;
  spider?: number[] | null;
  count?: number;
  hubs?: number[][];
}

let worker: Worker | null = null;
let broken = false;
let nextId = 1;
const waiting = new Map<number, (r: LightPicture | null | undefined, error?: boolean) => void>();
let here: { castShadow: Function; webLayer: Function } | null = null;

/** The drawing, on the game's own thread (no worker): the same code as the worker's. */
function onThisThread(): { castShadow: Function; webLayer: Function } {
  if (!here) {
    here = new Function(`${LIGHT_SOURCE}; return { castShadow, webLayer };`)() as any;
  }
  return here!;
}

const makeHere = (w: number, h: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  return { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true })! };
};

function start(): Worker | null {
  if (worker || broken) return worker;
  try {
    if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function" || typeof createImageBitmap !== "function" || !("transferToImageBitmap" in OffscreenCanvas.prototype)) {
      broken = true;
      return null;
    }
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
    worker.onmessage = (ev: MessageEvent) => {
      const m = ev.data || {};
      const done = waiting.get(m.id);
      waiting.delete(m.id);
      if (m.error) {
        broken = true; // (from then on, on the game's own thread)
        lightWorkerStats.failed++;
        if (done) done(undefined, true);
        return;
      }
      lightWorkerStats.made++;
      if (done) done(m.none ? null : m.r);
    };
    worker.onerror = () => {
      broken = true;
      for (const [, done] of waiting) done(undefined, true);
      waiting.clear();
    };
  } catch {
    broken = true;
    worker = null;
  }
  return worker;
}

/** Whether the pictures are made in the background thread (and haven't failed there). */
export function lightWorkerAvailable(): boolean {
  return !broken && start() != null;
}

/**
 * A picture made in the background thread from a snapshot of `src` (a canvas): a building's shadow (`kind` "shadow":
 * p {relX, relY, sx, sy, blur, colour}) or its webs ("web": p {seed, footY, webs, webAlpha, dust}). Resolves with the
 * picture, null (nothing to draw), or undefined (it failed: make it on the game's thread, lightHere).
 */
export function lightInWorker(kind: "shadow" | "web", src: HTMLCanvasElement, p: any): Promise<LightPicture | null | undefined> {
  const w = start();
  if (!w) return Promise.resolve(undefined);
  return createImageBitmap(src).then(
    (bmp) =>
      new Promise<LightPicture | null | undefined>((resolve) => {
        // (22 October: the thread gone while the snapshot was taken: it would never answer, and that building was
        // never asked for again (no shadow, no webs); an answer that never comes the same: made here instead)
        if (broken || worker !== w) {
          try { bmp.close(); } catch { /* gone */ }
          resolve(undefined);
          return;
        }
        const id = nextId++;
        const timer = setTimeout(() => {
          if (waiting.delete(id)) {
            broken = true;
            resolve(undefined);
          }
        }, 10000);
        waiting.set(id, (r) => { clearTimeout(timer); resolve(r); });
        w.postMessage({ id, kind, bmp, p }, [bmp]);
      }),
    () => undefined,
  );
}

/** The same picture made here, on the game's own thread, at once (no worker, or it failed). */
export function lightHere(kind: "shadow" | "web", src: HTMLCanvasElement, p: any): LightPicture | null {
  const f = onThisThread();
  const r = kind === "web" ? f.webLayer(src, p, makeHere) : f.castShadow(src, p, makeHere);
  if (!r) return null;
  return { ...r, img: r.canvas };
}

/** For tests: the pictures made in the background thread, and failures there. */
export const lightWorkerStats = { made: 0, failed: 0 };
