/**
 * Inferno-only: monsters that must be unlocked in the Strongbox by everyone, with no one keeping an
 * unlock from before (migration 20260925_RelockChampions): Korath (IC9), Drull (IC10) and Rezghul (C19).
 * Ashkarr (IC24, added 27 September) is guarded the same way: nobody had her before, so the migration has
 * nothing of hers to take, but a save still can't mark her unlocked without the Strongbox.
 *
 * The game keeps unlocks in the save's `lockerdata` ({t: 1} while unlocking, {t: 2} unlocked) and sends
 * the whole block with every save. So that a game left open from before the relock (or a changed one)
 * cannot hand them back, a save may only mark one of these unlocked when the stored data already had
 * its unlock under way or done, or when the same save buys an instant unlock with shiny (store item
 * "IUN", one monster per purchase). Starting an unlock ({t: 1}) is always accepted: the game charges for it.
 */
export const RELOCKED_MONSTERS = ["IC9", "IC10", "C19", "IC24"] as const;

const UNLOCKED = 2;
const UNLOCKING = 1;

type LockerData = Record<string, { t?: number | string } & Record<string, unknown>>;

/** The store item the game buys for an instant unlock (CREATURELOCKERPOPUP.InstantUnlock). */
export const INSTANT_UNLOCK_ITEM = "IUN";

/**
 * Rimegrave (IC25), the ice champion of Hell Freezes Over (services/events/hfo.ts): he can't even be started
 * in the Strongbox until the player has won all 13 waves (`rimegraveFree`). Before that, any entry of his in a
 * save that the stored data didn't already have is put back as it was.
 */
export const EVENT_LOCKED_MONSTER = "IC25";

/**
 * Returns the locker data to store: `incoming`, except that an unlock of a relocked monster that was
 * never started is replaced by what was stored. `instantUnlocks` is how many instant unlocks the same
 * save pays for. `onRefused` is told each monster refused. `rimegraveFree`: Rimegrave may be unlocked.
 */
export const guardLockerData = (incoming: unknown, stored: unknown, onRefused?: (id: string) => void, instantUnlocks = 0, rimegraveFree = false): unknown => {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return incoming;

  const next = incoming as LockerData;
  const before = (stored && typeof stored === "object" ? stored : {}) as LockerData;

  if (!rimegraveFree && next[EVENT_LOCKED_MONSTER] && Number(next[EVENT_LOCKED_MONSTER]?.t) !== Number(before[EVENT_LOCKED_MONSTER]?.t)) {
    if (before[EVENT_LOCKED_MONSTER]) next[EVENT_LOCKED_MONSTER] = before[EVENT_LOCKED_MONSTER];
    else delete next[EVENT_LOCKED_MONSTER];
    onRefused?.(EVENT_LOCKED_MONSTER);
  }

  for (const id of RELOCKED_MONSTERS) {
    if (Number(next[id]?.t) !== UNLOCKED) continue;

    const was = Number(before[id]?.t);
    if (was === UNLOCKING || was === UNLOCKED) continue;
    if (instantUnlocks > 0) {
      instantUnlocks--;
      continue;
    }

    if (before[id]) next[id] = before[id];
    else delete next[id];
    onRefused?.(id);
  }

  return next;
};
