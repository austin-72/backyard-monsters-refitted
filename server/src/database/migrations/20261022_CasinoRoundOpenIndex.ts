import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (9 October): the shared games' rounds not yet settled, found without reading every round. Devil's
 * Dice looks for its open rounds five times a second, and Balthazar's Ascent makes a round every 15 to 20 seconds
 * whether anyone plays or not, so the table only grows.
 */
export class CasinoRoundOpenIndex extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS casino_round_open_idx ON bym.casino_round (game, id) WHERE status <> 'settled';`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS bym.casino_round_open_idx;`);
  }
}
