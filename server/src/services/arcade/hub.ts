import { randomBytes } from "crypto";
import type { IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, type WebSocket } from "ws";

import { arcadeConfig } from "../../config/ArcadeConfig.js";
import { ChatBroadcastType } from "../../enums/Chat.js";
import { broadcastGlobal, retractBroadcast } from "../../chat/chatBroadcasts.js";
import type { User } from "../../database/models/user.model.js";
import { redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { ArenaRoom } from "./arena.js";
import { BoneBrawlRoom } from "./bonebrawl.js";
import { FusebugRoom } from "./fusebug.js";
import { HockeyRoom } from "./hockey.js";
import { LavaFloorRoom } from "./lavafloor.js";
import { SoulSnatchRoom } from "./soulsnatch.js";
import { BOT_NAMES, RelayRoom, relayGames } from "./relay.js";
import { type Conn, type Room, send } from "./room.js";
import { flightSeed, raceGhost } from "./scores.js";
import { WormzerRoom, whenWormzerCloses } from "./wormzer.js";
import { handleLiveUpgrade } from "../live/liveStream.js";

/**
 * Inferno-only: the Devil's Arcade's live games, over a WebSocket on the game's own port (/arcade/ws), so it
 * goes through the same web tunnel as everything else (cloudflared carries WebSockets).
 *
 * The game asks for a ticket over HTTP (`issueTicket`: logged in, good for 60 seconds, once) and opens
 * /arcade/ws?ticket=... One connection per player (a newer one closes the older). Then JSON messages:
 *
 *   game -> server:  {t: "q", game, mode}   wait for a match (or start one: solo arenas, Wormzer's live arena)
 *                    {t: "bot"}             play the bot / ghost now instead of waiting
 *                    {t: "x"}               leave the queue or the match
 *                    {t: "who"}             how many wait for what, and how many play
 *                    {t: "ping", c?}        -> {t: "pong", at, c} (c sent back as it came)
 *                    {t: "resume", room}    back after a dropped connection (QoL #367: a relay match's seat waits
 *                                           RELAY_GRACE_SECONDS) -> {t: "resumed", ok, end?}
 *                    anything else goes to the player's room (relay.ts, wormzer.ts, fusebug.ts)
 *   server -> game:  {t: "hi", uid, name}, {t: "wait", ...}, {t: "start", ...}, the rooms' own, {t: "err", msg}
 *
 * Two-player games pair the first two waiting; after `botAfterSeconds` a game that has one offers its bot
 * (Smash, Breakout) or a ghost (Flight). Nobody waiting for Hellgate Versus or Co-op? The first to wait is
 * announced in Global chat (once in 10 minutes a player) so others can join.
 */
const TICKET_KEY = (t: string) => `arcade-ticket:${t}`;

const conns = new Map<number, Conn>();
const queues = new Map<string, Conn[]>();
const wormzerLive: WormzerRoom[] = [];
const fusebugLobbies: FusebugRoom[] = [];
/** The arena games (arena.ts): a new room for each match, made by its game. */
const ARENA: Record<string, (mode: string) => ArenaRoom> = {
  lavafloor: (mode) => new LavaFloorRoom(mode),
  bonebrawl: (mode) => new BoneBrawlRoom(mode),
  hockey: (mode) => new HockeyRoom(mode),
  soulsnatch: (mode) => new SoulSnatchRoom(mode),
};
const arenaLobbies: ArenaRoom[] = [];
const announced = new Map<number, number>();
/** (QoL #367) seats waiting for their player after a dropped connection: user id -> the room, the old connection. */
const heldSeats = new Map<number, { room: Room; conn: Conn; timer: ReturnType<typeof setTimeout> }>();
let wss: WebSocketServer | null = null;

export const issueTicket = async (user: User) => {
  const ticket = randomBytes(18).toString("hex");
  await redis.set(TICKET_KEY(ticket), JSON.stringify({ uid: user.userid, name: user.username }), "EX", "60");
  return { ticket, path: "arcade/ws" };
};

/** How many wait for each game and mode, and how many play live now. */
export const arcadeCounts = () => {
  const waiting: Record<string, number> = {};
  for (const [k, q] of queues) waiting[k] = q.filter((c) => !c.closed).length;
  const playing = [...conns.values()].filter((c) => c.room && !c.room.closed).length;
  const wormzer = wormzerLive.reduce((n, r) => n + r.humans.length, 0);
  return { waiting, playing, wormzer, online: conns.size };
};

/** Attaches the arcade's socket to the game's HTTP server (server.ts, after it listens). */
export const attachArcadeSocket = (server: Server) => {
  wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "/", "http://x");
    // (18 October: the Watch menu's pictures have their own socket, services/live/liveStream.ts)
    if (url.pathname === "/live/ws") {
      handleLiveUpgrade(req, socket, head, url);
      return;
    }
    if (url.pathname !== "/arcade/ws") {
      socket.destroy();
      return;
    }
    const ticket = url.searchParams.get("ticket") ?? "";
    void (async () => {
      // (taken in one step, so a ticket opens one socket however fast it is sent twice; 9 October)
      const raw = /^[0-9a-f]{36}$/.test(ticket) ? await redis.getdel(TICKET_KEY(ticket)) : null;
      if (!raw) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      const who = JSON.parse(raw) as { uid: number; name: string };
      wss!.handleUpgrade(req, socket, head, (ws) => onOpen(ws, who.uid, who.name));
    })().catch((e) => {
      logger.warn(`Arcade: socket refused: ${e}`);
      socket.destroy();
    });
  });
  whenWormzerCloses((room) => {
    const i = wormzerLive.indexOf(room);
    if (i >= 0) wormzerLive.splice(i, 1);
  });
  setInterval(matchmake, 1000);
  logger.info("Arcade: live games on /arcade/ws");
};

