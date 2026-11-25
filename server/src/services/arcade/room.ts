import type { WebSocket } from "ws";

/**
 * Inferno-only: the Devil's Arcade's live games (hub.ts). A player's connection, and what every room is.
 */
export interface Conn {
  ws: WebSocket;
  uid: number;
  name: string;
  room: Room | null;
  /** The queue the player waits in ("game:mode"), or null. */
  queue: string | null;
  queuedAt: number;
  closed: boolean;
  /** (QoL #367) the connection dropped and its seat is held for a while (hub.ts holdSeat): not dropped again. */
  held?: boolean;
}

export interface Seat {
  conn: Conn | null;
  uid: number;
  name: string;
  bot: boolean;
  /** Left the room (the connection closed or the player left): the seat plays on as nothing. */
  gone: boolean;
}

let nextRoomId = 1;

export const send = (conn: Conn | null | undefined, msg: unknown) => {
  if (!conn || conn.closed) return;
  try {
    conn.ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  } catch {
    /* (closing) */
  }
};

/**
 * Runs `step` every `ms` on time: setInterval alone runs a little late each time (a 50 ms step took about 52), so
 * the games ran slow and the games' clocks drifted from them (7 October). This checks four times a step and runs
 * the steps due; after a stall of more than five steps it skips ahead rather than rushing.
 */
export const everyStep = (ms: number, step: () => void): ReturnType<typeof setInterval> => {
  const started = performance.now();
  let ran = 0;
  return setInterval(() => {
    const due = Math.floor((performance.now() - started) / ms);
    if (due - ran > 5) ran = due - 1;
    while (ran < due) {
      ran++;
      step();
    }
  }, ms / 4);
};

export abstract class Room {
  readonly id = nextRoomId++;
  seats: Seat[] = [];
  closed = false;
  readonly created = Date.now();

  constructor(
    readonly game: string,
    readonly mode: string,
  ) {}

  /** Humans still in the room. */
  get humans(): Seat[] {
    return this.seats.filter((s) => !s.bot && !s.gone && s.conn && !s.conn.closed);
  }

  broadcast(msg: unknown, except: Seat | null = null) {
    const raw = JSON.stringify(msg);
    for (const s of this.seats) {
      if (s !== except && !s.bot && !s.gone) send(s.conn, raw);
    }
  }

  seatOf(conn: Conn): Seat | undefined {
    return this.seats.find((s) => s.conn === conn && !s.gone);
  }

  /** A player's message (the hub handles queueing and pings itself). */
  abstract onMessage(conn: Conn, msg: Record<string, unknown>): void;

  /** A player left (closed the game, left the match): the room decides what that means. */
  abstract onLeave(conn: Conn): void;

  /** Can this player come into the room now (rooms that take players in while they run)? */
  canJoin(_conn: Conn): boolean {
    return false;
  }

  join(_conn: Conn): void {}

  /**
   * Inferno-only (QoL #367): how long (ms) this player's seat waits for them when their connection drops, before it
   * counts as leaving (0: it leaves at once). Only rooms whose games run on the players' own machines (relay.ts)
   * can wait: the server's own arenas would need the whole state sent again.
   */
  graceMs(_conn: Conn): number {
    return 0;
  }

  /** (QoL #367) the player's connection dropped: their seat waits (graceMs). */
  away(_conn: Conn): void {}

  /** (QoL #367) the player is back on a new connection: their seat is theirs again. False if it can't be. */
  resume(_old: Conn, _conn: Conn): boolean {
    return false;
  }

  /** (QoL #367) the room's last word ({t: "end", ...}), for a player back after it ended. */
  lastEnd: Record<string, unknown> | null = null;

  close() {
    this.closed = true;
    for (const s of this.seats) {
      if (s.conn && s.conn.room === this) s.conn.room = null;
    }
  }
}
