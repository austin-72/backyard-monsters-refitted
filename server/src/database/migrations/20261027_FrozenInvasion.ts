import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (10 October): the Frozen Monster Invasions (services/events/fmi.ts): a player's progress in the
 * month's invasion (bym.user.fmi), and the event trophies they have won for good (bym.user.io_trophies: the two
 * invasions' totems with their levels, Moloch's Gauntlet's two; services/events/trophies.ts).
 */
export class FrozenInvasion extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "fmi" jsonb NULL;`);
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "io_trophies" jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "fmi";`);
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "io_trophies";`);
  }
}
