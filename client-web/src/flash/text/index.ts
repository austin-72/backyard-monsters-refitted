/**
 * flash.text. Text is laid out with the metrics of the fonts embedded in the
 * SWF library (DefineFont3 advances, ascent/descent, kerning) and drawn from
 * their glyph outlines, so wrapping, autoSize and textWidth follow Flash.
 * Device fonts (embedFonts = false) fall back to the browser's fonts.
 */
import { ASObject } from "as3";
import { flashClass, cssColor, unimplemented, context2d } from "../_internal";
import { runtimeHooks } from "../_runtime";
import { Event, FocusEvent, TextEvent, KeyboardEvent } from "../events";
import { DisplayObject, InteractiveObject, player, type M6 } from "../display/core";
import { Rectangle } from "../geom";

// ------------------------------------------------------------ embedded fonts
interface GlyphDef { adv: number; path: string; p2d?: Path2D; }
export interface EmbeddedFont {
  id: number; name: string; bold: boolean; italic: boolean;
  ascent: number; descent: number; leading: number;
  glyphs: Map<number, GlyphDef>; kerning: Map<string, number>;
  /** char codes in glyph-table order */
  order: number[];
}
const EM = 20480;
const embedded: EmbeddedFont[] = [];
const resolvedCache = new Map<string, EmbeddedFont | null>();

/** Loads fonts.json produced by tools/swf-assets. Fonts keep SWF definition order. */
export function registerEmbeddedFonts(json: { fonts: any[] }): void {
  for (const f of json.fonts) {
    const glyphs = new Map<number, GlyphDef>();
    for (const [code, [adv, path]] of Object.entries(f.glyphs as Record<string, [number, string]>)) glyphs.set(+code, { adv, path });
    embedded.push({ id: f.id, name: f.name, bold: f.bold, italic: f.italic, ascent: f.ascent, descent: f.descent, leading: f.leading, glyphs, kerning: new Map(Object.entries(f.kerning)), order: f.order ?? [] });
  }
  embedded.sort((a, b) => a.id - b.id);
  resolvedCache.clear();
}

/** A specific DefineFont3 (text placed in the library refers to fonts by id). */
export function fontById(id: number): EmbeddedFont | null {
  return embedded.find((f) => f.id === id) ?? null;
}

/**
 * Name lookup for embedFonts: exact name+style first, otherwise the same name
 * in any style (the login title asks for plain "Groboldov" but only a bold one
 * exists, and Flash renders it). Same-name subsets are merged, the earliest
 * defined font winning per glyph.
 */
function resolveEmbedded(name: string, bold: boolean, italic: boolean): EmbeddedFont | null {
  const key = `${name}|${bold}|${italic}`;
  if (resolvedCache.has(key)) return resolvedCache.get(key)!;
  const byName = embedded.filter((f) => f.name === name);
  let set = byName.filter((f) => f.bold === bold && f.italic === italic);
  if (!set.length) set = byName;
  let out: EmbeddedFont | null = null;
  if (set.length) {
    const base = set[0];
    out = { ...base, glyphs: new Map(), kerning: new Map(base.kerning) };
    for (const f of set) for (const [c, g] of f.glyphs) if (!out.glyphs.has(c)) out.glyphs.set(c, g);
  }
  resolvedCache.set(key, out);
  return out;
}

// ------------------------------------------------------------ TextFormat
export class TextFormat extends ASObject {
  declare font: string | null; declare size: any; declare color: any; declare bold: any; declare italic: any; declare underline: any;
  declare url: string | null; declare target: string | null; declare align: string | null;
  declare leftMargin: any; declare rightMargin: any; declare indent: any; declare blockIndent: any; declare leading: any;
  declare letterSpacing: any; declare kerning: any; declare bullet: any; declare tabStops: any[] | null; declare display: string | null;
  $ctor(font: string = null, size: any = null, color: any = null, bold: any = null, italic: any = null, underline: any = null,
    url: string = null, target: string = null, align: string = null, leftMargin: any = null, rightMargin: any = null, indent: any = null, leading: any = null): void {
    super.$ctor();
    this.font = font; this.size = size; this.color = color; this.bold = bold; this.italic = italic; this.underline = underline;
    this.url = url; this.target = target; this.align = align; this.leftMargin = leftMargin; this.rightMargin = rightMargin;
    this.indent = indent; this.leading = leading; this.blockIndent = null; this.letterSpacing = null; this.kerning = null;
    this.bullet = null; this.tabStops = null; this.display = null;
  }
}
flashClass(TextFormat, "flash.text.TextFormat");

/** Fully specified format carried by each run of text. */
interface Fmt {
  font: string; size: number; color: number; bold: boolean; italic: boolean; underline: boolean; url: string; target: string;
  align: string; leftMargin: number; rightMargin: number; indent: number; blockIndent: number; leading: number;
  letterSpacing: number; kerning: boolean; bullet: boolean;
}
const FMT_KEYS = ["font", "size", "color", "bold", "italic", "underline", "url", "target", "align", "leftMargin", "rightMargin", "indent", "blockIndent", "leading", "letterSpacing", "kerning", "bullet"] as const;
const DEFAULT_FMT: Fmt = {
  font: "Times New Roman", size: 12, color: 0, bold: false, italic: false, underline: false, url: "", target: "", align: "left",
  leftMargin: 0, rightMargin: 0, indent: 0, blockIndent: 0, leading: 0, letterSpacing: 0, kerning: false, bullet: false,
};
function mergeFmt(base: Fmt, tf: TextFormat | Partial<Fmt>): Fmt {
  const out: any = { ...base };
  for (const k of FMT_KEYS) {
    const v = (tf as any)[k];
    if (v === null || v === undefined) continue;
    switch (k) {
      case "font": case "url": case "target": case "align": out[k] = String(v); break;
      case "bold": case "italic": case "underline": case "kerning": case "bullet": out[k] = !!v; break;
      case "color": out[k] = Number(v) >>> 0 & 0xffffff; break;
      default: out[k] = Number(v);
    }
  }
  return out as Fmt;
}
function toTextFormat(f: Fmt): TextFormat {
  const t = new TextFormat();
  for (const k of FMT_KEYS) (t as any)[k] = f[k];
  return t;
}
function sameFmt(a: Fmt, b: Fmt): boolean { return FMT_KEYS.every((k) => a[k] === b[k]); }

// ------------------------------------------------------------ html parsing
interface Run { text: string; fmt: Fmt; }

function decodeEntities(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => {
    const l = e.toLowerCase();
    if (l === "lt") return "<"; if (l === "gt") return ">"; if (l === "amp") return "&"; if (l === "quot") return '"';
    if (l === "apos") return "'"; if (l === "nbsp") return "\u00a0";
    return String.fromCharCode(l[1] === "x" ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10));
  });
}

