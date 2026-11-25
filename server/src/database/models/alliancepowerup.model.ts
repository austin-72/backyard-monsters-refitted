import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import { PrimaryKeyProp } from "@mikro-orm/core";

import { AlliancePowerupType } from "../../enums/Alliance.js";

@Entity({ tableName: "alliance_powerup" })
export class AlliancePowerup {
  [PrimaryKeyProp]?: ["alliance_id", "powerup"];

  @PrimaryKey({ type: "number" })
  alliance_id!: number;

  @PrimaryKey({ type: "string" })
  powerup!: AlliancePowerupType;

  @Property({ type: "boolean", default: false })
  active: boolean = false;

  @Property({ type: "number" })
  end_time!: number;

  /** Inferno-only (22 October): the tier of its last start (2: ran longer, charges longer: AllianceConfig POWERUP_TIER2). */
  @Property({ type: "number", default: 1 })
  tier: number = 1;

  /** Inferno-only (22 October): a planned start (seconds), its tier and who planned it (AllianceConfig POWERUP_PLAN). */
  @Property({ type: "number", nullable: true })
  plan_at?: number | null = null;

  @Property({ type: "number", nullable: true })
  plan_tier?: number | null = null;

  @Property({ type: "number", nullable: true })
  plan_by?: number | null = null;

  @Property({ type: Date, onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
