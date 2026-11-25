import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (10 October): a player's D.A.V.E. Club choices other than the ground (services/yard/dave.ts):
 * { chatColor, workerSkin, champSkins }. Null: none made.
 */
export class DaveClub extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "io_dave" jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "io_dave";`);
  }
}
