import { questArcadeWin } from "../quests/questHooks.js";
import { logger } from "../../utils/logger.js";
import { type Conn, Room, type Seat, everyStep, send } from "./room.js";
import { recordMatch } from "./scores.js";

/**
 * Inferno-only: Fusebug Blast, the Devil's Arcade's bomb maze (Bomberman with Fusebugs), run here (20 steps a
 * second) and drawn by the games.
 *
 * A 15 x 13 maze: obsidian pillars that never break, bone crates that do. Up to four players, one a corner; each
 * lays Fusebugs (one at a time to start) that go off 2.2 seconds later in a cross of fire two tiles each way;
 * the fire stops at a pillar or the first crate (which breaks), sets off other Fusebugs and kills whoever it
 * touches. A broken crate may leave a power-up: one more Fusebug, a longer blast, faster feet. The last one
 * standing wins; after 2 minutes the lava closes in from the edges, a ring at a time. Solo: the player
 * against three bots. Live: two to four players (a match starts `fusebugLobbySeconds` after the second
 * joins, or at once with four), bots filling the empty corners.
 */
const STEP_MS = 50;
const DT = STEP_MS / 1000;
export const COLS = 15;
export const ROWS = 13;
const FUSE = 2.2;
const FLAME = 0.55;
const SPEED = 3.6; // tiles a second
const SPEED_UP = 0.6;
const MAX_SPEED = 6.6;
const SHRINK_AT = 120; // seconds
const SHRINK_EVERY = 2.5;
const COUNTDOWN_MS = 3500;

/** Tiles. */
const EMPTY = 0;
const PILLAR = 1;
const CRATE = 2;
const LAVA = 3;
/** Power-ups lying on a tile (another layer). */
const P_BOMB = 1;
const P_FIRE = 2;
const P_SPEED = 3;

interface Bomber {
  seat: Seat;
  /** The step (room time) of the last position hint taken: one a step. */
  hintAt?: number;
  /** How far hints may still move it (tiles; it comes back with time). */
  hintLeft?: number;
  i: number;
  x: number;
  y: number;
  dir: number; // 0 none, 1 up, 2 right, 3 down, 4 left
  alive: boolean;
  bombs: number;
  fire: number;
  speed: number;
  kills: number;
  wantBomb: boolean;
  /** A bot's plan: the tile it goes to and whether to lay a bomb on arriving. */
  plan: { x: number; y: number; bomb: boolean } | null;
  thinkAt: number;
  diedAt: number;
}

interface Bomb {
  id: number;
  x: number;
  y: number;
  owner: number;
  fire: number;
  t: number;
  /** Bombers standing on it when it was laid can walk off it (nobody else can walk on). */
  passable: Set<number>;
}

const BOT_NAMES = ["Sparkplug", "Wickwire", "Boomgut", "Fizzle", "Cinderfuse", "Kaboomsy"];

export class FusebugRoom extends Room {
  private grid: number[] = [];
  private power: number[] = [];
  private bombers: Bomber[] = [];
  private bombs = new Map<number, Bomb>();
  private flames = new Map<number, number[]>(); // tile -> [time left, whose bomb]
  private nextBomb = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private t = -COUNTDOWN_MS / 1000;
  private shrinkRing = 0;
  private shrinkAt = SHRINK_AT;
  private ended = false;
  private changes: number[][] = [];
  private booms: number[][] = [];
  /** Steps run (sent with each state, so the games draw on the server's clock). */
  private step = 0;
  started = false;
  /** A live lobby: when the match starts by itself. */
  startsAt = 0;

  constructor(mode: string) {
    super("fusebug", mode);
  }

  canJoin(_conn: Conn) {
    return !this.started && !this.closed && this.humans.length < 4;
  }

  /** A player comes into the lobby (live), or the solo match (with the bots). */
  join(conn: Conn) {
    const seat: Seat = { conn, uid: conn.uid, name: conn.name, bot: false, gone: false };
    this.seats.push(seat);
    conn.room = this;
    conn.queue = null;
    this.lobby();
  }

  lobby() {
    this.broadcast({ t: "lobby", room: this.id, players: this.humans.map((s) => s.name), startsIn: this.startsAt ? Math.max(0, this.startsAt - Date.now()) : -1 });
  }

