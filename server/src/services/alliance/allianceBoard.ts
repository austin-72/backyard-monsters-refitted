import { Filter as BadWords } from "bad-words";

import { AllianceMessageType } from "../../enums/Alliance.js";
import { Status } from "../../enums/StatusCodes.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import type { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { worldNames } from "../leaderboards/gameLeaderboards.js";
import { announceShout } from "./allianceMessages.js";

/**
 * Inferno-only: the alliance board (the Alliances window's Board tab, the user's design of 2 October).
 * The leader and officers pin messages: a title, words, and (if they like) a place on the map, which the
 * game can jump to on the player's own world. At most MAX_PINS at once; each is kept PIN_DAYS days. A new
 * pin is also said in Alliance chat, its place a clickable [map:x,y:tag] token.
 */

export const MAX_PINS = 50;
export const PIN_DAYS = 30;
const TITLE_MAX = 80;
const BODY_MAX = 600;
const COORD_MAX = 999;

const filter = new BadWords();

const sql = <T>(query: string, params: unknown[] = []) => postgres.em.getConnection().execute<T[]>(query, params);

const boardErr = (message: string) => new ClientSafeError({ message, status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });

interface PinRow {
  id: number;
  author_id: number | null;
  author_name: string;
  title: string;
  body: string;
  x: number | null;
  y: number | null;
  world_id: string | null;
  sort: number;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

/** The world's short tag, as the game's map tokens carry it (IoMapSnapshot.worldTag). */
export const worldTag = (worldId: string | null | undefined) => (worldId ? worldId.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6) : "");

/** The world a player's main yard is on (their own map: where a pin's Jump goes). */
export const playerWorld = async (userid: number): Promise<string | null> =>
  (await sql<{ worldid: string | null }>(`SELECT worldid FROM bym.save WHERE userid = ? AND type = 'main' LIMIT 1`, [userid]))[0]?.worldid ?? null;

// The Board tab's unread count: when each player last opened the board (seconds), kept in Redis.
const seenKey = (userid: number) => `alliance-pins-seen:${userid}`;
const SEEN_KEEP = 60 * 60 * 24 * (PIN_DAYS + 5);

export const markPinsSeen = async (userid: number) => {
  try {
    await redis.set(seenKey(userid), String(Math.floor(Date.now() / 1000)));
    await redis.expire(seenKey(userid), SEEN_KEEP);
  } catch {
    // (only the badge is lost)
  }
};

/** Pins put up by someone else since the player last opened the board. */
export const unreadPins = async (allianceId: number, userid: number) => {
  let seen = 0;
  try {
    seen = Number((await redis.get(seenKey(userid))) ?? 0) || 0;
  } catch {
    seen = 0;
  }
  const rows = await sql<{ n: string }>(
    `SELECT count(*) AS n FROM bym.alliance_pin
      WHERE alliance_id = ? AND expires_at > now() AND created_at > to_timestamp(?) AND author_id IS DISTINCT FROM ?`,
    [allianceId, seen, userid]
  );
  return Number(rows[0]?.n ?? 0);
};

const cleanText = (value: unknown, max: number) =>
  filter.clean(String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, " ").trim().slice(0, max)).trim();

/** The board, top first (expired pins removed as it is read). */
export const listPins = async (allianceId: number) => {
  await sql(`DELETE FROM bym.alliance_pin WHERE alliance_id = ? AND expires_at < now()`, [allianceId]);
  const rows = await sql<PinRow>(
    `SELECT * FROM bym.alliance_pin WHERE alliance_id = ? ORDER BY sort ASC, created_at DESC LIMIT ?`,
    [allianceId, MAX_PINS]
  );
  const names = await worldNames([...new Set(rows.map((r) => r.world_id).filter((w): w is string => !!w))]);
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    body: r.body,
    x: r.x,
    y: r.y,
    world_id: r.world_id,
    world_name: r.world_id ? names.get(r.world_id) ?? "" : "",
    author_id: r.author_id,
    author: r.author_name,
    created: Math.floor(new Date(r.created_at).getTime() / 1000),
    updated: Math.floor(new Date(r.updated_at).getTime() / 1000),
    expires: Math.floor(new Date(r.expires_at).getTime() / 1000),
  }));
};

