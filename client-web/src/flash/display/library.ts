/**
 * The SWF library at runtime: characters converted by tools/swf-assets
 * (library.json + bitmaps), instantiated for [Embed(symbol=...)] classes and
 * timeline placements, with MovieClip timelines replayed like Flash Player.
 */
import { registeredClasses } from "as3";
import {
  DisplayObject, DisplayObjectContainer, Sprite, MovieClip, Shape, Bitmap, SimpleButton, FrameLabel,
  player, shapeHooks, mul, trackStage, type M6,
} from "./core";
import { BitmapData, libraryImages } from "./BitmapData";
import { ColorTransform, Rectangle } from "../geom";
import { Event } from "../events";
import { TextField, StaticText, fontById } from "../text";
import { DropShadowFilter, GlowFilter, BlurFilter, BevelFilter, ColorMatrixFilter, ConvolutionFilter } from "../filters";
import { cssColor, unimplemented, context2d } from "../_internal";

type Def = any;
let chars: Record<number, Def> = {};
const symbolIds = new Map<string, number>();
const symbolOfId = new Map<number, string>();
let classOfSymbol: Map<string, any> | null = null;

/** Loads library.json and its bitmaps. Must finish before game code runs. */
export async function loadLibrary(base: string, versioned: (url: string) => string = (u) => u): Promise<void> {
  const lib = await (await fetch(versioned(`${base}swf/library.json`))).json();
  chars = lib.chars;
  for (const [name, id] of Object.entries(lib.symbols as Record<string, number>)) { symbolIds.set(name, id); symbolOfId.set(id, name); }
  const load = async (file: string) => createImageBitmap(await fetchStalled(versioned(`${base}swf/${file}`)));
  const watchdog = setInterval(abortIfStalled, 5000);
  try {
    await loadBitmaps(load);
  } finally {
    clearInterval(watchdog);
  }
  player.populateSymbol = populateSymbol;
}

/**
 * The library's ~350 bitmaps load at once. Now and then one of them never answers (seen after a reload that
 * cut off the page before it: the new page's request hangs on a connection the old one left), and the
 * game then never starts: a blank page. So when none has finished for STALL_MS, the ones still waiting are
 * cancelled and asked for again (a few times each). It goes by progress, not by each file's time, so a
 * slow connection that is still getting files is left alone.
 */
const STALL_MS = 20000;
const pending = new Set<AbortController>();
let lastProgress = 0;

function abortIfStalled(): void {
  if (pending.size && Date.now() - lastProgress > STALL_MS) {
    lastProgress = Date.now();
    for (const c of pending) c.abort();
  }
}

async function fetchStalled(url: string): Promise<Blob> {
  for (let tries = 1; ; tries++) {
    const c = new AbortController();
    pending.add(c);
    if (pending.size === 1) lastProgress = Date.now();
    try {
      const res = await fetch(url, { signal: c.signal });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const blob = await res.blob();
      lastProgress = Date.now();
      return blob;
    } catch (e) {
      if (tries >= 5) throw e;
      if (!c.signal.aborted) await new Promise((r) => setTimeout(r, 1000 * tries));
    } finally {
      pending.delete(c);
    }
  }
}

async function loadBitmaps(load: (file: string) => Promise<ImageBitmap>): Promise<void> {
  await Promise.all(Object.entries(chars).filter(([, d]) => d.type === "bitmap").map(async ([id, d]) => {
    const img = await load(d.file);
    if (!d.alpha) { libraryImages.set(+id, img); return; }
    // DefineBitsJPEG3: colour from the JPEG, alpha from a separate plane (colour is premultiplied)
    const a = await load(d.alpha);
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = context2d(c);
    ctx.drawImage(a, 0, 0);
    const alpha = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height);
    const d8 = px.data;
    for (let i = 0; i < d8.length; i += 4) {
      const al = alpha[i];
      if (al > 0 && al < 255) {
        d8[i] = Math.min(255, (d8[i] * 255) / al);
        d8[i + 1] = Math.min(255, (d8[i + 1] * 255) / al);
        d8[i + 2] = Math.min(255, (d8[i + 2] * 255) / al);
      }
      d8[i + 3] = al;
    }
    ctx.putImageData(px, 0, 0);
    libraryImages.set(+id, c);
  }));
}

