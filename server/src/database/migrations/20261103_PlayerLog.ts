import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (14 October, QoL #494): what a player did that can't be undone in the game, with what it takes to put
 * it back (services/user/playerLog.ts). Kept 90 days.
 */
export class PlayerLog extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.player_log (
      id serial PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      userid integer NOT NULL,
      username varchar(64) NOT NULL DEFAULT '',
      action varchar(32) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS player_log_user_at ON bym.player_log (userid, at DESC);`);
    // the yards an action deleted (a relocation's outposts), each save row as it was, by the log row
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.player_log_save (
      log_id integer NOT NULL REFERENCES bym.player_log (id) ON DELETE CASCADE,
      baseid varchar(64) NOT NULL,
      row jsonb NOT NULL
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS player_log_save_log ON bym.player_log_save (log_id);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.player_log_save;`);
    this.addSql(`DROP TABLE IF EXISTS bym.player_log;`);
  }
}
