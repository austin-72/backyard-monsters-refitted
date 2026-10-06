import { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only daily login reward.
 *
 * Each UTC day the player can collect once, from a popup on their main yard. The streak keeps counting
 * (it no longer starts over after a week): every 14th day pays `dailyLogin.streakShiny` (200), every
 * other 7th day `dailyLogin.weekShiny` (100), the rest `dailyLogin.shiny` (10). Missing a day starts
 * the streak again at day 1.
 */

export interface DailyOffer {
  /** The day of the streak this collection would be (1, 2, ... without end). */
  day: number;
  shiny: number;
  streakDays: number;
}

export const dailyLoginEnabled = () =>
  infernoOnlyConfig.enabled && infernoOnlyConfig.dailyLogin.shiny > 0;

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

const today = () => utcDay(new Date());

const yesterday = () => utcDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

/** What collecting today would give, or null if it has already been collected. */
export const dailyOffer = (user: User): DailyOffer | null => {
  if (!dailyLoginEnabled()) return null;

  const last = user.login_last_claim ?? null;
  if (last === today()) return null;

  const { streakDays } = infernoOnlyConfig.dailyLogin;
  const streak = last === yesterday() ? (user.login_streak ?? 0) : 0;
  const day = streak + 1;

  return { day, shiny: payoutFor(day), streakDays };
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
  const amounts = { shiny, weekDays, weekShiny, streakShiny };

  // A stored 0 collected today is a streak that ended on day 7 under the old rules (they started over).
  if (last === today()) return { day: stored === 0 ? weekDays : stored, collected: 1, streakDays, ...amounts };

  // Not collected yet today: also say what collecting now gives (the Daily Reward button shows it).
  const offer = dailyOffer(user);
  const pending = { collected: 0, streakDays, ...amounts, offerDay: offer?.day ?? 1, offerShiny: offer?.shiny ?? 0 };
  if (last === yesterday()) return { day: stored, ...pending };
  return { day: 0, ...pending };
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

  const claimed = await em.nativeUpdate(
    User,
    { userid: user.userid, login_last_claim: previous },
    { login_last_claim: today(), login_streak: nextStreak }
  );
  if (claimed !== 1) return null;

  const save = await em.findOne(Save, { userid: user.userid, type: BaseType.MAIN });
  if (!save) return null;

  save.credits = (save.credits ?? 0) + offer.shiny;
  await em.flush();

  user.login_last_claim = today();
  user.login_streak = nextStreak;

  logger.info(`Daily reward: '${user.username}' collected day ${offer.day} (${offer.shiny} shiny)`);
  return { ...offer, credits: save.credits, streak: nextStreak };
};
