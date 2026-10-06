/**
 * ActionScript 3 language semantics for the converted client.
 *
 * Everything here exists to make the converted TypeScript behave like the AS3
 * it came from. Nothing in here is game-specific.
 */

// ------------------------------------------------------------ numeric types
export type int = number;
export type uint = number;
export type Class = any;
/** AS3 `int` used as a value (int.MAX_VALUE, `x is int`, Vector.<int>). */
export const int = Object.freeze({ MAX_VALUE: 2147483647, MIN_VALUE: -2147483648, $name: "int" });
export const uint = Object.freeze({ MAX_VALUE: 4294967295, MIN_VALUE: 0, $name: "uint" });
export const Class = Object.freeze({ $name: "Class" });

// ------------------------------------------------------------ construction protocol
/**
 * Root of every converted class. AS3 runs a class's field initialisers and
 * constructor body before its superclass constructor and allows `this` before
 * `super()`; JavaScript constructors cannot. So the JS constructor only
 * allocates (`$alloc`, for runtime-native state) and then calls the AS3
 * constructor chain, which lives in `$ctor` methods.
 */
export class ASObject {
  constructor(...args: any[]) {
    this.$alloc();
    this.$afterAlloc();
    this.$ctor(...args);
  }
  /** Runtime classes allocate native state here. Game classes never override it. */
  $alloc(): void {}
  /** Runs once every $alloc level has finished, before the AS3 constructor (library symbols populate here). */
  $afterAlloc(): void {}
  $ctor(..._args: any[]): void {}
  toString(): string {
    return `[object ${simpleClassName(this.constructor)}]`;
  }
}

/**
 * AS3 hasOwnProperty: true for dynamic properties and for every member the
 * object's class hierarchy declares (fields, methods, accessors are traits of
 * the instance), false for prototype properties. JavaScript would answer false
 * for methods; GLOBAL.ResizeLayer relies on the AS3 answer to lay out the HUD.
 */
Object.defineProperty(ASObject.prototype, "hasOwnProperty", {
  value: function hasOwnProperty(this: object, name: any): boolean {
    const n = String(name);
    if (Object.prototype.hasOwnProperty.call(this, n)) return true;
    if (n === "constructor" || n.charCodeAt(0) === 36 /* $ */) return false;
    for (let p = Object.getPrototypeOf(this); p && p !== ASObject.prototype; p = Object.getPrototypeOf(p)) {
      if (Object.prototype.hasOwnProperty.call(p, n)) return true;
    }
    return false;
  },
  writable: true,
  configurable: true,
});

/** AS3 Error with the same construction protocol. */
export class ASError extends Error {
  declare errorID: number;
  constructor(...args: any[]) {
    super();
    this.$ctor(...args);
  }
  $ctor(message: any = "", id: any = 0): void {
    this.message = String(message);
    Object.defineProperty(this, "errorID", { value: id | 0, writable: true, configurable: true });
  }
  getStackTrace(): string {
    return this.stack ?? null;
  }
}
export class ArgumentError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "ArgumentError"; } }
export class SecurityError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "SecurityError"; } }
export class DefinitionError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "DefinitionError"; } }
export class VerifyError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "VerifyError"; } }
export class ASRangeError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "RangeError"; } }
export class ASTypeError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "TypeError"; } }

// Errors raised by the JS engine lack AS3's getStackTrace()/errorID.
Object.defineProperty(Error.prototype, "getStackTrace", {
  value: function (this: Error) { return this.stack ?? null; }, writable: true, configurable: true,
});
if (!Object.getOwnPropertyDescriptor(Error.prototype, "errorID")) {
  Object.defineProperty(Error.prototype, "errorID", {
    get() { return 0; },
    set(v) { Object.defineProperty(this, "errorID", { value: v, writable: true, configurable: true }); },
    configurable: true,
  });
}

// ------------------------------------------------------------ class metadata
const CLASS_NAMES = new Map<any, string>();
const CLASSES_BY_NAME = new Map<string, any>();

