/**
 * The display list. One module because the classes are mutually dependent
 * (containers, stage, loader, rendering and hit testing all walk each other).
 */
import { iface, implement } from "as3";
import { EventDispatcher, Event, IOErrorEvent, ProgressEvent, HTTPStatusEvent, UncaughtErrorEvents, dispatchHooks, anyCaptureListeners } from "../events";
import { Point, Rectangle, Matrix, ColorTransform } from "../geom";
import { Graphics } from "./Graphics";
import { BitmapData, drawHooks, IBitmapDrawable } from "./BitmapData";
import { flashClass, argumentError, rangeError, nullParam, toTwips, unimplemented, context2d } from "../_internal";
import { filterSettings } from "../filters";

export type M6 = [number, number, number, number, number, number];
const IDENT: M6 = [1, 0, 0, 1, 0, 0];
export function mul(p: M6, a: number, b: number, c: number, d: number, tx: number, ty: number): M6 {
  return [a * p[0] + b * p[2], a * p[1] + b * p[3], c * p[0] + d * p[2], c * p[1] + d * p[3], tx * p[0] + ty * p[2] + p[4], tx * p[1] + ty * p[3] + p[5]];
}
function invert(m: M6): M6 {
  const [a, b, c, d, tx, ty] = m;
  const det = a * d - b * c;
  if (!det) return [0, 0, 0, 0, -tx, -ty];
  return [d / det, -b / det, -c / det, a / det, (c * ty - d * tx) / det, (b * tx - a * ty) / det];
}
function apply(m: M6, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
function boundsOf(r: Rectangle, m: M6): Rectangle {
  const pts = [apply(m, r.x, r.y), apply(m, r.right, r.y), apply(m, r.x, r.bottom), apply(m, r.right, r.bottom)];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return new Rectangle(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0);
}
function unionInto(acc: Rectangle | null, r: Rectangle | null): Rectangle | null {
  if (!r) return acc;
  if (!acc) return r.clone();
  const x = Math.min(acc.x, r.x), y = Math.min(acc.y, r.y);
  acc.width = Math.max(acc.right, r.right) - x; acc.height = Math.max(acc.bottom, r.bottom) - y;
  acc.x = x; acc.y = y;
  return acc;
}

const BROADCAST = new Set(["enterFrame", "exitFrame", "frameConstructed", "render", "activate", "deactivate"]);
/** Objects with broadcast listeners, per event type, in registration order. */
export const broadcastLists = new Map<string, Set<DisplayObject>>();
dispatchHooks.isBroadcast = (d, type) => BROADCAST.has(type) && d instanceof DisplayObject;
dispatchHooks.broadcastAdded = (d, type) => {
  let s = broadcastLists.get(type);
  if (!s) broadcastLists.set(type, (s = new Set()));
  s.add(d as DisplayObject);
};
dispatchHooks.broadcastRemoved = (d, type) => { broadcastLists.get(type)?.delete(d as DisplayObject); };
dispatchHooks.path = (d) => {
  const out: EventDispatcher[] = [];
  if (d instanceof DisplayObject) for (let p = d.$parent; p; p = p.$parent) out.push(p);
  return out;
};

/** Rendering of library content, installed by display/library.ts. */
export const shapeHooks = {
  draw: (_ctx: CanvasRenderingContext2D, _def: any, _m: M6, _alpha: number): void => {},
  bounds: (_def: any, _strokes: boolean): Rectangle => new Rectangle(),
  hit: (_def: any, _x: number, _y: number): boolean => false,
  clipPaths: (_def: any): Path2D[] => [],
  /** returns false when the object cannot be drawn with 9-slice scaling */
  drawScale9: (_ctx: CanvasRenderingContext2D, _o: DisplayObject, _m: M6, _alpha: number): boolean => false,
  renderChild: (ctx: CanvasRenderingContext2D, o: DisplayObject, m: M6, alpha: number): void => renderObject(ctx, o, m, alpha),
};

/** Player services the display list needs (set by the Player). */
export const player = {
  stage: null as Stage | null,
  mainLoaderInfo: null as LoaderInfo | null,
  mouseX: 0,
  mouseY: 0,
  dpr: 1,
  /** set while the document class is constructed: it is on the stage before its constructor runs */
  pendingRoot: null as null | { stage: Stage; loaderInfo: LoaderInfo },
  /**
   * set while a timeline child is constructed: Flash attaches timeline objects
   * to their parent (with name and transform) before their constructor runs
   */
  pendingChild: null as null | ((o: DisplayObject) => void),
  /** runs symbol population for [Embed] classes; installed by the asset library */
  populateSymbol: (_obj: DisplayObject, _embed: any): void => {},
  /** schedules async work to run inside the frame loop (Loader completion etc.) */
  defer: (fn: () => void): void => { setTimeout(fn, 0); },
  reportError: (e: unknown): void => { console.error(e); },
  /**
   * (21 October) The yard shown straight from the graphics card: its WebGL canvas is a page element under the game's
   * canvas, and where the yard's picture is drawn the game's canvas is left see-through (a Bitmap whose BitmapData has
   * $ioHole). Copying the card's picture into the game's canvas every frame made the card wait for the processor.
   * mainCtx: the game's own canvas's context (only there is the hole left); glDirect: decided as the page starts (a
   * real graphics card, the setting on; the game's canvas then has an alpha channel); showGlLayer puts the card's
   * canvas under the game's (or hides it); glLayer: that canvas while shown.
   */
  mainCtx: null as CanvasRenderingContext2D | null,
  glDirect: false,
  glLayer: null as HTMLCanvasElement | null,
  showGlLayer: (_c: HTMLCanvasElement | null, _on: boolean): void => {},
  /** profiling switches (debugging only) */
  debug: { noFilters: false, noText: false, noBitmaps: false, noCache: false, damageLog: null as null | [string, number[], string][], fxLog: null as null | [string, number, string][],
    /** compares every unchanged part of the screen again, as before change marks (touch) */
    noSkip: false,
    /** (21 October) colour transforms worked out in script, pixel by pixel, as before the browser's filter (a test tool) */
    scriptColorTransform: false,
    /** (21 October) colour transforms done by the browser's filter so far (a test tool) */
    ctFastCount: 0,
    /** a test tool: [] checks each part stepped over (redrawRegions) and lists any that had changed unmarked */
    skipCheck: null as null | string[],
    /** a test tool: [] lists the children compared at each drawing (not stepped over), and why */
    visitLog: null as null | string[],
    /** objects compared and stepped over, all drawings */
    walk: { visited: 0, skipped: 0 },
    /** a test tool: [] lists, for each frame drawn whole, [damaged boxes, % of the screen they add up to] */
    fullWhy: null as null | number[][],
    /** draws what windows hide too (DisplayObject.ioOccludes), as before them */
    noOccluders: false,
    /** (19 October) a test tool: the browser made to finish each drawing at once (it does that work later otherwise,
     *  unseen by the timings), its time counted in the player's stats.flushMs */
    measureFlush: false,
    /** draws the yard's picture through the clip of all the rectangles too, as before (findPrefix) */
    noPrefix: false,
    /** a cached layer's signature taken again every drawing it isn't vouched for, as before (renderWithEffects) */
    noTouchSig: false,
    /** (19 October) the game's frames are heavy (Player: timers, no made-up frames) past this share of a frame's time */
    heavyShare: 0.7,
    /** the game's "render" (the yard's own drawing) at every frame, drawn or not, as before (Player.frame) */
    renderAlways: false,

    /** a test tool: [] collects the rectangles drawn again (partial drawings), up to 2,000 */
    lastRects: null as null | number[][] },
};

let instanceCount = 0;

// ------------------------------------------------------------------------------------------ change marks
/** Counts the drawings (redrawRegions); a record's ep says which one last saw its object (interp). */
let visitEpoch = 0;
/**
 * Marks o, and its parents up to the stage, as changed for the next drawing. Everything that changes how an
 * object looks, where it is or what it holds calls this; redrawRegions then steps over every child that is
 * unmarked, in the same place on screen and on screen at the last drawing, without comparing it again (fps pass,
 * 11 October: the map room's 3,000 visible objects were compared one by one every frame, most of an idle frame).
 * A mask marks its owner; a button's state (no parent) marks its button.
 */
export function touch(o: DisplayObject | null | undefined, hiding = false): void {
  const s = visitEpoch + 1;
  let d: any = o;
  // (27 November, AkumaGath17's bug report, the Catapult's tooltips "slowly crashy": o itself is always gone up from,
  // marked already or not. A change inside it while it was hidden marked it and stopped there (nothing shows inside
  // something hidden); shown again in the same frame, its parents went unmarked, so the drawing stepped over them and
  // the tooltip (its text set, then shown) was not drawn, or drawn in part, until something else round it changed.)
  while (d && (d.$dk !== s || d === o)) {
    d.$dk = s;
    if (d.$maskOwner) touch(d.$maskOwner);
    // (inside something hidden nothing shows: showing it again marks it, and what it holds is then compared whole,
    // not having been drawn; hidden clips still play, a map room's cells' 200 hidden animations every frame)
    // (an object just hidden (hiding) is marked the whole way up: its old place must be repainted)
    if ((!d.$visible || d.$alpha <= 0) && !(hiding && d === o)) return;
    d = d.$parent ?? d.$btn ?? null;
  }
}
/**
 * Inferno-only (14 October): the yard's tilt (the game's IoTilt). Its ground is squashed (or stretched) up and down by
 * `ioUpright.k`; what stands on it (the children of a container marked `$ioUpright`: a building's hit area, the
 * monsters' health bars, projectiles) is kept its own height, standing on its foot (`$ioFoot`, the child's ground point
 * in its parent's space; its own place if none): drawn, hit and bounded by that (`$matrix`), its x, y, width and height
 * as the game set them.
 */
export const ioUpright = { k: 1 };
/** A child's foot set (its ground point in its parent's space; NaN: its own place). */
export function ioSetFoot(o: DisplayObject, foot: number): void {
  const a: any = o;
  if (a.$ioFoot === foot || (Number.isNaN(foot) && a.$ioFoot === undefined)) return;
  a.$ioFoot = foot;
  o.$matrixCache = null;
  touch(o);
}
/** The tilt changed: every standing child of these containers worked out again. */
export function ioUprightRefresh(containers: (DisplayObjectContainer | null)[]): void {
  for (const c of containers) {
    if (!c) continue;
    for (const ch of c.$children) { ch.$matrixCache = null; touch(ch); }
    touch(c);
  }
}
/** Run before each comparison: marks what changes without telling (the focused text field's caret, a playing video). */
export const redrawHooks: (() => void)[] = [];
/** Bitmaps that showed bd when they were last compared: marked when its pixels change (BitmapData calls this). */
drawHooks.changed = (bd: any): void => {
  const s = visitEpoch + 1;
  if (bd.$shownAt === s) return;
  bd.$shownAt = s;
  for (const b of bd.$shown) touch(b);
};
function onStageOrButton(o: any): boolean {
  for (let d = o; d; d = d.$parent ?? d.$btn ?? null) if (d instanceof Stage) return true;
  return false;
}
function noteShown(bd: any, b: DisplayObject): void {
  let set: Set<DisplayObject> | null = bd.$shown;
  if (!set) set = bd.$shown = new Set<DisplayObject>();
  else if (set.size >= (bd.$shownMax || 16) && !set.has(b)) {
    // (gone from the screen, or showing another bitmap: dropped, so a shared picture keeps no old objects alive)
    for (const x of set) if ((x as any).$bitmapData !== bd || !onStageOrButton(x)) set.delete(x);
    bd.$shownMax = Math.max(16, set.size * 2);
  }
  set.add(b);
}

export { IBitmapDrawable };

export class DisplayObject extends EventDispatcher {
  declare $parent: DisplayObjectContainer | null;
  declare $name: string;
  declare $x: number; declare $y: number;
  declare $sx: number; declare $sy: number;
  declare $skewX: number; declare $skewY: number;
  declare $rotation: number;
  declare $alpha: number;
  declare $visible: boolean;
  declare $mask: DisplayObject | null;
  declare $maskOwner: DisplayObject | null;
  declare $scrollRect: Rectangle | null;
  declare $filters: any[];
  declare $blendMode: string;
  declare $cacheAsBitmap: boolean;
  declare $opaqueBackground: any;
  declare $colorTransform: ColorTransform | null;
  declare $loaderInfo: LoaderInfo | null;
  declare $matrixCache: M6 | null;
  /** set once code changes the transform: the timeline stops animating it */
  declare $scripted: boolean;
  /** timeline depth (undefined for children added by code) */
  declare $depth: number | undefined;
  /** identifies the timeline placement that created this object */
  declare $placeKey: number;
  /** timeline mask layer: masks siblings up to this depth */
  declare $clipDepth: number;
  declare $scale9: Rectangle | null;
  /** library shape definition (timeline shapes) */
  declare $shapeDef: any;
  /** unique id (render caches) */
  declare $uid: number;
  /** cached filtered layer */
  declare $fx: any;
  /** the drawing this object was last marked changed for (touch) */
  declare $dk: number;

  $alloc(): void {
    super.$alloc();
    this.$parent = null;
    this.$name = `instance${++instanceCount}`;
    this.$uid = instanceCount;
    this.$fx = null;
    this.$x = 0; this.$y = 0;
    this.$sx = 1; this.$sy = 1;
    this.$skewX = 0; this.$skewY = 0; this.$rotation = 0;
    this.$alpha = 1;
    this.$visible = true;
    this.$mask = null; this.$maskOwner = null;
    this.$scrollRect = null;
    this.$filters = [];
    this.$blendMode = "normal";
    this.$cacheAsBitmap = false;
    this.$opaqueBackground = null;
    this.$colorTransform = null;
    this.$loaderInfo = null;
    this.$matrixCache = null;
    this.$scripted = false;
    this.$depth = undefined;
    this.$placeKey = -1;
    this.$clipDepth = 0;
    this.$scale9 = null;
    this.$shapeDef = null;
    this.$dk = 0;
  }

  $afterAlloc(): void {
    super.$afterAlloc();
    const attach = player.pendingChild;
    if (attach && !(this instanceof Stage)) {
      player.pendingChild = null;
      attach(this);
    }
    const root = player.pendingRoot;
    if (root && !(this instanceof Stage)) {
      player.pendingRoot = null;
      this.$parent = root.stage;
      root.stage.$children.push(this);
      touch(root.stage);
      this.$loaderInfo = root.loaderInfo;
      root.loaderInfo.$content = this;
    }
    // Library symbols ([Embed] classes) get their timeline children before any AS3 constructor runs.
    const embed = findEmbed(this.constructor);
    if (embed) player.populateSymbol(this, embed);
  }

  /** something it draws changed (its Graphics) */
  $invalidate(): void { touch(this); }

  // ---------------------------------------------------------- transform
  get x(): number { return this.$x; }
  set x(v: number) { const t = toTwips(v); this.$scripted = true; if (t === this.$x) return; if (interp.on) ipNote(this); this.$x = t; this.$matrixCache = null; touch(this); }
  get y(): number { return this.$y; }
  set y(v: number) { const t = toTwips(v); this.$scripted = true; if (t === this.$y) return; if (interp.on) ipNote(this); this.$y = t; this.$matrixCache = null; touch(this); }
  get z(): number { return 0; }
  set z(_v: number) { unimplemented("DisplayObject.z"); }
  get scaleX(): number { return this.$sx; }
  set scaleX(v: number) { v = +v; this.$scripted = true; if (v === this.$sx) return; if (interp.on) ipNote(this); this.$sx = v; this.$matrixCache = null; touch(this); }
  get scaleY(): number { return this.$sy; }
  set scaleY(v: number) { v = +v; this.$scripted = true; if (v === this.$sy) return; if (interp.on) ipNote(this); this.$sy = v; this.$matrixCache = null; touch(this); }
  get scaleZ(): number { return 1; }
  set scaleZ(_v: number) {}
  get rotation(): number { return this.$rotation; }
  set rotation(v: number) {
    if (interp.on) ipNote(this);
    v = +v % 360;
    if (v > 180) v -= 360; else if (v < -180) v += 360;
    const delta = ((v - this.$rotation) * Math.PI) / 180;
    this.$skewX += delta; this.$skewY += delta;
    this.$rotation = v;
    this.$matrixCache = null;
    this.$scripted = true;
    touch(this);
  }
  get rotationX(): number { return 0; } set rotationX(_v: number) {}
  get rotationY(): number { return 0; } set rotationY(_v: number) {}
  get rotationZ(): number { return this.rotation; } set rotationZ(v: number) { this.rotation = v; }
  get alpha(): number { return this.$alpha; }
  set alpha(v: number) { const a = Math.trunc(+v * 256) / 256 || 0; if (a === this.$alpha) return; if (interp.on) ipNote(this); this.$alpha = a; touch(this, true); }
  get visible(): boolean { return this.$visible; }
  set visible(v: boolean) { v = !!v; if (v === this.$visible) return; this.$visible = v; touch(this, true); }

  /** Local matrix (object → parent). */
  $matrix(): M6 {
    if (this.$matrixCache) return this.$matrixCache;
    const m: M6 = this.$rawMatrix();
    // (standing on a tilted yard: its own height kept, about its foot; see ioUpright)
    const k = ioUpright.k;
    if (k !== 1 && (this.$parent as any)?.$ioUpright) {
      const f = (this as any).$ioFoot;
      const foot = typeof f === "number" && !Number.isNaN(f) ? f : m[5];
      m[1] /= k; m[3] /= k; m[5] = foot + (m[5] - foot) / k;
    }
    this.$matrixCache = m;
    return m;
  }
  /** The local matrix as the object's properties give it (no tilt). */
  $rawMatrix(): M6 {
    return [this.$sx * Math.cos(this.$skewY), this.$sx * Math.sin(this.$skewY), -this.$sy * Math.sin(this.$skewX), this.$sy * Math.cos(this.$skewX), this.$x, this.$y];
  }
  $setMatrix(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
    this.$sx = Math.sqrt(a * a + b * b);
    this.$sy = Math.sqrt(c * c + d * d);
    this.$skewY = Math.atan2(b, a);
    this.$skewX = Math.atan2(-c, d);
    if (a * d - b * c < 0) { this.$sy = -this.$sy; this.$skewX = Math.atan2(c, -d); }
    this.$rotation = (this.$skewY * 180) / Math.PI;
    this.$x = toTwips(tx); this.$y = toTwips(ty);
    this.$matrixCache = null;
    touch(this);
  }
  /** Concatenated matrix (object → root space). */
  $globalMatrix(): M6 {
    const chain: DisplayObject[] = [];
    for (let o: DisplayObject | null = this; o && !(o instanceof Stage); o = o.$parent) chain.push(o);
    let m: M6 = IDENT;
    for (let i = chain.length - 1; i >= 0; i--) { const l = chain[i].$matrix(); m = mul(m, ...l); }
    return m;
  }

  get width(): number { return this.$boundsIn(this.$rawMatrix(), true)?.width ?? 0; }
  set width(v: number) {
    const b = this.$boundsIn(IDENT, true);
    if (!b || !b.width) return;
    this.$setSize(+v / b.width, +v / b.height, b.height / b.width, true);
  }
  get height(): number { return this.$boundsIn(this.$rawMatrix(), true)?.height ?? 0; }
  set height(v: number) {
    const b = this.$boundsIn(IDENT, true);
    if (!b || !b.height) return;
    this.$setSize(+v / b.width, +v / b.height, b.height / b.width, false);
  }
  /** Flash's width/height setter math (accounts for rotation), as documented by Ruffle. */
  private $setSize(tsx: number, tsy: number, aspect: number, isWidth: boolean): void {
    this.$scripted = true;
    const rot = (this.$rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rot)), sin = Math.abs(Math.sin(rot));
    const psx = this.$sx, psy = this.$sy;
    if (isWidth) {
      this.$sx = (aspect * (cos * tsx + sin * tsy)) / ((cos + aspect * sin) * (aspect * cos + sin));
      this.$sy = (sin * psx + aspect * cos * psy) / (aspect * cos + sin);
    } else {
      this.$sx = (aspect * cos * psx + sin * psy) / (aspect * cos + sin) === 0 ? psx : (cos * psx + aspect * sin * psy) / (cos + aspect * sin);
      this.$sy = (sin * tsx + aspect * cos * tsy) / ((cos + aspect * sin) * (aspect * cos + sin)) * aspect;
      if (sin === 0) { this.$sx = psx; this.$sy = tsy; }
    }
    this.$matrixCache = null;
    touch(this);
  }

  get transform(): Transform { return new Transform(this); }
  set transform(t: Transform) {
    const m = t.matrix; this.$setMatrix(m.a, m.b, m.c, m.d, m.tx, m.ty); this.$scripted = true;
    this.$colorTransform = t.colorTransform;
    touch(this, true);
  }

  // ---------------------------------------------------------- tree
  get parent(): DisplayObjectContainer | null { return this.$parent; }
  get root(): DisplayObject | null {
    if (this instanceof Stage) return this;
    let o: DisplayObject = this;
    while (o.$parent && !(o.$parent instanceof Stage)) o = o.$parent;
    if (o.$parent instanceof Stage) return o;
    return o.$loaderInfo ? o : null;
  }
  get stage(): Stage | null {
    let o: DisplayObject | null = this;
    while (o && !(o instanceof Stage)) o = o.$parent;
    return o as Stage | null;
  }
  get name(): string { return this.$name; }
  set name(v: string) { this.$name = v == null ? null : String(v); }
  get loaderInfo(): LoaderInfo | null {
    for (let o: DisplayObject | null = this; o; o = o.$parent) if (o.$loaderInfo) return o.$loaderInfo;
    return player.mainLoaderInfo;
  }
  get mask(): DisplayObject | null { return this.$mask; }
  set mask(m: DisplayObject | null) {
    touch(this);
    if (this.$mask) { touch(this.$mask); this.$mask.$maskOwner = null; }
    this.$mask = m ?? null;
    if (m) { m.$maskOwner = this; touch(m); }
  }
  get filters(): any[] { return this.$filters.map((f) => f.clone?.() ?? f); }
  set filters(v: any[]) {
    this.$filters = v == null ? [] : Array.from(v as any[], (f: any) => {
      if (f == null || typeof f.clone !== "function") throw argumentError(2005, "Parameter 0 is of the incorrect type. Should be type Filter.");
      return f.clone();
    });
    touch(this);
  }
  get blendMode(): string { return this.$blendMode; }
  set blendMode(v: string) { this.$blendMode = v; touch(this); }
  get cacheAsBitmap(): boolean { return this.$cacheAsBitmap || this.$filters.length > 0; }
  set cacheAsBitmap(v: boolean) { this.$cacheAsBitmap = !!v; }
  /**
   * Not Flash: says the rectangle r (in this object's own space) is drawn fully opaque by it, so a change under it
   * (anything drawn before it) cannot be seen and is not drawn again. A window over a live yard: the yard's
   * monsters, smoke and glowing ground under the window had it all drawn again every frame (the Quest Book "runs
   * slow", 12 October). null: it hides nothing. Only used while it and all its parents are visible, fully opaque
   * and not rotated or masked.
   */
  ioOccludes(r: Rectangle | null): void {
    (this as any).$ioOcc = r ? r.clone() : null;
    if (r) occluders.add(this); else occluders.delete(this);
    touch(this);
  }
  get opaqueBackground(): any { return this.$opaqueBackground; }
  set opaqueBackground(v: any) { this.$opaqueBackground = v; }
  get scrollRect(): Rectangle | null { return this.$scrollRect?.clone() ?? null; }
  set scrollRect(r: Rectangle | null) { this.$scrollRect = r?.clone() ?? null; touch(this); }
  get scale9Grid(): Rectangle | null { return this.$scale9?.clone() ?? null; }
  set scale9Grid(r: Rectangle | null) { this.$scale9 = r?.clone() ?? null; touch(this); }
  get accessibilityProperties(): any { return null; }
  set accessibilityProperties(_v: any) {}
  get mouseX(): number { return this.globalToLocal(new Point(player.mouseX, player.mouseY)).x; }
  get mouseY(): number { return this.globalToLocal(new Point(player.mouseX, player.mouseY)).y; }

  // ---------------------------------------------------------- geometry queries
  localToGlobal(p: Point): Point { const [x, y] = apply(this.$globalMatrix(), p.x, p.y); return new Point(x, y); }
  globalToLocal(p: Point): Point { const [x, y] = apply(invert(this.$globalMatrix()), p.x, p.y); return new Point(x, y); }
  getBounds(target: DisplayObject): Rectangle { return this.$boundsFor(target, true); }
  getRect(target: DisplayObject): Rectangle { return this.$boundsFor(target, false); }
  private $boundsFor(target: DisplayObject, strokes: boolean): Rectangle {
    const m = target ? mul(invert(target.$globalMatrix()), ...this.$globalMatrix()) : this.$globalMatrix();
    return this.$boundsIn(m, strokes) ?? new Rectangle();
  }
  /** Bounds of this subtree under matrix m (object space → m's space), children transformed individually like Flash. */
  $boundsIn(m: M6, strokes: boolean): Rectangle | null {
    let acc: Rectangle | null = null;
    const self = this.$selfBounds(strokes);
    if (self) acc = boundsOf(self, m);
    if (this instanceof DisplayObjectContainer) {
      for (const c of this.$children) acc = unionInto(acc, c.$boundsIn(mul(m, ...c.$matrix()), strokes));
    }
    return acc;
  }
  $selfBounds(_strokes: boolean): Rectangle | null { return null; }
  $hitSelf(_lx: number, _ly: number, _shape: boolean): boolean { return false; }
  $drawSelf(_ctx: CanvasRenderingContext2D, _m: M6, _alpha: number): void {}

  hitTestPoint(x: number, y: number, shapeFlag: boolean = false): boolean {
    if (!shapeFlag) return this.getBounds(this.stage ?? (this.root as DisplayObject) ?? this).contains(x, y);
    return this.$hitTree(x, y);
  }
  /** Shape hit test of this subtree against a point in root space. */
  $hitTree(gx: number, gy: number): boolean {
    const [lx, ly] = apply(invert(this.$globalMatrix()), gx, gy);
    if (this.$hitSelf(lx, ly, true)) return true;
    if (this instanceof DisplayObjectContainer) for (const c of this.$children) if (c.$visible && c.$hitTree(gx, gy)) return true;
    return false;
  }
  hitTestObject(obj: DisplayObject): boolean {
    const s = this.stage ?? this;
    return this.getBounds(s).intersects(obj.getBounds(s));
  }
  toString(): string { return super.toString(); }
}
implement(DisplayObject, [IBitmapDrawable]);
flashClass(DisplayObject, "flash.display.DisplayObject");

