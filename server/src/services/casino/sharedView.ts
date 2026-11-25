/**
 * Inferno-only (9 October, the user's: "Make gambling not slow the server down for other users"): what every
 * player watching a shared game sees alike (Balthazar's Ascent, the Magma Derby, a Devil's Dice table, the Live
 * tab), read from the database once for all of them for a moment instead of once for each.
 *
 * Every player in one of these polls it about once a second, and each poll read the round, its history and its
 * bets: twenty players watching made a hundred reads a second of the same rows. Now the first poll reads them and
 * the others in the next `ms` get the same (only what is the player's own, their bet and balance, is still read
 * for each). A write made here to what a view shows (a bet, a cash-out, a round moved on) throws it away
 * (`changed`), so a player always sees their own bet straight away.
 */
interface Entry {
  at: number;
  gen: number;
  value?: unknown;
  loading?: Promise<unknown>;
}

const views = new Map<string, Entry>();
const gens = new Map<string, number>();

const genOf = (key: string) => gens.get(key.split(":")[0]) ?? 0;

/** The view `key` (its game before the first ":"), read by `load` at most once every `ms` for everyone. */
export const sharedView = async <T>(key: string, ms: number, load: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const gen = genOf(key);
  const e = views.get(key);
  if (e && e.gen === gen) {
    if (e.loading) return e.loading as Promise<T>;
    if (now - e.at < ms) return e.value as T;
  }
  const entry: Entry = { at: now, gen };
  const loading = load().then(
    (v) => {
      if (views.get(key) === entry) {
        entry.value = v;
        entry.loading = undefined;
        // (read while it was changed: kept, but not for the next poll)
        if (genOf(key) !== gen) views.delete(key);
      }
      return v;
    },
    (err) => {
      if (views.get(key) === entry) views.delete(key);
      throw err;
    },
  );
  entry.loading = loading;
  views.set(key, entry);
  return loading;
};

/** What the game's views show has changed (a bet, a cash-out, a round moved on): read afresh next time. */
export const changed = (game: string) => {
  gens.set(game, (gens.get(game) ?? 0) + 1);
  for (const k of views.keys()) if (k === game || k.startsWith(game + ":")) views.delete(k);
};
