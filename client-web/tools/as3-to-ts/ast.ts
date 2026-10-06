/**
 * AST for the subset of ActionScript 3 used by the Backyard Monsters client.
 * Every node carries `pos` (source offset) and optionally the comments that
 * preceded it, so they can be re-emitted.
 */

export interface NodeBase {
  pos: number;
  comments?: string[];
  blank?: boolean;
}

// ---------------------------------------------------------------- types

export interface TypeExpr {
  /** Dotted name as written, e.g. "int", "flash.display.MovieClip", "*", "void". */
  name: string;
  /** Element type for Vector.<T>. */
  param?: TypeExpr;
}

// ---------------------------------------------------------------- program

export interface Program {
  file: string;
  pkg: string;
  /** Directives inside `package { }`. */
  body: Directive[];
  /** File-private directives after the package block. */
  outside: Directive[];
}

export type Directive =
  | ImportDirective
  | UseNamespaceDirective
  | ClassDef
  | InterfaceDef
  | FunctionDef
  | VarDef
  | NamespaceDef
  | Statement;

export interface ImportDirective extends NodeBase {
  type: "Import";
  name: string; // e.g. "flash.display.*"
}

export interface UseNamespaceDirective extends NodeBase {
  type: "UseNamespace";
  name: string;
}

export interface NamespaceDef extends NodeBase {
  type: "NamespaceDef";
  name: string;
  attrs: Attrs;
  value?: string;
}

export interface Metadata {
  name: string;
  args: { key?: string; value: string }[];
  raw: string;
}

export interface Attrs {
  access?: "public" | "private" | "protected" | "internal";
  /** Custom namespace used as access modifier (e.g. renderer_friend). */
  ns?: string;
  isStatic?: boolean;
  isOverride?: boolean;
  isFinal?: boolean;
  isDynamic?: boolean;
  isNative?: boolean;
  meta: Metadata[];
}

export interface ClassDef extends NodeBase {
  type: "Class";
  name: string;
  attrs: Attrs;
  extends?: string;
  implements: string[];
  members: Directive[];
}

export interface InterfaceDef extends NodeBase {
  type: "Interface";
  name: string;
  attrs: Attrs;
  extends: string[];
  members: FunctionDef[];
}

export interface Param {
  name: string;
  type?: TypeExpr;
  init?: Expr;
  rest?: boolean;
  pos: number;
}

export interface FunctionDef extends NodeBase {
  type: "Function";
  name: string;
  attrs: Attrs;
  accessor?: "get" | "set";
  params: Param[];
  ret?: TypeExpr;
  body?: Statement[]; // undefined for interface members / native
  bodyEnd?: number;
}

export interface VarDeclarator {
  name: string;
  vtype?: TypeExpr;
  init?: Expr;
  pos: number;
}

export interface VarDef extends NodeBase {
  type: "Var";
  kind: "var" | "const";
  attrs: Attrs;
  decls: VarDeclarator[];
}

// ---------------------------------------------------------------- statements

export type Statement =
  | Block
  | ExprStmt
  | VarDef
  | FunctionDef
  | If
  | For
  | ForIn
  | While
  | DoWhile
  | Switch
  | Return
  | Break
  | Continue
  | Throw
  | Try
  | Labeled
  | Empty
  | UseNamespaceDirective;

export interface Block extends NodeBase { type: "Block"; body: Statement[]; }
export interface ExprStmt extends NodeBase { type: "ExprStmt"; expr: Expr; }
export interface If extends NodeBase { type: "If"; test: Expr; then: Statement; else?: Statement; }
export interface For extends NodeBase { type: "For"; init?: VarDef | Expr; test?: Expr; update?: Expr; body: Statement; }
export interface ForIn extends NodeBase {
  type: "ForIn";
  each: boolean;
  /** Either a declaration (`var x:T`) or an assignable expression. */
  left: VarDef | Expr;
  right: Expr;
  body: Statement;
}
export interface While extends NodeBase { type: "While"; test: Expr; body: Statement; }
export interface DoWhile extends NodeBase { type: "DoWhile"; test: Expr; body: Statement; }
export interface SwitchCase extends NodeBase { test?: Expr; body: Statement[]; }
export interface Switch extends NodeBase { type: "Switch"; disc: Expr; cases: SwitchCase[]; }
export interface Return extends NodeBase { type: "Return"; arg?: Expr; }
export interface Break extends NodeBase { type: "Break"; label?: string; }
export interface Continue extends NodeBase { type: "Continue"; label?: string; }
export interface Throw extends NodeBase { type: "Throw"; arg: Expr; }
export interface CatchClause { param: string; ptype?: TypeExpr; body: Block; pos: number; }
export interface Try extends NodeBase { type: "Try"; block: Block; handlers: CatchClause[]; finalizer?: Block; }
export interface Labeled extends NodeBase { type: "Labeled"; label: string; body: Statement; }
export interface Empty extends NodeBase { type: "Empty"; }

