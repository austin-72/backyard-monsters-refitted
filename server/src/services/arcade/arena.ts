import { questArcadeWin } from "../quests/questHooks.js";
import { arcadeConfig } from "../../config/ArcadeConfig.js";
import { logger } from "../../utils/logger.js";
import { type Conn, Room, type Seat, everyStep, send } from "./room.js";
import { recordMatch } from "./scores.js";

/**
 * Inferno-only: the Devil's Arcade's arena games (7 October, later: the user's picks), run here like Fusebug Blast
 * (20 steps a second) and drawn by the games (com/monsters/arcade/games/ArenaGame and its games):
 *
 *  - Lava Floor (lavafloor.ts): the floor crumbles where anyone steps; shove the others into the lava.
 *  - Bone Brawl (bonebrawl.ts): throw bones; three hits and you're out; the lava closes in.
 *  - Ember Hockey (hockey.ts): a fireball, two goals; 1 v 1 or 2 v 2.
 *  - Soul Snatch (soulsnatch.ts): capture the flag, two teams.
 *
 * What they share is here: the lobby (a live match starts `arenaLobbySeconds` after the second player comes, or
 * at once when it is full; alone, the player may start with bots after a while), the seats (bots fill the empty
 * ones), monsters moving round an arena (a body each: a circle with a speed, pushed apart from the others,
 * knocked back, dashing), the players' keys, the state sent every step (numbered, so the games draw on the
 * server's clock), the end and the record.
 *
 * Messages, game -> server: {t: "in", mx, my (the keys' way, -1 to 1 each), a (the action key pressed: 1), x, y
 * (where the game has its own monster: it is put there if close, as in Fusebug Blast), ax, ay (an aim, Bone
 * Brawl)}. Server -> game: {t: "lobby"}, {t: "start", ..., arena}, {t: "f", k, tm, p: [[x, y, face, flags], ...],
 * ...} every step, the games' own events, {t: "end", winner, team, reason, stats}.
 */
export const STEP_MS = 50;
export const DT = STEP_MS / 1000;
export const COUNTDOWN_MS = 3500;

export interface Body {
  seat: Seat;
  /** The step (room time) of the last position hint taken: one a step. */
  hintAt?: number;
  /** How far hints may still move it (px; it comes back with time). */
  hintLeft?: number;
  i: number;
  team: number;
  x: number;
  y: number;
  /** Its own speed (from the keys), and a push on top (knocked back) that dies away. */
  vx: number;
  vy: number;
  kx: number;
  ky: number;
  face: number;
  alive: boolean;
  r: number;
  speed: number;
  /** The keys: the way it is going (-1 to 1 each), and the action key's press waiting to be used. */
  ix: number;
  iy: number;
  act: boolean;
  ax: number;
  ay: number;
  /** A dash: time left, and its way. */
  dash: number;
  dx: number;
  dy: number;
  cool: number;
  diedAt: number;
  score: number;
  /** The game's own things about it. */
  g: Record<string, number>;
  /** A bot's: when it thinks next, and what it is after. */
  thinkAt: number;
  tx: number;
  ty: number;
}

export interface ArenaOptions {
  seats: number;
  /** Players in a team (0: everyone for themselves). */
  teamSize: number;
  speed: number;
  radius: number;
  /** A dash (the action key) in the games that have one: its speed, how long, and the wait after. */
  dashSpeed: number;
  dashTime: number;
  dashCool: number;
  /** The arena's bounds the monsters keep inside. */
  bounds: [number, number, number, number];
  botNames: string[];
}

export abstract class ArenaRoom extends Room {
  protected bodies: Body[] = [];
  protected timer: ReturnType<typeof setInterval> | null = null;
  /** Seconds since the start (below 0 during the countdown). */
  protected t = -COUNTDOWN_MS / 1000;
  protected step = 0;
  protected ended = false;
  started = false;
  /** A live lobby: when the match starts by itself. */
  startsAt = 0;
  readonly lobbyAt = Date.now();
  /** Events this step, sent with the state. */
  protected events: unknown[] = [];

  constructor(
    game: string,
    mode: string,
    readonly opt: ArenaOptions,
  ) {
    super(game, mode);
  }

  /** How many humans a live match needs before it counts down by itself. */
  get minHumans() {
    return 2;
  }

  canJoin(_conn: Conn) {
    return !this.started && !this.closed && this.humans.length < this.opt.seats;
  }

  join(conn: Conn) {
    this.seats.push({ conn, uid: conn.uid, name: conn.name, bot: false, gone: false });
    conn.room = this;
    conn.queue = null;
    this.lobby();
  }

