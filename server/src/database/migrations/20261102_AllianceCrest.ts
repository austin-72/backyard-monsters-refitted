import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (14 October): an alliance's own crest, designed by its leader (services/alliance/allianceCrest.ts).
 * NULL is the preset shield (alliance.image).
 */
export class AllianceCrest extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS crest varchar(32) NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance DROP COLUMN IF EXISTS crest;`);
  }
}