  /** The match begins: the maze made, the bots added, everyone told. */
  begin() {
    if (this.started) return;
    this.started = true;
    this.seats = this.seats.filter((s) => !s.gone);
    const used = new Set(this.seats.map((s) => s.name));
    while (this.seats.length < 4) {
      const name = BOT_NAMES.find((n) => !used.has(n)) ?? "Fusebot";
      used.add(name);
      this.seats.push({ conn: null, uid: -1, name, bot: true, gone: false });
    }
    this.makeMaze();
    const corners = [
      [1, 1],
      [COLS - 2, ROWS - 2],
      [COLS - 2, 1],
      [1, ROWS - 2],
    ];
    this.bombers = this.seats.map((seat, i) => ({
      seat,
      i,
      x: corners[i][0],
      y: corners[i][1],
      dir: 0,
      alive: true,
      bombs: 1,
      fire: 2,
      speed: SPEED,
      kills: 0,
      wantBomb: false,
      plan: null,
      thinkAt: 0,
      diedAt: 0,
    }));
    const players = this.seats.map((s) => ({ uid: s.uid, name: s.name, bot: s.bot }));
    this.seats.forEach((s, i) => {
      if (!s.bot) send(s.conn, { t: "start", room: this.id, game: "fusebug", mode: this.mode, you: i, players, cols: COLS, rows: ROWS, grid: this.grid, power: this.power, cd: COUNTDOWN_MS, step: STEP_MS, shrinkAt: SHRINK_AT });
    });
    this.timer = everyStep(STEP_MS, () => this.tick());
    logger.info(`Arcade: Fusebug Blast ${this.mode} room ${this.id}: ${players.map((p) => p.name).join(", ")}`);
  }

  private idx(x: number, y: number) {
    return y * COLS + x;
  }