const onOpen = (ws: WebSocket, uid: number, name: string) => {
  const old = conns.get(uid);
  if (old) {
    // (QoL #367: `elsewhere`: that game doesn't try to come back; a match it was in waits a moment for this one)
    send(old, { t: "err", msg: "You opened the arcade somewhere else.", elsewhere: 1 });
    old.closed = true;
    if (!holdSeat(old)) drop(old);
    old.ws.close();
  }
  const conn: Conn = { ws, uid, name, room: null, queue: null, queuedAt: 0, closed: false };
  conns.set(uid, conn);
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
  // (a game sends tens a second at most; a connection sending far more has its extra messages dropped: asking
  // for rooms over and over made a room each time; 9 October)
  let windowAt = Date.now();
  let inWindow = 0;
  ws.on("message", (data) => {
    alive = true;
    const now = Date.now();
    if (now - windowAt > 1000) {
      windowAt = now;
      inWindow = 0;
    }
    if (++inWindow > 120) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    try {
      onMessage(conn, msg);
    } catch (e) {
      logger.warn(`Arcade: ${name}'s message failed: ${e}`);
    }
  });
  ws.on("close", () => {
    clearInterval(ping);
    conn.closed = true;
    // (QoL #367: a live match's seat waits a moment for the player to come back; else out of everything at once)
    if (!conn.held && !holdSeat(conn)) drop(conn);
    if (conns.get(uid) === conn) conns.delete(uid);
  });
  ws.on("error", () => 0);
  send(conn, { t: "hi", uid, name });
};

/**
 * Inferno-only (QoL #367, 15 October): a dropped connection in a match that can wait (Room.graceMs: the relay
 * matches) keeps its seat for that long, its rival told; the player's game reconnects and resumes it ({t: "resume"}).
 * Not back in time: they leave, as before. False when the connection's room can't wait (it is dropped then).
 */
const holdSeat = (conn: Conn): boolean => {
  if (conn.held) return true;
  const room = conn.room;
  const ms = room && !room.closed ? room.graceMs(conn) : 0;
  if (!room || ms <= 0) return false;
  conn.held = true;
  // (one held seat a player: an older one, never come back to, leaves now)
  const before = heldSeats.get(conn.uid);
  if (before) {
    clearTimeout(before.timer);
    if (before.conn !== conn && !before.room.closed && before.conn.room === before.room) before.room.onLeave(before.conn);
    if (before.conn !== conn) before.conn.room = null;
  }
  room.away(conn);
  const timer = setTimeout(() => {
    const h = heldSeats.get(conn.uid);
    if (h && h.conn === conn) heldSeats.delete(conn.uid);
    if (conn.room === room && !room.closed) room.onLeave(conn);
    conn.room = null;
  }, ms);
  heldSeats.set(conn.uid, { room, conn, timer });
  logger.info(`Arcade: ${conn.name}'s connection dropped in ${room.game} ${room.mode} room ${room.id}: the seat waits ${ms / 1000}s`);
  return true;
};

