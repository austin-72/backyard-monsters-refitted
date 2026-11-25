import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

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
export const RELOCKED_MONSTERS = ["IC9", "IC10", "C19", "IC24", "IC32"] as const;

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
 * The Basilisk (IC32, 13 October, the user's): hidden until the player has won 200 battles (the quest book's
 * attack_win counter: services/events/basilisk.ts), guarded as Rimegrave is (and, being relocked, unlocked in the
 * Strongbox only).
 */
export const BASILISK_ID = "IC32";

/**
 * (18 October, SUSPECTED-BUGS.md: "Relocked champions can be unlocked for 1 Shiny, or for free") What the
 * Strongbox asks for these, worked out as the game does (CREATURELOCKER: 2.5 times King Wormzer's unlock for the
 * champions, 1.5 times for Rezghul; the times divided by the server's divisor, config buildTimeDivisor), so that:
 *  - an instant unlock (IUN) costs what the game's button says (the time's Shiny plus the putty's), not what the
 *    request says (IUN is bought by amount: 1 Shiny unlocked Korath);
 *  - an unlock started ({t: 1}) is timed by the server: its start is kept beside the game's (`ios`, unix seconds),
 *    and it may finish ({t: 2}) once the least time it can take has passed: its time over UNLOCK_MOST_SPEED (the
 *    Strongbox overdrive), less the hours bought off it (Reduce by 1 or 2 hours, kept as `ioc`) and the "Close
 *    enough" minutes; or sooner when the same save pays at least the "Finish now" price of the least time left (SP4 or
 *    IUN). Before this, {t: 1} then {t: 2} on the next save unlocked it at once.
 */
const WORMZER_UNLOCK = { putty: 4_915_200, seconds: 259_200 };
const UNLOCK_SHARE: Record<string, number> = { IC9: 2.5, IC10: 2.5, IC24: 2.5, IC32: 2.5, C19: 1.5 };
/** The Strongbox overdrive takes 4 more seconds off for each one that passes (CREATURELOCKER.Tick). */
const UNLOCK_MOST_SPEED = 5;
/** What the game's price may differ by (its numbers rounded on the way, a flag a little off): paid is taken at this share. */
const PRICE_ROOM = 0.9;

export const unlockOf = (id: string) => {
  const share = UNLOCK_SHARE[id];
  if (!share) return null;
  const divisor = Math.max(1, Number(infernoOnlyConfig.buildTimeDivisor) || 1);
  const putty = Math.floor(WORMZER_UNLOCK.putty * share);
  const seconds = Math.max(1, Math.ceil(Math.floor(WORMZER_UNLOCK.seconds * share) / divisor));
  return { putty, seconds };
};

/** The game's "Finish now" price for this much time left (STORE.GetTimeCost, Inferno-only). */
export const finishNowShiny = (seconds: number) => {
  const p = infernoOnlyConfig.prices;
  if (seconds <= (Number(p.closeEnoughMinutes) || 0) * 60) return 0;
  return Math.ceil(Number(p.finishNowFirstHour) + Number(p.finishNowPerHour) * Math.max(0, seconds / 3600 - 1));
};

/** The Strongbox's "Unlock instantly" price (CREATURELOCKERPOPUP: the time's price plus the putty's). */
export const instantUnlockShiny = (id: string) => {
  const u = unlockOf(id);
  if (!u) return 0;
  return finishNowShiny(u.seconds) + Math.ceil(Math.pow(Math.sqrt(u.putty / 2), 0.75));
};

/** What a save pays towards the Strongbox: its one purchase, read for the items that unlock or speed up. */
export interface UnlockPay {
  /** Shiny paid for an instant unlock (IUN) or a "Finish now" (SP4). */
  instant: number;
  finish: number;
  /** Seconds bought off (Reduce by 1 hour, by 2 hours). */
  cut: number;
}

