/**
 * Development server: serves dist/ and a stand-in for the game server at /server/
 * (static files from ../server/public, which is also the CDN, plus a few mocked
 * API routes). For real play, build with SERVER_URL/CDN_URL pointing at a running
 * BYMR server instead.
 *   tsx tools/dev-server.ts [--port 8080]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const serverPublic = resolve(root, "../server/public");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]) || 8080;
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".map": "application/json", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".css": "text/css", ".xml": "text/xml",
};
const mocks: Record<string, (body: string) => [number, unknown]> = {
  "supportedLangs": () => [200, ["English", "French", "Spanish", "Portuguese"]],
  "player/recorddebugdata": () => [200, {}],
};
/** Routes outside /api/<version>/ */
const rootMocks: Record<string, (body: string) => [number, unknown]> = {
  "init": () => [200, { debugMode: false }],
};

async function sendFile(res: any, base: string, rel: string): Promise<boolean> {
  const p = normalize(join(base, rel));
  if (!p.startsWith(base)) return false;
  try {
    const s = await stat(p);
    if (!s.isFile()) return false;
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] ?? "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    res.end(await readFile(p));
    return true;
  } catch { return false; }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let body = "";
  for await (const chunk of req) body += chunk;
  const log = (status: number) => console.log(`${status} ${req.method} ${url.pathname}${url.search}${body ? "  body=" + body.slice(0, 200) : ""}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST" });
    res.end();
    return;
  }
  if (url.pathname.startsWith("/server/")) {
    const rel = url.pathname.slice("/server/".length);
    const api = /^api\/[^/]+\/(.+)$/.exec(rel);
    const mock = api ? mocks[api[1]] : rootMocks[rel];
    if (mock) {
      const [status, json] = mock(body);
      res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(json));
      log(status);
      return;
    }
    if (api && mocks[api[1]]) {
      const [status, json] = mocks[api[1]](body);
      res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(json));
      log(status);
      return;
    }
    if (await sendFile(res, serverPublic, decodeURIComponent(rel))) { log(200); return; }
    res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "not mocked" }));
    log(404);
    return;
  }
  const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  if (await sendFile(res, dist, rel)) return;
  res.writeHead(404);
  res.end("not found");
}).listen(port, () => console.log(`dev server on http://localhost:${port}/?serverUrl=http://localhost:${port}/server/`));
