import { Migration } from "@mikro-orm/migrations";

/** Inferno-only: each player's own saved outpost kits (services/maproom/v2/playerKits.ts). */
export class AddPlayerKits extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS player_kits JSONB NULL`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS player_kits`);
  }
}
