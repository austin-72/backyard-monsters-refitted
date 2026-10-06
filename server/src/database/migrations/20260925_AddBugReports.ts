import { Migration } from "@mikro-orm/migrations";

/** Inferno-only automatic bug reports from the game client (services/admin/bugReports.ts). */
export class AddBugReports extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.bug_report (
        id SERIAL PRIMARY KEY,
        fingerprint VARCHAR(40) NOT NULL UNIQUE,
        title VARCHAR(500) NOT NULL,
        details TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '',
        count INT NOT NULL DEFAULT 1,
        users JSONB NULL,
        user_count INT NOT NULL DEFAULT 0,
        last_build VARCHAR(32) NOT NULL DEFAULT '',
        first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
        status VARCHAR(8) NOT NULL DEFAULT 'open',
        fixed_at TIMESTAMPTZ NULL
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS bug_report_last_seen_idx ON bym.bug_report (last_seen DESC)`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.bug_report`);
  }
}
