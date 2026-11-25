import { Entity, Index, OneToOne, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import type { Opt } from "@mikro-orm/core";
import { AllianceStats } from "./alliancestats.view.js";

@Entity({ tableName: "alliance" })
export class Alliance {
  @PrimaryKey({ autoincrement: true, type: "number" })
  id!: number;

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "number", default: 1 })
  image: Opt<number> = 1;

  @Property({ type: "string", default: "" })
  description: Opt<string> = "";

  /** Inferno-only (13 October): the chat tag its leader set, or null for the default (services/alliance/allianceTag.ts). */
  @Property({ type: "string", nullable: true, length: 5 })
  tag?: string | null;

  /** Inferno-only (14 October): the crest its leader designed, or null for the preset shield (services/alliance/allianceCrest.ts). */
  @Property({ type: "string", nullable: true, length: 32 })
  crest?: string | null;

  /**
   * Inferno-only (16 October, QoL #174): what its leader lets officers do, { powerups, relations, description }
   * (services/alliance/ioOfficerPerms.ts). A key missing: the leader only, as before. Migration 20261107_OfficerPerms.
   */
  @Property({ type: "json", columnType: "jsonb" })
  officer_perms: Opt<Record<string, boolean>> = {};

  @Index()
  @Property({ type: "number" })
  leader_userid!: number;

  @Property({ type: "string", default: "" })
  leader_name: Opt<string> = "";

  @Property({ type: "string" })
  world_id!: string;

  @Property({ type: "number", default: 2 })
  map_version: Opt<number> = 2;

  @Property({ type: Date })
  created_at: Opt<Date> = new Date();

  @OneToOne({ entity: () => AllianceStats, mappedBy: "alliance" })
  stats?: AllianceStats;
}
