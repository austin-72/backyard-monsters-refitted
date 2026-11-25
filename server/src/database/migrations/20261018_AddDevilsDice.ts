import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (7 October, the user's): Devil's Dice in the Brimstone Pit (services/casino/diceRounds.ts).
 *  - casino_bet and casino_round may hold 'dice' (a table's rounds are casino_round rows, params.table the table)
 *  - an index to find a table's rounds
 */
export class AddDevilsDice extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch', 'fortune', 'favor', 'dice'));`);
    this.addSql(`ALTER TABLE bym.casino_round DROP CONSTRAINT IF EXISTS casino_round_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_round ADD CONSTRAINT casino_round_game_check CHECK (game IN ('ascent', 'derby', 'dice'));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS casino_round_dice_table_idx ON bym.casino_round (((params->>'table')::int), id DESC) WHERE game = 'dice';`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS bym.casino_round_dice_table_idx;`);
    this.addSql(`DELETE FROM bym.casino_bet WHERE game = 'dice';`);
    this.addSql(`DELETE FROM bym.casino_round WHERE game = 'dice';`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP CONSTRAINT IF EXISTS casino_bet_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD CONSTRAINT casino_bet_game_check
      CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch', 'fortune', 'favor'));`);
    this.addSql(`ALTER TABLE bym.casino_round DROP CONSTRAINT IF EXISTS casino_round_game_check;`);
    this.addSql(`ALTER TABLE bym.casino_round ADD CONSTRAINT casino_round_game_check CHECK (game IN ('ascent', 'derby'));`);
  }
}
