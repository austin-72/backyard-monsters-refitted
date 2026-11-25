import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (10 October): Hellgate Defense 2 (services/td/hellgate2.ts). A player's profile: embers (the
 * Hellforge's currency), perks bought ({id: level}), each map's record ({map: {best, skulls, points}}), runs and
 * wins. Its boards are the arcade's (bym.arcade_score, game "hellgate2").
 */
export class Hellgate2 extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."td2_profile" (
      "user_id" int NOT NULL PRIMARY KEY,
      "embers" int NOT NULL DEFAULT 0,
      "perks" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "maps" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "runs" int NOT NULL DEFAULT 0,
      "victories" int NOT NULL DEFAULT 0,
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "bym"."td2_profile";`);
  }
}
