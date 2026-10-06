/**
 * flash.display.BitmapData on top of a 2D canvas. Pixel reads go through a
 * cached ImageData that is invalidated by any drawing operation.
 */
import { ASObject, iface, implement } from "as3";
import { flashClass, argumentError, unimplemented, context2d } from "../_internal";
import { Rectangle, Point, type Matrix, type ColorTransform } from "../geom";

/** flash.display.IBitmapDrawable: implemented by BitmapData and DisplayObject. */
export const IBitmapDrawable = iface("flash.display::IBitmapDrawable", []);
export interface IBitmapDrawable {}

/** Installed by the display list: renders a display object into a context. */
export const drawHooks = {
  drawObject: (_ctx: CanvasRenderingContext2D, _obj: any, _m: Matrix | null, _ct: ColorTransform | null) => {},
};

/** Images for [Embed(source=...)] BitmapData classes, preloaded by the player before game code runs. */
export const embeddedImages = new Map<string, ImageBitmap>();
/** Bitmaps of the SWF library, by character id (bitmap fills, placed bitmaps). */
export const libraryImages = new Map<number, CanvasImageSource & { width: number; height: number }>();
function embeddedImageFor(ctor: any): ImageBitmap | null {
  for (let c = ctor; c && c !== BitmapData; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, "$embed")) {
      const src = c.$embed?.source;
      return (src && embeddedImages.get(src)) ?? null;
    }
  }
  return null;
}

let scratch: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
/** A reusable canvas of at least w x h, cleared over that area. */
function scratchCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!scratch) { const c = document.createElement("canvas"); scratch = [c, context2d(c)]; }
  const [c, t] = scratch;
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = "source-over";
  t.clearRect(0, 0, w, h);
  return scratch;
}

let bitmapUid = 0;

export class BitmapData extends ASObject {
  declare $canvas: HTMLCanvasElement;
  declare $ctx: CanvasRenderingContext2D;
  declare $w: number;
  declare $h: number;
  declare $transparent: boolean;
  declare $pixels: ImageData | null;
  declare $disposed: boolean;
  declare $version: number;
  /**
   * Big bitmaps shown on screen (the yard) log which rectangles each change touched, so the screen is
   * drawn again only there (redrawRegions): [version, x0, y0, x1, y1] per change, x0 = -1 for "all".
   */
  declare $track: boolean;
  declare $log: number[] | null;
  /** Changes at versions above this are all in $log (older ones were trimmed, or not logged yet). */
  declare $logFloor: number;
  /**
   * While true, changes are not logged (their version still counts): drawing again what is already there
   * (the yard renderer's sweep), which nothing needs to repaint for.
   */
  declare $quiet: boolean;
  /** Strips drawn again quietly since the screen last looked ([x0, y0, x1, y1] flat): it repaints them. */
  declare $swept: number[] | null;
  /** Identity, for telling one bitmap from another of the same size. */
  declare $uid: number;

  $ctor(width: number, height: number, transparent: boolean = true, fillColor: number = 0xffffffff): void {
    super.$ctor();
    // An embedded image class ignores the size it is constructed with (usually 0, 0).
    const img = this.constructor === BitmapData ? null : embeddedImageFor(this.constructor);
    if (img) { width = img.width; height = img.height; fillColor = 0; }
    width |= 0; height |= 0;
    if (width <= 0 || height <= 0 || width > 8191 || height > 8191 || width * height > 16777215) throw argumentError(2015, "Invalid BitmapData.");
    this.$w = width;
    this.$h = height;
    this.$transparent = !!transparent;
    this.$canvas = document.createElement("canvas");
    this.$canvas.width = width;
    this.$canvas.height = height;
    // An opaque BitmapData gets an opaque canvas: the browser can then copy it instead of blending it
    // (the game copies its full-map opaque effects layer, 8 megapixels, into the map every frame).
    this.$ctx = context2d(this.$canvas, transparent ? {} : { alpha: false });
    this.$pixels = null;
    this.$disposed = false;
    this.$version = 0;
    this.$track = false;
    this.$log = null;
    this.$logFloor = 0;
    this.$quiet = false;
    this.$swept = null;
    this.$uid = ++bitmapUid;
    const c = fillColor >>> 0;
    const a = transparent ? (c >>> 24) / 255 : 1;
    if (a > 0) {
      this.$ctx.fillStyle = `rgba(${(c >>> 16) & 255},${(c >>> 8) & 255},${c & 255},${a})`;
      this.$ctx.fillRect(0, 0, width, height);
    }
    if (img) this.$ctx.drawImage(img, 0, 0);
  }

