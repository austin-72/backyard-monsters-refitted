import { readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "node:crypto";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import type { User } from "../database/models/user.model.js";
import { Status } from "../enums/StatusCodes.js";
import { fmiEnabled } from "../services/events/fmi.js";
import { hfoFinalWaveWon, readHfo } from "../services/events/hfo.js";
import { readTrophies } from "../services/events/trophies.js";
import type { KoaController } from "../utils/KoaController.js";
import { logger } from "../utils/logger.js";

/**
 * Inferno-only (QoL #642 #638 #639 #643 #653, 16 October): the player guide and the rules, written in Markdown and
 * rendered here, in place of the old PDF (public/docs/Inferno-Maproom-2-changes.pdf, kept where it was).
 *
 *   GET  /guide             the guide: public/guide/index.md (the title, the lead and the chapters' order: its list
 *                           of links) and one file per chapter, as one page with a table of contents, an anchor on
 *                           every heading and a print style. The look is the help pages' (public/docs/faq.html).
 *   GET  /rules             the rules: public/guide/rules.md, the same look. "{{discord}}" in it becomes a link to
 *                           infernoOnlyConfig.community.discordUrl (or plain words while that is empty).
 *   GET  /whats-different   (the login page's "What's different?", the Quest Book's and the Change Log's guide links,
 *                           chat's /guide) sends the browser on to /guide.
 *   GET  /guide/more        the same guide page with a short script: the game opens it as guide/more#k=<the player's
 *                           login token> (the part after # never reaches a server or a log, and the script takes it
 *                           off the address at once). The script asks POST /guide/more with that token and adds
 *                           what comes back as more chapters. A player who may have none sees the plain guide.
 *   POST /guide/more        (verifyUserAuth) the chapters this player may read, from src/guide-classified (outside
 *                           public/, so never served as files): { error: 0, parts, html, toc, first }, or 403 when
 *                           there are none. Each part is shown only to a player who has taken part:
 *                             hfo  the winter event has started for them (their user.hfo progress exists);
 *                             fmi  as the D.A.V.E. Club's trophy cabinet shows that event's totems: the player may
 *                                  take part (it is on, and they won the winter event's last wave: fmiView), or
 *                                  holds one of its totems (io_trophies fmi1 / fmi2). Admin test mode doesn't count.
 *
 * The Markdown is this file's own small renderer (renderMarkdown): headings (with {#id} for a fixed anchor), paragraphs,
 * lists (nested by indenting), **bold**, *italic*, `code`, code blocks, [links](...), tables, > quotes and ---. A link
 * to another chapter's file ("05-buildings.md#walls") becomes the anchor on this page. HTML in the files is shown as
 * text, and <!-- comments --> are left out. Pages are made once and kept in memory; the files are looked at again (their
 * modified times) at most every 2 seconds, and a changed file is read and the page made again: no restart.
 */

export const GUIDE_DIR = path.join("public", "guide");
export const GUIDE_INDEX = "index.md";
export const RULES_FILE = "rules.md";
/** Outside public/: never served as a file. */
export const PRIVATE_DIR = fileURLToPath(new URL("../guide-classified/", import.meta.url));

const CHECK_MS = 2_000;

// ---------------------------------------------------------------------------------------------------------------
// The Markdown renderer
// ---------------------------------------------------------------------------------------------------------------

export interface MdHeading {
  /** As written (# 1, ## 2 ...), before `shift`. */
  level: number;
  id: string;
  html: string;
  text: string;
}

export interface MdOptions {
  /** Every id already on the page (headings get unique ones and are added). */
  ids: Set<string>;
  /** Added to every heading's level (a chapter's # is the page's h2). */
  shift?: number;
  /** Rewrites a link's target before it is checked. */
  href?: (href: string) => string;
  /** The id for the first heading when it is a #, given in advance (reserved in `ids`). */
  firstId?: string;
  /** A small "#" link after each heading (default on). */
  anchors?: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** Web, mail, this site's paths, anchors and plain relative names; anything else (javascript:, data:) goes nowhere. */
const SAFE_HREF = /^(?:https?:\/\/|mailto:|\/|#|\.{1,2}\/)|^[\w.-]+(?:#[\w-]*)?$/i;

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const uniqueId = (wanted: string, ids: Set<string>) => {
  let id = wanted;
  for (let n = 2; ids.has(id); n++) id = `${wanted}-${n}`;
  ids.add(id);
  return id;
};

const resolveHref = (href: string, opts: MdOptions) => {
  const target = opts.href ? opts.href(href) : href;
  return SAFE_HREF.test(target) ? target : "#";
};

/** One paragraph's (or cell's, or item's) text: code, links, bold and italic; everything else as text. */
const inline = (text: string, opts: MdOptions): string => {
  const held: string[] = [];
  const hold = (html: string) => `\u0001${held.push(html) - 1}\u0002`;
  let s = text.replace(/[\u0001\u0002]/g, "");
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _ticks: string, code: string) => hold(`<code>${esc(code.trim())}</code>`));
  s = s.replace(/\\([\\`*_[\]()#|>!{}.+-])/g, (_m, c: string) => hold(esc(c)));
  s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g, (_m, label: string, href: string, title?: string) => {
    const target = resolveHref(href, opts);
    const outside = /^https?:/i.test(target);
    return hold(`<a href="${esc(target)}"${title ? ` title="${esc(title)}"` : ""}${outside ? ' rel="noopener"' : ""}>${inline(label, opts)}</a>`);
  });
  s = s.replace(/<(https?:\/\/[^\s<>]+)>/g, (_m, url: string) => hold(`<a href="${esc(url)}" rel="noopener">${esc(url)}</a>`));
  s = esc(s);
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, "$1<strong>$2</strong>");
  s = s.replace(/(^|[^\w*])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?![\w*])/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, "$1<em>$2</em>");
  // (a line ending in two spaces or a backslash: a line break)
  s = s.replace(/ {2,}\n/g, "<br>\n");
  return s.replace(/\u0001(\d+)\u0002/g, (_m, i: string) => held[Number(i)] ?? "");
};

const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const FENCE_RE = /^\s*(```|~~~)\s*([\w-]*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_RE = /^\s{0,3}>/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const indentOf = (line: string) => (/^\s*/.exec(line)?.[0] ?? "").replace(/\t/g, "    ").length;

/** Markdown to HTML, with the headings it had (for a table of contents). */
export const renderMarkdown = (source: string, opts: MdOptions): { html: string; headings: MdHeading[] } => {
  const lines = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n");
  const headings: MdHeading[] = [];
  const out: string[] = [];
  let para: string[] = [];

  const isTableAt = (i: number) => lines[i].includes("|") && i + 1 < lines.length && lines[i + 1].includes("|") && TABLE_SEP_RE.test(lines[i + 1]);
  const startsBlock = (i: number) =>
    FENCE_RE.test(lines[i]) || HEADING_RE.test(lines[i]) || HR_RE.test(lines[i]) || QUOTE_RE.test(lines[i]) || LIST_RE.test(lines[i]) || isTableAt(i);

  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join("\n"), opts)}</p>`);
    para = [];
  };

  const heading = (level: number, raw: string) => {
    let text = raw;
    let wanted = "";
    const explicit = /\s*\{#([\w-]+)\}\s*$/.exec(text);
    if (explicit) {
      wanted = explicit[1];
      text = text.slice(0, explicit.index);
    }
    const html = inline(text, opts);
    const plain = unesc(html.replace(/<[^>]+>/g, "")).trim();
    const id = !headings.length && level === 1 && opts.firstId ? opts.firstId : uniqueId(wanted || slug(plain), opts.ids);
    headings.push({ level, id, html, text: plain });
    const lv = Math.min(6, level + (opts.shift ?? 0));
    const anchor = opts.anchors === false ? "" : ` <a class="anchor" href="#${id}" aria-label="Link to this part">#</a>`;
    return `<h${lv} id="${id}">${html}${anchor}</h${lv}>`;
  };

  const list = (start: number, indent: number): { html: string; next: number } => {
    const first = LIST_RE.exec(lines[start])!;
    const ordered = /\d/.test(first[2]);
    const startAt = ordered ? parseInt(first[2], 10) : 1;
    const items: { text: string[]; sub: string }[] = [];
    let j = start;
    while (j < lines.length) {
      const line = lines[j];
      if (!line.trim()) {
        // (a blank line: the list goes on only if what comes next belongs to it)
        let k = j + 1;
        while (k < lines.length && !lines[k].trim()) k++;
        if (k >= lines.length) break;
        const m = LIST_RE.exec(lines[k]);
        const goesOn = m
          ? indentOf(lines[k]) > indent + 1 || (indentOf(lines[k]) >= indent && /\d/.test(m[2]) === ordered)
          : items.length > 0 && indentOf(lines[k]) > indent + 1;
        if (!goesOn) break;
        j = k;
        continue;
      }
      const m = LIST_RE.exec(line);
      if (m) {
        const ind = indentOf(line);
        if (ind < indent) break;
        if (ind > indent + 1 && items.length) {
          const sub = list(j, ind);
          items[items.length - 1].sub += sub.html;
          j = sub.next;
          continue;
        }
        if (/\d/.test(m[2]) !== ordered) break;
        items.push({ text: [m[3]], sub: "" });
        j++;
        continue;
      }
      // (more of the item's text: indented, or a plain line straight after it)
      if (items.length && (indentOf(line) > indent + 1 || !startsBlock(j)) && !items[items.length - 1].sub) {
        items[items.length - 1].text.push(line.trim());
        j++;
        continue;
      }
      break;
    }
    const tag = ordered ? "ol" : "ul";
    const body = items.map((it) => `<li>${inline(it.text.join("\n"), opts)}${it.sub}</li>`).join("\n");
    return { html: `<${tag}${ordered && startAt !== 1 ? ` start="${startAt}"` : ""}>\n${body}\n</${tag}>`, next: j };
  };

  const splitRow = (row: string) => {
    let r = row.trim();
    if (r.startsWith("|")) r = r.slice(1);
    if (r.endsWith("|") && !r.endsWith("\\|")) r = r.slice(0, -1);
    return r.split(/(?<!\\)\|/).map((c) => c.trim());
  };

  const table = (start: number): number => {
    const head = splitRow(lines[start]);
    const align = splitRow(lines[start + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "num" : ""));
    const cell = (tag: string, text: string, col: number) => `<${tag}${align[col] ? ` class="${align[col]}"` : ""}>${inline(text, opts)}</${tag}>`;
    const rows: string[] = [];
    let j = start + 2;
    while (j < lines.length && lines[j].trim() && lines[j].includes("|")) {
      const cells = splitRow(lines[j]);
      rows.push(`<tr>${head.map((_h, c) => cell("td", cells[c] ?? "", c)).join("")}</tr>`);
      j++;
    }
    out.push(`<div class="table"><table>\n<thead><tr>${head.map((h, c) => cell("th", h, c)).join("")}</tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table></div>`);
    return j;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    const fence = FENCE_RE.exec(line);
    if (fence) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code${fence[2] ? ` class="lang-${esc(fence[2])}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = HEADING_RE.exec(line);
    if (h) {
      flush();
      out.push(heading(h[1].length, h[2]));
      i++;
      continue;
    }
    if (HR_RE.test(line)) {
      flush();
      out.push("<hr>");
      i++;
      continue;
    }
    if (QUOTE_RE.test(line)) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) quoted.push(lines[i++].replace(/^\s{0,3}>\s?/, ""));
      out.push(`<blockquote>\n${renderMarkdown(quoted.join("\n"), { ...opts, firstId: undefined }).html}\n</blockquote>`);
      continue;
    }
    if (isTableAt(i)) {
      flush();
      i = table(i);
      continue;
    }
    if (LIST_RE.test(line)) {
      flush();
      const l = list(i, indentOf(line));
      out.push(l.html);
      i = l.next;
      continue;
    }
    para.push(line.trim() === line ? line : line.replace(/^\s+/, ""));
    i++;
  }
  flush();
  return { html: out.join("\n"), headings };
};

// ---------------------------------------------------------------------------------------------------------------
// The files, kept in memory
// ---------------------------------------------------------------------------------------------------------------

const sources = new Map<string, { mtime: number; text: string }>();

/** A file's text and modified time (read again only when it changed), or null when it isn't there. */
const readSource = (file: string): { text: string; mtime: number } | null => {
  let mtime: number;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    sources.delete(file);
    return null;
  }
  const hit = sources.get(file);
  if (hit && hit.mtime === mtime) return hit;
  try {
    const entry = { mtime, text: readFileSync(file, "utf8") };
    sources.set(file, entry);
    return entry;
  } catch (e) {
    logger.warn(`Guide: ${file} could not be read: ${e}`);
    return null;
  }
};

/** Only plain file names from the index (no folders, no way out of public/guide). */
const SAFE_FILE = /^[\w-][\w.-]*\.md$/;

interface Chapter {
  file: string;
  id: string;
  title: string;
  html: string;
  sections: MdHeading[];
}

interface Built {
  sig: string;
  etag: string;
  checkedAt: number;
  title: string;
  page: string;
  morePage: string;
  ids: Set<string>;
  chapterIds: Map<string, string>;
}

/** The index: its # title, the paragraphs before the list (the lead), and the chapters' files, in the list's order. */
const parseIndex = (text: string) => {
  const clean = text.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n");
  const title = /^#\s+(.+?)\s*#*\s*$/m.exec(clean)?.[1] ?? "The player guide";
  const files: string[] = [];
  for (const m of clean.matchAll(/\]\(\s*([^)\s#]+\.md)\s*\)/g)) if (SAFE_FILE.test(m[1]) && !files.includes(m[1]) && m[1] !== GUIDE_INDEX && m[1] !== RULES_FILE) files.push(m[1]);
  const lead: string[] = [];
  for (const block of clean.split(/\n\s*\n/)) {
    const b = block.trim();
    if (!b || b.startsWith("#")) continue;
    if (LIST_RE.test(b.split("\n")[0])) break;
    lead.push(b);
  }
  return { title, lead: lead.join("\n\n"), files };
};

/** A chapter's id, before any chapter is made (links between chapters need it): its # heading's {#id}, or its words. */
const chapterIdOf = (text: string, ids: Set<string>) => {
  const m = /^#\s+(.*?)\s*#*\s*$/m.exec(text.replace(/<!--[\s\S]*?-->/g, ""));
  const explicit = m && /\{#([\w-]+)\}\s*$/.exec(m[1]);
  const words = m ? m[1].replace(/\s*\{#[\w-]+\}\s*$/, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_\\]/g, "") : "chapter";
  return uniqueId(explicit ? explicit[1] : slug(words), ids);
};

/**
 * A link to a chapter's file becomes its anchor on the guide ("05-buildings.md#walls": "#walls"; `guide` is "/guide"
 * on the Rules page); "rules.md" the Rules page; anything else is left as it is.
 */
const chapterHref = (chapterIds: Map<string, string>, guide = "") => (href: string) => {
  const m = /^(?:\.\/)?([\w.-]+\.md)(#[\w-]+)?$/.exec(href);
  if (!m) return href;
  if (m[1] === RULES_FILE) return `/rules${m[2] ?? ""}`;
  if (m[1] === GUIDE_INDEX) return `${guide}${m[2] ?? "#contents"}`;
  if (m[2]) return `${guide}${m[2]}`;
  const id = chapterIds.get(m[1]);
  return `${guide}${id ? `#${id}` : "#contents"}`;
};

let guideBuilt: Built | null = null;

const buildGuide = (): Built | null => {
  const now = Date.now();
  if (guideBuilt && now - guideBuilt.checkedAt < CHECK_MS) return guideBuilt;
  const index = readSource(path.join(GUIDE_DIR, GUIDE_INDEX));
  if (!index) return null;
  const { title, lead, files } = parseIndex(index.text);
  const loaded = files.map((file) => ({ file, src: readSource(path.join(GUIDE_DIR, file)) })).filter((c) => c.src !== null);
  const sig = [`index:${index.mtime}`, ...loaded.map((c) => `${c.file}:${c.src!.mtime}`)].join("|");
  if (guideBuilt && guideBuilt.sig === sig) {
    guideBuilt.checkedAt = now;
    return guideBuilt;
  }

  const ids = new Set<string>(["contents", "top", "chapters"]);
  const chapterIds = new Map<string, string>();
  for (const c of loaded) chapterIds.set(c.file, chapterIdOf(c.src!.text, ids));
  const href = chapterHref(chapterIds);
  const chapters: Chapter[] = loaded.map((c) => {
    const r = renderMarkdown(c.src!.text, { ids, shift: 1, href, firstId: chapterIds.get(c.file) });
    const top = r.headings[0];
    return { file: c.file, id: chapterIds.get(c.file)!, title: top?.html ?? esc(c.file), html: r.html, sections: r.headings.filter((x) => x.level === 2) };
  });

  const toc = chapters
    .map(
      (c) =>
        `<li><a href="#${c.id}">${c.title}</a>${c.sections.length ? `<ol class="sub">${c.sections.map((s) => `<li><a href="#${s.id}">${s.html}</a></li>`).join("")}</ol>` : ""}</li>`
    )
    .join("\n");
  const body = chapters.map((c) => `<section class="chapter" aria-labelledby="${c.id}">\n${c.html}\n<p class="back"><a href="#contents">Contents</a></p>\n</section>`).join("\n\n");
  const leadHtml = lead ? renderMarkdown(lead, { ids: new Set(ids), href, anchors: false }).html : "";
  const plainTitle = unesc(inline(title, { ids: new Set() }).replace(/<[^>]+>/g, ""));
  const description = unesc(leadHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 200) || "The player guide of Inferno Map Room 2.";

  const parts = {
    title: plainTitle,
    description,
    h1: inline(title, { ids: new Set() }),
    lead: leadHtml,
    toc: `<nav class="toc" id="contents" aria-label="Contents">\n<h2>Contents</h2>\n<ol id="toc-list">\n${toc}\n</ol>\n<p class="note">Every heading has a link (#) to it, to share. Printing this page prints the whole guide.</p>\n</nav>`,
    body: `<div id="chapters">\n${body}\n</div>`,
    current: "guide" as const,
  };
  guideBuilt = {
    sig,
    etag: createHash("sha1").update(sig).digest("hex").slice(0, 20),
    checkedAt: now,
    title: plainTitle,
    page: pageHtml(parts),
    morePage: pageHtml({ ...parts, more: true }),
    ids,
    chapterIds,
  };
  logger.info(`Guide: made from ${chapters.length} chapters`);
  return guideBuilt;
};

let rulesBuilt: { sig: string; etag: string; checkedAt: number; page: string } | null = null;

const discordText = () => {
  const url = infernoOnlyConfig.community?.discordUrl ?? "";
  return /^https?:\/\//i.test(url) ? `[the server's Discord](${url})` : "the server's Discord";
};

const buildRules = () => {
  const now = Date.now();
  if (rulesBuilt && now - rulesBuilt.checkedAt < CHECK_MS) return rulesBuilt;
  const src = readSource(path.join(GUIDE_DIR, RULES_FILE));
  if (!src) return null;
  const sig = `${src.mtime}|${infernoOnlyConfig.community?.discordUrl ?? ""}`;
  if (rulesBuilt && rulesBuilt.sig === sig) {
    rulesBuilt.checkedAt = now;
    return rulesBuilt;
  }
  const text = src.text.replace(/\{\{discord\}\}/g, discordText());
  const ids = new Set<string>(["contents", "top"]);
  const r = renderMarkdown(text, { ids, shift: 0, href: chapterHref(buildGuide()?.chapterIds ?? new Map(), "/guide") });
  // (its # is the page's h1, and the paragraph under it the lead)
  const h1 = r.headings.find((x) => x.level === 1);
  let html = r.html.replace(/^<h1 id="[^"]*">[\s\S]*?<\/h1>\n?/, "");
  let lead = "";
  const firstPara = /^<p>[\s\S]*?<\/p>\n?/.exec(html);
  if (firstPara) {
    lead = firstPara[0].trim();
    html = html.slice(firstPara[0].length);
  }
  const sections = r.headings.filter((x) => x.level === 2);
  const title = h1?.text ?? "Rules";
  rulesBuilt = {
    sig,
    etag: createHash("sha1").update(sig).digest("hex").slice(0, 20),
    checkedAt: now,
    page: pageHtml({
      title,
      description: "The rules of Inferno Map Room 2: accounts, invites, automation, chat, moderators and appeals.",
      h1: h1?.html ?? "Rules",
      lead,
      toc: sections.length ? `<nav class="toc short" id="contents" aria-label="Contents"><ol>${sections.map((s) => `<li><a href="#${s.id}">${s.html}</a></li>`).join("")}</ol></nav>` : "",
      body: html,
      current: "rules",
    }),
  };
  return rulesBuilt;
};

// ---------------------------------------------------------------------------------------------------------------
// The page (the help pages' look: public/docs/faq.html)
// ---------------------------------------------------------------------------------------------------------------

/** What /guide/more adds: the chapters this player may read, asked for with the token after "#k=". */
const MORE_SCRIPT = `<script>
(function () {
  var m = /[#&]k=([^&]+)/.exec(location.hash || "");
  if (!m) return;
  var key = "";
  try { key = decodeURIComponent(m[1]); } catch (e) { return; }
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (!window.fetch) return;
  fetch("/guide/more", { method: "POST", credentials: "same-origin", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.html) return;
      var main = document.getElementById("chapters");
      var toc = document.getElementById("toc-list");
      if (main) main.insertAdjacentHTML("beforeend", j.html);
      if (toc && j.toc) toc.insertAdjacentHTML("beforeend", j.toc);
      var first = j.first && document.getElementById(j.first);
      if (first && first.scrollIntoView) first.scrollIntoView();
    })
    .catch(function () {});
})();
</script>`;

const NAV: [string, string, string][] = [
  ["faq", "/faq", "FAQ"],
  ["shiny", "/shiny", "Shiny"],
  ["schedule", "/schedule", "When things happen"],
  ["changes", "/changes", "Change Log"],
  ["guide", "/guide", "Player guide"],
  ["rules", "/rules", "Rules"],
  ["", "/", "Play"],
];

const pageHtml = (o: { title: string; description: string; h1: string; lead: string; toc: string; body: string; current: "guide" | "rules"; more?: boolean }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(o.current === "rules" ? `${o.title} - Inferno Map Room 2` : o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  <meta name="theme-color" content="#1a0503">
  <meta name="color-scheme" content="dark">
${o.more ? '  <meta name="robots" content="noindex">\n  <meta name="referrer" content="no-referrer">\n' : ""}  <!-- Made by the server from public/guide/*.md (server/src/controllers/guide.ts). The style is the help pages' (public/docs/faq.html). -->
  <style>
    @font-face { font-family: "Groboldov"; src: url("/web/fonts/groboldov.woff") format("woff"); font-display: swap; }
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
    body { margin: 0; min-height: 100vh; color: #f2dcc8; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(ellipse at 50% -10%, rgba(255, 90, 20, .24), transparent 65%), #0d0403; }
    .page { max-width: 820px; margin: 0 auto; padding: 20px 16px 40px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; }
    .top .home { font: 400 17px "Groboldov", Impact, sans-serif; color: #ffd8b0; text-decoration: none; text-shadow: 0 2px 0 #2d0602; }
    h1 { margin: 22px 0 10px; font: 400 clamp(28px, 6vw, 42px)/1.1 "Groboldov", Impact, sans-serif; letter-spacing: .3px;
      background: linear-gradient(#ffe9a0, #ff9a3a 55%, #e0401a); -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 2px 0 #2d0602); }
    h2 { margin: 30px 0 10px; font: 400 25px/1.2 "Groboldov", Impact, sans-serif; color: #ffb36b; text-shadow: 0 2px 0 #2d0602; }
    h3 { margin: 24px 0 8px; font: 400 19px/1.25 "Groboldov", Impact, sans-serif; color: #ffd8b0; text-shadow: 0 2px 0 #2d0602; }
    h4, h5, h6 { margin: 18px 0 6px; font-size: 16px; line-height: 1.35; color: #ffd8b0; }
    h1, h2, h3, h4 { scroll-margin-top: 12px; }
    p, ul, ol { margin: 0 0 12px; }
    ul, ol { padding-left: 22px; }
    li { margin: 0 0 5px; }
    li > ul, li > ol { margin: 5px 0 0; }
    a { color: #ffc27a; }
    a:hover { color: #ffe9a0; }
    strong { color: #ffe2c2; }
    code { font: 14px/1.4 ui-monospace, Menlo, Consolas, monospace; background: rgba(106, 36, 16, .45); border-radius: 4px; padding: 1px 5px; }
    pre { background: rgba(40, 8, 4, .72); border: 1px solid #6a2410; border-radius: 10px; padding: 12px 14px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0 0 12px; padding: 10px 14px; border-left: 3px solid #ff9a3a; background: rgba(40, 8, 4, .6); border-radius: 0 10px 10px 0; color: #e8c9ad; }
    blockquote p:last-child { margin-bottom: 0; }
    hr { border: 0; border-top: 1px solid #6a2410; margin: 24px 0; }
    .lead { color: #e8c9ad; }
    .note { font-size: 14px; color: #c9a98f; }
    .anchor { font: 400 15px system-ui, sans-serif; color: #8f5a3e; text-decoration: none; opacity: 0; margin-left: 4px; text-shadow: none; }
    h2:hover .anchor, h3:hover .anchor, h4:hover .anchor, .anchor:focus { opacity: 1; }
    @media (hover: none) { .anchor { opacity: .55; } }
    .toc { background: rgba(40, 8, 4, .72); border: 1px solid #6a2410; border-radius: 10px; padding: 6px 18px 4px; margin: 18px 0 8px; }
    .toc h2 { margin: 12px 0 8px; font-size: 20px; }
    .toc > ol { columns: 2 260px; column-gap: 28px; padding-left: 24px; }
    .toc > ol > li { break-inside: avoid; margin-bottom: 8px; }
    .toc .sub { list-style: none; padding-left: 0; margin: 3px 0 0; font-size: 14px; }
    .toc .sub li { display: inline; margin: 0; }
    .toc .sub li + li::before { content: " · "; color: #8f5a3e; }
    .toc .sub a { color: #d9a77c; }
    .toc.short { padding: 10px 18px; }
    .toc.short ol { columns: auto; margin: 0; }
    .chapter { border-top: 1px solid #6a2410; margin-top: 28px; }
    .back { margin-top: 16px; font-size: 14px; text-align: right; }
    .table { overflow-x: auto; margin: 0 0 12px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; background: rgba(40, 8, 4, .72); border: 1px solid #6a2410; border-radius: 10px; overflow: hidden; }
    th, td { text-align: left; vertical-align: top; padding: 9px 12px; border-top: 1px solid rgba(106, 36, 16, .7); }
    thead th { border-top: 0; background: rgba(106, 36, 16, .4); color: #ffd8b0; font-weight: 600; font-size: 14px; }
    .num { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #6a2410; font-size: 14px; color: #c9a98f; }
    footer nav { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 8px; }
    footer a[aria-current] { color: #f2dcc8; font-weight: 600; text-decoration: none; }
    @media (max-width: 480px) { th, td { padding: 8px 9px; } .toc { padding: 4px 13px 2px; } h2 { font-size: 22px; } }
    @media print {
      @page { margin: 16mm 14mm; }
      html { scroll-behavior: auto; }
      body { background: #fff; color: #111; font-size: 11pt; line-height: 1.45; }
      .page { max-width: none; padding: 0; }
      .top, footer nav, .anchor, .back, .toc .note { display: none; }
      h1 { color: #000; background: none; -webkit-text-fill-color: #000; filter: none; }
      h2, h3, h4 { color: #000; text-shadow: none; break-after: avoid; page-break-after: avoid; }
      a { color: #000; text-decoration: none; }
      strong, .lead, .note, footer { color: #111; }
      .toc, table, pre, blockquote { background: none; border-color: #999; }
      th, td { border-top-color: #bbb; }
      thead th { background: #eee; color: #000; }
      code { background: #eee; }
      .chapter { break-before: page; page-break-before: always; border: 0; margin-top: 0; }
      tr, li, blockquote, pre { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page" id="top">
    <header class="top">
      <a class="home" href="/">Inferno Map Room 2</a>
      <a href="/">Back to the game</a>
    </header>
    <main>
      <h1>${o.h1}</h1>
${o.lead ? `      <div class="lead">${o.lead}</div>\n` : ""}${o.toc}
${o.body}
    </main>
    <footer>
      <nav aria-label="Help pages">
${NAV.map(([id, href, label]) => `        <a href="${href}"${id === o.current ? ' aria-current="page"' : ""}>${label}</a>`).join("\n")}
      </nav>
      <p>Inferno Map Room 2, a Backyard Monsters Refitted server.</p>
    </footer>
  </div>
${o.more ? MORE_SCRIPT + "\n" : ""}</body>
</html>
`;

// ---------------------------------------------------------------------------------------------------------------
// The parts only some players read (src/guide-classified)
// ---------------------------------------------------------------------------------------------------------------

export interface PrivatePart {
  id: string;
  file: string;
  /** Has this player taken part? (Anything that fails: no.) */
  qualifies: (userid: number) => Promise<boolean>;
}

export const PRIVATE_PARTS: PrivatePart[] = [
  // the winter event: it has started for them
  { id: "hfo", file: "hfo.md", qualifies: async (userid) => (await readHfo(userid)) !== null },
  // the monthly one: as the trophy cabinet shows its totems (IoTerrainPopup.trophiesTab: the flag io_fmi, or a totem won)
  {
    id: "fmi",
    file: "fmi.md",
    qualifies: async (userid) => {
      const t = await readTrophies(userid);
      if ((t.fmi1 ?? 0) > 0 || (t.fmi2 ?? 0) > 0) return true;
      return fmiEnabled() && (await hfoFinalWaveWon(userid));
    },
  },
];

/** The parts this player may read, in order. */
export const privatePartsFor = async (userid: number): Promise<string[]> => {
  const out: string[] = [];
  for (const part of PRIVATE_PARTS) {
    const ok = await part.qualifies(userid).catch((e) => {
      logger.warn(`Guide: whether player #${userid} may read "${part.id}" could not be read: ${e}`);
      return false;
    });
    if (ok) out.push(part.id);
  }
  return out;
};

const renderPrivate = (partIds: string[]) => {
  const built = buildGuide();
  const ids = new Set<string>(built?.ids ?? []);
  const chapterIds = new Map<string, string>(built?.chapterIds ?? []);
  const href = chapterHref(chapterIds);
  const html: string[] = [];
  const toc: string[] = [];
  const shown: string[] = [];
  let first = "";
  for (const id of partIds) {
    const part = PRIVATE_PARTS.find((p) => p.id === id);
    const src = part && readSource(path.join(PRIVATE_DIR, part.file));
    if (!part || !src) continue;
    const chapterId = chapterIdOf(src.text, ids);
    const r = renderMarkdown(src.text, { ids, shift: 1, href, firstId: chapterId });
    const sections = r.headings.filter((x) => x.level === 2);
    html.push(`<section class="chapter" id="part-${part.id}" aria-labelledby="${chapterId}">\n${r.html}\n<p class="back"><a href="#contents">Contents</a></p>\n</section>`);
    toc.push(`<li><a href="#${chapterId}">${r.headings[0]?.html ?? esc(part.id)}</a>${sections.length ? `<ol class="sub">${sections.map((s) => `<li><a href="#${s.id}">${s.html}</a></li>`).join("")}</ol>` : ""}</li>`);
    shown.push(part.id);
    first ||= chapterId;
  }
  return { parts: shown, html: html.join("\n\n"), toc: toc.join("\n"), first };
};

// ---------------------------------------------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------------------------------------------

const sendPage = (ctx: Parameters<KoaController>[0], page: string, etag: string, cache: string) => {
  ctx.type = "text/html; charset=utf-8";
  ctx.set("Cache-Control", cache);
  ctx.status = Status.OK;
  if (etag) {
    ctx.etag = etag;
    if (ctx.fresh) {
      ctx.status = 304;
      return;
    }
  }
  ctx.body = page;
};

const missing = (ctx: Parameters<KoaController>[0], what: string) => {
  ctx.status = Status.NOT_FOUND;
  ctx.type = "text/plain; charset=utf-8";
  ctx.body = `${what} isn't on the server yet.`;
};

/** GET /guide */
export const guidePage: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  const built = buildGuide();
  if (!built) return missing(ctx, "The guide");
  sendPage(ctx, built.page, built.etag, "public, max-age=60");
};

/** GET /guide/more: the guide, and the script that asks for more with the token after #k= (never cached). */
export const guideMorePage: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  const built = buildGuide();
  if (!built) return missing(ctx, "The guide");
  sendPage(ctx, built.morePage, "", "no-store");
};

/** POST /guide/more (after verifyUserAuth): the chapters this player may read, or 403. */
export const guideMore: KoaController = async (ctx) => {
  ctx.set("Cache-Control", "no-store");
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  const user: User = ctx.authUser;
  const found = renderPrivate(await privatePartsFor(user.userid));
  if (!found.parts.length) {
    ctx.status = Status.FORBIDDEN;
    ctx.body = { error: "There is nothing more here for you yet." };
    return;
  }
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...found };
};

/** GET /rules */
export const rulesPage: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  const built = buildRules();
  if (!built) return missing(ctx, "The rules page");
  sendPage(ctx, built.page, built.etag, "public, max-age=60");
};

/** GET /whats-different (the login page's button and the game's guide links): on to the guide. */
export const whatsDifferentGuide: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  ctx.set("Cache-Control", "no-store");
  ctx.redirect("/guide");
};
