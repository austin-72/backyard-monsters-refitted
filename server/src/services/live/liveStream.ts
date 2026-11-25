import { randomBytes } from "crypto";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, type WebSocket } from "ws";

import type { User } from "../../database/models/user.model.js";
import { redis } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { logger } from "../../utils/logger.js";
import { noteFrameWatched, watchOn } from "./liveActivity.js";
import { isHidden } from "../user/presence.js";

/**
 * Inferno-only (18 October, the user's: "Watch runs slowly and at a bad resolution"): the Watch menu's pictures of a
 * player's game (the Brimstone Pit, the Devil's Arcade, Hellgate, Siege, the Gauntlet), over a WebSocket on the game's
 * own port (/live/ws, next to the arcade's /arcade/ws), passed straight on from the player's game to its watchers.
 *
 * A game asks for a ticket over HTTP (live/ticket: logged in, good for 60 seconds, once) and opens
 * /live/ws?ticket=... One connection per player (a newer one closes the older). A connection can be both: the game
 * of a player being watched (its pictures) and the game of someone watching.
 *
 *   game -> server:  {t: "watch", uid}    watch that player's pictures (from a whole picture, asked for at once)
 *                    {t: "unwatch"}
 *                    {t: "rekey"}          the watcher fell behind: a whole picture again
 *                    {t: "got", n}         (20 October) a watcher has n more of the pictures sent to it (shown or
 *                                          let go)
 *                    a binary message      a picture of this player's game, while it is watched
 *   server -> game:  {t: "on", n}          someone watches this player (n: how many): pictures, please
 *                    {t: "key"}            a whole picture next (someone started watching, or fell behind)
 *                    {t: "off"}            nobody does any more: none
 *                    {t: "ok"}             a picture of this player's was passed on (the next can come)
 *                    a binary message      a picture of the player watched
 *
 * (18 October, the user's: lighter) A picture is a whole one now and then (a key) and in between only the squares of
 * the screen that changed, packed into one small picture (IoWatch.castFrame: "IOW2", kind, square size, width,
 * height, how many squares and where, then a WebP or JPEG). The squares build on the picture before, so a watcher is
 * sent squares only from a whole picture on, in order: one who starts watching, or whose connection falls behind
 * (a picture not sent to them), waits for the next whole picture, asked for at once. Nothing is kept.
 *
 * (20 October, the user's: "watching a player play a mini game for 5 minutes or longer" seemed to slow the server)
 * Two limits, so the pictures never take the server's whole connection (behind a tunnel, a queue of pictures building
 * up on the way doesn't show here as bufferedAmount: the tunnel takes them all at once and holds them):
 *  - a watcher's game says when it has each picture ("got"); one with WATCHER_AHEAD pictures it hasn't said it got
 *    is sent no more until it does (a later whole picture then), so a slow connection gets fewer pictures, not a
 *    queue of them. (A game from before this, which never says so, is sent pictures as before.)
 *  - every watcher together, at most streamKBps a second (InfernoOnlyConfig.liveAttacks): past it, the game being
 *    watched hears "ok" (its next picture) only once the second is out, so it sends fewer pictures a second, each
 *    whole or built on the one before as ever.
 */

const TICKET_KEY = (t: string) => `live-ticket:${t}`;
/** The biggest picture taken (bytes). */
const FRAME_MAX = 1_500_000;
/** A watcher whose connection has more than this waiting doesn't get the next picture (it gets a later one). */
const BEHIND_BYTES = 1_200_000;

interface LiveConn {
  ws: WebSocket;
  uid: number;
  name: string;
  /** The player this connection watches (0: nobody). */
  watching: number;
  /** Waiting for a whole picture (squares alone would draw on a picture it hasn't got). */
  needsKey: boolean;
  /** When this connection's player was last asked for a whole picture. */
  keyAskedAt: number;
  closed: boolean;
  /** Pictures sent to this watcher it hasn't said it got yet, and whether its game says so at all ("got"). */
  unacked: number;
  acks: boolean;
  /**
   * Inferno-only (22 October): pictures from this connection's game not answered "ok" yet. The game sends one when it
   * has fewer than 2 on the way (IoWatch.CAST_AHEAD); one that doesn't wait (a changed game) has the rest dropped, so
   * the "ok" held back past the second's budget holds every caster back, not only the honest ones.
   */
  oksOwed: number;
  /** When this watcher last had a whole picture asked for, as it said it got one ("got"). */
  keyWantAt: number;
  keyTimer: ReturnType<typeof setTimeout> | null;
  /** Pictures from this connection this second (at most PICTURES_A_SECOND), and when the second began. */
  picsInSecond: number;
  picsSecondAt: number;
  /** When it last said it got one (or started watching). */
  ackAt: number;
}

