/**
 * flash.display.Graphics. Commands are recorded and replayed onto a
 * CanvasRenderingContext2D. Flash semantics kept: fills use the even-odd
 * rule; a fill region (beginFill ... endFill/next beginFill) is filled and then
 * its strokes drawn; hairlines (thickness 0) stay 1px under any scale;
 * getBounds includes half the stroke width, getRect does not.
 */
import { ASObject } from "as3";
import { flashClass, cssColor, context2d } from "../_internal";
import { Rectangle, type Matrix } from "../geom";

export type FillStyle =
  | { kind: "solid"; color: number; alpha: number }
  | { kind: "gradient"; type: string; colors: number[]; alphas: number[]; ratios: number[]; matrix: Matrix | null; spread: string; focal: number }
  | { kind: "bitmap"; bitmap: any; matrix: Matrix | null; repeat: boolean; smooth: boolean };

export interface LineStyle {
  thickness: number; color: number; alpha: number; scaleMode: string; caps: string; joints: string; miter: number;
  fill?: FillStyle;
}

type Cmd =
  | { op: "fill"; style: FillStyle | null }
  | { op: "line"; style: LineStyle | null }
  | { op: "M" | "L"; x: number; y: number }
  | { op: "Q"; cx: number; cy: number; x: number; y: number }
  | { op: "C"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number };

interface Segment { fill: FillStyle | null; fillPath: Path2D | null; strokes: { style: LineStyle; path: Path2D }[]; }

export class Graphics extends ASObject {
  declare $cmds: Cmd[];
  declare $segments: Segment[] | null;
  declare $bounds: Rectangle | null;
  declare $rect: Rectangle | null;
  declare $owner: any;
  /** incremented on every change (render caches compare it) */
  declare $ver: number;

  $alloc(): void {
    super.$alloc();
    this.$ver = 0;
    this.$cmds = [];
    this.$segments = null;
    this.$bounds = null;
    this.$rect = null;
    this.$owner = null;
  }

  private push(c: Cmd): void {
    this.$ver++;
    this.$cmds.push(c);
    this.$segments = null;
    this.$bounds = this.$rect = null;
    this.$owner?.$invalidate?.();
  }

  get $isEmpty(): boolean { return this.$cmds.length === 0; }

