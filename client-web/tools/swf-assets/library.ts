/**
 * Converts the character dictionary of a SWF library into JSON the runtime
 * renders and instantiates: shapes, sprites (timelines), edit texts, static
 * texts, buttons, 9-slice grids and bitmaps (written as image files).
 *
 * Coordinates are converted from twips to pixels. Shapes keep SWF's edge
 * semantics: for every fill style, edges with that style on either side are
 * oriented so the fill lies to their right and joined into closed contours.
 */
import { deflateSync, inflateSync, crc32 } from "node:zlib";
import { Bits, readTags, readShapeRecords, type Tag, type ShapeRec } from "./swf.ts";

type M = [number, number, number, number, number, number];
type Fill =
  | { t: "s"; c: number; a: number }
  | { t: "l" | "r" | "f"; m: M; stops: [number, number, number][]; spread: number; interp: number; focal?: number }
  | { t: "b"; id: number; m: M; repeat: boolean; smooth: boolean };
interface Line { w: number; c: number; a: number; cap: string; join: string; miter: number; scale: string; fill?: Fill }
export interface ShapeDef {
  type: "shape"; b: number[]; eb?: number[]; nonzero?: boolean;
  fills: { s: Fill; d: string; L?: number }[]; lines: { s: Line; d: string; L?: number }[];
}
export interface BitmapDef { type: "bitmap"; file: string; w: number; h: number; alpha?: string; }
export interface SpriteDef { type: "sprite"; n: number; frames: any[][]; labels: [string, number][]; grid?: number[]; }

export interface Library {
  version: 1;
  frameRate: number;
  symbols: Record<string, number>;
  chars: Record<number, any>;
}

const px = (v: number) => v / 20;
const fmt = (v: number) => String(Math.round(v * 100) / 100);

function readRGB(r: Bits): [number, number] { return [(r.u8() << 16) | (r.u8() << 8) | r.u8(), 1]; }
function readRGBA(r: Bits): [number, number] { const c = (r.u8() << 16) | (r.u8() << 8) | r.u8(); return [c, r.u8() / 255]; }

export function readMatrix(r: Bits): M {
  r.align();
  let a = 1, d = 1, b = 0, c = 0;
  if (r.ub(1)) { const n = r.ub(5); a = r.sb(n) / 65536; d = r.sb(n) / 65536; }
  if (r.ub(1)) { const n = r.ub(5); b = r.sb(n) / 65536; c = r.sb(n) / 65536; }
  const n = r.ub(5);
  const tx = r.sb(n), ty = r.sb(n);
  r.align();
  return [a, b, c, d, px(tx), px(ty)];
}

export function readCxform(r: Bits, alpha: boolean): number[] {
  r.align();
  const hasAdd = r.ub(1), hasMult = r.ub(1), n = r.ub(4);
  const mult = [1, 1, 1, 1], add = [0, 0, 0, 0];
  const k = alpha ? 4 : 3;
  if (hasMult) for (let i = 0; i < k; i++) mult[i] = r.sb(n) / 256;
  if (hasAdd) for (let i = 0; i < k; i++) add[i] = r.sb(n);
  r.align();
  return [...mult, ...add];
}

function readGradient(r: Bits, ver: number, type: number): { stops: [number, number, number][]; spread: number; interp: number; focal?: number } {
  r.align();
  const spread = r.ub(2), interp = r.ub(2), n = r.ub(4);
  const stops: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ratio = r.u8();
    const [c, a] = ver >= 3 ? readRGBA(r) : readRGB(r);
    stops.push([ratio, c, a]);
  }
  const g: any = { stops, spread, interp };
  if (type === 0x13) g.focal = r.s16() / 256;
  return g;
}

