import type { Context, Next } from "koa";
import { brotliCompress, gzip, constants } from "node:zlib";
import { promisify } from "node:util";

/**
 * (21 October, the user's: more than one thread) compressed on Node's own pool of background threads, not on the
 * server's one thread for everything: a big reply (the world map, 600 kB) held every other player's request up while
 * it was compressed (about 5 ms each); now they go on while it is.
 */
const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

/**
 * The game's replies (JSON and text) sent compressed to browsers that take it (fps pass, 11 October). The
 * world map's data was 600 kB a time, a yard 100 to 300 kB, all sent as they are: about a tenth of that
 * compressed. Static files have their own compressed copies (corsCacheControlSetup.ts); small replies,
 * pictures, sounds and anything already encoded are left alone. Brotli at a light setting where the browser
 * takes it (as fast as gzip, smaller), otherwise gzip.
 */
const MIN_BYTES = 1400;
/** COMPRESS_REPLIES=0 in the server's environment turns it off. */
const ENABLED = process.env.COMPRESS_REPLIES !== "0";

export async function compressReplies(ctx: Context, next: Next): Promise<void> {
  await next();
  if (!ENABLED) return;
  const body: unknown = ctx.body;
  if (body == null || ctx.status !== 200 || ctx.method === "HEAD" || ctx.response.get("Content-Encoding")) return;
  const accept = String(ctx.get("Accept-Encoding") || "");
  // (22 October: an encoding the client lists with q=0 refuses it: not sent)
  const takes = (name: string) => accept.split(",").some((part) => { const [enc, ...params] = part.trim().split(";"); if (enc.trim().toLowerCase() !== name) return false; const q = params.map((p) => p.trim()).find((p) => p.startsWith("q=")); return !q || Number(q.slice(2)) > 0; });
  const br = takes("br"), gz = takes("gzip");
  if (!br && !gz) return;
  let text: string | null = null;
  if (typeof body === "string") text = body;
  else if (Buffer.isBuffer(body) || typeof (body as any).pipe === "function" || body instanceof Uint8Array) return;
  else if (typeof body === "object") text = JSON.stringify(body);
  if (text === null || text.length < MIN_BYTES) return;
  const type = ctx.response.get("Content-Type") || (typeof body === "object" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
  if (!/json|text|javascript|xml/.test(type)) return;
  const raw = Buffer.from(text);
  let packed: Buffer;
  try {
    packed = br
      ? await brotliAsync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 4, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
      : await gzipAsync(raw, { level: 5 });
  } catch {
    return; // (sent as it is)
  }
  if (packed.length >= raw.length) return;
  ctx.body = packed;
  ctx.set("Content-Type", type);
  ctx.set("Content-Encoding", br ? "br" : "gzip");
  ctx.vary("Accept-Encoding");
}
