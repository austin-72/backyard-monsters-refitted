import { Status } from "../../enums/StatusCodes.js";
import { AllianceMessageType, AllianceRole } from "../../enums/Alliance.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { requireAllianceMember, requireAllianceStaff } from "../../services/alliance/allianceAccess.js";
import { ioRestoreMember, ioTakeLead, parseMemberRecord, undoKickKey } from "../../services/alliance/membership.js";
import { ioSuccession, SUCCESSION_DAYS } from "../../services/alliance/ioSuccession.js";
import { announceShout } from "../../services/alliance/allianceMessages.js";
import { sendMail } from "../../services/mail/sendMail.js";
import { permissionErr } from "../../errors/errors.js";
import type { KoaController } from "../../utils/KoaController.js";

/**
 * Inferno-only: undoing a removal (QoL #501) and taking the lead of an alliance whose leader is away (QoL #172).
 * Every route answers the player's own alliance only.
 */

const requireInferno = () => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
};

const params = (ctx: Parameters<KoaController>[0]) =>
  ({ ...((ctx.request.query ?? {}) as Record<string, unknown>), ...((ctx.request.body ?? {}) as Record<string, unknown>) });

const refuse = (message: string, status: Status = Status.CONFLICT) =>
  new ClientSafeError({ message, status, data: {}, isClientFriendly: true });

/**
 * POST /alliance/undokick { userid } (QoL #501): within 5 minutes of a removal, whoever removed the player (or the
 * leader) puts them back, with the role and join date they had. The record is taken from Redis as it is read
 * (GETDEL), so it is undone once. { error: 0, name } ; refused (409) when too late, when they have joined another
 * alliance meanwhile, or when the alliance is full.
 */
export const undoKick: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  const alliance = await requireAllianceStaff(user);
  const userid = Math.floor(Number(params(ctx).userid));
  if (!Number.isSafeInteger(userid) || userid <= 0) throw permissionErr();

  const key = undoKickKey(alliance.id, userid);
  const raw = (await redis.get(key).catch(() => null)) as string | null;
  const record = parseMemberRecord(raw);
  if (!record || record.allianceId !== alliance.id) throw refuse("It's too late to undo that: ask them to join again.");
  const by = Number((JSON.parse(String(raw)) as { by?: number }).by) || 0;
  if (by !== user.userid && user.alliance_role !== AllianceRole.LEADER) throw refuse("Only whoever removed them, or the leader, can undo it.", Status.FORBIDDEN);

  // (taken once: a second click, or the leader and the officer together, find nothing)
  const ttl = Number(await redis.ttl(key).catch(() => 0)) || 0;
  const taken = await redis.send("GETDEL", [key]).catch(() => null);
  if (taken == null) throw refuse("It's too late to undo that: ask them to join again.");

  const member = await postgres.em.findOne(User, { userid });
  if (!member) throw permissionErr();
  try {
    await ioRestoreMember(member, alliance, record);
  } catch (err) {
    // (refused for now, e.g. the alliance is full: it can be tried again for what is left of the 5 minutes)
    if (ttl > 1) await redis.set(key, String(taken), "EX", String(ttl)).catch(() => null);
    throw err;
  }

  await announceShout({ allianceId: alliance.id, author: member, type: AllianceMessageType.JOINED, body: JSON.stringify({ back: user.username }) });
  void sendMail(user.userid, member.userid, `Back in ${alliance.name}`, `${user.username} undid your removal from the alliance ${alliance.name}: you're back in it, as before.`);

  ctx.status = Status.OK;
  ctx.body = { error: 0, name: member.username };
};

/**
 * POST /alliance/takelead (QoL #172): the most senior active officer takes the lead when the leader hasn't been seen
 * for 14 days (services/alliance/ioSuccession.ts); the old leader becomes an officer and is told by a letter.
 * { error: 0, leader: <their name> } ; refused (409) otherwise, saying why.
 */
export const takeLead: KoaController = async (ctx) => {
  requireInferno();
  const user: User = ctx.authUser;
  if (user.alliance_role !== AllianceRole.OFFICER) throw permissionErr();
  const alliance = await requireAllianceMember(user);

  const s = await ioSuccession(alliance.id);
  if (!s) throw refuse(`The leader has been seen in the last ${SUCCESSION_DAYS} days.`);
  if (s.candidateId !== user.userid) {
    throw refuse(s.candidateName ? `${s.candidateName}, the longest-serving active officer, can take the lead.` : "Only an active officer can take the lead.");
  }

  const leader = await postgres.em.findOne(User, { userid: s.leaderId });
  if (!leader) throw permissionErr();
  await ioTakeLead(user, alliance, leader);

  void sendMail(user.userid, leader.userid, `${alliance.name} has a new leader`, `You hadn't been seen for ${SUCCESSION_DAYS} days, so ${user.username} has taken the lead of ${alliance.name}. You are an officer now.`);

  ctx.status = Status.OK;
  ctx.body = { error: 0, leader: user.username };
};
