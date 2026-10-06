/**
 * Copies the built client (dist/) into the game server's public folder.
 *
 *   npm run publish                 dist/ -> ../server/public/web (mirrored: stale files removed)
 *   npm run publish -- --root       also makes the site's front page (public/index.html) the game
 *   npm run publish -- --target web-dev
 *
 * The front page is the loader page with <base href="/web/">: the address stays https://<server>/
 * (invite links ?ref=... keep working) while the game's files stay under /web/, a folder the server
 * already serves, so publishing again needs no server restart.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targetName = args.includes("--target") ? args[args.indexOf("--target") + 1] : "web";
const serverPublic = resolve(root, "../server/public");
const dist = resolve(root, "dist");
const target = join(serverPublic, targetName);

if (!existsSync(join(dist, "index.html"))) { console.error("dist/ is empty: run npm run build first"); process.exit(1); }
if (!existsSync(serverPublic)) { console.error(`${serverPublic} not found`); process.exit(1); }

const firstTime = !existsSync(target);
mkdirSync(target, { recursive: true });
// mirror: copy everything, then remove what dist/ no longer has (older bundles)
cpSync(dist, target, { recursive: true, force: true });
const prune = (from: string, to: string) => {
  for (const name of readdirSync(to)) {
    const d = join(from, name), t = join(to, name);
    if (!existsSync(d)) rmSync(t, { recursive: true, force: true });
    else if (statSync(t).isDirectory()) prune(d, t);
  }
};
prune(dist, target);
console.log(`Published the browser client to server/public/${targetName}.`);

if (args.includes("--root")) {
  const html = readFileSync(join(dist, "index.html"), "utf8")
    .replace("<head>", `<head>\n  <base href="/${targetName}/">\n  <!-- Front page: the game's files are in /${targetName}/ (client-web/tools/publish.ts). -->`);
  writeFileSync(join(serverPublic, "index.html"), html);
  console.log("The site's front page (server/public/index.html) now opens the game.");
}
if (firstTime) console.log(`First publish to ${targetName}: restart the server once so it serves /${targetName}/.`);
