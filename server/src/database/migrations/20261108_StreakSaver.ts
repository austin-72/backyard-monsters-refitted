import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (16 October, QoL #126): streak savers for the daily login reward (services/user/dailyLogin.ts): how
 * many the player holds (0 or 1; one per completed 14-day stretch, forgiving a single missed day). Each streak still
 * alive at day 14 or more starts with its saver, once, when the column is made. services/user/dailyLogin.ts
 * (ensureStreakSaver) does the same at start, for a server whose migrations are run by hand.
 */
export class StreakSaver extends Migration {
  async up(): Promise<void> {
    // (the savers given only by whichever of the two makes the column: never twice)
    const has = await this.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'bym' AND table_name = 'user' AND column_name = 'login_savers'`
    );
    if (has.length) return;
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS login_savers INT NOT NULL DEFAULT 0`);
    await this.execute(`UPDATE bym."user" SET login_savers = 1 WHERE login_streak >= 14
      AND login_last_claim >= to_char((now() AT TIME ZONE 'utc')::date - 1, 'YYYY-MM-DD')`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS login_savers`);
  }
}