/** Game classes bound to library symbols with [Embed(source=..., symbol=...)]. */
function boundClass(symbol: string): any {
  if (!classOfSymbol) {
    classOfSymbol = new Map();
    for (const cls of registeredClasses()) {
      if (typeof cls === "function" && Object.prototype.hasOwnProperty.call(cls, "$embed") && cls.$embed?.symbol) classOfSymbol.set(cls.$embed.symbol, cls);
    }
  }
  return classOfSymbol.get(symbol);
}

function populateSymbol(obj: DisplayObject, embed: any): void {
  if (!embed.symbol) return;
  const id = symbolIds.get(embed.symbol);
  const def = id === undefined ? undefined : chars[id];
  if (!def) { unimplemented(`library symbol ${embed.symbol}`); return; }
  populate(obj, id!, def);
}

function populate(obj: DisplayObject, id: number, def: Def): void {
  if (def.grid) obj.$scale9 = new Rectangle(def.grid[0], def.grid[1], def.grid[2], def.grid[3]);
  if (def.type === "sprite" && obj instanceof DisplayObjectContainer) {
    const tl = timelineFor(id, def);
    if (obj instanceof MovieClip) { obj.$timeline = tl; obj.$frame = 1; }
    tl.gotoFrame(obj, 1, true);
  } else if (def.type === "button" && obj instanceof SimpleButton) {
    buildButton(obj, def);
  } else if (def.type === "shape" && obj instanceof Shape) {
    obj.$shapeDef = def;
  }
}

/**
 * Creates the display object for a character placed on a timeline. `attach`
 * runs after allocation but before the AS3 constructor (the object already has
 * its parent, name and transform when its constructor runs, as in Flash).
 */
export function createCharacter(id: number, attach?: (o: DisplayObject) => void): DisplayObject | null {
  const def = chars[id];
  if (!def) return null;
  const symbol = symbolOfId.get(id);
  const cls = symbol ? boundClass(symbol) : null;
  if (cls) {
    player.pendingChild = attach ?? null;
    try { return new cls(); } finally { player.pendingChild = null; }
  }
  const o = createPlain(id, def);
  if (o && attach) attach(o);
  return o;
}

function createPlain(id: number, def: Def): DisplayObject | null {
  switch (def.type) {
    case "shape": { const s = new Shape(); s.$shapeDef = def; return s; }
    case "sprite": { const mc = new MovieClip(); populate(mc, id, def); return mc; }
    case "text": return makeTextField(def);
    case "stext": { const t = new StaticText(); t.$def = def; return t; }
    case "button": { const b = new SimpleButton(); buildButton(b, def); return b; }
    case "bitmap": { const img = libraryImages.get(id); return new Bitmap(img ? BitmapData.$fromImage(img as any) : null); }
  }
  return null;
}

const ALIGN = ["left", "right", "center", "justify"];
function makeTextField(def: Def): TextField {
  const tf = new TextField();
  tf.$bx = def.b[0]; tf.$by = def.b[1];
  tf.$w = def.b[2] - def.b[0]; tf.$h = def.b[3] - def.b[1];
  tf.$wordWrap = !!def.wrap;
  tf.$multiline = !!def.multi;
  tf.$password = !!def.pass;
  tf.$type = def.ro ? "dynamic" : "input";
  tf.$selectable = !def.nosel;
  if (def.border) { tf.$border = true; tf.$background = true; tf.$backgroundColor = 0xffffff; tf.$borderColor = 0; }
  tf.$embedFonts = !!def.outlines;
  if (def.aa) tf.$antiAliasType = def.aa;
  if (def.max) tf.$maxChars = def.max;
  const font = def.font !== undefined ? fontById(def.font) : null;
  const fmt: any = {
    font: font?.name ?? def.fontClass ?? "Times New Roman",
    size: def.size ?? 12,
    color: def.color ?? 0,
    bold: font?.bold ?? false,
    italic: font?.italic ?? false,
  };
  if (def.align !== undefined) {
    Object.assign(fmt, { align: ALIGN[def.align] ?? "left", leftMargin: def.lm, rightMargin: def.rm, indent: def.indent, leading: def.leading });
  }
  tf.$setDefault(fmt, def.font);
  if (def.auto) tf.$autoSize = "left";
  const text = def.text ?? "";
  if (def.html) tf.htmlText = text; else tf.text = text;
  return tf;
}

