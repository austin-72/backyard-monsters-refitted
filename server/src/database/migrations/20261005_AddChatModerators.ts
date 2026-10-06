import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only chat moderators (chat/chatModeration.ts): players the admin panel lets delete chat lines and
 * mute players from the game's chat (a [Mod] badge by their name). Admins are the config's, as before.
 */
export class AddChatModerators extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS chat_mod BOOLEAN NOT NULL DEFAULT false`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS chat_mod`);
  }
}