  /** Waiting players are told who is here, when it starts, and (alone a while) that they may start with bots. */
  lobby() {
    const alone = this.humans.length < this.minHumans;
    this.broadcast({
      t: "lobby",
      room: this.id,
      players: this.humans.map((s) => s.name),
      startsIn: this.startsAt ? Math.max(0, this.startsAt - Date.now()) : -1,
      need: alone ? this.minHumans - this.humans.length : 0,
      bot: alone && Date.now() - this.lobbyAt >= arcadeConfig.botAfterSeconds * 1000,
    });
  }

  /** The player waiting asked to start now (bots in the empty seats). */
  startNow() {
    if (!this.started && this.humans.length) this.begin();
  }

  /** The team of the n-th seat (teams alternate, so the humans who came first are split). */
  protected teamOf(n: number) {
    return this.opt.teamSize ? n % 2 : n;
  }

  /** The match begins: bots in the empty seats, the arena made, everyone told. */
  begin() {
    if (this.started) return;
    this.started = true;
    this.seats = this.seats.filter((s) => !s.gone);
    const used = new Set(this.seats.map((s) => s.name));
    let b = 0;
    while (this.seats.length < this.opt.seats) {
      const name = this.opt.botNames.find((n) => !used.has(n)) ?? `Bot ${++b}`;
      used.add(name);
      this.seats.push({ conn: null, uid: -1, name, bot: true, gone: false });
    }
    this.bodies = this.seats.map((seat, i) => ({
      seat,
      i,
      team: this.teamOf(i),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      kx: 0,
      ky: 0,
      face: 0,
      alive: true,
      r: this.opt.radius,
      speed: this.opt.speed,
      ix: 0,
      iy: 0,
      act: false,
      ax: 0,
      ay: 0,
      dash: 0,
      dx: 0,
      dy: 0,
      cool: 0,
      diedAt: 0,
      score: 0,
      g: {},
      thinkAt: 0,
      tx: 0,
      ty: 0,
    }));
    this.setup();
    const players = this.bodies.map((b) => ({ uid: b.seat.uid, name: b.seat.name, bot: b.seat.bot, team: b.team }));
    const common = {
      t: "start",
      room: this.id,
      game: this.game,
      mode: this.mode,
      players,
      cd: COUNTDOWN_MS,
      step: STEP_MS,
      speed: this.opt.speed,
      radius: this.opt.radius,
      dash: [this.opt.dashSpeed, this.opt.dashTime, this.opt.dashCool],
      bounds: this.opt.bounds,
      teams: this.opt.teamSize > 0,
      p: this.bodies.map((b) => [Math.round(b.x * 10), Math.round(b.y * 10)]),
      arena: this.arenaInfo(),
    };
    this.seats.forEach((s, i) => {
      if (!s.bot) send(s.conn, { ...common, you: i });
    });
    this.timer = everyStep(STEP_MS, () => this.tick());
    logger.info(`Arcade: ${this.game} ${this.mode} room ${this.id}: ${players.map((p) => p.name).join(", ")}`);
  }

  /** The arena made and the monsters placed (each game's). */
  protected abstract setup(): void;

  /** What the games need to draw the arena (sent once, with the start). */
  protected abstract arenaInfo(): Record<string, unknown>;

  /** A step of the game's own rules (after the monsters moved). */
  protected abstract update(): void;

  /** A bot decides what to do (its keys: ix, iy, act, ax, ay). */
  protected abstract think(b: Body): void;

  /** What else goes into each step's state. */
  protected extra(): Record<string, unknown> {
    return {};
  }

  /** Each monster's flags in the state (dashing 1, the game's own above). */
  protected flags(b: Body): number {
    return b.dash > 0 ? 1 : 0;
  }

  /** Is it over? The winner (a seat, or a team in team games; -1 a draw, -2 the bots) and why; null if not. */
  protected abstract decided(): { winner: number; reason: string } | null;

  onMessage(conn: Conn, msg: Record<string, unknown>) {
    const b = this.bodies.find((k) => k.seat.conn === conn && !k.seat.gone);
    if (!b || this.ended || msg.t !== "in") return;
    const mx = Number(msg.mx);
    const my = Number(msg.my);
    if (Number.isFinite(mx) && Number.isFinite(my)) {
      const len = Math.hypot(mx, my);
      b.ix = len > 1 ? mx / len : mx;
      b.iy = len > 1 ? my / len : my;
    }
    if (msg.a) b.act = true;
    const ax = Number(msg.ax);
    const ay = Number(msg.ay);
    if (Number.isFinite(ax) && Number.isFinite(ay)) {
      b.ax = ax;
      b.ay = ay;
    }
    const hx = Number(msg.x);
    const hy = Number(msg.y);
    if (Number.isFinite(hx) && Number.isFinite(hy)) this.hint(b, hx, hy);
  }

