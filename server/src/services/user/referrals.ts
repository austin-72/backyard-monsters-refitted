import { randomBytes } from "crypto";

import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";

/**
 * Referrals (inferno-only).
 *
 * Every player has an invite link, https://<server>/play.swf?ref=<code>, shown by the Invite Friends
 * button. A friend who starts the game from that link and registers is tied to the inviter: the
 * launcher passes the code to the game, the game remembers it and sends it with the registration.
 * There is no code to type anywhere.
 *
 * Both players are paid when the friend's yard is created, that is, the first time the friend
 * actually loads the game. Nothing is paid when the two accounts were made on the same IP address:
 * the friend's registration address is compared with the inviter's registration address and with
 * the address the inviter last logged in from (accounts from before this feature have no
 * registration address on record). Each account can be referred once, and only by someone else.
 */

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i: the link gets read out loud

const newCode = () => {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
};

export const referralsEnabled = () => infernoOnlyConfig.enabled && infernoOnlyConfig.referral.shiny > 0;

/** The player's invite code, made on first use. */
export const getReferralCode = async (user: User): Promise<string> => {
  if (user.referral_code) return user.referral_code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    if (!(await postgres.em.findOne(User, { referral_code: code }))) {
      user.referral_code = code;
      await postgres.em.flush();
      return code;
    }
  }
  throw new Error("could not make a unique referral code");
};

export const inviteLink = (code: string) => {
  const base = (process.env.BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/play.swf?ref=${code}`;
};

/** Registration: tie the new account to the inviter whose code came with it, if it is someone else's. */
export const recordReferral = async (user: User, code: unknown) => {
  if (!referralsEnabled() || typeof code !== "string") return;

  const clean = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(clean)) return;

  const inviter = await postgres.em.findOne(User, { referral_code: clean });
  if (!inviter || inviter.userid === user.userid) return;

  user.referred_by = inviter.userid;
  await postgres.em.flush();
};

const sameIp = (a?: string | null, b?: string | null) => !!a && !!b && a === b;

/**
 * The friend's yard has just been made: pay both sides, unless the accounts share an address.
 * Runs once per account whatever the outcome, so a refused referral is not retried.
 */
export const creditReferral = async (user: User, newSave: Save) => {
  if (!referralsEnabled() || !user.referred_by || user.referral_credited) return;

  user.referral_credited = true;

  const inviter = await postgres.em.findOne(User, { userid: user.referred_by }, { populate: ["save"] });
  if (!inviter?.save) {
    await postgres.em.flush();
    return;
  }

  const shiny = infernoOnlyConfig.referral.shiny;

  if (sameIp(user.registration_ip, inviter.registration_ip) || sameIp(user.registration_ip, inviter.last_ip)) {
    logger.info(`Referral of '${user.username}' by '${inviter.username}' not credited: same IP address`);
    user.referral_notice = "Your invite was noted, but invites only pay out between players on different connections.";
    await postgres.em.flush();
    return;
  }

  newSave.credits = (newSave.credits ?? 0) + shiny;
  inviter.save.credits = (inviter.save.credits ?? 0) + shiny;

  user.referral_notice = `You joined through ${inviter.username}'s invite: you both get ${shiny} shiny.`;
  inviter.referral_notice = `${user.username} joined through your invite link: you both get ${shiny} shiny.`;

  await postgres.em.flush();
  logger.info(`Referral credited: '${inviter.username}' invited '${user.username}', ${shiny} shiny each`);
};

/** A one-time notice for the player, cleared once handed out. */
export const takeReferralNotice = async (user: User): Promise<string> => {
  const notice = user.referral_notice ?? "";
  if (notice) {
    user.referral_notice = null;
    await postgres.em.flush();
  }
  return notice;
};