  clear(): void {
    this.$ver++;
    this.$cmds = [];
    this.$segments = null;
    this.$bounds = this.$rect = null;
    this.$owner?.$invalidate?.();
  }
  beginFill(color: number, alpha: number = 1): void {
    this.push({ op: "fill", style: { kind: "solid", color: color >>> 0 & 0xffffff, alpha: clamp01(alpha) } });
  }
  beginGradientFill(type: string, colors: any[], alphas: any[], ratios: any[], matrix: Matrix = null, spreadMethod = "pad", _interp = "rgb", focalPointRatio = 0): void {
    this.push({ op: "fill", style: { kind: "gradient", type, colors: [...colors].map(Number), alphas: [...alphas].map(Number), ratios: [...ratios].map(Number), matrix: matrix?.clone() ?? null, spread: spreadMethod, focal: focalPointRatio } });
  }
  beginBitmapFill(bitmap: any, matrix: Matrix = null, repeat = true, smooth = false): void {
    this.push({ op: "fill", style: { kind: "bitmap", bitmap, matrix: matrix?.clone() ?? null, repeat, smooth } });
  }
  endFill(): void { this.push({ op: "fill", style: null }); }
  lineStyle(thickness: number = NaN, color: number = 0, alpha: number = 1, _pixelHinting = false, scaleMode = "normal", caps: string = null, joints: string = null, miterLimit = 3): void {
    if (isNaN(thickness)) { this.push({ op: "line", style: null }); return; }
    this.push({ op: "line", style: { thickness: Math.min(Math.max(thickness, 0), 255), color: color >>> 0 & 0xffffff, alpha: clamp01(alpha), scaleMode, caps: caps ?? "round", joints: joints ?? "round", miter: miterLimit } });
  }
  lineGradientStyle(type: string, colors: any[], alphas: any[], ratios: any[], matrix: Matrix = null, spreadMethod = "pad", _i = "rgb", focal = 0): void {
    const last = [...this.$cmds].reverse().find((c) => c.op === "line") as { op: "line"; style: LineStyle | null } | undefined;
    if (!last?.style) return;
    this.push({ op: "line", style: { ...last.style, fill: { kind: "gradient", type, colors: [...colors].map(Number), alphas: [...alphas].map(Number), ratios: [...ratios].map(Number), matrix: matrix?.clone() ?? null, spread: spreadMethod, focal } } });
  }
  moveTo(x: number, y: number): void { this.push({ op: "M", x: +x, y: +y }); }
  lineTo(x: number, y: number): void { this.push({ op: "L", x: +x, y: +y }); }
  curveTo(cx: number, cy: number, x: number, y: number): void { this.push({ op: "Q", cx: +cx, cy: +cy, x: +x, y: +y }); }
  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.push({ op: "C", c1x: +c1x, c1y: +c1y, c2x: +c2x, c2y: +c2y, x: +x, y: +y });
  }
  drawRect(x: number, y: number, w: number, h: number): void {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.lineTo(x, y);
  }
  drawRoundRect(x: number, y: number, w: number, h: number, ellipseWidth: number, ellipseHeight: number = NaN): void {
    if (isNaN(ellipseHeight)) ellipseHeight = ellipseWidth;
    const rx = Math.min(Math.abs(ellipseWidth) / 2, Math.abs(w) / 2), ry = Math.min(Math.abs(ellipseHeight) / 2, Math.abs(h) / 2);
    if (!rx || !ry) { this.drawRect(x, y, w, h); return; }
    const r = x + w, b = y + h;
    this.moveTo(r, b - ry);
    this.quarterArc(r - rx, b - ry, rx, ry, 0);
    this.lineTo(x + rx, b);
    this.quarterArc(x + rx, b - ry, rx, ry, 90);
    this.lineTo(x, y + ry);
    this.quarterArc(x + rx, y + ry, rx, ry, 180);
    this.lineTo(r - rx, y);
    this.quarterArc(r - rx, y + ry, rx, ry, 270);
    this.lineTo(r, b - ry);
  }
  /** Quarter ellipse around (cx, cy) from startDeg to startDeg+90, as two 45° quadratic segments. */
  private quarterArc(cx: number, cy: number, rx: number, ry: number, startDeg: number): void {
    const k = 1 / Math.cos(Math.PI / 8);
    for (let i = 0; i < 2; i++) {
      const a0 = ((startDeg + i * 45) * Math.PI) / 180, a1 = a0 + Math.PI / 4, am = (a0 + a1) / 2;
      this.curveTo(cx + rx * k * Math.cos(am), cy + ry * k * Math.sin(am), cx + rx * Math.cos(a1), cy + ry * Math.sin(a1));
    }
  }
  drawCircle(x: number, y: number, radius: number): void { this.drawEllipse(x - radius, y - radius, radius * 2, radius * 2); }
  drawEllipse(x: number, y: number, w: number, h: number): void {
    // Flash approximates ellipses with 8 quadratic Bézier segments
    const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
    this.moveTo(cx + rx, cy);
    for (let i = 0; i < 8; i++) {
      const a0 = (i * Math.PI) / 4, a1 = ((i + 1) * Math.PI) / 4, am = (a0 + a1) / 2;
      const cr = 1 / Math.cos(Math.PI / 8);
      this.curveTo(cx + rx * cr * Math.cos(am), cy + ry * cr * Math.sin(am), cx + rx * Math.cos(a1), cy + ry * Math.sin(a1));
    }
  }
  drawTriangles(): void {}
  drawPath(commands: any, data: any, _winding = "evenOdd"): void {
    let j = 0;
    for (const c of commands[Symbol.iterator] ? commands : []) {
      switch (c) {
        case 1: this.moveTo(data[j++], data[j++]); break;
        case 2: this.lineTo(data[j++], data[j++]); break;
        case 3: this.curveTo(data[j++], data[j++], data[j++], data[j++]); break;
        case 6: this.cubicCurveTo(data[j++], data[j++], data[j++], data[j++], data[j++], data[j++]); break;
        case 4: j += 2; this.moveTo(data[j - 2], data[j - 1]); break;
        case 5: j += 2; this.lineTo(data[j - 2], data[j - 1]); break;
      }
    }
  }
  copyFrom(src: Graphics): void {
    this.$ver++;
    this.$cmds = src.$cmds.slice();
    this.$segments = null;
    this.$bounds = this.$rect = null;
    this.$owner?.$invalidate?.();
  }

  /** Replays the command list into fill regions with their strokes. */
  $build(): Segment[] {
    if (this.$segments) return this.$segments;
    const segs: Segment[] = [];
    let fill: FillStyle | null = null;
    let line: LineStyle | null = null;
    let seg: Segment = { fill: null, fillPath: null, strokes: [] };
    let stroke: Path2D | null = null;
    let x = 0, y = 0, sx = 0, sy = 0;
    const flushStroke = () => { stroke = null; };
    const closeFill = () => {
      if (seg.fill && seg.fillPath && (x !== sx || y !== sy)) seg.fillPath.lineTo(sx, sy);
      if (seg.fill || seg.strokes.length) segs.push(seg);
      seg = { fill, fillPath: fill ? new Path2D() : null, strokes: [] };
      if (seg.fillPath) seg.fillPath.moveTo(x, y);
      sx = x; sy = y;
      flushStroke();
    };
    const strokePath = () => {
      if (!line) return null;
      if (!stroke) { stroke = new Path2D(); stroke.moveTo(x, y); seg.strokes.push({ style: line, path: stroke }); }
      return stroke;
    };
    for (const c of this.$cmds) {
      switch (c.op) {
        case "fill":
          fill = c.style;
          closeFill();
          break;
        case "line":
          line = c.style;
          flushStroke();
          break;
        case "M":
          if (seg.fillPath) { if (x !== sx || y !== sy) seg.fillPath.lineTo(sx, sy); seg.fillPath.moveTo(c.x, c.y); }
          x = sx = c.x; y = sy = c.y;
          flushStroke();
          break;
        case "L":
          seg.fillPath?.lineTo(c.x, c.y);
          strokePath()?.lineTo(c.x, c.y);
          x = c.x; y = c.y;
          break;
        case "Q":
          seg.fillPath?.quadraticCurveTo(c.cx, c.cy, c.x, c.y);
          strokePath()?.quadraticCurveTo(c.cx, c.cy, c.x, c.y);
          x = c.x; y = c.y;
          break;
        case "C":
          seg.fillPath?.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, c.x, c.y);
          strokePath()?.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, c.x, c.y);
          x = c.x; y = c.y;
          break;
      }
    }
    fill = null;
    closeFill();
    this.$segments = segs;
    return segs;
  }

  /** Draws into ctx, whose transform is already the object's concatenated matrix. */
  $render(ctx: CanvasRenderingContext2D, alpha: number, scale: number): void {
    for (const seg of this.$build()) {
      if (seg.fill && seg.fillPath) {
        applyFill(ctx, seg.fill, alpha, seg.fillPath);
      }
      for (const s of seg.strokes) {
        const w = s.style.thickness;
        ctx.lineWidth = w === 0 || s.style.scaleMode === "none" ? Math.max(w, 1) / scale : w;
        ctx.lineCap = s.style.caps === "none" ? "butt" : (s.style.caps as CanvasLineCap);
        ctx.lineJoin = s.style.joints as CanvasLineJoin;
        ctx.miterLimit = s.style.miter;
        ctx.strokeStyle = s.style.fill && s.style.fill.kind === "gradient" ? gradientStyle(ctx, s.style.fill, alpha) ?? cssColor(s.style.color, s.style.alpha * alpha) : cssColor(s.style.color, s.style.alpha * alpha);
        ctx.stroke(s.path);
      }
    }
  }

  /** Local bounds; `strokes` adds half the line thickness (getBounds vs getRect). */
  $localBounds(strokes: boolean): Rectangle {
    const cached = strokes ? this.$bounds : this.$rect;
    if (cached) return cached;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let x = 0, y = 0;
    let half = 0;
    let line: LineStyle | null = null;
    const add = (px: number, py: number, pad: number) => {
      minX = Math.min(minX, px - pad); maxX = Math.max(maxX, px + pad);
      minY = Math.min(minY, py - pad); maxY = Math.max(maxY, py + pad);
    };
    for (const c of this.$cmds) {
      if (c.op === "line") { line = c.style; half = strokes && line ? line.thickness / 2 : 0; continue; }
      if (c.op === "fill") continue;
      const pad = line ? half : 0;
      if (c.op === "M") { x = c.x; y = c.y; continue; }
      if (c.op === "L") { add(x, y, pad); add(c.x, c.y, pad); x = c.x; y = c.y; continue; }
      if (c.op === "Q") {
        add(x, y, pad); add(c.x, c.y, pad);
        for (const [p0, p1, p2, isX] of [[x, c.cx, c.x, true], [y, c.cy, c.y, false]] as [number, number, number, boolean][]) {
          const d = p0 - 2 * p1 + p2;
          if (d !== 0) {
            const t = (p0 - p1) / d;
            if (t > 0 && t < 1) {
              const v = (1 - t) * (1 - t) * p0 + 2 * t * (1 - t) * p1 + t * t * p2;
              const other = isX ? (1 - t) * (1 - t) * y + 2 * t * (1 - t) * c.cy + t * t * c.y : (1 - t) * (1 - t) * x + 2 * t * (1 - t) * c.cx + t * t * c.x;
              if (isX) add(v, other, pad); else add(other, v, pad);
            }
          }
        }
        x = c.x; y = c.y;
        continue;
      }
      if (c.op === "C") {
        add(x, y, pad); add(c.c1x, c.c1y, pad); add(c.c2x, c.c2y, pad); add(c.x, c.y, pad);
        x = c.x; y = c.y;
      }
    }
    const r = minX === Infinity ? new Rectangle() : new Rectangle(minX, minY, maxX - minX, maxY - minY);
    if (strokes) this.$bounds = r; else this.$rect = r;
    return r;
  }

  /** Shape hit test in local coordinates (fills even-odd, strokes by width). */
  $hitTest(x: number, y: number): boolean {
    const ctx = scratch();
    for (const seg of this.$build()) {
      if (seg.fill && seg.fillPath && ctx.isPointInPath(seg.fillPath, x, y, "evenodd")) return true;
      for (const s of seg.strokes) {
        ctx.lineWidth = Math.max(s.style.thickness, 1);
        if (ctx.isPointInStroke(s.path, x, y)) return true;
      }
    }
    return false;
  }
  /** Fill regions for clipping by masks. */
  $clipPaths(): Path2D[] {
    return this.$build().filter((s) => s.fillPath).map((s) => s.fillPath!);
  }
}
flashClass(Graphics, "flash.display.Graphics");

