import { Status } from "../../enums/StatusCodes.js";
import type { KoaController } from "../../utils/KoaController.js";
import { ReportMessageSchema } from "./zod/ReportMessageSchema.js";
import { postgres, redis } from "../../server.js";
import { Thread } from "../../database/models/thread.model.js";
import { User } from "../../database/models/user.model.js";
import { Message } from "../../database/models/message.model.js";
import { mailboxErr } from "../../errors/errors.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { recordPlayerReport } from "../../services/admin/bugReports.js";
import { chatIgnoreKey } from "../../chat/chatChannels.js";
import { logger } from "../../utils/logger.js";

/** Inferno-only (QoL #185): a player can report this many letters an hour, and a thread once a day. */
const REPORTS_AN_HOUR = 5;
/** The letters the admins are shown: the thread's last few. */
const LETTERS_SHOWN = 6;

/**
 * Inferno-only (QoL #185): the thread's last letters, and who wrote them, to the admin panel's Reports tab
 * (services/admin/bugReports.recordPlayerReport), as a chat line reported is. Whether it went (false: reported
 * already, or too many this hour; the block happens either way).
 */
const reportLetters = async (user: User, otherId: number, threadid: number): Promise<boolean> => {
  const onceKey = `mail:reported:${user.userid}:${threadid}`;
  const limitKey = `mail:reports:${user.userid}`;
  if (await redis.get(onceKey).catch(() => null)) return false;
  if (Number((await redis.get(limitKey).catch(() => null)) ?? 0) >= REPORTS_AN_HOUR) return false;
  const em = postgres.em.fork();
  const other = await em.findOne(User, { userid: otherId }, { fields: ["userid", "username"] });
  if (!other) return false;
  const letters = (await em.find(Message, { threadid }, { orderBy: { createdAt: "DESC" }, limit: LETTERS_SHOWN })).reverse();
  const nameOf = (id: number) => (id === user.userid ? user.username : id === otherId ? other.username : `#${id}`);
  const clean = (t: unknown) => String(t ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ").trim();
  const when = (m: Message) => (m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 16).replace("T", " ") : "");
  const theirs = letters.filter((m) => m.userid === otherId);
  const last = theirs[theirs.length - 1];
  const subject = clean(letters[0]?.subject ?? "");
  const details =
    `Reported by ${user.username} (#${user.userid}): letters from ${other.username} (#${otherId}), thread ${threadid}${subject ? `, "${subject.slice(0, 100)}"` : ""}\n` +
    (last ? `${when(last)} ${other.username}: ${clean(last.message).slice(0, 600)}` : `(no letter from ${other.username} in it)`);
  const context = letters.length
    ? `The thread's last letters:\n${letters.map((m) => `${m.userid === otherId ? ">> " : "   "}${when(m)} ${nameOf(m.userid)}: ${clean(m.message).slice(0, 600)}`).join("\n")}`
    : "";
  await recordPlayerReport({
    kind: "mail",
    reporter: { userid: user.userid, username: user.username },
    target: { userid: otherId, username: other.username },
    details,
    context,
  });
  await redis.setex(onceKey, 24 * 60 * 60, "1").catch(() => 0);
  const n = Number(await redis.incr(limitKey).catch(() => 0));
  if (n === 1) await redis.expire(limitKey, 60 * 60).catch(() => 0);
  return true;
};

/**
 * Controller to report/block a user from a message thread
 *
 * @param {Context} ctx - The Koa context object, which includes the request body.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if the request body is missing required fields or if logging fails.
 */
export const reportMessageThread: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { threadid } = ReportMessageSchema.parse(ctx.request.body);

  const thread = await postgres.em.findOne(Thread, { threadid });

  if (!thread) throw mailboxErr();

  // (Inferno-only, QoL #185: only a thread the player is in)
  if (infernoOnlyConfig.enabled && thread.userid !== user.userid && thread.targetid !== user.userid) throw mailboxErr();

  // Determine the other user in the thread
  const blockedUserId = thread.userid === user.userid ? thread.targetid : thread.userid;

  // Inferno-only (QoL #185): the report reaches the admins (it used to only block); never fails the block
  let reported = false;
  if (infernoOnlyConfig.enabled) {
    reported = await reportLetters(user, blockedUserId, threadid).catch((err) => {
      logger.warn(`Mail: the report of thread ${threadid} by ${user.userid} was not kept: ${err}`);
      return false;
    });
    // (QoL #184: one block list: the sender is ignored in chat too, and Unignore there undoes both: chat/chatIgnoreList.ts)
    await redis.send("SADD", [chatIgnoreKey(user.userid), String(blockedUserId)]).catch(() => 0);
  }

  if (user.blockedUsers.includes(blockedUserId)) {
    ctx.status = Status.OK;
    ctx.body = { error: 0, ...(infernoOnlyConfig.enabled && { reported: reported ? 1 : 0 }) };
    return;
  }

  user.blockedUsers.push(blockedUserId);
  postgres.em.persist(user);
  await postgres.em.flush();

  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(infernoOnlyConfig.enabled && { reported: reported ? 1 : 0 }) };
};