  private makeMaze() {
    this.grid = new Array(COLS * ROWS).fill(EMPTY);
    this.power = new Array(COLS * ROWS).fill(0);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || (x % 2 === 0 && y % 2 === 0)) {
          this.grid[this.idx(x, y)] = PILLAR;
        }
      }
    }
    const corner = (x: number, y: number) =>
      [
        [1, 1],
        [COLS - 2, ROWS - 2],
        [COLS - 2, 1],
        [1, ROWS - 2],
      ].some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) <= 1);
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const i = this.idx(x, y);
        if (this.grid[i] === EMPTY && !corner(x, y) && Math.random() < 0.62) {
          this.grid[i] = CRATE;
          const r = Math.random();
          this.power[i] = r < 0.13 ? P_BOMB : r < 0.26 ? P_FIRE : r < 0.36 ? P_SPEED : 0;
        }
      }
    }
  }

  onMessage(conn: Conn, msg: Record<string, unknown>) {
    const b = this.bombers.find((k) => k.seat.conn === conn && !k.seat.gone);
    if (!b || this.ended) return;
    if (msg.t === "in") {
      const hx = Number(msg.x);
      const hy = Number(msg.y);
      if (Number.isFinite(hx) && Number.isFinite(hy)) this.hint(b, hx, hy);
      const d = Number(msg.d);
      if (d >= 0 && d <= 4) b.dir = d;
      if (msg.b) b.wantBomb = true;
    }
  }

  /**
   * The game moves its player at once and says where it was when a key changed (7 October: smoother play). The
   * server has had it walking the old way a little longer meanwhile; it is put back where the player saw it, if
   * that is close and on free ground, so it stops, turns and lays its Fusebug where the player saw it.
   */
  private hint(b: Bomber, hx: number, hy: number) {
    if (!b.alive || Math.abs(hx - b.x) + Math.abs(hy - b.y) > 0.6) return;
    // (once a step: hints sent many times a step each moved it up to 0.6 tiles further, a speed hack; and not in
    // the countdown, when nothing moves; 9 October)
    if (b.hintAt === this.t || this.t < 0) return;
    // (and no more than a lag's worth: up to 0.6 tiles, coming back at half its speed; a hint every step, each
    // 0.6 ahead, had it run several times as fast; 9 October)
    const left = Math.min(0.6, (b.hintLeft ?? 0.6) + b.speed * 0.5 * Math.max(0, this.t - (b.hintAt ?? -10)));
    b.hintAt = this.t;
    b.hintLeft = left;
    const far = Math.abs(hx - b.x) + Math.abs(hy - b.y);
    if (far > left) return;
    for (const tx of [Math.floor(hx + 0.05), Math.ceil(hx - 0.05)]) {
      for (const ty of [Math.floor(hy + 0.05), Math.ceil(hy - 0.05)]) {
        if (this.solid(tx, ty, b)) return;
      }
    }
    b.x = hx;
    b.y = hy;
    b.hintLeft = left - far;
  }

  onLeave(conn: Conn) {
    const seat = this.seatOf(conn);
    if (!seat) return;
    seat.gone = true;
    if (conn.room === this) conn.room = null;
    if (!this.started) {
      this.seats = this.seats.filter((s) => s !== seat);
      if (!this.humans.length) this.shut();
      else this.lobby();
      return;
    }
    const b = this.bombers.find((k) => k.seat === seat);
    if (b && b.alive && !this.ended) {
      b.alive = false;
      b.diedAt = this.t;
      this.broadcast({ t: "die", i: b.i, by: -1 });
    }
    if (!this.humans.length) this.end(-1, "left");
  }

  private solid(x: number, y: number, who: Bomber | null) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    const g = this.grid[this.idx(x, y)];
    if (g === PILLAR || g === CRATE) return true;
    for (const bomb of this.bombs.values()) {
      if (bomb.x === x && bomb.y === y && !(who && bomb.passable.has(who.i))) return true;
    }
    return false;
  }

  /** Grid-aligned movement with corner sliding (the classic feel). */
  private move(b: Bomber) {
    if (!b.dir) return;
    const dx = b.dir === 2 ? 1 : b.dir === 4 ? -1 : 0;
    const dy = b.dir === 3 ? 1 : b.dir === 1 ? -1 : 0;
    let step = b.speed * DT;
    const cx = Math.round(b.x);
    const cy = Math.round(b.y);
    if (dx !== 0) {
      // first line up with the row, then go
      const off = b.y - cy;
      if (Math.abs(off) > 0.02) {
        if (!this.solid(cx + dx, cy, b)) {
          const fix = Math.min(Math.abs(off), step);
          b.y -= Math.sign(off) * fix;
          step -= fix;
        } else return;
      } else b.y = cy;
      const nx = b.x + dx * step;
      const ahead = dx > 0 ? Math.ceil(nx - 0.001) : Math.floor(nx + 0.001);
      if (this.solid(ahead, cy, b) && ahead !== cx) b.x = cx;
      else b.x = nx;
    } else {
      const off = b.x - cx;
      if (Math.abs(off) > 0.02) {
        if (!this.solid(cx, cy + dy, b)) {
          const fix = Math.min(Math.abs(off), step);
          b.x -= Math.sign(off) * fix;
          step -= fix;
        } else return;
      } else b.x = cx;
      const ny = b.y + dy * step;
      const ahead = dy > 0 ? Math.ceil(ny - 0.001) : Math.floor(ny + 0.001);
      if (this.solid(cx, ahead, b) && ahead !== cy) b.y = cy;
      else b.y = ny;
    }
    // (off a bomb laid under it: from now on that bomb is solid for it too)
    for (const bomb of this.bombs.values()) {
      if (bomb.passable.has(b.i) && (Math.abs(bomb.x - b.x) >= 0.95 || Math.abs(bomb.y - b.y) >= 0.95)) bomb.passable.delete(b.i);
    }
    // power-ups
    const tx = Math.round(b.x);
    const ty = Math.round(b.y);
    const i = this.idx(tx, ty);
    if (this.grid[i] === EMPTY && this.power[i]) {
      const p = this.power[i];
      if (p === P_BOMB) b.bombs = Math.min(6, b.bombs + 1);
      if (p === P_FIRE) b.fire = Math.min(8, b.fire + 1);
      if (p === P_SPEED) b.speed = Math.min(MAX_SPEED, b.speed + SPEED_UP);
      this.power[i] = 0;
      this.changes.push([i, this.grid[i], 0]);
      this.broadcast({ t: "pick", i: b.i, p, bombs: b.bombs, fire: b.fire, speed: Math.round(b.speed * 10) });
    }
  }

  private layBomb(b: Bomber) {
    b.wantBomb = false;
    if (!b.alive) return;
    const tx = Math.round(b.x);
    const ty = Math.round(b.y);
    const mine = [...this.bombs.values()].filter((k) => k.owner === b.i).length;
    if (mine >= b.bombs) return;
    if ([...this.bombs.values()].some((k) => k.x === tx && k.y === ty)) return;
    if (this.grid[this.idx(tx, ty)] !== EMPTY) return;
    const passable = new Set<number>();
    for (const o of this.bombers) {
      if (o.alive && Math.abs(o.x - tx) < 0.95 && Math.abs(o.y - ty) < 0.95) passable.add(o.i);
    }
    const bomb: Bomb = { id: this.nextBomb++, x: tx, y: ty, owner: b.i, fire: b.fire, t: FUSE, passable };
    this.bombs.set(bomb.id, bomb);
    this.broadcast({ t: "bomb", id: bomb.id, x: tx, y: ty, i: b.i, fire: b.fire });
  }

  /** The tiles a bomb's fire reaches, and the crates it breaks. */
  private reach(bomb: { x: number; y: number; fire: number }): { tiles: number[]; crates: number[] } {
    const tiles = [this.idx(bomb.x, bomb.y)];
    const crates: number[] = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let k = 1; k <= bomb.fire; k++) {
        const x = bomb.x + dx * k;
        const y = bomb.y + dy * k;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) break;
        const i = this.idx(x, y);
        const g = this.grid[i];
        if (g === PILLAR || g === LAVA) break;
        tiles.push(i);
        if (g === CRATE) {
          crates.push(i);
          break;
        }
        // (fire stops at another bomb, which it sets off)
        if ([...this.bombs.values()].some((o) => o.x === x && o.y === y)) break;
      }
    }
    return { tiles, crates };
  }

  private explode(bomb: Bomb) {
    this.bombs.delete(bomb.id);
    const { tiles, crates } = this.reach(bomb);
    for (const i of tiles) this.flames.set(i, [FLAME, bomb.owner]);
    for (const i of crates) {
      this.grid[i] = EMPTY;
      this.changes.push([i, EMPTY, this.power[i]]);
    }
    this.booms.push([bomb.id, bomb.x, bomb.y, ...tiles]);
    // chain: other bombs in the fire go off now
    for (const other of [...this.bombs.values()]) {
      if (tiles.includes(this.idx(other.x, other.y))) other.t = Math.min(other.t, 0.05);
    }
    // power-ups in the fire (not under a crate just broken) burn
    for (const i of tiles) {
      if (this.power[i] && this.grid[i] === EMPTY && !crates.includes(i)) {
        this.power[i] = 0;
        this.changes.push([i, EMPTY, 0]);
      }
    }
  }

  private tick() {
    if (this.ended) return;
    this.step++;
    this.t += DT;
    if (this.t < 0) return;
    for (const b of this.bombers) {
      if (!b.alive) continue;
      if (b.seat.bot) this.think(b);
      this.move(b);
      if (b.wantBomb) this.layBomb(b);
    }
    for (const bomb of [...this.bombs.values()]) {
      bomb.t -= DT;
      if (bomb.t <= 0 && this.bombs.has(bomb.id)) this.explode(bomb);
    }
    for (const [i, f] of [...this.flames]) {
      if (f[0] - DT <= 0) this.flames.delete(i);
      else f[0] -= DT;
    }
    // the lava closes in
    if (this.t >= this.shrinkAt && this.shrinkRing < Math.floor(Math.min(COLS, ROWS) / 2) - 1) {
      this.shrinkAt += SHRINK_EVERY;
      this.shrinkRing++;
      const r = this.shrinkRing;
      for (let y = r; y < ROWS - r; y++) {
        for (let x = r; x < COLS - r; x++) {
          if (x === r || y === r || x === COLS - 1 - r || y === ROWS - 1 - r) {
            const i = this.idx(x, y);
            if (this.grid[i] !== LAVA) {
              this.grid[i] = LAVA;
              this.power[i] = 0;
              this.changes.push([i, LAVA, 0]);
              // (swallowed: sent as a boom with no fire, so the game takes it off the board; it stayed drawn,
              // pulsing, and its tile blocked; 9 October)
              for (const bomb of [...this.bombs.values()]) {
                if (bomb.x === x && bomb.y === y) {
                  this.bombs.delete(bomb.id);
                  this.booms.push([bomb.id, x, y]);
                }
              }
            }
          }
        }
      }
    }
    // (the last ring closed and two still dodge on the tile left: a little longer, then a draw for them; the match
    // never ended, and a bot there never laid a Fusebug; 9 October)
    if (this.shrinkRing >= Math.floor(Math.min(COLS, ROWS) / 2) - 1 && this.t >= this.shrinkAt + SHRINK_EVERY) {
      this.end(-1, "time");
      return;
    }
    // who burns
    for (const b of this.bombers) {
      if (!b.alive) continue;
      const i = this.idx(Math.round(b.x), Math.round(b.y));
      if (this.flames.has(i) || this.grid[i] === LAVA) {
        b.alive = false;
        b.diedAt = this.t;
        const killer = this.flames.has(i) ? this.flames.get(i)![1] : -1;
        if (killer >= 0 && killer !== b.i) this.bombers[killer].kills++;
        this.broadcast({ t: "die", i: b.i, by: killer });
      }
    }
    const msg: Record<string, unknown> = {
      t: "f",
      k: this.step,
      tm: Math.round(this.t * 10),
      p: this.bombers.map((b) => [Math.round(b.x * 100), Math.round(b.y * 100), b.dir, b.alive ? 1 : 0]),
    };
    if (this.changes.length) msg.c = this.changes;
    if (this.booms.length) msg.x = this.booms;
    this.broadcast(msg);
    this.changes = [];
    this.booms = [];
    // over: one (or nobody) left, or no player left alive (the bots' fight doesn't matter)
    const alive = this.bombers.filter((b) => b.alive);
    const playersAlive = alive.filter((b) => !b.seat.bot && !b.seat.gone);
    if (alive.length <= 1 || !playersAlive.length) {
      this.end(alive.length === 1 ? alive[0].i : -1, alive.length === 0 ? "draw" : alive.length === 1 ? "last" : "fallen");
    }
  }

  private end(winner: number, reason: string) {
    if (this.ended) return;
    this.ended = true;
    if (this.timer) clearInterval(this.timer);
    this.broadcast({ t: "end", winner, reason, kills: this.bombers.map((b) => b.kills), tm: Math.round(this.t * 10) });
    for (const b of this.bombers) {
      if (b.seat.bot) continue;
      // (a draw only for those who burned in the very last moment with everyone else)
      const result = winner === b.i ? "win" : (reason === "draw" && b.diedAt >= this.t - 0.001) || (reason === "time" && b.alive && !b.seat.gone) ? "draw" : "loss";
      if (result === "win") questArcadeWin(b.seat.uid, this.bombers.filter((x) => !x.seat.bot).length >= 2);
      void recordMatch(b.seat.uid, "fusebug", this.mode, result, b.kills).catch((e) => logger.warn(`Arcade: ${e}`));
    }
    logger.info(`Arcade: Fusebug Blast room ${this.id} ended: ${winner >= 0 ? this.bombers[winner].seat.name : "draw"}`);
    this.close();
  }

  private shut() {
    if (this.timer) clearInterval(this.timer);
    this.close();
  }

  // ---- bots

  /** Tiles some fire will reach soon (every bomb's cross, the lava's next ring). */
  private dangerMap(): Set<number> {
    const d = new Set<number>(this.flames.keys());
    for (const bomb of this.bombs.values()) for (const i of this.reach(bomb).tiles) d.add(i);
    if (this.t >= this.shrinkAt - 1.5) {
      const r = this.shrinkRing + 1;
      for (let y = r; y < ROWS - r; y++) for (let x = r; x < COLS - r; x++) if (x === r || y === r || x === COLS - 1 - r || y === ROWS - 1 - r) d.add(this.idx(x, y));
    }
    return d;
  }

  /** Breadth first from (x, y) over tiles a bomber can walk (not into `avoid`): the distance to each. */
  private walk(x: number, y: number, me: Bomber, avoid: Set<number> | null = null): Map<number, number> {
    const dist = new Map<number, number>();
    const q = [this.idx(x, y)];
    dist.set(q[0], 0);
    while (q.length) {
      const c = q.shift()!;
      const cx = c % COLS;
      const cy = Math.floor(c / COLS);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx;
        const ny = cy + dy;
        const n = this.idx(nx, ny);
        if (dist.has(n) || (avoid && avoid.has(n))) continue;
        if (this.solid(nx, ny, me) || this.grid[n] === LAVA) continue;
        dist.set(n, dist.get(c)! + 1);
        q.push(n);
      }
    }
    return dist;
  }

  /** The first step from `from` to `to` along a shortest walk (not into `avoid`): a direction 1-4, or 0. */
  private firstStep(from: number, to: number, me: Bomber, avoid: Set<number> | null = null): number {
    const prev = new Map<number, number>();
    const q = [from];
    prev.set(from, -1);
    while (q.length) {
      const c = q.shift()!;
      if (c === to) break;
      const cx = c % COLS;
      const cy = Math.floor(c / COLS);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = this.idx(cx + dx, cy + dy);
        if (prev.has(n) || (avoid && avoid.has(n) && n !== to)) continue;
        if (this.solid(cx + dx, cy + dy, me) || this.grid[n] === LAVA) continue;
        prev.set(n, c);
        q.push(n);
      }
    }
    if (!prev.has(to)) return 0;
    let c = to;
    while (prev.get(c) !== from && prev.get(c) !== -1) c = prev.get(c)!;
    const d = c - from;
    return d === 1 ? 2 : d === -1 ? 4 : d === COLS ? 3 : d === -COLS ? 1 : 0;
  }

  private think(b: Bomber) {
    const tx = Math.round(b.x);
    const ty = Math.round(b.y);
    const here = this.idx(tx, ty);
    const danger = this.dangerMap();
    const centred = Math.abs(b.x - tx) < 0.12 && Math.abs(b.y - ty) < 0.12;
    if (danger.has(here)) {
      // run to the nearest safe tile (through fire if there is no other way)
      const reachable = this.walk(tx, ty, b);
      let best = -1;
      let bestD = 1e9;
      for (const [i, d] of reachable) {
        if (!danger.has(i) && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      b.plan = null;
      b.dir = best >= 0 ? this.firstStep(here, best, b, danger) || this.firstStep(here, best, b) : 0;
      return;
    }
    // safe here: never step into fire (or where fire is coming)
    if (b.dir) {
      const nx = tx + (b.dir === 2 ? 1 : b.dir === 4 ? -1 : 0);
      const ny = ty + (b.dir === 3 ? 1 : b.dir === 1 ? -1 : 0);
      if (danger.has(this.idx(nx, ny))) {
        b.dir = 0;
        b.plan = null;
      }
    }
    if (!centred && b.dir) return; // (finish the step it is on)
    // the tiles it can get to without walking through danger
    const safe = this.walk(tx, ty, b, danger);
    if (this.t < b.thinkAt && b.plan && this.idx(b.plan.x, b.plan.y) !== here && safe.has(this.idx(b.plan.x, b.plan.y))) {
      b.dir = this.firstStep(here, this.idx(b.plan.x, b.plan.y), b, danger);
      return;
    }
    b.thinkAt = this.t + 0.4 + Math.random() * 0.4;
    // a bomb here would hit something worth it, and there is a way out?
    const wouldHit = (i: number) => {
      const { tiles, crates } = this.reach({ x: i % COLS, y: Math.floor(i / COLS), fire: b.fire });
      const players = this.bombers.filter((o) => o !== b && o.alive && tiles.includes(this.idx(Math.round(o.x), Math.round(o.y)))).length;
      return crates.length + players * 3;
    };
    // a way out of its own fire, not through anything else's, near enough to make before it goes off
    const canEscape = (i: number) => {
      const fire = new Set(this.reach({ x: i % COLS, y: Math.floor(i / COLS), fire: b.fire }).tiles);
      for (const [j, d] of this.walk(i % COLS, Math.floor(i / COLS), b, danger)) {
        if (!fire.has(j) && d <= Math.floor((FUSE - 0.5) * b.speed)) return true;
      }
      return false;
    };
    const mine = [...this.bombs.values()].filter((k) => k.owner === b.i).length;
    if (centred && mine < b.bombs && wouldHit(here) > 0 && canEscape(here) && Math.random() < 0.85) {
      b.wantBomb = true;
      b.dir = 0;
      b.plan = null;
      return;
    }
    // where to go: power-ups first, then a spot to bomb from (crates, players)
    let best = -1;
    let bestScore = -1e9;
    for (const [i, d] of safe) {
      if (d === 0) continue;
      let sc = -d * 1.2;
      if (this.power[i] && this.grid[i] === EMPTY) sc += 12;
      sc += wouldHit(i) * 2.2;
      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    }
    if (best < 0) {
      b.dir = 0;
      return;
    }
    b.plan = { x: best % COLS, y: Math.floor(best / COLS), bomb: true };
    b.dir = this.firstStep(here, best, b, danger);
  }

}