function findEmbed(ctor: any): any {
  for (let c = ctor; c && c !== DisplayObject; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, "$embed")) return c.$embed;
  }
  return null;
}

export class Transform {
  constructor(private o: DisplayObject) {}
  get matrix(): Matrix { const m = this.o.$rawMatrix(); return new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]); }
  set matrix(m: Matrix) { if (m) { this.o.$setMatrix(m.a, m.b, m.c, m.d, m.tx, m.ty); this.o.$scripted = true; } }
  get colorTransform(): ColorTransform {
    const c = this.o.$colorTransform?.clone() ?? new ColorTransform();
    c.alphaMultiplier = this.o.$alpha;
    return c;
  }
  set colorTransform(c: ColorTransform) {
    if (c == null) throw nullParam("colorTransform");
    this.o.$colorTransform = c.clone();
    this.o.$alpha = c.alphaMultiplier;
    touch(this.o, true);
  }
  get concatenatedMatrix(): Matrix { const m = this.o.$globalMatrix(); return new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]); }
  get concatenatedColorTransform(): ColorTransform {
    const c = new ColorTransform();
    for (let o: DisplayObject | null = this.o; o; o = o.$parent) { const t = new Transform(o).colorTransform; c.concat(t); }
    return c;
  }
  get pixelBounds(): Rectangle { return this.o.getBounds(this.o.stage ?? this.o); }
}

export class InteractiveObject extends DisplayObject {
  declare $mouseEnabled: boolean;
  declare $doubleClickEnabled: boolean;
  declare $tabEnabled: boolean | null;
  declare $tabIndex: number;
  declare $focusRect: any;
  declare $contextMenu: any;
  $alloc(): void {
    super.$alloc();
    this.$mouseEnabled = true; this.$doubleClickEnabled = false; this.$tabEnabled = null; this.$tabIndex = -1;
    this.$focusRect = null; this.$contextMenu = null;
  }
  get mouseEnabled(): boolean { return this.$mouseEnabled; } set mouseEnabled(v: boolean) { this.$mouseEnabled = !!v; }
  get doubleClickEnabled(): boolean { return this.$doubleClickEnabled; } set doubleClickEnabled(v: boolean) { this.$doubleClickEnabled = !!v; }
  get tabEnabled(): boolean { return this.$tabEnabled ?? false; } set tabEnabled(v: boolean) { this.$tabEnabled = !!v; }
  get tabIndex(): number { return this.$tabIndex; } set tabIndex(v: number) { this.$tabIndex = v | 0; }
  get focusRect(): any { return this.$focusRect; } set focusRect(v: any) { this.$focusRect = v; }
  get contextMenu(): any { return this.$contextMenu; } set contextMenu(v: any) { this.$contextMenu = v; }
  get needsSoftKeyboard(): boolean { return false; } set needsSoftKeyboard(_v: boolean) {}
}
flashClass(InteractiveObject, "flash.display.InteractiveObject");

export class DisplayObjectContainer extends InteractiveObject {
  declare $children: DisplayObject[];
  declare $mouseChildren: boolean;
  declare $tabChildren: boolean;
  $alloc(): void {
    this.$children = [];
    this.$mouseChildren = true;
    this.$tabChildren = true;
    super.$alloc();
  }
  get numChildren(): number { return this.$children.length; }
  get mouseChildren(): boolean { return this.$mouseChildren; } set mouseChildren(v: boolean) { this.$mouseChildren = !!v; }
  get tabChildren(): boolean { return this.$tabChildren; } set tabChildren(v: boolean) { this.$tabChildren = !!v; }
  get textSnapshot(): any { return null; }

