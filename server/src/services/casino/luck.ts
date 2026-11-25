import { casinoConfig } from "../../config/CasinoConfig.js";
import type { postgres } from "../../server.js";
import type { FairStream } from "./rng.js";

type Em = typeof postgres.em;

/**
 * Inferno-only (8 October, the user's): luck, a silent stat (config `luck`; never sent to the game). It comes
 * from the player's whole Pit history: what every settled bet paid them less what they staked, all games, all
 * time (a free spin's win counts as a gain; open and refunded bets don't count). Down: luck from the config's
 * table, more the further down (35% from 2,500 down). Even or ahead: none, and nothing is drawn differently.
 */
// (9 October: read from casino_net, the sum the database keeps as bets are written (migration 20261023_CasinoPitNet);
// summing the ledger on every bet read every bet the player had ever made, and slowed the whole server)
export const pitNet = async (em: Em, userid: number): Promise<number> => {
  const rows = (await em.getConnection().execute(
    `SELECT net FROM bym.casino_net WHERE user_id = ?`,
    [userid], "all", em.getTransactionContext())) as { net: string }[];
  return Number(rows[0]?.net ?? 0) || 0;
};

/** The luck for being `deficit` Shiny down (config `luck.table`, in a straight line between its rows). */
export const luckForDeficit = (deficit: number): number => {
  const table = casinoConfig.luck?.table ?? [];
  if (!(deficit > 0) || !table.length) return 0;
  const last = table[table.length - 1];
  if (deficit >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [d1, l1] = table[i];
    if (deficit <= d1) {
      const [d0, l0] = table[i - 1];
      return d1 > d0 ? l0 + ((l1 - l0) * (deficit - d0)) / (d1 - d0) : l1;
    }
  }
  return last[1];
};

/** The luck for a bet with this history (whatever its size: the user's, 8 October). */
export const luckOf = (net: number, _stake = 0): number => {
  if (!casinoConfig.luck?.enabled || !(net < 0)) return 0;
  return Math.max(0, Math.min(1, luckForDeficit(-net)));
};

/** The player's luck for a bet of `stake`, read inside the bet's transaction. */
export const luckFor = async (em: Em, userid: number, stake: number): Promise<number> => luckOf(await pitNet(em, userid), stake);

/**
 * Whether luck steps in: a number from the bet's own stream under `luck`. Nothing is drawn when there is no
 * luck, so a player who is not down has every bet drawn exactly as the Fairness tab says.
 */
export const luckRoll = (luck: number, rng: FairStream): boolean => luck > 0 && rng.next() < luck;

/** The same for a step taken without the bet's stream (a pile opened in Bone Pile). */
export const luckRollFree = (luck: number): boolean => luck > 0 && Math.random() < luck;