function parseHtml(html: string, base: Fmt, condenseWhite: boolean): Run[] {
  const runs: Run[] = [];
  const stack: Fmt[] = [base];
  let cur = base;
  const emit = (t: string) => { if (t) runs.push({ text: t, fmt: cur }); };
  const re = /<(\/?)([a-zA-Z]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  let pOpen = false;
  let textSoFar = "";
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      let t = decodeEntities(m[4].replace(/\r\n|\n/g, condenseWhite ? " " : "\r"));
      if (condenseWhite) t = t.replace(/\s+/g, " ");
      emit(t); textSoFar += t;
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrs: Record<string, string> = {};
    m[3].replace(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g, (_s, k, _v, a, b, c) => { attrs[k.toLowerCase()] = a ?? b ?? c ?? ""; return ""; });
    if (closing) {
      if (tag === "p" || tag === "li") { if (pOpen) { emit("\r"); textSoFar += "\r"; } pOpen = false; }
      if (["font", "b", "i", "u", "a", "p", "li", "textformat", "span"].includes(tag) && stack.length > 1) { stack.pop(); cur = stack[stack.length - 1]; }
      continue;
    }
    if (tag === "br") { emit("\r"); textSoFar += "\r"; continue; }
    let next = cur;
    switch (tag) {
      case "b": next = { ...cur, bold: true }; break;
      case "i": next = { ...cur, italic: true }; break;
      case "u": next = { ...cur, underline: true }; break;
      case "a": next = { ...cur, url: attrs.href ?? "", target: attrs.target ?? "" }; break;
      case "font": {
        next = { ...cur };
        if (attrs.face) next.font = attrs.face;
        if (attrs.color) next.color = parseInt(attrs.color.replace("#", ""), 16) >>> 0 & 0xffffff;
        if (attrs.size) { const s = attrs.size; next.size = /^[+-]/.test(s) ? cur.size + Number(s) : Number(s); }
        if (attrs.letterspacing) next.letterSpacing = Number(attrs.letterspacing);
        if (attrs.kerning) next.kerning = attrs.kerning !== "0";
        break;
      }
      case "p":
        if (pOpen) { emit("\r"); textSoFar += "\r"; }
        pOpen = true;
        next = { ...cur, align: (attrs.align ?? cur.align).toLowerCase() };
        break;
      case "li":
        if (textSoFar && !textSoFar.endsWith("\r")) { emit("\r"); textSoFar += "\r"; }
        pOpen = true;
        next = { ...cur, bullet: true };
        break;
      case "textformat": {
        next = { ...cur };
        for (const [k, key] of [["leading", "leading"], ["indent", "indent"], ["blockindent", "blockIndent"], ["leftmargin", "leftMargin"], ["rightmargin", "rightMargin"]] as const) {
          if (attrs[k] !== undefined) (next as any)[key] = Number(attrs[k]);
        }
        break;
      }
      case "span": break;
      default: continue;
    }
    stack.push(next);
    cur = next;
  }
  // coalesce
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && sameFmt(last.fmt, r.fmt)) last.text += r.text; else out.push({ ...r });
  }
  return out;
}

