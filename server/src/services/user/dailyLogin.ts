import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { isShinyLocked, visibleCredits } from "./shinyLock.js";
import { logPlayerAction } from "./playerLog.js";

/**
 * Inferno-only daily login reward.
 *
 * Each UTC day the player can collect once, from a popup on their main yard. The streak keeps counting
 * (it no longer starts over after a week): every 14th day pays `dailyLogin.streakShiny` (200), every
 * other 7th day `dailyLogin.weekShiny` (100), the rest `dailyLogin.shiny` (10). Missing a day starts
 * the streak again at day 1.
 *
 * (QoL #126: streak savers. Each completed `saverEveryDays`-day stretch (day 14, 28, ...) earns a streak saver, at most
 * one held (bym."user".login_savers); a single missed UTC day is then forgiven when the player comes back, and the
 * saver is used up by that day's collection. A streak that breaks anyway can be bought back for Shiny on the day it
 * broke (the 24 h after the UTC midnight it could no longer go on): buyBackStreak. The price is
 * `buyBackShinyPerDay` per day of the streak, between `buyBackShinyMin` and `buyBackShinyMax`. All decided here;
 * the popup only shows it and asks.)
 */

export interface DailyOffer {
  /** The day of the streak this collection would be (1, 2, ... without end). */
  day: number;
  shiny: number;
  streakDays: number;
  /** (QoL #126) 1: yesterday was missed and a streak saver keeps the streak going (used up by this collection). */
  saved: number;
}

/** (QoL #126) At most this many streak savers are held at once. */
export const SAVER_MAX = 1;

/**
 * (QoL #126) The streak savers' settings, from InfernoOnlyConfig.dailyLogin, each with its default until the config
 * has it (saverEveryDays 14, buyBackShinyPerDay 5, buyBackShinyMin 25, buyBackShinyMax 250).
 */
export const saverSettings = () => {
  const d = (infernoOnlyConfig.dailyLogin ?? {}) as unknown as Record<string, unknown>;
  const num = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : def);
  const min = Math.floor(num(d.buyBackShinyMin, 25));
  return {
    every: Math.max(1, Math.floor(num(d.saverEveryDays, 14))),
    perDay: num(d.buyBackShinyPerDay, 5),
    min,
    max: Math.max(min, Math.floor(num(d.buyBackShinyMax, 250))),
  };
};

/** (QoL #126) What buying back a `streak`-day streak costs. */
export const buyBackPrice = (streak: number) => {
  const { perDay, min, max } = saverSettings();
  return Math.min(max, Math.max(min, Math.round(streak * perDay)));
};

/** (QoL #126) A streak this short isn't offered for buying back (it would cost more than it is worth). */
const BUY_BACK_MIN_STREAK = 2;

export const dailyLoginEnabled = () =>
  infernoOnlyConfig.enabled && infernoOnlyConfig.dailyLogin.shiny > 0;

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

const today = () => utcDay(new Date());

const yesterday = () => utcDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

const DAY_MS = 24 * 60 * 60 * 1000;

/** (QoL #126) Whole UTC days from `last` (YYYY-MM-DD) to today: 0 today, 1 yesterday; null when there is none. */
const daysSince = (last: string | null): number | null => {
  if (!last) return null;
  const then = Date.parse(`${last}T00:00:00Z`);
  if (!Number.isFinite(then)) return null;
  return Math.round((Date.parse(`${today()}T00:00:00Z`) - then) / DAY_MS);
};

type StreakColumns = Pick<User, "login_streak" | "login_last_claim" | "login_savers">;

export interface BuyBackOffer {
  /** The streak that broke (days collected in a row). */
  streak: number;
  price: number;
  /** Epoch ms the offer ends: the next UTC midnight, 24 h after the streak broke. */
  until: number;
}

/**
 * (QoL #126) Where the streak stands, from the user row's columns alone:
 *  - collected: today's reward has been collected;
 *  - continues: yesterday's was, today's is waiting;
 *  - saved: yesterday was missed, but a streak saver is held, so today's collection goes on with the streak;
 *  - broken: it starts again at day 1; on the day it broke (one day later with a saver held, which covers one day
 *    only) it can be bought back (`buyBack`).
 */
