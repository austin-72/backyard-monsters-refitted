import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (9 October, the user's: "I want to have automatic cheat detection but with absolutely no false
 * positives. I want the reports to show up in the reports section for admins"): the cheat detector's findings
 * (services/anticheat). One row a player and rule while it is open: how many times, the first and the last time,
 * the last proof and a few before it, how many of the requests were refused. An admin dismisses it (or bans).
 */
export class CheatReports extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.cheat_report (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        rule TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        refused INTEGER NOT NULL DEFAULT 0,
        first_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        samples JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'open',
        reviewed_by TEXT NULL,
        reviewed_at TIMESTAMPTZ NULL
      );`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS cheat_report_open ON bym.cheat_report (userid, rule) WHERE status = 'open';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS cheat_report_status ON bym.cheat_report (status, last_at DESC);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.cheat_report;`);
  }
}
