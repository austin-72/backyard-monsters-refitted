import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import { logger } from "../utils/logger.js";

/**
 * Inferno-only (23 October, the user's: "something is still wrong with some assets ... Cloudflare caches the assets
 * too. Force reloading doesn't appear to help"): every picture's own version, from its content.
 *
 * The game asked for its pictures with one version for them all, ?v=<InfernoOnlyConfig.assetVersion>, kept by browsers
 * and the CDN for a year (middleware/corsCacheControlSetup.ts). Nobody raised it when pictures were replaced (the
 * store's and the power-ups' new art, the Champion Statue's 48-frame strip), so the old ones stayed: in the browser and
 * at Cloudflare, which a reload doesn't reach.
 *
 * Now the server reads public/assets itself: each file's hash (the first 10 hex of its SHA-1), and a version of the
 * whole (the hash of all of them). The game asks for a picture with its own hash (/assetmap: the list) or, before the
 * list has come, the whole's version (the io_assetmap flag), so a replaced file is a new address at once, by itself,
 * with nothing to remember; a file that didn't change keeps its address and stays cached.
 *
 * The folder is looked at again at most every RESCAN_MS when asked: a file whose size and time are the same keeps its
 * hash (not read again), so a delta's pictures count without a restart.
 */

const ROOT = path.resolve("public/assets");
const RESCAN_MS = 60_000;
/** Compressed copies the server keeps beside text files, and the list itself: not pictures. */
const SKIP = /\.(br|gz)$/;

interface Entry {
  size: number;
  mtime: number;
  hash: string;
}

let files = new Map<string, Entry>();
let version = "";
let body = "";
let scannedAt = 0;

const walk = (dir: string, rel: string, out: string[]) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r, out);
    else if (e.isFile() && !SKIP.test(e.name)) out.push(r);
  }
};

/** The folder read (again): new and changed files hashed, gone ones dropped; the whole's version and list made. */
export const scanAssets = (): void => {
  const started = Date.now();
  const names: string[] = [];
  walk(ROOT, "", names);
  names.sort();
  const next = new Map<string, Entry>();
  let hashed = 0;
  for (const rel of names) {
    try {
      const info = statSync(path.join(ROOT, rel));
      const old = files.get(rel);
      if (old && old.size === info.size && old.mtime === info.mtimeMs) {
        next.set(rel, old);
        continue;
      }
      const hash = createHash("sha1").update(readFileSync(path.join(ROOT, rel))).digest("hex").slice(0, 10);
      next.set(rel, { size: info.size, mtime: info.mtimeMs, hash });
      hashed++;
    } catch {
      // (gone while read: left out)
    }
  }
  const whole = createHash("sha1");
  const list: Record<string, string> = {};
  for (const [rel, e] of next) {
    whole.update(`${rel}:${e.hash}\n`);
    list[rel] = e.hash;
  }
  const changed = hashed > 0 || next.size !== files.size;
  files = next;
  version = whole.digest("hex").slice(0, 10);
  body = JSON.stringify({ error: 0, v: version, files: list });
  scannedAt = Date.now();
  if (changed) logger.info(`Pictures: ${files.size} files, version ${version} (${hashed} hashed in ${Date.now() - started} ms).`);
};

const fresh = () => {
  if (!scannedAt || Date.now() - scannedAt > RESCAN_MS) scanAssets();
};

/** A file's hash ("shop/drone.png"), or null. */
export const assetHash = (rel: string): string | null => {
  fresh();
  return files.get(rel)?.hash ?? null;
};

/** The version of them all. */
export const assetMapVersion = (): string => {
  fresh();
  return version;
};

/** The list the game reads: { v, files: { "shop/drone.png": "1a2b3c4d5e", ... } }. */
export const assetMapBody = (): string => {
  fresh();
  return body;
};
