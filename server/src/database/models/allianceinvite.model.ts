import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators/es";

import { AllianceInviteStatus, AllianceInviteType } from "../../enums/Alliance.js";

@Entity({ tableName: "alliance_invite" })
@Index({ properties: ["alliance_id", "status"] })
@Index({ properties: ["user_id", "status"] })
export class AllianceInvite {
  @PrimaryKey({ autoincrement: true, type: "number" })
  id!: number;

  @Property({ type: "number" })
  alliance_id!: number;

  @Property({ type: "number" })
  user_id!: number;

  @Property({ type: "string" })
  type!: AllianceInviteType;

  @Property({ type: "string" })
  status: AllianceInviteStatus = AllianceInviteStatus.PENDING;

  /** Inferno-only (QoL #169): a join request's few words from the player asking, or null. */
  @Property({ type: "string", nullable: true })
  message?: string | null = null;

  /** Inferno-only (QoL #165): who sent an invite (the leader or an officer), or null (older rows, requests). */
  @Property({ type: "number", nullable: true })
  invited_by?: number | null = null;

  @Property({ type: Date })
  created_at: Date = new Date();

  @Property({ type: Date, onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
