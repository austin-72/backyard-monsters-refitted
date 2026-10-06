/**
 * Semantic model of the whole AS3 program: every game class/interface plus the
 * Flash/builtin API from playerglobal.swc, with name resolution and the member
 * tables the emitter needs to reproduce AS3 semantics (coercions, method
 * closures, private-member isolation, static access).
 */
import type * as A from "./ast.ts";
import type { ApiDb, ApiMember } from "./abc.ts";

export interface ParamInfo { name: string; type: string; optional: boolean; rest: boolean; }

export interface Member {
  name: string;
  /** Name used in TypeScript (differs only for colliding private members). */
  emitName: string;
  kind: "var" | "const" | "method" | "accessor";
  /** Value type (var/const/accessor) or return type (method). */
  type: string;
  params?: ParamInfo[];
  isStatic: boolean;
  hasGetter?: boolean;
  hasSetter?: boolean;
  access?: string;
  owner: ClassModel;
  isOverride?: boolean;
}

export interface ClassModel {
  qname: string; // dotted
  name: string;
  pkg: string;
  isInterface: boolean;
  builtin: boolean;
  superQ?: string;
  ifaces: string[];
  dynamic: boolean;
  inst: Map<string, Member>;
  stat: Map<string, Member>;
  ctorParams: ParamInfo[];
  file?: FileModel;
  def?: A.ClassDef | A.InterfaceDef;
  /** declared outside the package block (file-private) */
  filePrivate?: boolean;
  /** export alias used in the @game barrel when the simple name is ambiguous */
  exportName: string;
}

export interface GlobalDef {
  qname: string;
  name: string;
  kind: "function" | "var" | "const" | "namespace";
  type: string;
  params?: ParamInfo[];
  builtin: boolean;
  file?: FileModel;
  exportName: string;
}

export interface FileModel {
  path: string; // relative .as path
  program: A.Program;
  pkg: string;
  explicitImports: Map<string, string>; // simple name -> qname
  wildcardImports: string[]; // packages
  classes: ClassModel[];
  globals: GlobalDef[];
  privateClasses: Map<string, ClassModel>;
  /** functions/vars declared after the package block (module-private) */
  privateGlobals: Map<string, GlobalDef>;
  usedNamespaces: Set<string>;
}

export const PRIMITIVES = new Set(["int", "uint", "Number", "String", "Boolean"]);
const TOP_BUILTIN_TYPES = new Set([
  "*", "void", "int", "uint", "Number", "String", "Boolean", "Object", "Array", "Function", "Class",
  "XML", "XMLList", "RegExp", "Date", "Math", "JSON", "Namespace", "QName",
]);

export class Program {
  classes = new Map<string, ClassModel>();
  globals = new Map<string, GlobalDef>();
  files: FileModel[] = [];
  packages = new Set<string>();
  warnings: string[] = [];

  constructor(public api: ApiDb) {
    for (const c of Object.values(api.classes)) this.addBuiltinClass(c.name);
    for (const [q, m] of Object.entries(api.globals)) {
      const dot = q.lastIndexOf(".");
      const name = dot < 0 ? q : q.slice(dot + 1);
      this.globals.set(q, {
        qname: q, name, builtin: true, exportName: name,
        kind: m.kind === "method" ? "function" : m.kind === "const" ? "const" : "var",
        type: normType(m.type ?? "*"),
        params: m.params?.map((t, i) => ({ name: `p${i}`, type: normType(t), optional: i >= (m.required ?? 0), rest: false })),
      });
      if (dot > 0) this.packages.add(q.slice(0, dot));
    }
  }