  /**
   * The game moves its player's monster at once and says where it is when a key changes: it is put there if that
   * is close, and it isn't being knocked about (the server's push wins then).
   */
  protected hint(b: Body, hx: number, hy: number) {
    if (!b.alive || Math.hypot(b.kx, b.ky) > 30 || Math.hypot(hx - b.x, hy - b.y) > 26) return;
    // (once a step: hints sent many times a step each moved it up to 26 further, a speed hack; and not in the
    // countdown, when nothing moves; 9 October)
    if (b.hintAt === this.t || this.t < 0) return;
    // (and no more than a lag's worth: up to 26, coming back at half its speed; a hint sent every step, each 25
    // ahead, had it run four times as fast; 9 October)
    const left = Math.min(26, (b.hintLeft ?? 26) + b.speed * 0.5 * Math.max(0, this.t - (b.hintAt ?? -10)));
    b.hintAt = this.t;
    b.hintLeft = left;
    const far = Math.hypot(hx - b.x, hy - b.y);
    if (far > left) return;
    const [x0, y0, x1, y1] = this.opt.bounds;
    if (hx < x0 + b.r || hy < y0 + b.r || hx > x1 - b.r || hy > y1 - b.r) return;
    if (this.blocked(hx, hy, b.r)) return;
    b.x = hx;
    b.y = hy;
    b.hintLeft = left - far;
  }

  /** Is a circle there inside something solid (the games with rocks say)? */
  protected blocked(_x: number, _y: number, _r: number): boolean {
    return false;
  }

  /** Solid circles the monsters can't walk through: [x, y, r]. */
  protected rocks(): number[][] {
    return [];
  }

  onLeave(conn: Conn) {
    const seat = this.seatOf(conn);
    if (!seat) return;
    seat.gone = true;
    if (conn.room === this) conn.room = null;
    if (!this.started) {
      this.seats = this.seats.filter((s) => s !== seat);
      if (!this.humans.length) this.shut();
      else {
        if (this.humans.length < this.minHumans) this.startsAt = 0;
        this.lobby();
      }
      return;
    }
    const b = this.bodies.find((k) => k.seat === seat);
    if (b && !this.ended) this.left(b);
    if (!this.humans.length) {
      this.finish(-1, "left");
      return;
    }
    // (teams: a team all of whose players have left forfeits, though bots play on in their places)
    if (this.opt.teamSize && !this.ended) {
      const playing = (t: number) => this.bodies.some((o) => o.team === t && !o.seat.gone && !o.seat.bot);
      const had = (t: number) => this.bodies.some((o) => o.team === t && o.seat.uid >= 0);
      for (const t of [0, 1]) {
        if (had(t) && !playing(t) && playing(1 - t)) {
          this.finish(1 - t, "left");
          return;
        }
      }
    }
  }

  /** A player left during the match: out (everyone for themselves); a bot plays on in their place (teams). */
  protected left(b: Body) {
    if (this.opt.teamSize) {
      b.seat.bot = true;
      b.seat.name = `${b.seat.name} (bot)`;
      this.events.push({ e: "bot", i: b.i });
      return;
    }
    if (b.alive) this.kill(b, -1, "left");
  }

  /** A monster is out. */
  protected kill(b: Body, by: number, how: string) {
    if (!b.alive) return;
    b.alive = false;
    b.diedAt = this.t;
    b.ix = b.iy = 0;
    if (by >= 0 && by !== b.i) this.bodies[by].score++;
    this.events.push({ e: "out", i: b.i, by, how });
  }

  /** Moves a monster: its keys' speed (quick to answer), its dash, the push dying away; kept in the bounds. */
  protected move(b: Body) {
    if (!b.alive) return;
    if (b.cool > 0) b.cool -= DT;
    let sp = b.speed * (b.g.slow ? b.g.slow : 1);
    if (b.dash > 0) {
      b.dash -= DT;
      b.vx = b.dx * this.opt.dashSpeed;
      b.vy = b.dy * this.opt.dashSpeed;
      sp = 0;
    } else {
      const k = Math.min(1, DT * 14);
      b.vx += (b.ix * sp - b.vx) * k;
      b.vy += (b.iy * sp - b.vy) * k;
    }
    b.x += (b.vx + b.kx) * DT;
    b.y += (b.vy + b.ky) * DT;
    const fade = Math.pow(0.02, DT);
    b.kx *= fade;
    b.ky *= fade;
    if (Math.abs(b.kx) < 4) b.kx = 0;
    if (Math.abs(b.ky) < 4) b.ky = 0;
    if (Math.hypot(b.vx, b.vy) > 8) b.face = Math.round((Math.atan2(b.vy, b.vx) * 180) / Math.PI);
    if (this.keepIn(b)) {
      const [x0, y0, x1, y1] = this.opt.bounds;
      b.x = Math.max(x0 + b.r, Math.min(x1 - b.r, b.x));
      b.y = Math.max(y0 + b.r, Math.min(y1 - b.r, b.y));
    }
    for (const [rx, ry, rr] of this.rocks()) {
      const dx = b.x - rx;
      const dy = b.y - ry;
      const d = Math.hypot(dx, dy);
      const min = rr + b.r;
      if (d < min && d > 0.01) {
        b.x = rx + (dx / d) * min;
        b.y = ry + (dy / d) * min;
      }
    }
  }

