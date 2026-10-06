import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only Moloch's Gauntlet (services/events/gauntlet.ts): each player's progress this month. The
 * Gauntlet's yards are ordinary rows of bym.save (tribe yards with baseids of their own).
 */
export class AddGauntlet extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS gauntlet JSONB NULL`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS gauntlet`);
  }
}
