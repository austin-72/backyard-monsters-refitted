import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import type { Opt } from "@mikro-orm/core";

/**
 * One row for every source account whose save has been imported on this server.
 *
 * Keyed by the player's user id on the source server, so each source account can be
 * imported once, ever. Rows are never deleted, and are kept even if the account created
 * here is deleted, so that account's save can't be brought in a second time.
 */
@Entity({ tableName: "save_import" })
export class SaveImport {
  /** The player's user id on the source server. */
  @PrimaryKey({ type: "number", autoincrement: false })
  source_userid!: number;

  @Property({ type: "string", length: 64 })
  source_username!: string;

  /** Key id of the source server key that signed the code. */
  @Property({ type: "string", length: 16 })
  source_key_id!: string;

  /** The account registered here with the imported save. */
  @Property({ type: "number", unique: "save_import_userid_unique" })
  userid!: number;

  @Property({ type: "uuid" })
  export_id!: string;

  @Property({ type: Date })
  exported_at!: Date;

  @Property({ type: Date })
  imported_at: Opt<Date> = new Date();
}
