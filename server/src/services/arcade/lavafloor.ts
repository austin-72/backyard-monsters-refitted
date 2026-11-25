import { type Body, ArenaRoom, DT } from "./arena.js";

/**
 * Inferno-only: Lava Floor (the Devil's Arcade, 7 October, the user's pick), on the arena (arena.ts). A floor of
 * 24 x 14 basalt tiles over the lava (7 October, the user's: four times the tiles, each a quarter the size, the floor
 * as big as before; it was 12 x 7). From two seconds in, a tile anyone stands on cracks and falls 2 seconds later (it
 * was 0.95: "longer between when they crack and fully break"); after 15 seconds tiles crack by themselves too, faster
 * as it goes (four at a time as often as one did, so the floor goes as fast as it did). Off the floor (onto a fallen tile, or over the edge)
 * and you're out, unless you're in the middle of a shove (a short lunge, the action key: it carries you over one
 * gap). A shove that reaches another monster knocks it flying. The last one standing wins (a player out with
 * only bots left loses at once).
 */
const COLS = 24;
const ROWS = 14;
const T = 26;
const X0 = (720 - COLS * T) / 2;
const Y0 = (420 - ROWS * T) / 2;
const CRACK = 2;
/** Seconds after the start before the floor begins to crack under anyone. */
const GRACE = 2;
const SOLID = 0;
const CRACKING = 1;
const GONE = 2;

const BOTS = ["Scorchfoot", "Cinderhop", "Magmaw", "Ashstep", "Blisterpaw", "Smoulder"];

export class LavaFloorRoom extends ArenaRoom {
  private tiles: number[] = [];
  private timers: number[] = [];
  private changes: number[][] = [];
  private nextCrack = 15;
  /** Who last shoved each monster, and when (a fall soon after is theirs). */
  private shovedBy = new Map<number, [number, number]>();

  constructor(mode: string) {
    super("lavafloor", mode, {
      seats: 6,
      teamSize: 0,
      speed: 140,
      radius: 15,
      dashSpeed: 430,
      dashTime: 0.2,
      dashCool: 1.4,
      bounds: [X0 - 30, Y0 - 30, X0 + COLS * T + 30, Y0 + ROWS * T + 30],
      botNames: BOTS,
    });
  }