function buildButton(b: SimpleButton, def: Def): void {
  const state = (bit: number): Sprite | null => {
    const recs = def.recs.filter((r: any) => r.s & bit);
    if (!recs.length) return null;
    const sp = new Sprite();
    for (const r of recs.sort((x: any, y: any) => x.d - y.d)) {
      const c = createCharacter(r.id);
      if (!c) continue;
      c.$depth = r.d;
      applyPlacement(c, r);
      sp.$children.push(c);
      c.$parent = sp;
    }
    return sp;
  };
  b.$up = state(1); b.$over = state(2); b.$down = state(4); b.$hit = state(8);
  b.$trackAsMenu = !!def.menu;
}

const BLEND = ["normal", "normal", "layer", "multiply", "screen", "lighten", "darken", "difference", "add", "subtract", "invert", "alpha", "erase", "overlay", "hardlight"];
function makeFilter(f: any): any {
  switch (f.k) {
    case "shadow": return new DropShadowFilter(f.dist, f.angle, f.c, f.a, f.bx, f.by, f.str, f.q, f.inner, f.knockout, f.hide);
    case "glow": return new GlowFilter(f.c, f.a, f.bx, f.by, f.str, f.q, f.inner, f.knockout);
    case "blur": return new BlurFilter(f.bx, f.by, f.q);
    case "bevel": return new BevelFilter(f.dist, f.angle, f.hc, f.ha, f.sc, f.sa, f.bx, f.by, f.str, f.q, f.inner ? "inner" : f.onTop ? "full" : "outer", f.knockout);
    case "colorMatrix": return new ColorMatrixFilter(f.m);
    case "convolution": return new ConvolutionFilter(f.mx, f.my, f.m, f.div, f.bias, f.preserveAlpha, f.clamp, f.c, f.a);
    case "gradientGlow": case "gradientBevel": {
      const [c, a] = f.cols[f.cols.length - 1] ?? [0, 1];
      return new GlowFilter(c, a, f.bx, f.by, f.str, f.q, f.inner, f.knockout);
    }
  }
  return null;
}

/** Applies a timeline placement's properties (transform unless code has taken it over). */
function applyPlacement(c: DisplayObject, st: any): void {
  if (st.m && !c.$scripted) { const m = st.m; c.$setMatrix(m[0], m[1], m[2], m[3], m[4], m[5]); }
  if (st.cx && !c.$scripted) {
    const x = st.cx;
    c.$alpha = x[3];
    const ct = new ColorTransform(x[0], x[1], x[2], 1, x[4], x[5], x[6], x[7]);
    c.$colorTransform = ct.$isAlphaOnly ? null : ct;
  }
  if (st.f) c.$filters = st.f.map(makeFilter).filter(Boolean);
  if (st.bm !== undefined) c.$blendMode = BLEND[st.bm] ?? "normal";
  if (st.v !== undefined) c.$visible = !!st.v;
  if (st.cd) c.$clipDepth = st.cd;
}

// ------------------------------------------------------------ timelines
interface DepthState { id: number; key: number; m?: M6; cx?: number[]; nm?: string; cd?: number; f?: any[]; bm?: number; v?: number; r?: number; }

