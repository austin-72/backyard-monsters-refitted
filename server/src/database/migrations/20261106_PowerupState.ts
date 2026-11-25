import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (15 October, QoL #180): a line in an alliance's chat when one of its power-ups runs out or is charged
 * again (services/alliance/powerupWatch.ts). services/alliance/allianceTag.ts (ensureAllianceTag) does the same at
 * start, for a server whose migrations are run by hand.
 */
export class PowerupState extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
      ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
       'powerup_purchase', 'pinned', 'officer', 'renamed', 'powerup_state'));`);
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM bym.alliance_message WHERE message_type = 'powerup_state';`);
    this.addSql(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
      ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
       'powerup_purchase', 'pinned', 'officer', 'renamed'));`);
  }
}
