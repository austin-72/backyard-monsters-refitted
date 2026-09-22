import type { Context } from "koa";
import { logger } from "../utils/logger.js";
import { handleClose, handleMessage, handleOpen } from "./chatGateway.js";
import type { SocketData } from "./chatState.js";

/**
 * Chat over plain HTTP, for servers whose only way in is a web tunnel.
 *
 * The chat server speaks JSON messages over a WebSocket on its own port, and Flash will only open
 * that socket after fetching a policy file from port 843 on the same host. Neither port exists
 * behind a web-only tunnel such as cloudflared, which carries ordinary HTTPS requests and nothing
 * else. So the same JSON messages ride on those: the client POSTs the messages it wants to send
 * and gets back the messages that were waiting for it, every couple of seconds.
 *
 * Nothing about chat itself is reimplemented. Each HTTP session owns a stand-in socket that the
 * real gateway treats like any other connection: what the client posts is fed to the gateway's
 * message handler, and what the gateway "sends" is queued until the next poll. Rooms, history,
 * the alliance channel, the ignore list, rate limits and the Redis fan-out all work unchanged,
 * and HTTP players share channels with anyone connected over a real WebSocket.
 *
 * Authentication is the chat protocol's own: the first message of a session must be the usual
 * { type: "auth", userId, token } with the chat token from base load. The session id handed back
 * is random and only names the queue; it grants nothing the token did not.
 */

const IDLE_MS = 40_000; // a client polls every few seconds; this long without one and it is gone
const MAX_QUEUE = 400; // messages held for a client that stopped polling, before old ones drop
const MAX_MESSAGES_PER_POLL = 20;
const MAX_SESSIONS = 5_000;

class HttpSocket {
  data: SocketData = { userId: null, displayName: "", lastMsgAt: 0 };
  queue: string[] = [];
  closed = false;

  constructor(private readonly onClose: (socket: HttpSocket) => void) {}

  send(payload: string) {
    if (this.closed) return 0;
    this.queue.push(payload);
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    return payload.length;
  }

  /** The gateway closes a socket to refuse a login or to replace an older connection of the same player. */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.onClose(this);
  }
}

interface Session {
  sid: string;
  socket: HttpSocket;
  lastSeen: number;
}

const sessions = new Map<string, Session>();

// The gateway only ever touches .data, .send() and .close() on a socket.
type GatewaySocket = Parameters<typeof handleMessage>[0];
const asGatewaySocket = (socket: HttpSocket) => socket as unknown as GatewaySocket;

const endSession = (session: Session) => {
  sessions.delete(session.sid);
  session.socket.closed = true;
  handleClose(asGatewaySocket(session.socket));
};

const startSession = (): Session => {
  const sid = crypto.randomUUID();
  const socket = new HttpSocket(() => {
    const session = sessions.get(sid);
    if (session) endSession(session);
  });
  const session: Session = { sid, socket, lastSeen: Date.now() };

  handleOpen(asGatewaySocket(socket));
  sessions.set(sid, session);

  return session;
};

setInterval(() => {
  const cutoff = Date.now() - IDLE_MS;

  for (const session of [...sessions.values()]) if (session.lastSeen < cutoff) endSession(session);
}, 10_000).unref?.();

const parseOutgoing = (raw: unknown): unknown[] => {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 20_000) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_MESSAGES_PER_POLL) : [];
  } catch {
    return [];
  }
};

/**
 * POST /chat/poll   { sid?: string, out?: string (JSON array of chat client messages) }
 *   -> { error: 0, sid, in: [chat server messages] }
 *
 * An unknown or expired sid simply starts a new session (the reply carries `fresh: 1`), and the
 * client authenticates and joins its channels again, exactly as after a dropped socket.
 */
export const chatPoll = async (ctx: Context) => {
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const requested = typeof body.sid === "string" ? sessions.get(body.sid) : undefined;

  if (!requested && sessions.size >= MAX_SESSIONS) {
    ctx.status = 503;
    ctx.body = { error: 1, message: "chat is full" };
    return;
  }

  const session = requested ?? startSession();
  session.lastSeen = Date.now();

  for (const message of parseOutgoing(body.out)) {
    if (session.socket.closed) break;

    try {
      await handleMessage(asGatewaySocket(session.socket), JSON.stringify(message));
    } catch (err) {
      logger.error(`Chat HTTP bridge failed to handle a message: ${err}`);
    }
  }

  const waiting = session.socket.queue.splice(0).map((payload) => JSON.parse(payload));

  ctx.status = 200;
  ctx.body = { error: 0, sid: session.sid, fresh: requested ? 0 : 1, closed: session.socket.closed ? 1 : 0, in: waiting };
};
