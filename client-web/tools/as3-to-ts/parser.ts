/**
 * Recursive-descent parser for ActionScript 3.
 * Covers the grammar used by the BYM client, including E4X attribute/filter
 * access and XML literals (used by utils/exposed).
 */
import { tokenize, type Token } from "./lexer.ts";
import type * as A from "./ast.ts";

const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||="]);

const BIN_PREC: Record<string, number> = {
  "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5,
  "==": 6, "!=": 6, "===": 6, "!==": 6,
  "<": 7, ">": 7, "<=": 7, ">=": 7, instanceof: 7, is: 7, as: 7, in: 7,
  "<<": 8, ">>": 8, ">>>": 8,
  "+": 9, "-": 9,
  "*": 10, "/": 10, "%": 10,
};

const MODIFIERS = new Set(["public", "private", "protected", "internal", "static", "override", "final", "dynamic", "native"]);
const DEF_KEYWORDS = new Set(["var", "const", "function", "class", "interface", "namespace"]);

export class ParseError extends Error {}

export function parse(src: string, file: string): A.Program {
  return new Parser(tokenize(src, file), file, src).program();
}

class Parser {
  private i = 0;
  constructor(private toks: Token[], private file: string, private src: string) {}

  // ------------------------------------------------------------ token helpers
  private peek(o = 0): Token { return this.toks[Math.min(this.i + o, this.toks.length - 1)]; }
  private next(): Token { return this.toks[this.i++]; }
  private is(v: string, o = 0): boolean {
    const t = this.peek(o);
    return (t.k === "p" || t.k === "id") && t.v === v;
  }
  private isP(v: string, o = 0): boolean { const t = this.peek(o); return t.k === "p" && t.v === v; }
  private eat(v: string): boolean { if (this.is(v)) { this.i++; return true; } return false; }
  private fail(msg: string, t: Token = this.peek()): never {
    throw new ParseError(`${this.file}:${t.line}: ${msg} (got ${t.k} ${JSON.stringify(t.v)})`);
  }
  private expect(v: string): Token {
    if (!this.is(v)) this.fail(`expected '${v}'`);
    return this.next();
  }
  private ident(): string {
    const t = this.peek();
    if (t.k !== "id") this.fail("expected identifier");
    this.i++;
    return t.v;
  }
  /** Consumes one `>` even when the lexer produced `>>`, `>>>`, `>=`, `>>=`. */
  private expectGt(): void {
    const t = this.peek();
    if (t.k === "p" && t.v.startsWith(">")) {
      if (t.v === ">") { this.i++; return; }
      t.v = t.v.slice(1);
      t.pos++;
      return;
    }
    this.fail("expected '>'");
  }
  private semi(): void {
    if (this.eat(";")) return;
    const t = this.peek();
    if (t.k === "eof" || this.isP("}") || t.nl) return;
    this.fail("expected ';'");
  }
  private base(t: Token): A.NodeBase {
    const b: A.NodeBase = { pos: t.pos };
    if (t.comments) b.comments = t.comments;
    if (t.blank) b.blank = true;
    return b;
  }
  private qname(): string {
    let n = this.ident();
    while (this.isP(".") && this.peek(1).k === "id") {
      this.i++;
      n += "." + this.ident();
    }
    return n;
  }

  // ------------------------------------------------------------ program
  program(): A.Program {
    let pkg = "";
    let body: A.Directive[] = [];
    if (this.is("package")) {
      this.next();
      if (this.peek().k === "id") pkg = this.qname();
      this.expect("{");
      body = this.directives("pkg");
      this.expect("}");
    }
    const outside = this.directives("pkg", true);
    return { file: this.file, pkg, body, outside };
  }

  private directives(ctx: "pkg" | "class", toEof = false): A.Directive[] {
    const out: A.Directive[] = [];
    while (true) {
      const t = this.peek();
      if (t.k === "eof") break;
      if (!toEof && this.isP("}")) break;
      const d = this.directive(ctx);
      if (d) out.push(d);
    }
    return out;
  }