/** (QoL #367) {t: "resume", room}: the held seat in that room is this connection's now (or the room's end, if it ended). */
const resumeSeat = (conn: Conn, roomId: number) => {
  const h = heldSeats.get(conn.uid);
  if (!h || h.room.id !== roomId) {
    send(conn, { t: "resumed", ok: false });
    return;
  }
  heldSeats.delete(conn.uid);
  clearTimeout(h.timer);
  if (h.room.closed) {
    send(conn, { t: "resumed", ok: false, end: h.room.lastEnd });
    return;
  }
  drop(conn);
  if (!h.room.resume(h.conn, conn)) {
    if (h.conn.room === h.room) h.room.onLeave(h.conn);
    send(conn, { t: "resumed", ok: false, end: h.room.lastEnd });
    return;
  }
  h.conn.room = null;
  send(conn, { t: "resumed", ok: true, room: roomId });
  logger.info(`Arcade: ${conn.name} is back in ${h.room.game} ${h.room.mode} room ${h.room.id}`);
};

/** Out of any queue and room. */
const drop = (conn: Conn) => {
  if (conn.queue) {
    const q = queues.get(conn.queue);
    if (q) queues.set(conn.queue, q.filter((c) => c !== conn));
    conn.queue = null;
  }
  const room: Room | null = conn.room;
  if (room && !room.closed) room.onLeave(conn);
  conn.room = null;
};

const SOLO_ROOMS = new Set(["wormzer:solo", "fusebug:solo"]);

const onMessage = (conn: Conn, msg: Record<string, unknown>) => {
  switch (msg.t) {
    case "ping":
      // (c: the game's own clock, sent back so it can time the round trip)
      send(conn, { t: "pong", at: Date.now(), c: typeof msg.c === "number" ? msg.c : undefined });
      return;
    case "who":
      send(conn, { t: "who", ...arcadeCounts() });
      return;
    case "resume":
      resumeSeat(conn, Number(msg.room));
      return;
    case "x":
      drop(conn);
      send(conn, { t: "out" });
      return;
    case "q": {
      drop(conn);
      const game = String(msg.game ?? "");
      const mode = String(msg.mode ?? "");
      const key = `${game}:${mode}`;
      if (key === "wormzer:solo") {
        new WormzerRoom("solo", 1, 8).join(conn);
        return;
      }
      if (key === "wormzer:live") {
        let room = wormzerLive.find((r) => r.canJoin(conn));
        if (!room) {
          room = new WormzerRoom("live", arcadeConfig.wormzerPlayers, 6);
          wormzerLive.push(room);
        }
        room.join(conn);
        return;
      }
      if (key === "fusebug:solo") {
        const room = new FusebugRoom("solo");
        room.join(conn);
        room.begin();
        return;
      }
      if (key === "fusebug:live") {
        let room = fusebugLobbies.find((r) => r.canJoin(conn));
        if (!room) {
          room = new FusebugRoom("live");
          fusebugLobbies.push(room);
        }
        room.join(conn);
        if (room.humans.length >= 2 && !room.startsAt) room.startsAt = Date.now() + arcadeConfig.fusebugLobbySeconds * 1000;
        if (room.humans.length >= arcadeConfig.fusebugPlayers) room.startsAt = Date.now();
        room.lobby();
        maybeAnnounce(conn, "fusebug", "live");
        return;
      }
      if (ARENA[game]) {
        if (!arcadeConfig.games.find((g) => g.id === game)?.modes.includes(mode)) {
          send(conn, { t: "err", msg: "That game can't be played that way." });
          return;
        }
        if (mode === "solo") {
          const room = ARENA[game](mode);
          room.join(conn);
          room.begin();
          return;
        }
        let room = arenaLobbies.find((r) => r.game === game && r.mode === mode && r.canJoin(conn));
        if (!room) {
          room = ARENA[game](mode);
          arenaLobbies.push(room);
        }
        room.join(conn);
        maybeAnnounce(conn, game, mode);
        if (room.humans.length >= room.minHumans && !room.startsAt) room.startsAt = Date.now() + arcadeConfig.arenaLobbySeconds * 1000;
        if (room.humans.length >= room.opt.seats) room.startsAt = Date.now();
        room.lobby();
        matchmake();
        return;
      }
      if (!relayGames.includes(key) || SOLO_ROOMS.has(key)) {
        send(conn, { t: "err", msg: "That game can't be played live." });
        return;
      }
      conn.queue = key;
      conn.queuedAt = Date.now();
      const q = queues.get(key) ?? [];
      q.push(conn);
      queues.set(key, q);
      sendWait(conn);
      maybeAnnounce(conn, game, mode);
      matchmake();
      return;
    }
    case "bot":
      if (conn.queue) void playBot(conn);
      // (only a player waiting alone may start with bots: with others waiting, the countdown runs for all; 9 October)
      else if (conn.room instanceof ArenaRoom && !conn.room.started && conn.room.humans.length <= 1) {
        const room = conn.room;
        const i = arenaLobbies.indexOf(room);
        if (i >= 0) arenaLobbies.splice(i, 1);
        room.startNow();
      }
      return;
    default:
      if (conn.room && !conn.room.closed) conn.room.onMessage(conn, msg);
  }
};

