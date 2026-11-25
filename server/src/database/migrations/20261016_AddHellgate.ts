import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (6 October, the user's): Hellgate Defense, the tower defense minigame (services/td/hellgate.ts).
 * One row per player who has finished a run: the most waves survived, the kills of that run (they break ties
 * on the Leaderboards' Hellgate tab), how many runs. The runs' own yards are bym.save rows of type "td".
 */
export class AddHellgate extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.td_score (
        user_id INTEGER PRIMARY KEY REFERENCES bym."user"(userid) ON DELETE CASCADE,
        best_wave INTEGER NOT NULL DEFAULT 0,
        best_kills INTEGER NOT NULL DEFAULT 0,
        runs INTEGER NOT NULL DEFAULT 0,
        best_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS td_score_best_idx ON bym.td_score (best_wave DESC, best_kills DESC);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.td_score;`);
    this.addSql(`DELETE FROM bym.save WHERE type = 'td';`);
  }
}