  private metadata(): A.Metadata[] {
    const meta: A.Metadata[] = [];
    while (this.isP("[") && this.peek(1).k === "id" && /^[A-Z]/.test(this.peek(1).v) && (this.isP("(", 2) || this.isP("]", 2))) {
      const start = this.next();
      const name = this.ident();
      const args: A.Metadata["args"] = [];
      if (this.eat("(")) {
        while (!this.isP(")")) {
          let key: string | undefined;
          if (this.peek().k === "id" && this.isP("=", 1)) {
            key = this.ident();
            this.next();
          }
          const v = this.next();
          args.push({ key, value: v.k === "str" ? unquote(v.v) : v.v });
          if (!this.eat(",")) break;
        }
        this.expect(")");
      }
      const end = this.expect("]");
      meta.push({ name, args, raw: this.src.slice(start.pos, end.pos + 1) });
    }
    return meta;
  }

  private directive(ctx: "pkg" | "class"): A.Directive | null {
    const first = this.peek();
    const meta = this.metadata();
    const attrs: A.Attrs = { meta };
    // attributes
    while (true) {
      const t = this.peek();
      if (t.k !== "id") break;
      if (MODIFIERS.has(t.v) && (this.peek(1).k === "id")) {
        this.i++;
        if (t.v === "public" || t.v === "private" || t.v === "protected" || t.v === "internal") attrs.access = t.v;
        else if (t.v === "static") attrs.isStatic = true;
        else if (t.v === "override") attrs.isOverride = true;
        else if (t.v === "final") attrs.isFinal = true;
        else if (t.v === "dynamic") attrs.isDynamic = true;
        else if (t.v === "native") attrs.isNative = true;
        continue;
      }
      // custom namespace attribute, e.g. `renderer_friend var x`
      const n1 = this.peek(1);
      if (!DEF_KEYWORDS.has(t.v) && !MODIFIERS.has(t.v) && n1.k === "id" && (DEF_KEYWORDS.has(n1.v) || MODIFIERS.has(n1.v)) && !n1.nl) {
        this.i++;
        attrs.ns = t.v;
        continue;
      }
      break;
    }
    const t = this.peek();
    const b = this.base(first);
    if (t.k === "id") {
      switch (t.v) {
        case "import": {
          this.next();
          let name = this.ident();
          while (this.eat(".")) {
            if (this.eat("*")) { name += ".*"; break; }
            name += "." + this.ident();
          }
          this.semi();
          return { ...b, type: "Import", name };
        }
        case "use": {
          if (this.is("namespace", 1)) {
            this.next(); this.next();
            const name = this.qname();
            this.semi();
            return { ...b, type: "UseNamespace", name };
          }
          break;
        }
        case "include": {
          if (this.peek(1).k === "str") { this.next(); this.next(); this.semi(); return null; }
          break;
        }
        case "class": return this.classDef(b, attrs);
        case "interface": return this.interfaceDef(b, attrs);
        case "function": return this.functionDef(b, attrs, ctx === "class");
        case "var":
        case "const": {
          const v = this.varDef(b, attrs, false);
          this.semi();
          return v;
        }
        case "namespace": {
          if (this.peek(1).k === "id") {
            this.next();
            const name = this.ident();
            let value: string | undefined;
            if (this.eat("=")) value = unquote(this.next().v);
            this.semi();
            return { ...b, type: "NamespaceDef", name, attrs, value };
          }
          break;
        }
      }
    }
    if (meta.length && ctx === "class") {
      // metadata attached to nothing we understand; ignore
    }
    return this.statement();
  }

  private classDef(b: A.NodeBase, attrs: A.Attrs): A.ClassDef {
    this.expect("class");
    const name = this.ident();
    let ext: string | undefined;
    const impl: string[] = [];
    if (this.eat("extends")) ext = this.qname();
    if (this.eat("implements")) {
      do impl.push(this.qname()); while (this.eat(","));
    }
    this.expect("{");
    const members = this.directives("class");
    this.expect("}");
    return { ...b, type: "Class", name, attrs, extends: ext, implements: impl, members };
  }

  private interfaceDef(b: A.NodeBase, attrs: A.Attrs): A.InterfaceDef {
    this.expect("interface");
    const name = this.ident();
    const ext: string[] = [];
    if (this.eat("extends")) {
      do ext.push(this.qname()); while (this.eat(","));
    }
    this.expect("{");
    const members: A.FunctionDef[] = [];
    while (!this.isP("}")) {
      const first = this.peek();
      const meta = this.metadata();
      const fb = this.base(first);
      this.expect("function");
      const f = this.functionRest(fb, { meta }, true);
      members.push(f);
    }
    this.expect("}");
    return { ...b, type: "Interface", name, attrs, extends: ext, members };
  }