function readFill(r: Bits, ver: number): Fill {
  const type = r.u8();
  if (type === 0) { const [c, a] = ver >= 3 ? readRGBA(r) : readRGB(r); return { t: "s", c, a }; }
  if (type === 0x10 || type === 0x12 || type === 0x13) {
    const m = readMatrix(r);
    return { t: type === 0x10 ? "l" : type === 0x12 ? "r" : "f", m, ...readGradient(r, ver, type) };
  }
  if (type >= 0x40 && type <= 0x43) {
    const id = r.u16();
    const m = readMatrix(r);
    // bitmap space is in twips: scale a..d down to pixels as well
    return { t: "b", id, m: [m[0] / 20, m[1] / 20, m[2] / 20, m[3] / 20, m[4], m[5]], repeat: type === 0x40 || type === 0x42, smooth: type === 0x40 || type === 0x41 };
  }
  throw new Error(`unknown fill style type ${type}`);
}

function readFills(r: Bits, ver: number): Fill[] {
  let n = r.u8();
  if (n === 0xff && ver >= 2) n = r.u16();
  const out: Fill[] = [];
  for (let i = 0; i < n; i++) out.push(readFill(r, ver));
  return out;
}

const CAPS = ["round", "none", "square"];
const JOINS = ["round", "bevel", "miter"];
function readLines(r: Bits, ver: number): Line[] {
  let n = r.u8();
  if (n === 0xff && ver >= 2) n = r.u16();
  const out: Line[] = [];
  for (let i = 0; i < n; i++) {
    const w = px(r.u16());
    if (ver === 4) {
      const startCap = r.ub(2), join = r.ub(2), hasFill = r.ub(1), noH = r.ub(1), noV = r.ub(1);
      r.ub(1); r.ub(5); r.ub(1); r.ub(2);
      r.align();
      const miter = join === 2 ? r.u16() / 256 : 3;
      const line: Line = { w, c: 0, a: 1, cap: CAPS[startCap] ?? "round", join: JOINS[join] ?? "round", miter, scale: noH && noV ? "none" : noH ? "vertical" : noV ? "horizontal" : "normal" };
      if (hasFill) { line.fill = readFill(r, 4); if (line.fill.t === "s") { line.c = line.fill.c; line.a = line.fill.a; delete line.fill; } }
      else { const [c, a] = readRGBA(r); line.c = c; line.a = a; }
      out.push(line);
    } else {
      const [c, a] = ver >= 3 ? readRGBA(r) : readRGB(r);
      out.push({ w, c, a, cap: "round", join: "round", miter: 3, scale: "normal" });
    }
  }
  return out;
}

interface Edge { x0: number; y0: number; x1: number; y1: number; cx?: number; cy?: number; }
const rev = (e: Edge): Edge => ({ x0: e.x1, y0: e.y1, x1: e.x0, y1: e.y0, cx: e.cx, cy: e.cy });
const seg = (e: Edge) => (e.cx === undefined ? `L${fmt(px(e.x1))} ${fmt(px(e.y1))}` : `Q${fmt(px(e.cx))} ${fmt(px(e.cy!))} ${fmt(px(e.x1))} ${fmt(px(e.y1))}`);

/** Joins oriented edges into closed contours. */
function contours(edges: Edge[]): string {
  const used = new Uint8Array(edges.length);
  const byStart = new Map<string, number[]>();
  edges.forEach((e, i) => { const k = `${e.x0},${e.y0}`; const l = byStart.get(k); if (l) l.push(i); else byStart.set(k, [i]); });
  let d = "";
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    let e = edges[i];
    used[i] = 1;
    const sx = e.x0, sy = e.y0;
    d += `M${fmt(px(sx))} ${fmt(px(sy))}`;
    for (;;) {
      d += seg(e);
      if (e.x1 === sx && e.y1 === sy) break;
      const cands = byStart.get(`${e.x1},${e.y1}`);
      let next = -1;
      if (cands) for (const j of cands) if (!used[j]) { next = j; break; }
      if (next < 0) break;
      used[next] = 1;
      e = edges[next];
    }
  }
  return d;
}
/** Strokes: edges in drawing order, a new subpath wherever they are discontinuous. */
function polyline(edges: Edge[]): string {
  let d = "", lx = NaN, ly = NaN;
  for (const e of edges) {
    if (e.x0 !== lx || e.y0 !== ly) d += `M${fmt(px(e.x0))} ${fmt(px(e.y0))}`;
    d += seg(e);
    lx = e.x1; ly = e.y1;
  }
  return d;
}

