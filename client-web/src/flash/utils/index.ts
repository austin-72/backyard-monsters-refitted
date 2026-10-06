/** flash.utils */
import { ASObject, Dictionary, iface, implement, qualifiedClassName, classByName, Vector, XML, int, uint, is } from "as3";
import { EventDispatcher, TimerEvent } from "../events";
import { flashClass, rangeError, unimplemented } from "../_internal";
import { runtimeHooks } from "../_runtime";
import { later, every, cancelTimer } from "../_clock";
import { EOFError } from "../errors";

export { Dictionary };

export const Endian: any = class Endian {};
flashClass(Endian, "flash.utils.Endian");

export const IDataInput = iface("flash.utils::IDataInput", []);
export const IDataOutput = iface("flash.utils::IDataOutput", []);
export interface IDataInput { [k: string]: any; }
export interface IDataOutput { [k: string]: any; }

function eof(): Error { return new EOFError("Error #2030: End of file was encountered.", 2030); }

// Byte access `ba[i]`: AS3 allows indexing a ByteArray directly.
const BA_INDEX: ProxyHandler<any> = {
  get(t, k) {
    if (typeof k === "string" && k.charCodeAt(0) >= 48 && k.charCodeAt(0) <= 57) { const i = +k; return i < t.$len ? t.$buf[i] : undefined; }
    return (t as any)[k];
  },
  set(t, k, v) {
    if (typeof k === "string" && k.charCodeAt(0) >= 48 && k.charCodeAt(0) <= 57) {
      const i = +k;
      t.$ensure(i + 1);
      if (i >= t.$len) { t.$buf.fill(0, t.$len, i); t.$len = i + 1; }
      t.$buf[i] = Number(v) & 255;
      return true;
    }
    (t as any)[k] = v;
    return true;
  },
};

const utf8enc = new TextEncoder();
const utf8dec = new TextDecoder("utf-8");

/** flash.utils.ByteArray: growable buffer, big-endian by default, EOFError on over-read. */
export class ByteArray extends ASObject {
  declare $buf: Uint8Array;
  declare $view: DataView;
  declare $len: number;
  declare $pos: number;
  declare $little: boolean;
  declare $objectEncoding: number;

  constructor(...args: any[]) {
    super(...args);
    return new Proxy(this, BA_INDEX);
  }

  $alloc(): void {
    super.$alloc();
    this.$buf = new Uint8Array(16);
    this.$view = new DataView(this.$buf.buffer);
    this.$len = 0;
    this.$pos = 0;
    this.$little = false;
    this.$objectEncoding = 3;
  }
  static $from(bytes: Uint8Array): ByteArray {
    const b = new ByteArray();
    b.$ensure(bytes.length);
    b.$buf.set(bytes);
    b.$len = bytes.length;
    return b;
  }
  $toUint8Array(): Uint8Array { return this.$buf.slice(0, this.$len); }
  $ensure(n: number): void {
    if (n <= this.$buf.length) return;
    let cap = this.$buf.length * 2;
    while (cap < n) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(this.$buf.subarray(0, this.$len));
    this.$buf = nb;
    this.$view = new DataView(nb.buffer);
  }
  private $w(n: number): number {
    const p = this.$pos;
    this.$ensure(p + n);
    this.$pos = p + n;
    if (this.$pos > this.$len) this.$len = this.$pos;
    return p;
  }
  private $r(n: number): number {
    const p = this.$pos;
    if (p + n > this.$len) throw eof();
    this.$pos = p + n;
    return p;
  }