function clamp01(v: number): number { return v > 1 ? 1 : v < 0 || isNaN(v) ? 0 : +v; }

let scratchCtx: CanvasRenderingContext2D | null = null;
function scratch(): CanvasRenderingContext2D {
  if (!scratchCtx) scratchCtx = context2d(document.createElement("canvas"));
  return scratchCtx;
}

function gradientStyle(ctx: CanvasRenderingContext2D, f: FillStyle & { kind: "gradient" }, alpha: number): CanvasGradient | null {
  const g = f.type === "radial" ? ctx.createRadialGradient(f.focal * 819.2, 0, 0, 0, 0, 819.2) : ctx.createLinearGradient(-819.2, 0, 819.2, 0);
  const n = Math.min(f.colors.length, f.alphas.length, f.ratios.length);
  for (let i = 0; i < n; i++) g.addColorStop(Math.min(Math.max(f.ratios[i] / 255, 0), 1), cssColor(f.colors[i], clamp01(f.alphas[i]) * alpha));
  return g;
}

function applyFill(ctx: CanvasRenderingContext2D, fill: FillStyle, alpha: number, path: Path2D): void {
  if (fill.kind === "solid") {
    ctx.fillStyle = cssColor(fill.color, fill.alpha * alpha);
    ctx.fill(path, "evenodd");
    return;
  }
  // gradients and bitmaps live in their own coordinate space: clip, then transform
  ctx.save();
  ctx.clip(path, "evenodd");
  const m = fill.matrix;
  if (m) ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
  if (fill.kind === "gradient") {
    const g = gradientStyle(ctx, fill, alpha);
    if (g) {
      ctx.fillStyle = g;
      if (!m) ctx.transform(1 / 1638.4 * 100, 0, 0, 1 / 1638.4 * 100, 50, 50);
      ctx.fillRect(-1e5, -1e5, 2e5, 2e5);
    }
  } else {
    const src = fill.bitmap?.$canvas;
    if (src) {
      ctx.imageSmoothingEnabled = fill.smooth;
      ctx.globalAlpha *= alpha;
      const pat = ctx.createPattern(src, fill.repeat ? "repeat" : "no-repeat");
      if (pat) { ctx.fillStyle = pat; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); }
    }
  }
  ctx.restore();
}