  addChild(child: DisplayObject): DisplayObject {
    if (child == null) throw nullParam("child");
    return this.addChildAt(child, child.$parent === this ? this.$children.length - 1 : this.$children.length);
  }
  addChildAt(child: DisplayObject, index: number): DisplayObject {
    if (child == null) throw nullParam("child");
    if (child === this) throw argumentError(2024, "An object cannot be added as a child of itself.");
    for (let p: DisplayObject | null = this.$parent; p; p = p.$parent) {
      if (p === child) throw argumentError(2150, "An object cannot be added as a child to one of it's children (or children's children, etc.).");
    }
    // Flash checks the index against numChildren before taking an existing child out, so
    // addChildAt(existingChild, numChildren) is allowed and moves it to the top (the yard planner does it).
    if (index < 0 || index > this.$children.length) throw rangeError(2006, "The supplied index is out of bounds.");
    touch(this);
    if (child.$parent === this) {
      const i = this.$children.indexOf(child);
      this.$children.splice(i, 1);
      this.$children.splice(Math.min(index, this.$children.length), 0, child);
      return child;
    }
    // Detaching goes through the internal path: taking content out of a Loader is allowed.
    if (child.$parent) child.$parent.$detach(child);
    this.$children.splice(index, 0, child);
    child.$parent = this;
    if (ioUpright.k !== 1) child.$matrixCache = null;
    child.dispatchEvent(new Event(Event.ADDED, true));
    if (this.stage) dispatchStageEvent(child, Event.ADDED_TO_STAGE);
    return child;
  }
  removeChild(child: DisplayObject): DisplayObject {
    if (child == null) throw nullParam("child");
    const i = this.$children.indexOf(child);
    if (i < 0) throw argumentError(2025, "The supplied DisplayObject must be a child of the caller.");
    return this.removeChildAt(i);
  }
  removeChildAt(index: number): DisplayObject {
    const child = this.$children[index];
    if (!child || index < 0) throw rangeError(2006, "The supplied index is out of bounds.");
    return this.$detach(child);
  }
  /** Removes a child with Flash's REMOVED / REMOVED_FROM_STAGE events. */
  $detach(child: DisplayObject): DisplayObject {
    child.dispatchEvent(new Event(Event.REMOVED, true));
    if (this.stage) dispatchStageEvent(child, Event.REMOVED_FROM_STAGE);
    const i = this.$children.indexOf(child);
    if (i >= 0) this.$children.splice(i, 1);
    child.$parent = null;
    if (ioUpright.k !== 1) child.$matrixCache = null;
    touch(this);
    return child;
  }
  removeChildren(begin: number = 0, end: number = 2147483647): void {
    if (end === 2147483647) end = this.$children.length - 1;
    if (begin < 0 || end >= this.$children.length || begin > end) {
      if (this.$children.length === 0 && begin === 0) return;
      throw rangeError(2006, "The supplied index is out of bounds.");
    }
    for (let i = end; i >= begin; i--) this.removeChildAt(begin);
  }
  getChildAt(index: number): DisplayObject {
    const c = this.$children[index];
    if (!c || index < 0) throw rangeError(2006, "The supplied index is out of bounds.");
    return c;
  }
  getChildByName(name: string): DisplayObject | null { return this.$children.find((c) => c.$name === name) ?? null; }
  getChildIndex(child: DisplayObject): number {
    if (child == null) throw nullParam("child");
    const i = this.$children.indexOf(child);
    if (i < 0) throw argumentError(2025, "The supplied DisplayObject must be a child of the caller.");
    return i;
  }
  setChildIndex(child: DisplayObject, index: number): void {
    if (child == null) throw nullParam("child");
    const i = this.$children.indexOf(child);
    if (i < 0) throw argumentError(2025, "The supplied DisplayObject must be a child of the caller.");
    if (index < 0 || index >= this.$children.length) throw rangeError(2006, "The supplied index is out of bounds.");
    this.$children.splice(i, 1);
    this.$children.splice(index, 0, child);
    touch(this);
  }
  swapChildren(a: DisplayObject, b: DisplayObject): void {
    const i = this.getChildIndex(a), j = this.getChildIndex(b);
    this.$children[i] = b; this.$children[j] = a;
    touch(this);
  }
  swapChildrenAt(i: number, j: number): void {
    const a = this.getChildAt(i), b = this.getChildAt(j);
    this.$children[i] = b; this.$children[j] = a;
    touch(this);
  }
  contains(child: DisplayObject): boolean {
    for (let o: DisplayObject | null = child; o; o = o.$parent) if (o === this) return true;
    return false;
  }
  getObjectsUnderPoint(p: Point): DisplayObject[] {
    const out: DisplayObject[] = [];
    const walk = (o: DisplayObject) => {
      if (!o.$visible) return;
      if (!(o instanceof DisplayObjectContainer) && o.$hitTree(p.x, p.y)) out.push(o);
      if (o instanceof DisplayObjectContainer) o.$children.forEach(walk);
    };
    this.$children.forEach(walk);
    return out;
  }
  areInaccessibleObjectsUnderPoint(_p: Point): boolean { return false; }
  stopAllMovieClips(): void {}
}
flashClass(DisplayObjectContainer, "flash.display.DisplayObjectContainer");

/**
 * Playing clips on the stage: the only ones a frame advance can change (a stopped or single-frame clip's
 * advance does nothing). Kept current by play/stop and by stage entry/exit, so the player steps these
 * instead of walking the whole display list every frame.
 */
export const activeClips = new Set<MovieClip>();
/** A clip with frames to play: one frame (most of them: 4,000 of the map room's 4,300) never changes. */
export function animates(mc: MovieClip): boolean { return mc.$p && !!mc.$timeline && mc.$timeline.totalFrames > 1; }
export function trackStage(o: DisplayObject, onStage: boolean): void {
  if (o instanceof MovieClip) {
    if (onStage && animates(o)) activeClips.add(o);
    else activeClips.delete(o);
  }
}

/** ADDED_TO_STAGE / REMOVED_FROM_STAGE go to the object and then every descendant. */
function dispatchStageEvent(o: DisplayObject, type: string): void {
  trackStage(o, type === Event.ADDED_TO_STAGE);
  // (21 October: only to an object listening for it, unless something listens in the capture phase: a map's 224
  // cells, each 30 objects, made an event and walked their parents for every one)
  if (o.$listeners?.get(type)?.length || anyCaptureListeners(type)) o.dispatchEvent(new Event(type));
  if (o instanceof DisplayObjectContainer) for (const c of o.$children.slice()) dispatchStageEvent(c, type);
}

export class Sprite extends DisplayObjectContainer {
  declare $graphics: Graphics;
  declare $buttonMode: boolean;
  declare $useHandCursor: boolean;
  declare $hitArea: Sprite | null;
  declare $dragBounds: Rectangle | null;
  declare $soundTransform: any;
  $alloc(): void {
    this.$graphics = new Graphics();
    this.$graphics.$owner = this;
    this.$buttonMode = false; this.$useHandCursor = true; this.$hitArea = null; this.$dragBounds = null; this.$soundTransform = null;
    super.$alloc();
  }
  get graphics(): Graphics { return this.$graphics; }
  get buttonMode(): boolean { return this.$buttonMode; } set buttonMode(v: boolean) { this.$buttonMode = !!v; }
  get useHandCursor(): boolean { return this.$useHandCursor; } set useHandCursor(v: boolean) { this.$useHandCursor = !!v; }
  get hitArea(): Sprite | null { return this.$hitArea; } set hitArea(v: Sprite | null) { this.$hitArea = v; }
  get dropTarget(): DisplayObject | null { return null; }
  get soundTransform(): any { return this.$soundTransform; } set soundTransform(v: any) { this.$soundTransform = v; }
  startDrag(lockCenter: boolean = false, bounds: Rectangle = null): void { dragState.start(this, lockCenter, bounds); }
  stopDrag(): void { dragState.stop(this); }
  $selfBounds(strokes: boolean): Rectangle | null { return this.$graphics.$isEmpty ? null : this.$graphics.$localBounds(strokes); }
  $hitSelf(lx: number, ly: number, shape: boolean): boolean {
    if (this.$graphics.$isEmpty) return false;
    return shape ? this.$graphics.$hitTest(lx, ly) : this.$graphics.$localBounds(true).contains(lx, ly);
  }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    if (this.$graphics.$isEmpty) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    this.$graphics.$render(ctx, alpha, Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])));
  }
}
flashClass(Sprite, "flash.display.Sprite");

/** Sprite.startDrag state, advanced by the player on mouse move. */
export const dragState = {
  target: null as Sprite | null,
  offX: 0, offY: 0,
  bounds: null as Rectangle | null,
  start(s: Sprite, lockCenter: boolean, bounds: Rectangle | null) {
    this.target = s; this.bounds = bounds?.clone() ?? null;
    const p = s.$parent ? s.$parent.globalToLocal(new Point(player.mouseX, player.mouseY)) : new Point(player.mouseX, player.mouseY);
    this.offX = lockCenter ? 0 : s.x - p.x; this.offY = lockCenter ? 0 : s.y - p.y;
  },
  stop(s: Sprite) { if (this.target === s) this.target = null; },
  update() {
    const s = this.target;
    if (!s) return;
    const p = s.$parent ? s.$parent.globalToLocal(new Point(player.mouseX, player.mouseY)) : new Point(player.mouseX, player.mouseY);
    let x = p.x + this.offX, y = p.y + this.offY;
    if (this.bounds) { x = Math.min(Math.max(x, this.bounds.left), this.bounds.right); y = Math.min(Math.max(y, this.bounds.top), this.bounds.bottom); }
    s.x = x; s.y = y;
  },
};

export class FrameLabel {
  constructor(public readonly name: string, public readonly frame: number) {}
}
flashClass(FrameLabel, "flash.display.FrameLabel");
export class Scene {
  constructor(public readonly name: string, public readonly labels: FrameLabel[], public readonly numFrames: number) {}
}
flashClass(Scene, "flash.display.Scene");

/**
 * MovieClip. Timelines of library symbols are driven by `$timeline` (installed
 * by the asset library); code-created clips have a single frame.
 */
export class MovieClip extends Sprite {
  /** MovieClip is a dynamic class in AS3 (timeline children are read as properties). */
  [key: string]: any;
  declare $frame: number;
  declare $p: boolean;
  get $playing(): boolean { return this.$p; }
  set $playing(v: boolean) {
    this.$p = v;
    if (!v) activeClips.delete(this);
    else if (this.$timeline && this.$timeline.totalFrames > 1 && this.stage) activeClips.add(this);
  }
  declare $timeline: any;
  declare $frameScripts: (Function | null)[];
  declare $enabled: boolean;
  declare $trackAsMenu: boolean;
  $alloc(): void {
    this.$frame = 1;
    this.$playing = true;
    this.$timeline = null;
    this.$frameScripts = [];
    this.$enabled = true;
    this.$trackAsMenu = false;
    super.$alloc();
  }
  get currentFrame(): number { return this.$frame; }
  get totalFrames(): number { return this.$timeline?.totalFrames ?? 1; }
  get framesLoaded(): number { return this.totalFrames; }
  get currentLabel(): string | null {
    const labels: FrameLabel[] = this.$timeline?.labels ?? [];
    let cur: string | null = null;
    for (const l of labels) if (l.frame <= this.$frame) cur = l.name;
    return cur;
  }
  get currentFrameLabel(): string | null { return (this.$timeline?.labels ?? []).find((l: FrameLabel) => l.frame === this.$frame)?.name ?? null; }
  get currentLabels(): FrameLabel[] { return (this.$timeline?.labels ?? []).slice(); }
  get currentScene(): Scene { return new Scene("Scene 1", this.currentLabels, this.totalFrames); }
  get scenes(): Scene[] { return [this.currentScene]; }
  get isPlaying(): boolean { return this.$playing && this.totalFrames > 1; }
  get enabled(): boolean { return this.$enabled; } set enabled(v: boolean) { this.$enabled = !!v; }
  get trackAsMenu(): boolean { return this.$trackAsMenu; } set trackAsMenu(v: boolean) { this.$trackAsMenu = !!v; }
  play(): void { this.$playing = true; }
  stop(): void { this.$playing = false; }
  nextFrame(): void { this.$goto(this.$frame + 1); this.$playing = false; }
  prevFrame(): void { this.$goto(this.$frame - 1); this.$playing = false; }
  gotoAndPlay(frame: any, _scene: string = null): void { this.$goto(this.$resolveFrame(frame)); this.$playing = true; }
  gotoAndStop(frame: any, _scene: string = null): void { this.$goto(this.$resolveFrame(frame)); this.$playing = false; }
  addFrameScript(...args: any[]): void {
    for (let i = 0; i + 1 < args.length; i += 2) this.$frameScripts[args[i] | 0] = args[i + 1];
  }
  $resolveFrame(frame: any): number {
    if (typeof frame === "number") return frame | 0;
    const s = String(frame);
    const l = (this.$timeline?.labels ?? []).find((x: FrameLabel) => x.name === s);
    if (l) return l.frame;
    const n = Number(s);
    if (!isNaN(n) && s.trim() !== "") return n | 0;
    throw argumentError(2109, `Frame label ${s} not found in scene Scene 1.`);
  }
  $goto(frame: number): void {
    const total = this.totalFrames;
    frame = Math.max(1, Math.min(total, frame));
    if (frame === this.$frame) return;
    this.$frame = frame;
    this.$timeline?.gotoFrame?.(this, frame);
    const script = this.$frameScripts[frame - 1];
    if (script) script.call(this);
  }
  /** Advances the playhead one frame (called by the player each frame). */
  $advance(): void {
    if (!this.$playing) return;
    const total = this.totalFrames;
    if (total <= 1) return;
    this.$goto(this.$frame >= total ? 1 : this.$frame + 1);
  }
}
flashClass(MovieClip, "flash.display.MovieClip");

export class Shape extends DisplayObject {
  declare $graphics: Graphics;
  $alloc(): void {
    this.$graphics = new Graphics();
    this.$graphics.$owner = this;
    super.$alloc();
  }
  get graphics(): Graphics { return this.$graphics; }
  $selfBounds(strokes: boolean): Rectangle | null {
    if (this.$shapeDef) return shapeHooks.bounds(this.$shapeDef, strokes);
    return this.$graphics.$isEmpty ? null : this.$graphics.$localBounds(strokes);
  }
  $hitSelf(lx: number, ly: number, shape: boolean): boolean {
    if (this.$shapeDef) return shape ? shapeHooks.hit(this.$shapeDef, lx, ly) : shapeHooks.bounds(this.$shapeDef, true).contains(lx, ly);
    if (this.$graphics.$isEmpty) return false;
    return shape ? this.$graphics.$hitTest(lx, ly) : this.$graphics.$localBounds(true).contains(lx, ly);
  }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    if (this.$shapeDef) shapeHooks.draw(ctx, this.$shapeDef, m, alpha);
    if (this.$graphics.$isEmpty) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    this.$graphics.$render(ctx, alpha, Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])));
  }
}
flashClass(Shape, "flash.display.Shape");

/**
 * A big bitmap on screen (the yard, drawn into all the time) logs where it changes, so only those places
 * are drawn again (visitRedraw); a small one is simply drawn again whole.
 */
function trackBig(b: BitmapData | null | undefined): void {
  if (b && !b.$disposed && b.$w * b.$h >= 512 * 512) b.$trackChanges();
}

