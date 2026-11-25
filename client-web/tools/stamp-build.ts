/**
 * Writes the build stamp, the date and time now (yyyyMMddHHmm, this computer's clock), into src/game/IOBuild.ts.
 * Run it before a release (stamp-build.cmd / stamp-build.sh, the VS Code task "BYMR - Release"): the server asks
 * every client for its stamp and tells one older than the published browser build to reload.
 *
 *   npm run stamp
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "../src/game/IOBuild.ts");
const d = new Date();
const two = (n: number) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}${two(d.getHours())}${two(d.getMinutes())}`;
const text = readFileSync(file, "utf8");
if (!/IOBUILD:\d+:/.test(text)) {
  console.error(`No IOBUILD:<digits>: marker in ${file}`);
  process.exit(1);
}
writeFileSync(file, text.replace(/IOBUILD:\d+:/, `IOBUILD:${stamp}:`));
console.log(`Build stamp: ${stamp}`);
