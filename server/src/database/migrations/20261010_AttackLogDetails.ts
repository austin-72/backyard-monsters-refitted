import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (3 October): the attack logs are kept and shown in the game (the top bar's Attack Logs
 * button). bym.attack_logs is made where it is missing (it came from the schema tool before), and each log
 * gets what the attack's saves add to it: the yard attacked (baseid, level), how it ended (damage,
 * destroyed, ended, endtime). Tribe and Moloch yards are logged too: their defender_userid is 0.
 */
export class AttackLogDetails extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "bym"."attack_logs" (
      "id" serial PRIMARY KEY,
      "attacker_userid" int NOT NULL,
      "attacker_username" varchar(255) NOT NULL,
      "attacker_pic_square" varchar(255) NULL,
      "defender_userid" int NOT NULL,
      "defender_username" varchar(255) NOT NULL,
      "defender_pic_square" varchar(255) NULL,
      "type" varchar(255) NOT NULL,
      "x" int NULL,
      "y" int NULL,
      "loot" jsonb NULL,
      "attackreport" jsonb NULL,
      "attacktime" timestamptz NOT NULL
    );`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "baseid" varchar(255) NULL;`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "level" int NULL;`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "damage" int NOT NULL DEFAULT 0;`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "destroyed" int NOT NULL DEFAULT 0;`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "ended" boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE "bym"."attack_logs" ADD COLUMN IF NOT EXISTS "endtime" timestamptz NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "attack_logs_attacker_userid_attacktime_index" ON "bym"."attack_logs" ("attacker_userid", "attacktime");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "attack_logs_defender_userid_attacktime_index" ON "bym"."attack_logs" ("defender_userid", "attacktime");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "attack_logs_attacker_userid_baseid_index" ON "bym"."attack_logs" ("attacker_userid", "baseid");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "bym"."attack_logs_attacker_userid_baseid_index";`);
    for (const c of ["endtime", "ended", "destroyed", "damage", "level", "baseid"]) {
      this.addSql(`ALTER TABLE "bym"."attack_logs" DROP COLUMN IF EXISTS "${c}";`);
    }
  }
}