export function parseShape(body: Buffer, t: Tag, ver: number): [number, ShapeDef] {
  const r = new Bits(body, t.start);
  const id = r.u16();
  const b = r.rect();
  const def: ShapeDef = { type: "shape", b: [px(b.xmin), px(b.ymin), px(b.xmax), px(b.ymax)], fills: [], lines: [] };
  if (ver === 4) {
    const eb = r.rect();
    def.eb = [px(eb.xmin), px(eb.ymin), px(eb.xmax), px(eb.ymax)];
    r.ub(5);
    if (r.ub(1)) def.nonzero = true;
    r.ub(2);
    r.align();
  }
  let fills = readFills(r, ver), lines = readLines(r, ver);
  r.align();
  const fillBits = r.ub(4), lineBits = r.ub(4);
  const recs: ShapeRec[] = readShapeRecords(r, fillBits, lineBits, () => {
    const f = readFills(r, ver), l = readLines(r, ver);
    r.align();
    return { fillBits: r.ub(4), lineBits: r.ub(4), styles: { f, l } };
  });
  // group edges per style array ("layer"); a layer's fills then its strokes. Flash draws the layers in order,
  // each layer's fills and then its strokes, so a later layer's fills cover an earlier layer's strokes. A shape
  // of more than one layer records each entry's layer (L) for the player to keep that order (without it, every
  // stroke was drawn over every fill: outlines across the pictures inside resource boxes and the kit table).
  let fillEdges: Edge[][] = [], lineEdges: Edge[][] = [], layer = 0;
  const flush = () => {
    fillEdges.forEach((es, i) => { if (es?.length && fills[i - 1]) def.fills.push({ s: fills[i - 1], d: contours(es), L: layer }); });
    lineEdges.forEach((es, i) => { if (es?.length && lines[i - 1]) def.lines.push({ s: lines[i - 1], d: polyline(es), L: layer }); });
    fillEdges = []; lineEdges = [];
    layer++;
  };
  let x = 0, y = 0, f0 = 0, f1 = 0, ln = 0;
  for (const rec of recs) {
    if (rec.t === "style") {
      if (rec.newStyles) {
        flush();
        const st = rec.newStyles as { f: Fill[]; l: Line[] };
        fills = st.f; lines = st.l;
        f0 = f1 = ln = 0;
      }
      if (rec.moveTo) { x = rec.moveTo[0]; y = rec.moveTo[1]; }
      if (rec.fill0 !== undefined) f0 = rec.fill0;
      if (rec.fill1 !== undefined) f1 = rec.fill1;
      if (rec.line !== undefined) ln = rec.line;
      continue;
    }
    const e: Edge = rec.t === "line" ? { x0: x, y0: y, x1: x + rec.dx, y1: y + rec.dy } : { x0: x, y0: y, cx: x + rec.cx, cy: y + rec.cy, x1: x + rec.cx + rec.ax, y1: y + rec.cy + rec.ay };
    x = e.x1; y = e.y1;
    if (f1) (fillEdges[f1] ??= []).push(e);
    if (f0) (fillEdges[f0] ??= []).push(rev(e));
    if (ln) (lineEdges[ln] ??= []).push(e);
  }
  flush();
  // (a single layer needs no numbers)
  const layers = new Set([...def.fills.map((f) => f.L), ...def.lines.map((l) => l.L)]);
  if (layers.size <= 1) { for (const f of def.fills) delete f.L; for (const l of def.lines) delete l.L; }
  return [id, def];
}

