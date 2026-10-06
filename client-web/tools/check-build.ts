/**
 * Which client version is where? Compares the build stamps (IOBUILD markers) that decide what players get:
 *
 *   client/scripts/IOBuild.as              the sources publish-web and the Flash build compile
 *   server/public/client/bymr-stable.swf   the published Flash client (the server's "current version")
 *   server/public/web/version.json         the published browser client, on disk
 *   <server>/web/version.json              what the running server actually hands out
 *
 *   npm run check                    (server: http://localhost:3001, or CHECK_URL=https://host)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = resolve(root, "..");
const MARKER = /IOBUILD:(\d{8,14}):/;
const serverUrl = (process.env.CHECK_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/+$/, "");

const fmt = (s: number | null) => (s ? `${String(s).slice(0, 4)}-${String(s).slice(4, 6)}-${String(s).slice(6, 8)} ${String(s).slice(8, 10)}:${String(s).slice(10, 12)}  (${s})` : "none");

function sourceStamp(): number | null {
  const f = join(project, "client/scripts/IOBuild.as");
  if (!existsSync(f)) return null;
  const m = MARKER.exec(readFileSync(f, "utf8"));
  return m ? Number(m[1]) : null;
}

function swfStamp(file: string): number | null {
  if (!existsSync(file)) return null;
  const bytes = readFileSync(file);
  const sig = bytes.subarray(0, 3).toString("latin1");
  const body = sig === "CWS" ? inflateSync(bytes.subarray(8)) : sig === "FWS" ? bytes.subarray(8) : null;
  if (!body) return null;
  const m = MARKER.exec(body.toString("latin1"));
  return m ? Number(m[1]) : null;
}

function webStamp(dir: string): { build: number | null; script?: string; modified?: Date } | null {
  const f = join(dir, "version.json");
  if (!existsSync(f)) return null;
  const v = JSON.parse(readFileSync(f, "utf8"));
  return { build: v.build ? Number(v.build) : null, script: v.script, modified: statSync(f).mtime };
}

async function servedStamp(path: string): Promise<{ build: number | null; script?: string } | string> {
  try {
    const r = await fetch(`${serverUrl}${path}version.json?t=${Date.now()}`, { cache: "no-store" } as RequestInit);
    if (!r.ok) return `HTTP ${r.status}`;
    const v = await r.json();
    return { build: v.build ? Number(v.build) : null, script: v.script };
  } catch (e) {
    return `not reachable (${(e as Error).message})`;
  }
}

const src = sourceStamp();
const swf = swfStamp(join(project, "server/public/client/bymr-stable.swf"));
const web = webStamp(join(project, "server/public/web"));
const dev = webStamp(join(project, "server/public/web-dev"));
const served = await servedStamp("/web/");

const rows: [string, string][] = [
  ["client sources (client/scripts/IOBuild.as)", fmt(src)],
  ["published Flash client (server/public/client)", swf === null ? "none published" : fmt(swf)],
  ["browser client on disk (server/public/web)", web ? `${fmt(web.build)}  ${web.script}, published ${web.modified!.toLocaleString()}` : "not published"],
  [`browser client served by ${serverUrl}/web/`, typeof served === "string" ? served : `${fmt(served.build)}  ${served.script}`],
];
if (dev) rows.push(["watch-mode build (server/public/web-dev)", `${fmt(dev.build)}  ${dev.script}`]);
const w = Math.max(...rows.map((r) => r[0].length));
console.log("");
for (const [k, v] of rows) console.log(`  ${k.padEnd(w)}  ${v}`);
console.log("");

const advice: string[] = [];
if (src === null) advice.push("client/scripts/IOBuild.as not found: publish-web converts client/scripts, is that where your current sources are?");
if (swf && src && swf > src) advice.push("The published Flash client is NEWER than client/scripts: it was built from other or newer sources. publish-web converts client/scripts; make that folder hold the current sources, then run publish-web.");
if (web && swf && web.build && web.build < swf) advice.push("The browser client is older than the published Flash client, so the server tells it to update. Run publish-web now (after stamp-build), from the same sources as the SWF.");
if (web && src && web.build && web.build < src) advice.push("client/scripts is newer than the published browser client: run publish-web.");
if (!web) advice.push("No browser client is published yet: run publish-web.");
if (web && typeof served !== "string" && served.script !== web.script) advice.push("The server hands out a different browser build than the one on disk: restart the server (Docker: docker compose up -d, so the container gets the public/web bind from docker-compose.yml). If players use another machine, copy server/public/web there.");
if (typeof served === "string" && served.startsWith("HTTP 404")) advice.push("The server does not serve /web/ yet: restart it once after the first publish-web.");
if (!advice.length) advice.push("Everything matches: sources, published Flash client and browser client are the same build.");
for (const a of advice) console.log(`  - ${a}`);
console.log("");