const hasBot = (key: string) => key === "flight:race" || Boolean(BOT_NAMES[key]);

const sendWait = (conn: Conn) => {
  if (!conn.queue) return;
  const q = queues.get(conn.queue) ?? [];
  const waited = (Date.now() - conn.queuedAt) / 1000;
  send(conn, {
    t: "wait",
    key: conn.queue,
    waiting: q.length,
    seconds: Math.floor(waited),
    bot: hasBot(conn.queue) && waited >= arcadeConfig.botAfterSeconds,
  });
};

/** Pairs the first two waiting for each game; tells the rest how long they've waited. Starts Fusebug lobbies. */
const matchmake = () => {
  for (const [key, q] of queues) {
    const live = q.filter((c) => !c.closed && c.queue === key);
    queues.set(key, live);
    while (live.length >= 2) {
      const a = live.shift()!;
      const b = live.shift()!;
      const [game, mode] = key.split(":");
      new RelayRoom(game, mode, [a, b], null, {}, game === "flight" ? flightSeed() : 0);
    }
    for (const c of live) sendWait(c);
  }
  for (const room of [...arenaLobbies]) {
    if (room.closed || room.started) {
      arenaLobbies.splice(arenaLobbies.indexOf(room), 1);
      continue;
    }
    if (room.startsAt && Date.now() >= room.startsAt && room.humans.length >= room.minHumans) {
      arenaLobbies.splice(arenaLobbies.indexOf(room), 1);
      room.begin();
    } else {
      if (room.humans.length < room.minHumans) room.startsAt = 0;
      room.lobby();
    }
  }
  for (const room of [...fusebugLobbies]) {
    if (room.closed || room.started) {
      fusebugLobbies.splice(fusebugLobbies.indexOf(room), 1);
      continue;
    }
    if (room.startsAt && Date.now() >= room.startsAt && room.humans.length >= 2) {
      fusebugLobbies.splice(fusebugLobbies.indexOf(room), 1);
      room.begin();
    } else if (room.humans.length < 2) {
      room.startsAt = 0;
      room.lobby();
    } else {
      room.lobby();
    }
  }
};

/** Stops waiting: a bot (Smash, Breakout) or a ghost (Flight) takes the other place. */
const playBot = async (conn: Conn) => {
  const key = conn.queue;
  if (!key || !hasBot(key)) return;
  const q = queues.get(key);
  if (q) queues.set(key, q.filter((c) => c !== conn));
  conn.queue = null;
  const [game, mode] = key.split(":");
  if (game === "flight") {
    const ghost = await raceGhost(conn.uid);
    // (asked for something else meanwhile: that stands; a race made now sat the player in two rooms; 9 October)
    if (conn.closed || conn.room || conn.queue) return;
    if (!ghost) {
      send(conn, { t: "err", msg: "Nobody has flown yet: there is no ghost to race. Try Solo first!" });
      return;
    }
    const room = new RelayRoom(game, mode, [conn], ghost.name, { ghost }, ghost.seed);
    room.ghostDone(1, ghost.score);
    return;
  }
  new RelayRoom(game, mode, [conn], BOT_NAMES[key]);
};

/**
 * Inferno-only (QoL #372, 15 October): the two-player matches announced too, as Hellgate's are: "<name> is looking
 * for a <game> <mode> rival at the Devil's Arcade!" (the game's name and mode as the arcade shows them). The
 * game's ArcadeWindow.ioJoinOf reads these lines back (a chat "join" pill).
 */
