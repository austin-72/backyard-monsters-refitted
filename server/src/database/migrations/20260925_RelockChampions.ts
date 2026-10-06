import { Migration } from "@mikro-orm/migrations";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

/**
 * Inferno-only: Korath (IC9), Drull (IC10) and Rezghul (C19) locked again for every player, with no one
 * keeping an unlock from before (they used to be unlocked for everyone, and players who had them kept
 * them). Every unlock is removed; unlocks under way in the Strongbox ({t: 1}) are left to finish. Nothing
 * is refunded. Monsters already hatched stay, and Academy levels are kept for when they are unlocked again.
 *
 * Once only (MikroORM records it). From then on the save handler refuses unlocks that were never
 * started (services/base/lockedMonsters.ts). No question marks in the SQL: they read as parameters.
 */
export class RelockChampions extends Migration {
  async up(): Promise<void> {
    if (!infernoOnlyConfig.enabled) return;

    await this.execute(`
      UPDATE bym.save s
         SET lockerdata = s.lockerdata - ARRAY(
               SELECT k FROM unnest(ARRAY['IC9', 'IC10', 'C19']) AS k
                WHERE s.lockerdata -> k ->> 't' = '2')
       WHERE jsonb_typeof(s.lockerdata) = 'object'
         AND s.type IN ('main', 'outpost', 'inferno')
         AND EXISTS (
               SELECT 1 FROM unnest(ARRAY['IC9', 'IC10', 'C19']) AS k
                WHERE s.lockerdata -> k ->> 't' = '2')`);
  }

  async down(): Promise<void> {
    // The removed unlocks are not recorded anywhere: nothing to put back.
  }
}
