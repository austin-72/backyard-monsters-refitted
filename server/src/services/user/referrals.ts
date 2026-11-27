import { randomBytes } from "crypto";

import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { roleOf } from "../../chat/chatModeration.js";

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
 * registration address on record). Each account can be referred once, and only by someone else. Nothing is
 * paid either when an admin has barred the inviter from invite rewards (abuse of the link; the admin panel).
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

/** The invite link: the browser client's address (referral.inviteUrl, or BASE_URL) with ?ref=<code>. */
export const inviteLink = (code: string) => {
  const base = (infernoOnlyConfig.referral.inviteUrl || process.env.BASE_URL || "").replace(/\/+$/, "");
  return `${base}/?ref=${code}`;
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
  // (13 October) claimed in the database first: two first loads at once both saw it not credited and paid twice
  const claimed = (await postgres.em.getConnection().execute(
    `UPDATE bym."user" SET referral_credited = true WHERE userid = ? AND NOT COALESCE(referral_credited, false) RETURNING userid`,
    [user.userid], "all")) as { userid: number }[];
  if (claimed.length !== 1) return;
  try {
    const meta = postgres.em.getUnitOfWork().getOriginalEntityData(user);
    if (meta) (meta as Record<string, unknown>).referral_credited = true;
  } catch {
    // (no original data)
  }

  const inviter = await postgres.em.findOne(User, { userid: user.referred_by }, { populate: ["save"] });
  if (!inviter?.save) {
    user.referral_result = "no-inviter";
    await postgres.em.flush();
    return;
  }

  const shiny = infernoOnlyConfig.referral.shiny;

  // Barred by an admin (abuse of the invite link): nothing for either side.
  if (inviter.referral_barred) {
    logger.info(`Referral of '${user.username}' by '${inviter.username}' not credited: the inviter is barred from invite rewards`);
    user.referral_result = "barred";
    await postgres.em.flush();
    return;
  }

  if (sameIp(user.registration_ip, inviter.registration_ip) || sameIp(user.registration_ip, inviter.last_ip)) {
    logger.info(`Referral of '${user.username}' by '${inviter.username}' not credited: same IP address`);
    user.referral_notice = "Your invite was noted, but invites only pay out between players on different connections.";
    user.referral_result = "same-ip";
    await postgres.em.flush();
    return;
  }

  newSave.credits = (newSave.credits ?? 0) + shiny;
  // (the inviter's Shiny added in the database, not written back whole: what they spent meanwhile stays spent)
  const [paid] = (await postgres.em.getConnection().execute(
    `UPDATE bym.save SET credits = COALESCE(credits, 0) + ? WHERE basesaveid = ? RETURNING credits`,
    [shiny, inviter.save.basesaveid], "all")) as { credits: number }[];
  if (paid) {
    inviter.save.credits = paid.credits;
    try {
      const meta = postgres.em.getUnitOfWork().getOriginalEntityData(inviter.save);
      if (meta) (meta as Record<string, unknown>).credits = paid.credits;
    } catch {
      // (no original data)
    }
  }
  user.referral_result = "paid";

  user.referral_notice = `You joined through ${inviter.username}'s invite: you both get ${shiny} shiny.`;
  inviter.referral_notice = `${user.username} joined through your invite link: you both get ${shiny} shiny.`;

  await postgres.em.flush();
  logger.info(`Referral credited: '${inviter.username}' invited '${user.username}', ${shiny} shiny each`);
};

/**
 * Invites accepted (12 October): the friends who joined through the player's link and were credited (paid: not on the
 * player's own connection, the player not barred). They open the invite-only looks (INVITE_UNLOCKS).
 */
export const acceptedInvites = async (userid: number): Promise<number> => {
  if (!userid) return 0;
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT count(*)::int AS n FROM bym."user" WHERE referred_by = ? AND referral_result = 'paid'`, [userid])) as { n: number }[];
  return Number(rows[0]?.n ?? 0);
};

/**
 * Inferno-only (QoL #192): the player's own invite progress, for the Invite Friends popup: friends who joined through
 * the link, how many were paid, and how many haven't loaded the game yet (nothing decided).
 */
export const inviteProgress = async (userid: number): Promise<{ joined: number; paid: number; waiting: number }> => {
  if (!userid) return { joined: 0, paid: 0, waiting: 0 };
  const rows = (await postgres.em.getConnection().execute(
    `SELECT count(*)::int AS joined, count(*) FILTER (WHERE referral_result = 'paid')::int AS paid,
            count(*) FILTER (WHERE referral_result IS NULL AND NOT coalesce(referral_credited, false))::int AS waiting
       FROM bym."user" WHERE referred_by = ?`,
    [userid]
  )) as { joined: number; paid: number; waiting: number }[];
  return { joined: Number(rows[0]?.joined ?? 0), paid: Number(rows[0]?.paid ?? 0), waiting: Number(rows[0]?.waiting ?? 0) };
};

/**
 * Admins and moderators have the invite-only looks without inviting anyone, and (27 November, the user's: "unlock
 * everything for admins/mods in terms of grounds/chat names in dave club") every ground and name look, whatever opens
 * it (outposts, level, Hell Freezes Over: terrain.ts, dave.ts). Admins: the config's names, and an account given a role
 * in the panel (owner, admin, support); moderators: the chat's.
 */
export const inviteLooksFree = async (userid: number): Promise<boolean> => {
  if (!userid) return false;
  const rows = (await postgres.em.getConnection().execute(`SELECT username, admin_role FROM bym."user" WHERE userid = ?`, [userid])) as { username: string; admin_role: string | null }[];
  if (!rows[0]?.username) return false;
  if (["owner", "admin", "support"].includes(String(rows[0].admin_role ?? ""))) return true;
  return (await roleOf(userid, rows[0].username).catch(() => null)) != null;
};

/** The invites the looks are opened by: the friends who joined, or all of them for admins and moderators. */
export const invitesForLooks = async (userid: number): Promise<number> =>
  (await inviteLooksFree(userid).catch(() => false)) ? Number.MAX_SAFE_INTEGER : acceptedInvites(userid);

/**
 * The looks only inviting friends opens (12 October), by the invites accepted each needs: a ground (terrain.ts) and a
 * name effect for chat (dave.ts) at 1, 2 and 3, each better than the one before.
 */
export const INVITE_UNLOCKS = {
  grounds: { io_ashfall: 1, io_obsidian: 2, io_soulfire: 3 } as Record<string, number>,
  nameFx: { fx_ember: 1, fx_brimstone: 2, fx_soulfire: 3 } as Record<string, number>,
};

/** "Invite 2 friends to have this (1 so far)." */
export const inviteLockText = (need: number, have: number) =>
  `Invite ${need} friend${need == 1 ? "" : "s"} to have this (${have} so far): a friend counts once they join through your invite link.`;

/** A one-time notice for the player, cleared once handed out. */
export const takeReferralNotice = async (user: User): Promise<string> => {
  const notice = user.referral_notice ?? "";
  if (notice) {
    user.referral_notice = null;
    await postgres.em.flush();
  }
  return notice;
};