export function registerClasses(map: Record<string, any>): void {
  for (const [q, cls] of Object.entries(map)) {
    if (!cls) continue;
    CLASS_NAMES.set(cls, q);
    CLASSES_BY_NAME.set(q, cls);
  }
}
export function registerClass(q: string, cls: any): void {
  CLASS_NAMES.set(cls, q);
  CLASSES_BY_NAME.set(q, cls);
}
export function qualifiedClassName(cls: any): string {
  return CLASS_NAMES.get(cls) ?? cls?.$name ?? cls?.name ?? "Object";
}
export function simpleClassName(cls: any): string {
  const q = qualifiedClassName(cls);
  const i = q.lastIndexOf("::");
  return i < 0 ? q : q.slice(i + 2);
}
/** Every registered class (game, runtime and interface markers). */
export function registeredClasses(): IterableIterator<any> {
  return CLASSES_BY_NAME.values();
}
export function classByName(q: string): any {
  return CLASSES_BY_NAME.get(q) ?? CLASSES_BY_NAME.get(q.replace(/\.(\w+)$/, "::$1"));
}

/** Installs AS3 field defaults on the prototype (AS3 sets them at allocation). */
export function fields(cls: any, defaults: Record<string, unknown>): void {
  for (const k of Object.keys(defaults)) {
    Object.defineProperty(cls.prototype, k, { value: defaults[k], writable: true, enumerable: false, configurable: true });
  }
  Object.defineProperty(cls, "$fields", { value: Object.keys(defaults), configurable: true });
}

/** [Embed] metadata: binds a class to a library symbol or an embedded image. */
export function embed(cls: any, meta: { source?: string; symbol?: string; [k: string]: string | undefined }): void {
  Object.defineProperty(cls, "$embed", { value: meta, configurable: true });
}

interface IfaceMarker { $name: string; $extends: IfaceMarker[]; }
export function iface(name: string, ext: IfaceMarker[]): IfaceMarker {
  const m: IfaceMarker = { $name: name, $extends: ext };
  Object.defineProperty(m, Symbol.hasInstance, { value: (v: any) => implementsIface(v, m) });
  registerClass(name, m);
  return m;
}
export function implement(cls: any, ifaces: IfaceMarker[]): void {
  Object.defineProperty(cls, "$interfaces", { value: ifaces, configurable: true });
}
function ifaceExtends(i: IfaceMarker, target: IfaceMarker): boolean {
  return i === target || i.$extends.some((e) => ifaceExtends(e, target));
}
function implementsIface(v: any, m: IfaceMarker): boolean {
  if (v == null || typeof v !== "object") return false;
  for (let c = v.constructor; c && c !== Object; c = Object.getPrototypeOf(c)) {
    const list: IfaceMarker[] | undefined = Object.prototype.hasOwnProperty.call(c, "$interfaces") ? c.$interfaces : undefined;
    if (list && list.some((i) => ifaceExtends(i, m))) return true;
  }
  return false;
}

/**
 * AVM2 initialises a class's statics when the class is first used. `init`
 * assigns them (and runs class-body statements) in source order; it runs on
 * the first read or write of any listed static.
 */
export function lazyStatics(cls: any, defaults: Record<string, unknown>, init: () => void): void {
  let state = 0;
  const run = () => {
    if (state) return;
    state = 1;
    for (const [k, v] of Object.entries(defaults)) Object.defineProperty(cls, k, { value: v, writable: true, enumerable: true, configurable: true });
    init();
  };
  for (const k of Object.keys(defaults)) {
    Object.defineProperty(cls, k, {
      get() { run(); return cls[k]; },
      set(v) { run(); cls[k] = v; },
      enumerable: true,
      configurable: true,
    });
  }
}

/** AS3 namespace value (`private namespace x;` used as a value). */
export function namespace(uri: string): object {
  return Object.freeze({ uri, toString: () => uri });
}

