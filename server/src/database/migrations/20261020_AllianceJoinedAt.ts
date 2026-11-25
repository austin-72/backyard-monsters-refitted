import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (8 October, the quest book doubled: "Loyal", 90 days in one alliance): when each player joined
 * their alliance (set by services/alliance/membership.ts addAllianceMember). Members already in one count from now.
 */
export class AllianceJoinedAt extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS alliance_joined_at timestamptz NULL;`);
    this.addSql(`UPDATE bym."user" SET alliance_joined_at = now() WHERE alliance_id IS NOT NULL AND alliance_joined_at IS NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS alliance_joined_at;`);
  }
}
