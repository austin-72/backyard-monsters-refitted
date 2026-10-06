import { readFileSync, statSync } from "fs";
import path from "path";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";

/**
 * Inferno-only (4 October): the game's Changelog window (the top bar's Changelog button, IoChangelog.as) reads
 * every change ever made, day by day, from here. It is public/docs/changelog.json, read again whenever the file
 * changes, so a new version is published by replacing the file (no restart, no new game build).
 *
 * The file: { title, updated, entries: [{ date: "YYYY-MM-DD", headline, items: [{ area, title, text }] }] },
 * newest date first. Players read it: Hell Freezes Over stays "[ CLASSIFIED ]" there.
 */
export const CHANGELOG_FILE = path.join("public", "docs", "changelog.json");

let cached: { mtime: number; body: unknown } | null = null;

export const changelog: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  try {
    const mtime = statSync(CHANGELOG_FILE).mtimeMs;
    if (!cached || cached.mtime !== mtime) {
      cached = { mtime, body: JSON.parse(readFileSync(CHANGELOG_FILE, "utf8")) };
    }
  } catch {
    ctx.status = Status.OK;
    ctx.body = { error: "The changelog isn't on the server yet." };
    return;
  }
  ctx.set("Cache-Control", "no-store");
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(cached.body as object) };
};
