import type { Save } from "../../../database/models/save.model.js";
import { redis } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";

/**
 * (13 October) What every move of a main yard keeps to (relocate anywhere, move onto an outpost, a random move, an
 * alliance member's invite): one at a time per player, and none while the main yard is being attacked. Only
 * /base/relocate kept to them: a move onto an outpost or a random one ran away mid-attack, and an invite accepted
 * twice at once left the old world twice.
 */

/** An attack on the main yard this recent is still running (its saves are taken for 30 minutes). */
export const MOVE_ATTACK_WINDOW = 30 * 60;

export const mainYardUnderAttack = (save: Save): boolean => {
  const last = save.attacks?.at(-1);
  return !!save.attackid && !!last && getCurrentDateTime() - (last.starttime ?? 0) < MOVE_ATTACK_WINDOW;
};

/**
 * Runs `fn` holding the player's move lock (the one /base/relocate takes); `refuse` makes the error if held (`busy`
 * its message). (18 October: takeovers hold it too: two at once were paid once, and one outpost dropped out of the
 * player's list.)
 */
export const withMoveLock = async <T>(userid: number, refuse: (message: string) => Error, fn: () => Promise<T>, busy = "Already relocating. Please wait a moment."): Promise<T> => {
  const lock = `relocate:${userid}`;
  if ((await redis.set(lock, "1", "EX", "60", "NX")) !== "OK") throw refuse(busy);
  try {
    return await fn();
  } finally {
    await redis.del(lock).catch(() => 0);
  }
};