function escapeHtml(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// ------------------------------------------------------------ layout
interface LGlyph { ch: string; code: number; x: number; adv: number; fmt: Fmt; font: EmbeddedFont | null; index: number; }
interface Line { start: number; end: number; glyphs: LGlyph[]; width: number; ascent: number; descent: number; leading: number; x: number; y: number; }

let measureCtx: CanvasRenderingContext2D | null = null;
function deviceFamily(name: string): string {
  const n = name.split(",")[0].trim();
  if (n === "_sans") return "Arial, Helvetica, sans-serif";
  if (n === "_serif") return "'Times New Roman', Times, serif";
  if (n === "_typewriter") return "'Courier New', Courier, monospace";
  return `'${n}', Arial, sans-serif`;
}
function cssFont(f: Fmt): string { return `${f.italic ? "italic " : ""}${f.bold ? "bold " : ""}${f.size}px ${deviceFamily(f.font)}`; }
function measureDevice(f: Fmt, ch: string): number {
  if (!measureCtx) measureCtx = context2d(document.createElement("canvas"));
  measureCtx.font = cssFont(f);
  return measureCtx.measureText(ch).width;
}

export class TextField extends InteractiveObject {
  declare $runs: Run[];
  declare $text: string;
  declare $default: Fmt;
  declare $w: number; declare $h: number;
  declare $autoSize: string; declare $wordWrap: boolean; declare $multiline: boolean; declare $embedFonts: boolean;
  declare $type: string; declare $selectable: boolean; declare $border: boolean; declare $borderColor: number;
  declare $background: boolean; declare $backgroundColor: number; declare $maxChars: number; declare $restrict: string | null;
  declare $password: boolean; declare $condenseWhite: boolean; declare $scrollV: number; declare $scrollH: number;
  declare $selBegin: number; declare $selEnd: number; declare $antiAliasType: string; declare $gridFitType: string;
  declare $sharpness: number; declare $thickness: number; declare $mouseWheelEnabled: boolean; declare $alwaysShowSelection: boolean;
  declare $htmlSource: string | null; declare $styleSheet: any;
  // Clearing the layout (any change to text, format or size) bumps $gen, which $renderVersion reports,
  // so caches and redraw regions see a restyle even when the text is laid out again before rendering.
  declare $lay: Line[] | null; declare $gen: number;
  get $layout(): Line[] | null { return this.$lay; }
  set $layout(v: Line[] | null) { if (v === null) this.$gen = (this.$gen | 0) + 1; this.$lay = v; }
  /** top-left of the text box in local coordinates (library text fields start at their bounds) */
  declare $bx: number; declare $by: number;

  $alloc(): void {
    super.$alloc();
    this.$bx = 0; this.$by = 0;
    this.$runs = [];
    this.$text = "";
    this.$default = { ...DEFAULT_FMT };
    this.$w = 100; this.$h = 100;
    this.$autoSize = "none"; this.$wordWrap = false; this.$multiline = false; this.$embedFonts = false;
    this.$type = "dynamic"; this.$selectable = true; this.$border = false; this.$borderColor = 0;
    this.$background = false; this.$backgroundColor = 0xffffff; this.$maxChars = 0; this.$restrict = null;
    this.$password = false; this.$condenseWhite = false; this.$scrollV = 1; this.$scrollH = 0;
    this.$selBegin = 0; this.$selEnd = 0; this.$antiAliasType = "normal"; this.$gridFitType = "pixel";
    this.$sharpness = 0; this.$thickness = 0; this.$mouseWheelEnabled = true; this.$alwaysShowSelection = false;
    this.$layout = null; this.$htmlSource = null; this.$styleSheet = null;
  }

  private $changed(): void { this.$layout = null; this.$doAutoSize(); }
  /** changes whenever the rendered appearance may change (render caches compare it) */
  get $renderVersion(): number {
    const focused = inputBridge.focused === this;
    return (this.$layout ? 0 : 1) + (this.$gen | 0) * 1009 + (focused ? 2 + (inputBridge.caretVisible() ? 4 : 0) + this.$selBegin * 8 + this.$selEnd * 65536 : 0) + this.$scrollV * 7 + this.$scrollH * 13 + this.$w * 3 + this.$h * 5 + (this.$background ? 11 : 0) + (this.$border ? 17 : 0);
  }

  // ---------------------------------------------------------- content
  get text(): string { return this.$text; }
  set text(v: string) {
    if (v == null) throw new TypeError("Error #2007: Parameter text must be non-null.");
    const t = String(v).replace(/\r\n|\n/g, "\r");
    this.$runs = t ? [{ text: t, fmt: this.$runs[0]?.fmt && this.$runs.length && false ? this.$runs[0].fmt : this.$default }] : [];
    this.$text = t;
    this.$htmlSource = null;
    this.$clampSelection();
    this.$changed();
  }
  get htmlText(): string {
    const paras: string[] = [];
    let para = "";
    let pfmt: Fmt | null = null;
    const flush = () => {
      const f = pfmt ?? this.$default;
      paras.push(`<P ALIGN="${f.align.toUpperCase()}">${para}</P>`);
      para = ""; pfmt = null;
    };
    for (const r of this.$runs) {
      const parts = r.text.split("\r");
      parts.forEach((p, i) => {
        if (i > 0) flush();
        if (!pfmt) pfmt = r.fmt;
        if (!p) return;
        let s = escapeHtml(p);
        if (r.fmt.underline) s = `<U>${s}</U>`;
        if (r.fmt.italic) s = `<I>${s}</I>`;
        if (r.fmt.bold) s = `<B>${s}</B>`;
        if (r.fmt.url) s = `<A HREF="${r.fmt.url}" TARGET="${r.fmt.target}">${s}</A>`;
        para += `<FONT FACE="${r.fmt.font}" SIZE="${r.fmt.size}" COLOR="#${r.fmt.color.toString(16).toUpperCase().padStart(6, "0")}" LETTERSPACING="${r.fmt.letterSpacing}" KERNING="${r.fmt.kerning ? 1 : 0}">${s}</FONT>`;
      });
    }
    flush();
    return paras.join("");
  }
  set htmlText(v: string) {
    if (v == null) throw new TypeError("Error #2007: Parameter text must be non-null.");
    this.$htmlSource = String(v);
    this.$runs = parseHtml(String(v), this.$default, this.$condenseWhite);
    // Flash drops the paragraph break closing the final paragraph
    const last = this.$runs[this.$runs.length - 1];
    if (last && last.text.endsWith("\r")) { last.text = last.text.slice(0, -1); if (!last.text) this.$runs.pop(); }
    this.$text = this.$runs.map((r) => r.text).join("");
    this.$clampSelection();
    this.$changed();
  }
  get length(): number { return this.$text.length; }
  appendText(s: string): void { this.replaceText(this.$text.length, this.$text.length, s); }
  replaceText(begin: number, end: number, s: string): void {
    const t = String(s).replace(/\r\n|\n/g, "\r");
    const fmt = this.$fmtAt(Math.max(0, begin - 1)) ?? this.$default;
    const runs: Run[] = [];
    let pos = 0;
    let inserted = false;
    for (const r of this.$runs) {
      const rs = pos, re = pos + r.text.length;
      pos = re;
      if (re <= begin || rs >= end) {
        if (rs >= end && !inserted) { if (t) runs.push({ text: t, fmt }); inserted = true; }
        runs.push(r);
        continue;
      }
      const head = r.text.slice(0, Math.max(0, begin - rs));
      const tail = r.text.slice(Math.max(0, end - rs));
      if (head) runs.push({ text: head, fmt: r.fmt });
      if (!inserted) { if (t) runs.push({ text: t, fmt }); inserted = true; }
      if (tail) runs.push({ text: tail, fmt: r.fmt });
    }
    if (!inserted && t) runs.push({ text: t, fmt });
    this.$runs = runs;
    this.$text = runs.map((r) => r.text).join("");
    this.$clampSelection();
    this.$changed();
  }
  replaceSelectedText(s: string): void {
    this.replaceText(this.$selBegin, this.$selEnd, s);
    this.$selBegin = this.$selEnd = this.$selBegin + String(s).length;
  }
  private $fmtAt(i: number): Fmt | null {
    let pos = 0;
    for (const r of this.$runs) { if (i < pos + r.text.length) return r.fmt; pos += r.text.length; }
    return this.$runs.length ? this.$runs[this.$runs.length - 1].fmt : null;
  }

  // ---------------------------------------------------------- formats
  get defaultTextFormat(): TextFormat { return toTextFormat(this.$default); }
  set defaultTextFormat(f: TextFormat) {
    if (f == null) throw new TypeError("Error #2007: Parameter format must be non-null.");
    this.$default = mergeFmt(this.$default, f);
  }
  getTextFormat(begin: number = -1, end: number = -1): TextFormat {
    if (begin < 0) { begin = 0; end = this.$text.length; }
    if (end < 0) end = begin + 1;
    const out = new TextFormat();
    let first = true;
    let pos = 0;
    for (const r of this.$runs) {
      const rs = pos, re = pos + r.text.length;
      pos = re;
      if (re <= begin || rs >= end) continue;
      for (const k of FMT_KEYS) {
        if (first) (out as any)[k] = r.fmt[k];
        else if ((out as any)[k] !== r.fmt[k]) (out as any)[k] = null;
      }
      first = false;
    }
    if (first) for (const k of FMT_KEYS) (out as any)[k] = this.$default[k];
    return out;
  }
  setTextFormat(f: TextFormat, begin: number = -1, end: number = -1): void {
    if (f == null) throw new TypeError("Error #2007: Parameter format must be non-null.");
    if (begin < 0) { begin = 0; end = this.$text.length; }
    else if (end < 0) end = begin + 1;
    if (begin > this.$text.length || end > this.$text.length) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    const runs: Run[] = [];
    let pos = 0;
    for (const r of this.$runs) {
      const rs = pos, re = pos + r.text.length;
      pos = re;
      if (re <= begin || rs >= end) { runs.push(r); continue; }
      const a = Math.max(begin, rs) - rs, b = Math.min(end, re) - rs;
      if (a > 0) runs.push({ text: r.text.slice(0, a), fmt: r.fmt });
      runs.push({ text: r.text.slice(a, b), fmt: mergeFmt(r.fmt, f) });
      if (b < r.text.length) runs.push({ text: r.text.slice(b), fmt: r.fmt });
    }
    this.$runs = runs;
    this.$changed();
  }
  get textColor(): number { return (this.$runs[0]?.fmt ?? this.$default).color; }
  set textColor(v: number) {
    const c = v >>> 0 & 0xffffff;
    this.$runs = this.$runs.map((r) => ({ text: r.text, fmt: { ...r.fmt, color: c } }));
    this.$default = { ...this.$default, color: c };
    this.$layout = null;
  }
  get styleSheet(): any { return this.$styleSheet; } set styleSheet(v: any) { this.$styleSheet = v; if (v) unimplemented("TextField.styleSheet"); }

  // ---------------------------------------------------------- field properties
  get autoSize(): string { return this.$autoSize; }
  set autoSize(v: string) {
    if (!["none", "left", "center", "right"].includes(v)) throw new Error("Error #2008: Parameter autoSize must be one of the accepted values.");
    this.$autoSize = v; this.$changed();
  }
  get wordWrap(): boolean { return this.$wordWrap; } set wordWrap(v: boolean) { this.$wordWrap = !!v; this.$changed(); }
  get multiline(): boolean { return this.$multiline; } set multiline(v: boolean) { this.$multiline = !!v; }
  get embedFonts(): boolean { return this.$embedFonts; } set embedFonts(v: boolean) { this.$embedFonts = !!v; this.$changed(); }
  get type(): string { return this.$type; }
  set type(v: string) {
    if (v !== "dynamic" && v !== "input") throw new Error("Error #2008: Parameter type must be one of the accepted values.");
    this.$type = v;
  }
  get selectable(): boolean { return this.$selectable; } set selectable(v: boolean) { this.$selectable = !!v; }
  get border(): boolean { return this.$border; } set border(v: boolean) { this.$border = !!v; }
  get borderColor(): number { return this.$borderColor; } set borderColor(v: number) { this.$borderColor = v >>> 0 & 0xffffff; }
  get background(): boolean { return this.$background; } set background(v: boolean) { this.$background = !!v; }
  get backgroundColor(): number { return this.$backgroundColor; } set backgroundColor(v: number) { this.$backgroundColor = v >>> 0 & 0xffffff; }
  get maxChars(): number { return this.$maxChars; } set maxChars(v: number) { this.$maxChars = v | 0; }
  get restrict(): string | null { return this.$restrict; } set restrict(v: string | null) { this.$restrict = v; }
  get displayAsPassword(): boolean { return this.$password; } set displayAsPassword(v: boolean) { this.$password = !!v; this.$changed(); }
  get condenseWhite(): boolean { return this.$condenseWhite; } set condenseWhite(v: boolean) { this.$condenseWhite = !!v; }
  get antiAliasType(): string { return this.$antiAliasType; } set antiAliasType(v: string) { this.$antiAliasType = v; }
  get gridFitType(): string { return this.$gridFitType; } set gridFitType(v: string) { this.$gridFitType = v; }
  get sharpness(): number { return this.$sharpness; } set sharpness(v: number) { this.$sharpness = +v; }
  get thickness(): number { return this.$thickness; } set thickness(v: number) { this.$thickness = +v; }
  get mouseWheelEnabled(): boolean { return this.$mouseWheelEnabled; } set mouseWheelEnabled(v: boolean) { this.$mouseWheelEnabled = !!v; }
  get alwaysShowSelection(): boolean { return this.$alwaysShowSelection; } set alwaysShowSelection(v: boolean) { this.$alwaysShowSelection = !!v; }
  get useRichTextClipboard(): boolean { return false; } set useRichTextClipboard(_v: boolean) {}
  get htmlSource(): string | null { return this.$htmlSource; }

  get width(): number { return this.$w * Math.abs(this.$sx); }
  set width(v: number) { this.$w = Math.max(0, +v); this.$layout = null; this.$doAutoSize(); }
  get height(): number { return this.$h * Math.abs(this.$sy); }
  set height(v: number) { this.$h = Math.max(0, +v); this.$layout = null; }

  // ---------------------------------------------------------- selection and scrolling
  get caretIndex(): number { return this.$selEnd; }
  get selectionBeginIndex(): number { return this.$selBegin; }
  get selectionEndIndex(): number { return this.$selEnd; }
  setSelection(begin: number, end: number): void {
    this.$selBegin = Math.max(0, Math.min(begin, this.$text.length));
    this.$selEnd = Math.max(0, Math.min(end, this.$text.length));
    inputBridge.syncSelection(this);
  }
  private $clampSelection(): void {
    this.$selBegin = Math.min(this.$selBegin, this.$text.length);
    this.$selEnd = Math.min(this.$selEnd, this.$text.length);
    // The game changed the text of the field being typed in (e.g. the chat clearing its box after a line is
    // sent): the hidden <textarea> must follow, or the next key brings the old text back in front of it.
    inputBridge.syncText(this);
  }
  get scrollV(): number { return this.$scrollV; } set scrollV(v: number) { this.$scrollV = Math.max(1, Math.min(v | 0, this.maxScrollV)); }
  get scrollH(): number { return this.$scrollH; } set scrollH(v: number) { this.$scrollH = Math.max(0, v | 0); }
  get maxScrollH(): number { return Math.max(0, Math.ceil(this.textWidth + 4 - this.$w)); }
  get maxScrollV(): number {
    const lines = this.$lines();
    const visible = this.$h - 4;
    for (let i = 0; i < lines.length; i++) {
      const top = lines[i].y;
      const last = lines[lines.length - 1];
      if (last.y + last.ascent + last.descent - top <= visible) return i + 1;
    }
    return 1;
  }
  get bottomScrollV(): number {
    const lines = this.$lines();
    const top = lines[this.$scrollV - 1]?.y ?? 0;
    let n = this.$scrollV;
    for (let i = this.$scrollV - 1; i < lines.length; i++) { if (lines[i].y + lines[i].ascent + lines[i].descent - top <= this.$h - 4) n = i + 1; }
    return n;
  }
  get numLines(): number { return this.$lines().length; }
  get textWidth(): number { return Math.max(0, ...this.$lines().map((l) => l.width)); }
  get textHeight(): number {
    const lines = this.$lines();
    if (!this.$text.length) return 0;
    const last = lines[lines.length - 1];
    return last.y + last.ascent + last.descent - 2;
  }
  getLineMetrics(lineIndex: number): TextLineMetrics {
    const l = this.$lines()[lineIndex];
    if (!l) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    return new TextLineMetrics(l.x, l.width, l.ascent + l.descent + l.leading, l.ascent, l.descent, l.leading);
  }
  getLineText(lineIndex: number): string {
    const l = this.$lines()[lineIndex];
    if (!l) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    return this.$text.slice(l.start, l.end);
  }
  getLineLength(lineIndex: number): number { return this.getLineText(lineIndex).length; }
  getLineOffset(lineIndex: number): number {
    const l = this.$lines()[lineIndex];
    if (!l) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    return l.start;
  }
  getLineIndexOfChar(i: number): number { return this.$lines().findIndex((l) => i >= l.start && i < l.end); }
  getLineIndexAtPoint(x: number, y: number): number {
    void x;
    const lines = this.$lines();
    for (let i = 0; i < lines.length; i++) if (y >= lines[i].y && y < lines[i].y + lines[i].ascent + lines[i].descent + lines[i].leading) return i;
    return -1;
  }
  getCharBoundaries(i: number): Rectangle | null {
    for (const l of this.$lines()) for (const g of l.glyphs) if (g.index === i) return new Rectangle(l.x + g.x, l.y, g.adv, l.ascent + l.descent);
    return null;
  }
  getCharIndexAtPoint(x: number, y: number): number {
    for (const l of this.$lines()) {
      if (y < l.y || y >= l.y + l.ascent + l.descent + l.leading) continue;
      for (const g of l.glyphs) if (x >= l.x + g.x && x < l.x + g.x + g.adv) return g.index;
    }
    return -1;
  }
  getFirstCharInParagraph(i: number): number { return this.$text.lastIndexOf("\r", i - 1) + 1; }
  getParagraphLength(i: number): number {
    const s = this.getFirstCharInParagraph(i);
    const e = this.$text.indexOf("\r", s);
    return (e < 0 ? this.$text.length : e + 1) - s;
  }

  // ---------------------------------------------------------- layout
  /** Lines laid out in a box w wide (device text in a horizontally scaled field, see $drawSelf). */
  $linesAt(w: number): Line[] {
    if (Math.abs(w - this.$w) < 0.01) return this.$lines();
    const gen = this.$gen | 0, c = (this as any).$wide as { w: number; gen: number; lines: Line[] } | undefined;
    if (c && c.gen === gen && Math.abs(c.w - w) < 0.01) return c.lines;
    const savedW = this.$w, savedLay = this.$lay;
    this.$w = w; this.$lay = null;
    let lines: Line[];
    try { lines = this.$lines(); } finally { this.$w = savedW; this.$lay = savedLay; }
    (this as any).$wide = { w, gen, lines };
    return lines;
  }
  $lines(): Line[] {
    if (this.$layout) return this.$layout;
    const lines: Line[] = [];
    const maxW = this.$wordWrap ? this.$w - 4 : Infinity;
    const text = this.$password ? "*".repeat(this.$text.length) : this.$text;
    // per-character format
    const fmts: Fmt[] = [];
    for (const r of this.$runs) for (let i = 0; i < r.text.length; i++) fmts.push(r.fmt);
    let y = 2;
    let pStart = 0;
    const paras = text.split("\r");
    for (let pi = 0; pi < paras.length; pi++) {
      const ptext = paras[pi];
      const pfmt = fmts[pStart] ?? this.$lastFmt();
      const indentFirst = pfmt.indent;
      const left = pfmt.leftMargin + pfmt.blockIndent;
      const right = pfmt.rightMargin;
      const avail = maxW - left - right;
      // measure glyphs
      const gl: LGlyph[] = [];
      let x = 0;
      for (let i = 0; i < ptext.length; i++) {
        const f = fmts[pStart + i] ?? pfmt;
        const code = ptext.charCodeAt(i);
        const font = this.$embedFonts ? resolveEmbedded(f.font, f.bold, f.italic) : null;
        let adv: number;
        if (this.$embedFonts) {
          const g = font?.glyphs.get(code);
          adv = g ? (g.adv / EM) * f.size : 0;
          if (f.kerning && font && i > 0) adv += ((font.kerning.get(`${ptext.charCodeAt(i - 1)},${code}`) ?? 0) / EM) * f.size;
        } else adv = measureDevice(f, ptext[i]);
        adv += f.letterSpacing;
        gl.push({ ch: ptext[i], code, x, adv, fmt: f, font, index: pStart + i });
        x += adv;
      }
      // break into lines
      let ls = 0;
      let first = true;
      while (true) {
        const lineAvail = avail - (first ? indentFirst : 0);
        let le = gl.length;
        if (this.$wordWrap && ls < gl.length) {
          let w = 0;
          let lastBreak = -1;
          for (let i = ls; i < gl.length; i++) {
            const g = gl[i];
            if (w + g.adv > lineAvail && g.ch !== " " && i > ls) {
              le = lastBreak >= 0 ? lastBreak + 1 : i;
              break;
            }
            w += g.adv;
            if (g.ch === " " || g.ch === "-" || g.ch === "\u200b") lastBreak = i;
          }
        }
        const lg = gl.slice(ls, le);
        const x0 = lg.length ? lg[0].x : 0;
        for (const g of lg) g.x -= x0;
        let width = lg.reduce((s, g) => s + g.adv, 0);
        let trimmed = width;
        for (let i = lg.length - 1; i >= 0 && lg[i].ch === " "; i--) trimmed -= lg[i].adv;
        let asc = 0, desc = 0, lead = 0;
        const metricFmts = lg.length ? lg.map((g) => g.fmt) : [fmts[pStart + ls] ?? pfmt];
        for (const f of metricFmts) {
          const [a, d] = this.$fontMetrics(f);
          asc = Math.max(asc, a); desc = Math.max(desc, d); lead = Math.max(lead, f.leading);
        }
        const offset = (first ? indentFirst : 0) + left;
        let ax = 2 + offset;
        const boxW = this.$autoSize !== "none" && !this.$wordWrap ? trimmed : this.$w - 4 - left - right - (first ? indentFirst : 0);
        if (pfmt.align === "center") ax += Math.max(0, (boxW - trimmed) / 2);
        else if (pfmt.align === "right") ax += Math.max(0, boxW - trimmed);
        width = trimmed;
        lines.push({ start: pStart + ls, end: pStart + le, glyphs: lg, width: width + offset, ascent: asc, descent: desc, leading: lead, x: ax, y });
        y += asc + desc + lead;
        first = false;
        ls = le;
        if (ls >= gl.length) break;
      }
      pStart += ptext.length + 1;
    }
    this.$layout = lines;
    return lines;
  }
  private $lastFmt(): Fmt { return this.$runs.length ? this.$runs[this.$runs.length - 1].fmt : this.$default; }
  private $fontMetrics(f: Fmt): [number, number] {
    if (this.$embedFonts) {
      const font = resolveEmbedded(f.font, f.bold, f.italic);
      if (font) return [(font.ascent / EM) * f.size, (font.descent / EM) * f.size];
      return [0, 0];
    }
    return [f.size * 0.905, f.size * 0.212];
  }
  $doAutoSize(): void {
    if (this.$autoSize === "none") return;
    const lines = this.$lines();
    const tw = Math.max(0, ...lines.map((l) => l.width));
    const last = lines[lines.length - 1];
    const th = last ? last.y + last.ascent + last.descent - 2 : 0;
    if (!this.$wordWrap) {
      const oldW = this.$w;
      const newW = tw + 4;
      if (this.$autoSize === "center") this.x = this.x + (oldW - newW) / 2 * this.$sx;
      else if (this.$autoSize === "right") this.x = this.x + (oldW - newW) * this.$sx;
      this.$w = newW;
    }
    this.$h = th + 4;
    this.$layout = null;
  }

  /** Library text fields: default format from the edit text definition. */
  $setDefault(fmt: Partial<Fmt>, _fontId?: number): void {
    this.$default = mergeFmt(this.$default, fmt);
  }

  // ---------------------------------------------------------- display object hooks
  $selfBounds(): Rectangle { return new Rectangle(this.$bx, this.$by, this.$w, this.$h); }
  $hitSelf(lx: number, ly: number): boolean { lx -= this.$bx; ly -= this.$by; return lx >= 0 && ly >= 0 && lx <= this.$w && ly <= this.$h; }
  $drawSelf(ctx: CanvasRenderingContext2D, mm: M6, alpha: number): void {
    if (player.debug.noText) return;
    let m: M6 = this.$bx || this.$by ? [mm[0], mm[1], mm[2], mm[3], mm[0] * this.$bx + mm[2] * this.$by + mm[4], mm[1] * this.$bx + mm[3] * this.$by + mm[5]] : mm;
    // Device fonts cannot be stretched: in a horizontally scaled field Flash draws the glyphs at the
    // vertical scale and lays the text out across the field's scaled width (so a label in a widened
    // button stays centred and unstretched). Embedded fonts are outlines and scale like shapes.
    let boxW = this.$w;
    if (!this.$embedFonts) {
      const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
      if (sy > 1e-6 && Math.abs(sx / sy - 1) > 0.01) {
        const r = sx / sy;
        m = [m[0] / r, m[1] / r, m[2], m[3], m[4], m[5]];
        boxW = this.$w * r;
      }
    }
    // A field not being typed in is drawn once into its own canvas and copied from it while nothing about
    // it changes (text, format, size, scroll, scale, alpha): laying out and filling every glyph again whenever
    // the screen behind it was redrawn was much of the cost of text-heavy windows (chat, alliance, quests, the
    // map's cells while it is dragged). Like Flash's text it lands on whole pixels: the copy is placed at the
    // field's position rounded (fps pass, 4 October).
    if (inputBridge.focused !== this && !(this.$alwaysShowSelection && this.$selBegin !== this.$selEnd) && !textCache.off) {
      const fx = 0, fy = 0;
      const key = `${this.$gen | 0}|${boxW}|${this.$h}|${this.$scrollV}|${this.$scrollH}|${this.$background ? this.$backgroundColor : -1}|${this.$border ? this.$borderColor : -1}|${alpha}|${m[0]}|${m[1]}|${m[2]}|${m[3]}`;
      let c = (this as any).$tc as { key: string; canvas: HTMLCanvasElement; ox: number; oy: number } | undefined;
      if (!c || c.key !== key) {
        // the box's corners under the matrix's linear part, at its fraction of a pixel
        const xs = [0, m[0] * boxW, m[2] * this.$h, m[0] * boxW + m[2] * this.$h], ys = [0, m[1] * boxW, m[3] * this.$h, m[1] * boxW + m[3] * this.$h];
        const ox = Math.floor(Math.min(...xs) + fx) - 1, oy = Math.floor(Math.min(...ys) + fy) - 1;
        const cw = Math.ceil(Math.max(...xs) + fx) + 1 - ox, ch = Math.ceil(Math.max(...ys) + fy) + 1 - oy;
        if (cw > 0 && ch > 0 && cw * ch <= 1_000_000) {
          const canvas = c && c.canvas ? c.canvas : document.createElement("canvas");
          if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
          const tctx = context2d(canvas);
          tctx.setTransform(1, 0, 0, 1, 0, 0);
          tctx.clearRect(0, 0, cw, ch);
          this.$drawText(tctx, [m[0], m[1], m[2], m[3], fx - ox, fy - oy], boxW, alpha);
          c = { key, canvas, ox, oy };
          (this as any).$tc = c;
        } else c = undefined;
      }
      if (c) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(c.canvas, Math.round(m[4]) + c.ox, Math.round(m[5]) + c.oy);
        return;
      }
    }
    this.$drawText(ctx, m, boxW, alpha);
  }
  /** Draws the field's box and text with matrix m (the box boxW wide). */
  private $drawText(ctx: CanvasRenderingContext2D, m: M6, boxW: number, alpha: number): void {
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (this.$background) { ctx.fillStyle = cssColor(this.$backgroundColor, alpha); ctx.fillRect(0, 0, boxW, this.$h); }
    if (this.$border) {
      ctx.strokeStyle = cssColor(this.$borderColor, alpha);
      ctx.lineWidth = 1 / Math.max(1e-6, Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])));
      ctx.strokeRect(0.5 * ctx.lineWidth, 0.5 * ctx.lineWidth, boxW - ctx.lineWidth, this.$h - ctx.lineWidth);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, boxW, this.$h); ctx.clip();
    const lines = this.$linesAt(boxW);
    const scrollTop = (lines[this.$scrollV - 1]?.y ?? 2) - 2;
    const focused = inputBridge.focused === this;
    const showSel = focused || this.$alwaysShowSelection;
    if (showSel) this.$drawSelection(ctx, lines, scrollTop, alpha);
    // Selected text is drawn white on the black highlight, as Flash does (it was black on black).
    const selA = showSel ? Math.min(this.$selBegin, this.$selEnd) : 0, selB = showSel ? Math.max(this.$selBegin, this.$selEnd) : 0;
    for (const l of lines) {
      const base = l.y - scrollTop + l.ascent;
      if (base - l.ascent > this.$h) break;
      for (const g of l.glyphs) {
        const gx = l.x + g.x - this.$scrollH;
        if (g.ch === " " || g.ch === "\t") continue;
        ctx.fillStyle = cssColor(g.index >= selA && g.index < selB ? 0xffffff : g.fmt.color, alpha);
        if (this.$embedFonts) {
          const glyph = g.font?.glyphs.get(g.code);
          if (!glyph) continue;
          if (!glyph.p2d) glyph.p2d = new Path2D(glyph.path);
          const s = g.fmt.size / EM;
          ctx.setTransform(m[0] * s, m[1] * s, m[2] * s, m[3] * s, m[0] * gx + m[2] * base + m[4], m[1] * gx + m[3] * base + m[5]);
          ctx.fill(glyph.p2d, "nonzero");
        } else {
          ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
          ctx.font = cssFont(g.fmt);
          ctx.textBaseline = "alphabetic";
          ctx.fillText(g.ch, gx, base);
        }
        if (g.fmt.underline) {
          ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
          ctx.fillRect(gx, base + 1, g.adv, Math.max(1, g.fmt.size / 16));
        }
      }
    }
    if (focused && inputBridge.caretVisible()) this.$drawCaret(ctx, m, lines, scrollTop, alpha);
    ctx.restore();
  }
  private $drawSelection(ctx: CanvasRenderingContext2D, lines: Line[], scrollTop: number, alpha: number): void {
    const a = Math.min(this.$selBegin, this.$selEnd), b = Math.max(this.$selBegin, this.$selEnd);
    if (a === b) return;
    ctx.fillStyle = cssColor(0x000000, alpha);
    for (const l of lines) for (const g of l.glyphs) if (g.index >= a && g.index < b) ctx.fillRect(l.x + g.x - this.$scrollH, l.y - scrollTop, g.adv, l.ascent + l.descent);
  }
  private $drawCaret(ctx: CanvasRenderingContext2D, m: M6, lines: Line[], scrollTop: number, alpha: number): void {
    const i = this.$selEnd;
    let cx = 2, cy = 2, ch = this.$fontMetrics(this.$default).reduce((s, v) => s + v, 0);
    for (const l of lines) {
      if (i >= l.start && i <= l.end) {
        const g = l.glyphs.find((gg) => gg.index === i);
        cx = l.x + (g ? g.x : l.glyphs.reduce((s, gg) => s + gg.adv, 0));
        cy = l.y; ch = l.ascent + l.descent;
      }
    }
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.fillStyle = cssColor(this.$default.color, alpha);
    ctx.fillRect(cx - this.$scrollH, cy - scrollTop, 1, ch);
  }
}
flashClass(TextField, "flash.text.TextField");

