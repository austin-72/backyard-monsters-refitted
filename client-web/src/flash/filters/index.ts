/**
 * flash.filters. Filters are applied to an offscreen layer of the object
 * (see renderWithEffects in display/core). Drop shadows and glows use canvas
 * shadows (Gaussian) where Flash uses repeated box blurs, so edges differ
 * slightly; colour matrices are exact.
 */
import { ASObject } from "as3";
import { flashClass, cssColor, unimplemented, context2d } from "../_internal";

export abstract class BitmapFilter extends ASObject {
  clone(): BitmapFilter { return this; }
  $padding(): number { return 0; }
  /** `reuse`: a canvas this filter's result may be drawn into instead of a new one (its old result). */
  $apply(src: HTMLCanvasElement, _scale: number, _reuse?: HTMLCanvasElement | null): HTMLCanvasElement { return src; }
}
flashClass(BitmapFilter, "flash.filters.BitmapFilter");

export const BitmapFilterQuality: any = class BitmapFilterQuality {};
flashClass(BitmapFilterQuality, "flash.filters.BitmapFilterQuality");
export const BitmapFilterType: any = class BitmapFilterType {};
flashClass(BitmapFilterType, "flash.filters.BitmapFilterType");

/**
 * A canvas for a result: `reuse` (an earlier result nobody draws any more) when given, emptied, else a new
 * one. Making a canvas and its context for every filtered draw was most of the cost of glowing monsters in a
 * battle, where the yard's renderer draws each one through a filter every frame (fps pass, 4 October).
 */
function layer(w: number, h: number, reuse?: HTMLCanvasElement | null): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (reuse) {
    const ctx = context2d(reuse);
    if (reuse.width !== w || reuse.height !== h) { reuse.width = w; reuse.height = h; }
    else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    if ("filter" in ctx) (ctx as any).filter = "none";
    return [reuse, ctx];
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, context2d(c)];
}
/** Gaussian sigma matching Flash's `quality` passes of a box blur of width `blur`. */
function sigma(blur: number, quality: number, scale: number): number {
  return Math.max(0, (blur * Math.sqrt(Math.max(1, quality)) * scale) / 3.4);
}
const FAR = 100000;

function shadow(src: HTMLCanvasElement, color: number, alpha: number, bx: number, by: number, quality: number, strength: number,
  dx: number, dy: number, inner: boolean, knockout: boolean, hideObject: boolean, scale: number, reuse?: HTMLCanvasElement | null): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const [out, ctx] = layer(w, h, reuse !== src ? reuse : null);
  const s = sigma(Math.max(bx, by), quality, scale);
  const reps = Math.max(1, Math.min(8, Math.round(strength)));
  if (!inner) {
    ctx.shadowColor = cssColor(color, Math.min(1, alpha * Math.min(1, strength)));
    ctx.shadowBlur = s * 2;
    ctx.shadowOffsetX = dx * scale + FAR;
    ctx.shadowOffsetY = dy * scale;
    for (let i = 0; i < reps; i++) ctx.drawImage(src, -FAR, 0);
    ctx.shadowColor = "transparent";
    if (knockout) { ctx.globalCompositeOperation = "destination-out"; ctx.drawImage(src, 0, 0); }
    else if (!hideObject) { ctx.globalCompositeOperation = "destination-over"; ctx.drawImage(src, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.drawImage(src, 0, 0); }
    return out;
  }
  // inner: blur the inverse of the object's alpha, keep it only inside the object
  const [inv, ictx] = layer(w, h);
  ictx.fillStyle = cssColor(color, 1);
  ictx.fillRect(0, 0, w, h);
  ictx.globalCompositeOperation = "destination-out";
  ictx.drawImage(src, 0, 0);
  const [sh, sctx] = layer(w, h);
  sctx.shadowColor = cssColor(color, Math.min(1, alpha));
  sctx.shadowBlur = s * 2;
  sctx.shadowOffsetX = dx * scale + FAR;
  sctx.shadowOffsetY = dy * scale;
  for (let i = 0; i < reps; i++) sctx.drawImage(inv, -FAR, 0);
  if (!knockout && !hideObject) ctx.drawImage(src, 0, 0);
  else { ctx.drawImage(src, 0, 0); ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = "rgba(0,0,0,0)"; }
  ctx.globalCompositeOperation = "source-atop";
  ctx.drawImage(sh, 0, 0);
  return out;
}

