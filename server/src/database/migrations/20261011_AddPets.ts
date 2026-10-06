import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (3 October): pets (config/PetsConfig.ts, services/pets/pets.ts). One row per pet a player owns:
 * which monster it is and whether it is out in the main yard (at most two are) or in storage.
 */
export class AddPets extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."pet" (
      "id" serial PRIMARY KEY,
      "user_id" int NOT NULL,
      "monster" varchar(16) NOT NULL,
      "out" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "pet_user_id_index" ON "bym"."pet" ("user_id");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "bym"."pet";`);
  }
}
