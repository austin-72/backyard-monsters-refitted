import { MessageType } from "../../enums/MessageType.js";
import { User } from "../../database/models/user.model.js";
import { Message } from "../../database/models/message.model.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { findOrCreateThread } from "./findOrCreateThread.js";
import { countUnreadMessage } from "./countUnreadMessage.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (14 October, QoL #168): a letter from one player to another sent by the server on the first's
 * behalf (a new thread in both mailboxes, as sendMessage makes one). Not sent when either has blocked the other.
 * Never fails what caused it: a failure is logged. True when it was sent.
 */
export const sendMail = async (fromId: number, toId: number, subject: string, body: string): Promise<boolean> => {
  try {
    const from = await postgres.em.findOne(User, { userid: fromId }, { fields: ["blockedUsers"] });
    const to = await postgres.em.findOne(User, { userid: toId }, { populate: ["save"], fields: ["blockedUsers", "save.unreadmessages"] });
    if (!from || !to || !to.save) return false;
    if ((from.blockedUsers ?? []).includes(toId) || (to.blockedUsers ?? []).includes(fromId)) return false;

    const thread = await findOrCreateThread(0, toId, fromId);
    const message = postgres.em.create(Message, {
      threadid: thread.threadid,
      userid: fromId,
      targetid: toId,
      messagetype: MessageType.MESSAGE,
      userUnread: 0,
      targetUnread: 1,
      subject,
      message: body,
      updatetime: getCurrentDateTime(),
    });
    thread.messagecount++;
    thread.lastMessage = message;
    postgres.em.persist(thread);
    await postgres.em.flush();

    to.save.unreadmessages = await countUnreadMessage(toId);
    postgres.em.persist(to);
    await postgres.em.flush();
    return true;
  } catch (err) {
    logger.error(`Mail from ${fromId} to ${toId} could not be sent: ${err}`);
    return false;
  }
};
