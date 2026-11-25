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
 *
 * Delivery both ways survives a lost reply (7 October: lines "not sent" that were, or sent twice; a poll whose
 * reply never arrives through the tunnel is sent again by the game):
 *  - the game numbers what it sends (`n` on each message): a number this session has already handled is skipped,
 *    so a line sent again is not posted again (nor counted against the flood limit);
 *  - the server numbers what it sends (`s`) and keeps it until the game says it has it (`ack`, the highest `s`
 *    it handled): a reply that was lost is sent again with the next one, and the game skips what it already had.
 * A game that sends no `ack` gets the old behaviour (what is waiting, once).
 */

// A client polls every few seconds; this long without one and it is gone. Browsers slow a background
// tab's timers to about once a minute, so less than that ended (and re-joined) those sessions every minute.
const IDLE_MS = 90_000;
const MAX_QUEUE = 400; // messages held for a client that stopped polling, before old ones drop
const MAX_MESSAGES_PER_POLL = 20;
const MAX_SESSIONS = 5_000;

class HttpSocket {
  data: SocketData = { userId: null, displayName: "", lastMsgAt: 0 };
  queue: string[] = [];
  /** The number of each queued message (`s`), in step with `queue`. */
  seqs: number[] = [];
  nextSeq = 1;
  /** The highest message number (`n`) of the game's already handled. */
  lastIn = 0;
  closed = false;

  constructor(private readonly onClose: (socket: HttpSocket) => void) {}

  send(payload: string) {
    if (this.closed) return 0;
    this.queue.push(payload);
    this.seqs.push(this.nextSeq++);
    if (this.queue.length > MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
      this.seqs.splice(0, this.seqs.length - MAX_QUEUE);
    }
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
  /** (18 October) Where it was opened from, and when: one not signed in soon is closed. */
  ip: string;
  startedAt: number;
}

const sessions = new Map<string, Session>();

/**
 * (18 October, SUSPECTED-BUGS.md: anyone could open sessions without signing in, each lasting 90 s, until the 5,000
 * were full and nobody's chat could start) a session not signed in within UNSIGNED_MS is closed, and an address may
 * have at most UNSIGNED_PER_ADDRESS of them at once.
 */
const UNSIGNED_MS = 20_000;
const UNSIGNED_PER_ADDRESS = 20;

/** Is there a chat session with this id (for the poll limiter: a made-up id isn't a bucket of its own)? */
export const hasChatSession = (sid: string) => sessions.has(sid);

// The gateway only ever touches .data, .send() and .close() on a socket.
type GatewaySocket = Parameters<typeof handleMessage>[0];
const asGatewaySocket = (socket: HttpSocket) => socket as unknown as GatewaySocket;

const endSession = (session: Session) => {
  sessions.delete(session.sid);
  session.socket.closed = true;
  handleClose(asGatewaySocket(session.socket));
};

const startSession = (ip: string): Session => {
  const sid = crypto.randomUUID();
  const socket = new HttpSocket(() => {
    const session = sessions.get(sid);
    if (session) endSession(session);
  });
  const session: Session = { sid, socket, lastSeen: Date.now(), ip, startedAt: Date.now() };

  handleOpen(asGatewaySocket(socket));
  sessions.set(sid, session);

  return session;
};

const isUnsigned = (session: Session) => session.socket.data.userId === null;

setInterval(() => {
  const now = Date.now();
  const cutoff = now - IDLE_MS;

  for (const session of [...sessions.values()]) {
    if (session.lastSeen < cutoff || (isUnsigned(session) && now - session.startedAt > UNSIGNED_MS)) endSession(session);
  }
}, 5_000).unref?.();

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

  if (!requested) {
    const ip = String(ctx.ip ?? "");
    let fromHere = 0;
    for (const s of sessions.values()) if (s.ip === ip && isUnsigned(s)) fromHere++;
    if (fromHere >= UNSIGNED_PER_ADDRESS) {
      ctx.status = 429;
      ctx.body = { error: 1, message: "Too many chat sessions from here. Wait a moment." };
      return;
    }
  }

  if (!requested && sessions.size >= MAX_SESSIONS) {
    // (22 October: 429, not 503: the game takes two 503s in a row for the server gone (a restart) and holds its
    // saves and attacks for a while; a full chat did that, again and again)
    ctx.status = 429;
    ctx.body = { error: 1, message: "chat is full" };
    return;
  }

  const session = requested ?? startSession(String(ctx.ip ?? ""));
  session.lastSeen = Date.now();

  const socket = session.socket;
  for (const message of parseOutgoing(body.out)) {
    if (socket.closed) break;

    // (sent again after a lost reply: already handled, not posted twice)
    const n = message && typeof message === "object" ? Number((message as Record<string, unknown>).n) : NaN;
    if (Number.isFinite(n) && n > 0) {
      if (n <= socket.lastIn) continue;
      socket.lastIn = n;
      delete (message as Record<string, unknown>).n;
    }

    try {
      await handleMessage(asGatewaySocket(socket), JSON.stringify(message));
    } catch (err) {
      logger.error(`Chat HTTP bridge failed to handle a message: ${err}`);
    }
  }

  const ack = Number(body.ack);
  let waiting: unknown[];
  if (body.ack !== undefined && Number.isFinite(ack)) {
    // kept until the game has them: what it has is dropped, the rest (sent before or not) goes now, numbered
    let had = 0;
    while (had < socket.seqs.length && socket.seqs[had] <= ack) had++;
    socket.queue.splice(0, had);
    socket.seqs.splice(0, had);
    waiting = socket.queue.map((payload, i) => ({ ...JSON.parse(payload), s: socket.seqs[i] }));
  } else {
    waiting = socket.queue.splice(0).map((payload) => JSON.parse(payload));
    socket.seqs.length = 0;
  }

  ctx.status = 200;
  ctx.body = { error: 0, sid: session.sid, fresh: requested ? 0 : 1, closed: socket.closed ? 1 : 0, in: waiting };
};