  private functionDef(b: A.NodeBase, attrs: A.Attrs, _inClass: boolean): A.FunctionDef {
    this.expect("function");
    return this.functionRest(b, attrs, false);
  }

  private functionRest(b: A.NodeBase, attrs: A.Attrs, sigOnly: boolean): A.FunctionDef {
    let accessor: "get" | "set" | undefined;
    if ((this.is("get") || this.is("set")) && this.peek(1).k === "id" && !this.isP("(", 1)) {
      accessor = this.next().v as "get" | "set";
    }
    const name = this.ident();
    const params = this.params();
    let ret: A.TypeExpr | undefined;
    if (this.eat(":")) ret = this.typeExpr();
    let body: A.Statement[] | undefined;
    let bodyEnd: number | undefined;
    if (!sigOnly && this.isP("{")) {
      this.next();
      body = this.statements();
      bodyEnd = this.expect("}").pos;
    } else this.semi();
    return { ...b, type: "Function", name, attrs, accessor, params, ret, body, bodyEnd };
  }

  private params(): A.Param[] {
    this.expect("(");
    const ps: A.Param[] = [];
    while (!this.isP(")")) {
      const pos = this.peek().pos;
      if (this.eat("...")) {
        const name = this.ident();
        let type: A.TypeExpr | undefined;
        if (this.eat(":")) type = this.typeExpr();
        ps.push({ name, type, rest: true, pos });
      } else {
        const name = this.ident();
        let type: A.TypeExpr | undefined;
        let init: A.Expr | undefined;
        if (this.eat(":")) type = this.typeExpr();
        if (this.eat("=")) init = this.assign(false);
        ps.push({ name, type, init, pos });
      }
      if (!this.eat(",")) break;
    }
    this.expect(")");
    return ps;
  }

  typeExpr(): A.TypeExpr {
    if (this.eat("*")) return { name: "*" };
    let name = this.ident();
    while (this.isP(".") && this.peek(1).k === "id") {
      this.i++;
      name += "." + this.ident();
    }
    if (this.eat(".<")) {
      const param = this.typeExpr();
      this.expectGt();
      return { name, param };
    }
    return { name };
  }

  private varDef(b: A.NodeBase, attrs: A.Attrs, noIn: boolean): A.VarDef {
    const kind = this.next().v as "var" | "const";
    const decls: A.VarDeclarator[] = [];
    do {
      const pos = this.peek().pos;
      const name = this.ident();
      let vtype: A.TypeExpr | undefined;
      let init: A.Expr | undefined;
      if (this.eat(":")) vtype = this.typeExpr();
      if (this.eat("=")) init = this.assign(noIn);
      decls.push({ name, vtype, init, pos });
    } while (this.eat(","));
    return { ...b, type: "Var", kind, attrs, decls };
  }

  // ------------------------------------------------------------ statements
  private statements(): A.Statement[] {
    const out: A.Statement[] = [];
    while (!this.isP("}") && this.peek().k !== "eof") out.push(this.statement());
    return out;
  }

  private block(): A.Block {
    const t = this.expect("{");
    const body = this.statements();
    this.expect("}");
    return { ...this.base(t), type: "Block", body };
  }

