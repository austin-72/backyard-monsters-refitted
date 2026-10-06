import type { Context, Next } from "koa";
import { Env } from "../enums/Env.js";
import { Status } from "../enums/StatusCodes.js";
import { isStaticPath } from "../utils/staticPaths.js";

const STATIC_MAX_AGE = 3600;

const NO_STORE = "no-cache, no-store, must-revalidate";

const STATIC_CACHE_CONTROL = `public, max-age=${STATIC_MAX_AGE}`;

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

  ctx.set("Cache-Control", cacheable ? STATIC_CACHE_CONTROL : NO_STORE);

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
