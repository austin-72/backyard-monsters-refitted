import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { hfoFinalWaveWon } from "../events/hfo.js";
import { acceptedInvites, INVITE_UNLOCKS, inviteLockText, invitesForLooks } from "../user/referrals.js";

/**
 * Inferno-only (10 October): the D.A.V.E. Club's ground for the main yard. Every ground the game has can be
 * chosen: the overworld's four, the Inferno's lava, the outposts' and wild yards' eight (the map cells' grounds),
 * and Hell Freezes Over's frozen ground once the player has won its last wave (wave 13). Kept on the main save
 * (bym.save.io_terrain) and sent with every load of that yard (io_terrain), so visitors and attackers see it too.
 * The game's names and pictures: com/monsters/subscriptions/IoTerrainPopup.ts.
 */

export const TERRAINS = [
  "lava",
  "hell_land1", "hell_land2", "hell_land3", "hell_land4", "hell_land5", "hell_land6", "hell_sand1", "hell_sand2",
  "grass", "rock", "sand", "crater",
  "hfo_frozen",
  "io_ashfall", "io_obsidian", "io_soulfire",
] as const;

/** Grounds that need Hell Freezes Over's last wave won. */
export const HFO_TERRAINS = new Set<string>(["hfo_frozen"]);

export class TerrainError extends Error {}

export const terrainEnabled = () => infernoOnlyConfig.enabled;

/** The ground chosen for a main yard (by its owner), or null (the yard's own). */
export const terrainOf = async (userid: number): Promise<string | null> => {
  if (!terrainEnabled() || !userid) return null;
  const rows = (await postgres.em.getConnection().execute(`SELECT io_terrain FROM bym.save WHERE userid = ? AND type = ? LIMIT 1`, [userid, BaseType.MAIN])) as { io_terrain: string | null }[];
  const t = rows[0]?.io_terrain ?? null;
  return t && (TERRAINS as readonly string[]).includes(t) ? t : null;
};

/**
 * What the window may offer this player: every ground, the frozen one once wave 13 is won, and the invite grounds
 * (12 October: Ashfall, Obsidian Glass, Soulfire Rift) once 1, 2 and 3 friends have joined through their link.
 */
export const terrainsFor = async (userid: number): Promise<string[]> => {
  const hfo = await hfoFinalWaveWon(userid).catch(() => false);
  const invites = await invitesForLooks(userid).catch(() => 0);
  return TERRAINS.filter((t) => (hfo || !HFO_TERRAINS.has(t)) && invites >= (INVITE_UNLOCKS.grounds[t] ?? 0));
};

/** Chooses the main yard's ground ("lava" puts it back to the Inferno's own). */
export const setTerrain = async (user: User, raw: unknown): Promise<string> => {
  if (!terrainEnabled()) throw new TerrainError("Grounds can't be chosen here.");
  const terrain = String(raw ?? "");
  if (!(TERRAINS as readonly string[]).includes(terrain)) throw new TerrainError("There is no such ground.");
  if (HFO_TERRAINS.has(terrain) && !(await hfoFinalWaveWon(user.userid).catch(() => false))) {
    throw new TerrainError("Win the last wave of Hell Freezes Over to have its frozen ground.");
  }
  const need = INVITE_UNLOCKS.grounds[terrain] ?? 0;
  if (need > 0) {
    if ((await invitesForLooks(user.userid)) < need) throw new TerrainError(inviteLockText(need, await acceptedInvites(user.userid)));
  }
  const done = (await postgres.em.getConnection().execute(`UPDATE bym.save SET io_terrain = ? WHERE userid = ? AND type = ? RETURNING basesaveid`, [terrain === "lava" ? null : terrain, user.userid, BaseType.MAIN])) as unknown[];
  if (!done.length) throw new TerrainError("Your yard could not be found.");
  return terrain;
};