  private statement(): A.Statement {
    const t = this.peek();
    const b = this.base(t);
    if (t.k === "p") {
      if (t.v === "{") return this.block();
      if (t.v === ";") { this.next(); return { ...b, type: "Empty" }; }
    }
    if (t.k === "id") {
      switch (t.v) {
        case "var":
        case "const": {
          const v = this.varDef(b, { meta: [] }, false);
          this.semi();
          return v;
        }
        case "function":
          if (this.peek(1).k === "id") return this.functionDef(b, { meta: [] }, false);
          break;
        case "if": {
          this.next();
          this.expect("(");
          const test = this.expr();
          this.expect(")");
          const then = this.statement();
          let els: A.Statement | undefined;
          if (this.eat("else")) els = this.statement();
          return { ...b, type: "If", test, then, else: els };
        }
        case "for": return this.forStmt(b);
        case "while": {
          this.next();
          this.expect("(");
          const test = this.expr();
          this.expect(")");
          return { ...b, type: "While", test, body: this.statement() };
        }
        case "do": {
          this.next();
          const body = this.statement();
          this.expect("while");
          this.expect("(");
          const test = this.expr();
          this.expect(")");
          this.semi();
          return { ...b, type: "DoWhile", test, body };
        }
        case "switch": return this.switchStmt(b);
        case "return": {
          this.next();
          let arg: A.Expr | undefined;
          if (!this.isP(";") && !this.isP("}") && !this.peek().nl) arg = this.expr();
          this.semi();
          return { ...b, type: "Return", arg };
        }
        case "break":
        case "continue": {
          this.next();
          let label: string | undefined;
          if (this.peek().k === "id" && !this.peek().nl) label = this.ident();
          this.semi();
          return t.v === "break" ? { ...b, type: "Break", label } : { ...b, type: "Continue", label };
        }
        case "throw": {
          this.next();
          const arg = this.expr();
          this.semi();
          return { ...b, type: "Throw", arg };
        }
        case "try": return this.tryStmt(b);
        case "use":
          if (this.is("namespace", 1)) {
            this.next(); this.next();
            const name = this.qname();
            this.semi();
            return { ...b, type: "UseNamespace", name };
          }
          break;
      }
      // label
      if (this.isP(":", 1) && !["default", "case"].includes(t.v)) {
        this.next();
        this.next();
        return { ...b, type: "Labeled", label: t.v, body: this.statement() };
      }
    }
    const expr = this.expr();
    this.semi();
    return { ...b, type: "ExprStmt", expr };
  }

  private forStmt(b: A.NodeBase): A.Statement {
    this.expect("for");
    let each = false;
    if (this.is("each")) { this.next(); each = true; }
    this.expect("(");
    let init: A.VarDef | A.Expr | undefined;
    if (!this.isP(";")) {
      if (this.is("var") || this.is("const")) init = this.varDef(this.base(this.peek()), { meta: [] }, true);
      else init = this.expr(true);
    }
    if (this.eat("in")) {
      const right = this.expr();
      this.expect(")");
      const body = this.statement();
      return { ...b, type: "ForIn", each, left: init!, right, body };
    }
    if (each) this.fail("expected 'in' in for each");
    this.expect(";");
    const test = this.isP(";") ? undefined : this.expr();
    this.expect(";");
    const update = this.isP(")") ? undefined : this.expr();
    this.expect(")");
    const body = this.statement();
    return { ...b, type: "For", init, test, update, body };
  }

  private switchStmt(b: A.NodeBase): A.Switch {
    this.expect("switch");
    this.expect("(");
    const disc = this.expr();
    this.expect(")");
    this.expect("{");
    const cases: A.SwitchCase[] = [];
    while (!this.isP("}")) {
      const ct = this.peek();
      let test: A.Expr | undefined;
      if (this.eat("case")) test = this.expr();
      else this.expect("default");
      this.expect(":");
      const body: A.Statement[] = [];
      while (!this.is("case") && !(this.is("default") && this.isP(":", 1)) && !this.isP("}")) body.push(this.statement());
      cases.push({ ...this.base(ct), test, body });
    }
    this.expect("}");
    return { ...b, type: "Switch", disc, cases };
  }

  private tryStmt(b: A.NodeBase): A.Try {
    this.expect("try");
    const block = this.block();
    const handlers: A.CatchClause[] = [];
    while (this.is("catch")) {
      const pos = this.next().pos;
      this.expect("(");
      const param = this.ident();
      let ptype: A.TypeExpr | undefined;
      if (this.eat(":")) ptype = this.typeExpr();
      this.expect(")");
      handlers.push({ param, ptype, body: this.block(), pos });
    }
    let finalizer: A.Block | undefined;
    if (this.eat("finally")) finalizer = this.block();
    return { ...b, type: "Try", block, handlers, finalizer };
  }

  // ------------------------------------------------------------ expressions
  expr(noIn = false): A.Expr {
    const t = this.peek();
    const first = this.assign(noIn);
    if (!this.isP(",")) return first;
    const exprs = [first];
    while (this.eat(",")) exprs.push(this.assign(noIn));
    return { ...this.base(t), type: "Seq", exprs };
  }

  private assign(noIn: boolean): A.Expr {
    const t = this.peek();
    const left = this.cond(noIn);
    const op = this.peek();
    if (op.k === "p" && ASSIGN_OPS.has(op.v)) {
      this.next();
      const value = this.assign(noIn);
      return { ...this.base(t), type: "Assign", op: op.v, target: left, value };
    }
    return left;
  }