export class Bitmap extends DisplayObject {
  declare $bitmapData: BitmapData | null;
  declare $smoothing: boolean;
  declare $pixelSnapping: string;
  $ctor(bitmapData: BitmapData = null, pixelSnapping: string = "auto", smoothing: boolean = false): void {
    super.$ctor();
    if (bitmapData != null || this.$bitmapData == null) this.$bitmapData = bitmapData;
    trackBig(this.$bitmapData);
    this.$pixelSnapping = pixelSnapping;
    this.$smoothing = !!smoothing;
  }
  $alloc(): void {
    super.$alloc();
    if (this.$bitmapData === undefined) this.$bitmapData = null;
    this.$smoothing = false;
    this.$pixelSnapping = "auto";
  }
  get bitmapData(): BitmapData | null { return this.$bitmapData; }
  set bitmapData(v: BitmapData | null) { this.$bitmapData = v; trackBig(v); touch(this); }
  get smoothing(): boolean { return this.$smoothing; } set smoothing(v: boolean) { this.$smoothing = !!v; touch(this); }
  get pixelSnapping(): string { return this.$pixelSnapping; } set pixelSnapping(v: string) { this.$pixelSnapping = v; }
  $selfBounds(): Rectangle | null {
    const b = this.$bitmapData;
    return b && !b.$disposed ? new Rectangle(0, 0, b.$w, b.$h) : null;
  }
  $hitSelf(lx: number, ly: number): boolean {
    const b = this.$bitmapData;
    return !!b && !b.$disposed && lx >= 0 && ly >= 0 && lx < b.$w && ly < b.$h;
  }
  /** (19 October) Can be drawn a rectangle's piece at a time (drawPrefix): a big one, upright. */
  $clipsItself(m: M6): boolean {
    const b = this.$bitmapData;
    return !!b && !b.$disposed && m[1] === 0 && m[2] === 0 && m[0] > 0 && m[3] > 0 && b.$w * b.$h > 262144;
  }
  /** The piece of it under the canvas rectangle r (a margin round it), with matrix m (drawPrefix: clipped to r). */
  /** (21 October) Left see-through in the game's own canvas: the graphics card's canvas under it shows (player.glDirect). */
  $ioPunch(ctx: CanvasRenderingContext2D, m: M6, alpha: number): boolean {
    const b = this.$bitmapData as any;
    if (!b || !b.$ioHole || ctx !== player.mainCtx || alpha < 0.999) return false;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, b.$w, b.$h);
    return true;
  }
  $drawPiece(ctx: CanvasRenderingContext2D, m: M6, alpha: number, r: Box): void {
    const b = this.$bitmapData!;
    if (player.debug.noBitmaps) return;
    if (this.$ioPunch(ctx, m, alpha)) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = this.$smoothing;
    const mx = Math.ceil(4 / m[0]) + 2, my = Math.ceil(4 / m[3]) + 2;
    const sx0 = Math.max(0, Math.floor((r[0] - m[4]) / m[0]) - mx), sy0 = Math.max(0, Math.floor((r[1] - m[5]) / m[3]) - my);
    const sx1 = Math.min(b.$w, Math.ceil((r[2] - m[4]) / m[0]) + mx), sy1 = Math.min(b.$h, Math.ceil((r[3] - m[5]) / m[3]) + my);
    if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(b.$canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.globalAlpha = 1;
  }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    const b = this.$bitmapData;
    if (!b || b.$disposed || player.debug.noBitmaps) return;
    if (this.$ioPunch(ctx, m, alpha)) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = this.$smoothing;

    // A big bitmap (the yard, 4000 x 2000) drawn upright: only the part that can show, the redrawn
    // rectangles or the target's size, plus a margin (fps pass, 4 October). Same place, same scale.
    if (m[1] === 0 && m[2] === 0 && m[0] > 0 && m[3] > 0 && b.$w * b.$h > 262144) {
      // (the margin: at least 4 target pixels, so smoothing at the cut edge never reaches what shows)
      const mx = Math.ceil(4 / m[0]) + 2, my = Math.ceil(4 / m[3]) + 2;
      // Several rectangles spread over the screen: each one's own part, rather than the box round them all
      // through a clip of many rectangles (in a busy yard that box is most of the screen, drawn every frame).
      if (cullRects && cullRects.length > 1 && cullRects.length <= 64) {
        for (const r of cullRects) {
          const sx0 = Math.max(0, Math.floor((r[0] - m[4]) / m[0]) - mx), sy0 = Math.max(0, Math.floor((r[1] - m[5]) / m[3]) - my);
          const sx1 = Math.min(b.$w, Math.ceil((r[2] - m[4]) / m[0]) + mx), sy1 = Math.min(b.$h, Math.ceil((r[3] - m[5]) / m[3]) + my);
          if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(b.$canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
        }
        ctx.globalAlpha = 1;
        return;
      }
      let vx0 = 0, vy0 = 0, vx1 = ctx.canvas.width, vy1 = ctx.canvas.height;
      if (cullRects && cullRects.length) {
        vx0 = Infinity; vy0 = Infinity; vx1 = -Infinity; vy1 = -Infinity;
        for (const r of cullRects) { if (r[0] < vx0) vx0 = r[0]; if (r[1] < vy0) vy0 = r[1]; if (r[2] > vx1) vx1 = r[2]; if (r[3] > vy1) vy1 = r[3]; }
      }
      const sx0 = Math.max(0, Math.floor((vx0 - m[4]) / m[0]) - mx), sy0 = Math.max(0, Math.floor((vy0 - m[5]) / m[3]) - my);
      const sx1 = Math.min(b.$w, Math.ceil((vx1 - m[4]) / m[0]) + mx), sy1 = Math.min(b.$h, Math.ceil((vy1 - m[5]) / m[3]) + my);
      if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(b.$canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.drawImage(b.$canvas, 0, 0);
    ctx.globalAlpha = 1;
  }
}
flashClass(Bitmap, "flash.display.Bitmap");

export class SimpleButton extends InteractiveObject {
  declare $up: DisplayObject | null; declare $over: DisplayObject | null; declare $down: DisplayObject | null; declare $hit: DisplayObject | null;
  declare $st: "up" | "over" | "down";
  get $state(): "up" | "over" | "down" { return this.$st; }
  set $state(v: "up" | "over" | "down") { if (v !== this.$st) { this.$st = v; touch(this); } }
  declare $enabled: boolean; declare $useHandCursor: boolean; declare $trackAsMenu: boolean;
  $ctor(upState: DisplayObject = null, overState: DisplayObject = null, downState: DisplayObject = null, hitTestState: DisplayObject = null): void {
    super.$ctor();
    this.$up = upState; this.$over = overState; this.$down = downState; this.$hit = hitTestState;
    this.$adopt();
  }
  /** Its states have no parent: a change inside one marks the button (touch). */
  $adopt(): void {
    for (const c of [this.$up, this.$over, this.$down, this.$hit]) if (c) (c as any).$btn = this;
    touch(this);
  }
  $alloc(): void {
    super.$alloc();
    this.$up = this.$over = this.$down = this.$hit = null;
    this.$st = "up"; this.$enabled = true; this.$useHandCursor = true; this.$trackAsMenu = false;
  }
  get upState(): DisplayObject | null { return this.$up; } set upState(v: DisplayObject | null) { this.$up = v; this.$adopt(); }
  get overState(): DisplayObject | null { return this.$over; } set overState(v: DisplayObject | null) { this.$over = v; this.$adopt(); }
  get downState(): DisplayObject | null { return this.$down; } set downState(v: DisplayObject | null) { this.$down = v; this.$adopt(); }
  get hitTestState(): DisplayObject | null { return this.$hit; } set hitTestState(v: DisplayObject | null) { this.$hit = v; this.$adopt(); }
  get enabled(): boolean { return this.$enabled; } set enabled(v: boolean) { this.$enabled = !!v; }
  get useHandCursor(): boolean { return this.$useHandCursor; } set useHandCursor(v: boolean) { this.$useHandCursor = !!v; }
  get trackAsMenu(): boolean { return this.$trackAsMenu; } set trackAsMenu(v: boolean) { this.$trackAsMenu = !!v; }
  get soundTransform(): any { return null; } set soundTransform(_v: any) {}
  $current(): DisplayObject | null { return this.$state === "down" ? this.$down : this.$state === "over" ? this.$over : this.$up; }
  $selfBounds(strokes: boolean): Rectangle | null { const c = this.$current(); return c ? c.$boundsIn(c.$matrix(), strokes) : null; }
  $hitSelf(lx: number, ly: number): boolean {
    const h = this.$hit;
    if (!h) return false;
    const [x, y] = apply(invert(h.$matrix()), lx, ly);
    return h.$hitSelf(x, y, true) || (h instanceof DisplayObjectContainer && h.$children.some((c) => c.$visible && c.$hitSelf(...apply(invert(c.$matrix()), x, y), true)));
  }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    const c = this.$current();
    if (c) renderObject(ctx, c, m, alpha);
  }
}
flashClass(SimpleButton, "flash.display.SimpleButton");

export class Stage extends DisplayObjectContainer {
  declare $width: number; declare $height: number;
  declare $scaleMode: string; declare $align: string; declare $displayState: string; declare $fullScreenAvailable: boolean;
  declare $quality: string; declare $frameRate: number; declare $focus: InteractiveObject | null;
  declare $color: number; declare $showDefaultContextMenu: boolean; declare $invalidated: boolean;
  $alloc(): void {
    super.$alloc();
    this.$width = 760; this.$height = 670;
    this.$scaleMode = "showAll"; this.$align = ""; this.$displayState = "normal"; this.$fullScreenAvailable = true;
    this.$quality = "HIGH"; this.$frameRate = 40; this.$focus = null; this.$color = 0xffffff;
    this.$showDefaultContextMenu = true; this.$invalidated = false;
  }
  get stageWidth(): number { return this.$width; } set stageWidth(_v: number) {}
  get stageHeight(): number { return this.$height; } set stageHeight(_v: number) {}
  get scaleMode(): string { return this.$scaleMode; } set scaleMode(v: string) { this.$scaleMode = v; stageHooks.layout(); }
  get align(): string { return this.$align; } set align(v: string) { this.$align = v; stageHooks.layout(); }
  get displayState(): string { return this.$displayState; } set displayState(v: string) { stageHooks.setDisplayState(v); }
  get quality(): string { return this.$quality; } set quality(v: string) { this.$quality = String(v).toUpperCase(); }
  get frameRate(): number { return this.$frameRate; } set frameRate(v: number) { this.$frameRate = Math.min(Math.max(+v, 0.01), 1000); }
  get focus(): InteractiveObject | null { return this.$focus; } set focus(v: InteractiveObject | null) { stageHooks.setFocus(v); }
  get color(): number { return this.$color; } set color(v: number) { this.$color = v >>> 0 & 0xffffff; }
  get showDefaultContextMenu(): boolean { return this.$showDefaultContextMenu; } set showDefaultContextMenu(v: boolean) { this.$showDefaultContextMenu = !!v; }
  get fullScreenWidth(): number { return screen.width; }
  get fullScreenHeight(): number { return screen.height; }
  get fullScreenSourceRect(): Rectangle | null { return null; } set fullScreenSourceRect(_v: Rectangle | null) {}
  get allowsFullScreen(): boolean { return this.$fullScreenAvailable; }
  get allowsFullScreenInteractive(): boolean { return this.$fullScreenAvailable; }
  get stageFocusRect(): boolean { return false; } set stageFocusRect(_v: boolean) {}
  get mouseChildren(): boolean { return true; } set mouseChildren(_v: boolean) {}
  get mouseX(): number { return player.mouseX; }
  get mouseY(): number { return player.mouseY; }
  get softKeyboardRect(): Rectangle { return new Rectangle(); }
  invalidate(): void { this.$invalidated = true; }
  isFocusInaccessible(): boolean { return false; }
  get loaderInfo(): LoaderInfo | null { return player.mainLoaderInfo; }
  get x(): number { return 0; } set x(_v: number) {}
  get y(): number { return 0; } set y(_v: number) {}
}
flashClass(Stage, "flash.display.Stage");

/** Stage services implemented by the player. */
export const stageHooks = {
  layout: () => {},
  setDisplayState: (_v: string) => {},
  setFocus: (_v: InteractiveObject | null) => {},
};

// ------------------------------------------------------------ loading
export class LoaderInfo extends EventDispatcher {
  declare $url: string; declare $parameters: any; declare $bytesLoaded: number; declare $bytesTotal: number;
  declare $content: DisplayObject | null; declare $loader: Loader | null; declare $width: number; declare $height: number;
  declare $bytes: any; declare $contentType: string | null; declare $uncaught: UncaughtErrorEvents; declare $shared: EventDispatcher;
  $alloc(): void {
    super.$alloc();
    this.$url = null; this.$parameters = {}; this.$bytesLoaded = 0; this.$bytesTotal = 0; this.$content = null; this.$loader = null;
    this.$width = 0; this.$height = 0; this.$bytes = null; this.$contentType = null;
    this.$uncaught = new UncaughtErrorEvents(); this.$shared = new EventDispatcher();
  }
  get url(): string { return this.$url; }
  get loaderURL(): string { return player.mainLoaderInfo?.$url ?? this.$url; }
  get parameters(): any { return this.$parameters; }
  get bytesLoaded(): number { return this.$bytesLoaded; }
  get bytesTotal(): number { return this.$bytesTotal; }
  get content(): DisplayObject | null { return this.$content; }
  get loader(): Loader | null { return this.$loader; }
  get width(): number { return this.$width; }
  get height(): number { return this.$height; }
  get bytes(): any { return this.$bytes; }
  get contentType(): string | null { return this.$contentType; }
  get frameRate(): number { return 40; }
  get swfVersion(): number { return 13; }
  get actionScriptVersion(): number { return 3; }
  get sameDomain(): boolean { return true; }
  get childAllowsParent(): boolean { return true; }
  get parentAllowsChild(): boolean { return true; }
  get applicationDomain(): any { return null; }
  get uncaughtErrorEvents(): UncaughtErrorEvents { return this.$uncaught; }
  get sharedEvents(): EventDispatcher { return this.$shared; }
  get isURLInaccessible(): boolean { return false; }
}
flashClass(LoaderInfo, "flash.display.LoaderInfo");

/** Loader: images (PNG/JPEG/GIF) by URL or bytes. Events are delivered on later frames, as in Flash. */
export class Loader extends DisplayObjectContainer {
  declare $info: LoaderInfo;
  declare $generation: number;
  $alloc(): void {
    super.$alloc();
    this.$info = new LoaderInfo();
    this.$info.$loader = this;
    this.$generation = 0;
  }
  get content(): DisplayObject | null { return this.$info.$content; }
  get contentLoaderInfo(): LoaderInfo { return this.$info; }
  get uncaughtErrorEvents(): UncaughtErrorEvents { return this.$info.$uncaught; }
  addChild(_c: DisplayObject): DisplayObject { throw new Error("Error #2069: The Loader class does not implement this method."); }
  removeChild(_c: DisplayObject): DisplayObject { throw new Error("Error #2069: The Loader class does not implement this method."); }

  load(request: any, _context: any = null): void {
    if (request == null) throw nullParam("request");
    this.$reset();
    const gen = this.$generation;
    const url = String(request.url ?? "");
    this.$info.$url = url;
    const info = this.$info;
    const live = () => gen === this.$generation;
    player.defer(() => { if (live()) info.dispatchEvent(new Event(Event.OPEN)); });
    fetch(url, { mode: "cors" }).then(async (res) => {
      if (!live()) return;
      player.defer(() => { if (live()) info.dispatchEvent(new HTTPStatusEvent(HTTPStatusEvent.HTTP_STATUS, false, false, res.status)); });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await this.$decode(blob, gen);
    }).catch(() => {
      player.defer(() => { if (live()) info.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2035: URL Not Found. URL: ${url}`, 2035)); });
    });
  }
  loadBytes(bytes: any, _context: any = null): void {
    if (bytes == null) throw nullParam("bytes");
    this.$reset();
    const gen = this.$generation;
    const arr: Uint8Array = bytes.$toUint8Array ? bytes.$toUint8Array() : new Uint8Array(bytes);
    this.$decode(new Blob([arr as BlobPart]), gen).catch(() => {
      player.defer(() => { if (gen === this.$generation) this.$info.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, "Error #2124: Loaded file is an unknown type.", 2124)); });
    });
  }
  private async $decode(blob: Blob, gen: number): Promise<void> {
    const bmp = await createImageBitmap(blob);
    if (gen !== this.$generation) return;
    player.defer(() => {
      if (gen !== this.$generation) return;
      const info = this.$info;
      const total = blob.size;
      info.$bytesLoaded = info.$bytesTotal = total;
      info.dispatchEvent(new ProgressEvent(ProgressEvent.PROGRESS, false, false, total, total));
      const bd = BitmapData.$fromImage(bmp, true);
      const content = new Bitmap(bd);
      info.$content = content;
      info.$width = bd.$w; info.$height = bd.$h;
      info.$contentType = blob.type || "image/png";
      super.addChildAt(content, 0);
      info.dispatchEvent(new Event(Event.INIT));
      info.dispatchEvent(new Event(Event.COMPLETE));
    });
  }
  private $reset(): void {
    this.$generation++;
    if (this.$info.$content) { const c = this.$info.$content; if (c.$parent === this) super.removeChild(c); }
    this.$info.$content = null;
    this.$info.$bytesLoaded = this.$info.$bytesTotal = 0;
  }
  unload(): void {
    const had = !!this.$info.$content;
    this.$reset();
    if (had) this.$info.dispatchEvent(new Event(Event.UNLOAD));
  }
  unloadAndStop(_gc: boolean = true): void { this.unload(); }
  close(): void { this.$generation++; }
}
flashClass(Loader, "flash.display.Loader");

// ------------------------------------------------------------ rendering
/**
 * Draws a display object and its subtree. `m` is the parent's concatenated
 * matrix (already including the device pixel ratio), `alpha` the inherited alpha.
 */
export function renderObject(ctx: CanvasRenderingContext2D, o: DisplayObject, pm: M6, palpha: number, forceMask = false): void {
  if (!o.$visible && !forceMask) return;
  // (drawn already, before the clip of the rectangles: drawPrefix)
  if (o === prefixDone && cullRects && !forceMask) return;
  if (o.$maskOwner && !forceMask) return;
  const alpha = palpha * o.$alpha;
  if (alpha <= 0 && !forceMask) return;
  const rd: RedrawRec | undefined = cullRects && !forceMask ? (o as any).$rd : undefined;
  // (an occluder reached: what is drawn from here on is over it)
  if (drawOccN && (o as any).$ioOcc && cullRects && !forceMask) reachDrawOcc(o);
  if (rd) {
    if (!rd.box || !hitsCull(rd.box)) return;
    // (19 October: where it is to be drawn again, a window drawn after it hides it (DisplayObject.ioOccludes): not drawn.
    // A hover in a window over a live yard drew the yard's picture under it again too, scaled from the whole yard,
    // the most of the Brimstone Pit's drawing)
    if (drawOccN && !drawOccAnc.has(o) && hiddenByOcc(rd.box)) return;
    // (outside the mask or scroll rectangle of what holds it: nothing of it shows; a dragged map's 224 cells were all
    // drawn, most of them clipped away)
    const c = cullClip, b = rd.box;
    // (2 px of slack: a clip's anti-aliased edge reaches past its box)
    if (c && (b[0] >= c[2] + 2 || b[2] <= c[0] - 2 || b[1] >= c[3] + 2 || b[3] <= c[1] - 2)) return;
  }
  const m = mul(pm, ...o.$matrix());
  let clipped = false;
  if (o.$scrollRect) {
    const r = o.$scrollRect;
    ctx.save(); clipped = true;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.beginPath(); ctx.rect(0, 0, r.width, r.height); ctx.clip();
  }
  const cm = o.$scrollRect ? mul(m, 1, 0, 0, 1, -o.$scrollRect.x, -o.$scrollRect.y) : m;
  if (o.$mask && o.$mask.$maskOwner === o) {
    if (!clipped) { ctx.save(); clipped = true; }
    applyMaskClip(ctx, o.$mask, pm, o);
  }
  const ct = o.$colorTransform;
  const tinted = ct && !ct.$isAlphaOnly;
  const outerClip = cullClip;
  if (rd && rd.clip) cullClip = outerClip ? clipBox(rd.clip, outerClip) ?? NOWHERE : rd.clip;
  try {
  if (!player.debug.noFilters && (tinted || o.$filters.length || (o.$blendMode !== "normal" && o.$blendMode !== "layer"))) {
    renderWithEffects(ctx, o, cm, alpha);
  } else if (o.$cacheAsBitmap && !o.$scale9 && !player.debug.noCache && cacheWorthwhile(o) && renderCached(ctx, o, cm, alpha)) {
    // drawn from its cached bitmap (cacheAsBitmap)
  } else if (o.$scale9 && o instanceof DisplayObjectContainer && isScaled(o) && withoutCull(() => shapeHooks.drawScale9(ctx, o, cm, alpha))) {
    // drawn with 9-slice scaling
  } else {
    o.$drawSelf(ctx, cm, alpha);
    if (o instanceof DisplayObjectContainer) renderChildren(ctx, o, cm, alpha);
  }
  } finally { cullClip = outerClip; }
  if (clipped) ctx.restore();
}

// ------------------------------------------------------------------------------------------ frame interpolation
/**
 * Frame interpolation (the page's settings: "Frame interpolation"). The game still runs at 40 frames a second;
 * between two of its frames the player shows `frames` more, made up: everything the game moved, scaled,
 * turned or faded during its frame is drawn part of the way from where it was to where it is now. So each
 * frame shows the game a fraction of a frame behind: the real frame at 1 / (frames + 1) of the way, the
 * made-up ones further, the last exactly where the game put it.
 *
 * While it is on, the transform setters note an object's values before its first change in a game frame
 * (ipNote); apply() puts the noted objects part of the way for one drawing, restore() puts them back at once,
 * so the game never sees an in-between value. Only objects that were on screen at the last drawing are
 * moved (a new one appears where it is), and not one that jumped (more than maxJump: put somewhere else).
 * The yard's own renderer (the game's Renderer.ts) does the same for what it draws, through `hook`.
 */
export const interp = {
  on: false,
  /** the game frame being noted (each real frame starts a new one) */
  tick: 0,
  list: [] as DisplayObject[],
  applied: [] as DisplayObject[],
  maxJump: 400,
  /** the game's yard renderer: hook(alpha, tick) draws the yard that far between its last two frames */
  hook: null as null | ((alpha: number, tick: number) => void),
  /** the share of the way the real frame is drawn at (1 / (frames + 1)); 1 when off */
  first: 1,
  frames: 0,
  /** real: game frames drawn; shown: all drawings; invented: made-up frames shown; skipped: made-up frames left out */
  stats: { real: 0, shown: 0, invented: 0, skipped: 0 },
  /** starts a game frame (the yard renderer hooks itself in again when it draws in it: none draws a yard
   *  that was not drawn this frame, or one that has gone, a disposed canvas) */
  begin(): void { this.tick++; this.list.length = 0; this.hook = null; },
  /** draws everything noted `a` of the way (0 = before the game frame, 1 = after it) */
  apply(a: number): void {
    if (a >= 1) return;
    const max = this.maxJump;
    for (const o of this.list) {
      const r = o as any;
      if (r.$ipT !== this.tick || !r.$ip0) continue;
      const s0 = r.$ip0 as number[];
      const x = o.$x, y = o.$y, sx = o.$sx, sy = o.$sy, kx = o.$skewX, ky = o.$skewY, al = o.$alpha;
      if (x === s0[0] && y === s0[1] && sx === s0[2] && sy === s0[3] && kx === s0[4] && ky === s0[5] && al === s0[6]) continue;
      if (Math.abs(x - s0[0]) + Math.abs(y - s0[1]) > max) continue;
      const c: number[] = r.$ipCur || (r.$ipCur = [0, 0, 0, 0, 0, 0, 0, 0]);
      c[0] = x; c[1] = y; c[2] = sx; c[3] = sy; c[4] = kx; c[5] = ky; c[6] = al; c[7] = o.$rotation;
      o.$x = s0[0] + (x - s0[0]) * a;
      o.$y = s0[1] + (y - s0[1]) * a;
      o.$sx = s0[2] + (sx - s0[2]) * a;
      o.$sy = s0[3] + (sy - s0[3]) * a;
      o.$skewX = s0[4] + angleStep(s0[4], kx) * a;
      o.$skewY = s0[5] + angleStep(s0[5], ky) * a;
      o.$alpha = s0[6] + (al - s0[6]) * a;
      o.$matrixCache = null;
      touch(o);
      this.applied.push(o);
    }
  },
  restore(): void {
    for (const o of this.applied) {
      const c = (o as any).$ipCur as number[];
      o.$x = c[0]; o.$y = c[1]; o.$sx = c[2]; o.$sy = c[3]; o.$skewX = c[4]; o.$skewY = c[5]; o.$alpha = c[6]; o.$rotation = c[7];
      o.$matrixCache = null;
      touch(o);
    }
    this.applied.length = 0;
  },
};
/** The shorter way round from angle a to b (radians). */
function angleStep(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
/** Notes o's transform before its first change in this game frame, if it was on screen at the last drawing. */
/** On screen at the last drawing: compared then, or inside a part stepped over unchanged (touch). */
function shownLast(o: DisplayObject, rd: RedrawRec): boolean {
  if (rd.ep === visitEpoch) return true;
  for (let d = o.$parent; d; d = d.$parent) {
    const r = (d as any).$rd as RedrawRec | undefined;
    if (!r) return false;
    if (r.ep === visitEpoch) return r.skip === visitEpoch;
  }
  return false;
}
function ipNote(o: DisplayObject): void {
  const r = o as any;
  if (r.$ipT === interp.tick) return;
  r.$ipT = interp.tick;
  const rd = r.$rd as RedrawRec | undefined;
  if (!rd || !rd.box || !shownLast(o, rd)) { r.$ip0 = null; return; }
  const s0: number[] = r.$ip0Store || (r.$ip0Store = [0, 0, 0, 0, 0, 0, 0]);
  s0[0] = o.$x; s0[1] = o.$y; s0[2] = o.$sx; s0[3] = o.$sy; s0[4] = o.$skewX; s0[5] = o.$skewY; s0[6] = o.$alpha;
  r.$ip0 = s0;
  interp.list.push(o);
}

// ------------------------------------------------------------------------------------------ redraw regions
// Like Flash Player's renderer, only the parts of the screen that changed are drawn again. Before each
// render, redrawRegions() walks the display list and compares every visible object with a record from
// the previous frame: its appearance signature, its screen matrix and its children. A changed object
// adds its old and new screen boxes to the damaged area; the renderer then clips to that area and skips
// every object whose box misses it. When nothing changed, nothing is drawn.

type Box = [number, number, number, number]; // x0, y0, x1, y1 in canvas pixels
interface RedrawRec { own: number; m: M6; box: Box | null; ownBox: Box | null; kids: DisplayObject[] | null; clean: boolean; bv?: number; ep?: number; skip?: number; clip?: Box | null; }
let cullRects: Box[] | null = null;
let damage: Box[] = [];
/** Strips a big bitmap had drawn again quietly (BitmapData.$noteSwept): repainted, kept apart from damage. */
let sweptDamage: Box[] = [];
/**
 * While the content of a container with a scrollRect or a mask is visited: the screen box it can show in. Damage
 * inside is clipped to it (7 October: a world moving inside the arcade's masked game area counted its whole size,
 * most of the screen, as damaged every frame, so everything was drawn again).
 */
let damageClip: Box | null = null;
function clipBox(b: Box | null, c: Box | null): Box | null {
  if (!b || !c) return b;
  const r: Box = [Math.max(b[0], c[0]), Math.max(b[1], c[1]), Math.min(b[2], c[2]), Math.min(b[3], c[3])];
  return r[2] > r[0] && r[3] > r[1] ? r : null;
}
/** Changes seen this visit, kept or clipped away (a record is "clean" only if none happened inside it). */
let damageSeen = 0;
function pushDamage(b: Box | null, uncut = false): void {
  if (b) damageSeen++;
  const c = damageClip ? clipBox(b, damageClip) : b;
  if (!c) return;
  // (on a window already reached: drawn over it, so it shows there)
  for (const f of frameOcc) if (!f.pending) { const o = clipBox(c, f.box); if (o) f.over = unionBox(f.over, o); }
  // (13 October: `uncut`, a child gone or moved in its parent's order, whose place among the windows is not known: it
  // may have been over one (a menu over Who's Online), and what it covered must be drawn again, the window too)
  if (pendingOcc.length && !uncut) { for (const p of hiddenCut(c)) damage.push(p); return; }
  damage.push(c);
}

// ---- occluders (DisplayObject.ioOccludes): opaque rectangles over what is drawn before them
const occluders = new Set<DisplayObject>();
/** This frame's occluders not visited yet (so above the object being visited), with their screen boxes. */
let pendingOcc: { o: DisplayObject; box: Box }[] = [];
/** All of this frame's occluders: still to be reached or not, and what changed on top of each once reached. */
let frameOcc: { o: DisplayObject; box: Box; pending: boolean; over: Box | null }[] = [];
function collectOccluders(base: M6): void {
  pendingOcc = [];
  if (player.debug.noOccluders) return;
  for (const o of occluders) {
    const r: Rectangle | null = (o as any).$ioOcc;
    // (13 October) a window closed (off the stage) is let go, so closed windows are not kept for the whole session;
    // one put back on the stage joins again when it is next visited (visitRedraw)
    if (!r || !o.stage) { occluders.delete(o); continue; }
    let ok = true;
    for (let d: DisplayObject | null = o; d; d = d.$parent) {
      if (!d.$visible || d.$alpha < 0.999 || d.$mask || d.$scrollRect || d.$maskOwner || (d.$blendMode !== "normal" && d.$blendMode !== "layer")) { ok = false; break; }
    }
    if (!ok) continue;
    const m = mul(base, ...o.$globalMatrix());
    if (Math.abs(m[1]) > 1e-6 || Math.abs(m[2]) > 1e-6) continue; // (turned: its box is not the rectangle)
    const b = toBox(boundsOf(r, m));
    // (1 px in from its edges: anti-aliasing)
    if (b && b[2] - b[0] > 4 && b[3] - b[1] > 4) pendingOcc.push({ o, box: [b[0] + 1, b[1] + 1, b[2] - 1, b[3] - 1] });
  }
  frameOcc = pendingOcc.map((p) => ({ o: p.o, box: p.box, pending: true, over: null }));
}
/**
 * b less what the occluders above it hide: the parts still seen (none when all of it is hidden; up to four bands round
 * an occluder in its middle: a change over the whole yard, under a window, is drawn again only round the window).
 */
/**
 * The occluders at or inside o reached (13 October): what is drawn after them is over them. Called for o visited, and
 * for o stepped over unchanged (visitRedraw's skip): a window that did not change was never visited, and stayed
 * "above" everything drawn after it, so a message or a second window opened over a still window was not drawn there.
 */
function reachOccluders(o: DisplayObject): void {
  const inside = (p: DisplayObject): boolean => { for (let d: DisplayObject | null = p; d; d = d.$parent) if (d === o) return true; return false; };
  const reached = pendingOcc.filter((p) => inside(p.o));
  if (!reached.length) return;
  pendingOcc = pendingOcc.filter((p) => !reached.includes(p));
  for (const f of frameOcc) if (reached.some((p) => p.o === f.o)) f.pending = false;
}
function hiddenCut(b: Box): Box[] {
  return cutBy(b, pendingOcc.map((p) => p.box));
}
function cutBy(b: Box, hide: Box[]): Box[] {
  let parts: Box[] = [b];
  for (const h of hide) {
    const next: Box[] = [];
    for (const c of parts) {
      if (h[0] >= c[2] || h[2] <= c[0] || h[1] >= c[3] || h[3] <= c[1]) { next.push(c); continue; }
      // above, below, then left and right of it in the rows between
      if (h[1] > c[1]) next.push([c[0], c[1], c[2], h[1]]);
      if (h[3] < c[3]) next.push([c[0], h[3], c[2], c[3]]);
      const y0 = Math.max(c[1], h[1]), y1 = Math.min(c[3], h[3]);
      if (h[0] > c[0]) next.push([c[0], y0, h[0], y1]);
      if (h[2] < c[2]) next.push([h[2], y0, c[2], y1]);
    }
    parts = next;
    if (!parts.length) break;
  }
  return parts;
}
const NOWHERE: Box = [0, 0, 0, 0];
/** The screen box a container's content can show in (its scrollRect and its mask), or null for anywhere. */
function ownClip(o: DisplayObject, m: M6): Box | null {
  let c: Box | null = null;
  const sr = o.$scrollRect;
  if (sr) c = toBox(boundsOf(new Rectangle(0, 0, sr.width, sr.height), m)) ?? NOWHERE;
  const mk = o.$mask;
  if (mk && mk.$maskOwner === o) {
    const mm = mul(mul(m, ...invert(o.$globalMatrix())), ...mk.$globalMatrix());
    const mb = toBox(mk.$boundsIn(mm, true)) ?? NOWHERE;
    c = c ? clipBox(c, mb) ?? NOWHERE : mb;
  }
  return c;
}

// ---- (19 October) occluders while drawing: what is drawn before a window, where the window hides it, is left out
/** This drawing's occluders (redrawRegions' list), whether each is still ahead in the drawing order; their parents. */
let drawOcc: { o: DisplayObject; box: Box; ahead: boolean }[] = [];
let drawOccN = 0;
let drawOccAnc = new Set<DisplayObject>();
function setDrawOcc(list: { o: DisplayObject; box: Box }[]): void {
  drawOcc = player.debug.noOccluders ? [] : list.map((f) => ({ o: f.o, box: f.box, ahead: true }));
  drawOccN = drawOcc.length;
  drawOccAnc = new Set();
  for (const f of drawOcc) for (let d: DisplayObject | null = f.o.$parent; d; d = d.$parent) drawOccAnc.add(d);
}
/** The occluders all ahead again: a drawing in parts goes through the display list once for each part. */
export function rearmDrawOcc(): void {
  for (const f of drawOcc) f.ahead = true;
  drawOccN = drawOcc.length;
}
/** All of r (canvas pixels) inside one of this drawing's occluders. */
export function occludedRect(r: Box): boolean {
  for (const f of drawOcc) if (r[0] >= f.box[0] && r[1] >= f.box[1] && r[2] <= f.box[2] && r[3] <= f.box[3]) return true;
  return false;
}
function reachDrawOcc(o: DisplayObject): void {
  for (const f of drawOcc) if (f.ahead && f.o === o) { f.ahead = false; drawOccN--; }
}
/** Every part of b to be drawn again (b in the cull rectangles, with their slack) lies inside an occluder still ahead. */
function hiddenByOcc(b: Box): boolean {
  let any = false;
  for (const r of cullRects!) {
    const x0 = Math.max(b[0], r[0] - 2), y0 = Math.max(b[1], r[1] - 2), x1 = Math.min(b[2], r[2] + 2), y1 = Math.min(b[3], r[3] + 2);
    if (x1 <= x0 || y1 <= y0) continue;
    any = true;
    let inside = false;
    for (const f of drawOcc) if (f.ahead && x0 >= f.box[0] && y0 >= f.box[1] && x1 <= f.box[2] && y1 <= f.box[3]) { inside = true; break; }
    if (!inside) return false;
  }
  return any;
}

// ---- (19 October) the yard's picture first, outside the clip of all the rectangles
// A partial redraw of several rectangles draws through one clip of them all, and the browser masks every picture drawn
// through such a clip: each piece of the yard's 4000 x 2000 picture under 20 ember squares in the Brimstone Pit cost
// 70 µs, the most of its drawing. When that picture is the first thing drawn in every rectangle (nothing but the
// background under it, reached through plain containers), its pieces are drawn first, each through a clip of its own
// rectangle alone (for nothing), and everything else after it through the clip of them all, as before.
let prefixDone: DisplayObject | null = null;
function plainForPrefix(o: DisplayObject): boolean {
  const ct = o.$colorTransform;
  return o.$alpha >= 0.999 && !o.$filters.length && (!ct || ct.$isAlphaOnly && ct.alphaMultiplier >= 0.999 && !ct.alphaOffset) && (o.$blendMode === "normal" || o.$blendMode === "layer") && !o.$mask && !o.$scrollRect && !o.$cacheAsBitmap && !o.$scale9 && !o.$clipDepth;
}
/** The big picture drawn first: a Bitmap ($clipsItself), null nothing drawn in the subtree, false something else first. */
function firstDrawn(o: DisplayObject): Bitmap | null | false {
  if (!o.$visible || o.$alpha <= 0 || o.$maskOwner) return null;
  const rd = (o as any).$rd as RedrawRec | undefined;
  if (!rd || !rd.box) return rd ? null : false;
  if (!hitsCull(rd.box)) return null;
  if (!plainForPrefix(o)) return false;
  if (o instanceof Bitmap) return o.$clipsItself(rd.m) ? o : false;
  if (!(o instanceof DisplayObjectContainer)) return false;
  const g = (o as any).$graphics;
  if (g && !g.$isEmpty && (!rd.ownBox || hitsCull(rd.ownBox))) return false;
  for (const k of o.$children) {
    if (k.$clipDepth > 0) return false;
    const r = firstDrawn(k);
    if (r !== null) return r;
  }
  return null;
}
/** With the cull rectangles set: the picture to draw first, or null (none: drawn as before). */
export function findPrefix(root: DisplayObjectContainer): Bitmap | null {
  if (!cullRects || player.debug.noPrefix) return null;
  return firstDrawn(root) || null;
}
/** Its pieces, each clipped to its rectangle alone (none where a window drawn later hides all of the rectangle). */
export function drawPrefix(ctx: CanvasRenderingContext2D, o: Bitmap): void {
  const rd = (o as any).$rd as RedrawRec;
  for (const r of cullRects!) {
    let hidden = false;
    for (const f of drawOcc) if (r[0] >= f.box[0] && r[1] >= f.box[1] && r[2] <= f.box[2] && r[3] <= f.box[3]) { hidden = true; break; }
    if (hidden) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.clip();
    o.$drawPiece(ctx, rd.m, o.$alpha, r);
    ctx.restore();
  }
  prefixDone = o;
}
export function endPrefix(): void { prefixDone = null; }

function hitsCull(b: Box): boolean {
  // (2 px of slack: an edge on a box's border is anti-aliased into the pixel past it; a box ending on row 38 left a
  // redrawn rectangle starting there without the shade of that row)
  for (const r of cullRects!) if (b[0] < r[2] + 2 && b[2] > r[0] - 2 && b[1] < r[3] + 2 && b[3] > r[1] - 2) return true;
  return false;
}
function withoutCull<T>(fn: () => T): T {
  const saved = cullRects, savedClip = cullClip;
  cullRects = null; cullClip = null;
  try { return fn(); } finally { cullRects = saved; cullClip = savedClip; }
}
function toBox(r: Rectangle | null): Box | null {
  return r && r.width > 0 && r.height > 0 ? [r.x, r.y, r.x + r.width, r.y + r.height] : null;
}
function unionBox(a: Box | null, b: Box | null): Box | null {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
function sameMatrix(a: M6, b: M6): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
}
function sameKids(a: DisplayObject[], b: DisplayObject[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Everything about an object's own appearance except its position (compared as a matrix) and children. */
function ownSig(o: DisplayObject): number {
  const saved = sigH;
  sigH = 0x2545f491;
  mixSig(o.$visible ? 1 : 2); mixSig(o.$alpha * 256); mixSig(o.$clipDepth);
  const bm = o.$blendMode; mixSig(bm.length * 31 + bm.charCodeAt(0));
  const f = o.$filters;
  mixSig(f.length);
  for (const x of f) for (const k in x) { const v = (x as any)[k]; if (typeof v === "number") mixSig(v * 16); else if (typeof v === "boolean") mixSig(v ? 3 : 5); }
  const ct = o.$colorTransform;
  if (ct) { mixSig(ct.redMultiplier * 256); mixSig(ct.greenMultiplier * 256); mixSig(ct.blueMultiplier * 256); mixSig(ct.alphaMultiplier * 256); mixSig(ct.redOffset); mixSig(ct.greenOffset); mixSig(ct.blueOffset); mixSig(ct.alphaOffset); }
  const g = (o as any).$graphics;
  if (g) mixSig(g.$ver);
  const tv = (o as any).$renderVersion;
  if (tv !== undefined) { mixSig(tv); const l = (o as any).$text; if (l) mixSig(l.length * 7 + (l.charCodeAt(0) || 0)); }
  const bd = (o as any).$bitmapData;
  // (a bitmap that logs its changes: those are damaged in visitRedraw, only where they are)
  if (bd) { if (!bd.$track) mixSig(bd.$version + 1); mixSig(bd.$w * 3 + bd.$h); mixSig(bd.$uid); }
  if (o instanceof SimpleButton) { mixSig(o.$state === "up" ? 1 : o.$state === "over" ? 2 : 3); const c = o.$current(); if (c) mixSig(subtreeSig(c, 5)); }
  if (o.$mask) mixSig(subtreeSig(o.$mask, 7));
  const sr = o.$scrollRect;
  if (sr) { mixSig(sr.x * 20); mixSig(sr.y * 20); mixSig(sr.width * 20); mixSig(sr.height * 20); }
  if (o.$scale9) mixSig(9);
  const r = sigH;
  sigH = saved;
  return r;
}

/**
 * Visits o with screen matrix m and returns its subtree's screen box. With record=true it only stores
 * records (after a change, or on a full redraw); otherwise differences from the stored records are
 * added to `damage`.
 */
/** Screen matrix of child k under cm, reusing k's recorded array when unchanged (no allocation). */
function childMatrix(cm: M6, k: DisplayObject): M6 {
  const l = k.$matrix();
  const a = cm[0] * l[0] + cm[2] * l[1], b = cm[1] * l[0] + cm[3] * l[1];
  const c = cm[0] * l[2] + cm[2] * l[3], d = cm[1] * l[2] + cm[3] * l[3];
  const tx = cm[0] * l[4] + cm[2] * l[5] + cm[4], ty = cm[1] * l[4] + cm[3] * l[5] + cm[5];
  const p = ((k as any).$rd as RedrawRec | undefined)?.m;
  if (p && p[0] === a && p[1] === b && p[2] === c && p[3] === d && p[4] === tx && p[5] === ty) return p;
  return [a, b, c, d, tx, ty];
}
function shiftBox(b: Box | null, dx: number, dy: number): Box | null {
  return b && [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy];
}

function visitRedraw(o: DisplayObject, m: M6, record: boolean, cur: boolean): Box | null {
  let rd: RedrawRec | undefined = (o as any).$rd;
  // (an occluder reached: what comes from here on is drawn over it, not hidden by it)
  if ((o as any).$ioOcc) {
    if (!occluders.has(o)) occluders.add(o);
    if (pendingOcc.length) reachOccluders(o);
  }
  if (o.$maskOwner) { if (rd) rd.box = null; return null; } // masks are not drawn; their changes show in the owner's signature
  const own = ownSig(o);
  player.debug.walk.visited++;
  // a pure move (same appearance, same scale/rotation): recorded boxes can be shifted, not recomputed
  const pm = rd?.m;
  const moved = !!rd && rd.own === own && !!pm && pm[0] === m[0] && pm[1] === m[1] && pm[2] === m[2] && pm[3] === m[3];
  const mdx = moved ? m[4] - pm![4] : 0, mdy = moved ? m[5] - pm![5] : 0;
  if (!record && (!rd || rd.own !== own || !sameMatrix(rd.m, m))) {
    // (why, for the damage log: taken before the visit below records the new look)
    const why = !rd ? "new" : rd.own !== own ? "look" : "moved";
    if (rd) pushDamage(rd.box);
    const b = visitRedraw(o, m, true, false);
    pushDamage(b);
    // (__player.debug.damageLog = []: what was drawn again, and why; a test tool)
    if (player.debug.damageLog && b) player.debug.damageLog.push([damageName(o), b.map(Math.round), why]);
    return b;
  }
  // A big bitmap drawn in the same place whose pixels changed in places: only those places are damaged.
  let bmChanged = false;
  const tb = (o as any).$bitmapData as BitmapData | null | undefined;
  if (!record && rd && tb && tb.$track && rd.bv !== tb.$version) {
    bmChanged = true;
    const boxes = rd.bv === undefined ? null : tb.$dirtySince(rd.bv);
    if (!boxes) { if (rd.box) { pushDamage(rd.box); if (player.debug.damageLog) player.debug.damageLog.push([damageName(o), rd.box.map(Math.round), "all pixels"]); } }
    else if (rd.box) {
      for (const b of boxes) {
        const s = toBox(boundsOf(new Rectangle(b[0], b[1], b[2] - b[0], b[3] - b[1]), m));
        if (!s) continue;
        const x0 = Math.max(s[0], rd.box[0]), y0 = Math.max(s[1], rd.box[1]), x1 = Math.min(s[2], rd.box[2]), y1 = Math.min(s[3], rd.box[3]);
        if (x1 > x0 && y1 > y0) {
          pushDamage([x0, y0, x1, y1]);
          if (player.debug.damageLog) player.debug.damageLog.push([damageName(o), [x0, y0, x1, y1].map(Math.round), "pixels"]);
        }
      }
    }
  }
  // strips it had drawn again (the yard's sweep): repainted on screen, apart (see redrawRegions)
  if (tb && tb.$swept && tb.$swept.length) {
    const l = tb.$swept;
    if (!record && rd && rd.box) {
      for (let i = 0; i < l.length; i += 4) {
        const sb = toBox(boundsOf(new Rectangle(l[i], l[i + 1], l[i + 2] - l[i], l[i + 3] - l[i + 1]), m));
        if (!sb) continue;
        const x0 = Math.max(sb[0], rd.box[0]), y0 = Math.max(sb[1], rd.box[1]), x1 = Math.min(sb[2], rd.box[2]), y1 = Math.min(sb[3], rd.box[3]);
        // (what an occluder above it hides is not repainted either)
        if (x1 > x0 && y1 > y0) { if (pendingOcc.length) sweptDamage.push(...hiddenCut([x0, y0, x1, y1])); else sweptDamage.push([x0, y0, x1, y1]); }
      }
    }
    l.length = 0;
  }
  if (!rd) { rd = { own, m, box: null, ownBox: null, kids: null, clean: false }; (o as any).$rd = rd; }
  rd.ep = visitEpoch;
  if (tb) { rd.bv = tb.$version; noteShown(tb, o); }
  const damageBefore = damageSeen;
  rd.own = own; rd.m = m;
  if (!o.$visible || o.$alpha <= 0) { rd.box = null; rd.kids = null; rd.clean = false; return null; }
  if (!(o instanceof DisplayObjectContainer)) {
    if (record) rd.ownBox = moved && rd.box ? shiftBox(rd.ownBox, mdx, mdy) : toBox(o.$boundsIn(m, true));
    rd.box = padBox(o, rd.ownBox);
    rd.clean = !record && !bmChanged;
    return rd.box;
  }
  if (record) {
    if (moved && rd.box) rd.ownBox = shiftBox(rd.ownBox, mdx, mdy);
    else {
      const g = (o as any).$graphics;
      rd.ownBox = g && !g.$isEmpty ? toBox(boundsOf(g.$localBounds(true), m)) : null;
    }
  }
  const kids = o.$children;
  // (its content's damage clipped to where it can show)
  const clip = o.$scrollRect || o.$mask ? ownClip(o, m) : null;
  const outerClip = damageClip;
  if (clip) damageClip = outerClip ? clipBox(clip, outerClip) ?? NOWHERE : clip;
  rd.clip = clip;
  const oldKids = rd.kids, same = !!oldKids && sameKids(oldKids, kids);
  let was: Set<DisplayObject> | null = null;
  if (!record && oldKids && !same) {
    const now = new Set(kids);
    for (const k of oldKids) if (!now.has(k)) { const kb = (k as any).$rd?.box; if (kb) { pushDamage(kb, true); if (player.debug.damageLog) player.debug.damageLog.push([damageName(k), kb.map(Math.round), "gone"]); } }
    was = new Set(oldKids);
    const before = oldKids.filter((k) => now.has(k)), after = kids.filter((k) => was!.has(k));
    if (!sameKids(before, after)) for (const k of after) { const kb = (k as any).$rd?.box; if (kb) { pushDamage(kb, true); if (player.debug.damageLog) player.debug.damageLog.push([damageName(k), kb.map(Math.round), "order"]); } }
  }
  if (record || !same) rd.kids = kids.slice();
  const sr = o.$scrollRect;
  const cm = sr ? mul(m, 1, 0, 0, 1, -sr.x, -sr.y) : m;
  let box = rd.ownBox;
  // (a child drawn last time, unmarked since (touch) and in the same place: its records still hold, stepped over)
  const canSkip = !record && cur && !player.debug.noSkip;
  const check = player.debug.skipCheck;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    const km = childMatrix(cm, k);
    const kcur = canSkip && (same || (!!was && was.has(k)));
    if (kcur && k.$dk !== visitEpoch) {
      const kr = (k as any).$rd as RedrawRec | undefined;
      if (kr && kr.m === km) {
        kr.ep = visitEpoch; kr.skip = visitEpoch; kr.clean = true;
        player.debug.walk.skipped++;
        if (pendingOcc.length) reachOccluders(k);
        if (check && check.length < 200) { const why = staleIn(k, km); if (why) check.push(why); }
        box = unionBox(box, kr.box);
        continue;
      }
    }
    if (player.debug.visitLog && !record && player.debug.visitLog.length < 20000) player.debug.visitLog.push(damageName(k) + (!kcur ? " | not drawn last" : k.$dk === visitEpoch ? " | marked" : !(k as any).$rd ? " | new" : " | moved"));
    box = unionBox(box, visitRedraw(k, km, record, kcur));
  }
  damageClip = outerClip;
  if (box && clip) box = clipBox(box, clip);
  rd.box = padBox(o, box);
  // "clean": compared (not re-recorded) this frame and nothing inside it changed; a cached layer of it
  // is then still valid without recomputing its content signature
  rd.clean = !record && damageSeen === damageBefore;
  return rd.box;
}
/** skipCheck: why a part stepped over had in fact changed (a change that did not call touch), or null. */
function staleIn(o: DisplayObject, m: M6): string | null {
  if (o.$maskOwner) return null;
  const rd = (o as any).$rd as RedrawRec | undefined;
  if (!rd) return damageName(o) + ": no record";
  // (hidden: only that it was hidden when compared matters)
  if (!o.$visible || o.$alpha <= 0) return rd.box ? damageName(o) + ": hidden" : null;
  if (!sameMatrix(rd.m, m)) return damageName(o) + ": moved";
  let own = ownSig(o);
  // (a text field laid out since it was compared: the same look, its version off by the layout alone)
  if (own !== rd.own && (o as any).$lay) { const l = (o as any).$lay; (o as any).$lay = null; own = ownSig(o); (o as any).$lay = l; }
  if (own !== rd.own) return damageName(o) + ": look";
  const tb = (o as any).$bitmapData as BitmapData | null | undefined;
  if (tb && tb.$track && rd.bv !== tb.$version) return damageName(o) + ": pixels";
  if (tb && tb.$swept && tb.$swept.length) return damageName(o) + ": swept";
  if (!o.$visible || o.$alpha <= 0 || !(o instanceof DisplayObjectContainer)) return null;
  const kids = o.$children;
  if (!rd.kids || !sameKids(rd.kids, kids)) return damageName(o) + ": children";
  const sr = o.$scrollRect;
  const cm = sr ? mul(m, 1, 0, 0, 1, -sr.x, -sr.y) : m;
  for (const k of kids) { const r = staleIn(k, childMatrix(cm, k)); if (r) return r; }
  return null;
}
function damageName(o: DisplayObject): string {
  const path: string[] = [];
  for (let d: DisplayObject | null = o; d && path.length < 4; d = d.$parent) path.push(`${d.constructor?.name ?? "?"}${d.$name ? "(" + d.$name + ")" : ""}`);
  return path.join(" < ");
}
function padBox(o: DisplayObject, b: Box | null): Box | null {
  // (a text field drawn from its cached canvas lands on whole pixels: up to 2 px past its exact box)
  if (b && (o as any).$drawText) b = [b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2];
  if (!b || !o.$filters.length) return b;
  let pad = 0;
  for (const f of o.$filters) pad = Math.max(pad, (f.$padding?.() ?? 0) * player.dpr);
  return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
}

/**
 * Updates the records of the whole display list and returns the damaged rectangles (canvas pixels,
 * merged), [] when nothing changed, or null when everything must be drawn (full=true, or when most of
 * the canvas changed).
 */
export function redrawRegions(root: DisplayObjectContainer, base: M6, width: number, height: number, full: boolean): Box[] | null {
  for (const h of redrawHooks) h();
  visitEpoch++;
  damage = [];
  sweptDamage = [];
  collectOccluders(base);
  const occ = frameOcc;
  visitRedraw(root, base, full, !!(root as any).$rd);
  pendingOcc = [];
  frameOcc = [];
  setDrawOcc(occ);
  if (full) return null;
  let rects = mergeDamage(width, height);
  // Too much changed to draw it in parts, but windows hide some of the screen: everything round them, and of what is
  // under them only what changed on them (what is drawn before them was taken out already), not the whole screen
  // again with the windows on it (12 October: a busy yard drew the whole screen every fourth frame, the Quest Book
  // with it).
  let round = false;
  if (rects === null && occ.length) { rects = roundOccluders(occ, width, height); round = rects !== null; }
  // (__player.debug.fullWhy = []: why a frame was drawn whole; a test tool)
  if (rects === null && player.debug.fullWhy) { let a = 0; for (const d of damage) a += (d[2] - d[0]) * (d[3] - d[1]); player.debug.fullWhy.push([damage.length, Math.round(a / (width * height) * 100)]); }
  if (rects === null) return null;
  // the swept strips: added after the merging and the "most of the screen" test, which they would tip
  // into repainting everything (a strip is the width of the yard); they only need repainting
  // (drawn round the windows: those parts already hold every strip outside them, and one drawn again over them
  // would draw what is see-through there twice)
  if (round) return rects;
  // (less what the other parts already hold: a strip over one of them drew what is see-through there twice, a
  // darker patch, put right only by the next whole frame; 12 October)
  for (const d of sweptDamage) {
    const r: Box = [Math.max(0, Math.floor(d[0])), Math.max(0, Math.floor(d[1])), Math.min(width, Math.ceil(d[2])), Math.min(height, Math.ceil(d[3]))];
    if (r[2] > r[0] && r[3] > r[1]) for (const p of cutBy(r, rects.slice())) rects.push(p);
  }
  return rects;
}
function roundOccluders(occ: { box: Box; over: Box | null }[], width: number, height: number): Box[] | null {
  // (whole pixels, the same on both sides of every edge: the parts must not overlap, or what is drawn see-through in
  // two of them is drawn twice, darker; the occluders are 1 px in from their windows' edges already)
  const R = (b: Box): Box => [Math.max(0, Math.round(b[0])), Math.max(0, Math.round(b[1])), Math.min(width, Math.round(b[2])), Math.min(height, Math.round(b[3]))];
  const hide = occ.map((f) => R(f.box));
  const out: Box[] = cutBy([0, 0, width, height], hide);
  // what changed on top of the windows (drawn after them), inside them: apart from the parts round them
  occ.forEach((f, i) => { if (f.over) { const o = clipBox([f.over[0] - 2, f.over[1] - 2, f.over[2] + 2, f.over[3] + 2], hide[i]); if (o) out.push(R(o)); } });
  const rects: Box[] = [];
  let area = 0;
  for (const r of out) if (r[2] > r[0] && r[3] > r[1]) { rects.push(r); area += (r[2] - r[0]) * (r[3] - r[1]); }
  // (two windows over each other: their parts might overlap; then drawn whole, as before)
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) return null;
  }
  // (the windows hide little of it: drawn whole, as before)
  return area > width * height * 0.85 ? null : rects;
}
function mergeDamage(width: number, height: number): Box[] | null {
  if (!damage.length) return [];
  // clamp, grow by 2 px for anti-aliasing, snap outwards to whole pixels
  let rects: Box[] = [];
  for (const d of damage) {
    const r: Box = [Math.max(0, Math.floor(d[0]) - 2), Math.max(0, Math.floor(d[1]) - 2), Math.min(width, Math.ceil(d[2]) + 2), Math.min(height, Math.ceil(d[3]) + 2)];
    if (r[2] > r[0] && r[3] > r[1]) rects.push(r);
  }
  // Many small changes spread over the screen (a battle: every monster; the yard's own changes, one box per
  // thing it drew) become the 32-pixel tiles they touch, then rows of touched tiles joined downwards where
  // they match: only what changed is drawn, and no frame merges hundreds of boxes pairwise. (They were
  // grouped into one box for each 4 x 4 part of the screen: in a busy yard those covered most of it, so
  // every other frame was drawn whole; fps pass, 4 October.)
  // (When the tiles cover most of the screen but the changes themselves don't, finer tiles are tried before the
  // whole screen is drawn: on a slow machine several game frames' changes land in one drawing, and a busy yard's
  // 50 small changes, 32-pixel tiles each, tipped every frame into a whole-screen redraw, slower still.)
  if (rects.length > 16) {
    for (let t = rects.length > 600 ? 64 : 32; t >= 16; t /= 2) {
      const tiled = tileRects(rects, width, height, t);
      let area = 0;
      for (const r of tiled) area += (r[2] - r[0]) * (r[3] - r[1]);
      if (area <= width * height * 0.6) return tiled;
    }
    return null;
  }
  // merge overlapping rectangles until no two overlap; too many small ones become one
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]) {
        rects[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
        rects.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  if (rects.length > 16) rects = [rects.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])];
  let area = 0;
  for (const r of rects) area += (r[2] - r[0]) * (r[3] - r[1]);
  return area > width * height * 0.6 ? null : rects;
}
let tileMask = new Uint8Array(0);
/** Boxes -> the t-pixel tiles they touch -> runs of tiles in each row, a run joined to the same run below. */
function tileRects(rects: Box[], width: number, height: number, t: number): Box[] {
  const cols = Math.ceil(width / t), rows = Math.ceil(height / t);
  if (tileMask.length < cols * rows) tileMask = new Uint8Array(cols * rows);
  const mask = tileMask;
  let minR = rows, maxR = -1, minC = cols, maxC = -1;
  for (const r of rects) {
    const c0 = Math.max(0, Math.floor(r[0] / t)), c1 = Math.min(cols - 1, Math.floor((r[2] - 1) / t));
    const r0 = Math.max(0, Math.floor(r[1] / t)), r1 = Math.min(rows - 1, Math.floor((r[3] - 1) / t));
    if (c1 < c0 || r1 < r0) continue;
    if (c0 < minC) minC = c0; if (c1 > maxC) maxC = c1; if (r0 < minR) minR = r0; if (r1 > maxR) maxR = r1;
    for (let y = r0; y <= r1; y++) mask.fill(1, y * cols + c0, y * cols + c1 + 1);
  }
  const out: Box[] = [];
  let open = new Map<number, Box>();
  for (let y = minR; y <= maxR; y++) {
    const next = new Map<number, Box>();
    for (let x = minC; x <= maxC; x++) {
      if (!mask[y * cols + x]) continue;
      const run = x;
      while (x <= maxC && mask[y * cols + x]) { mask[y * cols + x] = 0; x++; }
      const key = run * 65536 + x;
      let b = open.get(key);
      if (b) b[3] = Math.min(height, (y + 1) * t);
      else { b = [run * t, y * t, Math.min(width, x * t), Math.min(height, (y + 1) * t)]; out.push(b); }
      next.set(key, b);
    }
    open = next;
  }
  return out;
}
/** While set, renderObject skips objects whose recorded box misses these rectangles. */
export function setCullRects(r: Box[] | null): void { cullRects = r; cullClip = null; if (!r) { drawOcc = []; drawOccN = 0; } }
/** While drawing what a mask or scroll rectangle holds: the screen box it can show in (its record's clip). */
let cullClip: Box | null = null;

function isScaled(o: DisplayObject): boolean {
  const [a, b, c, d] = o.$matrix();
  return Math.abs(a * a + b * b - 1) > 1e-6 || Math.abs(c * c + d * d - 1) > 1e-6;
}

/** Children in order; a timeline mask layer (clipDepth) clips the siblings up to its clip depth. */
export function renderChildren(ctx: CanvasRenderingContext2D, o: DisplayObjectContainer, m: M6, alpha: number): void {
  const kids = o.$children;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c.$clipDepth > 0 && c.$depth !== undefined) {
      ctx.save();
      const path = new Path2D();
      collectClip(c, mul(m, ...c.$matrix()), path);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clip(path);
      let j = i + 1;
      for (; j < kids.length; j++) {
        const k = kids[j];
        if (k.$depth === undefined || k.$depth > c.$clipDepth) break;
        renderObject(ctx, k, m, alpha);
      }
      ctx.restore();
      i = j - 1;
      continue;
    }
    renderObject(ctx, c, m, alpha);
  }
}

/** Clips to the mask's filled shapes; the mask is placed by its own parent chain, in the same surface space as `pm`. */
function applyMaskClip(ctx: CanvasRenderingContext2D, mask: DisplayObject, pm: M6, owner: DisplayObject): void {
  const surface = mul(pm, ...invert(owner.$parent ? owner.$parent.$globalMatrix() : IDENT));
  const path = new Path2D();
  collectClip(mask, mul(surface, ...mask.$globalMatrix()), path);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clip(path);
}
function domToM6(d: DOMMatrix): M6 { return [d.a, d.b, d.c, d.d, d.e, d.f]; }
function collectClip(o: DisplayObject, m: M6, path: Path2D): void {
  const dm = new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]);
  if (o.$shapeDef) for (const p of shapeHooks.clipPaths(o.$shapeDef)) path.addPath(p, dm);
  if (o instanceof Sprite || o instanceof Shape) for (const p of o.$graphics.$clipPaths()) path.addPath(p, dm);
  else if (!o.$shapeDef) {
    const b = o.$selfBounds(false);
    if (b) { const r = new Path2D(); r.rect(b.x, b.y, b.width, b.height); path.addPath(r, dm); }
  }
  if (o instanceof DisplayObjectContainer) for (const c of o.$children) if (c.$visible) collectClip(c, mul(m, ...c.$matrix()), path);
}

/** Cheap signature of everything that affects how a subtree renders. */
/**
 * Signature of everything that affects a cached layer's pixels. The root's own transform and alpha are
 * left out (the cache compares the drawing matrix and applies alpha when compositing); hidden children
 * count only as hidden, so clips that keep playing inside them do not invalidate the layer.
 */
// One running hash and an inlineable mixer: this walk runs over every cached subtree each frame, so it
// must not allocate (a closure per node made it the most expensive part of the map room).
let sigH = 0;
function mixSig(v: number): void { sigH = (Math.imul(sigH ^ (v | 0), 0x01000193) + ((v * 4099) | 0)) | 0; }
function sigNode(o: DisplayObject, root: boolean): void {
  mixSig(o.$uid);
  if (!root) {
    if (!o.$visible && !o.$clipDepth) { mixSig(2); return; }
    mixSig(o.$x * 20); mixSig(o.$y * 20); mixSig(o.$sx * 65536); mixSig(o.$sy * 65536); mixSig(o.$skewX * 65536); mixSig(o.$skewY * 65536);
    mixSig(o.$alpha * 256);
  }
  if (o.$filters.length) mixSig(o.$filters.length + 11);
  if (o.$clipDepth) mixSig(o.$clipDepth + 13);
  const ct = o.$colorTransform;
  if (ct) { mixSig(ct.redMultiplier * 256); mixSig(ct.greenMultiplier * 256); mixSig(ct.blueMultiplier * 256); mixSig(ct.redOffset); mixSig(ct.greenOffset); mixSig(ct.blueOffset); mixSig(ct.alphaOffset); }
  const g = (o as any).$graphics;
  if (g) mixSig(g.$ver);
  const tv = (o as any).$renderVersion;
  if (tv !== undefined) { mixSig(tv); const l = (o as any).$text; if (l) mixSig(l.length * 7 + (l.charCodeAt(0) || 0)); }
  const bd = (o as any).$bitmapData;
  // (which bitmap too: a Bitmap given another picture of the same size, as a slot reel's symbols are,
  // kept showing the old one under a glow)
  if (bd) { mixSig(bd.$version + 1); mixSig(bd.$w * 3 + bd.$h); mixSig(bd.$uid); }
  if (o instanceof MovieClip) mixSig(o.$frame);
  if (o instanceof SimpleButton) { mixSig(o.$state === "up" ? 1 : o.$state === "over" ? 2 : 3); const c = o.$current(); if (c) sigNode(c, false); }
  if (o.$mask) sigNode(o.$mask, false);
  if (o instanceof DisplayObjectContainer) {
    const kids = o.$children;
    mixSig(kids.length);
    for (let i = 0; i < kids.length; i++) sigNode(kids[i], false);
  }
}
/** A signature of what o draws (not where): for the game's yard renderer (Renderer.measure), to tell a still clip. */
(DisplayObject.prototype as any).$contentSig = function (this: DisplayObject): number { return subtreeSig(this, 0x811c9dc5, true); };
function subtreeSig(o: DisplayObject, h: number, root = false): number {
  const saved = sigH;
  sigH = h;
  sigNode(o, root);
  const r = sigH;
  sigH = saved;
  return r;
}

/**
 * cacheAsBitmap: like Flash, the object is drawn once into a bitmap that is reused until something in it
 * changes. Content that changes nearly every frame is drawn directly for a while instead (rebuilding the
 * layer each frame would cost more than it saves); objects too large for a layer are drawn directly.
 */
function cacheWorthwhile(o: DisplayObject): boolean {
  const skip = (o as any).$cacheSkip;
  if (skip) { (o as any).$cacheSkip = skip - 1; return false; }
  return true;
}
function renderCached(ctx: CanvasRenderingContext2D, o: DisplayObject, m: M6, alpha: number): boolean {
  const before = o.$fx;
  const b = before ? null : o.$boundsIn(m, true);
  if (b && (b.width > 4000 || b.height > 4000)) return false;
  renderWithEffects(ctx, o, m, alpha);
  if (o.$fx !== before) {
    const misses = ((o as any).$cacheMisses ?? 0) + 1;
    (o as any).$cacheMisses = misses;
    if (misses >= 4) {
      // content that keeps changing: draw it directly, for longer each time it proves volatile again
      const backoff = Math.min(1920, ((o as any).$cacheBackoff ?? 30) * 2);
      (o as any).$cacheBackoff = backoff;
      (o as any).$cacheMisses = 0; (o as any).$cacheSkip = backoff; o.$fx = undefined as any;
    }
  } else {
    (o as any).$cacheMisses = 0;
  }
  return true;
}

/**
 * A finished layer put on screen at (x, y): only its parts inside the rectangles being drawn again and the clip
 * of what holds it (a layer of a chat's 60 lines, a few in view, was copied whole into every frame).
 */
function drawLayerParts(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, x: number, y: number): void {
  let x0 = x, y0 = y, x1 = x + c.width, y1 = y + c.height;
  const k = cullClip;
  if (k) { x0 = Math.max(x0, Math.floor(k[0]) - 2); y0 = Math.max(y0, Math.floor(k[1]) - 2); x1 = Math.min(x1, Math.ceil(k[2]) + 2); y1 = Math.min(y1, Math.ceil(k[3]) + 2); }
  if (x1 <= x0 || y1 <= y0) return;
  const rs = cullRects;
  if (!rs || rs.length > 24) {
    if (rs) {
      let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
      for (const r of rs) { if (r[0] < ux0) ux0 = r[0]; if (r[1] < uy0) uy0 = r[1]; if (r[2] > ux1) ux1 = r[2]; if (r[3] > uy1) uy1 = r[3]; }
      x0 = Math.max(x0, ux0); y0 = Math.max(y0, uy0); x1 = Math.min(x1, ux1); y1 = Math.min(y1, uy1);
      if (x1 <= x0 || y1 <= y0) return;
    }
    if (x0 === x && y0 === y && x1 === x + c.width && y1 === y + c.height) ctx.drawImage(c, x, y);
    else ctx.drawImage(c, x0 - x, y0 - y, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    return;
  }
  for (const r of rs) {
    const a0 = Math.max(x0, r[0]), b0 = Math.max(y0, r[1]), a1 = Math.min(x1, r[2]), b1 = Math.min(y1, r[3]);
    if (a1 > a0 && b1 > b0) ctx.drawImage(c, a0 - x, b0 - y, a1 - a0, b1 - b0, a0, b0, a1 - a0, b1 - b0);
  }
}

/** Colour transforms, filters and blend modes: render to a layer, post-process, composite. */
function renderWithEffects(ctx: CanvasRenderingContext2D, o: DisplayObject, m: M6, alpha: number): void {
  // Reuse the finished layer while nothing in the subtree changed and its scale/rotation is the same.
  // Like Flash's cached bitmaps, it is reused at any position, snapped to whole pixels: moving an
  // object (dragging the map) must not rebuild its layer every frame.
  const fx = o.$fx;
  const rd: RedrawRec | undefined = (o as any).$rd;
  const vouched = cullRects !== null && rd !== undefined && rd.clean && sameMatrix(rd.m, m);
  // (19 October: nothing in it marked changed (touch) since its signature was last taken: the same signature, not walked
  // again. A pure move of what holds it (a dragged map's 224 cached cells) left none of them "clean", and every cell's
  // whole content was walked again every frame of the drag)
  const untouched = cullRects !== null && !!fx && fx.vEp !== undefined && (o.$dk | 0) <= fx.vEp && !player.debug.noTouchSig;
  const sig = (vouched || untouched) && fx ? fx.sig : subtreeSig(o, 0x811c9dc5, true);
  // (QoL #242: not one filtered before the page's "Glow effects" switch changed)
  if (fx && fx.ep === filterSettings.epoch && fx.sig === sig && fx.a === m[0] && fx.b === m[1] && fx.c === m[2] && fx.d === m[3]) {
    // (__player.debug.fxLog = []: every filtered, tinted or blended draw, its layer's size, reused or rebuilt; a test tool)
    if (player.debug.fxLog) player.debug.fxLog.push([damageName(o), fx.canvas.width * fx.canvas.height, "reused"]);
    if (cullRects !== null) fx.vEp = visitEpoch;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    const op = BLEND_OPS[o.$blendMode];
    if (op) ctx.globalCompositeOperation = op;
    drawLayerParts(ctx, fx.canvas, Math.round(fx.px + m[4] - fx.tx), Math.round(fx.py + m[5] - fx.ty));
    ctx.restore();
    return;
  }
  // (19 October: a text field alone, filtered: only where its text is (TextField.$inkBounds))
  const ink: Rectangle | null = (o as any).$inkBounds && !(o instanceof DisplayObjectContainer) ? (o as any).$inkBounds(m) : null;
  const b = ink ? boundsOf(ink, m) : o.$boundsIn(m, true);
  if (!b || b.width <= 0 || b.height <= 0) return;
  let pad = 0;
  for (const f of o.$filters) pad = Math.max(pad, (f.$padding?.() ?? 0) * player.dpr);
  const x0 = Math.floor(b.x - pad), y0 = Math.floor(b.y - pad);
  const w = Math.min(4096, Math.ceil(b.width + pad * 2) + 2), h = Math.min(4096, Math.ceil(b.height + pad * 2) + 2);
  if (w <= 0 || h <= 0) return;
  // The canvases are reused (fps pass, 4 October): with filters, the object's own scratch layer and, for the
  // last filter, its previous result; without, its previous layer. A new canvas and context for every rebuild
  // was most of the cost of anything filtered that changes every frame (glowing monsters in a battle).
  const nf = o.$filters.length;
  const prev: HTMLCanvasElement | null = fx ? fx.canvas : null;
  let layer: HTMLCanvasElement | null = nf ? (o as any).$fxLayer ?? null : prev;
  if (!layer) layer = document.createElement("canvas");
  if (nf) (o as any).$fxLayer = layer;
  const lctx = context2d(layer);
  if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
  else { lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalAlpha = 1; lctx.globalCompositeOperation = "source-over"; lctx.clearRect(0, 0, w, h); }
  const lm = mul([1, 0, 0, 1, -x0, -y0], ...m);
  withoutCull(() => {
    o.$drawSelf(lctx, lm, 1);
    if (o instanceof DisplayObjectContainer) renderChildren(lctx, o, lm, 1);
  });
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  const ct = o.$colorTransform;
  if (ct && !ct.$isAlphaOnly && !applyColorTransformFast(layer, lctx, w, h, ct)) applyColorTransform(lctx, w, h, ct);
  let src: HTMLCanvasElement = layer;
  for (let i = 0; i < nf; i++) { const f = o.$filters[i]; src = f.$apply?.(src, player.dpr, i === nf - 1 && prev !== layer ? prev : null) ?? src; }
  const px = x0 - (src.width - w) / 2, py = y0 - (src.height - h) / 2;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  const op = BLEND_OPS[o.$blendMode];
  if (op) ctx.globalCompositeOperation = op;
  ctx.drawImage(src, Math.round(px), Math.round(py)); // same snapped position as when the layer is reused
  ctx.restore();
  o.$fx = { sig, a: m[0], b: m[1], c: m[2], d: m[3], canvas: src, px, py, tx: m[4], ty: m[5], ep: filterSettings.epoch, vEp: cullRects !== null ? visitEpoch : undefined };
  if (player.debug.fxLog) player.debug.fxLog.push([damageName(o), w * h, !fx ? "new" : fx.sig !== sig ? "changed" : "scaled"]);
}
const BLEND_OPS: Record<string, GlobalCompositeOperation> = {
  multiply: "multiply", screen: "screen", lighten: "lighten", darken: "darken", difference: "difference",
  add: "lighter", overlay: "overlay", hardlight: "hard-light", erase: "destination-out", alpha: "destination-in",
};
/**
 * (21 October) A colour transform done by the browser's own filter (an SVG feColorMatrix, the same sums on the same
 * unpremultiplied colours) rather than reading every pixel back into script and writing it again: a map's tinted
 * cells took a third of a second. Not when it adds alpha (the script's way leaves see-through pixels alone), nor where
 * the browser can't (checked once): false, and the script does it.
 */
let ctFilterOk: boolean | null = null;
let ctSvg: SVGSVGElement | null = null;
const ctFilterIds = new Map<string, string>();
let ctScratch: HTMLCanvasElement | null = null;
function ctFilterFor(ct: ColorTransform): string | null {
  if (ct.alphaOffset !== 0) return null;
  const key = `${ct.redMultiplier},${ct.greenMultiplier},${ct.blueMultiplier},${ct.redOffset},${ct.greenOffset},${ct.blueOffset}`;
  let id = ctFilterIds.get(key);
  if (id) return `url(#${id})`;
  if (ctFilterIds.size >= 512 || typeof document === "undefined" || !document.body) return null;
  const NS = "http://www.w3.org/2000/svg";
  if (!ctSvg) {
    ctSvg = document.createElementNS(NS, "svg") as SVGSVGElement;
    ctSvg.setAttribute("width", "0");
    ctSvg.setAttribute("height", "0");
    ctSvg.setAttribute("aria-hidden", "true");
    ctSvg.style.position = "absolute";
    ctSvg.style.width = ctSvg.style.height = "0";
    ctSvg.style.overflow = "hidden";
    ctSvg.style.pointerEvents = "none";
    document.body.appendChild(ctSvg);
  }
  id = "ioct" + ctFilterIds.size;
  const f = document.createElementNS(NS, "filter");
  f.setAttribute("id", id);
  f.setAttribute("color-interpolation-filters", "sRGB");
  f.setAttribute("x", "0"); f.setAttribute("y", "0"); f.setAttribute("width", "1"); f.setAttribute("height", "1");
  f.setAttribute("filterUnits", "objectBoundingBox");
  const m = document.createElementNS(NS, "feColorMatrix");
  m.setAttribute("type", "matrix");
  m.setAttribute("values", `${ct.redMultiplier} 0 0 0 ${ct.redOffset / 255} 0 ${ct.greenMultiplier} 0 0 ${ct.greenOffset / 255} 0 0 ${ct.blueMultiplier} 0 ${ct.blueOffset / 255} 0 0 0 1 0`);
  f.appendChild(m);
  ctSvg.appendChild(f);
  ctFilterIds.set(key, id);
  return `url(#${id})`;
}
function ctFilterWorks(): boolean {
  if (ctFilterOk !== null) return ctFilterOk;
  ctFilterOk = false;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x || !("filter" in x)) return false;
    const t = new ColorTransform(0.5, 1, 1, 1, 0, 40, 0, 0);
    const url = ctFilterFor(t);
    if (!url) return false;
    const src = document.createElement("canvas");
    src.width = src.height = 4;
    const sx = src.getContext("2d")!;
    sx.fillStyle = "rgb(200,100,50)";
    sx.fillRect(0, 0, 4, 4);
    x.filter = url;
    x.drawImage(src, 0, 0);
    x.filter = "none";
    const d = x.getImageData(1, 1, 1, 1).data;
    ctFilterOk = Math.abs(d[0] - 100) <= 2 && Math.abs(d[1] - 140) <= 2 && Math.abs(d[2] - 50) <= 2 && d[3] === 255;
  } catch (e) {
    ctFilterOk = false;
  }
  return ctFilterOk;
}
function applyColorTransformFast(layer: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number, ct: ColorTransform): boolean {
  if (player.debug.scriptColorTransform || !ctFilterWorks()) return false;
  const url = ctFilterFor(ct);
  if (!url) return false;
  if (!ctScratch) ctScratch = document.createElement("canvas");
  const sc = ctScratch;
  if (sc.width < w || sc.height < h) { sc.width = Math.max(sc.width, w); sc.height = Math.max(sc.height, h); }
  const sx = context2d(sc);
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.globalAlpha = 1;
  sx.globalCompositeOperation = "source-over";
  sx.clearRect(0, 0, w, h);
  sx.filter = url;
  sx.drawImage(layer, 0, 0, w, h, 0, 0, w, h);
  sx.filter = "none";
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(sc, 0, 0, w, h, 0, 0, w, h);
  player.debug.ctFastCount++;
  return true;
}
function applyColorTransform(ctx: CanvasRenderingContext2D, w: number, h: number, ct: ColorTransform): void {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    d[i] = d[i] * ct.redMultiplier + ct.redOffset;
    d[i + 1] = d[i + 1] * ct.greenMultiplier + ct.greenOffset;
    d[i + 2] = d[i + 2] * ct.blueMultiplier + ct.blueOffset;
    d[i + 3] = d[i + 3] + ct.alphaOffset;
  }
  ctx.putImageData(img, 0, 0);
}

drawHooks.drawObject = (ctx, obj, matrix, ct) => {
  if (!(obj instanceof DisplayObject)) return;
  const base: M6 = matrix ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty] : IDENT;
  // BitmapData.draw ignores the source's own transform but keeps its children's
  const saved = obj.$matrixCache, visible = obj.$visible;
  obj.$matrixCache = IDENT; obj.$visible = true;
  const prevCt = obj.$colorTransform;
  if (ct) obj.$colorTransform = ct;
  try { renderObject(ctx, obj, base, ct ? 1 : 1, true); }
  finally { obj.$matrixCache = saved; obj.$visible = visible; obj.$colorTransform = prevCt; }
};

/** The most any filter in o's subtree reaches past what it draws (Infinity when one can't say), and a text field's 2 px. */
function subtreePad(o: DisplayObject): number {
  let pad = (o as any).$drawText ? 2 : 0;
  for (const f of o.$filters) {
    const p = f.$padding?.();
    if (typeof p !== "number" || !Number.isFinite(p)) return Infinity;
    pad = Math.max(pad, p);
  }
  if (o instanceof DisplayObjectContainer) for (const c of o.$children) { pad = Math.max(pad, subtreePad(c)); if (pad === Infinity) break; }
  return pad;
}
drawHooks.drawnBounds = (obj, matrix) => {
  if (!(obj instanceof DisplayObject)) return null;
  const m: M6 = matrix ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty] : IDENT;
  const b = obj.$boundsIn(m, true);
  if (!b) return new Rectangle(0, 0, 0, 0);
  const pad = subtreePad(obj);
  if (pad === Infinity || !Number.isFinite(b.x + b.y + b.width + b.height)) return null;
  // (room to spare: filters scaled with the drawing, anti-aliasing)
  const k = Math.max(1, Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  const p = pad * k * 2 + 4;
  return new Rectangle(b.x - p, b.y - p, b.width + 2 * p, b.height + 2 * p);
};

// ------------------------------------------------------------ mouse picking
function maskLayerOf(c: DisplayObjectContainer, index: number): DisplayObject | null {
  const d = c.$children[index].$depth!;
  for (let i = index - 1; i >= 0; i--) {
    const k = c.$children[i];
    if (k.$clipDepth > 0 && k.$depth !== undefined && k.$depth < d && k.$clipDepth >= d) return k;
  }
  return null;
}
/**
 * Finds the InteractiveObject that receives mouse events at a root-space
 * point: topmost hit, non-interactive content hands the hit to its container,
 * mouseEnabled=false objects are transparent, mouseChildren=false containers
 * take their descendants' hits.
 */
export function pick(c: DisplayObjectContainer, gx: number, gy: number): { target: InteractiveObject | null; hit: boolean } {
  if (c instanceof Stage) return pickLocal(c, gx, gy, gx, gy);
  const [lx, ly] = apply(invert(c.$globalMatrix()), gx, gy);
  return pickLocal(c, gx, gy, lx, ly);
}
/** Point (x, y) in m's parent space -> m's local space (NaN when m is not invertible). */
function toLocal(m: M6, x: number, y: number): [number, number] {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det) return [NaN, NaN];
  const dx = x - m[4], dy = y - m[5];
  return [(m[3] * dx - m[2] * dy) / det, (m[0] * dy - m[1] * dx) / det];
}
/**
 * Hit test with the point carried down in each container's local coordinates (px, py), so each object
 * costs one small inversion instead of a walk up its parent chain. gx/gy stay global for masks/hitArea.
 */
function pickLocal(c: DisplayObjectContainer, gx: number, gy: number, px: number, py: number): { target: InteractiveObject | null; hit: boolean } {
  const sr0 = c.$scrollRect;
  if (sr0) { px += sr0.x; py += sr0.y; } // children are drawn shifted by the scroll offset
  for (let i = c.$children.length - 1; i >= 0; i--) {
    const ch = c.$children[i];
    if (!ch.$visible || ch.$maskOwner || ch.$clipDepth > 0) continue;
    if (ch.$depth !== undefined) {
      const layer = maskLayerOf(c, i);
      if (layer && !layer.$hitTree(gx, gy)) continue;
    }
    if (ch.$mask && !ch.$mask.$hitTree(gx, gy)) continue;
    const [lx, ly] = toLocal(ch.$matrix(), px, py);
    if (ch.$scrollRect) {
      if (lx < 0 || ly < 0 || lx >= ch.$scrollRect.width || ly >= ch.$scrollRect.height) continue;
    }
    if (ch instanceof DisplayObjectContainer) {
      let r = { target: null as InteractiveObject | null, hit: false };
      const hitArea = ch instanceof Sprite ? ch.$hitArea : null;
      if (hitArea) r.hit = hitArea.$hitTree(gx, gy);
      else {
        r = pickLocal(ch, gx, gy, lx, ly);
        const sr = ch.$scrollRect;
        if (!r.hit) r.hit = sr ? ch.$hitSelf(lx + sr.x, ly + sr.y, true) : ch.$hitSelf(lx, ly, true);
      }
      if (!r.hit) continue;
      if (ch.$mouseChildren && r.target) return r;
      if (ch.$mouseEnabled) return { target: ch, hit: true };
      continue;
    }
    if (!ch.$hitSelf(lx, ly, true)) continue;
    if (ch instanceof InteractiveObject) {
      if (ch.$mouseEnabled) return { target: ch, hit: true };
      continue;
    }
    return { target: null, hit: true };
  }
  return { target: null, hit: false };
}
