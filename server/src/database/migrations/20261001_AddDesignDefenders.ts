import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only: the monsters an admin puts in a designed yard's Compounds, and their levels (the Designer's
 * Monsters window; services/admin/designs.ts). `monsters`: {monster id: how many}; `academy`: {monster id:
 * {level}} as a save's academy. Null: the stock yard's.
 */
export class AddDesignDefenders extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym.io_design ADD COLUMN IF NOT EXISTS monsters JSONB, ADD COLUMN IF NOT EXISTS academy JSONB`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym.io_design DROP COLUMN IF EXISTS monsters, DROP COLUMN IF EXISTS academy`);
  }
}