/** Pictures a watcher can have on the way, at most (InfernoOnlyConfig.liveAttacks.watcherAhead). */
const watcherAhead = () => Math.max(1, Math.floor(Number(infernoOnlyConfig.liveAttacks?.watcherAhead ?? 2)) || 2);
/** Bytes a second of pictures, every watcher together (0: no limit). */
const streamBudget = () => Math.max(0, Number(infernoOnlyConfig.liveAttacks?.streamKBps ?? 1000) || 0) * 1024;
/** A watcher silent this long with pictures on the way is taken to have lost the word: on again from a whole one. */
const ACK_LOST_MS = 8000;

/** This second's bytes of pictures sent (every watcher), and the second it is. */
let sentThisSecond = 0;
let secondAt = 0;
/** What has been sent (for tests): pictures, bytes, pictures held back from a watcher not keeping up, "ok"s held. */
const totals = { pictures: 0, bytes: 0, heldBack: 0, okHeld: 0, dropped: 0 };

const conns = new Map<number, LiveConn>();
/** Each player watched: the connections watching them. */
const watchers = new Map<number, Set<LiveConn>>();
let wss: WebSocketServer | null = null;

export const issueLiveTicket = async (user: User) => {
  const ticket = randomBytes(18).toString("hex");
  await redis.set(TICKET_KEY(ticket), JSON.stringify({ uid: user.userid, name: user.username }), "EX", "60");
  return { ticket, path: "live/ws" };
};

const sendJson = (c: LiveConn, msg: Record<string, unknown>) => {
  if (c.closed) return;
  try {
    c.ws.send(JSON.stringify(msg));
  } catch {
    /* closing */
  }
};

const isImage = (b: Buffer, at: number) =>
  b.length > at + 12 && ((b[at] === 0xff && b[at + 1] === 0xd8) || (b.toString("latin1", at, at + 4) === "RIFF" && b.toString("latin1", at + 8, at + 12) === "WEBP"));

/** A picture as the games send it: its kind (0 whole, 1 squares), or -1 when it isn't one. */
const pictureKind = (b: Buffer): number => {
  if (b.length < 24 || b.toString("latin1", 0, 4) !== "IOW2") return -1;
  const kind = b[4];
  const count = b[10] | (b[11] << 8);
  if ((kind !== 0 && kind !== 1) || (kind === 0 && count !== 0) || (kind === 1 && count === 0)) return -1;
  return isImage(b, 12 + count * 2) ? kind : -1;
};

/** A whole picture from this player next (at most twice a second). */
const askKey = (uid: number) => {
  const caster = conns.get(uid);
  if (!caster || Date.now() - caster.keyAskedAt < 500) return;
  caster.keyAskedAt = Date.now();
  sendJson(caster, { t: "key" });
};

/** How many watch this player now (their game is told). */
const tellCaster = (uid: number) => {
  const n = watchers.get(uid)?.size ?? 0;
  const caster = conns.get(uid);
  if (caster) sendJson(caster, n ? { t: "on", n } : { t: "off" });
};

const unwatch = (c: LiveConn) => {
  const was = c.watching;
  if (!was) return;
  c.watching = 0;
  const set = watchers.get(was);
  if (set) {
    set.delete(c);
    if (!set.size) watchers.delete(was);
  }
  tellCaster(was);
};

const watch = (c: LiveConn, uid: number) => {
  if (!uid || uid === c.uid) return;
  if (c.watching === uid) return;
  unwatch(c);
  c.watching = uid;
  let set = watchers.get(uid);
  if (!set) watchers.set(uid, (set = new Set()));
  set.add(c);
  c.needsKey = true;
  c.unacked = 0;
  c.ackAt = Date.now();
  tellCaster(uid);
  askKey(uid);
};

/** Pictures a game may send a second (the game's own: 10, 15 in the Pit and the Arcade). */
const PICTURES_A_SECOND = 20;
/** Pictures a game may have sent without their "ok" (the game's own: 2; one more for the "ok" on its way). */
const OKS_OWED_MAX = 3;

