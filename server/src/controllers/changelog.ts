import { readFileSync, statSync } from "fs";
import path from "path";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";

/**
 * Inferno-only (4 October): the game's Changelog window (the top bar's Changelog button, IoChangelog.ts) reads
 * every change ever made, day by day, from here. It is public/docs/changelog.json, read again whenever the file
 * changes, so a new version is published by replacing the file (no restart, no new game build).
 *
 * The file: { title, updated, entries: [{ date: "YYYY-MM-DD", headline, items: [{ area, title, text, later? }] }] },
 * newest date first. Players read it: Hell Freezes Over stays "[ CLASSIFIED ]" there.
 *
 * (Inferno-only, QoL #649) `later`, optional, on an item a later change undid or changed: the date of that change,
 * "YYYY-MM-DD", or { date, note } with a few words on what changed. The item's own text stays as it was written;
 * the game's Change Log and the changelog page (public/docs/changelog.html) show "Changed later, see 13 Oct" under it.
 */
export const CHANGELOG_FILE = path.join("public", "docs", "changelog.json");

let cached: { mtime: number; body: unknown } | null = null;

interface Entry {
  date?: string;
  headline?: string;
  items?: unknown[];
}

/**
 * Entries of the same date as one day (QoL #292, 14 October: 11, 10 and 7 October each showed as two days): the
 * headlines joined, the items of the first entry first.
 */
export const mergeDays = (body: { entries?: Entry[] }) => {
  if (!Array.isArray(body?.entries)) return body;
  const out: Entry[] = [];
  const byDate = new Map<string, Entry>();
  for (const e of body.entries) {
    const day = e && typeof e.date === "string" ? byDate.get(e.date) : undefined;
    if (!day) {
      const copy = { ...e, items: [...(e?.items ?? [])] };
      out.push(copy);
      if (e && typeof e.date === "string") byDate.set(e.date, copy);
      continue;
    }
    if (e.headline && e.headline !== day.headline) day.headline = day.headline ? `${day.headline} · ${e.headline}` : e.headline;
    day.items = [...(day.items ?? []), ...(e.items ?? [])];
  }
  return { ...body, entries: out };
};

/**
 * Inferno-only (22 October): the topics the Change Log's readers pick from (the game's window and the page): the
 * areas players think of together, so "my yard" or "fighting" is one choice instead of four tags. Every area an
 * item may have is in exactly one; a new area belongs here too. `name` is English (the page's); the game shows
 * "io_cl_topic_<id>" in the player's language.
 */
export const CHANGELOG_TOPICS: { id: string; name: string; areas: string[] }[] = [
  { id: "yard", name: "Yard & buildings", areas: ["Yard", "Buildings", "Brimstone Pit", "Economy"] },
  { id: "battles", name: "Monsters & battles", areas: ["Battles", "Monsters", "Pets", "Replays"] },
  { id: "map", name: "Map & outposts", areas: ["Map", "Outposts"] },
  { id: "hellgate", name: "Hellgate & Depths", areas: ["Hellgate", "Depths"] },
  { id: "events", name: "Events & games", areas: ["Events", "Quests", "Arcade", "Leaderboards", "D.A.V.E. Club"] },
  { id: "social", name: "Alliances & chat", areas: ["Alliances", "Chat"] },
  { id: "screens", name: "Screens & sign-in", areas: ["Interface", "Browser", "Signing in", "Server"] },
  { id: "fixes", name: "Fixes", areas: ["Fixes"] },
];

export const changelog: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) {
    ctx.status = Status.NOT_FOUND;
    return;
  }
  try {
    const mtime = statSync(CHANGELOG_FILE).mtimeMs;
    if (!cached || cached.mtime !== mtime) {
      cached = { mtime, body: mergeDays(JSON.parse(readFileSync(CHANGELOG_FILE, "utf8"))) };
    }
  } catch {
    ctx.status = Status.OK;
    ctx.body = { error: "The changelog isn't on the server yet." };
    return;
  }
  ctx.set("Cache-Control", "no-store");
  ctx.status = Status.OK;
  ctx.body = { error: 0, topics: CHANGELOG_TOPICS, ...(cached.body as object) };
};
