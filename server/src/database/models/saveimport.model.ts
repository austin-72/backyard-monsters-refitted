import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import type { Opt } from "@mikro-orm/core";

/**
 * Records each source account imported on this server, so it can only be imported once.
 */
@Entity({ tableName: "save_import" })
export class SaveImport {
  @PrimaryKey({ type: "number", autoincrement: false })
  source_userid!: number;

  @Property({ type: "string", length: 64 })
  source_username!: string;

  @Property({ type: "string", length: 16 })
  source_key_id!: string;

  @Property({ type: "number", unique: "save_import_userid_unique" })
  userid!: number;

  @Property({ type: "uuid" })
  export_id!: string;

  @Property({ type: Date })
  exported_at!: Date;

  @Property({ type: Date })
  imported_at: Opt<Date> = new Date();
}
