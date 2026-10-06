/**
 * The display list. One module because the classes are mutually dependent
 * (containers, stage, loader, rendering and hit testing all walk each other).
 */
import { iface, implement } from "as3";
import { EventDispatcher, Event, IOErrorEvent, ProgressEvent, HTTPStatusEvent, UncaughtErrorEvents, dispatchHooks } from "../events";
import { Point, Rectangle, Matrix, ColorTransform } from "../geom";
import { Graphics } from "./Graphics";
import { BitmapData, drawHooks, IBitmapDrawable } from "./BitmapData";
import { flashClass, argumentError, rangeError, nullParam, toTwips, unimplemented, context2d } from "../_internal";

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
  /** profiling switches (debugging only) */
  debug: { noFilters: false, noText: false, noBitmaps: false, noCache: false, damageLog: null as null | [string, number[], string][] },
};

let instanceCount = 0;

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
      this.$loaderInfo = root.loaderInfo;
      root.loaderInfo.$content = this;
    }
    // Library symbols ([Embed] classes) get their timeline children before any AS3 constructor runs.
    const embed = findEmbed(this.constructor);
    if (embed) player.populateSymbol(this, embed);
  }

  $invalidate(): void {}

  // ---------------------------------------------------------- transform
  get x(): number { return this.$x; }
  set x(v: number) { if (interp.on) ipNote(this); this.$x = toTwips(v); this.$matrixCache = null; this.$scripted = true; }
  get y(): number { return this.$y; }
  set y(v: number) { if (interp.on) ipNote(this); this.$y = toTwips(v); this.$matrixCache = null; this.$scripted = true; }
  get z(): number { return 0; }
  set z(_v: number) { unimplemented("DisplayObject.z"); }
  get scaleX(): number { return this.$sx; }
  set scaleX(v: number) { if (interp.on) ipNote(this); this.$sx = +v; this.$matrixCache = null; this.$scripted = true; }
  get scaleY(): number { return this.$sy; }
  set scaleY(v: number) { if (interp.on) ipNote(this); this.$sy = +v; this.$matrixCache = null; this.$scripted = true; }
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
  }
  get rotationX(): number { return 0; } set rotationX(_v: number) {}
  get rotationY(): number { return 0; } set rotationY(_v: number) {}
  get rotationZ(): number { return this.rotation; } set rotationZ(v: number) { this.rotation = v; }
  get alpha(): number { return this.$alpha; }
  set alpha(v: number) { if (interp.on) ipNote(this); this.$alpha = Math.trunc(+v * 256) / 256 || 0; }
  get visible(): boolean { return this.$visible; }
  set visible(v: boolean) { this.$visible = !!v; }

  /** Local matrix (object → parent). */
  $matrix(): M6 {
    if (this.$matrixCache) return this.$matrixCache;
    const m: M6 = [this.$sx * Math.cos(this.$skewY), this.$sx * Math.sin(this.$skewY), -this.$sy * Math.sin(this.$skewX), this.$sy * Math.cos(this.$skewX), this.$x, this.$y];
    this.$matrixCache = m;
    return m;
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
  }
  /** Concatenated matrix (object → root space). */
  $globalMatrix(): M6 {
    const chain: DisplayObject[] = [];
    for (let o: DisplayObject | null = this; o && !(o instanceof Stage); o = o.$parent) chain.push(o);
    let m: M6 = IDENT;
    for (let i = chain.length - 1; i >= 0; i--) { const l = chain[i].$matrix(); m = mul(m, ...l); }
    return m;
  }

  get width(): number { return this.$boundsIn(this.$matrix(), true)?.width ?? 0; }
  set width(v: number) {
    const b = this.$boundsIn(IDENT, true);
    if (!b || !b.width) return;
    this.$setSize(+v / b.width, +v / b.height, b.height / b.width, true);
  }
  get height(): number { return this.$boundsIn(this.$matrix(), true)?.height ?? 0; }
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
  }

  get transform(): Transform { return new Transform(this); }
  set transform(t: Transform) {
    const m = t.matrix; this.$setMatrix(m.a, m.b, m.c, m.d, m.tx, m.ty); this.$scripted = true;
    this.$colorTransform = t.colorTransform;
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
    if (this.$mask) this.$mask.$maskOwner = null;
    this.$mask = m ?? null;
    if (m) m.$maskOwner = this;
  }
  get filters(): any[] { return this.$filters.map((f) => f.clone?.() ?? f); }
  set filters(v: any[]) {
    this.$filters = v == null ? [] : Array.from(v as any[], (f: any) => {
      if (f == null || typeof f.clone !== "function") throw argumentError(2005, "Parameter 0 is of the incorrect type. Should be type Filter.");
      return f.clone();
    });
  }
  get blendMode(): string { return this.$blendMode; }
  set blendMode(v: string) { this.$blendMode = v; }
  get cacheAsBitmap(): boolean { return this.$cacheAsBitmap || this.$filters.length > 0; }
  set cacheAsBitmap(v: boolean) { this.$cacheAsBitmap = !!v; }
  get opaqueBackground(): any { return this.$opaqueBackground; }
  set opaqueBackground(v: any) { this.$opaqueBackground = v; }
  get scrollRect(): Rectangle | null { return this.$scrollRect?.clone() ?? null; }
  set scrollRect(r: Rectangle | null) { this.$scrollRect = r?.clone() ?? null; }
  get scale9Grid(): Rectangle | null { return this.$scale9?.clone() ?? null; }
  set scale9Grid(r: Rectangle | null) { this.$scale9 = r?.clone() ?? null; }
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
  get matrix(): Matrix { const m = this.o.$matrix(); return new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]); }
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
  }
  swapChildren(a: DisplayObject, b: DisplayObject): void {
    const i = this.getChildIndex(a), j = this.getChildIndex(b);
    this.$children[i] = b; this.$children[j] = a;
  }
  swapChildrenAt(i: number, j: number): void {
    const a = this.getChildAt(i), b = this.getChildAt(j);
    this.$children[i] = b; this.$children[j] = a;
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
export function trackStage(o: DisplayObject, onStage: boolean): void {
  if (o instanceof MovieClip) {
    if (onStage && o.$p) activeClips.add(o);
    else activeClips.delete(o);
  }
}

/** ADDED_TO_STAGE / REMOVED_FROM_STAGE go to the object and then every descendant. */
function dispatchStageEvent(o: DisplayObject, type: string): void {
  trackStage(o, type === Event.ADDED_TO_STAGE);
  o.dispatchEvent(new Event(type));
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
    else if (this.stage) activeClips.add(this);
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
  set bitmapData(v: BitmapData | null) { this.$bitmapData = v; trackBig(v); }
  get smoothing(): boolean { return this.$smoothing; } set smoothing(v: boolean) { this.$smoothing = !!v; }
  get pixelSnapping(): string { return this.$pixelSnapping; } set pixelSnapping(v: string) { this.$pixelSnapping = v; }
  $selfBounds(): Rectangle | null {
    const b = this.$bitmapData;
    return b && !b.$disposed ? new Rectangle(0, 0, b.$w, b.$h) : null;
  }
  $hitSelf(lx: number, ly: number): boolean {
    const b = this.$bitmapData;
    return !!b && !b.$disposed && lx >= 0 && ly >= 0 && lx < b.$w && ly < b.$h;
  }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    const b = this.$bitmapData;
    if (!b || b.$disposed || player.debug.noBitmaps) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = this.$smoothing;
    // A big bitmap (the yard, 4000 x 2000) drawn upright: only the part that can show, the redrawn
    // rectangles or the target's size, plus a margin (fps pass, 4 October). Same place, same scale.
    if (m[1] === 0 && m[2] === 0 && m[0] > 0 && m[3] > 0 && b.$w * b.$h > 262144) {
      let vx0 = 0, vy0 = 0, vx1 = ctx.canvas.width, vy1 = ctx.canvas.height;
      if (cullRects && cullRects.length) {
        vx0 = Infinity; vy0 = Infinity; vx1 = -Infinity; vy1 = -Infinity;
        for (const r of cullRects) { if (r[0] < vx0) vx0 = r[0]; if (r[1] < vy0) vy0 = r[1]; if (r[2] > vx1) vx1 = r[2]; if (r[3] > vy1) vy1 = r[3]; }
      }
      // (the margin: at least 4 target pixels, so smoothing at the cut edge never reaches what shows)
      const mx = Math.ceil(4 / m[0]) + 2, my = Math.ceil(4 / m[3]) + 2;
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
  declare $state: "up" | "over" | "down";
  declare $enabled: boolean; declare $useHandCursor: boolean; declare $trackAsMenu: boolean;
  $ctor(upState: DisplayObject = null, overState: DisplayObject = null, downState: DisplayObject = null, hitTestState: DisplayObject = null): void {
    super.$ctor();
    this.$up = upState; this.$over = overState; this.$down = downState; this.$hit = hitTestState;
  }
  $alloc(): void {
    super.$alloc();
    this.$up = this.$over = this.$down = this.$hit = null;
    this.$state = "up"; this.$enabled = true; this.$useHandCursor = true; this.$trackAsMenu = false;
  }
  get upState(): DisplayObject | null { return this.$up; } set upState(v: DisplayObject | null) { this.$up = v; }
  get overState(): DisplayObject | null { return this.$over; } set overState(v: DisplayObject | null) { this.$over = v; }
  get downState(): DisplayObject | null { return this.$down; } set downState(v: DisplayObject | null) { this.$down = v; }
  get hitTestState(): DisplayObject | null { return this.$hit; } set hitTestState(v: DisplayObject | null) { this.$hit = v; }
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
  if (o.$maskOwner && !forceMask) return;
  const alpha = palpha * o.$alpha;
  if (alpha <= 0 && !forceMask) return;
  if (cullRects && !forceMask) {
    const rd: RedrawRec | undefined = (o as any).$rd;
    if (rd && (!rd.box || !hitsCull(rd.box))) return;
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
 * The yard's own renderer (the game's Renderer.as) does the same for what it draws, through `hook`.
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
      this.applied.push(o);
    }
  },
  restore(): void {
    for (const o of this.applied) {
      const c = (o as any).$ipCur as number[];
      o.$x = c[0]; o.$y = c[1]; o.$sx = c[2]; o.$sy = c[3]; o.$skewX = c[4]; o.$skewY = c[5]; o.$alpha = c[6]; o.$rotation = c[7];
      o.$matrixCache = null;
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
function ipNote(o: DisplayObject): void {
  const r = o as any;
  if (r.$ipT === interp.tick) return;
  r.$ipT = interp.tick;
  const rd = r.$rd as RedrawRec | undefined;
  if (!rd || rd.ep !== visitEpoch || !rd.box) { r.$ip0 = null; return; }
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
interface RedrawRec { own: number; m: M6; box: Box | null; ownBox: Box | null; kids: DisplayObject[] | null; clean: boolean; bv?: number; ep?: number; }
/** Counts the drawings (redrawRegions); a record's ep says which one last saw its object (interp). */
let visitEpoch = 0;
let cullRects: Box[] | null = null;
let damage: Box[] = [];
/** Strips a big bitmap had drawn again quietly (BitmapData.$noteSwept): repainted, kept apart from damage. */
let sweptDamage: Box[] = [];

function hitsCull(b: Box): boolean {
  for (const r of cullRects!) if (b[0] < r[2] && b[2] > r[0] && b[1] < r[3] && b[3] > r[1]) return true;
  return false;
}
function withoutCull<T>(fn: () => T): T {
  const saved = cullRects;
  cullRects = null;
  try { return fn(); } finally { cullRects = saved; }
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

function visitRedraw(o: DisplayObject, m: M6, record: boolean): Box | null {
  let rd: RedrawRec | undefined = (o as any).$rd;
  if (o.$maskOwner) return null; // masks are not drawn; their changes show in the owner's signature
  const own = ownSig(o);
  // a pure move (same appearance, same scale/rotation): recorded boxes can be shifted, not recomputed
  const pm = rd?.m;
  const moved = !!rd && rd.own === own && !!pm && pm[0] === m[0] && pm[1] === m[1] && pm[2] === m[2] && pm[3] === m[3];
  const mdx = moved ? m[4] - pm![4] : 0, mdy = moved ? m[5] - pm![5] : 0;
  if (!record && (!rd || rd.own !== own || !sameMatrix(rd.m, m))) {
    if (rd) damage.push(...(rd.box ? [rd.box] : []));
    const b = visitRedraw(o, m, true);
    if (b) damage.push(b);
    // (__player.debug.damageLog = []: what was drawn again, and why; a test tool)
    if (player.debug.damageLog && b) player.debug.damageLog.push([damageName(o), b.map(Math.round), !rd ? "new" : rd.own !== own ? "look" : "moved"]);
    return b;
  }
  // A big bitmap drawn in the same place whose pixels changed in places: only those places are damaged.
  let bmChanged = false;
  const tb = (o as any).$bitmapData as BitmapData | null | undefined;
  if (!record && rd && tb && tb.$track && rd.bv !== tb.$version) {
    bmChanged = true;
    const boxes = rd.bv === undefined ? null : tb.$dirtySince(rd.bv);
    if (!boxes) { if (rd.box) damage.push(rd.box); }
    else if (rd.box) {
      for (const b of boxes) {
        const s = toBox(boundsOf(new Rectangle(b[0], b[1], b[2] - b[0], b[3] - b[1]), m));
        if (!s) continue;
        const x0 = Math.max(s[0], rd.box[0]), y0 = Math.max(s[1], rd.box[1]), x1 = Math.min(s[2], rd.box[2]), y1 = Math.min(s[3], rd.box[3]);
        if (x1 > x0 && y1 > y0) {
          damage.push([x0, y0, x1, y1]);
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
        if (x1 > x0 && y1 > y0) sweptDamage.push([x0, y0, x1, y1]);
      }
    }
    l.length = 0;
  }
  if (!rd) { rd = { own, m, box: null, ownBox: null, kids: null, clean: false }; (o as any).$rd = rd; }
  rd.ep = visitEpoch;
  if (tb) rd.bv = tb.$version;
  const damageBefore = damage.length;
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
  if (!record && rd.kids && !sameKids(rd.kids, kids)) {
    const now = new Set(kids);
    for (const k of rd.kids) if (!now.has(k)) { const kb = (k as any).$rd?.box; if (kb) damage.push(kb); }
    const before = rd.kids.filter((k) => now.has(k)), was = new Set(rd.kids), after = kids.filter((k) => was.has(k));
    if (!sameKids(before, after)) for (const k of after) { const kb = (k as any).$rd?.box; if (kb) damage.push(kb); }
  }
  if (record || !rd.kids || !sameKids(rd.kids, kids)) rd.kids = kids.slice();
  const sr = o.$scrollRect;
  const cm = sr ? mul(m, 1, 0, 0, 1, -sr.x, -sr.y) : m;
  let box = rd.ownBox;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    box = unionBox(box, visitRedraw(k, childMatrix(cm, k), record));
  }
  if (box && sr) {
    const clip = toBox(boundsOf(new Rectangle(0, 0, sr.width, sr.height), m));
    box = clip ? [Math.max(box[0], clip[0]), Math.max(box[1], clip[1]), Math.min(box[2], clip[2]), Math.min(box[3], clip[3])] : box;
    if (box[2] <= box[0] || box[3] <= box[1]) box = null;
  }
  rd.box = padBox(o, box);
  // "clean": compared (not re-recorded) this frame and nothing inside it changed; a cached layer of it
  // is then still valid without recomputing its content signature
  rd.clean = !record && damage.length === damageBefore;
  return rd.box;
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
  visitEpoch++;
  damage = [];
  sweptDamage = [];
  visitRedraw(root, base, full);
  if (full) return null;
  const rects = mergeDamage(width, height);
  if (rects === null) return null;
  // the swept strips: added after the merging and the "most of the screen" test, which they would tip
  // into repainting everything (a strip is the width of the yard); they only need repainting
  for (const d of sweptDamage) {
    const r: Box = [Math.max(0, Math.floor(d[0])), Math.max(0, Math.floor(d[1])), Math.min(width, Math.ceil(d[2])), Math.min(height, Math.ceil(d[3]))];
    if (r[2] > r[0] && r[3] > r[1]) rects.push(r);
  }
  return rects;
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
  if (rects.length > 16) {
    rects = tileRects(rects, width, height, rects.length > 600 ? 64 : 32);
    let area = 0;
    for (const r of rects) area += (r[2] - r[0]) * (r[3] - r[1]);
    return area > width * height * 0.6 ? null : rects;
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
export function setCullRects(r: Box[] | null): void { cullRects = r; }

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

/** Colour transforms, filters and blend modes: render to a layer, post-process, composite. */
function renderWithEffects(ctx: CanvasRenderingContext2D, o: DisplayObject, m: M6, alpha: number): void {
  // Reuse the finished layer while nothing in the subtree changed and its scale/rotation is the same.
  // Like Flash's cached bitmaps, it is reused at any position, snapped to whole pixels: moving an
  // object (dragging the map) must not rebuild its layer every frame.
  const fx = o.$fx;
  const rd: RedrawRec | undefined = (o as any).$rd;
  const vouched = cullRects !== null && rd !== undefined && rd.clean && sameMatrix(rd.m, m);
  const sig = vouched && fx ? fx.sig : subtreeSig(o, 0x811c9dc5, true);
  if (fx && fx.sig === sig && fx.a === m[0] && fx.b === m[1] && fx.c === m[2] && fx.d === m[3]) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    const op = BLEND_OPS[o.$blendMode];
    if (op) ctx.globalCompositeOperation = op;
    ctx.drawImage(fx.canvas, Math.round(fx.px + m[4] - fx.tx), Math.round(fx.py + m[5] - fx.ty));
    ctx.restore();
    return;
  }
  const b = o.$boundsIn(m, true);
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
  if (ct && !ct.$isAlphaOnly) applyColorTransform(lctx, w, h, ct);
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
  o.$fx = { sig, a: m[0], b: m[1], c: m[2], d: m[3], canvas: src, px, py, tx: m[4], ty: m[5] };
}
const BLEND_OPS: Record<string, GlobalCompositeOperation> = {
  multiply: "multiply", screen: "screen", lighten: "lighten", darken: "darken", difference: "difference",
  add: "lighter", overlay: "overlay", hardlight: "hard-light", erase: "destination-out", alpha: "destination-in",
};
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