export class Timeline {
  readonly totalFrames: number;
  readonly labels: FrameLabel[];
  private states: (Map<number, DepthState> | undefined)[] = [];
  constructor(readonly id: number, private def: Def) {
    this.totalFrames = def.n;
    this.labels = def.labels.map(([n, f]: [string, number]) => new FrameLabel(n, f));
  }
  /** Display list of a frame (1-based), from replaying the placement ops. */
  state(frame: number): Map<number, DepthState> {
    const cached = this.states[frame];
    if (cached) return cached;
    const prev = frame > 1 ? this.state(frame - 1) : new Map<number, DepthState>();
    const s = new Map(prev);
    const ops: any[] = this.def.frames[frame - 1] ?? [];
    ops.forEach((op, i) => {
      if (op.rm !== undefined) { s.delete(op.rm); return; }
      const old = s.get(op.d);
      const key = frame * 100000 + i;
      if (op.id !== undefined && (!op.mv || !old)) s.set(op.d, { id: op.id, key, m: op.m, cx: op.cx, nm: op.nm, cd: op.cd, f: op.f, bm: op.bm, v: op.v, r: op.r });
      // "move" naming a new character: the object stays (same key); shapes swap their graphics
      // in place, as in Flash (Ruffle: replace_with). A new key here recreated the object instead.
      else if (op.id !== undefined) s.set(op.d, { ...old!, id: op.id, ...defined(op) });
      else if (old) s.set(op.d, { ...old, ...defined(op) });
    });
    this.states[frame] = s;
    return s;
  }
  /** Moves `mc` to `frame`: keeps objects whose placement survives, removes and creates the rest. */
  gotoFrame(mc: DisplayObjectContainer, frame: number, initial = false): void {
    const want = this.state(frame);
    const kids = mc.$children;
    for (const c of kids.slice()) {
      if (c.$depth === undefined) continue;
      const w = want.get(c.$depth);
      if (w && w.key === c.$placeKey) continue;
      if (initial) { const i = kids.indexOf(c); if (i >= 0) kids.splice(i, 1); c.$parent = null; }
      else if (c.$parent === mc) mc.$detach(c);
      if (c.$name && (mc as any)[c.$name] === c) (mc as any)[c.$name] = null;
    }
    for (const d of [...want.keys()].sort((a, b) => a - b)) {
      const w = want.get(d)!;
      const existing = kids.find((k) => k.$depth === d && k.$placeKey === w.key);
      if (existing) {
        if ((existing as any).$charId !== w.id) swapCharacter(existing, w.id);
        applyPlacement(existing, w);
        continue;
      }
      const c = createCharacter(w.id, (o) => {
        o.$depth = d;
        o.$placeKey = w.key;
        (o as any).$charId = w.id;
        if (w.nm) o.$name = w.nm;
        applyPlacement(o, w);
        let idx = kids.findIndex((k) => k.$depth !== undefined && k.$depth > d);
        if (idx < 0) { idx = 0; for (let i = kids.length - 1; i >= 0; i--) if (kids[i].$depth !== undefined) { idx = i + 1; break; } }
        kids.splice(idx, 0, o);
        o.$parent = mc;
        if (w.nm) (mc as any)[w.nm] = o;
      });
      if (!c || initial) continue;
      c.dispatchEvent(new Event(Event.ADDED, true));
      if (mc.stage) dispatchStageEvents(c, Event.ADDED_TO_STAGE);
    }
  }
}
/** A timeline "move" that names another character: shapes take the new graphics, other objects keep theirs. */
function swapCharacter(o: DisplayObject, id: number): void {
  (o as any).$charId = id;
  const def = chars[id];
  if (o instanceof Shape && def?.type === "shape") {
    o.$shapeDef = def;
    (o as any).$renderVersion = ((o as any).$renderVersion ?? 0) + 1;
  }
}
function dispatchStageEvents(o: DisplayObject, type: string): void {
  trackStage(o, type === Event.ADDED_TO_STAGE);
  o.dispatchEvent(new Event(type));
  if (o instanceof DisplayObjectContainer) for (const c of o.$children.slice()) dispatchStageEvents(c, type);
}
function defined(op: any): any {
  const o: any = {};
  for (const k of ["m", "cx", "nm", "cd", "f", "bm", "v", "r"]) if (op[k] !== undefined) o[k] = op[k];
  return o;
}
const timelines = new Map<number, Timeline>();
function timelineFor(id: number, def: Def): Timeline {
  let t = timelines.get(id);
  if (!t) timelines.set(id, (t = new Timeline(id, def)));
  return t;
}

// ------------------------------------------------------------ library shapes
interface ShapeCache { fills: Path2D[]; lines: Path2D[]; }
const shapeCache = new WeakMap<object, ShapeCache>();
function paths(def: Def): ShapeCache {
  let c = shapeCache.get(def);
  if (!c) shapeCache.set(def, (c = { fills: def.fills.map((f: any) => new Path2D(f.d)), lines: def.lines.map((l: any) => new Path2D(l.d)) }));
  return c;
}

