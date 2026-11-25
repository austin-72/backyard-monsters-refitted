import { logger } from "../../utils/logger.js";
import { type Conn, Room, type Seat, everyStep, send } from "./room.js";

/** An angle brought into -pi..pi, in one step whatever its size (no loop). */
const wrapAngle = (a: number): number => (Number.isFinite(a) ? Math.atan2(Math.sin(a), Math.cos(a)) : 0);
import { recordScore } from "./scores.js";

/**
 * Inferno-only: Wormzer, the Devil's Arcade's snake arena, run here (15 steps a second) and drawn by the games.
 *
 * Every player is a King Wormzer in a round lava arena: steer with the mouse, hold to burrow faster (it costs
 * length, dropped as embers behind), eat embers to grow. A Wormzer whose head runs into another's body, or out
 * of the arena, dies and falls apart into embers. Whoever's body it hit gets the kill. The score is the longest
 * a player grew in one life (and its kills break ties). Solo: the player and 7 bots. Live: one arena for
 * everyone (up to `wormzerPlayers`), bots keeping it at 6 or more; players come and go as they like.
 *
 * The games are sent: on joining, every Wormzer's body and the embers; then each step every head (where, which
 * way, how long, burrowing) and the embers eaten and dropped. The games draw the bodies from the heads' trails,
 * as the server keeps them.
 */
const STEP_MS = 1000 / 15;
const DT = STEP_MS / 1000;
const ARENA = 1400;
const SPEED = 150;
const BOOST = 270;
const TURN = 3.8; // radians a second
const SEG = 10; // between the body's points
const START_LEN = 12;
const MIN_LEN = 8;
const FOOD_BASE = 220;
const FOOD_PER_SNAKE = 24;
const CELL = 48;

interface Snake {
  id: number;
  name: string;
  bot: boolean;
  skin: number;
  seat: Seat | null;
  x: number;
  y: number;
  a: number;
  /** Where it wants to go (radians). */
  want: number;
  boost: boolean;
  len: number;
  /** The body: points SEG apart, from the head back. */
  pts: number[][];
  alive: boolean;
  kills: number;
  best: number;
  /** A bot's thinking: what it goes for, and when it next looks. */
  target: Food | null;
  thinkAt: number;
  boostDrop: number;
}

interface Food {
  id: number;
  x: number;
  y: number;
  v: number;
}

const BOT_NAMES = ["Gnasher", "Cinderworm", "Ashcoil", "Slagtail", "Moltenmaw", "Brimbelly", "Sulfurspine", "Emberjaw", "Pyrewyrm", "Clinkerloop", "Hellnoodle", "Magmaw"];

export class WormzerRoom extends Room {
  private snakes = new Map<number, Snake>();
  private food = new Map<number, Food>();
  private nextSnake = 1;
  private nextFood = 1;
  private step = 0;
  private timer: ReturnType<typeof setInterval>;
  private added: number[][] = [];
  private removed: number[] = [];
  private emptySince = 0;
  readonly maxPlayers: number;
  readonly minSnakes: number;

  constructor(mode: string, maxPlayers: number, minSnakes: number) {
    super("wormzer", mode);
    this.maxPlayers = maxPlayers;
    this.minSnakes = minSnakes;
    for (let i = 0; i < FOOD_BASE; i++) this.addFood(this.randomPoint(ARENA - 40), 1 + Math.floor(Math.random() * 3), false);
    this.timer = everyStep(STEP_MS, () => this.tick());
    logger.info(`Arcade: Wormzer ${mode} arena ${this.id} opened`);
  }

  canJoin(_conn: Conn) {
    return !this.closed && this.humans.length < this.maxPlayers;
  }

  join(conn: Conn) {
    const seat: Seat = { conn, uid: conn.uid, name: conn.name, bot: false, gone: false };
    this.seats.push(seat);
    conn.room = this;
    conn.queue = null;
    this.emptySince = 0;
    const snake = this.spawn(conn.name, false, seat);
    // (the others told: they never heard of a player who came in, and ran into a body they couldn't see; 9 October)
    this.broadcast({ t: "born", ...this.full(snake) }, seat);
    this.fillBots();
    send(conn, {
      t: "start",
      room: this.id,
      game: "wormzer",
      mode: this.mode,
      you: snake.id,
      arena: ARENA,
      seg: SEG,
      step: STEP_MS,
      snakes: [...this.snakes.values()].map((s) => this.full(s)),
      food: [...this.food.values()].map((f) => [f.id, Math.round(f.x), Math.round(f.y), f.v]),
    });
    this.roster();
  }

  private full(s: Snake) {
    return { id: s.id, name: s.name, bot: s.bot, skin: s.skin, len: Math.round(s.len * 10), alive: s.alive, pts: s.pts.map((p) => [Math.round(p[0]), Math.round(p[1])]) };
  }

