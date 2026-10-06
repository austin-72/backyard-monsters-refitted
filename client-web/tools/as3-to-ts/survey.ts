import { readFileSync, globSync } from "node:fs";
import { parse } from "./parser.ts";
import type * as A from "./ast.ts";
const root = "/home/claude/bym/client/scripts";
const files = globSync("**/*.as", { cwd: root });
const byName = new Map<string, string[]>();
const classes = new Map<string, { def: A.ClassDef; pkg: string }>();
let outside = 0, classStmts = 0, staticInits = 0, nonTrivialStatic: string[] = [];
const isConst = (e?: A.Expr): boolean => !e || e.type === "Literal" || (e.type === "Unary" && e.op === "-" && e.arg.type === "Literal") || (e.type==="Array" && e.elements.length===0) || (e.type==="Object" && e.props.length===0);
for (const f of files) {
  const p = parse(readFileSync(`${root}/${f}`, "utf8"), f);
  if (p.outside.length) outside++;
  for (const d of p.body) {
    if (d.type === "Class" || d.type === "Interface" || d.type === "Function" || d.type === "Var") {
      const name = d.type === "Var" ? d.decls[0].name : (d as any).name;
      const q = (p.pkg ? p.pkg + "." : "") + name;
      byName.set(name, [...(byName.get(name) ?? []), q]);
      if (d.type === "Class") {
        classes.set(q, { def: d, pkg: p.pkg });
        for (const m of d.members) {
          if (m.type !== "Var" && m.type !== "Function" && m.type !== "Import" && m.type !== "UseNamespace" && m.type !== "NamespaceDef") classStmts++;
          if (m.type === "Var" && m.attrs.isStatic) for (const dc of m.decls) { staticInits++; if (!isConst(dc.init)) nonTrivialStatic.push(`${q}.${dc.name}`); }
        }
      }
    }
  }
}
const dups = [...byName].filter(([, v]) => v.length > 1);
console.log("files with directives outside package:", outside, "| class-body statements:", classStmts);
console.log("duplicate simple names:", dups.length, dups.slice(0, 12).map(([k, v]) => `${k}=[${v.join(",")}]`).join("\n  "));
console.log("static field initializers:", staticInits, "non-constant:", nonTrivialStatic.length);
// private collisions
const resolve = (name: string | undefined, pkg: string) => { if (!name) return undefined; if (classes.has(name)) return name; const q = (pkg ? pkg + "." : "") + name; if (classes.has(q)) return q; const c = byName.get(name); return c?.find(x => classes.has(x)); };
const members = (q: string) => new Set(classes.get(q)!.def.members.flatMap(m => m.type === "Var" ? (m.attrs.isStatic ? [] : m.decls.map(d => d.name)) : m.type === "Function" && !m.attrs.isStatic ? [m.name] : []));
let coll: string[] = [];
for (const [q, { def, pkg }] of classes) {
  let s = resolve(def.extends, pkg);
  const privs = def.members.flatMap(m => (m.type === "Var" && !m.attrs.isStatic && m.attrs.access === "private") ? m.decls.map(d => d.name) : (m.type === "Function" && !m.attrs.isStatic && m.attrs.access === "private") ? [m.name] : []);
  const seen = new Set<string>();
  while (s) { const ms = members(s); for (const p of privs) if (ms.has(p) && !seen.has(p)) { seen.add(p); coll.push(`${q}.${p} vs ${s}`); } s = resolve(classes.get(s)!.def.extends, classes.get(s)!.pkg); }
}
console.log("private members colliding with an ancestor's member:", coll.length); console.log("  " + coll.slice(0, 8).join("\n  "));
console.log("static names clashing with Function props:", [...classes].flatMap(([q, { def }]) => def.members.flatMap(m => (m.type==="Var"||m.type==="Function") && m.attrs.isStatic && ["name","length","caller","arguments","prototype"].includes(m.type==="Var"? m.decls[0].name : m.name) ? [q] : [])).join(","));
