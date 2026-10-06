/**
 * Extracts every DefineFont3 from a SWF: glyph outlines (as SVG path strings in
 * font units, EM = 20480), advances, kerning, ascent/descent/leading, and the
 * font name/style used by TextFormat.font lookups.
 */
import { Bits, readShapeRecords, type Tag } from "./swf.ts";

export interface FontJson {
  id: number;
  name: string;
  bold: boolean;
  italic: boolean;
  ascent: number;
  descent: number;
  leading: number;
  /** char code -> [advance, svgPath] */
  glyphs: Record<number, [number, string]>;
  /** "a,b" -> adjustment */
  kerning: Record<string, number>;
  /** DefineFontAlignZones present (Flash uses them for pixel fitting) */
  alignZones: boolean;
  /** char codes in glyph-table order (static text refers to glyphs by index) */
  order: number[];
}

export function extractFonts(body: Buffer, tags: Tag[]): FontJson[] {
  const fonts = new Map<number, FontJson>();
  for (const t of tags) {
    if (t.code !== 75 && t.code !== 48) continue;
    const r = new Bits(body, t.start);
    const id = r.u16();
    const flags = r.u8();
    const hasLayout = !!(flags & 0x80), wideOffsets = !!(flags & 0x08), wideCodes = !!(flags & 0x04);
    const italic = !!(flags & 0x02), bold = !!(flags & 0x01);
    r.u8(); // language
    const nameLen = r.u8();
    const name = body.toString("utf8", r.pos, r.pos + nameLen).replace(/\0+$/, "");
    r.pos += nameLen;
    const numGlyphs = r.u16();
    const offStart = r.pos;
    const offsets: number[] = [];
    for (let i = 0; i < numGlyphs; i++) offsets.push(wideOffsets ? r.u32() : r.u16());
    const codeOff = numGlyphs ? (wideOffsets ? r.u32() : r.u16()) : 0;
    const paths: string[] = [];
    for (let i = 0; i < numGlyphs; i++) {
      const g = new Bits(body, offStart + offsets[i]);
      const fillBits = g.ub(4), lineBits = g.ub(4);
      const recs = readShapeRecords(g, fillBits, lineBits);
      let x = 0, y = 0;
      const d: string[] = [];
      for (const rec of recs) {
        if (rec.t === "style") { if (rec.moveTo) { x = rec.moveTo[0]; y = rec.moveTo[1]; d.push(`M${x} ${y}`); } }
        else if (rec.t === "line") { x += rec.dx; y += rec.dy; d.push(`L${x} ${y}`); }
        else { const cx = x + rec.cx, cy = y + rec.cy; x = cx + rec.ax; y = cy + rec.ay; d.push(`Q${cx} ${cy} ${x} ${y}`); }
      }
      paths.push(d.join(""));
    }
    const cr = new Bits(body, offStart + codeOff);
    const codes: number[] = [];
    for (let i = 0; i < numGlyphs; i++) codes.push(wideCodes ? cr.u16() : cr.u8());
    const font: FontJson = { id, name, bold, italic, ascent: 0, descent: 0, leading: 0, glyphs: {}, kerning: {}, alignZones: false, order: codes };
    const advances: number[] = new Array(numGlyphs).fill(0);
    if (hasLayout) {
      font.ascent = cr.u16();
      font.descent = cr.u16();
      font.leading = cr.s16();
      for (let i = 0; i < numGlyphs; i++) advances[i] = cr.s16();
      for (let i = 0; i < numGlyphs; i++) cr.rect();
      const nk = cr.u16();
      for (let i = 0; i < nk; i++) {
        const a = wideCodes ? cr.u16() : cr.u8();
        const b = wideCodes ? cr.u16() : cr.u8();
        font.kerning[`${a},${b}`] = cr.s16();
      }
    }
    for (let i = 0; i < numGlyphs; i++) font.glyphs[codes[i]] = [advances[i], paths[i]];
    fonts.set(id, font);
  }
  for (const t of tags) if (t.code === 73) { const id = body.readUInt16LE(t.start); const f = fonts.get(id); if (f) f.alignZones = true; }
  return [...fonts.values()];
}