  private addBuiltinClass(q: string): void {
    const c = this.api.classes[q];
    if (!c || q.startsWith("__AS3__.vec.Vector$")) return;
    const dot = q.lastIndexOf(".");
    const qname = q === "__AS3__.vec.Vector" ? "Vector" : q;
    const cm: ClassModel = {
      qname, name: dot < 0 ? q : q.slice(dot + 1), pkg: dot < 0 ? "" : q.slice(0, dot), isInterface: c.isInterface,
      builtin: true, superQ: c.super ? normType(c.super) : undefined, ifaces: c.interfaces.map(normType), dynamic: c.dynamic,
      inst: new Map(), stat: new Map(),
      ctorParams: (c.ctor?.params ?? []).map((t: string, i: number) => ({ name: `param${i + 1}`, type: normType(t), optional: i >= (c.ctor?.required ?? 0), rest: false })),
      exportName: dot < 0 ? q : q.slice(dot + 1),
    };
    if (qname === "Vector") cm.pkg = "";
    const conv = (name: string, m: ApiMember, isStatic: boolean): Member => {
      if (m.kind === "method") {
        return {
          name, emitName: name, kind: "method", type: normType(m.type ?? "*"), isStatic, owner: cm,
          params: (m.params ?? []).map((t, i) => ({ name: `p${i}`, type: normType(t), optional: i >= (m.required ?? 0), rest: false })),
        };
      }
      if (m.kind === "get" || m.kind === "set") {
        return {
          name, emitName: name, kind: "accessor", type: normType(m.type ?? "*"), isStatic, owner: cm,
          hasGetter: m.kind === "get", hasSetter: m.kind === "set" || !!(m as any).writable,
        };
      }
      return { name, emitName: name, kind: m.kind, type: normType(m.type ?? "*"), isStatic, owner: cm };
    };
    for (const [n, m] of Object.entries(c.inst)) cm.inst.set(n, conv(n, m, false));
    for (const [n, m] of Object.entries(c.stat)) cm.stat.set(n, conv(n, m, true));
    this.classes.set(qname, cm);
    if (cm.pkg) this.packages.add(cm.pkg);
  }

  // ------------------------------------------------------------ loading
  addFile(path: string, program: A.Program): void {
    const fm: FileModel = {
      path, program, pkg: program.pkg, explicitImports: new Map(), wildcardImports: [], classes: [], globals: [],
      privateClasses: new Map(), privateGlobals: new Map(), usedNamespaces: new Set(),
    };
    this.packages.add(program.pkg);
    const collect = (dirs: A.Directive[], outside: boolean) => {
      for (const d of dirs) {
        if (d.type === "Import") {
          if (d.name.endsWith(".*")) fm.wildcardImports.push(d.name.slice(0, -2));
          else fm.explicitImports.set(d.name.slice(d.name.lastIndexOf(".") + 1), d.name);
        } else if (d.type === "UseNamespace") fm.usedNamespaces.add(d.name);
        else if (d.type === "Class" || d.type === "Interface") {
          const qname = outside ? `${program.pkg ? program.pkg + "." : ""}${stripExt(path)}$${d.name}` : (program.pkg ? program.pkg + "." : "") + d.name;
          const cm: ClassModel = {
            qname, name: d.name, pkg: program.pkg, isInterface: d.type === "Interface", builtin: false,
            ifaces: [], dynamic: d.type === "Class" && !!d.attrs.isDynamic, inst: new Map(), stat: new Map(),
            ctorParams: [], file: fm, def: d, filePrivate: outside, exportName: d.name,
          };
          (outside ? fm.privateClasses.set(d.name, cm) : fm.classes.push(cm));
          this.classes.set(qname, cm);
        } else if (d.type === "Function" || d.type === "Var" || d.type === "NamespaceDef") {
          const name = d.type === "Var" ? d.decls[0].name : d.name;
          const qname = (program.pkg ? program.pkg + "." : "") + name;
          const g: GlobalDef = {
            qname, name, builtin: false, file: fm, exportName: name,
            kind: d.type === "Function" ? "function" : d.type === "NamespaceDef" ? "namespace" : d.kind,
            type: "*",
          };
          if (!outside) {
            fm.globals.push(g);
            this.globals.set(qname, g);
          } else {
            g.qname = `${stripExt(path)}$${name}`;
            fm.privateGlobals.set(name, g);
          }
        }
      }
    };
    collect(program.body, false);
    collect(program.outside, true);
    this.files.push(fm);
  }