  /** Wraps an already-decoded image (Loader, embedded bitmaps). */
  static $fromImage(img: CanvasImageSource & { width: number; height: number }, transparent = true): BitmapData {
    const bd = new BitmapData(Math.max(1, img.width), Math.max(1, img.height), transparent, 0);
    bd.$ctx.drawImage(img, 0, 0);
    return bd;
  }

  private check(): void {
    if (this.$disposed) throw argumentError(2015, "Invalid BitmapData.");
  }
  $touch(): void { this.$pixels = null; this.$version++; if (this.$track && !this.$quiet) this.$logChange(-1, 0, 0, 0); }
  /** Changed only inside (x, y, w, h). */
  $touchRect(x: number, y: number, w: number, h: number): void {
    this.$pixels = null;
    this.$version++;
    if (this.$track && !this.$quiet) this.$logChange(Math.floor(x), Math.floor(y), Math.ceil(x + w), Math.ceil(y + h));
  }
  private $logChange(x0: number, y0: number, x1: number, y1: number): void {
    const l = this.$log || (this.$log = []);
    l.push(this.$version, x0, y0, x1, y1);
    if (l.length > 5 * 512) { l.splice(0, l.length - 5 * 256); this.$logFloor = l[0] - 1; }
  }
  /**
   * A strip drawn again quietly (the yard renderer's sweep: as it should already be, so not logged as a
   * change). The screen repaints it too, apart from its own changes (redrawRegions), so whatever the sweep
   * put right shows.
   */
  $noteSwept(x: number, y: number, w: number, h: number): void {
    const l = this.$swept || (this.$swept = []);
    if (l.length < 4 * 64) l.push(Math.floor(x), Math.floor(y), Math.ceil(x + w), Math.ceil(y + h));
  }
  /** Start logging changes (from now: anything older counts as "all changed"). */
  $trackChanges(): void {
    if (this.$track) return;
    this.$track = true;
    this.$log = [];
    this.$logFloor = this.$version;
  }
  /**
   * The rectangles changed since version v ([x0, y0, x1, y1] each), or null when that is not known
   * (not logged, or a change to everything).
   */
  $dirtySince(v: number): number[][] | null {
    if (v === this.$version) return [];
    const l = this.$log;
    if (!this.$track || !l || v < this.$logFloor) return null;
    const out: number[][] = [];
    for (let i = 0; i < l.length; i += 5) {
      if (l[i] <= v) continue;
      if (l[i + 1] === -1) return null;
      out.push([l[i + 1], l[i + 2], l[i + 3], l[i + 4]]);
    }
    return out;
  }
  data(): ImageData {
    if (!this.$pixels) this.$pixels = this.$ctx.getImageData(0, 0, this.$w, this.$h);
    return this.$pixels;
  }

  get width(): number { this.check(); return this.$w; }
  get height(): number { this.check(); return this.$h; }
  get transparent(): boolean { return this.$transparent; }
  get rect(): Rectangle { this.check(); return new Rectangle(0, 0, this.$w, this.$h); }