  private roster() {
    this.broadcast({ t: "roster", snakes: [...this.snakes.values()].map((s) => ({ id: s.id, name: s.name, bot: s.bot, skin: s.skin })) });
  }

  private randomPoint(r: number): number[] {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  /** A spot away from everyone's bodies. */
  private freeSpot(): number[] {
    let best = this.randomPoint(ARENA * 0.7);
    let bestD = -1;
    for (let k = 0; k < 12; k++) {
      const p = this.randomPoint(ARENA * 0.75);
      let d = 1e9;
      for (const s of this.snakes.values()) {
        if (!s.alive) continue;
        for (let i = 0; i < s.pts.length; i += 3) d = Math.min(d, Math.hypot(s.pts[i][0] - p[0], s.pts[i][1] - p[1]));
      }
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private spawn(name: string, bot: boolean, seat: Seat | null): Snake {
    const [x, y] = this.freeSpot();
    const a = Math.atan2(-y, -x) + (Math.random() - 0.5);
    const s: Snake = {
      id: this.nextSnake++,
      name,
      bot,
      // (skin 5, gold, is how each player sees their own Wormzer: nobody else wears it)
      skin: [0, 1, 2, 3, 4, 6, 7][(this.nextSnake * 3) % 7],
      seat,
      x,
      y,
      a,
      want: a,
      boost: false,
      len: START_LEN,
      pts: [],
      alive: true,
      kills: 0,
      best: START_LEN,
      target: null,
      thinkAt: 0,
      boostDrop: 0,
    };
    s.pts.push([x, y]);
    for (let i = 0; i <= START_LEN; i++) s.pts.push([x - Math.cos(a) * SEG * i, y - Math.sin(a) * SEG * i]);
    this.snakes.set(s.id, s);
    return s;
  }

  private respawn(s: Snake) {
    const [x, y] = this.freeSpot();
    s.x = x;
    s.y = y;
    s.a = s.want = Math.atan2(-y, -x);
    s.len = START_LEN;
    s.best = START_LEN;
    s.kills = 0;
    s.alive = true;
    s.boost = false;
    s.pts = [[x, y]];
    for (let i = 0; i <= START_LEN; i++) s.pts.push([x - Math.cos(s.a) * SEG * i, y - Math.sin(s.a) * SEG * i]);
    this.broadcast({ t: "born", ...this.full(s) });
  }

  private fillBots() {
    const alive = [...this.snakes.values()];
    const humans = alive.filter((s) => !s.bot).length;
    let bots = alive.filter((s) => s.bot).length;
    const want = Math.max(0, this.minSnakes - humans);
    let changed = false;
    while (bots < want) {
      const used = new Set(alive.map((s) => s.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Wormzer ${this.nextSnake}`;
      const s = this.spawn(name, true, null);
      alive.push(s);
      this.broadcast({ t: "born", ...this.full(s) });
      bots++;
      changed = true;
    }
    // (too many bots when players came: the spare ones burrow away)
    while (bots > want) {
      const spare = alive.find((s) => s.bot && s.alive);
      if (!spare) break;
      this.snakes.delete(spare.id);
      alive.splice(alive.indexOf(spare), 1);
      this.broadcast({ t: "gone", id: spare.id });
      bots--;
      changed = true;
    }
    if (changed) this.roster();
  }

  private addFood(p: number[], v: number, tell = true) {
    const f: Food = { id: this.nextFood++, x: p[0], y: p[1], v };
    this.food.set(f.id, f);
    if (tell) this.added.push([f.id, Math.round(f.x), Math.round(f.y), v]);
    return f;
  }

  onMessage(conn: Conn, msg: Record<string, unknown>) {
    const seat = this.seatOf(conn);
    if (!seat) return;
    const s = [...this.snakes.values()].find((k) => k.seat === seat);
    if (!s) return;
    if (msg.t === "in") {
      const a = Number(msg.a);
      // (13 October) any angle, brought into -pi..pi: a huge one (1e20) made the turning loop below run for ever
      // and froze the whole server
      if (Number.isFinite(a)) s.want = wrapAngle(a);
      s.boost = Boolean(msg.b) && s.len > MIN_LEN + 1;
    } else if (msg.t === "again" && !s.alive) {
      this.respawn(s);
    }
  }

  onLeave(conn: Conn) {
    const seat = this.seatOf(conn);
    if (!seat) return;
    seat.gone = true;
    if (conn.room === this) conn.room = null;
    const s = [...this.snakes.values()].find((k) => k.seat === seat);
    if (s) {
      // (a life left alive still counts: only lives that ended in a death were recorded; 9 October)
      if (s.alive && !s.bot && s.best > 0) {
        void recordScore(seat.uid, "wormzer", this.mode, "", Math.round(s.best), s.kills).catch((e) => logger.warn(`Arcade: ${e}`));
      }
      if (s.alive) this.kill(s, null, false);
      this.snakes.delete(s.id);
      this.broadcast({ t: "gone", id: s.id });
    }
    this.seats = this.seats.filter((x) => x !== seat);
    // (a solo room is its player's alone: shut at once, not after 15 s of bots playing to nobody; asking for
    // rooms over and over kept thousands running; 9 October)
    if (this.mode === "solo" && !this.humans.length) {
      this.shut();
      return;
    }
    this.fillBots();
  }

  private grid = new Map<number, number[][]>();

  private buildGrid() {
    this.grid.clear();
    for (const s of this.snakes.values()) {
      if (!s.alive) continue;
      const r = this.radius(s);
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i];
        const key = (Math.floor(p[0] / CELL) + 1000) * 4000 + Math.floor(p[1] / CELL) + 1000;
        let cell = this.grid.get(key);
        if (!cell) this.grid.set(key, (cell = []));
        cell.push([p[0], p[1], r, s.id, i]);
      }
    }
  }

  /** The body point nearest (x, y) within `reach` that isn't snake `self`'s: [x, y, r, id] or null. */
  private hit(x: number, y: number, reach: number, self: number): number[] | null {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const cell = this.grid.get((cx + i + 1000) * 4000 + cy + j + 1000);
        if (!cell) continue;
        for (const p of cell) {
          if (p[3] === self) continue;
          if (Math.hypot(p[0] - x, p[1] - y) < reach + p[2]) return p;
        }
      }
    }
    return null;
  }

  private radius(s: Snake) {
    return 8 + Math.min(16, s.len * 0.07);
  }

  private tick() {
    if (this.closed) return;
    this.step++;
    this.buildGrid();
    for (const s of this.snakes.values()) {
      if (!s.alive) continue;
      if (s.bot) this.think(s);
      // turn towards where it wants to go, at most TURN a second (slower when long)
      const d = wrapAngle(s.want - s.a);
      const turn = (TURN * DT) / (1 + s.len / 300);
      s.a += Math.max(-turn, Math.min(turn, d));
      if (s.a > Math.PI) s.a -= Math.PI * 2;
      if (s.a < -Math.PI) s.a += Math.PI * 2;
      const speed = s.boost && s.len > MIN_LEN + 1 ? BOOST : SPEED;
      s.x += Math.cos(s.a) * speed * DT;
      s.y += Math.sin(s.a) * speed * DT;
      if (s.boost && s.len > MIN_LEN + 1) {
        s.len -= 2.2 * DT;
        s.boostDrop += 2.2 * DT;
        if (s.boostDrop >= 1) {
          s.boostDrop -= 1;
          const tail = s.pts[s.pts.length - 1];
          this.addFood([tail[0] + (Math.random() - 0.5) * 8, tail[1] + (Math.random() - 0.5) * 8], 1);
        }
      } else if (s.boost) {
        s.boost = false;
      }
      // the body follows the head's trail: pts[0] is the head, the rest fixed points SEG apart (a new one
      // dropped whenever the head is SEG from the last); the games do the same with the heads they are sent
      if (s.pts.length < 2) s.pts = [[s.x, s.y], [s.x, s.y]];
      s.pts[0] = [s.x, s.y];
      if (Math.hypot(s.x - s.pts[1][0], s.y - s.pts[1][1]) >= SEG) s.pts.splice(1, 0, [s.x, s.y]);
      const want = Math.max(MIN_LEN, Math.round(s.len)) + 1;
      while (s.pts.length > want) s.pts.pop();
    }
    // deaths: out of the arena, or a head into another's body
    for (const s of this.snakes.values()) {
      if (!s.alive) continue;
      if (Math.hypot(s.x, s.y) > ARENA) {
        this.kill(s, null);
        continue;
      }
      const p = this.hit(s.x, s.y, this.radius(s) * 0.6, s.id);
      if (p) {
        const by = this.snakes.get(p[3]) ?? null;
        this.kill(s, by && by.alive ? by : null);
      }
    }
    // eating
    for (const s of this.snakes.values()) {
      if (!s.alive) continue;
      const reach = this.radius(s) + 16;
      for (const f of this.food.values()) {
        if (Math.abs(f.x - s.x) > reach || Math.abs(f.y - s.y) > reach) continue;
        if (Math.hypot(f.x - s.x, f.y - s.y) < reach) {
          s.len += f.v * 0.6;
          this.food.delete(f.id);
          this.removed.push(f.id);
          if (s.len > s.best) s.best = s.len;
        }
      }
    }
    // more embers where there are too few
    const want = FOOD_BASE + FOOD_PER_SNAKE * this.snakes.size;
    for (let k = 0; k < 6 && this.food.size < want; k++) this.addFood(this.randomPoint(ARENA - 40), 1 + Math.floor(Math.random() * 3));
    // the state
    const heads: number[][] = [];
    for (const s of this.snakes.values()) {
      heads.push([s.id, Math.round(s.x), Math.round(s.y), Math.round(s.a * 100), Math.round(s.len * 10), s.boost ? 1 : 0, s.alive ? 1 : 0]);
    }
    const msg: Record<string, unknown> = { t: "w", k: this.step, s: heads };
    if (this.added.length) msg.fa = this.added;
    if (this.removed.length) msg.fr = this.removed;
    this.broadcast(msg);
    this.added = [];
    this.removed = [];
    // empty for a while: closed
    if (!this.humans.length) {
      if (!this.emptySince) this.emptySince = Date.now();
      else if (Date.now() - this.emptySince > 15_000) this.shut();
    }
    // a bot dead for a while comes back
    if (this.step % 15 === 0) {
      for (const s of this.snakes.values()) {
        if (s.bot && !s.alive && Math.random() < 0.3) this.respawn(s);
      }
    }
  }

  private kill(s: Snake, by: Snake | null, tell = true) {
    s.alive = false;
    s.boost = false;
    // the body falls apart into embers, worth most of what it was
    const total = s.len * 0.75;
    const n = Math.min(s.pts.length, Math.max(4, Math.round(total / 2)));
    for (let i = 0; i < n; i++) {
      const p = s.pts[Math.floor((i / n) * s.pts.length)];
      this.addFood([p[0] + (Math.random() - 0.5) * 14, p[1] + (Math.random() - 0.5) * 14], Math.max(1, Math.round(total / n)));
    }
    // (a head-on: the one that died first in the step gets no kill; its own death and score had already gone out
    // without it, and the game counted a kill for a dead player; 9 October)
    if (by && by !== s && by.alive) by.kills++;
    if (!tell) return;
    this.broadcast({ t: "die", id: s.id, by: by ? by.id : 0, len: Math.round(s.best), kills: s.kills });
    if (!s.bot && s.seat) {
      void recordScore(s.seat.uid, "wormzer", this.mode, "", Math.round(s.best), s.kills).catch((e) => logger.warn(`Arcade: ${e}`));
    }
  }

  /** A bot: goes for embers near it, swerves from bodies and the edge, burrows now and then. */
  private think(s: Snake) {
    const r = this.radius(s);
    // what is in the way: feel ahead along a few headings, pick the clearest nearest the wanted one
    if (this.step >= s.thinkAt || !s.target || !this.food.has(s.target.id)) {
      s.thinkAt = this.step + 5 + Math.floor(Math.random() * 4);
      let best: Food | null = null;
      let bestScore = -1e9;
      for (const f of this.food.values()) {
        const dx = f.x - s.x;
        const dy = f.y - s.y;
        if (Math.abs(dx) > 500 || Math.abs(dy) > 500) continue;
        const dist = Math.hypot(dx, dy);
        const ahead = Math.cos(Math.atan2(dy, dx) - s.a);
        const sc = f.v * 40 - dist + ahead * 120;
        if (sc > bestScore) {
          bestScore = sc;
          best = f;
        }
      }
      s.target = best;
    }
    let goal = s.target ? Math.atan2(s.target.y - s.y, s.target.x - s.x) : Math.atan2(-s.y, -s.x);
    if (Math.hypot(s.x, s.y) > ARENA - 220) goal = Math.atan2(-s.y, -s.x);
    const danger = (a: number) => {
      let d = 0;
      for (const dist of [24, 48, 80, 120]) {
        const x = s.x + Math.cos(a) * dist;
        const y = s.y + Math.sin(a) * dist;
        if (Math.hypot(x, y) > ARENA - 30) d += 200 / dist;
        if (this.hit(x, y, r + 6, s.id)) d += 400 / dist;
      }
      return d;
    };
    let pick = goal;
    if (danger(s.a) > 0 || danger(goal) > 0) {
      let bestCost = 1e9;
      for (let k = -6; k <= 6; k++) {
        const a = s.a + (k * Math.PI) / 8;
        let off = a - goal;
        off = wrapAngle(off);
        const cost = danger(a) * 10 + Math.abs(off);
        if (cost < bestCost) {
          bestCost = cost;
          pick = a;
        }
      }
    }
    s.want = pick;
    s.boost = s.len > 30 && s.target !== null && s.target.v >= 3 && Math.random() < 0.05 ? true : s.boost && Math.random() < 0.85;
  }

  private shut() {
    clearInterval(this.timer);
    logger.info(`Arcade: Wormzer ${this.mode} arena ${this.id} closed`);
    this.close();
    onWormzerClosed(this);
  }
}

let onWormzerClosed: (room: WormzerRoom) => void = () => {};
export const whenWormzerCloses = (fn: (room: WormzerRoom) => void) => {
  onWormzerClosed = fn;
};
