import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only referrals: what came of each one, for the admin panel's Invites card (services/user/referrals.ts).
 * "paid" (both players got the shiny), "same-ip" (the two accounts share a connection: nothing paid) or
 * "no-inviter" (the inviter's account or yard was gone). Null: not yet decided (the friend hasn't loaded the
 * game), or decided before this column existed.
 */
export class AddReferralResult extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_result VARCHAR(16) NULL`);
    await this.execute(`CREATE INDEX IF NOT EXISTS user_referred_by_index ON bym."user" (referred_by)`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP INDEX IF EXISTS bym.user_referred_by_index`);
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS referral_result`);
  }
}
