import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (10 October): a pet fed petsConfig.growCost Magma is full size for good (services/pets/pets.ts,
 * pets/grow).
 */
export class PetsFullSize extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."pet" ADD COLUMN IF NOT EXISTS "big" boolean NOT NULL DEFAULT false;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."pet" DROP COLUMN IF EXISTS "big";`);
  }
}
