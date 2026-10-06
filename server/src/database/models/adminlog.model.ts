import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import { type Opt } from "@mikro-orm/core";

/** Inferno-only admin panel: one row per admin action (services/admin/adminLog.ts). */
@Entity({ tableName: "admin_log" })
export class AdminLog {
  @PrimaryKey({ type: "number", autoincrement: true })
  id!: number;

  @Property({ type: Date })
  at: Opt<Date> = new Date();

  @Property({ type: "number" })
  admin_id!: number;

  @Property({ type: "string", length: 64 })
  admin_name!: string;

  @Property({ type: "string", length: 64 })
  action!: string;

  @Property({ type: "number", nullable: true })
  target_id?: number | null;

  @Property({ type: "string", length: 64, nullable: true })
  target_name?: string | null;

  @Property({ type: "string", length: 1000, default: "" })
  details: Opt<string> = "";
}