  getPixel(x: number, y: number): number {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return 0;
    const d = this.data().data, i = (y * this.$w + x) * 4;
    return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  }
  getPixel32(x: number, y: number): number {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return 0;
    const d = this.data().data, i = (y * this.$w + x) * 4;
    return ((d[i + 3] << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) >>> 0;
  }
  setPixel(x: number, y: number, color: number): void {
    const a = this.$transparent ? (this.getPixel32(x, y) >>> 24) : 255;
    this.setPixel32(x, y, ((a << 24) | (color & 0xffffff)) >>> 0);
  }
  setPixel32(x: number, y: number, color: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.$w || y >= this.$h) return;
    const img = this.$ctx.createImageData(1, 1);
    const c = color >>> 0;
    this.$storeArgb(img.data, 0, c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255);
    this.$ctx.putImageData(img, x, y);
    // (the version moves whether or not the pixels are cached: a drawn bitmap showed the change late)
    if (this.$pixels) { const i = (y * this.$w + x) * 4; this.$pixels.data.set(img.data, i); }
    this.$version++;
    if (this.$track && !this.$quiet) this.$logChange(x, y, x + 1, y + 1);
  }
  fillRect(rect: Rectangle, color: number): void {
    this.check();
    const c = color >>> 0;
    const a = this.$transparent ? (c >>> 24) / 255 : 1;
    this.$ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    if (a > 0) {
      this.$ctx.fillStyle = `rgba(${(c >>> 16) & 255},${(c >>> 8) & 255},${c & 255},${a})`;
      this.$ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    this.$touchRect(rect.x, rect.y, rect.width, rect.height);
  }
  /**
   * Flash semantics: into a transparent bitmap, mergeAlpha=false replaces pixels
   * (alpha included) and true composites; an opaque bitmap cannot hold alpha, so
   * the source is always composited over it (the map renderer relies on this).
   * With alphaBitmapData, source alpha is multiplied by the mask's alpha.
   */
  copyPixels(src: BitmapData, srcRect: Rectangle, dest: Point, alphaBitmapData: BitmapData = null, alphaPoint: Point = null, mergeAlpha: boolean = false): void {
    this.check();
    if (!src) throw new TypeError("Error #2007: Parameter sourceBitmapData must be non-null.");
    let sx = Math.round(srcRect.x), sy = Math.round(srcRect.y), w = Math.round(srcRect.width), h = Math.round(srcRect.height);
    let dx = Math.round(dest.x), dy = Math.round(dest.y);
    // clip against the source bounds
    if (sx < 0) { dx -= sx; w += sx; sx = 0; }
    if (sy < 0) { dy -= sy; h += sy; sy = 0; }
    w = Math.min(w, src.$w - sx); h = Math.min(h, src.$h - sy);
    if (w <= 0 || h <= 0) return;
    const ctx = this.$ctx;
    let image: CanvasImageSource = src.$canvas;
    let ix = sx, iy = sy;
    if (alphaBitmapData) {
      // one scratch canvas, reused (copyPixels runs many times per frame in battles)
      const [tmp, t] = scratchCanvas(w, h);
      t.globalCompositeOperation = "copy";
      t.drawImage(src.$canvas, sx, sy, w, h, 0, 0, w, h);
      t.globalCompositeOperation = "destination-in";
      const ax = Math.round(alphaPoint?.x ?? 0), ay = Math.round(alphaPoint?.y ?? 0);
      t.drawImage(alphaBitmapData.$canvas, ax, ay, w, h, 0, 0, w, h);
      t.globalCompositeOperation = "source-over";
      image = tmp; ix = 0; iy = 0;
    }
    // drawImage with equal source and destination rectangles only touches (dx, dy, w, h): no clip
    // (save/clip/restore per copy was the most expensive part of rendering a battle)
    if (this.$transparent && !mergeAlpha && !alphaBitmapData) ctx.clearRect(dx, dy, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, ix, iy, w, h, dx, dy, w, h);
    this.$touchRect(dx, dy, w, h);
  }
  draw(source: any, matrix: Matrix = null, colorTransform: ColorTransform = null, blendMode: string = null, clipRect: Rectangle = null, smoothing: boolean = false): void {
    this.check();
    const ctx = this.$ctx;
    ctx.save();
    const op = blendMode ? DRAW_BLEND[String(blendMode)] : undefined;
    if (op) ctx.globalCompositeOperation = op;
    else if (blendMode && blendMode !== "normal" && blendMode !== "layer") unimplemented(`BitmapData.draw blendMode ${blendMode}`);
    if (clipRect) { ctx.beginPath(); ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height); ctx.clip(); }
    ctx.imageSmoothingEnabled = smoothing;
    if (source instanceof BitmapData) {
      if (matrix) ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
      if (colorTransform) ctx.globalAlpha = Math.max(0, Math.min(1, colorTransform.alphaMultiplier));
      ctx.drawImage(source.$canvas, 0, 0);
    } else {
      drawHooks.drawObject(ctx, source, matrix, colorTransform);
    }
    ctx.restore();
    // only where it can have drawn: the clip, or the box a bitmap lands in
    let box: Rectangle | null = null;
    if (source instanceof BitmapData) {
      const a = matrix ? matrix.a : 1, b = matrix ? matrix.b : 0, c = matrix ? matrix.c : 0, d = matrix ? matrix.d : 1, tx = matrix ? matrix.tx : 0, ty = matrix ? matrix.ty : 0;
      const xs = [tx, a * source.$w + tx, c * source.$h + tx, a * source.$w + c * source.$h + tx];
      const ys = [ty, b * source.$w + ty, d * source.$h + ty, b * source.$w + d * source.$h + ty];
      const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1;
      box = new Rectangle(x0, y0, Math.max(...xs) + 1 - x0, Math.max(...ys) + 1 - y0);
    }
    if (clipRect) box = box ? box.intersection(clipRect) : clipRect.clone();
    if (box) this.$touchRect(box.x, box.y, box.width, box.height);
    else this.$touch();
  }
  clone(): BitmapData {
    this.check();
    const b = new BitmapData(this.$w, this.$h, this.$transparent, 0);
    b.$ctx.drawImage(this.$canvas, 0, 0);
    return b;
  }
  dispose(): void {
    this.$disposed = true;
    this.$canvas.width = this.$canvas.height = 1;
    this.$touch(); // (what showed it is drawn again, without it)
  }
  lock(): void {}
  unlock(_changeRect: Rectangle = null): void {}
  colorTransform(rect: Rectangle, ct: ColorTransform): void {
    this.check();
    const x = Math.max(0, rect.x | 0), y = Math.max(0, rect.y | 0);
    const w = Math.min(this.$w - x, Math.ceil(rect.width)), h = Math.min(this.$h - y, Math.ceil(rect.height));
    if (w <= 0 || h <= 0) return;
    const img = this.$ctx.getImageData(x, y, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] * ct.redMultiplier + ct.redOffset;
      d[i + 1] = d[i + 1] * ct.greenMultiplier + ct.greenOffset;
      d[i + 2] = d[i + 2] * ct.blueMultiplier + ct.blueOffset;
      d[i + 3] = d[i + 3] * ct.alphaMultiplier + ct.alphaOffset;
    }
    this.$ctx.putImageData(img, x, y);
    this.$touch();
  }
  getColorBoundsRect(mask: number, color: number, findColor: boolean = true): Rectangle {
    const d = this.data().data;
    let minX = this.$w, minY = this.$h, maxX = -1, maxY = -1;
    for (let y = 0; y < this.$h; y++) {
      for (let x = 0; x < this.$w; x++) {
        const i = (y * this.$w + x) * 4;
        const p = ((d[i + 3] << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) >>> 0;
        if ((((p & mask) >>> 0) === ((color & mask) >>> 0)) === findColor) {
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    return maxX < 0 ? new Rectangle() : new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
  }
  hitTest(firstPoint: Point, firstAlphaThreshold: number, secondObject: any, _secondBitmapPoint: Point = null, _secondAlphaThreshold: number = 1): boolean {
    if (secondObject instanceof Point) {
      const px = (secondObject.x - firstPoint.x) | 0, py = (secondObject.y - firstPoint.y) | 0;
      return (this.getPixel32(px, py) >>> 24) >= firstAlphaThreshold;
    }
    if (secondObject instanceof Rectangle) {
      const r = secondObject;
      for (let y = Math.max(0, r.y - firstPoint.y) | 0; y < Math.min(this.$h, r.bottom - firstPoint.y); y++)
        for (let x = Math.max(0, r.x - firstPoint.x) | 0; x < Math.min(this.$w, r.right - firstPoint.x); x++)
          if ((this.getPixel32(x, y) >>> 24) >= firstAlphaThreshold) return true;
      return false;
    }
    unimplemented("BitmapData.hitTest(BitmapData)");
    return false;
  }
  /** Scrolls the image; edge regions not covered by the moved image keep their pixels, as in Flash. */
  scroll(x: number, y: number): void {
    const copy = this.clone();
    const ctx = this.$ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x | 0, y | 0, this.$w, this.$h);
    ctx.clip();
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(copy.$canvas, x | 0, y | 0);
    ctx.restore();
    this.$touch();
  }
  /** Writes straight-alpha ARGB pixels as Flash stores them (premultiplied, then read back). */
  private $putArgb(img: ImageData, x0: number, y0: number): void {
    this.$ctx.putImageData(img, x0, y0);
    if (x0 === 0 && y0 === 0 && img.width === this.$w && img.height === this.$h) {
      this.$pixels = img; this.$version++;
      // (all of it changed: a bitmap that logs its changes must say so, or the yard's partial redraw misses it)
      if (this.$track && !this.$quiet) this.$logChange(-1, 0, 0, 0);
    }
    else this.$touchRect(x0, y0, img.width, img.height);
  }
  /** Flash stores pixels premultiplied: semi-transparent colours lose precision (rounding as in Ruffle). */
  private $storeArgb(d: Uint8ClampedArray, i: number, a: number, r: number, g: number, b: number): void {
    if (!this.$transparent) a = 255;
    if (a === 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; return; }
    if (a < 255) {
      const k = a / 255;
      r = Math.min(255, Math.round(Math.round(r * k) / k));
      g = Math.min(255, Math.round(Math.round(g * k) / k));
      b = Math.min(255, Math.round(Math.round(b * k) / k));
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }

  /** Random pixels from the Park-Miller generator Flash uses (seed handling as reverse-engineered by Ruffle). */
  noise(randomSeed: number, low: number = 0, high: number = 255, channelOptions: number = 7, grayScale: boolean = false): void {
    this.check();
    low &= 255; high &= 255;
    let x = randomSeed <= 0 ? (-randomSeed + 1) >>> 0 : randomSeed >>> 0;
    const next = () => { x = Number((BigInt(x) * 16807n) % 2147483647n); return x; };
    const range = (): number => low + (high >= low ? next() % (high - low + 1) : 0);
    const img = this.$ctx.createImageData(this.$w, this.$h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = 0, g = 0, b = 0, a = 255;
      if (grayScale) {
        r = g = b = range();
        if (channelOptions & 8) a = range();
      } else {
        if (channelOptions & 1) r = range();
        if (channelOptions & 2) g = range();
        if (channelOptions & 4) b = range();
        if (channelOptions & 8) a = range();
      }
      this.$storeArgb(d, i, a, r, g, b);
    }
    this.$putArgb(img, 0, 0);
  }

  /** Perlin noise: the SVG 1.1 feTurbulence reference algorithm, which Flash's perlinNoise follows. */
  perlinNoise(baseX: number, baseY: number, numOctaves: number, randomSeed: number, stitch: boolean, fractalNoise: boolean,
    channelOptions: number = 7, grayScale: boolean = false, offsets: any[] = null): void {
    this.check();
    const t = new Turbulence(randomSeed | 0);
    const fx = baseX ? 1 / baseX : 0, fy = baseY ? 1 / baseY : 0;
    const octaves = Math.max(0, numOctaves | 0);
    const offs: [number, number][] = [];
    for (let i = 0; i < octaves; i++) { const p = offsets?.[i]; offs.push([p ? +p.x : 0, p ? +p.y : 0]); }
    const img = this.$ctx.createImageData(this.$w, this.$h), d = img.data;
    const chan = (c: number, x: number, y: number) => {
      const n = t.turbulence(c, x, y, fx, fy, octaves, fractalNoise, stitch, 0, 0, this.$w, this.$h, offs);
      const v = fractalNoise ? (n * 255 + 255) / 2 : n * 255;
      return Math.max(0, Math.min(255, Math.trunc(v)));
    };
    for (let y = 0, i = 0; y < this.$h; y++) {
      for (let x = 0; x < this.$w; x++, i += 4) {
        let r = 0, g = 0, b = 0, a = 255;
        if (grayScale) {
          r = g = b = chan(0, x, y);
        } else {
          if (channelOptions & 1) r = chan(0, x, y);
          if (channelOptions & 2) g = chan(1, x, y);
          if (channelOptions & 4) b = chan(2, x, y);
        }
        if (channelOptions & 8) a = chan(3, x, y);
        this.$storeArgb(d, i, a, r, g, b);
      }
    }
    this.$putArgb(img, 0, 0);
  }

  /** Remaps channels through lookup tables; each result is the (wrapping) sum of the four table entries. */
  paletteMap(src: BitmapData, rect: Rectangle, dest: Point, redArray: any[] = null, greenArray: any[] = null, blueArray: any[] = null, alphaArray: any[] = null): void {
    this.check();
    const sx = Math.max(0, rect.x | 0), sy = Math.max(0, rect.y | 0);
    const w = Math.min(src.$w - sx, rect.width | 0), h = Math.min(src.$h - sy, rect.height | 0);
    if (w <= 0 || h <= 0) return;
    const sd = src.data().data;
    const out = this.$ctx.createImageData(w, h), d = out.data;
    const at = (arr: any[] | null, v: number, shift: number) => (arr ? Number(arr[v]) >>> 0 : (v << shift) >>> 0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((sy + y) * src.$w + sx + x) * 4, di = (y * w + x) * 4;
        const c = (at(redArray, sd[si], 16) + at(greenArray, sd[si + 1], 8) + at(blueArray, sd[si + 2], 0) + at(alphaArray, sd[si + 3], 24)) >>> 0;
        this.$storeArgb(d, di, c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255);
      }
    }
    this.$putArgb(out, Math.round(dest.x), Math.round(dest.y));
  }

  /** Tests pixels against a threshold and writes `color` where the test passes; returns the count. */
  threshold(src: BitmapData, rect: Rectangle, dest: Point, operation: string, threshold: number, color: number = 0, mask: number = 0xffffffff, copySource: boolean = false): number {
    this.check();
    const sx = Math.max(0, rect.x | 0), sy = Math.max(0, rect.y | 0);
    const w = Math.min(src.$w - sx, rect.width | 0), h = Math.min(src.$h - sy, rect.height | 0);
    if (w <= 0 || h <= 0) return 0;
    const sd = src.data().data;
    const dx = Math.round(dest.x), dy = Math.round(dest.y);
    const cur = copySource ? null : this.$ctx.getImageData(dx, dy, w, h);
    const out = cur ?? this.$ctx.createImageData(w, h), d = out.data;
    const t = (threshold & mask) >>> 0;
    const test: Record<string, (v: number) => boolean> = { "<": (v) => v < t, "<=": (v) => v <= t, ">": (v) => v > t, ">=": (v) => v >= t, "==": (v) => v === t, "!=": (v) => v !== t };
    const fn = test[operation];
    if (!fn) throw new Error("Error #2005: Parameter 3 is of the incorrect type.");
    let n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((sy + y) * src.$w + sx + x) * 4, di = (y * w + x) * 4;
        const p = ((sd[si + 3] << 24) | (sd[si] << 16) | (sd[si + 1] << 8) | sd[si + 2]) >>> 0;
        if (fn((p & mask) >>> 0)) { n++; const c = color >>> 0; this.$storeArgb(d, di, c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255); }
        else if (copySource) { d[di] = sd[si]; d[di + 1] = sd[si + 1]; d[di + 2] = sd[si + 2]; d[di + 3] = sd[si + 3]; }
      }
    }
    this.$putArgb(out, dx, dy);
    return n;
  }

  copyChannel(src: BitmapData, rect: Rectangle, dest: Point, sourceChannel: number, destChannel: number): void {
    this.check();
    const idx = (c: number) => (c === 1 ? 0 : c === 2 ? 1 : c === 4 ? 2 : c === 8 ? 3 : -1);
    const si0 = idx(sourceChannel), di0 = idx(destChannel);
    if (si0 < 0 || di0 < 0) return;
    const sx = Math.max(0, rect.x | 0), sy = Math.max(0, rect.y | 0);
    const w = Math.min(src.$w - sx, rect.width | 0), h = Math.min(src.$h - sy, rect.height | 0);
    if (w <= 0 || h <= 0) return;
    const sd = src.data().data;
    const dx = Math.round(dest.x), dy = Math.round(dest.y);
    const out = this.$ctx.getImageData(dx, dy, w, h), d = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + di0] = sd[((sy + y) * src.$w + sx + x) * 4 + si0];
    this.$putArgb(out, dx, dy);
  }
  applyFilter(_src: BitmapData, _rect: Rectangle, _dest: Point, _filter: any): void { unimplemented("BitmapData.applyFilter"); }
  floodFill(): void { unimplemented("BitmapData.floodFill"); }
  merge(): void { unimplemented("BitmapData.merge"); }
  getPixels(_rect: Rectangle): any { unimplemented("BitmapData.getPixels"); return null; }
  setPixels(): void { unimplemented("BitmapData.setPixels"); }
  /** Writes a rectangle of ARGB values (row by row) in one go: one putImageData for the whole block. */
  setVector(rect: Rectangle, inputVector: ArrayLike<number>): void {
    this.check();
    const x0 = rect.x | 0, y0 = rect.y | 0;
    const w = Math.min(rect.width | 0, this.$w - x0), h = Math.min(rect.height | 0, this.$h - y0);
    if (w <= 0 || h <= 0) return;
    if (inputVector.length < w * h) throw new RangeError("Error #1125: The index is out of range.");
    const img = this.$ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0, n = w * h; i < n; i++) {
      const c = inputVector[i] >>> 0;
      this.$storeArgb(d, i * 4, c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255);
    }
    this.$putArgb(img, x0, y0);
  }
  getVector(rect: Rectangle): number[] {
    this.check();
    const d = this.data().data, out: number[] = [];
    for (let y = rect.y | 0; y < (rect.y + rect.height) | 0; y++)
      for (let x = rect.x | 0; x < (rect.x + rect.width) | 0; x++) {
        const i = (y * this.$w + x) * 4;
        out.push(((d[i + 3] << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) >>> 0);
      }
    return out;
  }
  compare(): any { unimplemented("BitmapData.compare"); return 0; }
}
flashClass(BitmapData, "flash.display.BitmapData");

