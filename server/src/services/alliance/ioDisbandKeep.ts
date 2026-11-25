import { AllianceRole } from "../../enums/Alliance.js";
import { Status } from "../../enums/StatusCodes.js";
import { Alliance } from "../../database/models/alliance.model.js";
import { User } from "../../database/models/user.model.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { disconnectAllianceChat } from "../../chat/chatControl.js";
import { getWorldMapVersion } from "../maproom/knownWorlds.js";
import { tagOf } from "./allianceTag.js";
import { keepJoinPolicyFor, persistJoinPolicy } from "./ioJoinPolicy.js";

/**
 * Inferno-only (QoL #502): a disbanded alliance is kept for 14 days, and whoever disbanded it (its last member, its
 * leader) can restore it from the Alliance window, as it was.
 *
 * No migration: when the last member leaves (services/alliance/membership.ts removeAllianceMember), the alliance's
 * row and what hangs off it are copied, as JSON rows, into Redis (io:al:kept:<alliance id>, 14 days), with the player
 * who can restore it (io:al:keptby:<user id>). Then the row goes as before (its pins, feed, flags, power-ups and
 * outposts history with it, ON DELETE CASCADE). Restoring writes the rows back with their own ids (json_populate_*,
 * so every column comes back, whatever columns the tables have by then), and the player is its leader again.
 *
 * Kept: the alliance (name, tag, crest, shield, description, world, when it was made), the board's pins, its flags on
 * other alliances and theirs on it (those still there), its power-ups, the newest 300 lines of its feed (and 100 of
 * other alliances' about it) and the newest 500 outposts gained and lost. Gone at once: pending invites and join
 * requests (nobody can answer them). Gone after 14 days: all of it.
 */
export const KEEP_DAYS = 14;

const KEEP_SEC = KEEP_DAYS * 24 * 60 * 60;

const keptKey = (allianceId: number) => `io:al:kept:${allianceId}`;

const keptByKey = (userid: number) => `io:al:keptby:${userid}`;

const restoringKey = (allianceId: number) => `io:al:restoring:${allianceId}`;

interface KeptAlliance {
  id: number;
  /** who can restore it, and their name */
  by: number;
  by_name: string;
  /** when it was disbanded, and when the player had joined it (Unix seconds; 0 when not known) */
  at: number;
  joined_at: number;
  /** the rows, as row_to_json made them */
  alliance: Record<string, unknown>;
  pins: unknown[];
  relationships: unknown[];
  messages: unknown[];
  powerups: unknown[];
  outposts: unknown[];
}

const refuse = (message: string) => new ClientSafeError({ message, status: Status.CONFLICT, data: {}, isClientFriendly: true });

/** A query that answers one JSON text column `j` ("[]" when the table can't be read). */
const json = async (sql: string, params: unknown[], fallback: string): Promise<unknown> => {
  try {
    const rows = (await postgres.em.getConnection().execute(sql, params)) as { j: string | null }[];
    return JSON.parse(String(rows[0]?.j ?? fallback));
  } catch (err) {
    logger.warn(`Alliance keep: a table could not be read (${err})`);
    return JSON.parse(fallback);
  }
};

const rowsOf = (table: string, where: string, order = "", limit = 0) =>
  `SELECT COALESCE(json_agg(t), '[]'::json)::text AS j FROM (SELECT * FROM bym.${table} WHERE ${where}${order ? ` ORDER BY ${order}` : ""}${limit ? ` LIMIT ${limit}` : ""}) t`;

/**
 * The last member is leaving: the alliance and its rows go to Redis for 14 days. Called before the row is removed.
 *
 * @param {Alliance} alliance - The alliance being disbanded.
 * @param {User} user - Its last member, who can restore it.
 */