  /** Second pass after all files are loaded: resolve supertypes and member tables. */
  link(): void {
    // ambiguous simple names get package-qualified export aliases
    const byName = new Map<string, (ClassModel | GlobalDef)[]>();
    for (const f of this.files) for (const x of [...f.classes, ...f.globals]) byName.set(x.name, [...(byName.get(x.name) ?? []), x]);
    for (const [, list] of byName) if (list.length > 1) for (const x of list) x.exportName = x.qname.replace(/\./g, "_");

    for (const f of this.files) {
      for (const cm of [...f.classes, ...f.privateClasses.values()]) {
        const d = cm.def!;
        if (d.type === "Class") {
          cm.superQ = d.extends ? this.resolveType(d.extends, f) : undefined;
          if (cm.superQ === "*") { this.warn(`${f.path}: unresolved superclass ${d.extends}`); cm.superQ = undefined; }
          cm.ifaces = d.implements.map((n) => this.resolveType(n, f));
        } else cm.ifaces = d.extends.map((n) => this.resolveType(n, f));
        this.buildMembers(cm, f);
      }
      for (const g of [...f.globals, ...f.privateGlobals.values()]) {
        const d = [...f.program.body, ...f.program.outside].find((x) => (x.type === "Function" && x.name === g.name) || (x.type === "Var" && x.decls[0].name === g.name)) as A.FunctionDef | A.VarDef | undefined;
        if (d?.type === "Function") {
          g.type = d.ret ? this.typeOf(d.ret, f) : "*";
          g.params = d.params.map((p) => ({ name: p.name, type: p.type ? this.typeOf(p.type, f) : "*", optional: !!p.init, rest: !!p.rest }));
        } else if (d?.type === "Var") g.type = d.decls[0].vtype ? this.typeOf(d.decls[0].vtype, f) : "*";
      }
    }
    this.isolatePrivates();
  }

  private buildMembers(cm: ClassModel, f: FileModel): void {
    const d = cm.def!;
    const members = d.type === "Class" ? d.members : d.members;
    for (const m of members) {
      if (m.type === "Var") {
        for (const dc of m.decls) {
          const mem: Member = {
            name: dc.name, emitName: dc.name, kind: m.kind, type: dc.vtype ? this.typeOf(dc.vtype, f) : "*",
            isStatic: !!m.attrs.isStatic, access: m.attrs.ns ?? m.attrs.access ?? "internal", owner: cm,
          };
          (mem.isStatic ? cm.stat : cm.inst).set(dc.name, mem);
        }
      } else if (m.type === "NamespaceDef") {
        cm.stat.set(m.name, { name: m.name, emitName: m.name, kind: "const", type: "Namespace", isStatic: true, owner: cm, access: m.attrs.access ?? "internal" });
      } else if (m.type === "Function") {
        const isStatic = !!m.attrs.isStatic;
        if (m.name === cm.name && !isStatic && d.type === "Class" && !m.accessor) {
          cm.ctorParams = m.params.map((p) => ({ name: p.name, type: p.type ? this.typeOf(p.type, f) : "*", optional: !!p.init, rest: !!p.rest }));
          continue;
        }
        const table = isStatic ? cm.stat : cm.inst;
        const params = m.params.map((p) => ({ name: p.name, type: p.type ? this.typeOf(p.type, f) : "*", optional: !!p.init, rest: !!p.rest }));
        if (m.accessor) {
          const prev = table.get(m.name);
          const t = m.accessor === "get" ? (m.ret ? this.typeOf(m.ret, f) : "*") : params[0]?.type ?? "*";
          if (prev && prev.kind === "accessor") {
            if (m.accessor === "get") { prev.hasGetter = true; prev.type = t; }
            else prev.hasSetter = true;
          } else {
            table.set(m.name, {
              name: m.name, emitName: m.name, kind: "accessor", type: t, isStatic, owner: cm,
              hasGetter: m.accessor === "get", hasSetter: m.accessor === "set",
              access: m.attrs.ns ?? m.attrs.access ?? "internal", isOverride: !!m.attrs.isOverride,
            });
          }
        } else {
          table.set(m.name, {
            name: m.name, emitName: m.name, kind: "method", type: m.ret ? this.typeOf(m.ret, f) : "*", params, isStatic,
            owner: cm, access: m.attrs.ns ?? m.attrs.access ?? "internal", isOverride: !!m.attrs.isOverride,
          });
        }
      }
    }
  }

