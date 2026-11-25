/**
 * (16 October, bug reports #96, #97) One request at a time for a yard that may be made on the spot: a wild monster
 * yard seen or attacked for the first time (or rebuilt after 12 hours) is looked for, made when it isn't there, and
 * stored with its map cell. Two loads of it at the same moment (the game's attack load sent again, two players) both
 * found nothing and both made one: the same yard twice, with two map cells (neither is unique by base id). The
 * attack then went on one copy and the takeover looked at the other, still undamaged: "failed unexpectedly", a 500.
 *
 * Now the requests for one yard queue here (this server is one process), so the second finds what the first made.
 */
const tails = new Map<string, Promise<void>>();
/** The longest a load waits for the one ahead of it. */
const WAIT_MS = 15_000;

export const withYardLock = async <T>(baseid: string, fn: () => Promise<T>): Promise<T> => {
  const key = String(baseid);
  const before = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((resolve) => (release = resolve));
  const tail = before.then(() => mine);
  tails.set(key, tail);
  // (22 October: a load ahead that never ends (a stuck database call) held every later load of that yard for good:
  // after 15 s the next goes ahead anyway)
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([before, new Promise<void>((resolve) => (timer = setTimeout(resolve, WAIT_MS)))]);
  if (timer) clearTimeout(timer);
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
};

/** (a test) yards with requests queued now */
export const yardLocksHeld = () => tails.size;