  get length(): number { return this.$len; }
  set length(v: number) {
    v >>>= 0;
    this.$ensure(v);
    if (v > this.$len) this.$buf.fill(0, this.$len, v);
    this.$len = v;
    if (this.$pos > v) this.$pos = v;
  }
  get position(): number { return this.$pos; }
  set position(v: number) { this.$pos = v >>> 0; }
  get bytesAvailable(): number { return Math.max(0, this.$len - this.$pos); }
  get endian(): string { return this.$little ? "littleEndian" : "bigEndian"; }
  set endian(v: string) {
    if (v !== "littleEndian" && v !== "bigEndian") throw new Error("Error #2008: Parameter type must be one of the accepted values.");
    this.$little = v === "littleEndian";
  }
  get objectEncoding(): number { return this.$objectEncoding; }
  set objectEncoding(v: number) { this.$objectEncoding = v >>> 0; }
  static get defaultObjectEncoding(): number { return 3; }

  clear(): void { this.$len = 0; this.$pos = 0; this.$buf = new Uint8Array(16); this.$view = new DataView(this.$buf.buffer); }

  writeByte(v: number): void { const p = this.$w(1); this.$buf[p] = v & 255; }
  writeBoolean(v: boolean): void { this.writeByte(v ? 1 : 0); }
  writeShort(v: number): void { const p = this.$w(2); this.$view.setInt16(p, (v << 16) >> 16, this.$little); }
  writeInt(v: number): void { const p = this.$w(4); this.$view.setInt32(p, v | 0, this.$little); }
  writeUnsignedInt(v: number): void { const p = this.$w(4); this.$view.setUint32(p, v >>> 0, this.$little); }
  writeFloat(v: number): void { const p = this.$w(4); this.$view.setFloat32(p, v, this.$little); }
  writeDouble(v: number): void { const p = this.$w(8); this.$view.setFloat64(p, v, this.$little); }
  writeBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
    offset >>>= 0; length >>>= 0;
    if (offset > bytes.$len) throw rangeError(2006, "The supplied index is out of bounds.");
    if (length === 0) length = bytes.$len - offset;
    if (offset + length > bytes.$len) throw rangeError(2006, "The supplied index is out of bounds.");
    const src = bytes.$buf.slice(offset, offset + length);
    const p = this.$w(length);
    this.$buf.set(src, p);
  }
  writeUTFBytes(s: string): void { const b = utf8enc.encode(String(s)); const p = this.$w(b.length); this.$buf.set(b, p); }
  writeUTF(s: string): void {
    const b = utf8enc.encode(String(s));
    if (b.length > 65535) throw rangeError(2006, "The supplied index is out of bounds.");
    const p = this.$w(2);
    this.$view.setUint16(p, b.length, this.$little);
    const q = this.$w(b.length);
    this.$buf.set(b, q);
  }
  writeMultiByte(s: string, charSet: string): void {
    if (/^(utf-?8)$/i.test(charSet)) { this.writeUTFBytes(s); return; }
    // iso-8859-1 / us-ascii and similar single-byte sets
    for (const ch of String(s)) this.writeByte(ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63);
  }
  writeObject(_o: any): void { unimplemented("ByteArray.writeObject (AMF)"); }

  readByte(): number { return (this.$buf[this.$r(1)] << 24) >> 24; }
  readUnsignedByte(): number { return this.$buf[this.$r(1)]; }
  readBoolean(): boolean { return this.$buf[this.$r(1)] !== 0; }
  readShort(): number { return this.$view.getInt16(this.$r(2), this.$little); }
  readUnsignedShort(): number { return this.$view.getUint16(this.$r(2), this.$little); }
  readInt(): number { return this.$view.getInt32(this.$r(4), this.$little); }
  readUnsignedInt(): number { return this.$view.getUint32(this.$r(4), this.$little); }
  readFloat(): number { return this.$view.getFloat32(this.$r(4), this.$little); }
  readDouble(): number { return this.$view.getFloat64(this.$r(8), this.$little); }
  readBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
    offset >>>= 0; length >>>= 0;
    if (length === 0) length = this.bytesAvailable;
    const p = this.$r(length);
    const src = this.$buf.slice(p, p + length);
    bytes.$ensure(offset + length);
    bytes.$buf.set(src, offset);
    if (offset + length > bytes.$len) bytes.$len = offset + length;
  }
  readUTFBytes(length: number): string {
    const p = this.$r(length >>> 0);
    let s = utf8dec.decode(this.$buf.subarray(p, p + (length >>> 0)));
    const nul = s.indexOf("\0");
    if (nul >= 0) s = s.slice(0, nul);
    return s;
  }
  readUTF(): string { return this.readUTFBytes(this.readUnsignedShort()); }
  readMultiByte(length: number, charSet: string): string {
    if (/^(utf-?8)$/i.test(charSet)) return this.readUTFBytes(length);
    const p = this.$r(length >>> 0);
    let s = "";
    for (let i = 0; i < (length >>> 0); i++) s += String.fromCharCode(this.$buf[p + i]);
    return s;
  }
  readObject(): any { unimplemented("ByteArray.readObject (AMF)"); return undefined; }

  compress(_algorithm: string = "zlib"): void { unimplemented("ByteArray.compress"); }
  uncompress(_algorithm: string = "zlib"): void { unimplemented("ByteArray.uncompress"); }
  deflate(): void { unimplemented("ByteArray.deflate"); }
  inflate(): void { unimplemented("ByteArray.inflate"); }

  toString(): string {
    let s = utf8dec.decode(this.$buf.subarray(0, this.$len));
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s;
  }
}
flashClass(ByteArray, "flash.utils.ByteArray");
implement(ByteArray, [IDataInput, IDataOutput]);