function readFilters(r: Bits): any[] {
  const n = r.u8();
  const out: any[] = [];
  const fixed = () => { const v = r.b.readInt32LE(r.pos); r.pos += 4; return v / 65536; };
  const fixed8 = () => r.s16() / 256;
  const float = () => { const v = r.b.readFloatLE(r.pos); r.pos += 4; return v; };
  for (let i = 0; i < n; i++) {
    const id = r.u8();
    switch (id) {
      case 0: { const [c, a] = readRGBA(r); const bx = fixed(), by = fixed(), ang = fixed(), dist = fixed(), str = fixed8(); const fl = r.u8();
        out.push({ k: "shadow", c, a, bx, by, angle: (ang * 180) / Math.PI, dist, str, inner: !!(fl & 0x80), knockout: !!(fl & 0x40), hide: !(fl & 0x20), q: fl & 0x1f }); break; }
      case 1: { const bx = fixed(), by = fixed(); const q = r.u8() >> 3; out.push({ k: "blur", bx, by, q }); break; }
      case 2: { const [c, a] = readRGBA(r); const bx = fixed(), by = fixed(), str = fixed8(); const fl = r.u8();
        out.push({ k: "glow", c, a, bx, by, str, inner: !!(fl & 0x80), knockout: !!(fl & 0x40), q: fl & 0x1f }); break; }
      case 3: { const [sc, sa] = readRGBA(r); const [hc, ha] = readRGBA(r); const bx = fixed(), by = fixed(), ang = fixed(), dist = fixed(), str = fixed8(); const fl = r.u8();
        out.push({ k: "bevel", sc, sa, hc, ha, bx, by, angle: (ang * 180) / Math.PI, dist, str, inner: !!(fl & 0x80), knockout: !!(fl & 0x40), onTop: !!(fl & 0x10), q: fl & 0x0f }); break; }
      case 4: case 7: { const nc = r.u8(); const cols: [number, number][] = []; for (let j = 0; j < nc; j++) cols.push(readRGBA(r)); const ratios: number[] = []; for (let j = 0; j < nc; j++) ratios.push(r.u8());
        const bx = fixed(), by = fixed(), ang = fixed(), dist = fixed(), str = fixed8(); const fl = r.u8();
        out.push({ k: id === 4 ? "gradientGlow" : "gradientBevel", cols, ratios, bx, by, angle: (ang * 180) / Math.PI, dist, str, inner: !!(fl & 0x80), knockout: !!(fl & 0x40), q: fl & 0x0f }); break; }
      case 5: { const mx = r.u8(), my = r.u8(); const div = float(), bias = float(); const m: number[] = []; for (let j = 0; j < mx * my; j++) m.push(float());
        const [c, a] = readRGBA(r); const fl = r.u8(); out.push({ k: "convolution", mx, my, div, bias, m, c, a, clamp: !!(fl & 2), preserveAlpha: !!(fl & 1) }); break; }
      case 6: { const m: number[] = []; for (let j = 0; j < 20; j++) m.push(float()); out.push({ k: "colorMatrix", m }); break; }
      default: throw new Error(`unknown filter ${id}`);
    }
  }
  return out;
}

function parsePlace(body: Buffer, t: Tag): any {
  const r = new Bits(body, t.start);
  const end = t.start + t.len;
  const f1 = r.u8();
  const f2 = t.code === 70 ? r.u8() : 0;
  const op: any = { d: r.u16() };
  if (t.code === 70 && (f2 & 0x08 || (f2 & 0x10 && f1 & 0x02))) op.cls = r.str();
  if (f1 & 0x02) op.id = r.u16();
  if (f1 & 0x01) op.mv = 1;
  if (f1 & 0x04) op.m = readMatrix(r);
  if (f1 & 0x08) op.cx = readCxform(r, true);
  if (f1 & 0x10) op.r = r.u16();
  if (f1 & 0x20) op.nm = r.str();
  if (f1 & 0x40) op.cd = r.u16();
  if (t.code === 70) {
    if (f2 & 0x01) op.f = readFilters(r);
    if (f2 & 0x02) op.bm = r.u8();
    if (f2 & 0x04) op.cab = r.u8();
    if (f2 & 0x20) op.v = r.u8();
    if (f2 & 0x40 && r.pos + 4 <= end) { const [c, a] = readRGBA(r); op.bg = [c, a]; }
  }
  return op;
}

