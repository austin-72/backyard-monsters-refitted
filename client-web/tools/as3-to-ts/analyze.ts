/**
 * AS3 `var` declarations are function-scoped and default-initialised at
 * function entry. A variable can stay a block-scoped `let` at its original
 * position only when that is observably identical: declared once, directly in
 * a statement list, never read before its declaration or outside its block, not
 * captured by a nested function, and not re-entered in a loop without an
 * initialiser. Everything else is hoisted to the top of the function.
 */
import type * as A from "./ast.ts";

interface DeclInfo {
  block: number;
  pos: number;
  hasInit: boolean;
  inLoop: boolean;
  direct: boolean;
  forIn: boolean;
  selfRef: boolean;
  vtype?: A.TypeExpr;
  kind: "var" | "const";
}

interface RefInfo { blocks: number[]; pos: number; nested: boolean; }

export interface LocalDecision {
  name: string;
  hoist: boolean;
  /** true when the name is also a parameter: declarations become assignments. */
  isParam: boolean;
  vtype?: A.TypeExpr;
  kind: "var" | "const";
}

export interface FunctionAnalysis {
  locals: Map<string, LocalDecision>;
  usesArguments: boolean;
  /** AS3 lets a function assign to `arguments`; strict JavaScript does not */
  assignsArguments: boolean;
  usesThis: boolean;
}