// ------------------------------------------------------------ coercions and type tests
/** Implicit coercion to String: null and undefined stay null. */
export function str(v: any): string {
  return v == null ? null : String(v);
}

function isIntValue(v: any): boolean {
  return typeof v === "number" && (v | 0) === v && !Object.is(v, -0);
}
function isUintValue(v: any): boolean {
  return typeof v === "number" && v >>> 0 === v && !Object.is(v, -0);
}

export function is(v: any, type: any): boolean {
  if (type == null) return true;
  switch (type) {
    case int: return isIntValue(v);
    case uint: return isUintValue(v);
    case Number: return typeof v === "number";
    case String: return typeof v === "string";
    case Boolean: return typeof v === "boolean";
    case Object: return v != null;
    case Function: return typeof v === "function";
    case Class: return typeof v === "function";
    case Array: return Array.isArray(v) && !(v instanceof Vector);
  }
  if (v == null) return false;
  if (type.$extends) return implementsIface(v, type);
  if (typeof type === "function") return v instanceof type;
  return false;
}

export function as<T = any>(v: any, type: any): T {
  return is(v, type) ? v : null;
}

/** Implicit coercion to a class/interface type: null passes, mismatches throw #1034. */
export function cast<T = any>(v: any, type: any): T {
  if (v == null) return null;
  if (type === Array && Array.isArray(v) && !(v instanceof Vector)) return v;
  if (is(v, type)) return v;
  throw new TypeError(`Error #1034: Type Coercion failed: cannot convert ${describeValue(v)} to ${typeName(type)}.`);
}

function typeName(type: any): string {
  if (type == null) return "*";
  if (type.$name) return type.$name.replace("::", ".");
  return qualifiedClassName(type).replace("::", ".");
}
function describeValue(v: any): string {
  if (typeof v === "object" || typeof v === "function") return `${v}@${Math.floor(Math.random() * 0xffffff).toString(16)}`;
  return String(v);
}

// ------------------------------------------------------------ method closures
const boundCache = new WeakMap<object, Map<Function, Function>>();
/**
 * AS3 method closure: bound to its receiver, and the same object every time,
 * so `removeEventListener(type, this.handler)` matches the earlier add.
 */
export function bind(recv: any, fn: Function): any {
  if (typeof fn !== "function") return fn;
  if (recv == null || (typeof recv !== "object" && typeof recv !== "function")) return fn.bind(recv);
  let m = boundCache.get(recv);
  if (!m) boundCache.set(recv, (m = new Map()));
  let b = m.get(fn);
  if (!b) {
    b = fn.bind(recv);
    m.set(fn, b!);
  }
  return b;
}
export function bindKey(recv: any, key: string): any {
  return bind(recv, recv[key]);
}

// ------------------------------------------------------------ iteration
/** `for each (x in o)`: values of enumerable properties (skips Array holes like AS3). */
/**
 * for each (v in o). Not a generator (they are slow in hot loops): arrays and vectors are iterated live
 * by their own iterator, dictionaries by their map's; plain objects fix their own keys when the loop
 * starts and read each value when the loop reaches it, skipping keys deleted meanwhile (as for...in does).
 */
export function values(o: any): Iterable<any> {
  if (o == null) return EMPTY_ITERABLE;
  if (Array.isArray(o)) return o;
  if (o instanceof Dictionary) return o.values();
  if (typeof o.$forEachValues === "function") return o.$forEachValues();
  return new ObjectValues(o);
}
const EMPTY_ITERABLE: Iterable<any> = [];
class ObjectValues implements IterableIterator<any> {
  private keys: string[];
  private i = 0;
  constructor(private o: any) { this.keys = Object.keys(o); }
  next(): IteratorResult<any> {
    while (this.i < this.keys.length) {
      const k = this.keys[this.i++];
      if (k in this.o) return { value: this.o[k], done: false };
    }
    return { value: undefined, done: true };
  }
  [Symbol.iterator](): IterableIterator<any> { return this; }
}

