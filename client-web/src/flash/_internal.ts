/** Helpers shared by the flash.* runtime packages. Not part of the Flash API. */
import { registerClass, ArgumentError } from "as3";
import { FLASH_CONSTANTS } from "./_constants";

/**
 * Registers a runtime class under its AS3 name and installs its static
 * constants with the exact values from playerglobal.swc.
 */
export function flashClass(cls: any, qname: string): void {
  const consts = FLASH_CONSTANTS[qname];
  if (consts) {
    for (const [k, v] of Object.entries(consts)) {
      if (!Object.prototype.hasOwnProperty.call(cls, k)) Object.defineProperty(cls, k, { value: v, writable: true, enumerable: true, configurable: true });
    }
  }
  const i = qname.lastIndexOf(".");
  registerClass(i < 0 ? qname : `${qname.slice(0, i)}::${qname.slice(i + 1)}`, cls);
}

/** Flash runtime error with the player's numbering and wording. */
export function argumentError(id: number, msg: string): Error {
  return new ArgumentError(`Error #${id}: ${msg}`, id);
}
export function rangeError(id: number, msg: string): Error {
  const e = new RangeError(`Error #${id}: ${msg}`);
  (e as any).errorID = id;
  return e;
}
export function typeError(id: number, msg: string): Error {
  const e = new TypeError(`Error #${id}: ${msg}`);
  (e as any).errorID = id;
  return e;
}
export function nullParam(name: string): Error {
  return typeError(2007, `Parameter ${name} must be non-null.`);
}

const warned = new Set<string>();
/** Logs once when game code reaches a Flash feature the runtime does not implement yet. */
export function unimplemented(what: string): void {
  if (warned.has(what)) return;
  warned.add(what);
  console.warn(`[flash runtime] not implemented: ${what}`);
}

/** Converts a Flash pixel coordinate to its stored twips value (C-style truncation, as Flash does). */
export function toTwips(v: number): number {
  const t = v * 20;
  return t >= -2147483648 && t < 2147483648 ? Math.trunc(t) / 20 : -107374182.4;
}

/**
 * Rendering settings, fixed before the first canvas is created (src/main.ts).
 * gpu: false puts every canvas on Chrome's CPU rasterizer. The game draws hundreds of vector
 * shapes and glyph outlines per frame and blits canvases into each other like Flash's software
 * renderer; GPU-backed Canvas 2D handles that pattern badly (measured: 6.8 fps on a fast PC,
 * 0.8 fps under emulated GPU, 40 fps on the CPU rasterizer). ?gpu=1 restores GPU canvases.
 */
export const renderSettings = { gpu: false };

/** Every 2D context the runtime uses comes from here. */
export function context2d(canvas: HTMLCanvasElement, options: CanvasRenderingContext2DSettings = {}): CanvasRenderingContext2D {
  return canvas.getContext("2d", renderSettings.gpu ? options : { ...options, willReadFrequently: true })!;
}

/** 0xRRGGBB → "rgba(r,g,b,a)". */
export function cssColor(rgb: number, alpha = 1): string {
  return `rgba(${(rgb >>> 16) & 255},${(rgb >>> 8) & 255},${rgb & 255},${alpha})`;
}