function parseSprite(body: Buffer, t: Tag): [number, SpriteDef] {
  const id = body.readUInt16LE(t.start);
  const n = body.readUInt16LE(t.start + 2);
  const frames: any[][] = [];
  const labels: [string, number][] = [];
  let cur: any[] = [];
  for (const it of readTags(body, t.start + 4, t.start + t.len)) {
    switch (it.code) {
      case 26: case 70: cur.push(parsePlace(body, it)); break;
      case 28: cur.push({ rm: body.readUInt16LE(it.start) }); break;
      case 5: cur.push({ rm: body.readUInt16LE(it.start + 2) }); break;
      case 43: { const r = new Bits(body, it.start); labels.push([r.str(), frames.length + 1]); break; }
      case 1: frames.push(cur); cur = []; break;
    }
  }
  if (cur.length) frames.push(cur);
  while (frames.length < n) frames.push([]);
  return [id, { type: "sprite", n: Math.max(1, n), frames, labels }];
}

function parseEditText(body: Buffer, t: Tag): [number, any] {
  const r = new Bits(body, t.start);
  const id = r.u16();
  const b = r.rect();
  const a = r.u8(), c = r.u8();
  const def: any = { type: "text", b: [px(b.xmin), px(b.ymin), px(b.xmax), px(b.ymax)] };
  if (a & 0x40) def.wrap = 1;
  if (a & 0x20) def.multi = 1;
  if (a & 0x10) def.pass = 1;
  if (a & 0x08) def.ro = 1;
  if (c & 0x40) def.auto = 1;
  if (c & 0x10) def.nosel = 1;
  if (c & 0x08) def.border = 1;
  if (c & 0x04) def.wasStatic = 1;
  if (c & 0x02) def.html = 1;
  if (c & 0x01) def.outlines = 1;
  if (a & 0x01) def.font = r.u16();
  if (c & 0x80) def.fontClass = r.str();
  if (a & 0x01 || c & 0x80) def.size = px(r.u16());
  if (a & 0x04) { const [col, al] = readRGBA(r); def.color = col; def.alpha = al; }
  if (a & 0x02) def.max = r.u16();
  if (c & 0x20) { def.align = r.u8(); def.lm = px(r.u16()); def.rm = px(r.u16()); def.indent = px(r.u16()); def.leading = px(r.s16()); }
  const v = r.str();
  if (v) def.var = v;
  if (a & 0x80) def.text = r.str();
  return [id, def];
}

function parseStaticText(body: Buffer, t: Tag): [number, any] {
  const r = new Bits(body, t.start);
  const id = r.u16();
  const b = r.rect();
  const m = readMatrix(r);
  const gb = r.u8(), ab = r.u8();
  const runs: any[] = [];
  let font = 0, size = 0, color = 0, alpha = 1, x = 0, y = 0;
  for (;;) {
    const flags = r.u8();
    if (flags === 0) break;
    if (flags & 0x08) font = r.u16();
    if (flags & 0x04) { [color, alpha] = t.code === 33 ? readRGBA(r) : readRGB(r); }
    if (flags & 0x01) x = px(r.s16());
    if (flags & 0x02) y = px(r.s16());
    if (flags & 0x08) size = px(r.u16());
    const n = r.u8();
    const g: [number, number][] = [];
    r.align();
    for (let i = 0; i < n; i++) g.push([r.ub(gb), px(r.sb(ab))]);
    r.align();
    runs.push({ f: font, h: size, c: color, a: alpha, x, y, g });
    x += g.reduce((s, e) => s + e[1], 0);
  }
  return [id, { type: "stext", b: [px(b.xmin), px(b.ymin), px(b.xmax), px(b.ymax)], m, runs }];
}

