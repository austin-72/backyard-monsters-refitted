import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only daily login reward (services/user/dailyLogin.ts): the current streak and the UTC day
 * the reward was last collected.
 */
export class AddDailyLogin extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS login_streak INT NOT NULL DEFAULT 0`);
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS login_last_claim VARCHAR(10) NULL`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS login_streak`);
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS login_last_claim`);
  }
}
