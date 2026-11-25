import { readFile, stat } from "fs/promises";
import path from "path";
import type { Context, Next } from "koa";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";

/**
 * Inferno-only: what search engines and link previews read (9 October, the user's "Optimize the site for search
 * engines").
 *
 *  - The front page (the game's loader page, client-web/index.html, published as public/index.html and
 *    public/web/index.html) is handed out with its `__SITE_URL__` filled in: the canonical address, the share
 *    image's and the structured data's (they must be whole addresses).
 *  - /robots.txt: everything but the admin panel and the API may be crawled; where the sitemap is.
 *  - /sitemap.xml: the front page (and the change list).
 *  - The admin panel is never indexed (X-Robots-Tag).
 */
const PUBLIC_DIR = "public";
const PAGES: Record<string, string> = { "/": "index.html", "/index.html": "index.html", "/web/": "web/index.html", "/web/index.html": "web/index.html" };
const SITEMAP_EXTRA = ["guide", "rules"]; // (QoL #642: the guide, no longer the PDF)

/** The site's one address, ending in "/". */
export const siteUrl = (ctx: Context): string => {
  const configured = (infernoOnlyConfig as { seo?: { siteUrl?: string } }).seo?.siteUrl || infernoOnlyConfig.referral?.inviteUrl || "";
  const url = configured || `${ctx.protocol}://${ctx.host}/`;
  return url.endsWith("/") ? url : `${url}/`;
};

const cache = new Map<string, { mtime: number; html: string }>();
const pageHtml = async (file: string): Promise<{ html: string; mtime: number } | null> => {
  const full = path.join(PUBLIC_DIR, file);
  try {
    const st = await stat(full);
    const hit = cache.get(full);
    if (hit && hit.mtime === st.mtimeMs) return hit;
    const entry = { html: await readFile(full, "utf8"), mtime: st.mtimeMs };
    cache.set(full, entry);
    return entry;
  } catch {
    return null;
  }
};

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const seo = async (ctx: Context, next: Next) => {
  if (ctx.method !== "GET" && ctx.method !== "HEAD") return next();
  const p = ctx.path;
  if (p.startsWith("/admin")) {
    await next();
    ctx.set("X-Robots-Tag", "noindex, nofollow");
    return;
  }
  if (p === "/robots.txt") {
    const site = siteUrl(ctx);
    ctx.type = "text/plain; charset=utf-8";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/", "", `Sitemap: ${site}sitemap.xml`, ""].join("\n");
    return;
  }
  if (p === "/sitemap.xml") {
    const site = siteUrl(ctx);
    const front = await pageHtml("index.html");
    const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const urls = [`  <url><loc>${escapeXml(site)}</loc>${front ? `<lastmod>${day(front.mtime)}</lastmod>` : ""}<changefreq>daily</changefreq><priority>1.0</priority></url>`];
    for (const extra of SITEMAP_EXTRA) {
      try {
        const st = await stat(path.join(PUBLIC_DIR, extra));
        urls.push(`  <url><loc>${escapeXml(site + extra)}</loc><lastmod>${day(st.mtimeMs)}</lastmod><priority>0.3</priority></url>`);
      } catch {
        // (not there: left out)
      }
    }
    ctx.type = "application/xml; charset=utf-8";
    ctx.set("Cache-Control", "public, max-age=3600");
    ctx.body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
    return;
  }
  const file = PAGES[p];
  if (file) {
    const page = await pageHtml(file);
    if (page && page.html.includes("__SITE_URL__")) {
      ctx.type = "text/html; charset=utf-8";
      // (the page itself is tiny and names the current build: never kept stale)
      ctx.set("Cache-Control", "no-cache");
      ctx.body = page.html.split("__SITE_URL__").join(siteUrl(ctx));
      return;
    }
  }
  return next();
};
