import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (20 October): Trick or Treat (services/events/trickOrTreat.ts): a player's doors knocked on, their
 * tricks' fights and when their Mini-Pumpkins were given (bym.user.io_tot). ensureTrickOrTreat makes it at start too.
 */
export class TrickOrTreat extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "io_tot" jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "io_tot";`);
  }
}
