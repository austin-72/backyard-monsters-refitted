import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (12 November): the Yard Planner's 10 outpost layouts, shared by all of a player's outposts
 * (controllers/yardplanner/plannerSave.ts). Each outpost kept its own 10 slots before; those are left where they were.
 */
export class OutpostLayouts extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS outpost_layouts JSONB NULL`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS outpost_layouts`);
  }
}
