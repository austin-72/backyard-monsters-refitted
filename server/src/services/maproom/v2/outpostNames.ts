import { postgres } from "../../../server.js";

/**
 * Inferno-only (QoL #326, 15 October): a short name or tag a player gives each of their outposts, seen by nobody
 * else: the Outposts list, the outpost's map popup and the map sidebar's Outposts tab show it.
 *
 * Kept in the player's own row, `user.stats` (a JSON column nothing else writes) under `ioOutpostNames`:
 * { "<outpost baseid>": "name" }. No new column: written with one jsonb update, so anything else kept there stays.
 * A name goes when the outpost does (abandonOutpost.ts; others are dropped when the player next names one).
 */

export const OUTPOST_NAME_MAX = 20;

/** At most this many names are kept (more outposts than that keep their coordinates only). */
const MAX_NAMES = 2000;

export class OutpostNameError extends Error {}

/** A name as typed: one line of plain text, no markup, at most OUTPOST_NAME_MAX characters ("" removes it). */
export const cleanOutpostName = (name: unknown) =>
  String(name ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f<>&"]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, OUTPOST_NAME_MAX);

/** The player's outpost names, { baseid: name } (read from the database, so it is never a stale copy). */
export const outpostNames = async (userid: number): Promise<Record<string, string>> => {
  const rows = await postgres.em
    .getConnection()
    .execute<{ names: unknown }[]>(`SELECT stats -> 'ioOutpostNames' AS names FROM bym."user" WHERE userid = ?`, [userid]);
  const names = rows[0]?.names;
  if (!names || typeof names !== "object" || Array.isArray(names)) return {};
  const out: Record<string, string> = {};
  for (const [id, name] of Object.entries(names as Record<string, unknown>)) {
    if (typeof name === "string" && name) out[id] = name;
  }
  return out;
};

const write = async (userid: number, names: Record<string, string>) => {
  await postgres.em
    .getConnection()
    .execute(
      `UPDATE bym."user" SET stats = jsonb_set(CASE WHEN jsonb_typeof(stats) = 'object' THEN stats ELSE '{}'::jsonb END, '{ioOutpostNames}', ?::jsonb) WHERE userid = ?`,
      [JSON.stringify(names), userid]
    );
};

/**
 * Names (or with "" un-names) one of the player's outposts. `owned` is the main save's outposts list
 * ([x, y, baseid]): only those can be named, and names of outposts no longer there are dropped.
 */
export const setOutpostName = async (userid: number, owned: [number, number, string | number][], baseid: string, name: unknown) => {
  const ids = new Set((owned ?? []).filter(Array.isArray).map((entry) => String(entry[2])));
  if (!baseid || !ids.has(baseid)) throw new OutpostNameError("That outpost is not yours.");

  const cleaned = cleanOutpostName(name);
  const names = await outpostNames(userid);
  for (const id of Object.keys(names)) if (!ids.has(id)) delete names[id];
  if (cleaned) {
    if (!names[baseid] && Object.keys(names).length >= MAX_NAMES) throw new OutpostNameError("You have named too many outposts.");
    names[baseid] = cleaned;
  } else {
    delete names[baseid];
  }
  await write(userid, names);
  return cleaned;
};

/** Drops one outpost's name (it has gone). Never fails the caller. */
export const forgetOutpostName = async (userid: number, baseid: string) => {
  try {
    await postgres.em
      .getConnection()
      .execute(
        `UPDATE bym."user" SET stats = jsonb_set(stats, '{ioOutpostNames}', (stats -> 'ioOutpostNames') - ?::text) WHERE userid = ? AND jsonb_typeof(stats -> 'ioOutpostNames') = 'object'`,
        [String(baseid), userid]
      );
  } catch {
    // a name left behind is harmless (dropped on the next rename)
  }
};