export const unlockPayOf = (purchase: unknown): UnlockPay => {
  const pay: UnlockPay = { instant: 0, finish: 0, cut: 0 };
  if (!Array.isArray(purchase)) return pay;
  const item = String(purchase[0] ?? "");
  const q = Math.max(0, Math.floor(Number(purchase[1]) || 0));
  if (item === INSTANT_UNLOCK_ITEM) pay.instant = q;
  else if (item === "SP4") pay.finish = q;
  else if (item === "SP2") pay.cut = q * 3600;
  else if (item === "SP3") pay.cut = q * 7200;
  return pay;
};

/**
 * Returns the locker data to store: `incoming`, except that an unlock of a relocked monster that was
 * never started, or not paid for, or finished sooner than it can be, is replaced by what was stored. `pay` is what
 * the same save pays towards the Strongbox (unlockPayOf). `onRefused` is told each monster refused.
 * `rimegraveFree`: Rimegrave may be unlocked.
 */
export const guardLockerData = (
  incoming: unknown,
  stored: unknown,
  onRefused?: (id: string, why?: string) => void,
  pay: UnlockPay = { instant: 0, finish: 0, cut: 0 },
  rimegraveFree = false,
  basiliskFree = false,
  now = Math.floor(Date.now() / 1000),
): unknown => {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return incoming;

  const next = incoming as LockerData;
  const before = (stored && typeof stored === "object" ? stored : {}) as LockerData;

  for (const [id, free] of [[EVENT_LOCKED_MONSTER, rimegraveFree], [BASILISK_ID, basiliskFree]] as const) {
    if (!free && next[id] && Number(next[id]?.t) !== Number(before[id]?.t)) {
      if (before[id]) next[id] = before[id];
      else delete next[id];
      onRefused?.(id, "not free yet");
    }
  }

  let instantLeft = pay.instant;
  const putBack = (id: string, why: string) => {
    if (before[id]) next[id] = before[id];
    else delete next[id];
    onRefused?.(id, why);
  };

  for (const id of RELOCKED_MONSTERS) {
    const t = Number(next[id]?.t);
    const was = Number(before[id]?.t);
    const unlock = unlockOf(id);

    if (t === UNLOCKING && next[id]) {
      // (the server's own start, and the hours bought off it, kept beside the game's numbers)
      const entry = next[id] as Record<string, unknown>;
      if (was === UNLOCKING) {
        const ios = Number(before[id]?.ios);
        if (Number.isFinite(ios) && ios > 0) entry.ios = ios;
        entry.ioc = (Number(before[id]?.ioc) || 0) + pay.cut;
      } else {
        entry.ios = now;
        entry.ioc = 0;
      }
      continue;
    }
    if (t !== UNLOCKED) continue;
    if (was === UNLOCKED) continue;

    if (was === UNLOCKING) {
      if (!unlock) continue;
      // (unlocks begun before the server timed them: from the start the game gave)
      const start = Number(before[id]?.ios) || Number(before[id]?.s) || 0;
      if (!(start > 0)) continue;
      const cut = (Number(before[id]?.ioc) || 0) + pay.cut;
      const least = start + Math.ceil(unlock.seconds / UNLOCK_MOST_SPEED) - cut;
      const closeEnough = (Number(infernoOnlyConfig.prices.closeEnoughMinutes) || 0) * 60;
      if (now >= least - closeEnough) continue;
      const price = finishNowShiny(least - now);
      const paid = Math.max(pay.finish, instantLeft);
      if (paid >= Math.floor(price * PRICE_ROOM)) {
        if (paid === instantLeft) instantLeft = 0;
        continue;
      }
      putBack(id, `finished ${least - now} s before it can be, ${paid} Shiny paid of ${price}`);
      continue;
    }

    // (never started: an instant unlock, at the Strongbox's price)
    const price = instantUnlockShiny(id);
    if (instantLeft > 0 && instantLeft >= Math.floor(price * PRICE_ROOM)) {
      instantLeft = 0;
      continue;
    }
    putBack(id, instantLeft > 0 ? `an instant unlock for ${instantLeft} Shiny (${price})` : "never started");
  }

  return next;
};