function parseButton(body: Buffer, t: Tag): [number, any] {
  const r = new Bits(body, t.start);
  const id = r.u16();
  const menu = !!(r.u8() & 1);
  r.u16();
  const recs: any[] = [];
  for (;;) {
    const flags = r.u8();
    if (flags === 0) break;
    const rec: any = { s: flags & 0x0f, id: r.u16(), d: r.u16(), m: readMatrix(r), cx: readCxform(r, true) };
    if (flags & 0x10) rec.f = readFilters(r);
    if (flags & 0x20) rec.bm = r.u8();
    recs.push(rec);
  }
  return [id, { type: "button", menu, recs }];
}

// ------------------------------------------------------------ bitmaps
function pngEncode(w: number, h: number, data: Uint8Array, colorType: 6 | 0): Buffer {
  const bpp = colorType === 6 ? 4 : 1;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * bpp, w * bpp).copy(raw, y * (w * bpp + 1) + 1);
  const chunk = (type: string, payload: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(payload.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), payload]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = colorType;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Strips SWF's erroneous JPEG header and the EOI/SOI pairs Flash tolerates mid-stream. */
function cleanJpeg(d: Buffer): Buffer {
  let b = d;
  if (b[0] === 0xff && b[1] === 0xd9 && b[2] === 0xff && b[3] === 0xd8) b = b.subarray(4);
  const out: number[] = [];
  let i = 0;
  const sos = b.indexOf(Buffer.from([0xff, 0xda]));
  while (i < b.length) {
    if (i < sos && b[i] === 0xff && b[i + 1] === 0xd9 && b[i + 2] === 0xff && b[i + 3] === 0xd8) { i += 4; continue; }
    out.push(b[i++]);
  }
  return Buffer.from(out);
}
function jpegSize(b: Buffer): [number, number] {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return [0, 0];
}
function kind(b: Buffer): "png" | "gif" | "jpg" {
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  return "jpg";
}
function imageSize(b: Buffer, k: string): [number, number] {
  if (k === "png") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (k === "gif") return [b.readUInt16LE(6), b.readUInt16LE(8)];
  return jpegSize(b);
}

