/**
 * as3-to-ts: converts client/scripts (AS3) into client-web/src/game (TypeScript).
 *
 * Re-runnable until the AS3 → TypeScript cutover; after cutover the generated
 * code is the source of truth and this tool is retired.
 *
 *   tsx tools/as3-to-ts/cli.ts [--src ../client/scripts] [--out src/game]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, globSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse } from "./parser.ts";
import { Program } from "./model.ts";
import { readSwfAbc, type ApiDb } from "./abc.ts";
import { FileEmitter, as3QName } from "./emit.ts";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const webRoot = resolve(here, "../..");
const srcDir = resolve(webRoot, opt("--src", "../client/scripts"));
// the document class (asconfig mainClass): the root of what the Flash compiler links
const mainClass = opt("--main", "GAME");
const outDir = resolve(webRoot, opt("--out", "src/game"));
const swcPath = resolve(webRoot, "../playerglobal.swc");

/** Reads library.swf out of the SWC (a zip) without external tools. */
function readSwcLibrary(path: string): Buffer {
  const zip = readFileSync(path);
  let eocd = zip.length - 22;
  while (eocd > 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const csize = zip.readUInt32LE(p + 20);
    const nlen = zip.readUInt16LE(p + 28), xlen = zip.readUInt16LE(p + 30), clen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nlen);
    if (name === "library.swf") {
      const lnlen = zip.readUInt16LE(local + 26), lxlen = zip.readUInt16LE(local + 28);
      const data = zip.subarray(local + 30 + lnlen + lxlen, local + 30 + lnlen + lxlen + csize);
      return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error("library.swf not found in " + path);
}

const t0 = Date.now();
const api: ApiDb = { classes: {}, globals: {} };
readSwfAbc(readSwcLibrary(swcPath), api);

const prog = new Program(api);
const files = globSync("**/*.as", { cwd: srcDir }).sort();
for (const f of files) prog.addFile(f.replace(/\\/g, "/"), parse(readFileSync(join(srcDir, f), "utf8"), f));
prog.link();

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

interface ModuleInfo { path: string; exports: { name: string; exportName: string; qname: string; isClass: boolean }[]; deps: Set<string>; refs: Set<string>; }
const modules = new Map<string, ModuleInfo>();
const moduleOfQ = new Map<string, string>();
let errors = 0;
const moduleOfExport = new Map<string, string>();
for (const fm of prog.files) {
  const modPath = fm.path.replace(/\.as$/, "");
  for (const c of fm.classes) { moduleOfQ.set(c.qname, modPath); moduleOfExport.set(c.exportName, modPath); }
  for (const g of fm.globals) { moduleOfQ.set(g.qname, modPath); moduleOfExport.set(g.exportName, modPath); }
}
for (const fm of prog.files) {
  const modPath = fm.path.replace(/\.as$/, "");
  const em = new FileEmitter(prog, fm);
  let code: string;
  try {
    code = em.emitFile();
  } catch (e: any) {
    errors++;
    prog.warn(`${fm.path}: EMIT FAILED ${e.stack}`);
    continue;
  }
  const outPath = join(outDir, modPath + ".ts");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, code);
  const deps = new Set<string>();
  for (const q of em.loadTimeRefs) { const m = moduleOfQ.get(q); if (m && m !== modPath) deps.add(m); }
  // Every module this one refers to anywhere (code and types): what mxmlc links along with it.
  const refs = new Set<string>();
  for (const [exportName] of (em as any).gameImports as Map<string, string>) { const m = moduleOfExport.get(exportName); if (m && m !== modPath) refs.add(m); }
  for (const c of fm.classes) {
    const types = [c.superQ, ...c.ifaces, ...[...c.inst.values(), ...c.stat.values()].flatMap((mb) => [mb.type, ...(mb.params ?? []).map((p) => p.type)]), ...c.ctorParams.map((p) => p.type)];
    for (const t of types) {
      const q = t?.startsWith("Vector.<") ? t.slice(8, -1) : t;
      const m = q ? moduleOfQ.get(q) : undefined;
      if (m && m !== modPath) refs.add(m);
    }
  }
  modules.set(modPath, {
    path: modPath, deps, refs,
    exports: [
      ...fm.classes.map((c) => ({ name: c.name, exportName: c.exportName, qname: c.qname, isClass: !c.isInterface })),
      ...fm.globals.filter((g) => g.kind !== "namespace").map((g) => ({ name: g.name, exportName: g.exportName, qname: g.qname, isClass: false })),
    ],
  });
}