/** A watcher's own asks for a whole picture: one in this long at most ("got"). */
const KEY_WANT_MS = 2000;

/** A picture of this connection's player's game: on to its watchers. */
const picture = (c: LiveConn, b: Buffer) => {
  const set = watchers.get(c.uid);
  if (!set || !set.size) {
    sendJson(c, { t: "off" });
    return;
  }
  const kind = b.length > FRAME_MAX ? -1 : pictureKind(b);
  if (kind < 0) return;
  const now = Date.now();
  // (22 October: a game sending faster than the game does, or not waiting for its "ok": the picture dropped, and its
  // watchers wait for a whole one (squares after a dropped picture can't be drawn))
  if (now - c.picsSecondAt >= 1000) {
    c.picsSecondAt = now;
    c.picsInSecond = 0;
  }
  if (++c.picsInSecond > PICTURES_A_SECOND || c.oksOwed >= OKS_OWED_MAX) {
    totals.dropped++;
    for (const w of set) w.needsKey = true;
    askKey(c.uid);
    return;
  }
  c.oksOwed++;
  if (now - secondAt >= 1000) {
    secondAt = now;
    sentThisSecond = 0;
  }
  const ahead = watcherAhead();
  for (const w of set) {
    if (w.closed) continue;
    // (squares only on a whole picture: a watcher waiting for one gets the next)
    if (w.needsKey && kind !== 0) continue;
    // (a watcher whose game says what it got: one with `ahead` pictures on the way gets no more till it says so; one
    // silent for long has lost the word: it starts again from a whole picture)
    if (w.acks && w.unacked >= ahead) {
      if (now - w.ackAt > ACK_LOST_MS) {
        w.unacked = 0;
        w.ackAt = now;
        w.needsKey = true;
        askKey(c.uid);
      } else if (!w.needsKey) {
        w.needsKey = true;
        totals.heldBack++;
      }
      if (kind !== 0 || w.unacked >= ahead) continue;
    }
    if (Number((w.ws as unknown as { bufferedAmount?: number }).bufferedAmount ?? 0) > BEHIND_BYTES) {
      // (behind: this one is skipped, so the squares after it can't be drawn: a whole picture next)
      w.needsKey = true;
      askKey(c.uid);
      continue;
    }
    try {
      w.ws.send(b);
      w.unacked++;
      sentThisSecond += b.length;
      totals.pictures++;
      totals.bytes += b.length;
      if (kind === 0) w.needsKey = false;
    } catch {
      /* closing */
    }
  }
  // (a watcher held back above waits for a whole picture: asked for once it can take one, see "got")
  // (every watcher together past the second's budget: the next picture of this game once the second is out)
  const budget = streamBudget();
  if (budget > 0 && sentThisSecond > budget) {
    totals.okHeld++;
    const wait = Math.max(50, 1000 - (now - secondAt));
    setTimeout(() => {
      c.oksOwed = Math.max(0, c.oksOwed - 1);
      sendJson(c, { t: "ok" });
    }, wait).unref?.();
    return;
  }
  c.oksOwed = Math.max(0, c.oksOwed - 1);
  sendJson(c, { t: "ok" });
};

/** A watcher's game has `n` more of the pictures sent to it: a whole picture is asked for if it is waiting for one. */
const got = (c: LiveConn, n: number) => {
  c.acks = true;
  c.ackAt = Date.now();
  c.unacked = Math.max(0, c.unacked - Math.max(1, Math.min(64, Math.floor(n) || 1)));
  // (22 October: once in 2 seconds a watcher: one slow to answer was held back again and again, and each time asked
  // for a whole picture, which goes to everyone watching that game: two a second instead of one in 10)
  if (!c.needsKey || !c.watching || c.unacked >= watcherAhead()) return;
  const due = c.keyWantAt + KEY_WANT_MS - c.ackAt;
  if (due <= 0) {
    c.keyWantAt = c.ackAt;
    askKey(c.watching);
  } else if (!c.keyTimer) {
    // (asked for when its 2 seconds are out, if it still waits: no more "got" comes while it does)
    c.keyTimer = setTimeout(() => {
      c.keyTimer = null;
      if (c.closed || !c.needsKey || !c.watching) return;
      c.keyWantAt = Date.now();
      askKey(c.watching);
    }, due);
    c.keyTimer.unref?.();
  }
};

