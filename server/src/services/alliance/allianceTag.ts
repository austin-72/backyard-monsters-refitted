import { postgres } from "../../server.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";

/**
 * Inferno-only (13 October): an alliance's tag, shown in brackets before its members' names in chat ("[ABC] Name").
 * Its leader sets it in the alliance's edit form; until then (bym.alliance.tag NULL) it is the first 3 letters or
 * digits of the name, so it follows a rename. 1 to 5 letters or digits.
 */
export const TAG_MIN = 1;
export const TAG_MAX = 5;
const TAG_CHARS = /^[\p{L}\p{N}]+$/u;

/** The default tag: the name's first 3 letters or digits (its first character if it has none). */
export const defaultTag = (name: string): string => {
  const chars = [...String(name ?? "")].filter((c) => /[\p{L}\p{N}]/u.test(c));
  return (chars.length ? chars : [...String(name ?? "").trim()]).slice(0, 3).join("") || "?";
};

/** The tag shown: the one set, or the default. */
export const tagOf = (alliance: { name: string; tag?: string | null }): string =>
  alliance.tag && alliance.tag.trim() ? alliance.tag.trim() : defaultTag(alliance.name);

/** A tag the leader typed: trimmed, 1 to 5 letters or digits, or a message the player can act on. */
export const parseTag = (raw: unknown): string => {
  const tag = String(raw ?? "").trim();
  const n = [...tag].length;
  const refuse = (message: string) => new ClientSafeError({ message, status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
  if (n < TAG_MIN) throw refuse("The alliance tag needs at least 1 character.");
  if (n > TAG_MAX) throw refuse(`The alliance tag can be at most ${TAG_MAX} characters.`);
  if (!TAG_CHARS.test(tag)) throw refuse("The alliance tag can only have letters and numbers.");
  return tag;
};

export interface MemberTag {
  allianceId: number;
  tag: string;
}

/** Each player's alliance and its tag (none for a player with no alliance): one query. */
export const tagsOfUsers = async (userIds: number[]): Promise<Map<number, MemberTag>> => {
  const ids = [...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))];
  const out = new Map<number, MemberTag>();
  if (!ids.length) return out;
  const rows = await postgres.em
    .getConnection()
    .execute<{ userid: number; id: number; name: string; tag: string | null }[]>(
      `SELECT u.userid, a.id, a.name, a.tag FROM bym."user" u JOIN bym.alliance a ON a.id = u.alliance_id
        WHERE u.userid IN (${ids.map(() => "?").join(",")})`,
      ids
    );
  for (const r of rows) out.set(Number(r.userid), { allianceId: Number(r.id), tag: tagOf(r) });
  return out;
};

/**
 * The column and the chat line kind a rename writes, made if missing (migration 20261101_AllianceTag does the same):
 * a production server runs its migrations by hand, and an alliance edit with neither would fail.
 */
export const ensureAllianceTag = async (): Promise<void> => {
  const conn = postgres.em.getConnection();
  await conn.execute(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS tag varchar(5) NULL`);
  // (16 October, QoL #174: what officers may do, migration 20261107_OfficerPerms: the Alliance entity reads it, so
  // every alliance request would fail without it)
  await conn.execute(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS officer_perms jsonb NOT NULL DEFAULT '{}'::jsonb`);
  const [c] = await conn.execute<{ def: string }[]>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'alliance_message_type_check'`
  );
  // (15 October, QoL #180: and a power-up ending or charged, migration 20261106_PowerupState)
  if (c && !/powerup_state/.test(c.def)) {
    await conn.execute(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check`);
    await conn.execute(`ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
      ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
       'powerup_purchase', 'pinned', 'officer', 'renamed', 'powerup_state'))`);
  }
};
