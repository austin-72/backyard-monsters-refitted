import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (27 November, 72's suggestion: "When visiting a yard and there are upgrades allow the visiting user to
 * "help out" and speed up their upgrades by 5%. One user can only help speed up each upgrade once ever."): one row a
 * help (services/yard/yardHelp.ts). The yard's owner's game takes the 5% off when it next has the yard open (on its
 * load, or its poll every couple of minutes) and marks the row applied.
 *
 *   baseid, buildingid  the yard and the building helped
 *   kind, lvl           the job: build, upgrade or fortify, and the level it leads to (one help a player a job, ever)
 *   helper_userid       who helped (their name kept for the owner's thanks)
 *   owner_userid        whose yard it is
 */
export class YardHelp extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.io_yard_help (
        id SERIAL PRIMARY KEY,
        baseid TEXT NOT NULL,
        buildingid INTEGER NOT NULL,
        kind TEXT NOT NULL,
        lvl INTEGER NOT NULL DEFAULT 0,
        helper_userid INTEGER NOT NULL,
        helper_name TEXT NOT NULL DEFAULT '',
        owner_userid INTEGER NOT NULL,
        applied BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS io_yard_help_once ON bym.io_yard_help (baseid, buildingid, kind, lvl, helper_userid);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS io_yard_help_owner ON bym.io_yard_help (owner_userid, applied);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.io_yard_help;`);
  }
}
