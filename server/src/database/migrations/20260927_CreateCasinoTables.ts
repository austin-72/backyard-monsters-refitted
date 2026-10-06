import { Migration } from "@mikro-orm/migrations";

/**
 * The Brimstone Pit (config/CasinoConfig.ts):
 *  - casino_seed: each player's provably fair seeds (the server seed stays secret until rotated; its
 *    hash is shown before play) and the count of bets made on them
 *  - casino_seed_reveal: server seeds rotated out, shown so past results can be checked
 *  - casino_bet: the ledger, one row per bet, with what was drawn; a bet's request_id is unique per
 *    player, so a request sent twice is only played once
 *  - casino_session: games played over several requests (Bone Pile), one open per player
 *  - casino_round: shared rounds (Balthazar's Ascent, Magma Derby)
 *  - casino_jackpot: the Magma Slots pool (one row)
 */
export class CreateCasinoTables extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_seed (
        user_id INTEGER PRIMARY KEY REFERENCES bym."user"(userid) ON DELETE CASCADE,
        server_seed VARCHAR(64) NOT NULL,
        server_seed_hash VARCHAR(64) NOT NULL,
        client_seed VARCHAR(64) NOT NULL,
        nonce INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_seed_reveal (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        server_seed VARCHAR(64) NOT NULL,
        server_seed_hash VARCHAR(64) NOT NULL,
        client_seed VARCHAR(64) NOT NULL,
        nonces INTEGER NOT NULL,
        revealed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS casino_seed_reveal_user_idx ON bym.casino_seed_reveal (user_id, revealed_at DESC)`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_bet (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        request_id VARCHAR(64) NOT NULL,
        game VARCHAR(16) NOT NULL,
        round_id BIGINT NULL,
        stake INTEGER NOT NULL,
        payout INTEGER NOT NULL DEFAULT 0,
        multiplier NUMERIC(10, 2) NOT NULL DEFAULT 0,
        outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
        seed_hash VARCHAR(64) NULL,
        client_seed VARCHAR(64) NULL,
        nonce INTEGER NULL,
        status VARCHAR(12) NOT NULL DEFAULT 'settled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        settled_at TIMESTAMPTZ NULL,
        CONSTRAINT casino_bet_request_unique UNIQUE (user_id, request_id),
        CONSTRAINT casino_bet_game_check CHECK (game IN ('magmadrop', 'roulette', 'bonepile', 'ascent', 'slots', 'derby', 'scratch')),
        CONSTRAINT casino_bet_status_check CHECK (status IN ('open', 'settled', 'refunded')),
        CONSTRAINT casino_bet_stake_check CHECK (stake > 0 AND payout >= 0)
      )`);
    await this.execute(`CREATE INDEX IF NOT EXISTS casino_bet_user_idx ON bym.casino_bet (user_id, created_at DESC)`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_session (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES bym."user"(userid) ON DELETE CASCADE,
        game VARCHAR(16) NOT NULL,
        bet_id BIGINT NOT NULL REFERENCES bym.casino_bet(id) ON DELETE CASCADE,
        stake INTEGER NOT NULL,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        layout JSONB NOT NULL DEFAULT '{}'::jsonb,
        revealed JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(12) NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT casino_session_status_check CHECK (status IN ('open', 'won', 'lost', 'refunded'))
      )`);
    await this.execute(`CREATE UNIQUE INDEX IF NOT EXISTS casino_session_one_open ON bym.casino_session (user_id) WHERE status = 'open'`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_round (
        id BIGSERIAL PRIMARY KEY,
        game VARCHAR(16) NOT NULL,
        seed VARCHAR(64) NOT NULL,
        seed_hash VARCHAR(64) NOT NULL,
        params JSONB NOT NULL DEFAULT '{}'::jsonb,
        result JSONB NULL,
        betting_opens_at TIMESTAMPTZ NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NULL,
        status VARCHAR(12) NOT NULL DEFAULT 'betting',
        CONSTRAINT casino_round_game_check CHECK (game IN ('ascent', 'derby')),
        CONSTRAINT casino_round_status_check CHECK (status IN ('betting', 'running', 'settled'))
      )`);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.casino_jackpot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pool BIGINT NOT NULL,
        last_winner_user_id INTEGER NULL,
        last_won_at TIMESTAMPTZ NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.execute(`INSERT INTO bym.casino_jackpot (id, pool) VALUES (1, 500) ON CONFLICT (id) DO NOTHING`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.casino_jackpot`);
    await this.execute(`DROP TABLE IF EXISTS bym.casino_round`);
    await this.execute(`DROP TABLE IF EXISTS bym.casino_session`);
    await this.execute(`DROP TABLE IF EXISTS bym.casino_bet`);
    await this.execute(`DROP TABLE IF EXISTS bym.casino_seed_reveal`);
    await this.execute(`DROP TABLE IF EXISTS bym.casino_seed`);
  }
}
