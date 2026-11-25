import type { Context, Next } from "koa";
import { Env } from "../enums/Env.js";
import { Status } from "../enums/StatusCodes.js";
import { isStaticPath } from "../utils/staticPaths.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { assetHash, assetMapVersion } from "../services/assetMap.js";

const STATIC_MAX_AGE = 3600;

const NO_STORE = "no-cache, no-store, must-revalidate";

const STATIC_CACHE_CONTROL = `public, max-age=${STATIC_MAX_AGE}`;

/**
 * The game's files whose address changes with their content (client-web/tools/build.ts): the bundle,
 * game.<id>.js, and whatever the game asks for with its build id, ?v=<id> (the art, the library, the fonts).
 * Kept by browsers and the CDN for good: a new build is new addresses. A second visit then loads the game from
 * the browser's cache, and the browser keeps the bundle compiled.
 */
const IMMUTABLE = "public, max-age=31536000, immutable";
const isVersionedGameFile = (path: string, query: string) =>
  /^\/web(-dev)?\//.test(path) && (/\/game\.[0-9a-f]{12}\.js(\.map)?$/.test(path) || /(^|&)v=[0-9a-f]{12}(&|$)/.test(query));

/**
 * QoL #237: a picture asked for with its version is kept for good too: a new version is a new address. (They were kept
 * an hour, so a return visit rechecked hundreds.)
 *
 * 23 October (the user's: "something is still wrong with some assets ... Cloudflare caches the assets too"): the
 * version is the picture's own, its content's hash (services/assetMap.ts: ?v=<10 hex>), or before the game has the
 * list, the hash of all of them: kept for good only when it is the file's (or the whole's) now, so a replaced picture
 * is a new address by itself. One asked for with a hash that is no longer its own (an old game's) is sent but not
 * kept, nor is one asked for with the old single number (InfernoOnlyConfig.assetVersion, which nobody raised when
 * pictures were replaced: kept an hour now, as an unversioned one).
 * Returns "keep" (for good), "short" (an hour) or "no" (not kept).
 */
const pictureVersion = (path: string, query: string): "keep" | "short" | "no" => {
  if (!infernoOnlyConfig.enabled || !path.startsWith("/assets/")) return "short";
  const v = /(?:^|&)v=([0-9a-z]+)(?:&|$)/.exec(query);
  if (!v) return "short";
  if (/^[0-9a-f]{10}$/.test(v[1])) {
    let rel = path.slice("/assets/".length);
    try {
      rel = decodeURIComponent(rel);
    } catch {
      return "no";
    }
    return v[1] === assetHash(rel) || v[1] === assetMapVersion() ? "keep" : "no";
  }
  return "short";
};

const cacheStaticAssets = process.env.ENV !== Env.LOCAL;

/**
 * Middleware to set CORS headers and apply cache control.
 *
 * @param {Context} ctx - The Koa request/response context object.
 * @param {Next} next - The next middleware function in the stack.
 * @returns {Promise<void>} - A promise that resolves when the middleware is complete.
 */
export const corsCacheControl = async (ctx: Context, next: Next) => {
  ctx.set("Access-Control-Allow-Origin", "*");

  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  const cacheable = cacheStaticAssets && isStaticPath(ctx.path);

  const picture = cacheable && !isVersionedGameFile(ctx.path, ctx.querystring) ? pictureVersion(ctx.path, ctx.querystring) : "short";
  ctx.set("Cache-Control", cacheable ? (isVersionedGameFile(ctx.path, ctx.querystring) || picture === "keep" ? IMMUTABLE : picture === "no" ? NO_STORE : STATIC_CACHE_CONTROL) : NO_STORE);
  // (the game's text files are also kept compressed, file.br / file.gz, and sent so to browsers that take them)
  if (isStaticPath(ctx.path)) ctx.set("Vary", "Accept-Encoding");

  if (ctx.method === "OPTIONS") {
    ctx.status = Status.NO_CONTENT;
    return;
  }

  try {
    await next();
  } finally {
    // Only a file that was found is kept by browsers and the CDN: a picture asked for before it was put
    // on the server (a 404) must not stay "not found" for an hour after it arrives.
    if (cacheable && (ctx.status < 200 || ctx.status >= 400)) ctx.set("Cache-Control", NO_STORE);
  }
};