  private cond(noIn: boolean): A.Expr {
    const t = this.peek();
    const test = this.binary(1, noIn);
    if (!this.eat("?")) return test;
    const then = this.assign(false);
    this.expect(":");
    const els = this.assign(noIn);
    return { ...this.base(t), type: "Cond", test, then, else: els };
  }

  private binary(minPrec: number, noIn: boolean): A.Expr {
    const t = this.peek();
    let left = this.unary();
    while (true) {
      const op = this.peek();
      if (op.k !== "p" && op.k !== "id") break;
      const prec = BIN_PREC[op.v];
      if (prec === undefined || prec < minPrec) break;
      if (op.k === "id" && !["instanceof", "is", "as", "in"].includes(op.v)) break;
      if (noIn && op.v === "in") break;
      this.next();
      const right = this.binary(prec + 1, noIn);
      if (op.v === "&&" || op.v === "||") left = { ...this.base(t), type: "Logical", op: op.v, left, right };
      else left = { ...this.base(t), type: "Binary", op: op.v, left, right };
    }
    return left;
  }

  private unary(): A.Expr {
    const t = this.peek();
    if (t.k === "p" && (t.v === "!" || t.v === "~" || t.v === "+" || t.v === "-")) {
      this.next();
      return { ...this.base(t), type: "Unary", op: t.v, arg: this.unary() };
    }
    if (t.k === "p" && (t.v === "++" || t.v === "--")) {
      this.next();
      return { ...this.base(t), type: "Update", op: t.v, prefix: true, arg: this.unary() };
    }
    if (t.k === "id" && (t.v === "typeof" || t.v === "void" || t.v === "delete")) {
      this.next();
      return { ...this.base(t), type: "Unary", op: t.v, arg: this.unary() };
    }
    const e = this.lhs();
    const p = this.peek();
    if (p.k === "p" && (p.v === "++" || p.v === "--") && !p.nl) {
      this.next();
      return { ...this.base(t), type: "Update", op: p.v, prefix: false, arg: e };
    }
    return e;
  }

  private args(): A.Expr[] {
    this.expect("(");
    const args: A.Expr[] = [];
    while (!this.isP(")")) {
      args.push(this.assign(false));
      if (!this.eat(",")) break;
    }
    this.expect(")");
    return args;
  }

  private lhs(): A.Expr {
    const t = this.peek();
    let e: A.Expr;
    if (this.is("new")) e = this.newExpr();
    else e = this.primary();
    return this.suffixes(e, t, true);
  }

  private suffixes(e: A.Expr, t: Token, allowCall: boolean): A.Expr {
    while (true) {
      const p = this.peek();
      if (p.k !== "p") break;
      if (p.v === ".") {
        this.next();
        if (this.eat("@")) {
          if (this.eat("*")) e = { ...this.base(t), type: "Attr", obj: e, name: "*" };
          else e = { ...this.base(t), type: "Attr", obj: e, name: this.ident() };
        } else if (this.isP("(")) {
          this.next();
          const pred = this.expr();
          this.expect(")");
          e = { ...this.base(t), type: "Filter", obj: e, pred };
        } else {
          const name = this.ident();
          if (this.eat("::")) {
            e = { ...this.base(t), type: "Member", obj: e, name: this.ident(), ns: name };
          } else e = { ...this.base(t), type: "Member", obj: e, name };
        }
        continue;
      }
      if (p.v === ".<") {
        this.next();
        const param = this.typeExpr();
        this.expectGt();
        e = { ...this.base(t), type: "TypeApp", base: e, param };
        continue;
      }
      if (p.v === "..") {
        this.next();
        e = { ...this.base(t), type: "Descendants", obj: e, name: this.ident() };
        continue;
      }
      if (p.v === "[") {
        this.next();
        const index = this.expr();
        this.expect("]");
        e = { ...this.base(t), type: "Index", obj: e, index };
        continue;
      }
      if (p.v === "(" && allowCall) {
        e = { ...this.base(t), type: "Call", callee: e, args: this.args() };
        continue;
      }
      break;
    }
    return e;
  }