const RIVAL_LABELS: Record<string, string> = {
  "smash:versus": "Spurtz Smash Versus",
  "breakout:versus": "Magma Breakout Versus",
  "stack:versus": "Magma Stack Versus",
  "swarm:versus": "Spurtz Swarm Versus",
  "flight:race": "Balthazar's Flight Race",
  "runner:race": "Rezghul Runner Race",
  "golf:versus": "Valgos Golf Versus",
};

/** The first to wait for a game with nobody else waiting is announced in Global chat (once in 10 minutes). */
const maybeAnnounce = (conn: Conn, game: string, mode: string) => {
  const key = `${game}:${mode}`;
  if (game !== "hellgate" && game !== "fusebug" && !ARENA[game] && !RIVAL_LABELS[key]) return;
  const others = ARENA[game]
    ? arenaLobbies.filter((r) => r.game === game && r.mode === mode).reduce((n, r) => n + r.humans.length, 0) - 1
    : game === "fusebug"
      ? fusebugLobbies.reduce((n, r) => n + r.humans.length, 0) - 1
      : (queues.get(key)?.length ?? 1) - 1;
  if (others > 0) return;
  const last = announced.get(conn.uid) ?? 0;
  if (Date.now() - last < 10 * 60_000) return;
  announced.set(conn.uid, Date.now());
  // (18 October, SUSPECTED-BUGS.md: never removed) the ones past their 10 minutes dropped past 5,000
  if (announced.size > 5000) for (const [id, at] of announced) if (Date.now() - at > 10 * 60_000) announced.delete(id);
  const names: Record<string, string> = { lavafloor: "Lava Floor", bonebrawl: "Bone Brawl", hockey: mode === "team" ? "Ember Hockey 2 v 2" : "Ember Hockey", soulsnatch: "Soul Snatch" };
  const text = RIVAL_LABELS[key]
    ? `${conn.name} is looking for a ${RIVAL_LABELS[key]} rival at the Devil's Arcade!`
    : ARENA[game]
    ? `${conn.name} is waiting for players in ${names[game]} at the Devil's Arcade!`
    : game === "fusebug"
      ? `${conn.name} is waiting for players in Fusebug Blast at the Devil's Arcade!`
      : mode === "coop"
        ? `${conn.name} is looking for a Hellgate Defense Co-op partner at the Devil's Arcade!`
        : `${conn.name} is looking for a Hellgate Defense Versus rival at the Devil's Arcade!`;
  void broadcastGlobal(ChatBroadcastType.EVENT, text)
    .then((id) => {
      if (id) calls.set(conn.uid, { id, conn, key });
      watchCalls();
    })
    .catch(() => 0);
};

/**
 * (26 October, the user's: "the message should disappear when the player stops looking for a partner or gets a
 * partner") The calls in Global chat, by player: taken back (chatBroadcasts.retractBroadcast) once that player is no
 * longer waiting alone for that game: left the queue or the lobby, paired, joined by another, started, gone.
 */
const calls = new Map<number, { id: string; conn: Conn; key: string }>();
let callTimer: ReturnType<typeof setInterval> | null = null;

/** Whether the player of a call still waits alone for its game. */
const stillWaiting = (c: { conn: Conn; key: string }) => {
  const conn = c.conn;
  if (conn.closed || conns.get(conn.uid) !== conn) return false;
  const [game] = c.key.split(":");
  // (the two-player games wait in a queue; the arena games and Fusebug in a lobby room of their own)
  if (!ARENA[game] && game !== "fusebug") return conn.queue === c.key;
  if (conn.queue) return false;
  const room = conn.room as (Room & { started?: boolean; humans?: unknown[]; closed?: boolean }) | null;
  if (!room || room.closed || room.started) return false;
  return Array.isArray(room.humans) && room.humans.length <= 1;
};

const watchCalls = () => {
  if (callTimer || !calls.size) return;
  callTimer = setInterval(() => {
    for (const [uid, c] of calls) {
      if (stillWaiting(c)) continue;
      calls.delete(uid);
      void retractBroadcast(c.id);
    }
    if (!calls.size && callTimer) {
      clearInterval(callTimer);
      callTimer = null;
    }
  }, 2000);
};
