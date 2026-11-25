import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "../utils/logger.js";

/**
 * Inferno-only (14 October, the user's): the chat's emotes, a D.A.V.E. Club perk (free; the Club is open to every
 * player here). A line carries them as tokens, [e:id]; the game draws each as its picture (client IoEmotes). The ids
 * are the game's own list, public/assets/chat/emotes.json (made with the art: art/emotes/emotes.py).
 */
export const MAX_EMOTES = 5;

const TOKEN = /\[e:([a-z0-9]{1,16})\]/g;

let known: Set<string> | null = null;

/** The emotes the game has (read once; none if the list is missing, and then tokens are left as text). */
export const emoteIds = (): Set<string> => {
  if (known) return known;
  try {
    const list = JSON.parse(readFileSync(resolve("public/assets/chat/emotes.json"), "utf8")) as { id: string }[];
    known = new Set(list.map((e) => String(e.id)));
  } catch (err) {
    logger.warn(`Chat: the emote list was not read: ${err}`);
    known = new Set();
  }
  return known;
};

/** A line's emotes kept (known ones, at most 5); unknown or extra tokens taken out. */
export const sanitizeEmotes = (body: string): string => {
  if (!body.includes("[e:")) return body;
  const ids = emoteIds();
  if (!ids.size) return body;
  let n = 0;
  return body
    .replace(TOKEN, (all, id: string) => (ids.has(id) && n++ < MAX_EMOTES ? all : ""))
    .replace(/\s{2,}/g, " ")
    .trim();
};
