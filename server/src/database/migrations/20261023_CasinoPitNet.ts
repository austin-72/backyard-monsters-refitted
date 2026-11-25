import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (9 October, the user's: "Make gambling not slow the server down for other users"): each player's
 * whole Brimstone Pit history in one number, kept up to date by the database.
 *
 * The silent luck (services/casino/luck.ts) reads a player's net: what every settled bet paid them less what
 * they staked, all games, all time. It was summed from the ledger on every bet: a player with 50,000 bets made
 * the database read 50,000 rows for each spin, and a few such players kept it busy enough to slow every other
 * request on the server. Now `casino_net.net` (one row a player) holds the sum, moved by triggers on every write
 * to the ledger (a bet settled when placed, a round or game settled later, a refund, rows deleted or changed by
 * hand), and the bet reads one row. It starts as the ledger's sum.
 *
 * The triggers run once a statement, not once a row: a statement that writes many bets (a round settled, an
 * account's bets deleted) moves each player's sum once, by what all its rows add up to (once a row, the same sum
 * changed a hundred thousand times in one transaction grew slower with every row).
 *
 * And casino_session's bet_id gets an index: deleting bets (an account deleted) looked through every Bone Pile and
 * card game for each bet deleted, to find the game it belonged to (minutes for an account with many bets, with the
 * ledger locked all the while).
 */
export class CasinoPitNet extends Migration {
  async up(): Promise<void> {
    // (no bet written while the sum is taken: the triggers are on before the sum, and the sum sees every bet)
    this.addSql(`LOCK TABLE bym.casino_bet IN SHARE ROW EXCLUSIVE MODE;`);
    this.addSql(`CREATE TABLE IF NOT EXISTS bym.casino_net (
        user_id INTEGER PRIMARY KEY REFERENCES bym."user"(userid) ON DELETE CASCADE,
        net BIGINT NOT NULL DEFAULT 0
      );`);
    // what a statement's rows change each player's sum by: + the new rows settled, - the old rows settled (players
    // taken in order, so two statements moving the same players' sums wait for each other, never deadlock)
    this.addSql(`
      CREATE OR REPLACE FUNCTION bym.casino_net_apply() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO bym.casino_net (user_id, net)
            SELECT user_id, sum(payout::bigint - stake::bigint) FROM casino_net_new WHERE status = 'settled' GROUP BY user_id
              HAVING sum(payout::bigint - stake::bigint) <> 0 ORDER BY user_id
            ON CONFLICT (user_id) DO UPDATE SET net = bym.casino_net.net + EXCLUDED.net;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO bym.casino_net (user_id, net)
            SELECT user_id, sum(d) FROM (
                SELECT user_id, payout::bigint - stake::bigint AS d FROM casino_net_new WHERE status = 'settled'
                UNION ALL
                SELECT user_id, -(payout::bigint - stake::bigint) FROM casino_net_old WHERE status = 'settled'
              ) x GROUP BY user_id HAVING sum(d) <> 0 ORDER BY user_id
            ON CONFLICT (user_id) DO UPDATE SET net = bym.casino_net.net + EXCLUDED.net;
        ELSE
          -- (a player's row may be gone already: an account deleted takes its bets with it)
          UPDATE bym.casino_net c SET net = c.net - x.d
            FROM (SELECT user_id, sum(payout::bigint - stake::bigint) AS d FROM casino_net_old WHERE status = 'settled' GROUP BY user_id) x
           WHERE c.user_id = x.user_id AND x.d <> 0;
        END IF;
        RETURN NULL;
      END
      $fn$;`);
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_insert ON bym.casino_bet;`);
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_update ON bym.casino_bet;`);
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_delete ON bym.casino_bet;`);
    this.addSql(`CREATE TRIGGER casino_net_insert AFTER INSERT ON bym.casino_bet REFERENCING NEW TABLE AS casino_net_new
                 FOR EACH STATEMENT EXECUTE FUNCTION bym.casino_net_apply();`);
    this.addSql(`CREATE TRIGGER casino_net_update AFTER UPDATE ON bym.casino_bet REFERENCING OLD TABLE AS casino_net_old NEW TABLE AS casino_net_new
                 FOR EACH STATEMENT EXECUTE FUNCTION bym.casino_net_apply();`);
    this.addSql(`CREATE TRIGGER casino_net_delete AFTER DELETE ON bym.casino_bet REFERENCING OLD TABLE AS casino_net_old
                 FOR EACH STATEMENT EXECUTE FUNCTION bym.casino_net_apply();`);
    this.addSql(`CREATE INDEX IF NOT EXISTS casino_session_bet_idx ON bym.casino_session (bet_id);`);
    this.addSql(`DELETE FROM bym.casino_net;`);
    this.addSql(`INSERT INTO bym.casino_net (user_id, net)
                 SELECT b.user_id, sum(b.payout::bigint - b.stake::bigint) FROM bym.casino_bet b
                   JOIN bym."user" u ON u.userid = b.user_id
                  WHERE b.status = 'settled' GROUP BY b.user_id
                 ON CONFLICT (user_id) DO UPDATE SET net = EXCLUDED.net;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_insert ON bym.casino_bet;`);
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_update ON bym.casino_bet;`);
    this.addSql(`DROP TRIGGER IF EXISTS casino_net_delete ON bym.casino_bet;`);
    this.addSql(`DROP FUNCTION IF EXISTS bym.casino_net_apply();`);
    this.addSql(`DROP TABLE IF EXISTS bym.casino_net;`);
    this.addSql(`DROP INDEX IF EXISTS bym.casino_session_bet_idx;`);
  }
}
