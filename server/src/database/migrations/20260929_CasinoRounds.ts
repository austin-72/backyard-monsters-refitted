import { Migration } from "@mikro-orm/migrations";

/** Shared rounds (Balthazar's Ascent, Magma Derby): their bets found by round, the latest round by game. */
export class CasinoRounds extends Migration {
  async up(): Promise<void> {
    await this.execute(`CREATE INDEX IF NOT EXISTS casino_bet_round_idx ON bym.casino_bet (round_id, status) WHERE round_id IS NOT NULL`);
    await this.execute(`CREATE INDEX IF NOT EXISTS casino_round_game_idx ON bym.casino_round (game, id DESC)`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP INDEX IF EXISTS bym.casino_bet_round_idx`);
    await this.execute(`DROP INDEX IF EXISTS bym.casino_round_game_idx`);
  }
}