// ------------------------------------------------------------ keyboard input bridge
/**
 * Typing goes through a hidden native <textarea> so IME, clipboard, dead keys
 * and mobile keyboards work; the TextField mirrors its value and selection.
 */
/** Test switch: __player.textCache.off = true draws every text field directly, as before. */
export const textCache = { off: false };

export const inputBridge = {
  focused: null as TextField | null,
  ownBlur: false,
  el: null as HTMLTextAreaElement | null,
  blinkStart: 0,
  caretVisible(): boolean { return Math.floor((performance.now() - this.blinkStart) / 500) % 2 === 0; },
  install(host: HTMLElement): void {
    const el = document.createElement("textarea");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocapitalize", "off");
    el.spellcheck = false;
    // 16px: iOS zooms the page into any input with a smaller font when it gets focus
    // user-select: text: the page disables text selection (long-press on phones), and on iOS an input
    // that inherits user-select: none loses focus again at once, closing the keyboard it just opened
    Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: "1px", height: "1px", opacity: "0", border: "0", padding: "0", resize: "none", pointerEvents: "none", fontSize: "16px", userSelect: "text", webkitUserSelect: "text" });
    host.appendChild(el);
    this.el = el;
    el.addEventListener("input", () => this.fromNative());
    // Focus lost without the game asking (iOS keyboard "Done", tapping outside the page): the game's text
    // field loses focus too. Not when the whole page is left (app switch), where Flash keeps focus.
    el.addEventListener("blur", () => {
      if (this.ownBlur || !this.focused) return;
      setTimeout(() => { if (document.hasFocus() && document.activeElement !== el && this.focused) runtimeHooks.inputBlurred(); }, 0);
    });
    el.addEventListener("select", () => this.fromNative(true));
    el.addEventListener("keydown", (e) => {
      const tf = this.focused;
      if (!tf) return;
      if (e.key === "Enter" && !tf.$multiline) e.preventDefault();
      if (e.key === "Tab") e.preventDefault();
      requestAnimationFrame(() => this.fromNative(true));
    });
  },
  focus(tf: TextField | null): void {
    this.focused = tf;
    this.blinkStart = performance.now();
    if (!this.el) return;
    if (tf && tf.$type === "input") {
      this.el.value = tf.$text.replace(/\r/g, "\n");
      this.el.maxLength = tf.$maxChars > 0 ? tf.$maxChars : 524288;
      this.el.focus({ preventScroll: true });
      this.syncSelection(tf);
    } else {
      this.ownBlur = true;
      try { this.el.blur(); } finally { this.ownBlur = false; }
    }
  },
  /** Takes focus back if it slipped (called on finger-up, still inside the user's tap). */
  keepFocus(): void {
    if (this.el && this.focused && this.focused.$type === "input" && document.activeElement !== this.el) this.el.focus({ preventScroll: true });
  },
  syncText(tf: TextField): void {
    if (this.focused !== tf || !this.el || tf.$type !== "input") return;
    const v = tf.$text.replace(/\r/g, "\n");
    if (this.el.value === v) return;
    this.el.value = v;
    this.el.setSelectionRange(tf.$selBegin, tf.$selEnd);
  },
  syncSelection(tf: TextField): void {
    if (this.focused === tf && this.el) this.el.setSelectionRange(tf.$selBegin, tf.$selEnd);
  },
  fromNative(selectionOnly = false): void {
    const tf = this.focused, el = this.el;
    if (!tf || !el || tf.$type !== "input") return;
    let v = el.value.replace(/\r\n|\n/g, tf.$multiline ? "\r" : "");
    if (!selectionOnly && v !== tf.$text) {
      if (tf.$restrict !== null) v = applyRestrict(v, tf.$restrict, tf.$text);
      const inserted = v.length > tf.$text.length ? v.slice(tf.$selBegin, tf.$selBegin + v.length - tf.$text.length) : "";
      if (inserted) tf.dispatchEvent(new TextEvent(TextEvent.TEXT_INPUT, true, true, inserted));
      const fmt = tf.$runs[0]?.fmt ?? tf.$default;
      tf.$runs = v ? [{ text: v, fmt }] : [];
      tf.$text = v;
      tf.$layout = null;
      tf.$doAutoSize();
      if (el.value.replace(/\n/g, "\r") !== v) el.value = v.replace(/\r/g, "\n");
      tf.dispatchEvent(new Event(Event.CHANGE, true));
    }
    tf.$selBegin = el.selectionStart ?? 0;
    tf.$selEnd = el.selectionEnd ?? 0;
    this.blinkStart = performance.now();
  },
};
void FocusEvent; void KeyboardEvent;