export function setPropertyIsEnumerable(o: any, name: string, enumerable = true): void {
  const d = Object.getOwnPropertyDescriptor(o, name);
  if (d) Object.defineProperty(o, name, { ...d, enumerable });
}

// ------------------------------------------------------------ Array statics
declare global {
  interface Error {
    /** AS3 Error.getStackTrace() */
    getStackTrace(): string;
    /** AS3 Error.errorID */
    errorID: number;
  }
  interface ArrayConstructor {
    CASEINSENSITIVE: number; DESCENDING: number; UNIQUESORT: number; RETURNINDEXEDARRAY: number; NUMERIC: number;
  }
}
const ARRAY_FLAGS = { CASEINSENSITIVE: 1, DESCENDING: 2, UNIQUESORT: 4, RETURNINDEXEDARRAY: 8, NUMERIC: 16 };
for (const [k, v] of Object.entries(ARRAY_FLAGS)) Object.defineProperty(Array, k, { value: v });

// ------------------------------------------------------------ sorting (AVM2 algorithm)
type Cmp = (a: any, b: any) => number;

/**
 * Port of avmplus ArraySort::qsort (Tamarin core/ArrayClass.cpp). It is not
 * stable, so elements that compare equal end up in the same order as in Flash.
 */
function avmQsort(a: any[], lo: number, hi: number, cmp: Cmp): void {
  const stk: number[] = [];
  const swap = (i: number, j: number) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
  const compare = (i: number, j: number) => cmp(a[i], a[j]);
  if (lo >= hi) return;
  for (;;) {
    const size = hi - lo + 1;
    let pushedOrContinued = false;
    if (size < 4) {
      if (size === 3) {
        if (compare(lo, lo + 1) > 0) {
          swap(lo, lo + 1);
          if (compare(lo + 1, lo + 2) > 0) {
            swap(lo + 1, lo + 2);
            if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
          }
        } else if (compare(lo + 1, lo + 2) > 0) {
          swap(lo + 1, lo + 2);
          if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
        }
      } else if (size === 2) {
        if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
      }
    } else {
      const pivot = lo + (size >>> 1);
      swap(pivot, lo);
      let left = lo;
      let right = hi + 1;
      for (;;) {
        do left++; while (left <= hi && compare(left, lo) <= 0);
        do right--; while (right > lo && compare(right, lo) >= 0);
        if (right < left) break;
        swap(left, right);
      }
      swap(lo, right);
      if (right - 1 - lo >= hi - left) {
        if (lo + 1 < right) stk.push(lo, right - 1);
        if (left < hi) { lo = left; pushedOrContinued = true; }
      } else {
        if (left < hi) stk.push(left, hi);
        if (lo + 1 < right) { hi = right - 1; pushedOrContinued = true; }
      }
    }
    if (pushedOrContinued) continue;
    if (!stk.length) return;
    hi = stk.pop()!;
    lo = stk.pop()!;
  }
}

