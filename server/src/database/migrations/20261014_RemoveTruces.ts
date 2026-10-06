import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (4 October, the user's): truces are out of the game. Their mail goes (truce requests, accepts and
 * rejects; a thread left empty goes with it, the others get their count and last message back), the players who
 * had such mail get their unread count worked out again, and the truce table and the truce columns of thread and
 * message are dropped. There is no way back down: the truces themselves are not kept.
 */
export class RemoveTruces extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TEMP TABLE io_truce_mail ON COMMIT DROP AS
      SELECT id, threadid, userid, targetid FROM "bym"."message"
      WHERE messagetype IN ('trucerequest', 'truceaccept', 'trucereject');`);
    this.addSql(`DELETE FROM "bym"."message" WHERE id IN (SELECT id FROM io_truce_mail);`);
    this.addSql(`DELETE FROM "bym"."thread" t
      WHERE t.threadid IN (SELECT threadid FROM io_truce_mail)
        AND NOT EXISTS (SELECT 1 FROM "bym"."message" m WHERE m.threadid = t.threadid);`);
    this.addSql(`UPDATE "bym"."thread" t SET
        messagecount = (SELECT count(*) FROM "bym"."message" m WHERE m.threadid = t.threadid),
        last_message_id = (SELECT m.id FROM "bym"."message" m WHERE m.threadid = t.threadid
          ORDER BY m.updatetime DESC, m.created_at DESC LIMIT 1)
      WHERE t.threadid IN (SELECT threadid FROM io_truce_mail);`);
    this.addSql(`UPDATE "bym"."save" s SET unreadmessages = (
        SELECT count(*) FROM "bym"."message" m
        WHERE (m.userid = s.saveuserid AND m.user_unread = 1) OR (m.targetid = s.saveuserid AND m.target_unread = 1))
      WHERE s.type = 'main'
        AND s.saveuserid IN (SELECT userid FROM io_truce_mail UNION SELECT targetid FROM io_truce_mail);`);
    this.addSql(`DROP TABLE IF EXISTS "bym"."truce";`);
    this.addSql(`ALTER TABLE "bym"."thread" DROP COLUMN IF EXISTS "truce_id", DROP COLUMN IF EXISTS "trucestate";`);
    this.addSql(`ALTER TABLE "bym"."message" DROP COLUMN IF EXISTS "truceid", DROP COLUMN IF EXISTS "trucestate";`);
  }

  async down(): Promise<void> {
    // (nothing to bring back)
  }
}