// ------------------------------------------------------------ time
const t0 = performance.now();
/** Milliseconds since the player started (int). */
export function getTimer(): number { return Math.floor(performance.now() - t0) | 0; }

// Timers run through ../_clock, which keeps them going while the tab is in the background.
export function setTimeout(closure: Function, delay: number, ...args: any[]): number {
  return later(() => runtimeHooks.guard(() => closure(...args)), Math.max(0, +delay || 0));
}
export function clearTimeout(id: number): void { cancelTimer(id); }
export function setInterval(closure: Function, delay: number, ...args: any[]): number {
  return every(() => runtimeHooks.guard(() => closure(...args)), Math.max(1, +delay || 0));
}
export function clearInterval(id: number): void { cancelTimer(id); }

/**
 * flash.utils.Timer. The next tick is scheduled `delay` ms after the previous
 * one ran (no catch-up), like Flash, which never fires a Timer more than once
 * per check.
 */
export class Timer extends EventDispatcher {
  declare $delay: number;
  declare $repeat: number;
  declare $count: number;
  declare $handle: number;
  $ctor(delay: number, repeatCount: number = 0): void {
    super.$ctor();
    if (!(delay >= 0) || !isFinite(delay)) throw rangeError(2066, "The Timer delay specified is out of range.");
    this.$delay = delay;
    this.$repeat = repeatCount | 0;
    this.$count = 0;
    this.$handle = 0;
  }
  get delay(): number { return this.$delay; }
  set delay(v: number) {
    if (!(v >= 0) || !isFinite(v)) throw rangeError(2066, "The Timer delay specified is out of range.");
    this.$delay = v;
    if (this.$handle) { this.stop(); this.start(); }
  }
  get repeatCount(): number { return this.$repeat; }
  set repeatCount(v: number) { this.$repeat = v | 0; if (this.$repeat > 0 && this.$count >= this.$repeat) this.stop(); }
  get currentCount(): number { return this.$count; }
  get running(): boolean { return this.$handle !== 0; }
  start(): void {
    if (this.$handle) return;
    this.$schedule();
  }
  private $schedule(): void {
    this.$handle = later(() => this.$tick(), Math.max(1, this.$delay));
  }
  private $tick(): void {
    this.$handle = 0;
    this.$count++;
    const done = this.$repeat > 0 && this.$count >= this.$repeat;
    if (!done) this.$schedule();
    runtimeHooks.guard(() => this.dispatchEvent(new TimerEvent(TimerEvent.TIMER)));
    if (done) runtimeHooks.guard(() => this.dispatchEvent(new TimerEvent(TimerEvent.TIMER_COMPLETE)));
  }
  stop(): void {
    if (this.$handle) cancelTimer(this.$handle);
    this.$handle = 0;
  }
  reset(): void { this.stop(); this.$count = 0; }
}
flashClass(Timer, "flash.utils.Timer");

