import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only: layouts admins design in the game (services/admin/designs.ts, services/admin/designStore.ts).
 * One row per layout: a wild tribe yard at one level ("tribe", "<tribe index>-<level>"), a Moloch descent
 * base ("moloch", "1".."13"), or an outpost kit as it was before an admin first changed it
 * ("kit-original", "1".."6"; the kits themselves are public/assets/kits/inferno-kits.json).
 * No row: the stock layout.
 */
export class AddDesigns extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.io_design (
        kind VARCHAR(16) NOT NULL,
        key VARCHAR(32) NOT NULL,
        buildingdata JSONB NOT NULL,
        updated_by VARCHAR(64),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (kind, key)
      )`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.io_design`);
  }
}
