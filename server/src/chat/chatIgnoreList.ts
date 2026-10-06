import { postgres, redis } from "../server.js";
import { chatIgnoreKey } from "./chatChannels.js";
import { ErrorCode, send, ServerMessageType } from "./chatProtocol.js";
import { type ChatClient } from "./chatState.js";

/** At most this many players on one ignore list. */
export const MAX_IGNORED = 100;

type IgnoreAction = "show" | "sync" | "add" | "remove";

/** Usernames of the given user ids (those that exist). */
const namesOf = async (ids: string[]): Promise<Map<string, string>> => {
  const wanted = ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  const names = new Map<string, string>();
  if (!wanted.length) return names;
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(
      `SELECT userid, username FROM bym."user" WHERE userid IN (${wanted.map(() => "?").join(",")})`,
      wanted
    );
  for (const row of rows) names.set(String(row.userid), row.username);
  return names;
};

/** A player by username (any capitals), or null. */
const findByName = async (name: string): Promise<{ userid: number; username: string } | null> => {
  const clean = name.trim().replace(/^@/, "").replace(/^\[\d+\]\s*/, "");
  if (!clean || clean.length > 64) return null;
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(
      `SELECT userid, username FROM bym."user" WHERE lower(username) = lower(?) ORDER BY userid LIMIT 1`,
      [clean]
    );
  return rows[0] ?? null;
};

/**
 * Sends a client their ignore list, each entry with the player's name (so the game can list them without
 * having seen them speak). `action` says why: "sync" (at login: applied quietly), "show" (/list), or the
 * change just made ("add", "remove", with the player it was about).
 *
 * @param {ChatClient} client - The client to send the list to.
 */
export const sendIgnoreList = async (client: ChatClient, action: IgnoreAction = "show", target?: { id: string; name: string }) => {
  const targets = await redis.smembers(chatIgnoreKey(client.userId));
  const names = await namesOf(targets);

  send(client.ws, {
    type: ServerMessageType.IgnoreList,
    list: targets.map((id) => ({ target: id, displayname: names.get(id) ?? "" })),
    action,
    ...(target && { target: target.id, targetName: target.name }),
  });
};

/**
 * Resolves who an ignore / unignore is about: by user id, or (Inferno-only, the /ignore command) by name.
 * Answers the client with an error and returns null when there is no such player.
 */
const resolveTarget = async (client: ChatClient, targetId?: string, targetName?: string): Promise<{ id: string; name: string } | null> => {
  if (typeof targetName === "string" && targetName.trim()) {
    const found = await findByName(targetName);
    if (!found) {
      send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: targetName.trim().slice(0, 64) });
      return null;
    }
    return { id: String(found.userid), name: found.username };
  }
  const id = String(targetId ?? "").trim();
  if (!/^\d{1,10}$/.test(id) || Number(id) <= 0) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: id.slice(0, 16) });
    return null;
  }
  const name = (await namesOf([id])).get(id);
  if (!name) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.UserNotFound, name: id });
    return null;
  }
  return { id, name };
};

/**
 * Adds a player to a client's ignore list (not themselves; at most MAX_IGNORED), then echoes the list back.
 *
 * @param {ChatClient} client - The client doing the ignoring.
 * @param {string} targetId - The user id to ignore.
 * @param {string} targetName - Or their name.
 */
export const addIgnore = async (client: ChatClient, targetId?: string, targetName?: string) => {
  const target = await resolveTarget(client, targetId, targetName);
  if (!target) return;
  if (Number(target.id) === client.userId) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.CannotIgnoreSelf });
    return;
  }
  const key = chatIgnoreKey(client.userId);
  if (!(await redis.sismember(key, target.id)) && (await redis.scard(key)) >= MAX_IGNORED) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.IgnoreListFull });
    return;
  }
  await redis.sadd(key, target.id);
  await sendIgnoreList(client, "add", target);
};

/**
 * Removes a player from a client's ignore list, then echoes the list back.
 *
 * @param {ChatClient} client - The client doing the unignoring.
 * @param {string} targetId - The user id to stop ignoring.
 * @param {string} targetName - Or their name.
 */
export const removeIgnore = async (client: ChatClient, targetId?: string, targetName?: string) => {
  const target = await resolveTarget(client, targetId, targetName);
  if (!target) return;
  const key = chatIgnoreKey(client.userId);
  if (!(await redis.sismember(key, target.id))) {
    send(client.ws, { type: ServerMessageType.Error, code: ErrorCode.NotIgnored, name: target.name });
    return;
  }
  await redis.srem(key, target.id);
  await sendIgnoreList(client, "remove", target);
};
