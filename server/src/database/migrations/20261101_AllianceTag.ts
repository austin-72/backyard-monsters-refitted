import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (13 October): an alliance's tag, shown in brackets before its members' names in chat. NULL is the
 * default, the first 3 letters of the name (services/alliance/allianceTag.ts), so a renamed alliance's tag follows
 * its new name until the leader sets one.
 */
export class AllianceTag extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance ADD COLUMN IF NOT EXISTS tag varchar(5) NULL;`);
    // (and a chat line for a rename: "X renamed the alliance from A to B")
    this.addSql(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
      ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
       'powerup_purchase', 'pinned', 'officer', 'renamed'));`);
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM bym.alliance_message WHERE message_type = 'renamed';`);
    this.addSql(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
      ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
       'powerup_purchase', 'pinned', 'officer'));`);
    this.addSql(`ALTER TABLE bym.alliance DROP COLUMN IF EXISTS tag;`);
  }
}
