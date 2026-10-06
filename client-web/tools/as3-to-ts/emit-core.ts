/**
 * Expression-level translation from AS3 to TypeScript.
 *
 * Every expression is emitted together with its static AS3 type. Types drive
 * the semantic rewrites that keep behaviour identical to the Flash build:
 *  - implicit coercions at typed boundaries (`| 0` for int, `>>> 0` for uint,
 *    Number(), Boolean(), as3.str() for String, as3.cast() for classes)
 *  - bound method closures (`as3.bind`) so `removeEventListener(this.f)` works
 *  - Dictionary object keys (`.get/.set/.has/.delete`)
 *  - AS3 `is` / `as`, Array sort flags, Date properties, E4X
 */
import type * as A from "./ast.ts";
import { PRIMITIVES, type ClassModel, type FileModel, type GlobalDef, type Member, type ParamInfo, type Program } from "./model.ts";
import type { LocalDecision } from "./analyze.ts";

export const P = { SEQ: 1, ASSIGN: 3, COND: 4, OR: 5, AND: 6, BOR: 7, BXOR: 8, BAND: 9, EQ: 10, REL: 11, SHIFT: 12, ADD: 13, MUL: 14, UNARY: 16, POSTFIX: 17, CALL: 19, PRIMARY: 20 };
const BIN_P: Record<string, number> = {
  "||": 5, "&&": 6, "|": 7, "^": 8, "&": 9, "==": 10, "!=": 10, "===": 10, "!==": 10,
  "<": 11, ">": 11, "<=": 11, ">=": 11, instanceof: 11, in: 11, "<<": 12, ">>": 12, ">>>": 12,
  "+": 13, "-": 13, "*": 14, "/": 14, "%": 14,
};

export const DICT = "flash.utils.Dictionary";

const NATIVE_GLOBALS = new Set([
  "Object", "Array", "String", "Number", "Boolean", "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError",
  "ReferenceError", "SyntaxError", "EvalError", "URIError", "Function", "isNaN", "isFinite", "parseInt", "parseFloat",
  "escape", "unescape", "encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent", "NaN", "Infinity", "undefined",
]);

const RESERVED_LOCALS = new Set(["arguments", "eval", "let", "yield", "await", "enum", "implements", "interface", "package", "private", "protected", "public", "static", "as3"]);
export const safeLocal = (n: string) => (RESERVED_LOCALS.has(n) ? n + "_" : n);

const DATE_GET: Record<string, string> = {
  time: "getTime", fullYear: "getFullYear", month: "getMonth", date: "getDate", day: "getDay", hours: "getHours",
  minutes: "getMinutes", seconds: "getSeconds", milliseconds: "getMilliseconds", fullYearUTC: "getUTCFullYear",
  monthUTC: "getUTCMonth", dateUTC: "getUTCDate", dayUTC: "getUTCDay", hoursUTC: "getUTCHours", minutesUTC: "getUTCMinutes",
  secondsUTC: "getUTCSeconds", millisecondsUTC: "getUTCMilliseconds", timezoneOffset: "getTimezoneOffset",
};
const DATE_SET: Record<string, string> = {
  time: "setTime", fullYear: "setFullYear", month: "setMonth", date: "setDate", hours: "setHours", minutes: "setMinutes",
  seconds: "setSeconds", milliseconds: "setMilliseconds", fullYearUTC: "setUTCFullYear", monthUTC: "setUTCMonth",
  dateUTC: "setUTCDate", hoursUTC: "setUTCHours", minutesUTC: "setUTCMinutes", secondsUTC: "setUTCSeconds",
  millisecondsUTC: "setUTCMilliseconds",
};
const XML_METHODS = new Set([
  "appendChild", "attribute", "attributes", "child", "childIndex", "children", "comments", "contains", "copy", "descendants",
  "elements", "hasComplexContent", "hasSimpleContent", "insertChildAfter", "insertChildBefore", "length", "localName", "name",
  "namespace", "nodeKind", "parent", "prependChild", "processingInstructions", "replace", "setChildren", "setName", "text",
  "toString", "toXMLString", "valueOf", "hasOwnProperty",
]);

export interface Ex {
  code: string;
  type: string;
  prec: number;
  kind?: "method" | "class" | "pkg" | "value" | "global";
  member?: Member;
  global?: GlobalDef;
  num?: number;
  pure?: boolean;
  pkgPath?: string;
  /** element of a Vector: the runtime Vector coerces on write */
  vecElem?: boolean;
}

export interface LocalVar { emitName: string; type: string; }

export interface FnCtx {
  parent?: FnCtx;
  cls?: ClassModel;
  isStatic: boolean;
  isCtor: boolean;
  retType: string;
  vars: Map<string, LocalVar>;
  decisions: Map<string, LocalDecision>;
  /** Identifier used for the E4X filter node inside `.( )` predicates. */
  filterNode?: string;
  /** `arguments.callee` in a method: the method closure bound to its receiver */
  self?: string;
  /** true inside nested function expressions (callee would be the nested function) */
  nested?: boolean;
}

export class EmitterCore {
  protected localOf = new Map<string, string>();
  protected taken = new Set<string>(["as3"]);
  protected gameImports = new Map<string, string>(); // exportName -> local
  protected moduleImports = new Map<string, Map<string, string>>(); // module -> (name -> local)
  protected as3Named = new Set<string>();
  protected usesAs3 = false;
  protected usesConfig = false;
  /** Game qnames referenced while emitting load-time code (static initialisers, supertypes). */
  loadTimeRefs = new Set<string>();
  protected loadTime = false;
  protected indentUnit = "    ";
  protected ind = 0;
  protected filterCounter = 0;

