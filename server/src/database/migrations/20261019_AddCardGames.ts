import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (7 October, the user's picks): Cinderjack (blackjack), Higher or Lower and The Undertaker's Offer in
 * the Brimstone Pit (services/casino/cardSessions.ts), played over several requests like Bone Pile.
 *  - casino_bet may hold 'blackjack', 'hilo' and 'deal'
 *  - one open casino_session per player and game (it was one per player, whatever the game)
 */
export class AddCardGames extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch', 'fortune', 'favor', 'dice', 'blackjack', 'hilo', 'deal'));`);
    this.addSql(`DROP INDEX IF EXISTS bym.casino_session_one_open;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS casino_session_one_open_game ON bym.casino_session (user_id, game) WHERE status = 'open';`);
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM bym.casino_session WHERE game IN ('blackjack', 'hilo', 'deal');`);
    this.addSql(`DELETE FROM bym.casino_bet WHERE game IN ('blackjack', 'hilo', 'deal');`);
    this.addSql(`DROP INDEX IF EXISTS bym.casino_session_one_open_game;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS casino_session_one_open ON bym.casino_session (user_id) WHERE status = 'open';`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch', 'fortune', 'favor', 'dice'));`);
  }
}