function applyRestrict(v: string, restrict: string, _old: string): string {
  if (restrict === "") return "";
  let allowNeg = false;
  const allowed: string[] = [], denied: string[] = [];
  let i = 0;
  while (i < restrict.length) {
    let c = restrict[i];
    if (c === "^") { allowNeg = !allowNeg; i++; continue; }
    if (c === "\\") { i++; c = restrict[i]; }
    let range = c;
    if (restrict[i + 1] === "-" && i + 2 < restrict.length) { range = `${c}-${restrict[i + 2]}`; i += 2; }
    (allowNeg ? denied : allowed).push(range);
    i++;
  }
  const inSet = (ch: string, set: string[]) => set.some((r) => (r.length === 3 && r[1] === "-" ? ch >= r[0] && ch <= r[2] : ch === r));
  return [...v].filter((ch) => (allowed.length ? inSet(ch, allowed) : true) && !inSet(ch, denied)).join("");
}

// ------------------------------------------------------------ static text (library DefineText)
/** flash.text.StaticText: glyph runs placed in the library, drawn with the exact fonts they reference. */
export class StaticText extends DisplayObject {
  declare $def: any;
  $alloc(): void { super.$alloc(); this.$def = null; }
  get text(): string {
    if (!this.$def) return "";
    return this.$def.runs.map((r: any) => { const f = fontById(r.f); return r.g.map(([gi]: number[]) => String.fromCharCode(f?.order[gi] ?? 32)).join(""); }).join("");
  }
  $selfBounds(): Rectangle | null {
    const b = this.$def?.b;
    return b ? new Rectangle(b[0], b[1], b[2] - b[0], b[3] - b[1]) : null;
  }
  $hitSelf(lx: number, ly: number): boolean { return !!this.$selfBounds()?.contains(lx, ly); }
  $drawSelf(ctx: CanvasRenderingContext2D, pm: M6, alpha: number): void {
    const d = this.$def;
    if (!d) return;
    const t = d.m;
    const m: M6 = [t[0] * pm[0] + t[1] * pm[2], t[0] * pm[1] + t[1] * pm[3], t[2] * pm[0] + t[3] * pm[2], t[2] * pm[1] + t[3] * pm[3], t[4] * pm[0] + t[5] * pm[2] + pm[4], t[4] * pm[1] + t[5] * pm[3] + pm[5]];
    for (const r of d.runs) {
      const font = fontById(r.f);
      if (!font) continue;
      ctx.fillStyle = cssColor(r.c, r.a * alpha);
      const s = r.h / EM;
      let x = r.x;
      for (const [gi, adv] of r.g) {
        const glyph = font.glyphs.get(font.order[gi]);
        if (glyph && glyph.path) {
          if (!glyph.p2d) glyph.p2d = new Path2D(glyph.path);
          ctx.setTransform(m[0] * s, m[1] * s, m[2] * s, m[3] * s, m[0] * x + m[2] * r.y + m[4], m[1] * x + m[3] * r.y + m[5]);
          ctx.fill(glyph.p2d, "nonzero");
        }
        x += adv;
      }
    }
  }
}
flashClass(StaticText, "flash.text.StaticText");