/**
 * Pins something new (no id), or changes a pin. A place needs both x and y; it is on the author's world
 * unless the game names another (a pin made from the map is on the map's world).
 */
export const savePin = async (
  user: User,
  allianceId: number,
  input: { id?: unknown; title?: unknown; body?: unknown; x?: unknown; y?: unknown; world?: unknown }
) => {
  const title = cleanText(input.title, TITLE_MAX);
  const body = cleanText(input.body, BODY_MAX);
  if (!title) throw boardErr("Give the pin a title.");
  const hasPlace = input.x !== undefined && input.x !== null && input.x !== "" && input.y !== undefined && input.y !== null && input.y !== "";
  let x: number | null = null;
  let y: number | null = null;
  let worldId: string | null = null;
  if (hasPlace) {
    x = Math.round(Number(input.x));
    y = Math.round(Number(input.y));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > COORD_MAX || y > COORD_MAX) throw boardErr("Those coordinates are not on the map.");
    const wanted = typeof input.world === "string" && /^[0-9a-zA-Z-]{1,64}$/.test(input.world) ? input.world : null;
    worldId = wanted ?? (await playerWorld(user.userid));
  }
  const id = Number(input.id);
  if (Number.isSafeInteger(id) && id > 0) {
    const changed = await sql<{ id: number }>(
      `UPDATE bym.alliance_pin SET title = ?, body = ?, x = ?, y = ?, world_id = ?, updated_at = now()
        WHERE id = ? AND alliance_id = ? AND expires_at > now() RETURNING id`,
      [title, body, x, y, worldId, id, allianceId]
    );
    if (!changed.length) throw boardErr("That pin is no longer on the board.");
    return { id };
  }
  await sql(`DELETE FROM bym.alliance_pin WHERE alliance_id = ? AND expires_at < now()`, [allianceId]);
  const count = Number((await sql<{ n: string }>(`SELECT count(*) AS n FROM bym.alliance_pin WHERE alliance_id = ?`, [allianceId]))[0]?.n ?? 0);
  if (count >= MAX_PINS) throw boardErr(`The board is full (${MAX_PINS} pins). Remove one first.`);
  const top = Number((await sql<{ s: number | null }>(`SELECT min(sort) AS s FROM bym.alliance_pin WHERE alliance_id = ?`, [allianceId]))[0]?.s ?? 1);
  const rows = await sql<{ id: number }>(
    `INSERT INTO bym.alliance_pin (alliance_id, author_id, author_name, title, body, x, y, world_id, sort, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now() + interval '${PIN_DAYS} days') RETURNING id`,
    [allianceId, user.userid, user.username, title, body, x, y, worldId, top - 1]
  );
  // Said in Alliance chat: the title, and the place as a token the chat makes clickable.
  const token = x !== null && y !== null ? ` [map:${x},${y}${worldTag(worldId) ? `:${worldTag(worldId)}` : ""}]` : "";
  await announceShout({ allianceId, author: user, type: AllianceMessageType.PINNED, body: `${title}${token}` });
  return { id: Number(rows[0].id) };
};

export const deletePin = async (allianceId: number, id: unknown) => {
  const pin = Number(id);
  if (!Number.isSafeInteger(pin) || pin <= 0) throw boardErr("That pin is no longer on the board.");
  await sql(`DELETE FROM bym.alliance_pin WHERE id = ? AND alliance_id = ?`, [pin, allianceId]);
};

/** Moves a pin one place up or down the board (it swaps with its neighbour). */
export const movePin = async (allianceId: number, id: unknown, dir: unknown) => {
  const pins = await listPins(allianceId);
  const at = pins.findIndex((p) => p.id === Number(id));
  if (at < 0) throw boardErr("That pin is no longer on the board.");
  const to = dir === "down" ? at + 1 : at - 1;
  if (to < 0 || to >= pins.length) return;
  const order = pins.map((p) => p.id);
  [order[at], order[to]] = [order[to], order[at]];
  for (const [i, pinId] of order.entries()) {
    await sql(`UPDATE bym.alliance_pin SET sort = ? WHERE id = ? AND alliance_id = ?`, [i, pinId, allianceId]);
  }
};
