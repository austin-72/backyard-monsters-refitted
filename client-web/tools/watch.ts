/**
 * Watch mode: rebuilds and republishes the browser client whenever client/scripts changes.
 *
 *   npm run watch                      publishes to ../server/public/web-dev (served at /web-dev/)
 *   npm run watch -- --target web      publishes to ../server/public/web instead (what players get!)
 *   npm run watch -- --no-publish      only rebuilds dist/ (for tools/dev-server.ts)
 *
 * Each change runs: convert (all .as files) -> assets (only when a non-.as file or an [Embed] changed)
 * -> build -> copy to the target folder. A failed step keeps the last good build published.
 * Open the page with ?watch=1 and it reloads itself when a new build is published.
 */
import { watch, existsSync, readFileSync, readdirSync, cpSync, rmSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scripts = resolve(root, "../client/scripts");
const serverPublic = resolve(root, "../server/public");
const args = process.argv.slice(2);
const publish = !args.includes("--no-publish") && existsSync(serverPublic);
const targetName = args.includes("--target") ? args[args.indexOf("--target") + 1] : "web-dev";
const target = resolve(serverPublic, targetName);

// SERVER_URL / CDN_URL (compiled-in addresses) come from the environment, as for npm run build.

const time = () => new Date().toTimeString().slice(0, 8);
const log = (msg: string) => console.log(`[${time()}] ${msg}`);

/** Runs one npm script; false when it fails (its output is shown). */
function step(name: string): boolean {
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "--silent", name], { cwd: root, shell: true, encoding: "utf8", env: process.env });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.status !== 0) {
    log(`${name} FAILED:`);
    console.log(out.split("\n").filter((l) => l.trim()).slice(-25).join("\n"));
    return false;
  }
  const summary = out.split("\n").reverse().find((l) => /converted|built|fonts\.json|embed\//.test(l));
  log(`${name} ok in ${((Date.now() - t0) / 1000).toFixed(1)}s${summary ? `: ${summary.trim()}` : ""}`);
  return true;
}

/** Copies dist/ to the target: the page files always, swf/ and embed/ only when they changed. */
function copyToTarget(assetsChanged: boolean): void {
  const dist = resolve(root, "dist");
  mkdirSync(target, { recursive: true });
  const firstTime = !existsSync(join(target, "index.html"));
  for (const name of readdirSync(dist)) {
    const isAssets = name === "swf" || name === "embed";
    if (isAssets && !assetsChanged && existsSync(join(target, name))) continue;
    copyWithRetry(join(dist, name), join(target, name));
  }
  // remove bundles of older builds
  const keep = new Set(readdirSync(dist));
  for (const name of readdirSync(target)) if (/^game\.[0-9a-f]+\.js(\.map)?$/.test(name) && !keep.has(name)) rmSync(join(target, name), { force: true });
  const v = JSON.parse(readFileSync(join(dist, "version.json"), "utf8"));
  log(`published ${v.script} to ${relative(resolve(root, ".."), target)}`);
  if (firstTime) log(`first publish to this folder: restart the server once so it serves /${targetName}/`);
}

function copyWithRetry(from: string, to: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      cpSync(from, to, { recursive: true, force: true });
      return;
    } catch (e) {
      // Windows can briefly lock a file the server is sending
      if (attempt >= 5) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}

let pending = new Set<string>();
let timer: NodeJS.Timeout | undefined;
let running = false;
let firstRun = true;

function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(run, 400);
}

function run(): void {
  if (running) return schedule();
  running = true;
  const files = [...pending];
  pending = new Set();
  const assetsChanged = firstRun || files.some((f) => !f.endsWith(".as") || hasEmbed(f));
  if (!firstRun) log(`changed: ${files.slice(0, 5).join(", ")}${files.length > 5 ? ` and ${files.length - 5} more` : ""}`);
  const ok = step("convert") && (!assetsChanged || step("assets")) && step("build");
  if (ok && publish) {
    try {
      copyToTarget(assetsChanged);
    } catch (e) {
      log(`publishing FAILED: ${e}`);
    }
  } else if (!ok) {
    log("kept the last good build");
  }
  firstRun = false;
  running = false;
  if (pending.size) schedule();
  else log("watching client/scripts for changes (Ctrl+C to stop)");
}

function hasEmbed(file: string): boolean {
  try {
    return readFileSync(join(scripts, file), "utf8").includes("[Embed(");
  } catch {
    return true; // deleted or unreadable: refresh the embeds to be safe
  }
}

const ignored = (f: string) => /(^|[\\/])\.|~$|\.(tmp|swp|bak)$/i.test(f);

if (!existsSync(scripts)) {
  console.error(`client/scripts not found at ${scripts}`);
  process.exit(1);
}
log(publish ? `publishing to ${relative(resolve(root, ".."), target)} (open /${targetName}/?watch=1 to reload on each build)` : "building dist/ only");
if (publish && targetName === "web") log("NOTE: target is the live folder: players get every build");
watch(scripts, { recursive: true }, (_ev, file) => {
  if (!file) return;
  const f = file.toString();
  if (ignored(f)) return;
  try {
    if (statSync(join(scripts, f)).isDirectory()) return;
  } catch {
    /* deleted: still counts as a change */
  }
  pending.add(f);
  schedule();
});
run();
