import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only Hell Freezes Over (services/events/hfo.ts): each player's progress (user.hfo, null until the
 * event starts for them), and every wave reward paid (bym.hfo_claim: one row per player and wave, written in
 * the same transaction as the shiny, so a wave never pays twice).
 */
export class AddHellFreezesOver extends Migration {
  async up(): Promise<void> {
    await this.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS hfo JSONB NULL`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.hfo_claim (
        userid INT NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        wave SMALLINT NOT NULL,
        shiny INT NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (userid, wave)
      )`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.hfo_claim`);
    await this.execute(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS hfo`);
  }
}