function toCmpResult(r: any): number {
  const n = Number(r);
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function stringCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function valueCompare(flags: number): Cmp {
  const numeric = !!(flags & 16);
  const ci = !!(flags & 1);
  return (a, b) => {
    if (numeric) {
      const x = Number(a), y = Number(b);
      if (isNaN(x) && isNaN(y)) return 0;
      if (isNaN(x)) return 1;
      if (isNaN(y)) return -1;
      return x < y ? -1 : x > y ? 1 : 0;
    }
    let x = String(a), y = String(b);
    if (ci) { x = x.toLowerCase(); y = y.toLowerCase(); }
    return stringCompare(x, y);
  };
}

function sortImpl(arr: any[], cmp: Cmp, flags: number): any {
  const raw: any[] = (arr as any)[RAW] ?? arr;
  const len = raw.length;
  // AS3 moves undefined values (and holes) to the end before sorting.
  const idx: number[] = [];
  const undef: number[] = [];
  for (let i = 0; i < len; i++) (raw[i] === undefined ? undef : idx).push(i);
  const desc = !!(flags & 2);
  let sawEqual = false;
  const c: Cmp = (ia, ib) => {
    let r = cmp(raw[ia], raw[ib]);
    if (desc) r = -r;
    if (r === 0 && ia !== ib) sawEqual = true;
    return r;
  };
  avmQsort(idx, 0, idx.length - 1, c);
  if (flags & 4 && sawEqual) return 0;
  const order = idx.concat(undef);
  if (flags & 8) return order;
  const copy = order.map((i) => raw[i]);
  for (let i = 0; i < len; i++) raw[i] = copy[i];
  return arr;
}

/** AS3 Array.sort / Vector.sort: sort(), sort(fn), sort(flags), sort(fn, flags). */
export function sort(arr: any, ...args: any[]): any {
  if (arr == null) throw new TypeError("Error #1009: Cannot access a property or method of a null object reference.");
  if (!Array.isArray(arr)) return arr.sort(...args);
  let fn: Function | undefined;
  let flags = 0;
  if (typeof args[0] === "function") { fn = args[0]; flags = Number(args[1]) | 0; }
  else if (args.length) flags = Number(args[0]) | 0;
  const cmp: Cmp = fn ? (a, b) => toCmpResult(fn!(a, b)) : valueCompare(flags);
  return sortImpl(arr, cmp, fn ? flags & ~16 & ~1 : flags);
}

/** AS3 Array.sortOn(fieldName | fieldNames, options | optionsArray). */
export function sortOn(arr: any, names: any, options: any = 0): any {
  if (arr == null) throw new TypeError("Error #1009: Cannot access a property or method of a null object reference.");
  const fieldList: string[] = Array.isArray(names) ? names.map(String) : [String(names)];
  const optList: number[] = Array.isArray(options) ? options.map((o: any) => Number(o) | 0) : fieldList.map(() => Number(options) | 0);
  const globalFlags = Array.isArray(options) ? 0 : Number(options) | 0;
  const cmps = fieldList.map((_, i) => valueCompare(optList[i] ?? 0));
  const cmp: Cmp = (a, b) => {
    for (let i = 0; i < fieldList.length; i++) {
      const f = fieldList[i];
      let r = cmps[i](a?.[f], b?.[f]);
      if (Array.isArray(options) && optList[i] & 2) r = -r;
      if (r) return r;
    }
    return 0;
  };
  return sortImpl(arr, cmp, globalFlags);
}

// ------------------------------------------------------------ Vector.<T>
const RAW = Symbol("vector.raw");

function elemDefault(type: any): any {
  if (type === int || type === uint) return 0;
  if (type === Number) return NaN;
  if (type === Boolean) return false;
  return null;
}
function elemCoerce(type: any, v: any): any {
  switch (type) {
    case null: case undefined: return v;
    case int: return v | 0;
    case uint: return v >>> 0;
    case Number: return Number(v);
    case Boolean: return Boolean(v);
    case String: return str(v);
    case Object: case Function: return v;
  }
  return cast(v, type);
}
function rangeError(i: any, len: number): RangeError {
  return new RangeError(`Error #1125: The index ${i} is out of range ${len}.`);
}
function isIndexKey(k: string): boolean {
  const c = k.charCodeAt(0);
  return (c >= 48 && c <= 57) || (c === 45 && k.length > 1 && k.charCodeAt(1) >= 48 && k.charCodeAt(1) <= 57);
}

const VECTOR_TRAPS: ProxyHandler<any> = {
  get(t, k) {
    if (typeof k === "string" && isIndexKey(k)) {
      const i = Number(k);
      if (!(i >= 0 && i < t.length && Number.isInteger(i))) throw rangeError(k, t.length);
      return t[i];
    }
    if (k === RAW) return t;
    return t[k];
  },
  set(t, k, v) {
    if (typeof k === "string") {
      if (isIndexKey(k)) {
        const i = Number(k);
        if (!(i >= 0 && Number.isInteger(i)) || i > t.length || (i === t.length && t.$fixed)) throw rangeError(k, t.length);
        t[i] = elemCoerce(t.$type, v);
        return true;
      }
      if (k === "length") {
        if (t.$fixed) throw new RangeError("Error #1126: Cannot change the length of a fixed Vector.");
        const n = v >>> 0;
        const old = t.length;
        t.length = n;
        for (let j = old; j < n; j++) t[j] = elemDefault(t.$type);
        return true;
      }
      if (k === "fixed") { t.$fixed = !!v; return true; }
    }
    t[k] = v;
    return true;
  },
};

// Element access. The converter emits these for receivers whose static type is Vector.<T>, so
// AS3's bounds checks stay exact without a Proxy (a Proxy made every access ~100x slower).
// Values are coerced to the element type by the converter before vset is called.

/** v[i] read: RangeError #1125 outside 0..length-1, as in AS3. */
export function vget(v: any, i: any): any {
  if (typeof i === "number" && i >= 0 && i < v.length && (i | 0) === i) return v[i];
  if (!(v instanceof Vector)) return v[i];
  throw rangeError(i, v.length);
}
/** v[i] = x: writes inside the vector, or appends at index length unless fixed. */
export function vset(v: any, i: any, x: any): any {
  if (typeof i === "number" && i >= 0 && (i | 0) === i) {
    const n = v.length;
    if (i < n || (i === n && !v.$fixed)) { v[i] = x; return x; }
  }
  if (!(v instanceof Vector)) { v[i] = x; return x; }
  throw rangeError(i, v.length);
}
/** v[i]++ / ++v[i] (delta -1 for --): stores the coerced result, returns the old or new value. */
export function vinc(v: any, i: any, delta: number, prefix: boolean): any {
  const old = Number(vget(v, i));
  const next = v instanceof Vector ? elemCoerce((v as any).$type, old + delta) : old + delta;
  vset(v, i, next);
  return prefix ? next : old;
}
/** v.length = n: fixed vectors throw #1126, new slots get the element type's default. */
export function vsetLength(v: any, n: any): any {
  if (!(v instanceof Vector)) { v.length = n; return n; }
  if ((v as any).$fixed) throw new RangeError("Error #1126: Cannot change the length of a fixed Vector.");
  const len = n >>> 0, old = v.length;
  v.length = len;
  for (let j = old; j < len; j++) v[j] = elemDefault((v as any).$type);
  return n;
}

/** AS3 Vector.<T>: typed, bounds-checked (reads past the end throw RangeError #1125). */
export class Vector<T> extends Array<T> {
  declare $type: any;
  declare $fixed: boolean;
  static get [Symbol.species]() { return Array; }

  constructor(length: number = 0, fixed: boolean = false, type: any = null) {
    super();
    this.$type = type;
    this.$fixed = false;
    const n = length >>> 0;
    for (let i = 0; i < n; i++) (this as any)[i] = elemDefault(type);
    this.$fixed = !!fixed;
  }
  static from(src: any, type: any = null): Vector<any> {
    if (src == null) return null;
    const v = new Vector<any>(0, false, type);
    for (let i = 0; i < src.length; i++) Array.prototype.push.call(v, elemCoerce(type, src[i]));
    return v;
  }
  static fromArray(src: any[], type: any = null): Vector<any> { return Vector.from(src, type); }
  static of(type: any): any {
    const C = function (len = 0, fixed = false) { return new Vector(len, fixed, type); };
    return C;
  }
  get fixed(): boolean { return this.$fixed; }
  set fixed(v: boolean) { this.$fixed = !!v; }

  private raw(): any[] { return (this as any)[RAW] ?? this; }
  private like(items: any[]): Vector<T> {
    const v = new Vector<T>(0, false, (this as any).$type);
    for (const x of items) Array.prototype.push.call(v, x);
    return v;
  }
  private checkFixed(): void {
    if ((this as any).$fixed) throw new RangeError("Error #1126: Cannot change the length of a fixed Vector.");
  }
  push(...items: T[]): number {
    this.checkFixed();
    const r = this.raw();
    for (const x of items) Array.prototype.push.call(r, elemCoerce((r as any).$type, x));
    return r.length;
  }
  unshift(...items: T[]): number {
    this.checkFixed();
    const r = this.raw();
    Array.prototype.unshift.apply(r, items.map((x) => elemCoerce((r as any).$type, x)));
    return r.length;
  }
  pop(): T { this.checkFixed(); return Array.prototype.pop.call(this.raw()); }
  shift(): T { this.checkFixed(); return Array.prototype.shift.call(this.raw()); }
  splice(start: number, deleteCount?: number, ...items: T[]): any {
    this.checkFixed();
    const r = this.raw();
    const args: any[] = [start, deleteCount ?? r.length, ...items.map((x) => elemCoerce((r as any).$type, x))];
    return this.like(Array.prototype.splice.apply(r, args as any));
  }
  slice(start?: number, end?: number): any { return this.like(Array.prototype.slice.call(this.raw(), start, end)); }
  concat(...items: any[]): any {
    const out = Array.prototype.slice.call(this.raw());
    for (const it of items) {
      const src = it?.[RAW] ?? it;
      if (Array.isArray(src)) out.push(...src); else out.push(it);
    }
    return this.like(out);
  }
  filter(fn: any, thisArg?: any): any { return this.like(Array.prototype.filter.call(this.raw(), fn, thisArg)); }
  map(fn: any, thisArg?: any): any { return this.like(Array.prototype.map.call(this.raw(), fn, thisArg)); }
  reverse(): any { Array.prototype.reverse.call(this.raw()); return this; }
  sort(fn?: any): any { return sort(this, ...(fn === undefined ? [] : [fn])); }
  indexOf(x: T, from?: number): number { return Array.prototype.indexOf.call(this.raw(), x, from); }
  lastIndexOf(x: T, from?: number): number { return from === undefined ? Array.prototype.lastIndexOf.call(this.raw(), x) : Array.prototype.lastIndexOf.call(this.raw(), x, from); }
  join(sep?: string): string { return Array.prototype.join.call(this.raw(), sep); }
  forEach(fn: any, thisArg?: any): void { Array.prototype.forEach.call(this.raw(), fn, thisArg); }
  every(fn: any, thisArg?: any): boolean { return Array.prototype.every.call(this.raw(), fn, thisArg); }
  some(fn: any, thisArg?: any): boolean { return Array.prototype.some.call(this.raw(), fn, thisArg); }
  toString(): string { return this.join(","); }
  [Symbol.iterator](): IterableIterator<T> { return Array.prototype.values.call(this.raw()); }
}
registerClass("__AS3__.vec::Vector", Vector);

// ------------------------------------------------------------ Dictionary
/**
 * flash.utils.Dictionary: object keys by identity. The converter rewrites
 * `d[k]` to d.get(k) / d.set(k, v) when the static type is Dictionary.
 */
export class Dictionary extends ASObject {
  declare private $map: Map<any, any>;
  $alloc(): void { super.$alloc(); this.$map = new Map(); }
  $ctor(_weakKeys = false): void { super.$ctor(); }
  get(k: any): any { return this.$map.get(k); }
  set(k: any, v: any): void { this.$map.set(k, v); }
  has(k: any): boolean { return this.$map.has(k); }
  delete(k: any): boolean { return this.$map.delete(k); }
  keys(): IterableIterator<any> { return this.$map.keys(); }
  values(): IterableIterator<any> { return this.$map.values(); }
  hasOwnProperty(k: any): boolean { return this.$map.has(k); }
}
registerClass("flash.utils::Dictionary", Dictionary);

// ------------------------------------------------------------ misc globals
export function trace(...args: any[]): void {
  console.log(args.map((a) => String(a)).join(" "));
}
export function isXMLName(s: any): boolean {
  return typeof s === "string" && /^[A-Za-z_][\w.-]*$/.test(s);
}

export { XML, XMLList } from "./xml";
