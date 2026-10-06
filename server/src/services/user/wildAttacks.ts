import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";

/**
 * Inferno-only wild tribe attacks (config wildAttacks). The game keeps each yard's attack history in
 * that yard's save (`aiattacks`, `lastattack` in seconds), but the limit is one attack a day per
 * player, so the game is told the latest start on any of the player's yards (flag io_wildlast).
 *
 * Read on every base load and updatesaved poll, so it is cached for a minute per player: a new attack
 * is saved by the game that started it, which already knows about it.
 */
const CACHE_MS = 60_000;
const cache = new Map<number, { at: number; value: number }>();

export const lastWildAttack = async (user: User): Promise<number> => {
  const now = Date.now();
  const hit = cache.get(user.userid);
  if (hit && now - hit.at < CACHE_MS) return hit.value;

  let last = 0;
  const saves = await postgres.em.fork().find(Save, { userid: user.userid }, { fields: ["aiattacks"] });
  for (const save of saves) {
    let history: any = save.aiattacks;
    if (typeof history === "string") {
      try {
        history = JSON.parse(history);
      } catch {
        history = null;
      }
    }
    const value = Number(history?.lastattack ?? 0);
    if (Number.isFinite(value) && value > last) last = value;
  }
  cache.set(user.userid, { at: now, value: last });
  if (cache.size > 20_000) cache.clear();
  return last;
};