  constructor(public prog: Program, public f: FileModel) {
    for (const c of f.classes) { this.localOf.set(c.qname, c.name); this.taken.add(c.name); }
    for (const c of f.privateClasses.values()) { this.localOf.set(c.qname, c.name); this.taken.add(c.name); }
    for (const g of [...f.globals, ...f.privateGlobals.values()]) { this.localOf.set(g.qname, g.name); this.taken.add(g.name); }
  }

  warn(msg: string, pos?: number): void {
    this.prog.warn(`${this.f.path}${pos !== undefined ? "@" + pos : ""}: ${msg}`);
  }

  // ------------------------------------------------------------ imports
  as3(name: string): string { this.usesAs3 = true; return `as3.${name}`; }
  as3Import(name: string): string { this.as3Named.add(name); return name; }

  ref(q: string): string {
    const cached = this.localOf.get(q);
    if (cached) {
      if (this.loadTime && !this.isOwn(q)) this.noteLoad(q);
      return cached;
    }
    const cm = this.prog.classes.get(q);
    const g = cm ? undefined : this.prog.globals.get(q);
    const def = cm ?? g;
    if (!def) return q;
    let local: string;
    if (!def.builtin) {
      local = this.pickLocal(def.name, def.exportName);
      this.gameImports.set(def.exportName, local);
    } else if (NATIVE_GLOBALS.has(q)) {
      local = q;
    } else if (!q.includes(".")) {
      local = q;
      this.as3Named.add(q);
    } else {
      const pkg = q.slice(0, q.lastIndexOf("."));
      local = this.pickLocal(def.name, `${def.name}_${pkg.replace(/\./g, "_")}`);
      const mod = pkg.replace(/\./g, "/");
      if (!this.moduleImports.has(mod)) this.moduleImports.set(mod, new Map());
      this.moduleImports.get(mod)!.set(def.name, local);
    }
    this.localOf.set(q, local);
    this.taken.add(local);
    if (this.loadTime) this.noteLoad(q);
    return local;
  }

  private isOwn(q: string): boolean {
    return this.f.classes.some((c) => c.qname === q) || [...this.f.privateClasses.values()].some((c) => c.qname === q) || this.f.globals.some((g) => g.qname === q);
  }
  private noteLoad(q: string): void {
    const cm = this.prog.classes.get(q) ?? this.prog.globals.get(q);
    if (cm && !cm.builtin) this.loadTimeRefs.add(q);
  }

  private pickLocal(simple: string, alt: string): string {
    if (!this.taken.has(simple)) return simple;
    let a = alt;
    let i = 2;
    while (this.taken.has(a)) a = `${alt}_${i++}`;
    return a;
  }

  // ------------------------------------------------------------ types
  tsType(t: string): string {
    switch (t) {
      case "int": case "uint": return this.as3Import(t);
      case "Number": return "number";
      case "String": return "string";
      case "Boolean": return "boolean";
      case "*": case "Object": case "Class": case "null": case "Math": case "JSON": case "Namespace": case "QName": return "any";
      case "void": return "void";
      case "Array": return "any[]";
      case "Function": return "Function";
      case "Date": return "Date";
      case "RegExp": return "RegExp";
      case "Error": return "Error";
    }
    if (t.startsWith("Vector.<")) return `${this.ref("Vector")}<${this.tsType(t.slice(8, -1))}>`;
    if (t === "Vector") return `${this.ref("Vector")}<any>`;
    if (t.startsWith("Class:")) return "any";
    if (!this.prog.classes.has(t)) return "any";
    return this.ref(t);
  }

  /** Runtime value identifying an AS3 type (for cast/is/as/Vector). */
  typeValue(t: string): string {
    switch (t) {
      case "int": case "uint": return this.as3Import(t);
      case "Number": case "String": case "Boolean": case "Array": case "Object": case "Function": case "Date": case "RegExp": case "Error":
        return t;
      case "*": return "null";
      case "Class": return this.as3Import("Class");
    }
    if (t.startsWith("Vector.<") || t === "Vector") return this.ref("Vector");
    return this.ref(t);
  }

  defaultValue(t: string): string {
    switch (t) {
      case "int": case "uint": return "0";
      case "Number": return "NaN";
      case "Boolean": return "false";
      case "*": return "undefined";
      default: return "null";
    }
  }

  classOfType(t: string): ClassModel | undefined {
    if (t.startsWith("Vector.<")) return this.prog.classes.get("Vector");
    return this.prog.classes.get(t);
  }

  // ------------------------------------------------------------ helpers
  wrap(x: Ex, min: number): string {
    return x.prec < min ? `(${x.code})` : x.code;
  }

  /** Operand for `| 0` / `>>> 0`: non-numeric static types go through Number() (same ToNumber, but type-correct). */
  numOperand(x: Ex): string {
    const t = x.type;
    if (t === "int" || t === "uint" || t === "Number" || t === "*" || t === "Object" || t === "null") return this.wrap(x, P.CALL);
    return `Number(${x.code})`;
  }

  static num(v: number): Ex {
    const code = Object.is(v, -0) ? "-0" : v < 0 ? `-${-v}` : String(v);
    return { code, type: Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? "int" : "Number", prec: v < 0 ? P.UNARY : P.PRIMARY, num: v, pure: true };
  }

  isPure(e: A.Expr): boolean {
    switch (e.type) {
      case "Ident": case "This": case "Literal": return true;
      case "Member": return this.isPure(e.obj);
      case "Index": return this.isPure(e.obj) && this.isPure(e.index);
      case "Paren": return this.isPure(e.expr);
      default: return false;
    }
  }