export const streakState = (row: StreakColumns) => {
  const last = row.login_last_claim ?? null;
  const stored = Number(row.login_streak ?? 0) || 0;
  const savers = Math.min(SAVER_MAX, Math.max(0, Number(row.login_savers ?? 0) || 0));
  const gap = daysSince(last);
  const none = { stored, savers, buyBack: null as BuyBackOffer | null };
  if (gap === 0) return { kind: "collected" as const, ...none };
  if (gap === 1) return { kind: "continues" as const, ...none };
  if (gap === 2 && savers > 0 && stored > 0) return { kind: "saved" as const, ...none };
  // broken: the streak could no longer go on from the midnight after its last day (a saver held: one day later);
  // it can be bought back for the 24 h after that, which is all of today
  const lostGap = savers > 0 ? 3 : 2;
  const buyBack: BuyBackOffer | null =
    gap === lostGap && stored >= BUY_BACK_MIN_STREAK
      ? { streak: stored, price: buyBackPrice(stored), until: Date.parse(`${today()}T00:00:00Z`) + DAY_MS }
      : null;
  return { kind: "broken" as const, stored, savers, buyBack };
};

/** What collecting today would give, or null if it has already been collected. */
export const dailyOffer = (user: User): DailyOffer | null => {
  if (!dailyLoginEnabled()) return null;

  const last = user.login_last_claim ?? null;
  if (last === today()) return null;

  const { streakDays } = infernoOnlyConfig.dailyLogin;
  // (QoL #126: a missed day covered by a streak saver goes on with the streak too)
  const state = streakState(user);
  const goesOn = state.kind === "continues" || state.kind === "saved";
  const streak = goesOn ? (user.login_streak ?? 0) : 0;
  const day = streak + 1;

  return { day, shiny: payoutFor(day), streakDays, saved: state.kind === "saved" ? 1 : 0 };
};

/** What collecting on day `day` of a streak pays. */
export const payoutFor = (day: number) => {
  const { shiny, weekDays, weekShiny, streakDays, streakShiny } = infernoOnlyConfig.dailyLogin;
  if (day > 0 && day % streakDays === 0) return streakShiny;
  if (day > 0 && day % weekDays === 0) return weekShiny;
  return shiny;
};

/**
 * The streak as the Daily Reward button shows it: `day` is how many days in a row have been collected,
 * `collected` whether today's reward has been, and while it has not, `offerDay` / `offerShiny` what
 * collecting now gives. The amounts let the popup label every day (see payoutFor).
 */
export const streakStatus = (user: User) => {
  if (!dailyLoginEnabled()) return null;

  const { streakDays, shiny, weekDays, weekShiny, streakShiny } = infernoOnlyConfig.dailyLogin;
  const last = user.login_last_claim ?? null;
  const stored = user.login_streak ?? 0;
  // (QoL #126: the streak savers held, how often one is earned, a missed day saved, a broken streak's buy-back offer)
  const state = streakState(user);
  const amounts = { shiny, weekDays, weekShiny, streakShiny, savers: state.savers, saverMax: SAVER_MAX, saverEvery: saverSettings().every };

  // A stored 0 collected today is a streak that ended on day 7 under the old rules (they started over).
  if (last === today()) return { day: stored === 0 ? weekDays : stored, collected: 1, streakDays, ...amounts, saved: 0, buyBack: null };

  // Not collected yet today: also say what collecting now gives (the Daily Reward button shows it).
  const offer = dailyOffer(user);
  const pending = { collected: 0, streakDays, ...amounts, offerDay: offer?.day ?? 1, offerShiny: offer?.shiny ?? 0, saved: offer?.saved ?? 0 };
  if (state.kind === "continues" || state.kind === "saved") return { day: stored, ...pending, buyBack: null };
  return { day: 0, ...pending, buyBack: state.buyBack };
};

/**
 * Collects today's reward. The claim is made with a conditional update on the user row, so two
 * requests at once (a double click, two open games) can only pay once.
 */
export const claimDaily = async (user: User) => {
  const offer = dailyOffer(user);
  if (!offer) return null;

  const em = postgres.em.fork();
  const previous = user.login_last_claim ?? null;
  const nextStreak = offer.day;
  // (QoL #126: a saver covering yesterday is used up; each completed stretch (day 14, 28, ...) earns one, at most 1 held)
  const held = Math.min(SAVER_MAX, Math.max(0, user.login_savers ?? 0));
  let savers = Math.max(0, held - (offer.saved ? 1 : 0));
  if (nextStreak % saverSettings().every === 0) savers = Math.min(SAVER_MAX, savers + 1);

  // (18 October, SUSPECTED-BUGS.md: the day was marked collected first and the Shiny paid after, apart, so with no
  // main yard found the day was gone and nothing paid) both in one transaction, the Shiny added in the database
  const credits = await em
    .transactional(async (tx) => {
      const claimed = await tx.nativeUpdate(
        User,
        { userid: user.userid, login_last_claim: previous },
        { login_last_claim: today(), login_streak: nextStreak, login_savers: savers }
      );
      if (claimed !== 1) return null;
      const paid = (await tx.getConnection().execute(
        `UPDATE bym.save SET credits = COALESCE(credits, 0) + ? WHERE userid = ? AND type = ? RETURNING credits`,
        [offer.shiny, user.userid, BaseType.MAIN], "all", tx.getTransactionContext()
      )) as { credits: number }[];
      if (paid.length !== 1) throw new Error(`no main yard to pay day ${offer.day} into`);
      return Number(paid[0].credits);
    })
    .catch((err) => {
      logger.warn(`Daily reward: '${user.username}' not collected: ${err}`);
      return null;
    });
  if (credits === null) return null;
  // (the request's own copy of the save must not later write back an older balance)
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
  const save = { credits };

  user.login_last_claim = today();
  user.login_streak = nextStreak;
  user.login_savers = savers;

  logger.info(`Daily reward: '${user.username}' collected day ${offer.day} (${offer.shiny} shiny)${offer.saved ? " (a streak saver covered yesterday)" : ""}`);
  return { ...offer, credits: save.credits, streak: nextStreak, savers };
};

