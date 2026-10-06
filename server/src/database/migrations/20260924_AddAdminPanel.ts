import { Migration } from "@mikro-orm/migrations";

/** Inferno-only admin panel: the audit log, and the reason shown to a banned player. */
export class AddAdminPanel extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(400) NULL`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.admin_log (
        id SERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        admin_id INT NOT NULL,
        admin_name VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_id INT NULL,
        target_name VARCHAR(64) NULL,
        details VARCHAR(1000) NOT NULL DEFAULT ''
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS admin_log_at_idx ON bym.admin_log (at DESC)`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.admin_log`);
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS ban_reason`);
  }
}