  /** Implicit AS3 coercion of `x` into a slot of type `to`. */
  coerce(x: Ex, to: string): Ex {
    if (to === "*" || to === "Object" || to === "void" || to === "Function" || to === "Class" || to === "Math" || to === "JSON") return x;
    const from = x.type;
    if (from === to) return x;
    switch (to) {
      case "int":
        if (from === "int" || from === "uint") return { ...x, type: "int" };
        if (x.num !== undefined) return EmitterCore.num(x.num | 0);
        return { code: `${this.numOperand(x)} | 0`, type: "int", prec: P.BOR };
      case "uint":
        if (from === "uint") return x;
        if (x.num !== undefined) return { ...EmitterCore.num(x.num >>> 0), type: "uint" };
        return { code: `${this.numOperand(x)} >>> 0`, type: "uint", prec: P.SHIFT };
      case "Number":
        if (from === "int" || from === "uint") return { ...x, type: "Number" };
        return { code: `Number(${x.code})`, type: "Number", prec: P.CALL };
      case "Boolean":
        return { code: `Boolean(${x.code})`, type: "Boolean", prec: P.CALL };
      case "String":
        if (from === "null") return x;
        return { code: `${this.as3("str")}(${x.code})`, type: "String", prec: P.CALL };
    }
    if (from === "null") return x;
    if (from.startsWith("Class:")) return x;
    if (this.prog.isSubtype(from, to)) return x;
    if (to.startsWith("Vector.<") && from.startsWith("Vector.<")) return x;
    if (PRIMITIVES.has(from) && !PRIMITIVES.has(to)) return x; // compile error in AS3; leave untouched
    return { code: `${this.as3("cast")}(${x.code}, ${this.typeValue(to)})`, type: to, prec: P.CALL };
  }

  // ------------------------------------------------------------ name lookup
  lookupLocal(name: string, ctx: FnCtx | undefined): LocalVar | undefined {
    for (let c = ctx; c; c = c.parent) {
      const v = c.vars.get(name);
      if (v) return v;
    }
    return undefined;
  }

  private packagePrefixes?: Set<string>;
  isPackagePrefix(p: string): boolean {
    if (!this.packagePrefixes) {
      this.packagePrefixes = new Set();
      for (const pkg of this.prog.packages) {
        const parts = pkg.split(".");
        for (let i = 1; i <= parts.length; i++) this.packagePrefixes.add(parts.slice(0, i).join("."));
      }
    }
    return this.packagePrefixes.has(p);
  }

  classRef(q: string): Ex {
    let code: string;
    switch (q) {
      case "Number": case "String": case "Boolean": case "Object": case "Array": case "Function": case "Date": case "RegExp":
      case "Math": case "JSON": case "Error":
        code = q;
        break;
      default:
        code = this.ref(q);
    }
    return { code, type: `Class:${q}`, prec: P.PRIMARY, kind: "class", pure: true };
  }

  globalRef(g: GlobalDef): Ex {
    let code: string;
    if (g.qname === "trace") code = this.as3Import("trace");
    else code = this.ref(g.qname);
    return { code, type: g.kind === "function" ? "Function" : g.type, prec: P.PRIMARY, kind: g.kind === "function" ? "global" : "value", global: g, pure: true };
  }

  memberAccess(recv: string, m: Member): string {
    return `${recv}.${m.emitName}`;
  }

  ident(e: A.Ident, ctx: FnCtx | undefined, callee = false): Ex {
    const name = e.name;
    if (e.ns === "CONFIG") { this.usesConfig = true; return { code: `CONFIG.${name}`, type: "*", prec: P.PRIMARY, pure: true }; }
    if (name === "@@node") return { code: ctx?.filterNode ?? "$node", type: "XML", prec: P.PRIMARY };
    const local = this.lookupLocal(name, ctx);
    if (local) return { code: local.emitName, type: local.type, prec: P.PRIMARY, pure: true };
    if (name === "undefined") return { code: "undefined", type: "*", prec: P.PRIMARY, pure: true };
    if (name === "NaN" || name === "Infinity") return { code: name, type: "Number", prec: P.PRIMARY, pure: true };
    if (name === "arguments" && ctx) return { code: "arguments", type: "Array", prec: P.PRIMARY, pure: true };
    const cls = ctx?.cls;
    if (cls) {
      if (!ctx!.isStatic) {
        const m = this.prog.findMember(cls, name, false);
        if (m) return this.finishMember("this", true, m, callee);
      }
      for (let c: ClassModel | undefined = cls; c; c = this.prog.superOf(c)) {
        const m = c.stat.get(name);
        if (m) return this.finishMember(this.ref(c.qname), true, m, callee);
      }
    }
    const t = this.prog.resolveType(name, this.f);
    if (t !== "*") return this.classRef(t);
    if (name === "Vector") return this.classRef("Vector");
    const g = this.prog.resolveGlobal(name, this.f);
    if (g) return this.globalRef(g);
    if (this.isPackagePrefix(name)) return { code: name, type: "*", prec: P.PRIMARY, kind: "pkg", pkgPath: name };
    this.warn(`unresolved identifier ${name}`, e.pos);
    return { code: name, type: "*", prec: P.PRIMARY, pure: true };
  }

  /** Member reference; methods become bound closures unless called. */
  finishMember(recv: string, recvPure: boolean, m: Member, callee: boolean): Ex {
    const code = this.memberAccess(recv, m);
    if (m.kind === "method") {
      if (callee || m.isStatic) return { code, type: "Function", prec: P.PRIMARY, kind: "method", member: m, pure: recvPure };
      const bound = recvPure ? `${this.as3("bind")}(${recv}, ${code})` : `${this.as3("bindKey")}(${recv}, ${JSON.stringify(m.emitName)})`;
      return { code: bound, type: "Function", prec: P.CALL, member: m };
    }
    return { code, type: m.type, prec: P.PRIMARY, kind: "value", member: m, pure: recvPure };
  }