/** Flash blend modes that map directly onto canvas composite operations. */
const DRAW_BLEND: Record<string, GlobalCompositeOperation> = {
  multiply: "multiply", screen: "screen", lighten: "lighten", darken: "darken", difference: "difference",
  add: "lighter", overlay: "overlay", hardlight: "hard-light", erase: "destination-out", alpha: "destination-in",
};

/** SVG 1.1 feTurbulence reference implementation (Perlin noise with a Park-Miller seeded lattice). */
class Turbulence {
  private lattice = new Int32Array(0x100 + 0x100 + 2);
  private gradient: Float64Array[][] = [];
  constructor(seed: number) {
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
    for (let k = 0; k < 4; k++) {
      const g: Float64Array[] = [];
      for (let i = 0; i < BSize + BSize + 2; i++) g.push(new Float64Array(2));
      this.gradient.push(g);
    }
    let i = 0;
    for (let k = 0; k < 4; k++) {
      for (i = 0; i < BSize; i++) {
        this.lattice[i] = i;
        const gv = this.gradient[k][i];
        for (let j = 0; j < 2; j++) gv[j] = ((random() % (BSize + BSize)) - BSize) / BSize;
        const s = Math.sqrt(gv[0] * gv[0] + gv[1] * gv[1]);
        gv[0] /= s; gv[1] /= s;
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
      for (let k = 0; k < 4; k++) { this.gradient[k][BSize + i][0] = this.gradient[k][i][0]; this.gradient[k][BSize + i][1] = this.gradient[k][i][1]; }
    }
  }
  private noise2(c: number, vx: number, vy: number, st: { w: number; h: number; wx: number; wy: number } | null): number {
    const BM = 0xff, PerlinN = 0x1000;
    let t = vx + PerlinN;
    let bx0 = Math.trunc(t) & BM, bx1 = (bx0 + 1) & BM;
    const rx0 = t - Math.trunc(t), rx1 = rx0 - 1;
    t = vy + PerlinN;
    let by0 = Math.trunc(t) & BM, by1 = (by0 + 1) & BM;
    const ry0 = t - Math.trunc(t), ry1 = ry0 - 1;
    if (st) {
      if (bx0 >= st.wx) bx0 -= st.w;
      if (bx1 >= st.wx) bx1 -= st.w;
      if (by0 >= st.wy) by0 -= st.h;
      if (by1 >= st.wy) by1 -= st.h;
    }
    bx0 &= BM; bx1 &= BM; by0 &= BM; by1 &= BM;
    const L = this.lattice, G = this.gradient[c];
    const i = L[bx0], j = L[bx1];
    const b00 = L[i + by0], b10 = L[j + by0], b01 = L[i + by1], b11 = L[j + by1];
    const sx = rx0 * rx0 * (3 - 2 * rx0), sy = ry0 * ry0 * (3 - 2 * ry0);
    let q = G[b00]; let u = rx0 * q[0] + ry0 * q[1];
    q = G[b10]; let v = rx1 * q[0] + ry0 * q[1];
    const a = u + sx * (v - u);
    q = G[b01]; u = rx0 * q[0] + ry1 * q[1];
    q = G[b11]; v = rx1 * q[0] + ry1 * q[1];
    const b = u + sx * (v - u);
    return a + sy * (b - a);
  }
  turbulence(c: number, x: number, y: number, fx: number, fy: number, octaves: number, fractal: boolean, stitch: boolean,
    tileX: number, tileY: number, tileW: number, tileH: number, offsets: [number, number][]): number {
    const PerlinN = 0x1000;
    let st: { w: number; h: number; wx: number; wy: number } | null = null;
    if (stitch) {
      if (fx !== 0) { const lo = Math.floor(tileW * fx) / tileW, hi = Math.ceil(tileW * fx) / tileW; fx = fx / lo < hi / fx ? lo : hi; }
      if (fy !== 0) { const lo = Math.floor(tileH * fy) / tileH, hi = Math.ceil(tileH * fy) / tileH; fy = fy / lo < hi / fy ? lo : hi; }
      const w = Math.trunc(tileW * fx + 0.5), h = Math.trunc(tileH * fy + 0.5);
      st = { w, h, wx: Math.trunc(tileX * fx + PerlinN + w), wy: Math.trunc(tileY * fy + PerlinN + h) };
    }
    let sum = 0, ratio = 1, mul = 1;
    for (let o = 0; o < octaves; o++) {
      const vx = (x + offsets[o][0]) * fx * mul, vy = (y + offsets[o][1]) * fy * mul;
      const n = this.noise2(c, vx, vy, st);
      sum += (fractal ? n : Math.abs(n)) / ratio;
      mul *= 2; ratio *= 2;
      if (st) { st.w *= 2; st.wx = 2 * st.wx - PerlinN; st.h *= 2; st.wy = 2 * st.wy - PerlinN; }
    }
    return sum;
  }
}
implement(BitmapData, [IBitmapDrawable]);