  private newExpr(): A.Expr {
    const t = this.expect("new");
    if (this.isP("<")) {
      this.next();
      const elemType = this.typeExpr();
      this.expectGt();
      this.expect("[");
      const elements: A.Expr[] = [];
      while (!this.isP("]")) {
        elements.push(this.assign(false));
        if (!this.eat(",")) break;
      }
      this.expect("]");
      return { ...this.base(t), type: "VectorLit", elemType, elements };
    }
    let callee: A.Expr;
    const ct = this.peek();
    if (this.is("new")) callee = this.newExpr();
    else callee = this.primary();
    callee = this.suffixes(callee, ct, false);
    const args = this.isP("(") ? this.args() : [];
    return { ...this.base(t), type: "New", callee, args };
  }

  private primary(): A.Expr {
    const t = this.peek();
    const b = this.base(t);
    switch (t.k) {
      case "num": {
        this.next();
        return { ...b, type: "Literal", kind: "num", raw: t.v, value: Number(t.v) };
      }
      case "str": {
        this.next();
        return { ...b, type: "Literal", kind: "str", raw: t.v, value: unquote(t.v) };
      }
      case "regex": {
        this.next();
        return { ...b, type: "Literal", kind: "regex", raw: t.v };
      }
      case "xml": {
        this.next();
        return { ...b, type: "Xml", raw: t.v };
      }
      case "id": {
        switch (t.v) {
          case "this": this.next(); return { ...b, type: "This" };
          case "super": this.next(); return { ...b, type: "Super" };
          case "true":
          case "false": this.next(); return { ...b, type: "Literal", kind: "bool", raw: t.v, value: t.v === "true" };
          case "null": this.next(); return { ...b, type: "Literal", kind: "null", raw: "null", value: null };
          case "function": return this.funcExpr();
        }
        this.next();
        if (this.eat("::")) {
          const name = this.ident();
          return { ...b, type: "Ident", name, ns: t.v };
        }
        return { ...b, type: "Ident", name: t.v };
      }
      case "p": {
        if (t.v === "(") {
          this.next();
          const expr = this.expr();
          this.expect(")");
          return { ...b, type: "Paren", expr };
        }
        if (t.v === "[") return this.arrayLit();
        if (t.v === "{") return this.objectLit();
        if (t.v === "@") {
          this.next();
          const name = this.eat("*") ? "*" : this.ident();
          return { ...b, type: "Attr", obj: { ...b, type: "Ident", name: "@@node" }, name };
        }
        break;
      }
    }
    this.fail("unexpected token in expression");
  }

  private funcExpr(): A.FuncExpr {
    const t = this.expect("function");
    let name: string | undefined;
    if (this.peek().k === "id") name = this.ident();
    const params = this.params();
    let ret: A.TypeExpr | undefined;
    if (this.eat(":")) ret = this.typeExpr();
    this.expect("{");
    const body = this.statements();
    this.expect("}");
    return { ...this.base(t), type: "FuncExpr", name, params, ret, body };
  }

  private arrayLit(): A.ArrayLit {
    const t = this.expect("[");
    const elements: (A.Expr | null)[] = [];
    while (!this.isP("]")) {
      if (this.isP(",")) { this.next(); elements.push(null); continue; }
      elements.push(this.assign(false));
      if (!this.eat(",")) break;
    }
    this.expect("]");
    return { ...this.base(t), type: "Array", elements };
  }

  private objectLit(): A.ObjectLit {
    const t = this.expect("{");
    const props: A.Prop[] = [];
    while (!this.isP("}")) {
      const k = this.next();
      let keyKind: A.Prop["keyKind"];
      let key: string;
      if (k.k === "id") { keyKind = "id"; key = k.v; }
      else if (k.k === "str") { keyKind = "str"; key = unquote(k.v); }
      else if (k.k === "num") { keyKind = "num"; key = k.v; }
      else this.fail("bad object key", k);
      this.expect(":");
      props.push({ key, keyKind, value: this.assign(false), pos: k.pos });
      if (!this.eat(",")) break;
    }
    this.expect("}");
    return { ...this.base(t), type: "Object", props };
  }
}

export function unquote(raw: string): string {
  const q = raw[0];
  if (q !== '"' && q !== "'") return raw;
  const body = raw.slice(1, -1);
  return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_m, e: string) => {
    switch (e[0]) {
      case "n": return "\n";
      case "t": return "\t";
      case "r": return "\r";
      case "b": return "\b";
      case "f": return "\f";
      case "v": return "\v";
      case "0": return "\0";
      case "u": return String.fromCharCode(parseInt(e.slice(1), 16));
      case "x": return String.fromCharCode(parseInt(e.slice(1), 16));
      default: return e;
    }
  });
}
