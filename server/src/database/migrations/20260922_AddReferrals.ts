import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only referrals: invite links that pay both players shiny (services/user/referrals.ts).
 * The IP columns are what stops two accounts made on one connection paying each other.
 */
export class AddReferrals extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) NULL`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referred_by INT NULL`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_credited BOOLEAN NOT NULL DEFAULT FALSE`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_notice VARCHAR(400) NULL`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(64) NULL`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS last_ip VARCHAR(64) NULL`);
    await this.execute(`CREATE UNIQUE INDEX IF NOT EXISTS user_referral_code_unique ON bym."user" (referral_code)`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP INDEX IF EXISTS bym.user_referral_code_unique`);
    for (const column of ["referral_code", "referred_by", "referral_credited", "referral_notice", "registration_ip", "last_ip"]) {
      await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS ${column}`);
    }
  }
}
