import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only Alliances redesign (2 October):
 *  - bym.alliance_pin: the alliance board's pins (services/alliance/allianceBoard.ts), 50 at most, each kept
 *    30 days;
 *  - bym.alliance_outpost_event: every outpost an alliance's members gained or lost (from a player or a
 *    tribe), kept 90 days (services/alliance/allianceOutposts.ts). Started with the outposts members hold
 *    now, from their takeover dates (where it was taken from isn't known for those);
 *  - two more kinds of alliance chat line: "pinned" and "officer" (the officer role is a value of
 *    user.alliance_role, a plain string column).
 */
export class AddAllianceBoard extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.alliance_pin (
        id SERIAL PRIMARY KEY,
        alliance_id INT NOT NULL REFERENCES bym.alliance(id) ON DELETE CASCADE,
        author_id INT NULL REFERENCES bym."user"(userid) ON DELETE SET NULL,
        author_name VARCHAR(64) NOT NULL,
        title VARCHAR(80) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        x INT NULL,
        y INT NULL,
        world_id VARCHAR(255) NULL,
        sort INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS alliance_pin_alliance_idx ON bym.alliance_pin (alliance_id, expires_at)`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.alliance_outpost_event (
        id BIGSERIAL PRIMARY KEY,
        alliance_id INT NOT NULL REFERENCES bym.alliance(id) ON DELETE CASCADE,
        kind VARCHAR(8) NOT NULL,
        source VARCHAR(8) NOT NULL,
        user_id INT NULL,
        user_name VARCHAR(64) NOT NULL,
        other_user_id INT NULL,
        other_name VARCHAR(64) NULL,
        other_alliance_id INT NULL,
        other_alliance_name VARCHAR(64) NULL,
        world_id VARCHAR(255) NULL,
        x INT NOT NULL,
        y INT NOT NULL,
        baseid VARCHAR(255) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS alliance_outpost_event_idx ON bym.alliance_outpost_event (alliance_id, id DESC)`);
    // The outposts members hold now, gained when they were taken over (within the 90 days kept).
    await this.execute(`
      INSERT INTO bym.alliance_outpost_event (alliance_id, kind, source, user_id, user_name, world_id, x, y, baseid, created_at)
      SELECT u.alliance_id, 'gained', 'unknown', u.userid, u.username, c.world_id, c.x, c.y, c.baseid, s.takeover_date
        FROM bym.world_map_cell c
        JOIN bym.save s ON s.cell_cellid = c.cellid
        JOIN bym."user" u ON u.userid = c.uid
       WHERE c.base_type = 3 AND c.map_version = 2 AND c.destroyed_at IS NULL AND u.alliance_id IS NOT NULL
         AND s.takeover_date > now() - interval '90 days'
         AND NOT EXISTS (SELECT 1 FROM bym.alliance_outpost_event e WHERE e.baseid = c.baseid)`);
    await this.execute(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check`);
    await this.execute(`
      ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
        ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
         'powerup_purchase', 'pinned', 'officer'))`);
  }

  async down(): Promise<void> {
    await this.execute(`DELETE FROM bym.alliance_message WHERE message_type IN ('pinned', 'officer')`);
    await this.execute(`ALTER TABLE bym.alliance_message DROP CONSTRAINT IF EXISTS alliance_message_type_check`);
    await this.execute(`
      ALTER TABLE bym.alliance_message ADD CONSTRAINT alliance_message_type_check CHECK (message_type IN
        ('message', 'joined', 'left', 'kicked', 'promoted', 'created', 'relationship', 'powerup_activated',
         'powerup_purchase'))`);
    await this.execute(`UPDATE bym."user" SET alliance_role = 'member' WHERE alliance_role = 'officer'`);
    await this.execute(`DROP TABLE IF EXISTS bym.alliance_outpost_event`);
    await this.execute(`DROP TABLE IF EXISTS bym.alliance_pin`);
  }
}