export class DropShadowFilter extends BitmapFilter {
  declare distance: number; declare angle: number; declare color: number; declare alpha: number; declare blurX: number; declare blurY: number;
  declare strength: number; declare quality: number; declare inner: boolean; declare knockout: boolean; declare hideObject: boolean;
  $ctor(distance = 4, angle = 45, color = 0, alpha = 1, blurX = 4, blurY = 4, strength = 1, quality = 1, inner = false, knockout = false, hideObject = false): void {
    super.$ctor();
    Object.assign(this, { distance, angle, color, alpha, blurX, blurY, strength, quality, inner, knockout, hideObject });
  }
  clone(): DropShadowFilter { return new DropShadowFilter(this.distance, this.angle, this.color, this.alpha, this.blurX, this.blurY, this.strength, this.quality, this.inner, this.knockout, this.hideObject); }
  $padding(): number { return Math.abs(this.distance) + Math.max(this.blurX, this.blurY) * 1.5; }
  $apply(src: HTMLCanvasElement, scale: number, reuse?: HTMLCanvasElement | null): HTMLCanvasElement {
    const r = (this.angle * Math.PI) / 180;
    return shadow(src, this.color, this.alpha, this.blurX, this.blurY, this.quality, this.strength, Math.cos(r) * this.distance, Math.sin(r) * this.distance, this.inner, this.knockout, this.hideObject, scale, reuse);
  }
}
flashClass(DropShadowFilter, "flash.filters.DropShadowFilter");

export class GlowFilter extends BitmapFilter {
  declare color: number; declare alpha: number; declare blurX: number; declare blurY: number; declare strength: number;
  declare quality: number; declare inner: boolean; declare knockout: boolean;
  $ctor(color = 0xff0000, alpha = 1, blurX = 6, blurY = 6, strength = 2, quality = 1, inner = false, knockout = false): void {
    super.$ctor();
    Object.assign(this, { color, alpha, blurX, blurY, strength, quality, inner, knockout });
  }
  clone(): GlowFilter { return new GlowFilter(this.color, this.alpha, this.blurX, this.blurY, this.strength, this.quality, this.inner, this.knockout); }
  $padding(): number { return Math.max(this.blurX, this.blurY) * 1.5; }
  $apply(src: HTMLCanvasElement, scale: number, reuse?: HTMLCanvasElement | null): HTMLCanvasElement {
    return shadow(src, this.color, this.alpha, this.blurX, this.blurY, this.quality, this.strength, 0, 0, this.inner, this.knockout, false, scale, reuse);
  }
}
flashClass(GlowFilter, "flash.filters.GlowFilter");

export class BlurFilter extends BitmapFilter {
  declare blurX: number; declare blurY: number; declare quality: number;
  $ctor(blurX = 4, blurY = 4, quality = 1): void { super.$ctor(); this.blurX = blurX; this.blurY = blurY; this.quality = quality; }
  clone(): BlurFilter { return new BlurFilter(this.blurX, this.blurY, this.quality); }
  $padding(): number { return Math.max(this.blurX, this.blurY) * 1.5; }
  $apply(src: HTMLCanvasElement, scale: number, reuse?: HTMLCanvasElement | null): HTMLCanvasElement {
    const [out, ctx] = layer(src.width, src.height, reuse !== src ? reuse : null);
    if (!("filter" in ctx)) { unimplemented("BlurFilter without canvas filter support"); return src; }
    ctx.filter = `blur(${sigma(Math.max(this.blurX, this.blurY), this.quality, scale)}px)`;
    ctx.drawImage(src, 0, 0);
    return out;
  }
}
flashClass(BlurFilter, "flash.filters.BlurFilter");