function fillStyleFor(ctx: CanvasRenderingContext2D, f: any, alpha: number): string | CanvasGradient | CanvasPattern | null {
  if (f.t === "s") return cssColor(f.c, f.a * alpha);
  if (f.t === "b") {
    const img = libraryImages.get(f.id);
    return img ? ctx.createPattern(img as any, f.repeat ? "repeat" : "no-repeat") : null;
  }
  const g = f.t === "l" ? ctx.createLinearGradient(-819.2, 0, 819.2, 0) : ctx.createRadialGradient((f.focal ?? 0) * 819.2, 0, 0, 0, 0, 819.2);
  for (const [ratio, c, a] of f.stops) g.addColorStop(Math.min(1, Math.max(0, ratio / 255)), cssColor(c, a * alpha));
  return g;
}

function drawFill(ctx: CanvasRenderingContext2D, f: any, path: Path2D, alpha: number, rule: CanvasFillRule): void {
  const style = fillStyleFor(ctx, f, alpha);
  if (!style) return;
  if (f.t === "s") { ctx.fillStyle = style; ctx.fill(path, rule); return; }
  ctx.save();
  ctx.clip(path, rule);
  const m = f.m;
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  if (f.t === "b") { ctx.imageSmoothingEnabled = f.smooth; ctx.globalAlpha = alpha; }
  ctx.fillStyle = style;
  ctx.fillRect(-1e5, -1e5, 2e5, 2e5);
  ctx.restore();
}

/**
 * A shape of several style layers (the converter's `L` on each fill and stroke): the layers in order, each its
 * fills then its strokes, as Flash draws them, so a later layer's fills cover an earlier layer's strokes. Without
 * layers: all fills, then all strokes.
 */
const layerOrder = new WeakMap<object, [number, number][]>();
function layersOf(def: Def): [number, number][] | null {
  if (!def.fills.some((f: any) => f.L !== undefined) && !def.lines.some((l: any) => l.L !== undefined)) return null;
  let o = layerOrder.get(def);
  if (!o) {
    o = [];
    const ls = [...new Set<number>([...def.fills.map((f: any) => f.L ?? 0), ...def.lines.map((l: any) => l.L ?? 0)])].sort((a, b) => a - b);
    for (const L of ls) {
      def.fills.forEach((f: any, i: number) => { if ((f.L ?? 0) === L) o!.push([0, i]); });
      def.lines.forEach((l: any, i: number) => { if ((l.L ?? 0) === L) o!.push([1, i]); });
    }
    layerOrder.set(def, o);
  }
  return o;
}

function drawShape(ctx: CanvasRenderingContext2D, def: Def, m: M6, alpha: number, p: ShapeCache = paths(def)): void {
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  const rule: CanvasFillRule = def.nonzero ? "nonzero" : "evenodd";
  const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
  const stroke = (i: number) => {
    const s = def.lines[i].s;
    ctx.lineWidth = s.w === 0 || s.scale === "none" ? Math.max(s.w, 1) / scale : Math.max(s.w, 1 / scale);
    ctx.lineCap = s.cap === "none" ? "butt" : s.cap;
    ctx.lineJoin = s.join;
    ctx.miterLimit = s.miter;
    ctx.strokeStyle = s.fill ? (fillStyleFor(ctx, s.fill, alpha) ?? cssColor(s.c, s.a * alpha)) : cssColor(s.c, s.a * alpha);
    ctx.stroke(p.lines[i]);
  };
  const order = layersOf(def);
  if (order) {
    for (const [k, i] of order) {
      if (k === 0) drawFill(ctx, def.fills[i].s, p.fills[i], alpha, rule);
      else stroke(i);
    }
    return;
  }
  def.fills.forEach((f: any, i: number) => drawFill(ctx, f.s, p.fills[i], alpha, rule));
  for (let i = 0; i < def.lines.length; i++) stroke(i);
}