// ------------------------------------------------------------ small classes
export class TextLineMetrics extends ASObject {
  declare x: number; declare width: number; declare height: number; declare ascent: number; declare descent: number; declare leading: number;
  $ctor(x = 0, width = 0, height = 0, ascent = 0, descent = 0, leading = 0): void {
    super.$ctor();
    this.x = x; this.width = width; this.height = height; this.ascent = ascent; this.descent = descent; this.leading = leading;
  }
}
flashClass(TextLineMetrics, "flash.text.TextLineMetrics");

export class Font extends ASObject {
  declare $name: string; declare $style: string; declare $type: string;
  $ctor(): void { super.$ctor(); }
  get fontName(): string { return this.$name; }
  get fontStyle(): string { return this.$style; }
  get fontType(): string { return this.$type; }
  hasGlyphs(s: string): boolean {
    const f = resolveEmbedded(this.$name, this.$style.startsWith("bold"), this.$style.includes("talic"));
    return !!f && [...s].every((c) => f.glyphs.has(c.charCodeAt(0)));
  }
  static enumerateFonts(enumerateDeviceFonts: boolean = false): Font[] {
    const out: Font[] = [];
    for (const e of embedded) {
      const f = new Font();
      f.$name = e.name; f.$type = "embedded";
      f.$style = e.bold && e.italic ? "boldItalic" : e.bold ? "bold" : e.italic ? "italic" : "regular";
      out.push(f);
    }
    if (enumerateDeviceFonts) unimplemented("Font.enumerateFonts(true)");
    return out;
  }
  static registerFont(_font: any): void {}
}
flashClass(Font, "flash.text.Font");

