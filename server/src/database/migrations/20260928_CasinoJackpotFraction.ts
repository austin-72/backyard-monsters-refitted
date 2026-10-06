import { Migration } from "@mikro-orm/migrations";

/**
 * The Magma Slots jackpot pool takes 2% of every spin, so a 1 Shiny spin adds 0.02: the pool keeps its
 * fractions (the game shows and pays whole Shiny).
 */
export class CasinoJackpotFraction extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym.casino_jackpot ALTER COLUMN pool TYPE NUMERIC(20, 4)`);
  }

  async down(): Promise<void> {
    await this.execute(`ALTER TABLE bym.casino_jackpot ALTER COLUMN pool TYPE BIGINT USING floor(pool)`);
  }
}
