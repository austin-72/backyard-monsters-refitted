import { Status } from "../../enums/StatusCodes.js";
import { MessageType } from "../../enums/MessageType.js";
import { User } from "../../database/models/user.model.js";
import type { KoaController } from "../../utils/KoaController.js";
import { devConfig } from "../../config/GameConfig.js";
import { SendMessageSchema } from "./zod/SendMessageSchema.js";
import { postgres } from "../../server.js";
import { Message } from "../../database/models/message.model.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { findOrCreateThread } from "../../services/mail/findOrCreateThread.js";
import { countUnreadMessage } from "../../services/mail/countUnreadMessage.js";
import { mailboxErr } from "../../errors/errors.js";
import { logger } from "../../utils/logger.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { InviteError, prepareInvite, revokeInvite } from "../../services/maproom/v2/relocateInvites.js";
import { questBump } from "../../services/quests/questProgress.js";

/**
 * Controller to send message
 *
 * - request body with threadid 0 means it will create a new thread (via Compose / Message in Map Room)
 * - a thread starter will have correct request body for targetid
 * - another reply on a thread will always have request body for targetid set as current user,
 * so it need to be changed by getting up on the correct targetid when saved to DB
 *
 * (There are no truces: trucerequest / truceaccept / trucereject are refused by the schema since 4 October.)
 *
 * @param {Context} ctx - The Koa context object, which includes the request body.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if the request body is missing required fields or if logging fails.
 */
export const sendMessage: KoaController = async (ctx) => {
  try {
    const { userid, blockedUsers }: User = ctx.authUser;
    const message = SendMessageSchema.parse(ctx.request.body);

    // Inferno-only: relocation invites between alliance members (services/maproom/v2/relocateInvites.ts).
    const isRelocation = message.type === MessageType.MIGRATE_REQUEST || message.type === MessageType.MIGRATE_REVOKE;
    const isAllowedToSend = isRelocation ? infernoOnlyConfig.enabled : devConfig.allowedMessageType[message.type];

    if (!isAllowedToSend) {
      ctx.status = Status.OK;
      ctx.body = { error: 1, message: "Message type disabled on server" };
      return;
    }

    // Profanity filter
    const { Filter } = await import("bad-words");
    const filter = new Filter();
    const filteredSubject = filter.clean(message.subject);
    const filteredMessage = filter.clean(message.message);

    const { threadid, targetid } = message;
    const thread = await findOrCreateThread(threadid, targetid, userid);

    const isSender = thread.userid === userid;
    const messageTargetId = isSender ? thread.targetid : thread.userid;

    const recipient = await postgres.em.findOne(
      User,
      { userid: messageTargetId },
      { populate: ["save"], fields: ["blockedUsers", "save.unreadmessages"] }
    );

    if (!recipient || !recipient.save) {
      ctx.status = Status.OK;
      ctx.body = { error: 1 };
      return;
    }

    // Check if either user has blocked the other
    if (blockedUsers.includes(messageTargetId) || recipient.blockedUsers.includes(userid)) {
      ctx.status = Status.OK;
      ctx.body = { error: 1, message: "Cannot send message to this user" };
      return;
    }

    let invite: Awaited<ReturnType<typeof prepareInvite>> | null = null;
    try {
      if (message.type === MessageType.MIGRATE_REQUEST) {
        const sender = await postgres.em.findOneOrFail(User, { userid });
        const target = await postgres.em.findOneOrFail(User, { userid: messageTargetId });
        invite = await prepareInvite(sender, target, message.baseid);
      } else if (message.type === MessageType.MIGRATE_REVOKE) {
        await revokeInvite(ctx.authUser, thread.threadid);
      }
    } catch (err) {
      if (!(err instanceof InviteError)) throw err;
      ctx.status = Status.OK;
      ctx.body = { error: err.message };
      return;
    }

    const newMessage = postgres.em.create(Message, {
      threadid: thread.threadid,
      userid,
      targetid: messageTargetId,
      messagetype: message.type,
      userUnread: 0,
      targetUnread: 1,
      subject: filteredSubject,
      message: filteredMessage,
      updatetime: getCurrentDateTime(),
      ...(invite ?? {}),
    });

    thread.messagecount++;
    thread.lastMessage = newMessage;
    postgres.em.persist(thread);
    await postgres.em.flush();

    const count = await countUnreadMessage(messageTargetId);

    recipient.save.unreadmessages = count;
    postgres.em.persist(recipient);
    await postgres.em.flush();

    // Inferno-only quest book: a letter to another player (not a relocation request)
    if (message.type === MessageType.MESSAGE) void questBump(userid, "mail_sent");

    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      messageid: 0,
      threadid: thread.threadid,
    };
  } catch (err) {
    logger.error(`Error sending message: ${err}`);
    throw mailboxErr();
  }
};