export function analyzeFunction(params: A.Param[], body: A.Statement[]): FunctionAnalysis {
  const decls = new Map<string, DeclInfo[]>();
  const refs = new Map<string, RefInfo[]>();
  const paramNames = new Set(params.map((p) => p.name));
  const shadows: Set<string>[] = [];
  let usesArguments = false;
  let assignsArguments = false;
  let usesThis = false;
  let nextBlock = 1;
  let declaring: string | undefined;
  let declaringSelfRef = false;

  const shadowed = (n: string) => shadows.some((s) => s.has(n));

  const addDecl = (name: string, d: DeclInfo) => {
    const list = decls.get(name) ?? [];
    list.push(d);
    decls.set(name, list);
  };

  const nestedNames = (fparams: A.Param[], fbody: A.Statement[], selfName?: string): Set<string> => {
    const s = new Set(fparams.map((p) => p.name));
    if (selfName) s.add(selfName);
    const scan = (st: A.Statement | undefined) => {
      if (!st) return;
      switch (st.type) {
        case "Var": st.decls.forEach((d) => s.add(d.name)); break;
        case "Function": s.add(st.name); break;
        case "Block": st.body.forEach(scan); break;
        case "If": scan(st.then); scan(st.else); break;
        case "For": if (st.init && (st.init as A.VarDef).type === "Var") scan(st.init as A.VarDef); scan(st.body); break;
        case "ForIn": if ((st.left as A.VarDef).type === "Var") scan(st.left as A.VarDef); scan(st.body); break;
        case "While": case "DoWhile": scan(st.body); break;
        case "Switch": st.cases.forEach((c) => c.body.forEach(scan)); break;
        case "Try": scan(st.block); st.handlers.forEach((h) => scan(h.body)); scan(st.finalizer); break;
        case "Labeled": scan(st.body); break;
      }
    };
    fbody.forEach(scan);
    return s;
  };

  const expr = (e: A.Expr | null | undefined, blocks: number[], nested: number): void => {
    if (!e) return;
    switch (e.type) {
      case "Ident":
        if (e.ns) return;
        if (e.name === "arguments" && nested === 0) usesArguments = true;
        if (shadowed(e.name)) return;
        if (declaring === e.name) declaringSelfRef = true;
        (refs.get(e.name) ?? refs.set(e.name, []).get(e.name)!).push({ blocks, pos: e.pos, nested: nested > 0 });
        return;
      case "This": if (nested === 0) usesThis = true; return;
      case "FuncExpr": {
        shadows.push(nestedNames(e.params, e.body, e.name));
        e.params.forEach((p) => expr(p.init, blocks, nested + 1));
        stmts(e.body, blocks, 0, nested + 1);
        shadows.pop();
        return;
      }
      case "Member": expr(e.obj, blocks, nested); return;
      case "Index": expr(e.obj, blocks, nested); expr(e.index, blocks, nested); return;
      case "Call": case "New": expr(e.callee, blocks, nested); e.args.forEach((a) => expr(a, blocks, nested)); return;
      case "Unary": case "Update": expr(e.arg, blocks, nested); return;
      case "Binary": case "Logical": expr(e.left, blocks, nested); expr(e.right, blocks, nested); return;
      case "Assign":
        if (nested === 0 && e.target.type === "Ident" && e.target.name === "arguments") assignsArguments = true;
        expr(e.target, blocks, nested); expr(e.value, blocks, nested); return;
      case "Cond": expr(e.test, blocks, nested); expr(e.then, blocks, nested); expr(e.else, blocks, nested); return;
      case "Seq": e.exprs.forEach((x) => expr(x, blocks, nested)); return;
      case "Array": e.elements.forEach((x) => expr(x, blocks, nested)); return;
      case "Object": e.props.forEach((p) => expr(p.value, blocks, nested)); return;
      case "Paren": expr(e.expr, blocks, nested); return;
      case "VectorLit": e.elements.forEach((x) => expr(x, blocks, nested)); return;
      case "TypeApp": expr(e.base, blocks, nested); return;
      case "Attr": expr(e.obj, blocks, nested); return;
      case "Descendants": expr(e.obj, blocks, nested); return;
      case "Filter": expr(e.obj, blocks, nested); expr(e.pred, blocks, nested); return;
    }
  };

  const varDef = (v: A.VarDef, blocks: number[], loop: number, nested: number, direct: boolean, forIn = false) => {
    for (const d of v.decls) {
      declaring = nested === 0 ? d.name : undefined;
      declaringSelfRef = false;
      expr(d.init, blocks, nested);
      const selfRef = declaringSelfRef;
      declaring = undefined;
      if (nested === 0) {
        addDecl(d.name, {
          block: blocks[blocks.length - 1], pos: d.pos, hasInit: !!d.init || forIn, inLoop: loop > 0,
          direct, forIn, selfRef, vtype: d.vtype, kind: v.kind,
        });
      }
    }
  };

  const stmt = (s: A.Statement | undefined, blocks: number[], loop: number, nested: number, direct: boolean): void => {
    if (!s) return;
    switch (s.type) {
      case "Block": stmts(s.body, [...blocks, nextBlock++], loop, nested); return;
      case "Var": varDef(s, blocks, loop, nested, direct); return;
      case "Function": {
        shadows.push(nestedNames(s.params, s.body!, s.name));
        s.params.forEach((p) => expr(p.init, blocks, nested + 1));
        stmts(s.body ?? [], blocks, 0, nested + 1);
        shadows.pop();
        return;
      }
      case "ExprStmt": expr(s.expr, blocks, nested); return;
      case "If": expr(s.test, blocks, nested); stmt(s.then, blocks, loop, nested, false); stmt(s.else, blocks, loop, nested, false); return;
      case "For": {
        const b = [...blocks, nextBlock++];
        if (s.init && (s.init as A.VarDef).type === "Var") varDef(s.init as A.VarDef, b, loop, nested, true);
        else expr(s.init as A.Expr, b, nested);
        expr(s.test, b, nested);
        expr(s.update, b, nested);
        stmt(s.body, b, loop + 1, nested, false);
        return;
      }
      case "ForIn": {
        const b = [...blocks, nextBlock++];
        expr(s.right, blocks, nested);
        if ((s.left as A.VarDef).type === "Var") varDef(s.left as A.VarDef, b, loop + 1, nested, true, true);
        else expr(s.left as A.Expr, b, nested);
        stmt(s.body, b, loop + 1, nested, false);
        return;
      }
      case "While": expr(s.test, blocks, nested); stmt(s.body, blocks, loop + 1, nested, false); return;
      case "DoWhile": stmt(s.body, blocks, loop + 1, nested, false); expr(s.test, blocks, nested); return;
      case "Switch": {
        expr(s.disc, blocks, nested);
        for (const c of s.cases) {
          const b = [...blocks, nextBlock++];
          expr(c.test, blocks, nested);
          stmts(c.body, b, loop, nested);
        }
        return;
      }
      case "Return": case "Throw": expr(s.arg, blocks, nested); return;
      case "Try": {
        stmt(s.block, blocks, loop, nested, true);
        for (const h of s.handlers) {
          shadows.push(new Set([h.param]));
          stmt(h.body, blocks, loop, nested, true);
          shadows.pop();
        }
        stmt(s.finalizer, blocks, loop, nested, true);
        return;
      }
      case "Labeled": stmt(s.body, blocks, loop, nested, false); return;
    }
  };

  const stmts = (list: A.Statement[], blocks: number[], loop: number, nested: number) => {
    for (const s of list) stmt(s, blocks, loop, nested, true);
  };

  for (const p of params) expr(p.init, [0], 0);
  stmts(body, [0], 0, 0);

  const locals = new Map<string, LocalDecision>();
  for (const [name, ds] of decls) {
    const d0 = ds[0];
    const rs = refs.get(name) ?? [];
    const isParam = paramNames.has(name);
    const hoist =
      isParam ||
      ds.length > 1 ||
      !d0.direct ||
      d0.selfRef ||
      (d0.inLoop && !d0.hasInit) ||
      rs.some((r) => r.nested || r.pos < d0.pos || !r.blocks.includes(d0.block));
    locals.set(name, { name, hoist, isParam, vtype: ds.find((d) => d.vtype)?.vtype, kind: ds.length > 1 ? "var" : d0.kind });
  }
  return { locals, usesArguments, assignsArguments, usesThis };
}
