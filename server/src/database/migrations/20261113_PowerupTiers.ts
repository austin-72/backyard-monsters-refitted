import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (22 October, the user's picks "B" and "C" from Round 2 of the proposals; config/AllianceConfig.ts
 * POWERUP_TIER2, POWERUP_PLAN): a power-up's tier (1, or 2: runs longer, charges longer after) and a planned start.
 * services/shop/ioShop.ts (ensureIoShop) does the same at start, for a server whose migrations are run by hand.
 */
export class PowerupTiers extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS tier smallint NOT NULL DEFAULT 1;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_at integer NULL;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_tier smallint NULL;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD COLUMN IF NOT EXISTS plan_by integer NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP COLUMN IF EXISTS plan_by;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP COLUMN IF EXISTS plan_tier;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP COLUMN IF EXISTS plan_at;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP COLUMN IF EXISTS tier;`);
  }
}
