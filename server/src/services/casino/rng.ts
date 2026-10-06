import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Provably fair numbers for the Brimstone Pit.
 *
 * A player has a secret server seed (only its SHA-256 hash is shown before play), a client seed they
 * may choose, and a nonce counting their bets. A bet's numbers are the bytes of
 *   HMAC_SHA256(key = server seed, message = "<client seed>:<nonce>:<block>")
 * for block 0, 1, 2, ... taken four at a time: each group of four bytes makes a number in [0, 1)
 * (b0 / 256 + b1 / 256^2 + b2 / 256^3 + b3 / 256^4). Once the server seed is rotated out it is shown,
 * and anyone can recompute every past bet from it.
 */

/** A fresh secret server seed (64 hex characters). */
export const newServerSeed = (): string => randomBytes(32).toString("hex");

/** A fresh client seed (the player may replace it). */
export const newClientSeed = (): string => randomBytes(8).toString("hex");

/** The hash of a server seed, shown before play. */
export const hashSeed = (seed: string): string => createHash("sha256").update(seed).digest("hex");

/** An endless stream of numbers in [0, 1) for one bet. */
export interface FairStream {
  /** The next number in [0, 1). */
  next(): number;
  /** A whole number from 0 to n - 1, each as likely. */
  int(n: number): number;
  /** How many numbers have been drawn. */
  readonly used: number;
}

export const fairStream = (serverSeed: string, clientSeed: string, nonce: number): FairStream => {
  let block = 0;
  let bytes: Buffer = Buffer.alloc(0);
  let at = 0;
  let used = 0;
  const refill = () => {
    bytes = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${block}`).digest();
    block++;
    at = 0;
  };
  const next = () => {
    if (at + 4 > bytes.length) refill();
    const f = bytes[at] / 256 + bytes[at + 1] / 256 ** 2 + bytes[at + 2] / 256 ** 3 + bytes[at + 3] / 256 ** 4;
    at += 4;
    used++;
    return f;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    get used() {
      return used;
    },
  };
};

/**
 * Shiny are whole, but a win of stake x multiplier often is not (1.5x on 1 Shiny is 1.5): the whole part
 * is paid, and one more Shiny with the chance of what is left over (0.5: half the time), decided by `u`,
 * a number from the bet's own stream. Every bet, however small, then returns exactly what its table says
 * on average, where rounding down would keep the part for the house.
 */
export const wholeShiny = (amount: number, u: number): number => {
  const whole = Math.floor(amount + 1e-9);
  const part = Math.max(0, Math.round((amount - whole) * 1e6) / 1e6);
  return whole + (u < part ? 1 : 0);
};

/**
 * What a win of `amount` on a shared round (Ascent, Derby) pays in whole Shiny: the part of a Shiny paid
 * with its chance, the number drawn from the round's seed with the bet's id as the client seed (checkable
 * once the seed is shown).
 */
export const roundPayout = (roundSeed: string, betId: string | number, amount: number) => wholeShiny(amount, fairStream(roundSeed, `pay:${betId}`, 0).next());

/**
 * A stream from Math.random for simulations only (scripts/casino-rtp.ts): never for a real bet.
 */
export const simulationStream = (random: () => number = Math.random): FairStream => {
  let used = 0;
  return {
    next: () => {
      used++;
      return random();
    },
    int: (n: number) => {
      used++;
      return Math.floor(random() * n);
    },
    get used() {
      return used;
    },
  };
};