  protected setup() {
    this.tiles = new Array(COLS * ROWS).fill(SOLID);
    this.timers = new Array(COLS * ROWS).fill(0);
    const n = this.bodies.length;
    this.bodies.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2 + 0.3;
      b.x = 360 + Math.cos(a) * 190;
      b.y = 210 + Math.sin(a) * 105;
      b.face = Math.round(((a + Math.PI) * 180) / Math.PI) % 360;
    });
  }

  protected arenaInfo() {
    return { cols: COLS, rows: ROWS, tile: T, x0: X0, y0: Y0, crack: CRACK, grace: GRACE };
  }

  protected keepIn() {
    return false;
  }

  private tileAt(x: number, y: number) {
    const cx = Math.floor((x - X0) / T);
    const cy = Math.floor((y - Y0) / T);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
    return cy * COLS + cx;
  }

  private crack(i: number) {
    if (this.tiles[i] !== SOLID) return;
    this.tiles[i] = CRACKING;
    this.timers[i] = CRACK;
    this.changes.push([i, CRACKING]);
  }

  protected update() {
    // shoves: the action key lunges; a lunge that reaches another monster knocks it flying
    for (const b of this.bodies) {
      if (b.alive && b.act) {
        b.act = false;
        this.startDash(b);
      }
    }
    for (const [a, c] of this.separate()) {
      for (const [s, o] of [
        [a, c],
        [c, a],
      ]) {
        if (s.dash > 0 && o.dash <= 0) {
          o.kx += s.dx * 470;
          o.ky += s.dy * 470;
          s.dash = 0;
          this.shovedBy.set(o.i, [s.i, this.t]);
          this.events.push({ e: "shove", i: s.i, o: o.i });
        }
      }
    }
    // the floor: cracks where monsters stand, tiles falling
    for (const b of this.bodies) {
      if (!b.alive || this.t < GRACE) continue;
      const i = this.tileAt(b.x, b.y);
      if (i >= 0) this.crack(i);
    }
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] === CRACKING) {
        this.timers[i] -= DT;
        if (this.timers[i] <= 0) {
          this.tiles[i] = GONE;
          this.changes.push([i, GONE]);
        }
      }
    }
    if (this.t >= this.nextCrack) {
      this.nextCrack = this.t + Math.max(0.3, 1.3 - this.t / 90);
      const solid = this.tiles.map((v, i) => (v === SOLID ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < 4 && solid.length; k++) this.crack(solid.splice(Math.floor(Math.random() * solid.length), 1)[0]);
    }
    // off the floor: out (not while lunging over a gap)
    for (const b of this.bodies) {
      if (!b.alive || b.dash > 0) continue;
      const i = this.tileAt(b.x, b.y);
      if (i < 0 || this.tiles[i] === GONE) {
        const s = this.shovedBy.get(b.i);
        this.kill(b, s && this.t - s[1] < 2.5 ? s[0] : -1, "fell");
      }
    }
  }

  /**
   * A position the game says its monster is at: not across a hole (9 October). A hint up to 26 px away could put it
   * on the far side of a one-tile hole, never over the lava, so it never fell; a lunge (dashing) still crosses.
   */
  protected hint(b: Body, hx: number, hy: number) {
    if (b.dash <= 0) {
      for (let k = 1; k <= 4; k++) {
        const i = this.tileAt(b.x + ((hx - b.x) * k) / 4, b.y + ((hy - b.y) * k) / 4);
        if (i < 0 || this.tiles[i] === GONE) return;
      }
    }
    super.hint(b, hx, hy);
  }

  protected extra() {
    if (!this.changes.length) return {};
    const c = this.changes;
    this.changes = [];
    return { c };
  }

  protected decided() {
    const alive = this.bodies.filter((b) => b.alive);
    const players = alive.filter((b) => !b.seat.bot && !b.seat.gone);
    if (alive.length <= 1) return { winner: alive.length ? alive[0].i : -1, reason: alive.length ? "last" : "draw" };
    if (!players.length) return { winner: -2, reason: "fallen" };
    return null;
  }

  // ---- bots: keep moving over sound tiles, towards the middle of what is left; shove whoever is near an edge

  /** How good it is to stand there (sound floor good, cracking bad, a hole very bad). */
  private safety(x: number, y: number) {
    const i = this.tileAt(x, y);
    if (i < 0 || this.tiles[i] === GONE) return -6;
    if (this.tiles[i] === CRACKING) return -1 + this.timers[i] / CRACK;
    // sound: better with sound neighbours
    let n = 0;
    for (const [dx, dy] of [
      [T, 0],
      [-T, 0],
      [0, T],
      [0, -T],
    ]) {
      const j = this.tileAt(x + dx, y + dy);
      if (j >= 0 && this.tiles[j] === SOLID) n++;
    }
    return 2 + n * 0.3;
  }

  protected think(b: Body) {
    b.thinkAt = this.t + 0.1 + Math.random() * 0.1;
    // the middle of the floor left
    let cx = 0;
    let cy = 0;
    let n = 0;
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] === SOLID) {
        cx += X0 + (i % COLS) * T + T / 2;
        cy += Y0 + Math.floor(i / COLS) * T + T / 2;
        n++;
      }
    }
    if (n) {
      cx /= n;
      cy /= n;
    } else {
      cx = 360;
      cy = 210;
    }
    // a shove: someone near, the way to them on sound floor
    const foe = this.nearest(
      b,
      this.bodies.filter((o) => o.alive && o !== b),
    );
    if (foe && b.cool <= 0 && b.dash <= 0) {
      const d = Math.hypot(foe.x - b.x, foe.y - b.y);
      const ux = (foe.x - b.x) / Math.max(1, d);
      const uy = (foe.y - b.y) / Math.max(1, d);
      if (d < 78 && this.safety(b.x + ux * 60, b.y + uy * 60) > -2 && Math.random() < 0.55) {
        b.ix = ux;
        b.iy = uy;
        this.startDash(b);
        return;
      }
    }
    let best = -1e9;
    let bx = 0;
    let by = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      let sc = 0;
      sc += this.safety(b.x + ux * 24, b.y + uy * 24) * 1.4;
      sc += this.safety(b.x + ux * 50, b.y + uy * 50);
      sc += this.safety(b.x + ux * 80, b.y + uy * 80) * 0.6;
      sc -= Math.hypot(b.x + ux * 50 - cx, b.y + uy * 50 - cy) * 0.006;
      sc += (ux * b.ix + uy * b.iy) * 0.5;
      // a little towards a rival far from the edge (to shove), now and then
      if (foe) sc += ((foe.x - b.x) * ux + (foe.y - b.y) * uy) * 0.002 * (b.i % 2 ? 1 : 0.4);
      sc += Math.random() * 0.4;
      if (sc > best) {
        best = sc;
        bx = ux;
        by = uy;
      }
    }
    b.ix = bx;
    b.iy = by;
  }
}
