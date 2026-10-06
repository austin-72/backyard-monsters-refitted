import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (5 October, the user's): the Brimstone Pit's second slot machine and its player rows.
 *  - casino_bet may hold 'fortune' (Korath's Fortune) and 'favor' (Moloch's Favor, the free daily Slots
 *    spin, the only bet with no stake)
 *  - casino_player: one row per player who has used Moloch's Favor, with the (UTC) day they last did
 *  - indexes for the Live tab: bets by time (the day's biggest wins) and the jackpots
 */
export class CasinoFun extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch', 'fortune', 'favor'));`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_stake_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_stake_check CHECK ((stake > 0 OR (game = 'favor' AND stake = 0)) AND payout >= 0);`);
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.casino_player (
        user_id INTEGER PRIMARY KEY REFERENCES bym."user"(userid) ON DELETE CASCADE,
        favor_day DATE NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS casino_bet_created_idx ON bym.casino_bet (created_at);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS casino_bet_jackpot_idx ON bym.casino_bet (id DESC) WHERE (outcome->>'line') = 'jackpot';`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.casino_player;`);
    this.addSql(`DROP INDEX IF EXISTS bym.casino_bet_created_idx;`);
    this.addSql(`DROP INDEX IF EXISTS bym.casino_bet_jackpot_idx;`);
    this.addSql(`DELETE FROM bym.casino_bet WHERE game IN ('fortune', 'favor');`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch'));`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_stake_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_stake_check CHECK (stake > 0 AND payout >= 0);`);
  }
}
