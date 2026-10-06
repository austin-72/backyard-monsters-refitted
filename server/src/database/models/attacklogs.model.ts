import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import type { JsonObject } from "../../types/JsonObject.js";

@Index({ properties: ["attacker_userid", "attacktime"] })
@Index({ properties: ["defender_userid", "attacktime"] })
@Index({ properties: ["attacker_userid", "baseid"] })
@Entity({ tableName: "attack_logs" })
export class AttackLogs {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'number' })
  attacker_userid!: number;

  @Property({ type: 'string' })
  attacker_username!: string;

  @Property({ type: 'string', nullable: true })
  attacker_pic_square?: string;

  @Property({ type: 'number' })
  defender_userid!: number;

  @Property({ type: 'string' })
  defender_username!: string;

  @Property({ type: 'string', nullable: true })
  defender_pic_square?: string;

  @Property({ type: 'string' })
  type!: string;

  @Property({ type: 'number', nullable: true })
  x?: number;

  @Property({ type: 'number', nullable: true })
  y?: number;

  @Property({ columnType: "jsonb", nullable: true })
  loot?: JsonObject = {};

  @Property({ columnType: "jsonb", nullable: true })
  attackreport: JsonObject = {};

  @Property({ type: Date })
  attacktime: Date = new Date();

  // Inferno-only (3 October, migration 20261010): the yard attacked and how the attack ended, written by
  // the attack's saves (services/base/createAttackLog.ts updateAttackLog). defender_userid 0: a tribe yard.

  @Property({ type: 'string', nullable: true })
  baseid?: string | null;

  @Property({ type: 'number', nullable: true })
  level?: number | null;

  @Property({ type: 'number', default: 0 })
  damage: number = 0;

  @Property({ type: 'number', default: 0 })
  destroyed: number = 0;

  @Property({ type: 'boolean', default: false })
  ended: boolean = false;

  @Property({ type: Date, nullable: true })
  endtime?: Date | null;
}