export class StyleSheet extends ASObject {
  declare $styles: Record<string, any>;
  $ctor(): void { super.$ctor(); this.$styles = {}; }
  setStyle(name: string, style: any): void { this.$styles[name.toLowerCase()] = style; }
  getStyle(name: string): any { return this.$styles[name.toLowerCase()] ?? {}; }
  get styleNames(): string[] { return Object.keys(this.$styles); }
  parseCSS(_css: string): void { unimplemented("StyleSheet.parseCSS"); }
  clear(): void { this.$styles = {}; }
}
flashClass(StyleSheet, "flash.text.StyleSheet");

function constantsClass(qname: string): any {
  const C = class {};
  flashClass(C, qname);
  return C;
}
export const TextFieldAutoSize: any = constantsClass("flash.text.TextFieldAutoSize");
export const TextFieldType: any = constantsClass("flash.text.TextFieldType");
export const TextFormatAlign: any = constantsClass("flash.text.TextFormatAlign");
export const AntiAliasType: any = constantsClass("flash.text.AntiAliasType");
export const GridFitType: any = constantsClass("flash.text.GridFitType");
export const FontStyle: any = constantsClass("flash.text.FontStyle");
export const FontType: any = constantsClass("flash.text.FontType");
export const TextFormatDisplay: any = constantsClass("flash.text.TextFormatDisplay");
