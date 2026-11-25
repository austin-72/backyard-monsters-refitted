import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (15 October, QoL #165): an invite remembers who sent it (the leader or an officer), so the invited
 * player sees the right name. Older rows have none and show the leader, as before.
 */
export class InviteSender extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_invite ADD COLUMN IF NOT EXISTS invited_by integer NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_invite DROP COLUMN IF EXISTS invited_by;`);
  }
}
