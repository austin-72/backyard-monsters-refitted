import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (10 October): the ground a player chose for their main yard in the D.A.V.E. Club window
 * (services/yard/terrain.ts). Null: the yard's own (the Inferno's lava).
 */
export class YardTerrain extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."save" ADD COLUMN IF NOT EXISTS "io_terrain" varchar(24) NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."save" DROP COLUMN IF EXISTS "io_terrain";`);
  }
}
