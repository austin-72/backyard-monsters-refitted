/** Low-level SWF reading: header, tags, bit fields, RECT and shape records. */
import { inflateSync } from "node:zlib";

export class Bits {
  pos = 0;
  private bitPos = 0;
  private bitBuf = 0;
  constructor(public b: Buffer, start = 0) { this.pos = start; }
  align(): void { this.bitPos = 0; }
  ub(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (this.bitPos === 0) { this.bitBuf = this.b[this.pos++]; this.bitPos = 8; }
      this.bitPos--;
      v = v * 2 + ((this.bitBuf >> this.bitPos) & 1);
    }
    return v;
  }
  sb(n: number): number {
    if (n === 0) return 0;
    const v = this.ub(n);
    return v >= 2 ** (n - 1) ? v - 2 ** n : v;
  }
  u8(): number { this.align(); return this.b[this.pos++]; }
  u16(): number { this.align(); const v = this.b.readUInt16LE(this.pos); this.pos += 2; return v; }
  s16(): number { this.align(); const v = this.b.readInt16LE(this.pos); this.pos += 2; return v; }
  u32(): number { this.align(); const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v; }
  str(): string { this.align(); let e = this.pos; while (this.b[e] !== 0) e++; const s = this.b.toString("utf8", this.pos, e); this.pos = e + 1; return s; }
  rect(): { xmin: number; xmax: number; ymin: number; ymax: number } {
    this.align();
    const n = this.ub(5);
    const r = { xmin: this.sb(n), xmax: this.sb(n), ymin: this.sb(n), ymax: this.sb(n) };
    this.align();
    return r;
  }
}

export interface Tag { code: number; start: number; len: number; }

export function readSwf(file: Buffer): { body: Buffer; version: number; frameRate: number; tags: Tag[] } {
  const sig = file.toString("ascii", 0, 3);
  const body = sig === "CWS" ? inflateSync(file.subarray(8)) : file.subarray(8);
  const r = new Bits(body);
  r.rect();
  const frameRate = r.u16() / 256;
  r.u16();
  return { body, version: file[3], frameRate, tags: readTags(body, r.pos, body.length) };
}

export function readTags(body: Buffer, pos: number, end: number): Tag[] {
  const tags: Tag[] = [];
  while (pos < end) {
    const hdr = body.readUInt16LE(pos); pos += 2;
    const code = hdr >> 6;
    let len = hdr & 0x3f;
    if (len === 0x3f) { len = body.readUInt32LE(pos); pos += 4; }
    tags.push({ code, start: pos, len });
    pos += len;
    if (code === 0) break;
  }
  return tags;
}

/** Edge-level shape record stream as produced by SHAPE / SHAPEWITHSTYLE. */
export type ShapeRec =
  | { t: "style"; moveTo?: [number, number]; fill0?: number; fill1?: number; line?: number; newStyles?: unknown }
  | { t: "line"; dx: number; dy: number }
  | { t: "curve"; cx: number; cy: number; ax: number; ay: number };

/**
 * Reads shape records. `readStyles` is called for StateNewStyles (DefineShape2+)
 * and must return the new fill/line bit counts.
 */
export function readShapeRecords(r: Bits, fillBits: number, lineBits: number, readStyles?: () => { fillBits: number; lineBits: number; styles: unknown }): ShapeRec[] {
  const out: ShapeRec[] = [];
  for (;;) {
    const isEdge = r.ub(1);
    if (!isEdge) {
      const newStyles = r.ub(1), lineStyle = r.ub(1), fill1 = r.ub(1), fill0 = r.ub(1), moveTo = r.ub(1);
      if (!newStyles && !lineStyle && !fill1 && !fill0 && !moveTo) break;
      const rec: ShapeRec & { t: "style" } = { t: "style" };
      if (moveTo) { const n = r.ub(5); rec.moveTo = [r.sb(n), r.sb(n)]; }
      if (fill0) rec.fill0 = r.ub(fillBits);
      if (fill1) rec.fill1 = r.ub(fillBits);
      if (lineStyle) rec.line = r.ub(lineBits);
      if (newStyles && readStyles) {
        const s = readStyles();
        fillBits = s.fillBits; lineBits = s.lineBits; rec.newStyles = s.styles;
      }
      out.push(rec);
    } else if (r.ub(1)) {
      const n = r.ub(4) + 2;
      if (r.ub(1)) out.push({ t: "line", dx: r.sb(n), dy: r.sb(n) });
      else if (r.ub(1)) out.push({ t: "line", dx: 0, dy: r.sb(n) });
      else out.push({ t: "line", dx: r.sb(n), dy: 0 });
    } else {
      const n = r.ub(4) + 2;
      out.push({ t: "curve", cx: r.sb(n), cy: r.sb(n), ax: r.sb(n), ay: r.sb(n) });
    }
  }
  return out;
}