  // ------------------------------------------------------------ expressions
  expr(e: A.Expr, ctx: FnCtx | undefined, callee = false): Ex {
    switch (e.type) {
      case "Literal": return this.literal(e);
      case "Ident": return this.ident(e, ctx, callee);
      case "This": return { code: "this", type: ctx?.cls ? (ctx.isStatic ? `Class:${ctx.cls.qname}` : ctx.cls.qname) : "*", prec: P.PRIMARY, pure: true };
      case "Paren": {
        const x = this.expr(e.expr, ctx, callee);
        return { ...x, code: `(${x.code})`, prec: P.PRIMARY };
      }
      case "Member": return this.member(e, ctx, callee);
      case "Index": return this.index(e, ctx);
      case "Call": return this.call(e, ctx);
      case "New": return this.newExpr(e, ctx);
      case "Unary": return this.unary(e, ctx);
      case "Update": return this.update(e, ctx);
      case "Binary": return this.binary(e, ctx);
      case "Logical": {
        const l = this.expr(e.left, ctx);
        const r = this.expr(e.right, ctx);
        const p = BIN_P[e.op];
        return { code: `${this.wrap(l, p)} ${e.op} ${this.wrap(r, p + 1)}`, type: l.type === r.type ? l.type : "*", prec: p };
      }
      case "Assign": return this.assign(e, ctx);
      case "Cond": {
        const t = this.expr(e.test, ctx);
        const a = this.expr(e.then, ctx);
        const b = this.expr(e.else, ctx);
        const type = a.type === b.type ? a.type : a.type === "null" ? b.type : b.type === "null" ? a.type : "*";
        return { code: `${this.wrap(t, P.OR)} ? ${this.wrap(a, P.ASSIGN)} : ${this.wrap(b, P.ASSIGN)}`, type, prec: P.COND };
      }
      case "Seq": return { code: e.exprs.map((x) => this.wrap(this.expr(x, ctx), P.ASSIGN)).join(", "), type: "*", prec: P.SEQ };
      case "Array": return { code: `[${e.elements.map((x) => (x ? this.wrap(this.expr(x, ctx), P.ASSIGN) : "")).join(", ")}${e.elements.length && e.elements[e.elements.length - 1] === null ? "," : ""}]`, type: "Array", prec: P.PRIMARY };
      case "Object": {
        if (!e.props.length) return { code: "{}", type: "Object", prec: P.PRIMARY };
        const props = e.props.map((p) => `${p.keyKind === "id" && /^[A-Za-z_$][\w$]*$/.test(p.key) ? p.key : p.keyKind === "num" ? p.key : JSON.stringify(p.key)}: ${this.wrap(this.expr(p.value, ctx), P.ASSIGN)}`);
        return { code: `{ ${props.join(", ")} }`, type: "Object", prec: P.PRIMARY };
      }
      case "FuncExpr": return this.funcExpr(e, ctx);
      case "VectorLit": {
        const t = this.prog.typeOf(e.elemType, this.f);
        return { code: `${this.ref("Vector")}.fromArray([${e.elements.map((x) => this.expr(x, ctx).code).join(", ")}], ${this.typeValue(t)})`, type: `Vector.<${t}>`, prec: P.CALL };
      }
      case "TypeApp": {
        const t = this.prog.typeOf(e.param, this.f);
        return { code: `${this.ref("Vector")}.of(${this.typeValue(t)})`, type: `Class:Vector.<${t}>`, prec: P.CALL, kind: "class" };
      }
      case "Xml": return { code: `${this.ref("XML")}.from(${JSON.stringify(e.raw)})`, type: "XML", prec: P.CALL };
      case "Attr": {
        const o = this.expr(e.obj, ctx);
        return { code: `${this.wrap(o, P.CALL)}.attribute(${JSON.stringify(e.name)})`, type: "XMLList", prec: P.CALL };
      }
      case "Descendants": {
        const o = this.expr(e.obj, ctx);
        return { code: `${this.wrap(o, P.CALL)}.descendants(${JSON.stringify(e.name)})`, type: "XMLList", prec: P.CALL };
      }
      case "Filter": {
        const o = this.expr(e.obj, ctx);
        const node = `$node${this.filterCounter++ || ""}`;
        const fctx: FnCtx = { ...(ctx ?? { isStatic: true, isCtor: false, retType: "*", vars: new Map(), decisions: new Map() }), parent: ctx, vars: new Map(), filterNode: node };
        const pred = this.expr(e.pred, fctx);
        return { code: `${this.wrap(o, P.CALL)}.filter((${node}: any) => ${this.wrap(pred, P.ASSIGN)})`, type: "XMLList", prec: P.CALL };
      }
    }
    throw new Error(`unhandled expression ${(e as A.Expr).type}`);
  }

