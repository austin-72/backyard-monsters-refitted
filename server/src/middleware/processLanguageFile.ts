import type { Context, Next } from "koa";
import fs from "fs/promises";
import { createHash } from "crypto";
import { brotliCompressSync, gzipSync, constants } from "zlib";
import { Env } from "../enums/Env.js";
import { logger } from "../utils/logger.js";
import { Status } from "../enums/StatusCodes.js";

const matchLanguage = /^\/gamestage\/assets\/([a-zA-Z]+)\.json$/;

/** A language file ready to send: the text, its tag, and the text compressed both ways (QoL #236). */
interface LanguageReply {
  text: string;
  etag: string;
  gz: Buffer;
  br: Buffer;
}

const languageCache = new Map<string, Promise<LanguageReply>>();

/**
 * Locally the language files are the ones being edited, and bun --watch does not
 * restart for a change under public/, so a cached copy would go stale until the
 * server is restarted by hand.
 */
const cacheLanguageFiles = process.env.ENV !== Env.LOCAL;

/**
 * Reads a language file, validates it as JSON, and returns the response body.
 *
 * @param {string} languageCode - The language code taken from the request path.
 * @returns {Promise<string>} The JSON body to serve.
 */
const loadLanguageFile = async (languageCode: string) => {
  const rawData = await fs.readFile(`./public/gamestage/assets/${languageCode}.json`, "utf8");

  const text = JSON.stringify(JSON.parse(rawData));
  const raw = Buffer.from(text);
  return {
    text,
    etag: `"${createHash("sha1").update(raw).digest("hex").slice(0, 20)}"`,
    gz: gzipSync(raw, { level: 9 }),
    br: brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: cacheLanguageFiles ? 11 : 5, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }),
  };
};

/**
 * Middleware to process language files based on the request path.
 *
 * @param {Context} ctx - The Koa context object.
 * @param {Next} next - The Koa next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the middleware is complete.
 */
export const processLanguagesFile = async (ctx: Context, next: Next) => {
  const match = ctx.path.match(matchLanguage);

  if (!match) {
    await next();
    return;
  }

  const languageCode = match[1];

  try {
    let body = cacheLanguageFiles ? languageCache.get(languageCode) : undefined;

    if (!body) {
      body = loadLanguageFile(languageCode);
      if (cacheLanguageFiles) languageCache.set(languageCode, body);
    }

    const reply = await body;
    // (QoL #236: about 360 KB sent raw every session. Now compressed, about a quarter of it, and kept by the browser:
    // it asks again each time, and is answered "not modified" while the file is the same.)
    ctx.set("Cache-Control", "no-cache");
    ctx.set("ETag", reply.etag);
    ctx.set("Vary", "Accept-Encoding");
    ctx.type = "application/json";
    if (ctx.get("If-None-Match") === reply.etag) {
      ctx.status = 304;
      return;
    }
    const accept = String(ctx.get("Accept-Encoding") || "");
    ctx.status = Status.OK;
    if (/\bbr\b/.test(accept)) {
      ctx.set("Content-Encoding", "br");
      ctx.body = reply.br;
    } else if (/\bgzip\b/.test(accept)) {
      ctx.set("Content-Encoding", "gzip");
      ctx.body = reply.gz;
    } else {
      ctx.body = reply.text;
    }
  } catch (error) {
    languageCache.delete(languageCode);

    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: "Error processing JSON data" };
    logger.error(`Error processing language file for code ${languageCode}: ${error}`);
  }
};
