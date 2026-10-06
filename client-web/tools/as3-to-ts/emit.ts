/**
 * Statement, function, class and module emission.
 *
 * Construction protocol: AS3 runs field initialisers and constructor code
 * before the superclass constructor and lets `this` be used before `super()`.
 * JavaScript constructors cannot, so the AS3 constructor body becomes
 * `$ctor(...)`, called once by the runtime root class (as3.ASObject) on the
 * most-derived class; `super(...)` becomes `super.$ctor(...)`. Field defaults
 * that AS3 sets at allocation are installed on the prototype (`as3.fields`).
 */
import type * as A from "./ast.ts";
import { analyzeFunction, type FunctionAnalysis } from "./analyze.ts";
import { EmitterCore, P, DICT, safeLocal, type Ex, type FnCtx } from "./emit-core.ts";
import { PRIMITIVES, type ClassModel } from "./model.ts";

const ERROR_SUPERS: Record<string, string> = { Error: "ASError", ArgumentError: "ArgumentError", RangeError: "ASRangeError", TypeError: "ASTypeError" };

export class FileEmitter extends EmitterCore {
  pad(n = this.ind): string { return this.indentUnit.repeat(n); }

  annot(t: string): string { return `: ${this.tsType(t)}`; }

  comments(node: A.NodeBase, out: string[]): void {
    if (node.blank && out.length && out[out.length - 1] !== "" && !/[{(]$/.test(out[out.length - 1])) out.push("");
    for (const c of node.comments ?? []) {
      if (c.startsWith("//")) { out.push(this.pad() + c.trimEnd()); continue; }
      const ls = c.split("\n").map((l) => l.replace(/\r$/, ""));
      out.push(this.pad() + ls[0].trim());
      for (const l of ls.slice(1)) {
        const t = l.trim();
        out.push(this.pad() + (t.startsWith("*") ? " " + t : t));
      }
    }
  }

  // ------------------------------------------------------------ functions
  paramList(params: A.Param[], ctx: FnCtx, signature = false): string {
    return params.map((p) => {
      const type = p.type ? this.prog.typeOf(p.type, this.f) : p.rest ? "Array" : "*";
      const emitName = safeLocal(p.name);
      ctx.vars.set(p.name, { emitName, type });
      if (p.rest) return `...${emitName}: any[]`;
      if (signature) return `${emitName}${p.init ? "?" : ""}${this.annot(type)}`;
      const init = p.init ? ` = ${this.coerce(this.expr(p.init, ctx), type).code}` : "";
      return `${emitName}${this.annot(type)}${init}`;
    }).join(", ");
  }

  fnBody(body: A.Statement[], ctx: FnCtx, analysis: FunctionAnalysis, prelude?: () => string[]): string[] {
    const out: string[] = [];
    this.ind++;
    this.declareLocals(body, ctx, analysis, out);
    if (prelude) out.push(...prelude());
    out.push(...this.stmts(body, ctx));
    this.ind--;
    return out;
  }

  /** Declares a function's locals: hoisted vars, nested function declarations, a writable `arguments`. */
  declareLocals(body: A.Statement[], ctx: FnCtx, analysis: FunctionAnalysis, out: string[]): void {
    for (const d of analysis.locals.values()) {
      if (d.isParam) continue;
      const type = d.vtype ? this.prog.typeOf(d.vtype, this.f) : "*";
      ctx.vars.set(d.name, { emitName: safeLocal(d.name), type });
    }
    const nested = collectNestedFns(body);
    for (const fd of nested) ctx.vars.set(fd.name, { emitName: safeLocal(fd.name), type: "Function" });
    if (analysis.assignsArguments) {
      ctx.vars.set("arguments", { emitName: "arguments_", type: "Array" });
      out.push(`${this.pad()}let arguments_: any[] = Array.from(arguments);`);
    }
    for (const d of analysis.locals.values()) {
      if (!d.hoist || d.isParam) continue;
      const v = ctx.vars.get(d.name)!;
      out.push(`${this.pad()}let ${v.emitName}${this.annot(v.type)} = ${this.defaultValue(v.type)};`);
    }
    for (const fd of nested) {
      const fx = this.funcExpr({ type: "FuncExpr", pos: fd.pos, params: fd.params, ret: fd.ret, body: fd.body ?? [] }, ctx);
      this.comments(fd, out);
      out.push(`${this.pad()}const ${safeLocal(fd.name)} = ${fx.code};`);
    }
  }

  override funcExpr(e: A.FuncExpr, ctx: FnCtx | undefined): Ex {
    const analysis = analyzeFunction(e.params, e.body);
    const retType = e.ret ? this.prog.typeOf(e.ret, this.f) : "*";
    const fctx: FnCtx = {
      parent: ctx, cls: ctx?.cls, isStatic: ctx?.isStatic ?? true, isCtor: false, retType,
      vars: new Map(), decisions: analysis.locals, nested: true,
    };
    const params = this.paramList(e.params, fctx);
    const ret = e.ret ? `: ${this.tsType(retType)}` : "";
    const selfRef = !!e.name && refersTo(e.body, e.name) && !analysis.locals.has(e.name);
    if (selfRef) fctx.vars.set(e.name!, { emitName: safeLocal(e.name!), type: "Function" });
    const useFunction = analysis.usesArguments || selfRef;
    if (selfRef && (analysis.usesThis || ctx?.cls)) this.warn(`named function expression ${e.name} refers to itself; emitted as a plain function (no lexical this)`, e.pos);
    const body = this.fnBody(e.body, fctx, analysis);
    const head = useFunction ? `function ${selfRef ? safeLocal(e.name!) : ""}(${params})${ret} {` : `(${params})${ret} => {`;
    const code = [head, ...body, `${this.pad()}}`].join("\n");
    return { code, type: "Function", prec: useFunction ? P.PRIMARY : P.ASSIGN };
  }

  // ------------------------------------------------------------ statements
  stmts(list: A.Statement[], ctx: FnCtx): string[] {
    const out: string[] = [];
    for (const s of list) if (s.type !== "Function") this.stmt(s, ctx, out);
    return out;
  }

  blockLines(s: A.Statement, ctx: FnCtx): string[] {
    this.ind++;
    const out: string[] = [];
    if (s.type === "Block") {
      this.comments(s, out);
      out.push(...this.stmts(s.body, ctx));
    } else this.stmt(s, ctx, out);
    this.ind--;
    return out;
  }

  exprStmt(e: A.Expr, ctx: FnCtx): string {
    const x = this.expr(e, ctx);
    return /^(\{|function\b)/.test(x.code) ? `(${x.code})` : x.code;
  }

  local(name: string, ctx: FnCtx): { emitName: string; type: string } {
    return this.lookupLocal(name, ctx) ?? { emitName: safeLocal(name), type: "*" };
  }

  varStmt(s: A.VarDef, ctx: FnCtx, out: string[]): void {
    const p = this.pad();
    for (const d of s.decls) {
      const dec = ctx.decisions.get(d.name);
      const v = this.local(d.name, ctx);
      if (!dec || dec.hoist) {
        if (d.init) out.push(`${p}${v.emitName} = ${this.wrap(this.coerce(this.expr(d.init, ctx), v.type), P.ASSIGN)};`);
      } else {
        const init = d.init ? this.wrap(this.coerce(this.expr(d.init, ctx), v.type), P.ASSIGN) : this.defaultValue(v.type);
        const kw = dec.kind === "const" ? "const" : "let";
        out.push(`${p}${kw} ${v.emitName}${this.annot(v.type)} = ${init};`);
      }
    }
  }

  stmt(s: A.Statement, ctx: FnCtx, out: string[]): void {
    this.comments(s, out);
    const p = this.pad();
    switch (s.type) {
      case "Block":
        out.push(`${p}{`, ...this.blockLines(s, ctx), `${p}}`);
        return;
      case "Empty": case "UseNamespace": case "Function":
        return;
      case "ExprStmt":
        out.push(`${p}${this.exprStmt(s.expr, ctx)};`);
        return;
      case "Var":
        this.varStmt(s, ctx, out);
        return;
      case "If": {
        const emitIf = (st: A.If, prefix: string) => {
          out.push(`${prefix}if (${this.expr(st.test, ctx).code}) {`, ...this.blockLines(st.then, ctx));
          if (st.else) {
            if (st.else.type === "If" && !st.else.comments) { emitIf(st.else, `${p}} else `); return; }
            out.push(`${p}} else {`, ...this.blockLines(st.else, ctx));
          }
          out.push(`${p}}`);
        };
        emitIf(s, p);
        return;
      }
      case "For": {
        let init = "";
        if (s.init && (s.init as A.VarDef).type === "Var") {
          const decl: string[] = [];
          const assigns: string[] = [];
          for (const d of (s.init as A.VarDef).decls) {
            const dec = ctx.decisions.get(d.name);
            const v = this.local(d.name, ctx);
            const val = d.init ? this.wrap(this.coerce(this.expr(d.init, ctx), v.type), P.ASSIGN) : this.defaultValue(v.type);
            if (!dec || dec.hoist) { if (d.init) assigns.push(`${v.emitName} = ${val}`); }
            else decl.push(`${v.emitName}${this.annot(v.type)} = ${val}`);
          }
          if (decl.length && assigns.length) {
            out.push(`${p}${assigns.join(", ")};`);
            init = `let ${decl.join(", ")}`;
          } else init = decl.length ? `let ${decl.join(", ")}` : assigns.join(", ");
        } else if (s.init) init = this.expr(s.init as A.Expr, ctx).code;
        const test = s.test ? this.expr(s.test, ctx).code : "";
        const upd = s.update ? this.expr(s.update, ctx).code : "";
        out.push(`${p}for (${init}; ${test}; ${upd}) {`, ...this.blockLines(s.body, ctx), `${p}}`);
        return;
      }
      case "ForIn": return this.forIn(s, ctx, out);
      case "While":
        out.push(`${p}while (${this.expr(s.test, ctx).code}) {`, ...this.blockLines(s.body, ctx), `${p}}`);
        return;
      case "DoWhile":
        out.push(`${p}do {`, ...this.blockLines(s.body, ctx), `${p}} while (${this.expr(s.test, ctx).code});`);
        return;
      case "Switch": {
        out.push(`${p}switch (${this.expr(s.disc, ctx).code}) {`);
        this.ind++;
        for (const c of s.cases) {
          this.comments(c, out);
          out.push(`${this.pad()}${c.test ? `case ${this.expr(c.test, ctx).code}:` : "default:"}`);
          this.ind++;
          out.push(...this.stmts(c.body, ctx));
          this.ind--;
        }
        this.ind--;
        out.push(`${p}}`);
        return;
      }
      case "Return": {
        if (!s.arg) { out.push(`${p}return;`); return; }
        const x = this.expr(s.arg, ctx);
        const v = ctx.retType === "void" || ctx.isCtor ? x : this.coerce(x, ctx.retType);
        out.push(`${p}return ${v.code};`);
        return;
      }
      case "Break": out.push(`${p}break${s.label ? " " + s.label : ""};`); return;
      case "Continue": out.push(`${p}continue${s.label ? " " + s.label : ""};`); return;
      case "Throw": out.push(`${p}throw ${this.expr(s.arg, ctx).code};`); return;
      case "Labeled":
        out.push(`${p}${s.label}:`);
        this.stmt(s.body, ctx, out);
        return;
      case "Try": return this.tryStmt(s, ctx, out);
    }
  }

  forIn(s: A.ForIn, ctx: FnCtx, out: string[]): void {
    const p = this.pad();
    const r = this.expr(s.right, ctx);
    let target: string;
    let vtype: string;
    let declare = false;
    if ((s.left as A.VarDef).type === "Var") {
      const d = (s.left as A.VarDef).decls[0];
      const dec = ctx.decisions.get(d.name);
      const v = this.local(d.name, ctx);
      target = v.emitName;
      vtype = v.type;
      declare = !!dec && !dec.hoist;
    } else {
      const lv = this.lvalue(s.left as A.Expr, ctx);
      target = lv.code;
      vtype = lv.type;
    }
    let src: string;
    let kw: "of" | "in";
    let elem = "*";
    // AS3 runs a for each / for in over null zero times; a JavaScript for...of over null throws ("is not
    // iterable": bug report #33, a monster cleared twice). So a Vector, Dictionary or XMLList that may be
    // null is read as empty.
    if (s.each) {
      kw = "of";
      if (r.type.startsWith("Vector.<")) { src = `(${r.code} ?? [])`; elem = r.type.slice(8, -1); }
      else if (r.type === DICT) src = `(${this.wrap(r, P.CALL)}?.values() ?? [])`;
      else if (r.type === "XMLList") { src = `(${r.code} ?? [])`; elem = "XML"; }
      else src = `${this.as3("values")}(${r.code})`;
    } else if (r.type === DICT) { kw = "of"; src = `(${this.wrap(r, P.CALL)}?.keys() ?? [])`; }
    else { kw = "in"; src = r.code; elem = "String"; }
    const needCoerce = PRIMITIVES.has(vtype) && vtype !== elem && !(vtype === "String" && kw === "in");
    const body = this.blockLines(s.body, ctx);
    if (!needCoerce) {
      out.push(`${p}for (${declare ? "let " : ""}${target} ${kw} ${src}) {`, ...body, `${p}}`);
      return;
    }
    const tmp = kw === "in" ? "$key" : "$value";
    const c = this.coerce({ code: tmp, type: elem, prec: P.PRIMARY }, vtype).code;
    out.push(`${p}for (const ${tmp} ${kw} ${src}) {`, `${this.pad(this.ind + 1)}${declare ? `let ${target}${this.annot(vtype)}` : target} = ${c};`, ...body, `${p}}`);
  }

  tryStmt(s: A.Try, ctx: FnCtx, out: string[]): void {
    const p = this.pad();
    out.push(`${p}try {`, ...this.blockLines(s.block, ctx));
    if (s.handlers.length) {
      const typeOfH = (h: A.CatchClause) => (h.ptype ? this.prog.typeOf(h.ptype, this.f) : "*");
      const catchAll = (t: string) => t === "*" || t === "Object" || t === "Error";
      const h0 = s.handlers[0];
      if (s.handlers.length === 1 && catchAll(typeOfH(h0))) {
        const cctx: FnCtx = { ...ctx, parent: ctx, vars: new Map([[h0.param, { emitName: safeLocal(h0.param), type: typeOfH(h0) }]]) };
        out.push(`${p}} catch (${safeLocal(h0.param)}) {`, ...this.blockLines(h0.body, cctx));
      } else {
        out.push(`${p}} catch ($error) {`);
        this.ind++;
        const q = this.pad();
        let hasCatchAll = false;
        s.handlers.forEach((h, i) => {
          const t = typeOfH(h);
          const cctx: FnCtx = { ...ctx, parent: ctx, vars: new Map([[h.param, { emitName: safeLocal(h.param), type: t }]]) };
          const lead = i === 0 ? q : `${q}} else `;
          if (catchAll(t)) { hasCatchAll = true; out.push(`${lead}{`); }
          else out.push(`${lead}if ($error instanceof ${this.typeValue(t)}) {`);
          this.ind++;
          out.push(`${this.pad()}const ${safeLocal(h.param)}${this.annot(t)} = $error;`);
          this.ind--;
          out.push(...this.blockLines(h.body, cctx));
        });
        if (!hasCatchAll) out.push(`${q}} else {`, `${q}${this.indentUnit}throw $error;`);
        out.push(`${q}}`);
        this.ind--;
      }
    }
    if (s.finalizer) out.push(`${p}} finally {`, ...this.blockLines(s.finalizer, ctx));
    out.push(`${p}}`);
  }

  // ------------------------------------------------------------ classes
  accessMod(a: A.Attrs): string {
    return a.access === "private" ? "private" : a.access === "protected" ? "protected" : "public";
  }

  emitClass(cm: ClassModel, exported: boolean, out: string[]): void {
    const d = cm.def as A.ClassDef;
    this.comments(d, out);
    this.loadTime = true;
    let sup: string;
    if (!cm.superQ || cm.superQ === "Object") sup = this.as3Import("ASObject");
    else if (ERROR_SUPERS[cm.superQ]) sup = this.as3Import(ERROR_SUPERS[cm.superQ]);
    else sup = this.ref(cm.superQ);
    const ifaces = cm.ifaces.filter((q) => this.prog.classes.get(q)?.isInterface).map((q) => this.ref(q));
    this.loadTime = false;
    out.push(`${exported ? "export " : ""}class ${cm.name} extends ${sup}${ifaces.length ? ` implements ${ifaces.join(", ")}` : ""} {`);
    this.ind++;
    const p = this.pad();
    if (cm.dynamic) out.push(`${p}[key: string]: any;`, "");

    // static block: embeds, interface registration, prototype field defaults
    const staticLines: string[] = [];
    for (const m of d.attrs.meta) {
      if (m.name !== "Embed") continue;
      const obj = m.args.map((a) => `${a.key ?? "source"}: ${JSON.stringify(a.value)}`).join(", ");
      staticLines.push(`${this.as3("embed")}(this, { ${obj} });`);
    }
    if (ifaces.length) {
      this.loadTime = true;
      staticLines.push(`${this.as3("implement")}(this, [${ifaces.join(", ")}]);`);
      this.loadTime = false;
    }
    const instVars: { d: A.VarDeclarator; attrs: A.Attrs; kind: string; comments?: string[] }[] = [];
    for (const m of d.members) if (m.type === "Var" && !m.attrs.isStatic) for (const dc of m.decls) instVars.push({ d: dc, attrs: m.attrs, kind: m.kind, comments: dc === m.decls[0] ? m.comments : undefined });
    const ctorCtx = (): FnCtx => ({ cls: cm, isStatic: false, isCtor: true, retType: "void", vars: new Map(), decisions: new Map() });
    const defaults: string[] = [];
    const lateInits: { emitName: string; type: string; init: A.Expr }[] = [];
    for (const v of instVars) {
      const mem = cm.inst.get(v.d.name)!;
      if (isConstInit(v.d.init)) {
        const val = v.d.init ? this.coerce(this.expr(v.d.init, ctorCtx()), mem.type).code : this.defaultValue(mem.type);
        defaults.push(`${propKey(mem.emitName)}: ${val}`);
      } else {
        defaults.push(`${propKey(mem.emitName)}: ${this.defaultValue(mem.type)}`);
        lateInits.push({ emitName: mem.emitName, type: mem.type, init: v.d.init! });
      }
    }
    if (defaults.length) staticLines.push(`${this.as3("fields")}(this, { ${defaults.join(", ")} });`);
    if (staticLines.length) {
      out.push(`${p}static {`);
      for (const l of staticLines) out.push(`${p}${this.indentUnit}${l}`);
      out.push(`${p}}`, "");
    }

    // class-level namespaces (used as values, e.g. `ns == duringEvent`)
    for (const m of d.members) {
      if (m.type !== "NamespaceDef") continue;
      this.comments(m, out);
      out.push(`${p}${this.accessMod(m.attrs)} static readonly ${m.name}: any = ${this.as3("namespace")}(${JSON.stringify(m.value ?? m.name)});`);
    }
    // Static initialisation. AVM2 runs it when the class is first used; classes
    // whose initialisers are not all constants get the same laziness.
    const sctx: FnCtx = { cls: cm, isStatic: true, isCtor: false, retType: "*", vars: new Map(), decisions: new Map() };
    const clsStmts = d.members.filter((m) => !["Var", "Function", "Import", "UseNamespace", "NamespaceDef", "Class", "Interface"].includes(m.type)) as A.Statement[];
    const staticVars = d.members.filter((m) => m.type === "Var" && m.attrs.isStatic) as A.VarDef[];
    const lazy = clsStmts.length > 0 || staticVars.some((v) => v.decls.some((dc) => dc.init && !this.isEagerInit(dc.init, cm)));
    for (const m of staticVars) {
      this.comments(m, out);
      for (const dc of m.decls) {
        const mem = cm.stat.get(dc.name)!;
        if (lazy) {
          out.push(`${p}${this.accessMod(m.attrs)} static ${propKey(mem.emitName)}${this.annot(mem.type)};${m.kind === "const" ? " // const" : ""}`);
          continue;
        }
        this.loadTime = true;
        const init = dc.init ? this.wrap(this.coerce(this.expr(dc.init, sctx), mem.type), P.ASSIGN) : this.defaultValue(mem.type);
        this.loadTime = false;
        out.push(`${p}${this.accessMod(m.attrs)} static ${m.kind === "const" ? "readonly " : ""}${propKey(mem.emitName)}${this.annot(mem.type)} = ${init};`);
      }
    }
    if (lazy) {
      const defaults = staticVars.flatMap((m) => m.decls.map((dc) => { const mem = cm.stat.get(dc.name)!; return `${propKey(mem.emitName)}: ${this.defaultValue(mem.type)}`; }));
      const analysis = analyzeFunction([], clsStmts);
      const lctx: FnCtx = { ...sctx, vars: new Map(), decisions: analysis.locals };
      const self = this.ref(cm.qname);
      out.push("", `${p}static {`, `${p}${this.indentUnit}${this.as3("lazyStatics")}(this, { ${defaults.join(", ")} }, () => {`);
      this.ind += 2;
      this.declareLocals(clsStmts, lctx, analysis, out);
      for (const m of d.members) {
        if (m.type === "Var" && m.attrs.isStatic) {
          for (const dc of m.decls) {
            if (!dc.init) continue;
            const mem = cm.stat.get(dc.name)!;
            out.push(`${this.pad()}${self}.${mem.emitName} = ${this.wrap(this.coerce(this.expr(dc.init, lctx), mem.type), P.ASSIGN)};`);
          }
        } else if (clsStmts.includes(m as A.Statement)) this.stmt(m as A.Statement, lctx, out);
      }
      this.ind -= 2;
      out.push(`${p}${this.indentUnit}});`, `${p}}`);
    }
    // instance field declarations
    for (const v of instVars) {
      const mem = cm.inst.get(v.d.name)!;
      if (v.comments) this.comments({ pos: 0, comments: v.comments }, out);
      out.push(`${p}${this.accessMod(v.attrs)} ${propKey(mem.emitName)}${this.annot(mem.type)};`);
    }
    if (instVars.length) out.push("");

    // constructor -> $ctor
    const ctorDef = d.members.find((m) => m.type === "Function" && m.name === cm.name && !m.attrs.isStatic && !m.accessor) as A.FunctionDef | undefined;
    const sup0 = this.prog.superOf(cm);
    if (ctorDef || lateInits.length || (sup0 && sup0.ctorParams.length && !sup0.builtin)) {
      const fd = ctorDef ?? ({ type: "Function", name: cm.name, attrs: { meta: [] }, params: [], body: [], pos: d.pos } as A.FunctionDef);
      const body = fd.body ?? [];
      const analysis = analyzeFunction(fd.params, body);
      const ctx: FnCtx = { cls: cm, isStatic: false, isCtor: true, retType: "void", vars: new Map(), decisions: analysis.locals };
      // Optional in TypeScript so every subclass $ctor stays type-compatible with its superclass's
      // (AS3 constructors do not override each other); runtime behaviour is unchanged.
      let superParams: { type: string }[] = [];
      for (let sc = this.prog.superOf(cm); sc; sc = this.prog.superOf(sc)) { if (sc.ctorParams.length || sc.builtin) { superParams = sc.ctorParams; break; } }
      const params = this.paramList(fd.params, ctx).split(", ").map((x, i) => {
        if (!x || x.startsWith("...")) return x;
        const own = this.prog.typeOf(fd.params[i]?.type, this.f);
        const sup = superParams[i]?.type;
        // a different type than the superclass constructor's parameter at this position: `any` for TypeScript
        if (sup && sup !== own && own !== "*" && sup !== "*") x = x.replace(/^([\w$]+)(\??): ([^=]+?)( = |$)/, (_m, n, q, t, eq) => `${n}${q}: any /* ${t.trim()} */${eq}`);
        return x.includes(" = ") ? x : x.replace(/^([\w$]+):/, "$1?:");
      }).join(", ");
      if (ctorDef) this.comments(ctorDef, out);
      out.push(`${p}public $ctor(${params}): void {`);
      const lines = this.fnBody(body, ctx, analysis, () => {
        const pre: string[] = [];
        for (const li of lateInits) pre.push(`${this.pad()}this.${li.emitName} = ${this.wrap(this.coerce(this.expr(li.init, ctx), li.type), P.ASSIGN)};`);
        if (!hasSuperCall(body)) pre.push(`${this.pad()}super.$ctor();`);
        return pre;
      });
      out.push(...lines, `${p}}`);
    }

    // methods and accessors
    for (const m of d.members) {
      if (m.type !== "Function" || m === ctorDef) continue;
      out.push("");
      this.emitMethod(m, cm, out);
    }
    // accessor halves that AS3 inherits but JavaScript would hide
    for (const mem of cm.inst.values()) {
      if (mem.kind !== "accessor" || (mem.hasGetter && mem.hasSetter)) continue;
      let base;
      for (let s = this.prog.superOf(cm); s && !base; s = this.prog.superOf(s)) {
        const b = s.inst.get(mem.name);
        if (b && b.kind === "accessor") base = b;
      }
      if (!base) continue;
      if (mem.hasGetter && base.hasSetter) out.push("", `${p}public override set ${mem.emitName}(value${this.annot(base.type)}) {`, `${p}${this.indentUnit}super.${mem.emitName} = value;`, `${p}}`);
      if (mem.hasSetter && base.hasGetter) out.push("", `${p}public override get ${mem.emitName}()${this.annot(base.type)} {`, `${p}${this.indentUnit}return super.${mem.emitName};`, `${p}}`);
    }
    this.ind--;
    out.push(`${this.pad()}}`);
  }

  /**
   * True when a static initialiser can run at module load without observable
   * difference from AVM2's first-use initialisation: constants, literals,
   * closures, and new/casts of Flash or top-level classes over such values.
   */
  isEagerInit(e: A.Expr, cm: ClassModel): boolean {
    const ok = (x: A.Expr | null | undefined): boolean => !x || this.isEagerInit(x, cm);
    const builtinClass = (x: A.Expr): boolean => {
      if (x.type === "TypeApp") return true;
      const t = x.type === "Ident" ? this.prog.resolveType(x.name, this.f) : x.type === "Member" ? this.qualifiedName(x) : undefined;
      return !!t && t !== "*" && !!this.prog.classes.get(t)?.builtin;
    };
    switch (e.type) {
      case "Literal": case "FuncExpr": case "TypeApp": case "Xml": return true;
      case "Paren": return ok(e.expr);
      case "Unary": return e.op !== "delete" && ok(e.arg);
      case "Binary": case "Logical": return ok(e.left) && ok(e.right);
      case "Cond": return ok(e.test) && ok(e.then) && ok(e.else);
      case "Array": return e.elements.every(ok);
      case "Object": return e.props.every((pp) => ok(pp.value));
      case "VectorLit": return e.elements.every(ok);
      case "New": return builtinClass(e.callee) && e.args.every(ok);
      case "Call": return builtinClass(e.callee) && e.args.every(ok);
      case "Ident": {
        if (e.ns === "CONFIG") return true;
        if (this.prog.resolveType(e.name, this.f) !== "*") return true;
        const init = this.staticConstInit(cm, e.name);
        return !!init && init.type === "Literal";
      }
      case "Member": {
        if (this.qualifiedName(e)) return true;
        const owner = e.obj.type === "Ident" ? this.prog.resolveType(e.obj.name, this.f) : undefined;
        const oc = owner && owner !== "*" ? this.prog.classes.get(owner) : undefined;
        if (!oc) return false;
        if (oc.builtin) return true;
        // another game class's statics may themselves initialise lazily: stay lazy too
        if (oc !== cm) return false;
        const init = this.staticConstInit(oc, e.name);
        return !!init && init.type === "Literal";
      }
      default: return false;
    }
  }
  private qualifiedName(e: A.Expr): string | undefined {
    const parts: string[] = [];
    let x: A.Expr = e;
    while (x.type === "Member") { parts.unshift(x.name); x = x.obj; }
    if (x.type !== "Ident") return undefined;
    parts.unshift(x.name);
    const q = parts.join(".");
    return this.prog.classes.has(q) ? q : undefined;
  }
  private staticConstInit(cm: ClassModel, name: string): A.Expr | undefined {
    const d = cm.def as A.ClassDef | undefined;
    if (!d || !d.members) return undefined;
    for (const m of d.members) if (m.type === "Var" && m.attrs.isStatic && m.kind === "const") for (const dc of m.decls) if (dc.name === name) return dc.init ?? undefined;
    return undefined;
  }

  emitMethod(fd: A.FunctionDef, cm: ClassModel, out: string[]): void {
    const isStatic = !!fd.attrs.isStatic;
    const mem = (isStatic ? cm.stat : cm.inst).get(fd.name);
    const body = fd.body ?? [];
    const analysis = analyzeFunction(fd.params, body);
    const retType = fd.accessor === "set" ? "void" : fd.ret ? this.prog.typeOf(fd.ret, this.f) : "*";
    const mname = mem?.emitName ?? fd.name;
    const self = fd.accessor ? undefined : isStatic ? `${this.ref(cm.qname)}.${mname}` : `${this.as3("bind")}(this, this.${mname})`;
    const ctx: FnCtx = { cls: cm, isStatic, isCtor: false, retType, vars: new Map(), decisions: analysis.locals, self };
    const params = this.paramList(fd.params, ctx);
    const mods = [this.accessMod(fd.attrs), isStatic ? "static" : "", fd.attrs.isOverride ? "override" : ""].filter(Boolean).join(" ");
    const name = propKey(mname);
    const ret = fd.ret && fd.accessor !== "set" ? this.annot(retType) : "";
    const head = fd.accessor ? `${mods} ${fd.accessor} ${name}(${params})${ret}` : `${mods} ${name}(${params})${ret}`;
    this.comments(fd, out);
    const p = this.pad();
    out.push(`${p}${head} {`, ...this.fnBody(body, ctx, analysis), `${p}}`);
  }

  emitInterface(cm: ClassModel, exported: boolean, out: string[]): void {
    const d = cm.def as A.InterfaceDef;
    this.comments(d, out);
    const ext = cm.ifaces.map((q) => this.ref(q));
    const ex = exported ? "export " : "";
    out.push(`${ex}interface ${cm.name}${ext.length ? ` extends ${ext.join(", ")}` : ""} {`);
    this.ind++;
    const seen = new Set<string>();
    for (const m of d.members) {
      const ctx: FnCtx = { cls: cm, isStatic: false, isCtor: false, retType: "*", vars: new Map(), decisions: new Map() };
      this.comments(m, out);
      if (m.accessor) {
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        const mem = cm.inst.get(m.name)!;
        out.push(`${this.pad()}${mem.hasSetter ? "" : "readonly "}${m.name}${this.annot(mem.type)};`);
      } else {
        const params = this.paramList(m.params, ctx, true);
        out.push(`${this.pad()}${m.name}(${params})${m.ret ? this.annot(this.prog.typeOf(m.ret, this.f)) : ": any"};`);
      }
    }
    this.ind--;
    out.push(`${this.pad()}}`);
    this.loadTime = true;
    const extRefs = cm.ifaces.map((q) => this.ref(q));
    this.loadTime = false;
    out.push(`${ex}const ${cm.name} = ${this.as3("iface")}(${JSON.stringify(as3QName(cm.qname))}, [${extRefs.join(", ")}]);`);
  }

  emitGlobalFunction(fd: A.FunctionDef, exported: boolean, out: string[]): void {
    const body = fd.body ?? [];
    const analysis = analyzeFunction(fd.params, body);
    const retType = fd.ret ? this.prog.typeOf(fd.ret, this.f) : "*";
    const ctx: FnCtx = { isStatic: true, isCtor: false, retType, vars: new Map(), decisions: analysis.locals };
    const params = this.paramList(fd.params, ctx);
    this.comments(fd, out);
    out.push(`${exported ? "export " : ""}function ${fd.name}(${params})${fd.ret ? this.annot(retType) : ""} {`, ...this.fnBody(body, ctx, analysis), "}");
  }

  emitGlobalVar(v: A.VarDef, exported: boolean, out: string[]): void {
    const ctx: FnCtx = { isStatic: true, isCtor: false, retType: "*", vars: new Map(), decisions: new Map() };
    this.comments(v, out);
    for (const d of v.decls) {
      const t = d.vtype ? this.prog.typeOf(d.vtype, this.f) : "*";
      this.loadTime = true;
      const init = d.init ? this.coerce(this.expr(d.init, ctx), t).code : this.defaultValue(t);
      this.loadTime = false;
      out.push(`${exported ? "export " : ""}${v.kind === "const" ? "const" : "let"} ${d.name}${this.annot(t)} = ${init};`);
    }
  }

  emitTopLevel(d: A.Directive, exported: boolean, out: string[]): void {
    switch (d.type) {
      case "Class": {
        const cm = exported ? this.f.classes.find((c) => c.name === d.name) : this.f.privateClasses.get(d.name);
        if (cm) this.emitClass(cm, exported, out);
        out.push("");
        return;
      }
      case "Interface": {
        const cm = exported ? this.f.classes.find((c) => c.name === d.name) : this.f.privateClasses.get(d.name);
        if (cm) this.emitInterface(cm, exported, out);
        out.push("");
        return;
      }
      case "Function": this.emitGlobalFunction(d, exported, out); out.push(""); return;
      case "Var": this.emitGlobalVar(d, exported, out); out.push(""); return;
      case "NamespaceDef":
        this.comments(d, out);
        out.push(`// AS3 namespace ${d.name}${d.value ? ` = "${d.value}"` : ""}: members declared in it are plain properties in TypeScript.`, "");
        return;
      case "Import": case "UseNamespace": return;
      default: {
        const ctx: FnCtx = { isStatic: true, isCtor: false, retType: "*", vars: new Map(), decisions: new Map() };
        this.loadTime = true;
        this.stmt(d as A.Statement, ctx, out);
        this.loadTime = false;
      }
    }
  }

  emitFile(): string {
    const body: string[] = [];
    for (const d of this.f.program.body) this.emitTopLevel(d, true, body);
    for (const d of this.f.program.outside) this.emitTopLevel(d, false, body);
    while (body.length && body[body.length - 1] === "") body.pop();
    const header: string[] = [];
    if (this.usesAs3) header.push(`import * as as3 from "as3";`);
    if (this.as3Named.size) header.push(`import { ${[...this.as3Named].sort().join(", ")} } from "as3";`);
    for (const [mod, names] of [...this.moduleImports].sort()) {
      const list = [...names].map(([n, l]) => (n === l ? n : `${n} as ${l}`)).sort();
      header.push(`import { ${list.join(", ")} } from "${mod}";`);
    }
    if (this.gameImports.size) {
      const list = [...this.gameImports].map(([n, l]) => (n === l ? n : `${n} as ${l}`)).sort();
      header.push(`import { ${list.join(", ")} } from "@game";`);
    }
    if (this.usesConfig) header.push(`import { CONFIG } from "@config";`);
    return [...header, ...(header.length ? [""] : []), ...body, ""].join("\n");
  }
}

// ------------------------------------------------------------ helpers
export function as3QName(q: string): string {
  const i = q.lastIndexOf(".");
  return i < 0 ? q : `${q.slice(0, i)}::${q.slice(i + 1)}`;
}

function propKey(n: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(n) ? n : JSON.stringify(n);
}

function isConstInit(e?: A.Expr): boolean {
  if (!e) return true;
  if (e.type === "Literal") return e.kind !== "regex";
  if (e.type === "Unary" && e.op === "-" && e.arg.type === "Literal" && e.arg.kind === "num") return true;
  return false;
}

function collectNestedFns(body: A.Statement[]): A.FunctionDef[] {
  const out: A.FunctionDef[] = [];
  const walk = (s: A.Statement | undefined) => {
    if (!s) return;
    switch (s.type) {
      case "Function": out.push(s); break;
      case "Block": s.body.forEach(walk); break;
      case "If": walk(s.then); walk(s.else); break;
      case "For": case "ForIn": case "While": case "DoWhile": case "Labeled": walk(s.body); break;
      case "Switch": s.cases.forEach((c) => c.body.forEach(walk)); break;
      case "Try": walk(s.block); s.handlers.forEach((h) => walk(h.body)); walk(s.finalizer); break;
    }
  };
  body.forEach(walk);
  return out;
}

function hasSuperCall(body: A.Statement[]): boolean {
  let found = false;
  const visit = (n: unknown): void => {
    if (found || !n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const o = n as Record<string, unknown>;
    if (o.type === "FuncExpr" || o.type === "Function") return;
    if (o.type === "Call" && (o.callee as A.Expr).type === "Super") { found = true; return; }
    for (const k in o) if (k !== "comments") visit(o[k]);
  };
  visit(body);
  return found;
}

function refersTo(body: A.Statement[], name: string): boolean {
  let found = false;
  const visit = (n: unknown): void => {
    if (found || !n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const o = n as Record<string, unknown>;
    if (o.type === "Ident" && o.name === name) { found = true; return; }
    for (const k in o) if (k !== "comments") visit(o[k]);
  };
  visit(body);
  return found;
}