// Load order: every module after the modules its load-time code depends on.
const order: string[] = [];
const state = new Map<string, number>();
const visit = (m: string, stack: string[]) => {
  const s = state.get(m);
  if (s === 2) return;
  if (s === 1) { prog.warn(`load-order cycle: ${[...stack.slice(stack.indexOf(m)), m].join(" -> ")}`); return; }
  state.set(m, 1);
  for (const d of [...modules.get(m)!.deps].sort()) if (modules.has(d)) visit(d, [...stack, m]);
  state.set(m, 2);
  order.push(m);
};
for (const m of [...modules.keys()].sort()) visit(m, []);

// Hand-written replacements for modules that cannot work as converted (see DEVIATIONS.md).
const overridesDir = resolve(here, "overrides");
if (existsSync(overridesDir)) {
  for (const f of globSync("**/*.ts", { cwd: overridesDir })) {
    const dest = join(outDir, f);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(join(overridesDir, f)));
    console.log(`override: ${f}`);
  }
}

const barrel = [
  "// Load-ordered barrel for the converted game code.",
  "// Every game module imports from \"@game\" (this file), so evaluation order is exactly",
  "// the order below: supertypes and static-initialiser dependencies come first.",
  "// New modules must be added after everything their top-level code references.",
  "",
  ...order.map((m) => {
    const ex = modules.get(m)!.exports.map((e) => (e.name === e.exportName ? e.name : `${e.name} as ${e.exportName}`));
    return `export { ${ex.join(", ")} } from "./${m}";`;
  }),
  "",
];
writeFileSync(join(outDir, "index.ts"), barrel.join("\n"));

// What the Flash compiler (mxmlc) would link: everything reachable through references from the main
// class. A class nothing refers to is left out of the SWF, so in Flash its symbol in the artwork is a
// plain MovieClip (e.g. the top bar's spinner, whose own rotation code therefore never runs) and
// getDefinitionByName cannot find it. The registry lists only linked classes, to behave the same.
const mainModule = [...modules.keys()].find((m) => m === mainClass) ?? mainClass;
const linked = new Set<string>();
const stackL = [mainModule];
while (stackL.length) {
  const m = stackL.pop()!;
  if (linked.has(m) || !modules.has(m)) continue;
  linked.add(m);
  for (const r of modules.get(m)!.refs) stackL.push(r);
}
const unlinkedSymbols = [...modules.values()].filter((mi) => !linked.has(mi.path)).flatMap((mi) => mi.exports.filter((e) => e.isClass && prog.classes.get(e.qname)?.def && /\[Embed\(/.test(readFileSync(join(srcDir, mi.path + ".as"), "utf8"))).map((e) => e.qname));
writeFileSync(join(webRoot, "tools/as3-to-ts/last-run-unlinked.txt"), `Classes bound to library symbols but not referenced from ${mainClass} (not in the Flash SWF, so their symbols stay plain MovieClips):\n${unlinkedSymbols.sort().join("\n")}\n`);

const reg = [
  "// AS3 qualified class names, used by getQualifiedClassName / getDefinitionByName.",
  "// Only classes the Flash compiler would link (reachable from the main class) are listed.",
  'import { registerClasses } from "as3";',
  'import * as G from "./index";',
  "",
  "registerClasses({",
  ...order.filter((m) => linked.has(m) || process.argv.includes("--link-all")).flatMap((m) => modules.get(m)!.exports.filter((e) => e.isClass || prog.classes.get(e.qname)?.isInterface).map((e) => `    ${JSON.stringify(as3QName(e.qname))}: G.${e.exportName},`)),
  "});",
  "",
];
writeFileSync(join(outDir, "registry.ts"), reg.join("\n"));

const warnFile = join(webRoot, "tools/as3-to-ts/last-run-warnings.txt");
writeFileSync(warnFile, prog.warnings.join("\n") + "\n");
const kinds = new Map<string, number>();
for (const w of prog.warnings) { const k = w.replace(/^[^:]+(@\d+)?: /, "").replace(/ [\w.$:<>]+$/, "").slice(0, 60); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
console.log(`converted ${modules.size}/${prog.files.length} files in ${Date.now() - t0}ms, ${errors} failures, ${prog.warnings.length} warnings (${relative(webRoot, warnFile)})`);
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(5)}  ${k}`);
