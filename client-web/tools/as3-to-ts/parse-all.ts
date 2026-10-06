import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { parse } from "./parser.ts";
const root = "/home/claude/bym/client/scripts";
const files = globSync("**/*.as", { cwd: root });
let ok = 0, fail = 0; const errs: string[] = [];
const t0 = Date.now();
for (const f of files) {
  try { parse(readFileSync(`${root}/${f}`, "utf8"), f); ok++; }
  catch (e: any) { fail++; errs.push(e.message); }
}
console.log(`parsed ${ok}/${files.length} in ${Date.now() - t0}ms, ${fail} failures`);
for (const e of errs.slice(0, 25)) console.log("  " + e);
