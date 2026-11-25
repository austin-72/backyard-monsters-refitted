import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (13 October): saved logins (services/user/savedLogins.ts): one per account and browser, 14 days from
 * their last use, a SHA-256 of each secret (never the secret). And where each play session is played
 * (`user_session.agent`, "Chrome on Windows"), for the question another device is asked. The server also makes
 * these at startup when they are missing.
 */
export class SavedLogins extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user_session" ADD COLUMN IF NOT EXISTS "agent" varchar(80) NULL;`);
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."user_login" (
      "id" bigserial PRIMARY KEY,
      "email" varchar(255) NOT NULL,
      "secret_hash" char(64) NOT NULL,
      "agent" varchar(80) NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_used_at" timestamptz NOT NULL DEFAULT now(),
      "expires_at" timestamptz NOT NULL
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "user_login_email_idx" ON "bym"."user_login" ("email");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "bym"."user_login";`);
    this.addSql(`ALTER TABLE "bym"."user_session" DROP COLUMN IF EXISTS "agent";`);
  }
}
