import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (15 October, QoL #169): a join request carries a few words from the player asking (up to 200
 * characters), shown to the alliance's leader and officers with the request.
 */
export class InviteMessage extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_invite ADD COLUMN IF NOT EXISTS message varchar(200) NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_invite DROP COLUMN IF EXISTS message;`);
  }
}
