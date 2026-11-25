import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (7 October, the user's): the Devil's Arcade (services/arcade/, config/ArcadeConfig.ts).
 *
 *  - arcade_score: a player's record in a game and mode, for a period ('' for all time; a day 'YYYY-MM-DD' for
 *    the Siege's Daily). Solo modes keep the best score (best, and best2 to break ties); played against others,
 *    wins and losses (best = wins).
 *  - arcade_ghost: each player's best Balthazar's Flight (its path), for the ghosts other players race.
 *  - arcade_siege: the Siege's attacks: the Daily's (one a player a day counts, the best of three) and the
 *    Duels' (a challenge, the two attacks, the winner).
 */
export class AddArcade extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.arcade_score (
        user_id INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        game VARCHAR(16) NOT NULL,
        mode VARCHAR(16) NOT NULL,
        period VARCHAR(10) NOT NULL DEFAULT '',
        best INTEGER NOT NULL DEFAULT 0,
        best2 INTEGER NOT NULL DEFAULT 0,
        runs INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        best_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, game, mode, period)
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS arcade_score_board_idx ON bym.arcade_score (game, mode, period, best DESC, best2 DESC);`);
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.arcade_ghost (
        game VARCHAR(16) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        seed INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (game, user_id)
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS arcade_ghost_score_idx ON bym.arcade_ghost (game, score DESC);`);
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.arcade_siege (
        id SERIAL PRIMARY KEY,
        kind VARCHAR(8) NOT NULL,
        day VARCHAR(10) NOT NULL,
        challenger INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        rival INTEGER REFERENCES bym."user"(userid) ON DELETE CASCADE,
        seed INTEGER NOT NULL,
        state VARCHAR(12) NOT NULL DEFAULT 'open',
        challenger_result JSONB,
        rival_result JSONB,
        winner INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS arcade_siege_challenger_idx ON bym.arcade_siege (challenger, created_at DESC);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS arcade_siege_rival_idx ON bym.arcade_siege (rival, created_at DESC);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.arcade_siege;`);
    this.addSql(`DROP TABLE IF EXISTS bym.arcade_ghost;`);
    this.addSql(`DROP TABLE IF EXISTS bym.arcade_score;`);
  }
}
