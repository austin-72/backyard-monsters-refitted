/** Generates src/flash/_constants.ts: static constant values of every flash.* class, read from playerglobal.swc. */
import { writeFileSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { readSwfAbc, type ApiDb } from "./abc.ts";
const zip = readFileSync(new URL("../../../playerglobal.swc", import.meta.url));
let eocd = zip.length - 22; while (zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
let p = zip.readUInt32LE(eocd + 16); let lib: Buffer | undefined;
for (let i = 0; i < zip.readUInt16LE(eocd + 10); i++) {
  const nlen = zip.readUInt16LE(p + 28), xlen = zip.readUInt16LE(p + 30), clen = zip.readUInt16LE(p + 32), local = zip.readUInt32LE(p + 42);
  if (zip.toString("utf8", p + 46, p + 46 + nlen) === "library.swf") { const o = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28); lib = inflateRawSync(zip.subarray(o, o + zip.readUInt32LE(p + 20))); }
  p += 46 + nlen + xlen + clen;
}
const db: ApiDb = { classes: {}, globals: {} }; readSwfAbc(lib!, db);
const out: string[] = ["// Generated from playerglobal.swc by tools/as3-to-ts/gen-constants.ts. Do not edit.", "export const FLASH_CONSTANTS: Record<string, Record<string, unknown>> = {"];
for (const [q, c] of Object.entries(db.classes).sort()) {
  if (!q.startsWith("flash.")) continue;
  const consts = Object.entries(c.stat).filter(([, m]) => m.kind === "const" && m.value !== undefined);
  if (consts.length) out.push(`    ${JSON.stringify(q)}: { ${consts.map(([n, m]) => `${n}: ${typeof m.value === "number" && !isFinite(m.value) ? String(m.value) : JSON.stringify(m.value)}`).join(", ")} },`);
}
out.push("};", "");
writeFileSync(new URL("../../src/flash/_constants.ts", import.meta.url), out.join("\n"));
console.log("classes with constants:", out.length - 3);
