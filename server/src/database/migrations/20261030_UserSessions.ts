import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (12 October): each player's current login (services/user/sessionStore.ts), so a restart of
 * Redis or of the server signs nobody out. One row per account and kind of session (game, launcher): a SHA-256
 * of the token, never the token. The server also makes this table at startup when it is missing.
 */
export class UserSessions extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."user_session" (
      "email" varchar(255) NOT NULL,
      "session_type" varchar(16) NOT NULL,
      "token_hash" char(64) NOT NULL,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("email", "session_type")
    );`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "bym"."user_session";`);
  }
}
