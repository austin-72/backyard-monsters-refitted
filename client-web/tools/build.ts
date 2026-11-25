/**
 * Bundles the client into dist/: game.js (src/, the game's TypeScript), index.html and public/ (the art: swf/ holds
 * the game's original library, embed/ the pictures and sounds its classes embed).
 *
 * RELEASE=1 (publish-web) builds what players get, made to load fast: the bundle minified (names kept, so error
 * reports still name the functions), the art's ~520 files also packed into one (art.bin, read by the player in one
 * request), and every text file compressed ahead (.br, .gz: the server sends those to browsers that take them).
 * MINIFY=1 / COMPRESS=1 / PACK=1 turn on one of these alone. The game is the same either way.
 */
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync, constants as zlib } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const release = process.env.RELEASE === "1";
const minify = release || process.env.MINIFY === "1";
const compress = release || process.env.COMPRESS === "1";
const pack = release || process.env.PACK === "1";
const out = resolve(root, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The embedded files' list (public/embed/manifest.json), which the player loads before any game code runs: every
// picture and sound in public/embed/_assets, sorted. A class embeds one with as3.embed(this, { source: "/_assets/..." }).
{
  const embedDir = resolve(root, "public/embed");
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
  const files = existsSync(resolve(embedDir, "_assets")) ? walk(resolve(embedDir, "_assets")) : [];
  const list = files
    .map((f) => "/" + f.slice(embedDir.length + 1).split(/[\\/]/).join("/"))
    .filter((f) => /\.(png|jpe?g|gif|mp3)$/i.test(f))
    .sort();
  const manifest = JSON.stringify(list);
  const file = resolve(embedDir, "manifest.json");
  if (!existsSync(file) || readFileSync(file, "utf8") !== manifest) writeFileSync(file, manifest);
}

const t0 = Date.now();
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: resolve(out, "game.js"),
  sourcemap: true,
  minify,
  // (names kept: error reports and the game's own stack traces name the functions)
  keepNames: minify,
  legalComments: "none",
  logLevel: "warning",
  // AS3 allowed duplicate keys in object literals (last one wins, as in JavaScript)
  logOverride: { "duplicate-object-key": "silent" },
  tsconfig: resolve(root, "tsconfig.json"),
  define: {
    __SERVER_URL__: JSON.stringify(process.env.SERVER_URL ?? "https://server.bymrefitted.com/"),
    __CDN_URL__: JSON.stringify(process.env.CDN_URL ?? "https://cdn.bymrefitted.com/"),
  },
});
cpSync(resolve(root, "public"), out, { recursive: true });

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
/** The art the player loads before the game starts: the library's bitmaps and the embedded files (dist paths). */
const artFiles = [
  ...(existsSync(resolve(out, "swf/bitmaps")) ? walk(resolve(out, "swf/bitmaps")) : []),
  ...(existsSync(resolve(out, "embed/_assets")) ? walk(resolve(out, "embed/_assets")) : []),
].map((f) => f.slice(out.length + 1).split(/[\\/]/).join("/")).filter((f) => /\.(png|jpe?g|gif|mp3|wav)$/i.test(f)).sort();

// Cache-proof publishing: index.html never changes, it reads version.json (fetched with a unique
// query) and loads the content-hashed bundle; assets are asked for with the same id. A reload after a release
// therefore always gets the new client, whatever caching the web server applies. The id covers the bundle and
// every file of the art, so the server can let browsers keep all of them for good (a new picture, a new id).
const hash = createHash("sha1");
hash.update(readFileSync(resolve(out, "game.js")));
for (const f of ["swf/fonts.json", "swf/library.json", "embed/manifest.json", ...artFiles]) if (existsSync(resolve(out, f))) { hash.update(f); hash.update(readFileSync(resolve(out, f))); }
const id = hash.digest("hex").slice(0, 12);
const script = `game.${id}.js`;
const js = readFileSync(resolve(out, "game.js"), "utf8").replace(/\/\/# sourceMappingURL=game\.js\.map\s*$/, `//# sourceMappingURL=${script}.map`);
writeFileSync(resolve(out, script), js);
rmSync(resolve(out, "game.js"));
renameSync(resolve(out, "game.js.map"), resolve(out, `${script}.map`));
// the game's own build stamp (src/game/IOBuild.ts, written by npm run stamp), which the server asks clients for
const stamp = /IOBUILD:(\d+):/.exec(existsSync(resolve(root, "src/game/IOBuild.ts")) ? readFileSync(resolve(root, "src/game/IOBuild.ts"), "utf8") : "")?.[1] ?? null;
// The art in one file (art.bin): a 4-byte length, a JSON index {path: [offset, length]}, then the files as they are.
// The player reads it in one request instead of ~520 (src/player/preload.ts); the files stay next to it.
let packName: string | null = null;
if (pack && artFiles.length) {
  const index: Record<string, [number, number]> = {};
  const parts: Buffer[] = [];
  let off = 0;
  for (const f of artFiles) {
    const b = readFileSync(resolve(out, f));
    index[f] = [off, b.length];
    parts.push(b);
    off += b.length;
  }
  const head = Buffer.from(JSON.stringify(index), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(head.length, 0);
  packName = "art.bin";
  writeFileSync(resolve(out, packName), Buffer.concat([len, head, ...parts]));
}
writeFileSync(resolve(out, "version.json"), JSON.stringify({ id, script, build: stamp, ...(packName ? { pack: packName } : {}) }));
cpSync(resolve(root, "index.html"), resolve(out, "index.html"));

// Text files compressed ahead: koa-static sends file.br / file.gz to a browser that takes them.
let packed = 0, before = 0, after = 0;
if (compress) {
  for (const f of walk(out)) {
    if (!/\.(js|json|map|svg|css|webmanifest|txt)$/i.test(f) || /[\\/]version\.json$/.test(f)) continue;
    const b = readFileSync(f);
    if (b.length < 1024) continue;
    const big = f.endsWith(".map");
    const br = brotliCompressSync(b, { params: { [zlib.BROTLI_PARAM_QUALITY]: big ? 6 : 11, [zlib.BROTLI_PARAM_SIZE_HINT]: b.length } });
    writeFileSync(`${f}.br`, br);
    writeFileSync(`${f}.gz`, gzipSync(b, { level: 9 }));
    packed++; before += b.length; after += br.length;
  }
}
const size = (f: string) => (existsSync(resolve(out, f)) ? statSync(resolve(out, f)).size : 0);
console.log(`built dist/ in ${Date.now() - t0}ms: ${script}${stamp ? `, client build ${stamp}` : ""}` +
  (minify ? `, minified (${(size(script) / 1e6).toFixed(1)} MB)` : "") +
  (packName ? `, ${artFiles.length} art files in ${packName} (${(size(packName) / 1e6).toFixed(1)} MB)` : "") +
  (compress ? `, ${packed} files compressed (${(before / 1e6).toFixed(1)} -> ${(after / 1e6).toFixed(1)} MB with brotli)` : ""));