/** The players watched now (their games still told so by attackwatch/status's stream, for a game not connected yet). */
setInterval(() => {
  for (const uid of watchers.keys()) void noteFrameWatched(uid);
}, 3000).unref?.();

const toBuffer = (data: unknown): Buffer | null => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (Array.isArray(data) && data.every((d) => Buffer.isBuffer(d))) return Buffer.concat(data as Buffer[]);
  return null;
};

const onOpen = (ws: WebSocket, uid: number, name: string) => {
  const old = conns.get(uid);
  if (old) {
    old.closed = true;
    unwatch(old);
    try {
      old.ws.close();
    } catch {
      /* gone */
    }
  }
  const c: LiveConn = { ws, uid, name, watching: 0, needsKey: true, keyAskedAt: 0, closed: false, unacked: 0, acks: false, ackAt: Date.now(), oksOwed: 0, keyWantAt: 0, keyTimer: null, picsInSecond: 0, picsSecondAt: Date.now() };
  conns.set(uid, c);
  let alive = true;
  const ping = setInterval(() => {
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    try {
      ws.ping();
    } catch {
      /* closing */
    }
  }, 20_000);
  ws.on("pong", () => (alive = true));
  // (a watcher's word that it got one, and the rest: 60 a second at most, anything more dropped; pictures have their
  // own 20 a second, in picture())
  let windowAt = Date.now();
  let inWindow = 0;
  ws.on("message", (data, isBinary) => {
    alive = true;
    const now = Date.now();
    if (now - windowAt > 1000) {
      windowAt = now;
      inWindow = 0;
    }
    if (++inWindow > 60) return;
    const b = toBuffer(data);
    const binary = isBinary === true || (isBinary === undefined && b !== null && b[0] !== 0x7b);
    if (binary && b) {
      picture(c, b);
      return;
    }
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(b ? b.toString("utf8") : String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    if (msg.t === "watch") {
      // (a player appearing offline can't be watched)
      const target = Math.floor(Number(msg.uid) || 0);
      void isHidden(target).then((hidden) => {
        if (!hidden && !c.closed) watch(c, target);
      });
    }
    else if (msg.t === "unwatch") unwatch(c);
    else if (msg.t === "got") got(c, Number(msg.n) || 1);
    else if (msg.t === "rekey" && c.watching) {
      c.needsKey = true;
      askKey(c.watching);
    }
  });
  ws.on("close", () => {
    clearInterval(ping);
    c.closed = true;
    unwatch(c);
    if (conns.get(uid) === c) conns.delete(uid);
  });
  ws.on("error", () => 0);
  // (someone watches this player already: pictures at once, a whole one first)
  tellCaster(uid);
  if (watchers.get(uid)?.size) c.keyAskedAt = 0;
};

/** A WebSocket upgrade for /live/ws (the arcade's upgrade handler passes it on: services/arcade/hub.ts). */
export const handleLiveUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer, url: URL) => {
  if (!watchOn()) {
    socket.destroy();
    return;
  }
  if (!wss) wss = new WebSocketServer({ noServer: true, maxPayload: FRAME_MAX + 1024 });
  const ticket = url.searchParams.get("ticket") ?? "";
  void (async () => {
    const raw = /^[0-9a-f]{36}$/.test(ticket) ? await redis.getdel(TICKET_KEY(ticket)) : null;
    if (!raw) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const who = JSON.parse(raw) as { uid: number; name: string };
    wss!.handleUpgrade(req, socket, head, (ws) => onOpen(ws, who.uid, who.name));
  })().catch((e) => {
    logger.warn(`Watch: socket refused: ${e}`);
    socket.destroy();
  });
};

/** Who watches this player's pictures now (their connections). */
export const streamWatchersOf = (uid: number): { uid: number; name: string }[] => [...(watchers.get(uid) ?? [])].filter((w) => !w.closed).map((w) => ({ uid: w.uid, name: w.name }));

/** The player now appears offline: nobody watches them any more (their game is told to stop). */
export const stopWatchersOf = (uid: number) => {
  const set = watchers.get(uid);
  if (!set) return;
  for (const w of [...set]) unwatch(w);
};

/** How many games are connected, and how many players are watched (for tests). */
export const liveStreamCounts = () => ({ connected: conns.size, watched: watchers.size, ...totals });
