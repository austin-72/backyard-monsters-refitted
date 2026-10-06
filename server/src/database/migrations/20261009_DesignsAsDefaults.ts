import { Migration } from "@mikro-orm/migrations";
import { DEFAULT_DESIGNS } from "../../game-data/designs/defaultDesigns.js";

/**
 * Inferno-only: the tribe and Moloch layouts designed in the Designer up to 29 September are now the stock
 * ones (game-data/designs/defaultDesigns.ts, the user's call of 2 October). Their rows in bym.io_design are
 * taken out where they are exactly the default (layout, monsters and levels), so the Designer lists those
 * layouts as stock and Reset has nothing to undo. A row that differs (changed since the export) stays and
 * still comes first. The kits' rows ("kit-original") are untouched.
 */
export class DesignsAsDefaults extends Migration {
  async up(): Promise<void> {
    for (const [id, d] of Object.entries(DEFAULT_DESIGNS)) {
      const [kind, key] = id.split(":");
      await this.execute(
        `DELETE FROM bym.io_design
          WHERE kind = ? AND key = ? AND buildingdata = CAST(? AS jsonb)
            AND monsters IS NOT DISTINCT FROM CAST(? AS jsonb) AND academy IS NOT DISTINCT FROM CAST(? AS jsonb)`,
        [kind, key, JSON.stringify(d.buildingdata), d.monsters ? JSON.stringify(d.monsters) : null, d.academy ? JSON.stringify(d.academy) : null]
      );
    }
  }

  async down(): Promise<void> {
    // (the rows were the defaults: putting them back changes nothing the game does)
    for (const [id, d] of Object.entries(DEFAULT_DESIGNS)) {
      const [kind, key] = id.split(":");
      await this.execute(
        `INSERT INTO bym.io_design (kind, key, buildingdata, monsters, academy, updated_by)
         VALUES (?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), 'default') ON CONFLICT DO NOTHING`,
        [kind, key, JSON.stringify(d.buildingdata), d.monsters ? JSON.stringify(d.monsters) : null, d.academy ? JSON.stringify(d.academy) : null]
      );
    }
  }
}
