import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (11 November): the Soul Crucible's daily total (services/crucible/crucible.ts): how much each player
 * has poured on each (UTC) day, against the day's cap. The service makes the table too if it is missing, for a
 * server whose migrations are run by hand.
 */
export class CrucibleDay extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.crucible_day (
      user_id integer NOT NULL,
      day date NOT NULL,
      given bigint NOT NULL DEFAULT 0,
      pours integer NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    );`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.crucible_day;`);
  }
}
