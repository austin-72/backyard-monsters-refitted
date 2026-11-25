import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (18 October, the user's): "appear offline" (Who's Online's button) kept on the account, so it holds
 * through a reload of the game, a restart of the server and of Redis (services/user/presence.ts keeps Redis's set in
 * step with it). services/user/presence.ts (ensureAppearOffline) adds the column at start too, for a server whose
 * migrations are run by hand.
 */
export class AppearOffline extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS appear_offline boolean NOT NULL DEFAULT false;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS appear_offline;`);
  }
}
