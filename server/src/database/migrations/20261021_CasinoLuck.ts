import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (8 October): the Brimstone Pit's silent luck (config `luck`, services/casino/luck.ts). Each bet
 * keeps the luck it was played with and whether luck changed its result, for the admins (never sent to players).
 */
export class CasinoLuck extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.casino_bet ADD COLUMN IF NOT EXISTS luck numeric(6,4) NOT NULL DEFAULT 0;`);
    this.addSql(`ALTER TABLE bym.casino_bet ADD COLUMN IF NOT EXISTS lucky boolean NOT NULL DEFAULT false;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.casino_bet DROP COLUMN IF EXISTS lucky;`);
    this.addSql(`ALTER TABLE bym.casino_bet DROP COLUMN IF EXISTS luck;`);
  }
}
