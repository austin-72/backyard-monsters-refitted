import { mailboxErr } from "../../errors/errors.js";
import { Thread } from "../../database/models/thread.model.js";
import { postgres } from "../../server.js";

/**
 * Find an existing thread by ID and user, or create a new one if no valid ID is given.
 *
 * @param {number} threadId - ID of the thread to find (0 to create a new thread).
 * @param {number} userId - The requesting user ID.
 * @param {number} targetId - The other participant's user ID.
 * @returns {Promise<Thread>} - A found or newly created Thread entity.
 */
export const findOrCreateThread = async (threadId: number, targetId: number, userId: number) => {
  // First, we attempt to find an existing thread
  if (threadId > 0) {
    const thread = await postgres.em.findOne(Thread, {
      threadid: threadId,
      $or: [{ userid: userId }, { targetid: userId }],
    });

    if (!thread) throw mailboxErr();
    
    return thread;
  }

  // Otherwise, create a new thread. (18 October, SUSPECTED-BUGS.md: its id was the highest + 1, read and written
  // apart, so two threads made at the same moment got the same id and one failed: a letter lost. Now made in a
  // transaction that holds a lock for thread ids, then read into this request.)
  const threadid = await postgres.em.fork().transactional(async (em) => {
    const ctx = em.getTransactionContext();
    await em.getConnection().execute(`SELECT pg_advisory_xact_lock(?)`, [THREAD_ID_LOCK], "all", ctx);
    const rows = (await em.getConnection().execute(`SELECT COALESCE(MAX(threadid), 0) + 1 AS id FROM bym.thread`, [], "all", ctx)) as { id: number | string }[];
    const next = Number(rows[0]?.id ?? 1) || 1;
    const fresh = new Thread();
    fresh.userid = userId;
    fresh.targetid = targetId;
    fresh.threadid = next;
    fresh.messagecount = 0;
    em.persist(fresh);
    await em.flush();
    return next;
  });

  const created = await postgres.em.findOne(Thread, { threadid });
  if (!created) throw mailboxErr();
  return created;
};

/** The advisory lock new thread ids are taken under. */
const THREAD_ID_LOCK = 1410901;
