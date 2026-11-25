import { type Body, ArenaRoom, DT } from "./arena.js";

/**
 * Inferno-only: Ember Hockey (the Devil's Arcade, 7 October, the user's pick), on the arena (arena.ts). A rink
 * with a goal at each end and a fireball for a puck. Skate into it to push it; the action key shoots it hard when
 * it is at your feet (and lunges when it isn't). Red defends the left goal, Blue the right. First to 5 goals wins,
 * or the most after three minutes; level then, the next goal wins (a draw after a minute more).
 * Solo: the player against a bot; 1 v 1: two players (a bot after a while); 2 v 2: teams of two, bots filling in.
 */
const X0 = 30;
const Y0 = 50;
const X1 = 690;
const Y1 = 402;
const MID_Y = (Y0 + Y1) / 2;
const GOAL = 124;
const PUCK_R = 11;
const SHOT = 640;
const SHOT_COOL = 0.45;
const MAX_PUCK = 820;
const TO_WIN = 5;
const TIME = 180;
const EXTRA = 60;
const PAUSE = 2;

const BOTS = ["Puckface", "Slapshot Spurtz", "Ice Imp", "Cinderstick", "Brimstone Blocker", "Goalgrim"];

export class HockeyRoom extends ArenaRoom {
  private px = 360;
  private py = MID_Y;
  private pvx = 0;
  private pvy = 0;
  private goals = [0, 0];
  /** Who touched the fireball last (the goal is theirs). */
  private toucher = -1;
  /** A goal scored: the play stops this long, then a face-off. */
  private pause = 0;

  constructor(mode: string) {
    super("hockey", mode, {
      seats: mode === "team" ? 4 : 2,
      teamSize: mode === "team" ? 2 : 1,
      speed: 175,
      radius: 17,
      dashSpeed: 360,
      dashTime: 0.16,
      dashCool: 1.2,
      bounds: [X0, Y0, X1, Y1],
      botNames: BOTS,
    });
  }

  get minHumans() {
    return 2;
  }

  protected setup() {
    this.faceOff();
  }

  private faceOff() {
    const per = [0, 0];
    const n = this.bodies.length;
    for (const b of this.bodies) {
      const k = per[b.team]++;
      const rows = n / 2;
      b.x = b.team === 0 ? 200 - (k % 2) * 40 : 520 + (k % 2) * 40;
      b.y = rows <= 1 ? MID_Y : MID_Y + (k === 0 ? -70 : 70);
      b.vx = b.vy = b.kx = b.ky = 0;
      b.face = b.team === 0 ? 0 : 180;
      b.dash = 0;
    }
    this.px = 360;
    this.py = MID_Y;
    this.pvx = this.pvy = 0;
    this.toucher = -1;
  }

  protected arenaInfo() {
    return { rink: [X0, Y0, X1, Y1], goal: GOAL, puck: PUCK_R, toWin: TO_WIN, time: TIME };
  }

  onMessage(conn: Parameters<ArenaRoom["onMessage"]>[0], msg: Record<string, unknown>) {
    if (this.pause > 0 && msg.t === "in") {
      // (during the pause after a goal the keys are kept, not the moves)
      delete msg.x;
      delete msg.y;
    }
    super.onMessage(conn, msg);
  }

  /**
   * The game's word on where its player is (arena.ts) is not taken when it would put the monster on the fireball
   * (7 October, the user's "the ball gets glitchy and jumps around too fast and goes through you": a jump onto it
   * threw it out the far side at once, or through the monster).
   */
  protected hint(b: Body, hx: number, hy: number) {
    if (Math.hypot(hx - this.px, hy - this.py) < b.r + PUCK_R + 6) return;
    super.hint(b, hx, hy);
  }

  /** Nobody skates in the pause after a goal (they skated on at the keys' speed, then were put back; 9 October). */
  protected move(b: Body) {
    if (this.pause > 0) return;
    super.move(b);
  }

  /** The action: a shot if the fireball is at its feet, a lunge if not. */
  private act(b: Body) {
    b.act = false;
    const dx = this.px - b.x;
    const dy = this.py - b.y;
    const d = Math.hypot(dx, dy);
    if (d < b.r + PUCK_R + 16 && b.cool <= 0) {
      const ux = dx / Math.max(1, d);
      const uy = dy / Math.max(1, d);
      this.pvx = ux * SHOT + b.vx * 0.3;
      this.pvy = uy * SHOT + b.vy * 0.3;
      b.cool = SHOT_COOL;
      this.toucher = b.i;
      this.events.push({ e: "shot", i: b.i });
      return;
    }
    this.startDash(b);
  }