/** (QoL #126) A buy-back refused, with the reason the player sees. */
export class StreakError extends Error {}

/**
 * (QoL #126) Buys back a streak that broke today (streakState's `buyBack`) for its price in Shiny: the user row and the
 * main yard's save locked in one transaction, so two requests at once can't buy it twice or spend the same Shiny.
 * The streak then goes on as if yesterday had been collected (today's reward is still waiting, the next day of it).
 * `expected`: the streak the popup showed (0: any); a different one is refused, so the player never pays for an
 * offer they didn't see.
 */
export const buyBackStreak = async (user: User, expected: number) => {
  if (!dailyLoginEnabled()) throw new StreakError("The daily reward is not available right now.");
  if (isShinyLocked(user)) throw new StreakError("Shiny is turned off on your account, so you can't buy your streak back.");

  const paid = await postgres.em.fork().transactional(async (em) => {
    const conn = em.getConnection();
    const tx = em.getTransactionContext();
    const rows = (await conn.execute(
      `SELECT login_streak, login_last_claim, login_savers FROM bym."user" WHERE userid = ? FOR UPDATE`,
      [user.userid], "all", tx
    )) as StreakColumns[];
    if (!rows.length) throw new StreakError("Your account could not be found.");
    const offer = streakState(rows[0]).buyBack;
    if (!offer) throw new StreakError("There is no streak to buy back right now.");
    if (expected > 0 && offer.streak !== expected) throw new StreakError("Your streak has changed. Please open the daily reward again.");
    const left = (await conn.execute(
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`,
      [offer.price, user.userid, BaseType.MAIN, offer.price], "all", tx
    )) as { credits: number }[];
    if (left.length !== 1) throw new StreakError(`Buying your streak back costs ${offer.price} Shiny: you don't have enough.`);
    // as if yesterday had been collected: the stored streak goes on, today's reward is the next day of it
    await conn.execute(`UPDATE bym."user" SET login_last_claim = ? WHERE userid = ? RETURNING userid`, [yesterday(), user.userid], "all", tx);
    return { streak: offer.streak, price: offer.price, credits: Number(left[0].credits) };
  });

  user.login_last_claim = yesterday();
  user.login_streak = paid.streak;
  // (the request's own copy of the save must not later write back an older balance)
  if (user.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = paid.credits;

  logger.info(`Daily reward: '${user.username}' bought back a ${paid.streak}-day streak for ${paid.price} shiny`);
  void logPlayerAction(user.userid, user.username, "streak_buyback", { streak: paid.streak, shiny: paid.price, credits: paid.credits });
  return { ...paid, credits: visibleCredits(user, paid.credits) };
};

/**
 * (QoL #126) The streak savers' column, made if missing (migration 20261108_StreakSaver does the same): a production
 * server runs its migrations by hand, and the user entity reads the column on every request. Made now, each streak
 * still alive at day 14 or more starts with its saver.
 */
export const ensureStreakSaver = async (): Promise<void> => {
  const conn = postgres.em.getConnection();
  const has = await conn.execute<{ n: number }[]>(
    `SELECT 1 AS n FROM information_schema.columns WHERE table_schema = 'bym' AND table_name = 'user' AND column_name = 'login_savers'`
  );
  if (has.length) return;
  await conn.execute(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS login_savers INT NOT NULL DEFAULT 0`);
  await conn.execute(
    `UPDATE bym."user" SET login_savers = 1 WHERE login_streak >= ?
       AND login_last_claim >= to_char((now() AT TIME ZONE 'utc')::date - 1, 'YYYY-MM-DD')`,
    [saverSettings().every]
  );
};
