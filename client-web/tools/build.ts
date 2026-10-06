/** Bundles the client into dist/: game.js, index.html and the converted SWF assets. */
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const t0 = Date.now();
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: resolve(out, "game.js"),
  sourcemap: true,
  minify: process.env.MINIFY === "1",
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

// Cache-proof publishing: index.html never changes, it reads version.json (fetched with a unique
// query) and loads the content-hashed bundle; assets carry the same hash. A reload after a release
// therefore always gets the new client, whatever caching the web server applies.
const hash = createHash("sha1");
hash.update(readFileSync(resolve(out, "game.js")));
for (const f of ["swf/fonts.json", "swf/library.json", "embed/manifest.json"]) if (existsSync(resolve(out, f))) hash.update(readFileSync(resolve(out, f)));
const id = hash.digest("hex").slice(0, 12);
const script = `game.${id}.js`;
const js = readFileSync(resolve(out, "game.js"), "utf8").replace(/\/\/# sourceMappingURL=game\.js\.map\s*$/, `//# sourceMappingURL=${script}.map`);
writeFileSync(resolve(out, script), js);
rmSync(resolve(out, "game.js"));
renameSync(resolve(out, "game.js.map"), resolve(out, `${script}.map`));
// the game's own build stamp (Inferno MR2 fork: client/scripts/IOBuild.as), for reference
const stamp = /IOBUILD:(\d+):/.exec(existsSync(resolve(root, "src/game/IOBuild.ts")) ? readFileSync(resolve(root, "src/game/IOBuild.ts"), "utf8") : "")?.[1] ?? null;
writeFileSync(resolve(out, "version.json"), JSON.stringify({ id, script, build: stamp }));
cpSync(resolve(root, "index.html"), resolve(out, "index.html"));
console.log(`built dist/ in ${Date.now() - t0}ms: ${script}${stamp ? `, client build ${stamp}` : ""}`);