  protected update() {
    if (this.pause > 0) {
      this.pause -= DT;
      for (const b of this.bodies) {
        b.vx = b.vy = 0;
        b.act = false;
      }
      if (this.pause <= 0) {
        this.faceOff();
        this.events.push({ e: "faceoff" });
      }
      return;
    }
    for (const b of this.bodies) if (b.alive && b.act) this.act(b);
    this.separate();
    // the fireball: pushed by whoever skates into it, sliding, bouncing off the boards (in eight small steps, so
    // even a hard shot moves no more than a few pixels at a time and can't pass through a monster)
    const SUB = 8;
    for (let sub = 0; sub < SUB; sub++) {
      this.px += (this.pvx * DT) / SUB;
      this.py += (this.pvy * DT) / SUB;
      for (const b of this.bodies) {
        const dx = this.px - b.x;
        const dy = this.py - b.y;
        const d = Math.hypot(dx, dy);
        const min = b.r + PUCK_R;
        if (d < min) {
          const nx = d > 0.01 ? dx / d : 1;
          const ny = d > 0.01 ? dy / d : 0;
          this.px = b.x + nx * min;
          this.py = b.y + ny * min;
          const bvx = b.vx + b.kx;
          const bvy = b.vy + b.ky;
          const rvx = this.pvx - bvx;
          const rvy = this.pvy - bvy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            // (a bounce that keeps half its speed off the monster: it was 1.85, which added speed each touch and,
            // the fireball caught between a monster and the boards, sent it flying about)
            this.pvx = bvx + rvx - 1.5 * vn * nx;
            this.pvy = bvy + rvy - 1.5 * vn * ny;
          }
          // (a skater moving into it carries it on a little ahead)
          const along = bvx * nx + bvy * ny;
          if (along > 0) {
            const want = along * 1.15;
            const now = this.pvx * nx + this.pvy * ny;
            if (now < want) {
              this.pvx += (want - now) * nx;
              this.pvy += (want - now) * ny;
            }
          }
          this.toucher = b.i;
        }
      }
      // the boards (the goal mouths open)
      const inMouth = Math.abs(this.py - MID_Y) < GOAL / 2 - PUCK_R * 0.3;
      if (this.px < X0 + PUCK_R && !inMouth) {
        this.px = X0 + PUCK_R;
        this.pvx = Math.abs(this.pvx) * 0.85;
      }
      if (this.px > X1 - PUCK_R && !inMouth) {
        this.px = X1 - PUCK_R;
        this.pvx = -Math.abs(this.pvx) * 0.85;
      }
      if (this.py < Y0 + PUCK_R) {
        this.py = Y0 + PUCK_R;
        this.pvy = Math.abs(this.pvy) * 0.85;
      }
      if (this.py > Y1 - PUCK_R) {
        this.py = Y1 - PUCK_R;
        this.pvy = -Math.abs(this.pvy) * 0.85;
      }
      // caught between a monster and the boards: the fireball stays at the boards, the monster is held off it
      // and the fireball loses its speed into them (it was pushed through one or the other, back and forth)
      for (const b of this.bodies) {
        const dx = this.px - b.x;
        const dy = this.py - b.y;
        const d = Math.hypot(dx, dy);
        const min = b.r + PUCK_R;
        if (d < min - 0.5) {
          const nx = d > 0.01 ? dx / d : 1;
          const ny = d > 0.01 ? dy / d : 0;
          b.x = this.px - nx * min;
          b.y = this.py - ny * min;
          const vn = this.pvx * nx + this.pvy * ny;
          if (vn < 0) {
            this.pvx -= vn * nx;
            this.pvy -= vn * ny;
          }
        }
      }
      if (this.px < X0 - PUCK_R) {
        this.goal(1);
        return;
      }
      if (this.px > X1 + PUCK_R) {
        this.goal(0);
        return;
      }
    }
    const f = Math.pow(0.6, DT);
    this.pvx *= f;
    this.pvy *= f;
    const s = Math.hypot(this.pvx, this.pvy);
    if (s > MAX_PUCK) {
      this.pvx *= MAX_PUCK / s;
      this.pvy *= MAX_PUCK / s;
    }
  }

  private goal(team: number) {
    this.goals[team]++;
    const by = this.toucher >= 0 && this.bodies[this.toucher].team === team ? this.toucher : -1;
    if (by >= 0) this.bodies[by].score++;
    this.events.push({ e: "goal", team, by, goals: this.goals.slice() });
    this.pause = PAUSE;
    this.pvx = this.pvy = 0;
  }

  protected flags(b: Body) {
    return (b.dash > 0 ? 1 : 0) | (b.cool > 0 && b.dash <= 0 ? 4 : 0);
  }

  protected extra() {
    const left = this.t < 0 ? TIME : this.t < TIME ? Math.ceil(TIME - this.t) : -1;
    return { pk: [Math.round(this.px * 10), Math.round(this.py * 10)], sc: this.goals, cl: left };
  }

  protected decided() {
    if (this.pause > 0) {
      if (this.goals[0] >= TO_WIN || this.goals[1] >= TO_WIN) return { winner: this.goals[0] > this.goals[1] ? 0 : 1, reason: "goals" };
      if (this.t >= TIME && this.goals[0] !== this.goals[1]) return { winner: this.goals[0] > this.goals[1] ? 0 : 1, reason: "time" };
      return null;
    }
    if (this.t >= TIME && this.goals[0] !== this.goals[1]) return { winner: this.goals[0] > this.goals[1] ? 0 : 1, reason: "time" };
    if (this.t >= TIME + EXTRA) return { winner: -1, reason: "draw" };
    return null;
  }

  protected stats() {
    return { goals: this.goals, scorers: this.bodies.map((b) => b.score) };
  }

  /** A player who leaves: a bot plays on in their place (and leaving loses, arena.ts). */
  protected left(b: Body) {
    super.left(b);
  }

  // ---- bots: the one nearer the fireball goes for it (from behind, towards the other goal); the other guards

  protected think(b: Body) {
    b.thinkAt = this.t + 0.08 + Math.random() * 0.1;
    if (this.pause > 0) {
      b.ix = b.iy = 0;
      return;
    }
    const ownX = b.team === 0 ? X0 : X1;
    const foeX = b.team === 0 ? X1 : X0;
    const mates = this.bodies.filter((o) => o.team === b.team);
    const chaser = mates.reduce((best, o) => (Math.hypot(o.x - this.px, o.y - this.py) < Math.hypot(best.x - this.px, best.y - this.py) ? o : best), mates[0]);
    const danger = Math.abs(this.px - ownX) < 170;
    if (b !== chaser && !danger) {
      // guard: between the fireball and the goal, out in front of it
      const gx = ownX + (this.px - ownX) * 0.28;
      const gy = MID_Y + (this.py - MID_Y) * 0.45;
      this.seek(b, gx, gy, 8);
      return;
    }
    // where to strike from: behind the fireball, on the line from the other goal through it
    const aimY = MID_Y + (Math.random() - 0.5) * GOAL * 0.6;
    const gdx = this.px - foeX;
    const gdy = this.py - aimY;
    const gd = Math.max(1, Math.hypot(gdx, gdy));
    const sx = this.px + (gdx / gd) * (b.r + PUCK_R + 8);
    const sy = this.py + (gdy / gd) * (b.r + PUCK_R + 8);
    // lead it a little if it is moving
    const lead = 0.15;
    const tx = sx + this.pvx * lead;
    const ty = sy + this.pvy * lead;
    const behind = (b.x - this.px) * (foeX - this.px) < 0 || Math.abs(b.x - this.px) < 6;
    const dPuck = Math.hypot(this.px - b.x, this.py - b.y);
    if (!behind) {
      // on the wrong side: round the fireball, not through it
      const side = b.y < this.py ? -1 : 1;
      this.seek(b, this.px + (b.team === 0 ? -1 : 1) * 40, this.py + side * 46);
      return;
    }
    if (Math.hypot(tx - b.x, ty - b.y) > 14 && dPuck > b.r + PUCK_R + 10) {
      this.seek(b, tx, ty, 0);
      return;
    }
    // lined up: drive through it, and shoot when it is close
    const ux = (foeX - this.px) / Math.max(1, Math.hypot(foeX - this.px, aimY - this.py));
    const uy = (aimY - this.py) / Math.max(1, Math.hypot(foeX - this.px, aimY - this.py));
    b.ix = ux;
    b.iy = uy;
    if (dPuck < b.r + PUCK_R + 14 && b.cool <= 0 && Math.random() < (Math.abs(this.px - foeX) < 330 ? 0.75 : 0.25)) {
      this.act(b);
    }
  }
}
