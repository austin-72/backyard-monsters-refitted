import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only referrals: an admin can bar a player who abused the invite link from invite rewards (the admin
 * panel's Friends invited card). While barred, a friend joining through their link pays nothing to either side
 * (referral_result "barred"). The reason is the admin's note.
 */
export class AddReferralBarred extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_barred BOOLEAN NOT NULL DEFAULT FALSE`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS referral_barred_reason VARCHAR(400) NULL`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS referral_barred_reason`);
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS referral_barred`);
  }
}
