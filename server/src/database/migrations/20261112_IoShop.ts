import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (22 October, the user's): the Store's Extras (services/shop/ioShop.ts) and two new alliance power-ups.
 *  - bym.user.io_shop: a player's timed items, tokens (bought or gift-wrapped, used later), Raid Insurance, the
 *    champion their statues show and gifts not yet seen
 *  - bym.pet.coat ('gold': a Golden Coat) and bym.pet.tag (a Name Tag's colour, "rrggbb")
 *  - bym.alliance_powerup takes Harvest Moon and Builders' Guild
 * services/shop/ioShop.ts (ensureIoShop) does the same at start, for a server whose migrations are run by hand.
 */
export class IoShop extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "bym"."user" ADD COLUMN IF NOT EXISTS "io_shop" jsonb NULL;`);
    this.addSql(`ALTER TABLE "bym"."pet" ADD COLUMN IF NOT EXISTS "coat" varchar(16) NULL;`);
    this.addSql(`ALTER TABLE "bym"."pet" ADD COLUMN IF NOT EXISTS "tag" varchar(8) NULL;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP CONSTRAINT IF EXISTS alliance_powerup_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD CONSTRAINT alliance_powerup_type_check
      CHECK (powerup IN ('ap_armament', 'ap_conquest', 'ap_declarewar', 'ap_harvestmoon', 'ap_buildersguild'));`);
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM bym.alliance_powerup WHERE powerup IN ('ap_harvestmoon', 'ap_buildersguild');`);
    this.addSql(`ALTER TABLE bym.alliance_powerup DROP CONSTRAINT IF EXISTS alliance_powerup_type_check;`);
    this.addSql(`ALTER TABLE bym.alliance_powerup ADD CONSTRAINT alliance_powerup_type_check
      CHECK (powerup IN ('ap_armament', 'ap_conquest', 'ap_declarewar'));`);
    this.addSql(`ALTER TABLE "bym"."pet" DROP COLUMN IF EXISTS "tag";`);
    this.addSql(`ALTER TABLE "bym"."pet" DROP COLUMN IF EXISTS "coat";`);
    this.addSql(`ALTER TABLE "bym"."user" DROP COLUMN IF EXISTS "io_shop";`);
  }
}
