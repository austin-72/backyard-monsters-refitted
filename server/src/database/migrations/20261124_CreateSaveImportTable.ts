import { Migration } from "@mikro-orm/migrations";

/**
 * Creates bym.save_import. It has no foreign key to bym.user, so a row outlives the
 * account it created and that source account can't be imported again.
 */
export class CreateSaveImportTable extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.save_import (
        source_userid    INTEGER      PRIMARY KEY,
        source_username  VARCHAR(64)  NOT NULL,
        source_key_id    VARCHAR(16)  NOT NULL,
        userid           INTEGER      NOT NULL,
        export_id        UUID         NOT NULL,
        exported_at      TIMESTAMPTZ  NOT NULL,
        imported_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT save_import_userid_unique UNIQUE (userid)
      )
    `);
  }
}
