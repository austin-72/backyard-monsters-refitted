import { Migration } from "@mikro-orm/migrations";

/**
 * Moloch's Gauntlet (services/events/gauntlet.ts): every reward paid, one row per player, month and stage.
 * The key makes a second payment of the same stage in the same month impossible; the row is written in the
 * same transaction as the payment. Rewards already paid (user.gauntlet "paid") are carried over.
 */
export class AddGauntletClaims extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.gauntlet_claim (
        userid INT NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        month VARCHAR(7) NOT NULL,
        stage SMALLINT NOT NULL,
        shiny INT NOT NULL,
        r1 BIGINT NOT NULL,
        r2 BIGINT NOT NULL,
        r3 BIGINT NOT NULL,
        r4 BIGINT NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (userid, month, stage)
      )`);
    await this.execute(`
      INSERT INTO bym.gauntlet_claim (userid, month, stage, shiny, r1, r2, r3, r4)
      SELECT u.userid, u.gauntlet->>'month', s.key::int, 0, 0, 0, 0, 0
      FROM bym."user" u, jsonb_each(COALESCE(u.gauntlet->'stages', '{}'::jsonb)) s
      WHERE u.gauntlet IS NOT NULL AND s.value->>'paid' = 'true'
      ON CONFLICT DO NOTHING`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.gauntlet_claim`);
  }
}
