import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (13 November, the user's): the Devil's Contract (services/devil/devilContract.ts): bym.user.io_devil,
 * the player's offer, what they signed and when. ensureDevilContract does the same at start, for a server whose
 * migrations are run by hand.
 */
export class DevilContract extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "io_devil" jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "io_devil";`);
  }
}
