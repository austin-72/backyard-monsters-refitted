/**
 * swf-assets: converts the Flash library (assets.swf) into browser assets.
 *   tsx tools/swf-assets/cli.ts [--swf ../client/scripts/_assets/assets.swf] [--out public/swf]
 * Output: fonts.json (embedded fonts). Shapes, sprites, bitmaps and texts follow in later milestones.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, globSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { readSwf } from "./swf.ts";
import { extractFonts } from "./fonts.ts";
import { convertLibrary } from "./library.ts";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const webRoot = resolve(here, "../..");
const swfPath = resolve(webRoot, opt("--swf", "../client/scripts/_assets/assets.swf"));
const outDir = resolve(webRoot, opt("--out", "public/swf"));
mkdirSync(outDir, { recursive: true });

const swf = readSwf(readFileSync(swfPath));
const fonts = extractFonts(swf.body, swf.tags);
writeFileSync(resolve(outDir, "fonts.json"), JSON.stringify({ version: 1, emSquare: 20480, fonts }));
console.log(`fonts.json: ${fonts.length} fonts, ${fonts.reduce((n, f) => n + Object.keys(f.glyphs).length, 0)} glyphs`);

// Library symbols: shapes, sprites, texts, buttons, bitmaps
{
  const t0 = Date.now();
  let files = 0, bytes = 0;
  const lib = convertLibrary(swf.body, swf.tags, swf.frameRate, (name, data) => {
    const dest = resolve(outDir, name);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, data);
    files++; bytes += data.length;
  });
  const json = JSON.stringify(lib);
  writeFileSync(resolve(outDir, "library.json"), json);
  const kinds = new Map<string, number>();
  for (const c of Object.values(lib.chars)) kinds.set(c.type, (kinds.get(c.type) ?? 0) + 1);
  console.log(`library.json: ${(json.length / 1e6).toFixed(1)} MB, ${Object.keys(lib.symbols).length} symbols, ${[...kinds].map(([k, v]) => `${v} ${k}`).join(", ")}; ${files} bitmap files (${(bytes / 1e6).toFixed(1)} MB) in ${Date.now() - t0}ms`);
}

// Files embedded with [Embed(source="...")] (images, sounds): copied as-is, listed in a manifest
// so the player can load them before any game code runs.
const scripts = resolve(webRoot, opt("--scripts", "../client/scripts"));
const embedOut = resolve(webRoot, "public/embed");
const sources = new Set<string>();
for (const f of globSync("**/*.as", { cwd: scripts })) {
  for (const m of readFileSync(resolve(scripts, f), "utf8").matchAll(/\[Embed\(source="([^"]+)"(?!\s*,\s*symbol)/g)) sources.add(m[1]);
}
const manifest: string[] = [];
for (const src of [...sources].sort()) {
  if (!/\.(png|jpe?g|gif|mp3)$/i.test(src)) continue;
  const file = resolve(scripts, src.replace(/^\//, ""));
  if (!existsSync(file)) { console.warn(`missing embed source ${src}`); continue; }
  const dest = resolve(embedOut, src.replace(/^\//, ""));
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
  manifest.push(src);
}
writeFileSync(resolve(embedOut, "manifest.json"), JSON.stringify(manifest));
console.log(`embed/: ${manifest.length} embedded files`);