  /** Are the monsters held inside the bounds (Lava Floor lets them go over the edge)? */
  protected keepIn(_b: Body) {
    return true;
  }

  /** Starts a dash the way the monster goes (or faces). */
  protected startDash(b: Body) {
    if (b.cool > 0 || b.dash > 0 || !b.alive) return false;
    let dx = b.ix;
    let dy = b.iy;
    if (Math.hypot(dx, dy) < 0.1) {
      dx = Math.cos((b.face * Math.PI) / 180);
      dy = Math.sin((b.face * Math.PI) / 180);
    }
    const d = Math.hypot(dx, dy);
    b.dx = dx / d;
    b.dy = dy / d;
    b.dash = this.opt.dashTime;
    b.cool = this.opt.dashCool;
    return true;
  }

  /** Monsters pushed apart (they can't stand in one another); returns the pairs that touched. */
  protected separate(): [Body, Body][] {
    const touched: [Body, Body][] = [];
    const live = this.bodies.filter((b) => b.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const c = live[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + c.r;
        if (d < min) {
          const nx = d > 0.01 ? dx / d : 1;
          const ny = d > 0.01 ? dy / d : 0;
          const push = (min - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          c.x += nx * push;
          c.y += ny * push;
          touched.push([a, c]);
        }
      }
    }
    return touched;
  }

  private tick() {
    if (this.ended) return;
    this.step++;
    this.t += DT;
    if (this.t >= 0) {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        if (b.seat.bot && this.t >= b.thinkAt) this.think(b);
        this.move(b);
      }
      this.update();
    }
    const msg: Record<string, unknown> = {
      t: "f",
      k: this.step,
      tm: Math.round(this.t * 10),
      p: this.bodies.map((b) => [Math.round(b.x * 10), Math.round(b.y * 10), b.face, (b.alive ? 2 : 0) | this.flags(b)]),
      ...this.extra(),
    };
    if (this.events.length) msg.e = this.events;
    this.broadcast(msg);
    this.events = [];
    if (this.t >= 0) {
      const d = this.decided();
      if (d) this.finish(d.winner, d.reason);
    }
  }

  /** The stats sent with the end (each game's: goals, kills...). */
  protected stats(): unknown {
    return this.bodies.map((b) => b.score);
  }

  /** The match is over: everyone told, the players' wins and losses recorded. */
  protected finish(winner: number, reason: string) {
    if (this.ended) return;
    this.ended = true;
    if (this.timer) clearInterval(this.timer);
    const teams = Boolean(this.opt.teamSize);
    // (each body's result. A draw in a free-for-all is the last ones falling together: only they drew, those out
    // before lost; it was a draw for everyone still in the room, 9 October)
    const results = this.bodies.map((b) => {
      const mine = teams ? b.team : b.i;
      // (winner -1: a draw; -2: none of the players won, the bots did)
      if (b.seat.gone) return "loss";
      if (winner === mine) return "win";
      if (winner === -1) return teams || b.alive || b.diedAt >= this.t - DT * 1.5 ? "draw" : "loss";
      return "loss";
    });
    this.broadcast({ t: "end", winner, teams, reason, stats: this.stats(), tm: Math.round(this.t * 10), results });
    const humans = this.bodies.filter((b) => b.seat.uid >= 0).length;
    for (const b of this.bodies) {
      // (the players, those who left too: leaving loses; a bot took a leaver's place in a team game)
      if (b.seat.uid < 0) continue;
      const result = results[this.bodies.indexOf(b)];
      if (result === "win") questArcadeWin(b.seat.uid, humans >= 2);
      void recordMatch(b.seat.uid, this.game, this.mode, result, b.score).catch((e) => logger.warn(`Arcade: ${e}`));
    }
    logger.info(`Arcade: ${this.game} room ${this.id} ended (${reason}): ${winner}`);
    this.close();
  }

  protected shut() {
    if (this.timer) clearInterval(this.timer);
    this.close();
  }

  // ---- for the bots

  /** Steers a bot towards a point (stopping when there). */
  protected seek(b: Body, x: number, y: number, slowWithin = 6) {
    const dx = x - b.x;
    const dy = y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < slowWithin) {
      b.ix = b.iy = 0;
      return;
    }
    b.ix = dx / d;
    b.iy = dy / d;
  }

  protected nearest(b: Body, list: Body[]): Body | null {
    let best: Body | null = null;
    let bd = 1e9;
    for (const o of list) {
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (o !== b && d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }
}
