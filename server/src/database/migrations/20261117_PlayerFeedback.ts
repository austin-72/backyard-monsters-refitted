import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (25 November, the user's: "Make it so right clicking shows options that are not game related like
 * "report a bug" or "suggest a change" allowing the user to highlight whatever their mouse is over and optionally
 * attach a screenshot ... Admin right clicks should be noted as admin"): what players send from the game's right-click
 * menu (services/feedback/playerFeedback.ts). One row a report; the admin panel's Feedback tab reads and answers them.
 *
 *   kind        bug | idea
 *   status      new | seen | planned | done | declined (set from the panel; the player sees it under My reports)
 *   staff_role  the sender's admin role (owner, admin, support) when an admin sent it, else NULL
 *   subject     what the player highlighted, in words; target: the same, as the game's display path
 *   highlight   the highlighted box: {pic: [x, y, w, h] in the picture's pixels, stage: [x, y, w, h]}
 *   shot        the screenshot (base64 JPEG, the highlight drawn on it), picture: one the player added (base64)
 *   reply       the answer the player sees; reply_seen: false until they have opened My reports since
 *   note        for admins only
 */
export class PlayerFeedback extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.player_feedback (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        userid INTEGER NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        staff_role TEXT NULL,
        text TEXT NOT NULL,
        how_often TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        target TEXT NOT NULL DEFAULT '',
        highlight JSONB NULL,
        place TEXT NOT NULL DEFAULT '',
        context TEXT NOT NULL DEFAULT '',
        build TEXT NOT NULL DEFAULT '',
        client TEXT NOT NULL DEFAULT '',
        shot TEXT NULL,
        picture TEXT NULL,
        reply TEXT NOT NULL DEFAULT '',
        reply_at TIMESTAMPTZ NULL,
        reply_seen BOOLEAN NOT NULL DEFAULT true,
        note TEXT NOT NULL DEFAULT '',
        handled_by TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    this.addSql(`CREATE INDEX IF NOT EXISTS player_feedback_status ON bym.player_feedback (status, created_at DESC);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS player_feedback_user ON bym.player_feedback (userid, created_at DESC);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS bym.player_feedback;`);
  }
}
