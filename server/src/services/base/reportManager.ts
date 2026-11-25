import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { logger } from "../../utils/logger.js";
import { Report } from "../../database/models/report.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";

type ReportEntry = {
  message: string;
  timestamp: string;
};

/**
 * Logs a general report for a user with a message and timestamp.
 * Increments the user's violation count and appends the message to the report list.
 *
 * @param {User} user - The user being reported.
 * @param {string} message - The message describing the violation or report reason.
 * @returns {Promise<void>}
 */
export const logReport = async (user: User, message: string) => {
  const incident = await getOrCreateReport(user);

  const newReport: ReportEntry = {
    message,
    timestamp: new Date().toISOString(),
  };

  (incident.report ??= []).push(newReport);
  postgres.em.persist(incident);
  await postgres.em.flush();
};

/**
 * Logs an attack validation violation for a user.
 * This is specifically used to track attack payload tampering from validateAttack.
 *
 * @param {User} user - The user with the attack violation.
 * @param {string} message - The detailed message about the attack violation.
 * @returns {Promise<void>}
 */
/**
 * An attack payload the server would not accept. The attack is refused by the caller; this records
 * why. The stock server also banned the account outright, on the first offence, with no way for
 * the player to know what happened ("Your account has been permanently banned"). A real player was
 * caught by that on this server, so now: the report is kept, the reason is written to the server
 * log where an admin will see it, and the account is banned only after
 * infernoOnlyConfig.attackViolationBanAfter refused attacks (0: never automatically).
 */
export const logAttackViolation = async (user: User, message: string) => {
  const incident = await getOrCreateReport(user);

  incident.attackViolations += 1;

  const banAfter = infernoOnlyConfig.enabled ? infernoOnlyConfig.attackViolationBanAfter : 1;
  const ban = banAfter > 0 && incident.attackViolations >= banAfter;
  if (ban) user.banned = true;

  logger.warn(
    `Attack refused for '${user.username}' (ID ${user.userid}): ${message} | refused attacks: ${incident.attackViolations}` +
      (ban ? " | ACCOUNT BANNED" : "")
  );

  const newReport: ReportEntry = {
    message: `ATTACK VIOLATION: ${message}`,
    timestamp: new Date().toISOString(),
  };

  (incident.report ??= []).push(newReport);
  postgres.em.persist([incident, user]);
  await postgres.em.flush();
  if (ban) await silenceBanned(user.userid);
};

/**
 * (18 October, SUSPECTED-BUGS.md: an automatic ban set only user.banned, so a player already in chat went on talking,
 * and their sessions went on) silent in chat at once, as the admin panel's ban, and signed out everywhere.
 */
const silenceBanned = async (userid: number) => {
  await redis.set(`chat:banned:${userid}`, "1").catch(() => 0);
  const rows = (await postgres.em.getConnection().execute(`SELECT email FROM bym."user" WHERE userid = ?`, [userid], "all").catch(() => [])) as { email: string }[];
  if (rows[0]?.email) {
    const { endSessions } = await import("../user/sessionStore.js");
    await endSessions(rows[0].email).catch(() => undefined);
  }
};

/**
 * Logs a ban report for a user with a message and timestamp.
 * Increments the user's violation count and sets the ban reason.
 *
 * @param {User} user - The user being banned.
 * @param {string} message - The message explaining the reason for the ban.
 * @returns {Promise<void>}
 */
export const logBanReport = async (user: User, message: string) => {
  const incident = await getOrCreateReport(user);

  const banReason: ReportEntry = {
    message,
    timestamp: new Date().toISOString(),
  };

  incident.banReason = banReason;
  user.banned = true;
  postgres.em.persist(incident);
  await postgres.em.flush();
  await silenceBanned(user.userid);
};

/**
 * Fetches an existing report for the user or creates a new one if none exists.
 * Also increments the violation count.
 *
 * @param {User} user - The user object containing ID and identifying info.
 * @returns {Promise<Report>} - The existing or newly created report entity.
 */
const getOrCreateReport = async (user: User): Promise<Report> => {
  const { userid, username, discord_tag } = user;
  let incident = await postgres.em.findOne(Report, { userid });

  if (!incident) {
    incident = new Report();
    incident.userid = userid;
    incident.username = username;
    incident.discord_tag = discord_tag ?? null;
    incident.violations = 0;
    incident.attackViolations = 0;
    incident.report = [];
    incident.banReason = undefined;
  }

  incident.violations += 1;
  return incident;
};