  /**
   * AS3 private members are per-class slots; in JavaScript a same-named
   * property in a subclass would share storage (and a private method would be
   * dispatched virtually). Rename colliding privates to name$Class.
   */
  private isolatePrivates(): void {
    for (const cm of this.classes.values()) {
      if (cm.builtin) continue;
      for (const m of cm.inst.values()) {
        if (m.access !== "private") continue;
        let collides = false;
        for (let s = this.superOf(cm); s; s = this.superOf(s)) if (s.inst.has(m.name)) collides = true;
        for (const other of this.classes.values()) {
          if (other === cm || other.builtin) continue;
          for (let s = this.superOf(other); s; s = this.superOf(s)) if (s === cm && other.inst.has(m.name)) collides = true;
        }
        if (collides) m.emitName = `${m.name}$${cm.name}`;
      }
    }
  }

  warn(msg: string): void { this.warnings.push(msg); }

  // ------------------------------------------------------------ resolution
  superOf(c: ClassModel): ClassModel | undefined {
    return c.superQ ? this.classes.get(c.superQ) : undefined;
  }

  /** Resolves a type name written in `f` to a canonical type string. */
  resolveType(name: string, f: FileModel | undefined): string {
    if (TOP_BUILTIN_TYPES.has(name)) return name;
    if (name === "Vector" || name === "__AS3__.vec.Vector") return "Vector";
    if (name.includes(".")) {
      if (this.classes.has(name)) return name;
      return "*";
    }
    if (f) {
      const pc = f.privateClasses.get(name);
      if (pc) return pc.qname;
      const ex = f.explicitImports.get(name);
      if (ex && this.classes.has(ex)) return ex;
      const same = (f.pkg ? f.pkg + "." : "") + name;
      if (this.classes.has(same)) return same;
      for (const w of f.wildcardImports) {
        const q = `${w}.${name}`;
        if (this.classes.has(q)) return q;
      }
    }
    if (this.classes.has(name)) return name;
    return "*";
  }

  typeOf(t: A.TypeExpr, f: FileModel | undefined): string {
    if (t.param) return `Vector.<${this.typeOf(t.param, f)}>`;
    const r = this.resolveType(t.name, f);
    if (r === "*" && t.name !== "*") this.warn(`${f?.path}: unknown type ${t.name}`);
    return r;
  }

  /** Resolves a package-level function/var visible in `f` by simple name. */
  resolveGlobal(name: string, f: FileModel | undefined): GlobalDef | undefined {
    if (f) {
      const pg = f.privateGlobals.get(name);
      if (pg) return pg;
      const ex = f.explicitImports.get(name);
      if (ex && this.globals.has(ex)) return this.globals.get(ex);
      const same = (f.pkg ? f.pkg + "." : "") + name;
      if (this.globals.has(same)) return this.globals.get(same);
      for (const w of f.wildcardImports) {
        const g = this.globals.get(`${w}.${name}`);
        if (g) return g;
      }
    }
    return this.globals.get(name);
  }

  findMember(cls: ClassModel | undefined, name: string, isStatic: boolean): Member | undefined {
    for (let c = cls; c; c = this.superOf(c)) {
      const m = (isStatic ? c.stat : c.inst).get(name);
      if (m) return m;
      if (!isStatic && c.isInterface) {
        for (const i of c.ifaces) {
          const r = this.findMember(this.classes.get(i), name, false);
          if (r) return r;
        }
      }
    }
    // Instances of builtin classes inherit from Object
    if (!isStatic && cls && !cls.isInterface) {
      const o = this.classes.get("Object")!.inst.get(name);
      if (o) return o;
    }
    return undefined;
  }

  isSubtype(sub: string, sup: string): boolean {
    if (sub === sup) return true;
    if (sup === "*" || sup === "Object") return true;
    if (sub.startsWith("Vector.<") && sup === "Vector") return true;
    const c = this.classes.get(sub);
    if (!c) return false;
    if (c.superQ && this.isSubtype(c.superQ, sup)) return true;
    for (const i of c.ifaces) if (this.isSubtype(i, sup)) return true;
    return false;
  }
}

export function normType(t: string): string {
  if (t.startsWith("__AS3__.vec.Vector.<")) return "Vector.<" + normType(t.slice(20, -1)) + ">";
  if (t === "__AS3__.vec.Vector") return "Vector";
  return t;
}

function stripExt(p: string): string {
  return p.replace(/\.as$/, "").replace(/[\\/]/g, "_");
}
