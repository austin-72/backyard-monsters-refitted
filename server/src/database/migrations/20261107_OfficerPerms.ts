import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (16 October, QoL #174): what an alliance's leader lets its officers do, { powerups, relations,
 * description } (services/alliance/ioOfficerPerms.ts). A key missing is the old rule: the leader only.
 * services/alliance/allianceTag.ts (ensureAllianceTag) makes the column too, for a server whose migrations are run by hand.
 */
export class OfficerPerms extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS officer_perms jsonb NOT NULL DEFAULT '{}'::jsonb;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance DROP COLUMN IF EXISTS officer_perms;`);
  }
}
