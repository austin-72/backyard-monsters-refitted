import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (4 October): a pet's name, optional (services/pets/pets.ts, pets/name). At most
 * petsConfig.nameLength letters; null is no name.
 */
export class AddPetNames extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."pet" ADD COLUMN IF NOT EXISTS "name" varchar(32) NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."pet" DROP COLUMN IF EXISTS "name";`);
  }
}