// ---------------------------------------------------------------- expressions

export type Expr =
  | Ident
  | Literal
  | ArrayLit
  | ObjectLit
  | FuncExpr
  | Member
  | Index
  | Call
  | New
  | Unary
  | Update
  | Binary
  | Logical
  | Assign
  | Cond
  | Seq
  | This
  | Super
  | VectorLit
  | TypeApp
  | XmlLit
  | Attr
  | Descendants
  | Filter
  | Paren;

export interface Ident extends NodeBase { type: "Ident"; name: string; ns?: string; }
export interface Literal extends NodeBase {
  type: "Literal";
  kind: "num" | "str" | "bool" | "null" | "regex";
  raw: string;
  value?: unknown;
}
export interface ArrayLit extends NodeBase { type: "Array"; elements: (Expr | null)[]; }
export interface Prop { key: string; keyKind: "id" | "str" | "num"; value: Expr; pos: number; }
export interface ObjectLit extends NodeBase { type: "Object"; props: Prop[]; }
export interface FuncExpr extends NodeBase {
  type: "FuncExpr";
  name?: string;
  params: Param[];
  ret?: TypeExpr;
  body: Statement[];
}
export interface Member extends NodeBase { type: "Member"; obj: Expr; name: string; ns?: string; }
export interface Index extends NodeBase { type: "Index"; obj: Expr; index: Expr; }
export interface Call extends NodeBase { type: "Call"; callee: Expr; args: Expr[]; }
export interface New extends NodeBase { type: "New"; callee: Expr; args: Expr[]; }
export interface Unary extends NodeBase { type: "Unary"; op: string; arg: Expr; }
export interface Update extends NodeBase { type: "Update"; op: "++" | "--"; prefix: boolean; arg: Expr; }
export interface Binary extends NodeBase { type: "Binary"; op: string; left: Expr; right: Expr; }
export interface Logical extends NodeBase { type: "Logical"; op: "&&" | "||"; left: Expr; right: Expr; }
export interface Assign extends NodeBase { type: "Assign"; op: string; target: Expr; value: Expr; }
export interface Cond extends NodeBase { type: "Cond"; test: Expr; then: Expr; else: Expr; }
export interface Seq extends NodeBase { type: "Seq"; exprs: Expr[]; }
export interface This extends NodeBase { type: "This"; }
export interface Super extends NodeBase { type: "Super"; }
export interface VectorLit extends NodeBase { type: "VectorLit"; elemType: TypeExpr; elements: Expr[]; }
/** `Vector.<T>` used as a value (e.g. `new Vector.<int>()` or `Vector.<int>(arr)`). */
export interface TypeApp extends NodeBase { type: "TypeApp"; base: Expr; param: TypeExpr; }
export interface XmlLit extends NodeBase { type: "Xml"; raw: string; }
/** E4X attribute access `obj.@name` (name "*" for all attributes). */
export interface Attr extends NodeBase { type: "Attr"; obj: Expr; name: string; }
/** E4X descendants `obj..name`. */
export interface Descendants extends NodeBase { type: "Descendants"; obj: Expr; name: string; }
/** E4X filter `obj.(expr)`. */
export interface Filter extends NodeBase { type: "Filter"; obj: Expr; pred: Expr; }
export interface Paren extends NodeBase { type: "Paren"; expr: Expr; }