export function parseBitmap(body: Buffer, t: Tag, write: (name: string, data: Buffer) => void): [number, BitmapDef] {
  const id = body.readUInt16LE(t.start);
  if (t.code === 20 || t.code === 36) {
    const fmtB = body[t.start + 2], w = body.readUInt16LE(t.start + 3), h = body.readUInt16LE(t.start + 5);
    const alpha = t.code === 36;
    let p = t.start + 7;
    const tableSize = fmtB === 3 ? body[p++] + 1 : 0;
    const data = inflateSync(body.subarray(p, t.start + t.len));
    const out = new Uint8Array(w * h * 4);
    const put = (i: number, r: number, g: number, b: number, a: number) => {
      // SWF stores premultiplied colour when there is alpha
      if (alpha && a > 0 && a < 255) { r = Math.min(255, Math.round((r * 255) / a)); g = Math.min(255, Math.round((g * 255) / a)); b = Math.min(255, Math.round((b * 255) / a)); }
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a;
    };
    if (fmtB === 3) {
      const ent = alpha ? 4 : 3;
      const row = (w + 3) & ~3;
      const pal = data.subarray(0, tableSize * ent);
      const px0 = tableSize * ent;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = data[px0 + y * row + x] * ent;
        put((y * w + x) * 4, pal[k], pal[k + 1], pal[k + 2], alpha ? pal[k + 3] : 255);
      }
    } else if (fmtB === 4) {
      const row = (w * 2 + 3) & ~3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = data.readUInt16BE(y * row + x * 2);
        put((y * w + x) * 4, ((v >> 10) & 31) * 8.225 | 0, ((v >> 5) & 31) * 8.225 | 0, (v & 31) * 8.225 | 0, 255);
      }
    } else {
      for (let i = 0; i < w * h; i++) put(i * 4, data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3], alpha ? data[i * 4] : 255);
    }
    const file = `bitmaps/${id}.png`;
    write(file, pngEncode(w, h, out, 6));
    return [id, { type: "bitmap", file, w, h }];
  }
  // DefineBitsJPEG2 / JPEG3 (the image may also be PNG or GIF)
  const isJ3 = t.code === 35;
  const alphaOff = isJ3 ? body.readUInt32LE(t.start + 2) : 0;
  const imgStart = t.start + (isJ3 ? 6 : 2);
  let img = Buffer.from(body.subarray(imgStart, isJ3 ? imgStart + alphaOff : t.start + t.len));
  const k = kind(img);
  if (k === "jpg") img = cleanJpeg(img);
  const [w, h] = imageSize(img, k);
  const file = `bitmaps/${id}.${k}`;
  write(file, img);
  const def: BitmapDef = { type: "bitmap", file, w, h };
  if (isJ3 && k === "jpg" && imgStart + alphaOff < t.start + t.len) {
    const a = inflateSync(body.subarray(imgStart + alphaOff, t.start + t.len));
    if (a.length >= w * h) {
      def.alpha = `bitmaps/${id}.alpha.png`;
      write(def.alpha, pngEncode(w, h, new Uint8Array(a.buffer, a.byteOffset, w * h), 0));
    }
  }
  return [id, def];
}

// ------------------------------------------------------------ whole library
export function convertLibrary(body: Buffer, tags: Tag[], frameRate: number, write: (name: string, data: Buffer) => void): Library {
  const lib: Library = { version: 1, frameRate, symbols: {}, chars: {} };
  for (const t of tags) {
    let entry: [number, any] | null = null;
    switch (t.code) {
      case 2: entry = parseShape(body, t, 1); break;
      case 22: entry = parseShape(body, t, 2); break;
      case 32: entry = parseShape(body, t, 3); break;
      case 83: entry = parseShape(body, t, 4); break;
      case 39: entry = parseSprite(body, t); break;
      case 37: entry = parseEditText(body, t); break;
      case 11: case 33: entry = parseStaticText(body, t); break;
      case 34: entry = parseButton(body, t); break;
      case 20: case 36: case 21: case 35: entry = parseBitmap(body, t, write); break;
      case 46: case 84: entry = [body.readUInt16LE(t.start), { type: "shape", b: [0, 0, 0, 0], fills: [], lines: [], morph: 1 }]; break;
      case 78: {
        const r = new Bits(body, t.start);
        const id = r.u16();
        const g = r.rect();
        const c = lib.chars[id];
        if (c) c.grid = [px(g.xmin), px(g.ymin), px(g.xmax - g.xmin), px(g.ymax - g.ymin)];
        break;
      }
      case 74: {
        const r = new Bits(body, t.start);
        const id = r.u16();
        const flashType = r.ub(2), gridFit = r.ub(3);
        const c = lib.chars[id];
        if (c) { c.aa = flashType ? "advanced" : "normal"; c.gridFit = ["none", "pixel", "subpixel"][gridFit] ?? "pixel"; }
        break;
      }
      case 76: {
        const n = body.readUInt16LE(t.start);
        const r = new Bits(body, t.start + 2);
        for (let i = 0; i < n; i++) { const id = r.u16(); const name = r.str(); if (id) lib.symbols[name] = id; }
        break;
      }
    }
    if (entry) lib.chars[entry[0]] = entry[1];
  }
  return lib;
}