// ------------------------------------------------------------ reflection
export function getQualifiedClassName(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "void";
  switch (typeof value) {
    case "number": return is(value, int) ? "int" : "Number";
    case "string": return "String";
    case "boolean": return "Boolean";
  }
  if (value === int) return "int";
  if (value === uint) return "uint";
  if (typeof value === "function" || value?.$extends) {
    if (value === Number || value === String || value === Boolean || value === Array || value === Object || value === Function) return value.name;
    return qualifiedClassName(value);
  }
  if (value instanceof Vector) return `__AS3__.vec::Vector.<${vectorTypeName((value as any).$type)}>`;
  if (Array.isArray(value)) return "Array";
  if (value instanceof XML) return "XML";
  if (typeof value.constructor === "function" && value.constructor !== Object) return qualifiedClassName(value.constructor);
  return "Object";
}
function vectorTypeName(t: any): string {
  if (t == null) return "*";
  if (t === int) return "int";
  if (t === uint) return "uint";
  return getQualifiedClassName(t);
}
export function getQualifiedSuperclassName(value: any): string | null {
  const cls = typeof value === "function" ? value : value?.constructor;
  const sup = cls ? Object.getPrototypeOf(cls) : null;
  if (!sup || sup === Function.prototype) return null;
  const n = qualifiedClassName(sup);
  return n === "ASObject" ? "Object" : n;
}
export function getDefinitionByName(name: string): any {
  const n = String(name);
  switch (n) {
    case "Object": case "Array": case "String": case "Number": case "Boolean": case "Function": case "Math": case "Date": case "RegExp": case "Error": case "JSON":
      return (globalThis as any)[n];
    case "int": return int;
    case "uint": return uint;
  }
  const i = n.lastIndexOf(".");
  const q = n.includes("::") ? n : i < 0 ? n : `${n.slice(0, i)}::${n.slice(i + 1)}`;
  const c = classByName(q);
  if (c) return c;
  const e = new ReferenceError(`Error #1065: Variable ${n.slice(n.lastIndexOf(":") + 1).slice(n.lastIndexOf(".") + 1)} is not defined.`);
  (e as any).errorID = 1065;
  throw e;
}
/** Minimal describeType: class name, base and public members found on the prototype chain. */
export function describeType(value: any): XML {
  const isClass = typeof value === "function";
  const cls = isClass ? value : value?.constructor;
  const name = getQualifiedClassName(value);
  const parts: string[] = [];
  const seen = new Set<string>();
  for (let p = cls?.prototype; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
    for (const k of Object.getOwnPropertyNames(p)) {
      if (k === "constructor" || k.startsWith("$") || seen.has(k)) continue;
      seen.add(k);
      const d = Object.getOwnPropertyDescriptor(p, k)!;
      if (d.get || d.set) parts.push(`<accessor name="${k}" access="${d.get && d.set ? "readwrite" : d.get ? "readonly" : "writeonly"}" type="*"/>`);
      else if (typeof d.value === "function") parts.push(`<method name="${k}" returnType="*"/>`);
      else parts.push(`<variable name="${k}" type="*"/>`);
    }
  }
  const base = getQualifiedSuperclassName(cls) ?? "Object";
  return new XML(`<type name="${name}" base="${isClass ? "Class" : base}" isDynamic="false" isFinal="false" isStatic="${isClass}"><extendsClass type="${base}"/>${isClass ? "" : parts.join("")}</type>`);
}

export function escapeMultiByte(s: string): string { return encodeURIComponent(s); }
export function unescapeMultiByte(s: string): string { return decodeURIComponent(s); }