  literal(e: A.Literal): Ex {
    switch (e.kind) {
      case "num": {
        const v = e.value as number;
        const isInt = /^(0[xX][0-9a-fA-F]+|\d+)$/.test(e.raw) && v <= 2147483647;
        // AS3 has no octal literals: 07 is decimal 7 (a syntax error in JavaScript modules)
        const code = /^0\d+$/.test(e.raw) ? String(v) : e.raw;
        return { code, type: isInt ? "int" : "Number", prec: P.PRIMARY, num: v, pure: true };
      }
      case "str": return { code: e.raw, type: "String", prec: P.PRIMARY, pure: true };
      case "bool": return { code: e.raw, type: "Boolean", prec: P.PRIMARY, pure: true };
      case "null": return { code: "null", type: "null", prec: P.PRIMARY, pure: true };
      case "regex": {
        let raw = e.raw;
        const m = /^\/(.*)\/([a-z]*)$/s.exec(raw)!;
        if (m[2].includes("x")) {
          const body = m[1].replace(/\\\s|\s+|#[^\n]*/g, (s) => (s.startsWith("\\") ? s : ""));
          raw = `/${body}/${m[2].replace("x", "")}`;
          this.warn(`regex 'x' flag rewritten: ${e.raw}`, e.pos);
        }
        return { code: raw, type: "RegExp", prec: P.PRIMARY, pure: true };
      }
    }
  }

  member(e: A.Member, ctx: FnCtx | undefined, callee: boolean): Ex {
    if (e.obj.type === "Ident" && e.obj.name === "arguments" && e.name === "callee" && !e.obj.ns) {
      // AS3: inside a method, arguments.callee is the (memoized) method closure
      if (ctx?.self && !ctx.nested) return { code: ctx.self, type: "Function", prec: P.CALL };
      this.warn("arguments.callee outside a method", e.pos);
    }
    if (e.obj.type === "Super") {
      const sup = ctx?.cls ? this.prog.superOf(ctx.cls) : undefined;
      const m = this.prog.findMember(sup, e.name, false);
      // AS3: super.field is the instance's own field (fields are not virtual); in JavaScript
      // super.x would read the parent prototype's default instead.
      if (m && (m.kind === "var" || m.kind === "const")) return { code: `this.${m.emitName}`, type: m.type, prec: P.PRIMARY, member: m, kind: "value", pure: true };
      const code = `super.${m?.emitName ?? e.name}`;
      if (m?.kind === "method" && !callee) return { code: `${this.as3("bind")}(this, ${code})`, type: "Function", prec: P.CALL };
      return { code, type: m?.type ?? "*", prec: P.PRIMARY, member: m, kind: m?.kind === "method" ? "method" : "value" };
    }
    const o = this.expr(e.obj, ctx);
    if (o.kind === "pkg") {
      const path = `${o.pkgPath}.${e.name}`;
      if (this.prog.classes.has(path)) return this.classRef(path);
      const g = this.prog.globals.get(path);
      if (g) return this.globalRef(g);
      if (this.isPackagePrefix(path)) return { code: path, type: "*", prec: P.PRIMARY, kind: "pkg", pkgPath: path };
      this.warn(`unresolved qualified name ${path}`, e.pos);
      return { code: path, type: "*", prec: P.PRIMARY };
    }
    const recv = this.wrap(o, P.CALL);
    const pure = !!o.pure;
    if (o.type.startsWith("Class:")) {
      const cq = o.type.slice(6);
      const cm = this.prog.classes.get(cq);
      let m: Member | undefined;
      for (let c = cm; c && !m; c = this.prog.superOf(c)) m = c.stat.get(e.name);
      if (m) return this.finishMember(recv, pure, m, callee);
      return { code: `${recv}.${e.name}`, type: "*", prec: P.PRIMARY, pure };
    }
    if (o.type === "Date" && DATE_GET[e.name]) return { code: `${recv}.${DATE_GET[e.name]}()`, type: "Number", prec: P.CALL };
    if (o.type === DICT && e.name !== "hasOwnProperty" && e.name !== "toString" && e.name !== "propertyIsEnumerable") {
      return { code: `${recv}.get(${JSON.stringify(e.name)})`, type: "*", prec: P.CALL };
    }
    if ((o.type === "XML" || o.type === "XMLList") && !(callee && XML_METHODS.has(e.name))) {
      return { code: `${recv}.child(${JSON.stringify(e.name)})`, type: "XMLList", prec: P.CALL };
    }
    const cm = this.classOfType(o.type);
    const m = cm ? this.prog.findMember(cm, e.name, false) : undefined;
    if (m) {
      const x = this.finishMember(recv, pure, m, callee);
      if (m.kind !== "method" && o.type.startsWith("Vector.<") && e.name === "length") x.type = "uint";
      return x;
    }
    if (cm && !cm.dynamic && !cm.builtin && o.type !== "*" && !cm.isInterface) this.warn(`unknown member ${cm.qname}.${e.name}`, e.pos);
    return { code: `${recv}.${e.name}`, type: "*", prec: P.PRIMARY, pure };
  }

  index(e: A.Index, ctx: FnCtx | undefined): Ex {
    const o = this.expr(e.obj, ctx);
    const i = this.expr(e.index, ctx);
    if (o.type === DICT) return { code: `${this.wrap(o, P.CALL)}.get(${i.code})`, type: "*", prec: P.CALL };
    let type = "*";
    const vecElem = o.type.startsWith("Vector.<");
    if (vecElem) {
      // Vector element read: bounds-checked like AS3 (RangeError #1125), without a Proxy
      return { code: `${this.as3("vget")}(${o.code}, ${i.code})`, type: o.type.slice(8, -1), prec: P.CALL, pure: !!o.pure && !!i.pure, vecElem };
    }
    if (o.type === "XMLList") type = "XML";
    return { code: `${this.wrap(o, P.CALL)}[${i.code}]`, type, prec: P.PRIMARY, pure: !!o.pure && !!i.pure, vecElem };
  }

  args(args: A.Expr[], params: ParamInfo[] | undefined, ctx: FnCtx | undefined): string {
    return args.map((a, i) => {
      const x = this.expr(a, ctx);
      const p = params?.[i];
      return this.wrap(p && !p.rest ? this.coerce(x, p.type) : x, P.ASSIGN);
    }).join(", ");
  }

  call(e: A.Call, ctx: FnCtx | undefined): Ex {
    const c = e.callee;
    if (c.type === "Super") {
      const sup = ctx?.cls ? this.prog.superOf(ctx.cls) : undefined;
      return { code: `super.$ctor(${this.args(e.args, sup?.ctorParams, ctx)})`, type: "void", prec: P.CALL };
    }
    if (c.type === "TypeApp") {
      const t = this.prog.typeOf(c.param, this.f);
      return { code: `${this.ref("Vector")}.from(${this.args(e.args, undefined, ctx)}, ${this.typeValue(t)})`, type: `Vector.<${t}>`, prec: P.CALL };
    }
    // Array/Vector sort with AS3 flags and AVM2 ordering
    if (c.type === "Member" && (c.name === "sort" || c.name === "sortOn")) {
      const o = this.expr(c.obj, ctx);
      if (o.type === "Array" || o.type === "*" || o.type === "Object" || o.type.startsWith("Vector.<")) {
        const rest = e.args.length ? ", " + this.args(e.args, undefined, ctx) : "";
        return { code: `${this.as3(c.name)}(${o.code}${rest})`, type: o.type === "*" ? "*" : o.type, prec: P.CALL };
      }
    }
    if (c.type === "Member" && c.name === "setPropertyIsEnumerable") {
      const o = this.expr(c.obj, ctx);
      return { code: `${this.as3("setPropertyIsEnumerable")}(${o.code}, ${this.args(e.args, undefined, ctx)})`, type: "void", prec: P.CALL };
    }
    if (c.type === "Member" && c.obj.type !== "Super") {
      const o = this.expr(c.obj, ctx);
      if (o.type === DICT && c.name === "hasOwnProperty") return { code: `${this.wrap(o, P.CALL)}.has(${this.args(e.args, undefined, ctx)})`, type: "Boolean", prec: P.CALL };
    }
    const fe = this.expr(c, ctx, true);
    if (fe.kind === "class") return this.castCall(fe, e, ctx);
    let params: ParamInfo[] | undefined;
    let ret = "*";
    if (fe.kind === "method" && fe.member) { params = fe.member.params; ret = fe.member.type; }
    else if (fe.kind === "global" && fe.global) { params = fe.global.params; ret = fe.global.type; }
    return { code: `${this.wrap(fe, P.CALL)}(${this.args(e.args, params, ctx)})`, type: ret, prec: P.CALL };
  }

  castCall(fe: Ex, e: A.Call, ctx: FnCtx | undefined): Ex {
    const t = fe.type.slice(6);
    const a: Ex = e.args[0] ? this.expr(e.args[0], ctx) : { code: "undefined", type: "*", prec: P.PRIMARY };
    switch (t) {
      case "int":
        if (a.type === "int") return a;
        if (a.num !== undefined) return EmitterCore.num(a.num | 0);
        return { code: `${this.numOperand(a)} | 0`, type: "int", prec: P.BOR };
      case "uint":
        if (a.type === "uint") return a;
        return { code: `${this.numOperand(a)} >>> 0`, type: "uint", prec: P.SHIFT };
      case "Number": case "String": case "Boolean":
        return { code: `${t}(${e.args.length ? a.code : ""})`, type: t, prec: P.CALL };
      case "Array": case "Object": case "Date": case "RegExp": case "Error": case "Function":
        return { code: `${fe.code}(${this.args(e.args, undefined, ctx)})`, type: t === "Date" ? "String" : t, prec: P.CALL };
      case "XML": case "XMLList":
        return { code: `${fe.code}.from(${a.code})`, type: t, prec: P.CALL };
      case "Class":
        return a;
    }
    return { code: `${this.as3("cast")}(${a.code}, ${fe.code})`, type: t, prec: P.CALL };
  }

  newExpr(e: A.New, ctx: FnCtx | undefined): Ex {
    if (e.callee.type === "TypeApp") {
      const t = this.prog.typeOf(e.callee.param, this.f);
      const a = e.args.map((x) => this.expr(x, ctx).code);
      return { code: `new ${this.ref("Vector")}<${this.tsType(t)}>(${a[0] ?? "0"}, ${a[1] ?? "false"}, ${this.typeValue(t)})`, type: `Vector.<${t}>`, prec: P.CALL };
    }
    const fe = this.expr(e.callee, ctx, true);
    if (fe.kind === "class") {
      const q = fe.type.slice(6);
      const cm = this.prog.classes.get(q);
      const params = cm && !cm.builtin ? cm.ctorParams : undefined;
      return { code: `new ${fe.code}(${this.args(e.args, params, ctx)})`, type: q, prec: P.CALL };
    }
    const callee = /[()]/.test(fe.code) ? `(${fe.code})` : fe.code;
    return { code: `new ${callee}(${this.args(e.args, undefined, ctx)})`, type: "*", prec: P.CALL };
  }

  unary(e: A.Unary, ctx: FnCtx | undefined): Ex {
    if (e.op === "delete") {
      const t = e.arg;
      if (t.type === "Index") {
        const o = this.expr(t.obj, ctx);
        if (o.type === DICT) return { code: `${this.wrap(o, P.CALL)}.delete(${this.expr(t.index, ctx).code})`, type: "Boolean", prec: P.CALL };
      }
      if (t.type === "Member") {
        const o = this.expr(t.obj, ctx);
        if (o.type === DICT) return { code: `${this.wrap(o, P.CALL)}.delete(${JSON.stringify(t.name)})`, type: "Boolean", prec: P.CALL };
      }
      return { code: `delete ${this.wrap(this.lvalue(t, ctx), P.UNARY)}`, type: "Boolean", prec: P.UNARY };
    }
    const a = this.expr(e.arg, ctx);
    if (e.op === "-" && a.num !== undefined && a.prec === P.PRIMARY) return { ...EmitterCore.num(-a.num), type: a.type === "int" || -a.num === -2147483648 ? (Number.isInteger(-a.num) && -a.num >= -2147483648 ? "int" : "Number") : "Number" };
    const word = e.op === "typeof" || e.op === "void";
    let operand = this.wrap(a, P.UNARY);
    if (!word && (operand.startsWith(e.op) || ((e.op === "-" || e.op === "+") && /^[-+]/.test(operand)))) operand = `(${operand})`;
    const code = word ? `${e.op} ${operand}` : `${e.op}${operand}`;
    const type = e.op === "!" ? "Boolean" : e.op === "~" ? "int" : e.op === "typeof" ? "String" : e.op === "void" ? "*" : "Number";
    return { code, type, prec: P.UNARY };
  }

  update(e: A.Update, ctx: FnCtx | undefined): Ex {
    const t = e.arg.type === "Paren" ? e.arg.expr : e.arg;
    if (t.type === "Index") {
      const o = this.expr(t.obj, ctx);
      if (o.type.startsWith("Vector.<")) {
        const i = this.expr(t.index, ctx);
        return { code: `${this.as3("vinc")}(${o.code}, ${i.code}, ${e.op === "++" ? 1 : -1}, ${e.prefix})`, type: "Number", prec: P.CALL };
      }
      if (o.type === DICT) {
        const k = this.expr(t.index, ctx).code;
        const d = this.wrap(o, P.CALL);
        return { code: `${d}.set(${k}, ${d}.get(${k}) ${e.op === "++" ? "+" : "-"} 1)`, type: "Number", prec: P.CALL };
      }
    }
    const lv = this.lvalue(t, ctx);
    const code = e.prefix ? `${e.op}${this.wrap(lv, P.UNARY)}` : `${this.wrap(lv, P.POSTFIX)}${e.op}`;
    return { code, type: "Number", prec: e.prefix ? P.UNARY : P.POSTFIX };
  }

  /** Target of an assignment (no closure binding, no read-side rewrites). */
  lvalue(e: A.Expr, ctx: FnCtx | undefined): Ex {
    switch (e.type) {
      case "Paren": return this.lvalue(e.expr, ctx);
      case "Ident": {
        const x = this.ident(e, ctx, true);
        return { ...x, type: x.kind === "method" ? "Function" : x.type };
      }
      case "Member": {
        if (e.obj.type === "Super") {
          const sup = ctx?.cls ? this.prog.superOf(ctx.cls) : undefined;
          const m = this.prog.findMember(sup, e.name, false);
          if (m && (m.kind === "var" || m.kind === "const")) return { code: `this.${m.emitName}`, type: m.type, prec: P.PRIMARY, pure: true };
          return { code: `super.${m?.emitName ?? e.name}`, type: m?.type ?? "*", prec: P.PRIMARY };
        }
        const x = this.member(e, ctx, true);
        return { ...x, type: x.kind === "method" ? "Function" : x.type };
      }
      case "Index": {
        const x = this.index(e, ctx);
        return x.vecElem ? { ...x, type: "*" } : x;
      }
      default: return this.expr(e, ctx);
    }
  }

  assign(e: A.Assign, ctx: FnCtx | undefined): Ex {
    const tgt = e.target.type === "Paren" ? e.target.expr : e.target;
    // Dictionary element write
    if ((tgt.type === "Index" || tgt.type === "Member") && tgt.obj.type !== "Super") {
      const o = this.expr(tgt.obj, ctx);
      if (o.type.startsWith("Vector.<") && (tgt.type === "Index" || (tgt.type === "Member" && tgt.name === "length"))) {
        const vx = this.vectorAssign(e, tgt, o, ctx);
        if (vx) return vx;
      }
      if (o.type === DICT) {
        const key = tgt.type === "Index" ? this.expr(tgt.index, ctx).code : JSON.stringify(tgt.name);
        const d = this.wrap(o, P.CALL);
        const v = this.expr(e.value, ctx);
        if (e.op === "=") return { code: `${d}.set(${key}, ${v.code})`, type: "*", prec: P.CALL };
        const op = e.op.slice(0, -1);
        return { code: `${d}.set(${key}, ${d}.get(${key}) ${op} ${this.wrap(v, (BIN_P[op] ?? P.ASSIGN) + 1)})`, type: "*", prec: P.CALL };
      }
      if (tgt.type === "Member" && o.type === "Date" && DATE_SET[tgt.name] && e.op === "=") {
        return { code: `${this.wrap(o, P.CALL)}.${DATE_SET[tgt.name]}(${this.expr(e.value, ctx).code})`, type: "Number", prec: P.CALL };
      }
    }
    if (tgt.type === "Attr") {
      const o = this.expr(tgt.obj, ctx);
      return { code: `${this.wrap(o, P.CALL)}.setAttribute(${JSON.stringify(tgt.name)}, ${this.expr(e.value, ctx).code})`, type: "*", prec: P.CALL };
    }
    const t = this.lvalue(tgt, ctx);
    const v = this.expr(e.value, ctx);
    if (e.op === "=") {
      const cv = this.coerce(v, t.type);
      return { code: `${t.code} = ${this.wrap(cv, P.ASSIGN)}`, type: t.type, prec: P.ASSIGN };
    }
    const op = e.op.slice(0, -1);
    const native = { code: `${t.code} ${e.op} ${this.wrap(v, P.ASSIGN)}`, type: t.type, prec: P.ASSIGN };
    if (op === "&&" || op === "||") return native;
    let needs = false;
    switch (t.type) {
      case "int": needs = !(op === "|" || op === "&" || op === "^" || op === "<<" || op === ">>" || ((op === "+" || op === "-") && (v.type === "int" || v.type === "uint"))); break;
      case "uint": needs = op !== ">>>"; break;
      case "Number": needs = op === "+" && !(v.type === "int" || v.type === "uint" || v.type === "Number"); break;
      case "Boolean": needs = true; break;
    }
    if (!needs) return native;
    if (!this.isPure(tgt)) {
      this.warn(`compound assignment to typed impure target kept native`, e.pos);
      return native;
    }
    const p = BIN_P[op];
    const combined: Ex = { code: `${this.wrap(t, p)} ${op} ${this.wrap(v, p + 1)}`, type: op === "+" ? "*" : "Number", prec: p };
    const cv = this.coerce(combined, t.type);
    return { code: `${t.code} = ${this.wrap(cv, P.ASSIGN)}`, type: t.type, prec: P.ASSIGN };
  }

  /**
   * Writes to a Vector element or to a Vector's length, through the checked runtime helpers.
   * Compound operators read the element with vget; impure receivers/indexes are evaluated once.
   */
  vectorAssign(e: A.Assign, tgt: A.Index | A.Member, o: Ex, ctx: FnCtx | undefined): Ex | null {
    const isLen = tgt.type === "Member";
    const elem = isLen ? "uint" : o.type.slice(8, -1);
    const i = tgt.type === "Index" ? this.expr(tgt.index, ctx) : null;
    const v = this.expr(e.value, ctx);
    const set = (recv: string, idx: string | null, value: string) =>
      isLen ? `${this.as3("vsetLength")}(${recv}, ${value})` : `${this.as3("vset")}(${recv}, ${idx}, ${value})`;
    if (e.op === "=") return { code: set(o.code, i?.code ?? null, this.wrap(this.coerce(v, elem), P.ASSIGN)), type: elem, prec: P.CALL };
    const op = e.op.slice(0, -1);
    const pure = !!o.pure && (!i || !!i.pure);
    const recv = pure ? o.code : "$v", idx = i ? (pure ? i.code : "$i") : null;
    const cur: Ex = { code: isLen ? `${recv}.length` : `${this.as3("vget")}(${recv}, ${idx})`, type: elem, prec: P.CALL };
    const wrapIife = (body: string): Ex => {
      if (pure) return { code: body, type: elem, prec: op === "&&" ? P.AND : P.OR };
      const params = i ? "($v: any, $i: any)" : "($v: any)";
      return { code: `(${params} => ${body})(${i ? `${o.code}, ${i.code}` : o.code})`, type: elem, prec: P.CALL };
    };
    if (op === "||" || op === "&&") {
      // a[i] ||= x: write only when the element is falsy (&&=: truthy); the value is the element's final value
      return wrapIife(`${cur.code} ${op} ${set(recv, idx, this.wrap(this.coerce(v, elem), P.ASSIGN))}`);
    }
    if (!(op in BIN_P)) return null;
    const p = BIN_P[op];
    const combined: Ex = { code: `${this.wrap(cur, p)} ${op} ${this.wrap(v, p + 1)}`, type: op === "+" ? "*" : "Number", prec: p };
    const value = this.wrap(this.coerce(combined, elem), P.ASSIGN);
    const r = wrapIife(set(recv, idx, value));
    return { ...r, prec: P.CALL };
  }

  /** Resolves the right operand of `is`/`as` to a static type when possible. */
  typeFromExpr(e: A.Expr, ctx: FnCtx | undefined): string | undefined {
    if (e.type === "Ident" && !this.lookupLocal(e.name, ctx)) {
      if (e.name === "Vector") return "Vector";
      const t = this.prog.resolveType(e.name, this.f);
      return t === "*" && e.name !== "*" ? undefined : t;
    }
    if (e.type === "TypeApp") return `Vector.<${this.prog.typeOf(e.param, this.f)}>`;
    if (e.type === "Member") {
      const x = this.expr(e, ctx);
      if (x.kind === "class") return x.type.slice(6);
    }
    return undefined;
  }

  binary(e: A.Binary, ctx: FnCtx | undefined): Ex {
    if (e.op === "is" || e.op === "as") {
      const l = this.expr(e.left, ctx);
      const t = this.typeFromExpr(e.right, ctx);
      if (e.op === "is") {
        const cm = t ? this.prog.classes.get(t) : undefined;
        if (t && cm && !cm.isInterface && (cm.qname.includes(".") || !cm.builtin) && t !== "Vector") {
          return { code: `${this.wrap(l, P.REL)} instanceof ${this.ref(t)}`, type: "Boolean", prec: P.REL };
        }
        if (t === "Error" || t === "Date" || t === "RegExp") return { code: `${this.wrap(l, P.REL)} instanceof ${t}`, type: "Boolean", prec: P.REL };
        const tv = t ? this.typeValue(t) : this.expr(e.right, ctx).code;
        return { code: `${this.as3("is")}(${l.code}, ${tv})`, type: "Boolean", prec: P.CALL };
      }
      const tv = t ? this.typeValue(t) : this.expr(e.right, ctx).code;
      return { code: `${this.as3("as")}(${l.code}, ${tv})`, type: t ?? "*", prec: P.CALL };
    }
    if (e.op === "in") {
      const r = this.expr(e.right, ctx);
      const l = this.expr(e.left, ctx);
      if (r.type === DICT) return { code: `${this.wrap(r, P.CALL)}.has(${l.code})`, type: "Boolean", prec: P.CALL };
      return { code: `${this.wrap(l, P.REL)} in ${this.wrap(r, P.REL + 1)}`, type: "Boolean", prec: P.REL };
    }
    const l = this.expr(e.left, ctx);
    const r = this.expr(e.right, ctx);
    const p = BIN_P[e.op];
    let type: string;
    switch (e.op) {
      case "+":
        type = l.type === "String" || r.type === "String" ? "String" : isNumeric(l.type) && isNumeric(r.type) ? "Number" : "*";
        break;
      case "-": case "*": case "/": case "%": type = "Number"; break;
      case "&": case "|": case "^": case "<<": case ">>": type = "int"; break;
      case ">>>": type = "uint"; break;
      default: type = "Boolean";
    }
    return { code: `${this.wrap(l, p)} ${e.op} ${this.wrap(r, p + 1)}`, type, prec: p };
  }

  // implemented by the statement emitter
  funcExpr(_e: A.FuncExpr, _ctx: FnCtx | undefined): Ex { throw new Error("abstract"); }
}

export function isNumeric(t: string): boolean {
  return t === "int" || t === "uint" || t === "Number";
}
