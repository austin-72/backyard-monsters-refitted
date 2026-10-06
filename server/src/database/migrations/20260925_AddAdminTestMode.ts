import { Migration } from "@mikro-orm/migrations";

/** Inferno-only admin test mode: the snapshot of the admin's account taken when it is switched on (services/admin/testMode.ts). */
export class AddAdminTestMode extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.admin_test_snapshot (
        userid INT PRIMARY KEY,
        taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        saves JSONB NOT NULL,
        cells JSONB NOT NULL
      )`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.admin_test_snapshot`);
  }
}