export class ColorMatrixFilter extends BitmapFilter {
  declare $m: number[];
  $ctor(matrix: any = null): void {
    super.$ctor();
    this.$m = matrix ? Array.from(matrix as number[], Number) : [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  }
  get matrix(): number[] { return this.$m.slice(); }
  set matrix(v: number[]) { this.$m = Array.from(v ?? [], Number); while (this.$m.length < 20) this.$m.push(0); }
  clone(): ColorMatrixFilter { return new ColorMatrixFilter(this.$m); }
  $apply(src: HTMLCanvasElement, _scale?: number, reuse?: HTMLCanvasElement | null): HTMLCanvasElement {
    const [out, ctx] = layer(src.width, src.height, reuse !== src ? reuse : null);
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height), d = img.data, m = this.$m;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      d[i] = m[0] * r + m[1] * g + m[2] * b + m[3] * a + m[4];
      d[i + 1] = m[5] * r + m[6] * g + m[7] * b + m[8] * a + m[9];
      d[i + 2] = m[10] * r + m[11] * g + m[12] * b + m[13] * a + m[14];
      d[i + 3] = m[15] * r + m[16] * g + m[17] * b + m[18] * a + m[19];
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }
}
flashClass(ColorMatrixFilter, "flash.filters.ColorMatrixFilter");

export class BevelFilter extends BitmapFilter {
  declare distance: number; declare angle: number; declare highlightColor: number; declare highlightAlpha: number; declare shadowColor: number;
  declare shadowAlpha: number; declare blurX: number; declare blurY: number; declare strength: number; declare quality: number; declare type: string; declare knockout: boolean;
  $ctor(distance = 4, angle = 45, highlightColor = 0xffffff, highlightAlpha = 1, shadowColor = 0, shadowAlpha = 1, blurX = 4, blurY = 4, strength = 1, quality = 1, type = "inner", knockout = false): void {
    super.$ctor();
    Object.assign(this, { distance, angle, highlightColor, highlightAlpha, shadowColor, shadowAlpha, blurX, blurY, strength, quality, type, knockout });
  }
  clone(): BevelFilter { return new BevelFilter(this.distance, this.angle, this.highlightColor, this.highlightAlpha, this.shadowColor, this.shadowAlpha, this.blurX, this.blurY, this.strength, this.quality, this.type, this.knockout); }
  $apply(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    const r = (this.angle * Math.PI) / 180, dx = Math.cos(r) * this.distance, dy = Math.sin(r) * this.distance;
    const lit = shadow(src, this.shadowColor, this.shadowAlpha, this.blurX, this.blurY, this.quality, this.strength, -dx, -dy, true, false, false, scale);
    return shadow(lit, this.highlightColor, this.highlightAlpha, this.blurX, this.blurY, this.quality, this.strength, dx, dy, true, false, false, scale);
  }
}
flashClass(BevelFilter, "flash.filters.BevelFilter");

export class ConvolutionFilter extends BitmapFilter {
  declare matrixX: number; declare matrixY: number; declare matrix: number[]; declare divisor: number; declare bias: number;
  declare preserveAlpha: boolean; declare clamp: boolean; declare color: number; declare alpha: number;
  $ctor(matrixX = 0, matrixY = 0, matrix: any = null, divisor = 1, bias = 0, preserveAlpha = true, clamp = true, color = 0, alpha = 0): void {
    super.$ctor();
    Object.assign(this, { matrixX, matrixY, matrix: matrix ? Array.from(matrix as number[]) : [], divisor, bias, preserveAlpha, clamp, color, alpha });
  }
  clone(): ConvolutionFilter { return new ConvolutionFilter(this.matrixX, this.matrixY, this.matrix, this.divisor, this.bias, this.preserveAlpha, this.clamp, this.color, this.alpha); }
  $apply(src: HTMLCanvasElement): HTMLCanvasElement { unimplemented("ConvolutionFilter"); return src; }
}
flashClass(ConvolutionFilter, "flash.filters.ConvolutionFilter");