export const ioKeepDisbanded = async (alliance: Alliance, user: User): Promise<void> => {
  const id = alliance.id;
  const row = (await json(`SELECT row_to_json(a)::text AS j FROM bym.alliance a WHERE a.id = ?`, [id], "null")) as Record<string, unknown> | null;
  if (!row) return;
  const joined = (await postgres.em
    .getConnection()
    .execute(`SELECT floor(extract(epoch FROM alliance_joined_at)) AS j FROM bym."user" WHERE userid = ?`, [user.userid])
    .catch(() => [])) as { j: string | number | null }[];
  const kept: KeptAlliance = {
    id,
    by: user.userid,
    by_name: user.username,
    at: Math.floor(Date.now() / 1000),
    joined_at: Number(joined[0]?.j) || 0,
    alliance: row,
    pins: (await json(rowsOf("alliance_pin", "alliance_id = ?"), [id], "[]")) as unknown[],
    relationships: (await json(rowsOf("alliance_relationship", "alliance_id = ? OR target_alliance_id = ?"), [id, id], "[]")) as unknown[],
    messages: [
      ...((await json(rowsOf("alliance_message", "alliance_id = ?", "id DESC", 300), [id], "[]")) as unknown[]),
      ...((await json(rowsOf("alliance_message", "target_alliance_id = ? AND alliance_id <> ?", "id DESC", 100), [id, id], "[]")) as unknown[]),
    ],
    powerups: (await json(rowsOf("alliance_powerup", "alliance_id = ?"), [id], "[]")) as unknown[],
    outposts: (await json(rowsOf("alliance_outpost_event", "alliance_id = ?", "id DESC", 500), [id], "[]")) as unknown[],
  };
  await redis.set(keptKey(id), JSON.stringify(kept), "EX", String(KEEP_SEC));
  await redis.set(keptByKey(user.userid), String(id), "EX", String(KEEP_SEC));
  // (its join policy lapses with it, unless it is restored)
  await keepJoinPolicyFor(id, KEEP_SEC);
  logger.info(`Alliance ${id} (${alliance.name}) disbanded by ${user.username}: kept ${KEEP_DAYS} days for restoring.`);
};

const readKept = async (userid: number): Promise<KeptAlliance | null> => {
  const id = Number(await redis.get(keptByKey(userid)).catch(() => null)) || 0;
  if (id <= 0) return null;
  try {
    const kept = JSON.parse(String((await redis.get(keptKey(id)).catch(() => null)) ?? "null")) as KeptAlliance | null;
    return kept && kept.id === id && kept.by === userid ? kept : null;
  } catch {
    return null;
  }
};

/**
 * What the Alliance window shows a player in no alliance who disbanded one in the last 14 days: { alliance_id, name,
 * tag, at, until } (Unix seconds), or null.
 */
export const ioKeptFor = async (userid: number) => {
  const kept = await readKept(userid);
  if (!kept) return null;
  const name = String(kept.alliance.name ?? "");
  return {
    alliance_id: kept.id,
    name,
    tag: tagOf({ name, tag: (kept.alliance.tag as string | null) ?? null }),
    at: kept.at,
    until: kept.at + KEEP_SEC,
    days: KEEP_DAYS,
  };
};

/** Writes kept rows back into a table (those that fit: an alliance on the other side that is gone keeps them out). */
const putBack = async (table: string, rows: unknown[], check = ""): Promise<number> => {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  try {
    const done = (await postgres.em
      .getConnection()
      .execute(`INSERT INTO bym.${table} SELECT r.* FROM json_populate_recordset(NULL::bym.${table}, ?::json) r${check ? ` WHERE ${check}` : ""} ON CONFLICT DO NOTHING RETURNING 1 AS n`, [JSON.stringify(rows)])) as unknown[];
    return done.length;
  } catch (err) {
    logger.warn(`Alliance restore: ${table} not put back (${err})`);
    return 0;
  }
};

const exists = (column: string) => `EXISTS (SELECT 1 FROM bym.alliance x WHERE x.id = r.${column})`;

