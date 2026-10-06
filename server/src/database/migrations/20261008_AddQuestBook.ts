import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only quest book (2 October): bym.quest_progress, one row for each player who has counted or
 * collected anything (services/quests/questProgress.ts):
 *  - counters: what the server and the game count for quests (chat lines, captures, wins, warts...);
 *  - claimed: the quests and chests collected, each with when (epoch seconds);
 *  - daily: today's (UTC) counters and the daily quests collected, { date, c, claimed };
 *  - forced: quests an admin marked ready.
 * The old quests (save.quests) are untouched: the stock game still uses them.
 */
export class AddQuestBook extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bym.quest_progress (
        userid INT PRIMARY KEY REFERENCES bym."user"(userid) ON DELETE CASCADE,
        counters JSONB NOT NULL DEFAULT '{}'::jsonb,
        claimed JSONB NOT NULL DEFAULT '{}'::jsonb,
        daily JSONB NOT NULL DEFAULT '{}'::jsonb,
        forced JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS bym.quest_progress`);
  }
}
