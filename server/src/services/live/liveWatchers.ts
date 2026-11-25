import { postgres } from "../../server.js";
import { attackWatchers } from "../replays/liveAttacks.js";
import { hiddenPlayers } from "../user/presence.js";
import { readActivity } from "./liveActivity.js";
import { streamWatchersOf } from "./liveStream.js";

/**
 * Inferno-only (18 October, the user's: "when a player is being watched show a list of who is watching to the
 * player"): who watches a player now, for that player's game (attackwatch/status's `watchers`, every few seconds, and
 * at once when someone starts or stops watching their pictures: the Watch socket's on/off).
 *
 * Watchers of the player's pictures (the Watch socket's connections, services/live/liveStream.ts) and of the attack
 * they are making (those looking at its recording in the last few seconds: replays/live, liveAttacks.attackWatchers,
 * the defender of the yard too). Players appearing offline (Who's Online) aren't named: they are counted in "more".
 * At most NAMED are named; the rest are counted.
 */
const NAMED = 12;

export interface Watchers {
  names: string[];
  more: number;
}

export const watchersOf = async (uid: number): Promise<Watchers | null> => {
  const who = new Map<number, string>();
  for (const w of streamWatchersOf(uid)) if (w.uid !== uid) who.set(w.uid, w.name);
  const act = await readActivity(uid).catch(() => null);
  if (act?.key) for (const v of await attackWatchers(act.key)) if (v !== uid && !who.has(v)) who.set(v, "");
  if (!who.size) return null;
  const unnamed = [...who].filter(([, n]) => !n).map(([id]) => id);
  if (unnamed.length) {
    const rows = (await postgres.em
      .fork()
      .getConnection()
      .execute(`SELECT userid, username FROM bym."user" WHERE userid IN (${unnamed.map(() => "?").join(",")})`, unnamed, "all")) as { userid: number; username: string }[];
    for (const r of rows) who.set(Number(r.userid), String(r.username ?? ""));
  }
  const hidden = await hiddenPlayers().catch(() => new Set<number>());
  const names = [...who]
    .filter(([id, n]) => !hidden.has(id) && n)
    .map(([, n]) => n)
    .sort((a, b) => a.localeCompare(b));
  const more = who.size - Math.min(names.length, NAMED);
  return { names: names.slice(0, NAMED), more };
};