/**
 * Restores the alliance the player disbanded, with them as its leader again (and their join date). Refused when they
 * are in an alliance, when there is none to restore, when another alliance has taken its name since, or when their
 * yard is now on another Map Room version.
 *
 * @param {User} user - The player who disbanded it.
 * @returns {Promise<{ id: number; name: string }>} The alliance restored.
 */
export const ioRestoreKept = async (user: User): Promise<{ id: number; name: string }> => {
  if (user.alliance_id) throw refuse("Leave your alliance first: you can lead only one.");
  const kept = await readKept(user.userid);
  if (!kept) throw refuse(`There is no alliance to restore: a disbanded alliance is kept for ${KEEP_DAYS} days.`);
  const id = kept.id;
  const name = String(kept.alliance.name ?? "");

  // (one restore at a time: a double click, or two tabs)
  if ((await redis.set(restoringKey(id), "1", "EX", "30", "NX").catch(() => null)) !== "OK") throw refuse("That alliance is being restored already.");
  try {
    const taken = (await postgres.em
      .getConnection()
      .execute(`SELECT id FROM bym.alliance WHERE id = ? OR lower(name) = lower(?) LIMIT 1`, [id, name])) as { id: number }[];
    if (taken.length) throw refuse(`Another alliance is called ${name} now, so it can't be restored. You can make a new one.`);

    await postgres.em.populate(user, ["save"], { fields: ["save.worldid"] });
    const worldid = user.save?.worldid;
    const mapVersion = worldid ? await getWorldMapVersion(worldid) : undefined;
    if (mapVersion !== undefined && Number(kept.alliance.map_version ?? mapVersion) !== mapVersion) {
      throw refuse(`${name} was on another version of the map than your yard is now, so it can't be restored.`);
    }

    // (its row with its own id, the player as its leader, in one transaction)
    // (16 October, QoL #174: an alliance kept before officer_perms existed: none, rather than a NULL the column refuses)
    const row = { officer_perms: {}, ...kept.alliance, leader_userid: user.userid, leader_name: user.username };
    if (row.officer_perms == null) row.officer_perms = {};
    await postgres.em.transactional(async (em) => {
      const ctx = em.getTransactionContext();
      await em.getConnection().execute(`INSERT INTO bym.alliance SELECT * FROM json_populate_record(NULL::bym.alliance, ?::json)`, [JSON.stringify(row)], "run", ctx);
      const moved = await em.nativeUpdate(User, { userid: user.userid, alliance_id: null }, { alliance_id: id, alliance_role: AllianceRole.LEADER });
      if (moved !== 1) throw refuse("You have joined an alliance meanwhile.");
      if (kept.joined_at > 0) {
        await em.getConnection().execute(`UPDATE bym."user" SET alliance_joined_at = to_timestamp(?) WHERE userid = ?`, [kept.joined_at, user.userid], "run", ctx);
      } else {
        await em.getConnection().execute(`UPDATE bym."user" SET alliance_joined_at = now() WHERE userid = ?`, [user.userid], "run", ctx);
      }
    });
    user.alliance_id = id;
    user.alliance_role = AllianceRole.LEADER;

    await redis.del(keptKey(id)).catch(() => 0);
    await redis.del(keptByKey(user.userid)).catch(() => 0);
    await persistJoinPolicy(id);

    // (what hangs off it, as far as it still fits)
    await putBack("alliance_pin", kept.pins);
    await putBack("alliance_relationship", kept.relationships, `${exists("alliance_id")} AND ${exists("target_alliance_id")}`);
    await putBack("alliance_message", kept.messages, `${exists("alliance_id")} AND (r.target_alliance_id IS NULL OR ${exists("target_alliance_id")})`);
    await putBack("alliance_powerup", kept.powerups);
    await putBack("alliance_outpost_event", kept.outposts);

    // (a player already in chat moves into the alliance's channel)
    await disconnectAllianceChat(user.userid);
    logger.info(`Alliance ${id} (${name}) restored by ${user.username}.`);
    return { id, name };
  } finally {
    await redis.del(restoringKey(id)).catch(() => 0);
  }
};