let hitCtx: CanvasRenderingContext2D | null = null;
shapeHooks.draw = (ctx, def, m, alpha) => drawShape(ctx, def, m, alpha);
shapeHooks.bounds = (def, strokes) => {
  const b = strokes || !def.eb ? def.b : def.eb;
  return new Rectangle(b[0], b[1], b[2] - b[0], b[3] - b[1]);
};
shapeHooks.hit = (def, x, y) => {
  hitCtx ??= context2d(document.createElement("canvas"));
  const p = paths(def);
  const rule: CanvasFillRule = def.nonzero ? "nonzero" : "evenodd";
  if (p.fills.some((f) => hitCtx!.isPointInPath(f, x, y, rule))) return true;
  return p.lines.some((l, i) => { hitCtx!.lineWidth = Math.max(1, def.lines[i].s.w); return hitCtx!.isPointInStroke(l, x, y); });
};
shapeHooks.clipPaths = (def) => paths(def).fills;

// ------------------------------------------------------------ 9-slice scaling
/**
 * Renders a scale9Grid container: its shapes are cut into nine regions, the
 * corners keep their size and the edges/centre stretch, as Flash does.
 */
shapeHooks.drawScale9 = (ctx, o, m, alpha) => {
  const grid = o.$scale9!;
  const bounds = o.$boundsIn([1, 0, 0, 1, 0, 0], false);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
  const [a, b, c, d] = o.$matrix();
  const sx = Math.sqrt(a * a + b * b), sy = Math.sqrt(c * c + d * d);
  const map1 = (v: number, lo: number, hi: number, b0: number, b1: number, s: number) => {
    const target = (b1 - b0) * s;
    const fixed = (lo - b0) + (b1 - hi);
    const mid = Math.max(0, target - fixed);
    const k = hi > lo ? mid / (hi - lo) : 0;
    const base = b0 * s;
    if (fixed > target) { const f = target / fixed; return v < lo ? base + (v - b0) * f : base + (lo - b0) * f + Math.max(0, v - hi) * f; }
    if (v < lo) return base + (v - b0);
    if (v <= hi) return base + (lo - b0) + (v - lo) * k;
    return base + (lo - b0) + mid + (v - hi);
  };
  const mapX = (x: number) => map1(x, grid.x, grid.right, bounds.x, bounds.right, sx);
  const mapY = (y: number) => map1(y, grid.y, grid.bottom, bounds.y, bounds.bottom, sy);
  // the object's transform without its scale
  const base = mul(m, 1 / (sx || 1), 0, 0, 1 / (sy || 1), 0, 0);
  const drawChild = (ch: DisplayObject) => {
    if (!ch.$visible) return;
    const cm = ch.$matrix();
    if (ch instanceof Shape && ch.$shapeDef) {
      const def = ch.$shapeDef;
      const tx = (x: number, y: number): [number, number] => [mapX(cm[0] * x + cm[2] * y + cm[4]), mapY(cm[1] * x + cm[3] * y + cm[5])];
      const p: ShapeCache = { fills: def.fills.map((f: any) => transformPath(f.d, tx)), lines: def.lines.map((l: any) => transformPath(l.d, tx)) };
      drawShape(ctx, def, base, alpha * ch.$alpha, p);
    } else {
      // As in Flash, only the container's own shapes are 9-sliced; child objects (text fields, clips,
      // bitmaps) are scaled normally with it. (Device-font text in a widened field stays unstretched
      // and is laid out across the scaled width, see TextField.$drawSelf.)
      shapeHooks.renderChild(ctx, ch, m, alpha);
    }
  };
  if (o instanceof DisplayObjectContainer) for (const ch of o.$children) drawChild(ch);
  return true;
};

function transformPath(d: string, tx: (x: number, y: number) => [number, number]): Path2D {
  const nums = d.match(/[MLQ]|-?[\d.]+(?:e-?\d+)?/g) ?? [];
  let out = "";
  for (let i = 0; i < nums.length;) {
    const cmd = nums[i++];
    const n = cmd === "Q" ? 2 : 1;
    out += cmd;
    for (let k = 0; k < n; k++) {
      const [x, y] = tx(Number(nums[i++]), Number(nums[i++]));
      out += `${x} ${y} `;
    }
  }
  return new Path2D(out);
}
