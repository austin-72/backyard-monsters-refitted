import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (3 October): attack replays (services/replays/replays.ts). One row per player-versus-player attack:
 * the yard as it was when the attack began (`yard`), the attacker's game's recording of it sent in parts while it
 * goes on (`chunks`), and, once it is over, all of it gzipped in `data` (the parts dropped). An imported replay (a
 * file a player downloaded) is kept for a day for the one who imported it.
 */
export class AddReplays extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."replay" (
      "id" serial PRIMARY KEY,
      "key" varchar(24) NOT NULL UNIQUE,
      "attack_log_id" int NULL,
      "attacker_userid" int NOT NULL,
      "attacker_name" varchar(255) NOT NULL DEFAULT '',
      "defender_userid" int NOT NULL DEFAULT 0,
      "defender_name" varchar(255) NOT NULL DEFAULT '',
      "baseid" varchar(255) NOT NULL,
      "yard_type" varchar(32) NOT NULL DEFAULT 'main',
      "x" int NULL,
      "y" int NULL,
      "status" varchar(16) NOT NULL DEFAULT 'recording',
      "yard" jsonb NULL,
      "chunks" jsonb NOT NULL DEFAULT '[]',
      "data" bytea NULL,
      "size" int NOT NULL DEFAULT 0,
      "duration" int NOT NULL DEFAULT 0,
      "damage" int NOT NULL DEFAULT 0,
      "imported" boolean NOT NULL DEFAULT false,
      "viewer_userid" int NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "replay_defender_created_index" ON "bym"."replay" ("defender_userid", "created_at");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "replay_attack_log_index" ON "bym"."replay" ("attack_log_id");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "bym"."replay";`);
  }
}
