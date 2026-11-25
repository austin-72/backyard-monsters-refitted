import { type Body, ArenaRoom, DT } from "./arena.js";

/**
 * Inferno-only: Bone Brawl (the Devil's Arcade, 7 October, the user's pick), on the arena (arena.ts). Bones lie
 * about the arena; walk over them to pick them up (three at most) and throw them where the mouse points (the
 * action, with the aim). A bone hits the first monster it reaches (not through the rocks): one of its three
 * lives gone, and it is knocked back. Every 30 seconds the lava closes in from the edges; standing in it burns a
 * life a second. The last one standing wins (a player out with only bots left loses at once).
 */
const X0 = 20;
const Y0 = 34;
const X1 = 700;
const Y1 = 412;
const HP = 3;
const CARRY = 3;
const BONE_SPEED = 540;
const BONE_LIFE = 0.75;
const THROW_COOL = 0.35;
const SHRINK_EVERY = 30;
/** After the lava has closed in all it can: this long more, then a draw for those standing (it could go on for ever). */
const LAST_STAND = 60;
const SHRINK_BY = 34;
const MAX_ON_GROUND = 10;
const ROCKS = [
  [200, 140, 26],
  [520, 140, 26],
  [200, 306, 26],
  [520, 306, 26],
  [360, 223, 32],
];

const BOTS = ["Skullcrack", "Marrowmunch", "Bonejaw", "Ribsnap", "Gristle", "Knucklebone"];

interface Bone {
  id: number;
  x: number;
  y: number;
}

interface Flying extends Bone {
  vx: number;
  vy: number;
  owner: number;
  life: number;
}

export class BoneBrawlRoom extends ArenaRoom {
  private ground: Bone[] = [];
  private flying: Flying[] = [];
  private nextId = 1;
  private zone = [X0, Y0, X1, Y1];
  private shrinkAt = SHRINK_EVERY;
  /** When the lava closed in all it can (-1: not yet). */
  private closedAt = -1;
  private groundChanged = true;
  private zoneChanged = true;
  private spawnAt = 0;

  constructor(mode: string) {
    super("bonebrawl", mode, {
      seats: 6,
      teamSize: 0,
      speed: 150,
      radius: 15,
      dashSpeed: 0,
      dashTime: 0,
      dashCool: 0,
      bounds: [X0, Y0, X1, Y1],
      botNames: BOTS,
    });
  }

  protected rocks() {
    return ROCKS;
  }

  protected blocked(x: number, y: number, r: number) {
    return ROCKS.some(([rx, ry, rr]) => Math.hypot(x - rx, y - ry) < rr + r);
  }

  protected setup() {
    const n = this.bodies.length;
    this.bodies.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2;
      b.x = 360 + Math.cos(a) * 280;
      b.y = 223 + Math.sin(a) * 150;
      b.g.hp = HP;
      b.g.bones = 0;
      b.g.safe = 0;
      b.g.burn = 0;
    });
    for (let k = 0; k < 8; k++) this.spawnBone();
  }

  protected arenaInfo() {
    return { rocks: ROCKS, hp: HP, carry: CARRY, area: [X0, Y0, X1, Y1], shrinkEvery: SHRINK_EVERY };
  }

  private spawnBone() {
    const [zx0, zy0, zx1, zy1] = this.zone;
    for (let tries = 0; tries < 20; tries++) {
      const x = zx0 + 20 + Math.random() * Math.max(1, zx1 - zx0 - 40);
      const y = zy0 + 20 + Math.random() * Math.max(1, zy1 - zy0 - 40);
      if (this.blocked(x, y, 10)) continue;
      this.ground.push({ id: this.nextId++, x, y });
      this.groundChanged = true;
      return;
    }
  }

  private inZone(x: number, y: number) {
    return x > this.zone[0] && x < this.zone[2] && y > this.zone[1] && y < this.zone[3];
  }

  /** A bone thrown from b at its aim. */
  private throwBone(b: Body) {
    if (b.g.bones <= 0 || b.cool > 0) return;
    const dx = b.ax - b.x;
    const dy = b.ay - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    b.g.bones--;
    b.cool = THROW_COOL;
    b.face = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    this.flying.push({ id: this.nextId++, x: b.x + (dx / d) * (b.r + 4), y: b.y + (dy / d) * (b.r + 4), vx: (dx / d) * BONE_SPEED, vy: (dy / d) * BONE_SPEED, owner: b.i, life: BONE_LIFE });
    this.events.push({ e: "throw", i: b.i });
  }

  private hurt(b: Body, by: number, nx: number, ny: number) {
    if (!b.alive || b.g.safe > 0) return;
    b.g.hp--;
    b.g.safe = 1;
    b.kx += nx * 300;
    b.ky += ny * 300;
    this.events.push({ e: "hit", i: b.i, by });
    if (b.g.hp <= 0) this.kill(b, by, by >= 0 ? "bone" : "lava");
  }

  protected update() {
    for (const b of this.bodies) {
      if (!b.alive) continue;
      if (b.g.safe > 0) b.g.safe -= DT;
      if (b.act) {
        b.act = false;
        this.throwBone(b);
      }
      // bones picked up
      if (b.g.bones < CARRY) {
        for (const bone of this.ground) {
          if (Math.hypot(bone.x - b.x, bone.y - b.y) < b.r + 10) {
            this.ground.splice(this.ground.indexOf(bone), 1);
            b.g.bones++;
            this.groundChanged = true;
            break;
          }
        }
      }
      // the lava burns
      if (!this.inZone(b.x, b.y)) {
        b.g.burn += DT;
        if (b.g.burn >= 1) {
          b.g.burn = 0;
          const cx = (this.zone[0] + this.zone[2]) / 2 - b.x;
          const cy = (this.zone[1] + this.zone[3]) / 2 - b.y;
          const d = Math.max(1, Math.hypot(cx, cy));
          b.g.safe = 0;
          this.hurt(b, -1, cx / d * 0.5, cy / d * 0.5);
        }
      } else b.g.burn = Math.max(0, b.g.burn - DT);
    }
    this.separate();
    // bones in the air
    const still: Flying[] = [];
    for (const f of this.flying) {
      let gone = false;
      for (let sub = 0; sub < 3 && !gone; sub++) {
        f.x += (f.vx * DT) / 3;
        f.y += (f.vy * DT) / 3;
        if (ROCKS.some(([rx, ry, rr]) => Math.hypot(f.x - rx, f.y - ry) < rr + 4) || f.x < X0 || f.x > X1 || f.y < Y0 || f.y > Y1) {
          gone = true;
          this.drop(f, true);
          break;
        }
        for (const o of this.bodies) {
          if (!o.alive || o.i === f.owner) continue;
          if (Math.hypot(o.x - f.x, o.y - f.y) < o.r + 6) {
            const s = Math.hypot(f.vx, f.vy);
            this.hurt(o, f.owner, f.vx / s, f.vy / s);
            gone = true;
            this.drop(f, false);
            break;
          }
        }
      }
      if (gone) continue;
      f.life -= DT;
      if (f.life <= 0) this.drop(f, false);
      else still.push(f);
    }
    this.flying = still;
    // more bones, and the lava closing in
    if (this.t >= this.spawnAt && this.ground.length < MAX_ON_GROUND) {
      this.spawnAt = this.t + 1.1;
      this.spawnBone();
    }
    if (this.t >= this.shrinkAt) {
      this.shrinkAt += SHRINK_EVERY;
      const [a, b, c, d] = this.zone;
      if (c - a > 240 && d - b > 150) {
        this.zone = [a + SHRINK_BY, b + SHRINK_BY * 0.6, c - SHRINK_BY, d - SHRINK_BY * 0.6];
        this.zoneChanged = true;
        this.events.push({ e: "shrink" });
        // bones left in the lava are gone
        const before = this.ground.length;
        this.ground = this.ground.filter((g) => this.inZone(g.x, g.y));
        if (this.ground.length !== before) this.groundChanged = true;
      } else if (this.closedAt < 0) this.closedAt = this.t;
    }
  }

  /** A bone falls where it stopped (not in the lava, not off the arena). */
  private drop(f: Flying, back: boolean) {
    const x = back ? f.x - f.vx * DT * 0.3 : f.x;
    const y = back ? f.y - f.vy * DT * 0.3 : f.y;
    if (this.inZone(x, y) && !this.blocked(x, y, 8) && this.ground.length < MAX_ON_GROUND + 4) {
      this.ground.push({ id: f.id, x, y });
      this.groundChanged = true;
    }
  }

  protected flags(b: Body) {
    return (Math.max(0, b.g.hp) << 2) | (Math.max(0, b.g.bones) << 4) | (b.g.safe > 0 ? 64 : 0);
  }

  protected extra() {
    const out: Record<string, unknown> = {};
    if (this.flying.length) out.fb = this.flying.map((f) => [f.id, Math.round(f.x), Math.round(f.y)]);
    if (this.groundChanged) {
      this.groundChanged = false;
      out.gb = this.ground.map((g) => [g.id, Math.round(g.x), Math.round(g.y)]);
    }
    if (this.zoneChanged) {
      this.zoneChanged = false;
      out.z = this.zone.map((v) => Math.round(v));
    }
    // (closed in all it can: the time left instead, as -1 - seconds; it counted down to a shrink that never came; 9 October)
    out.zt = this.closedAt >= 0 ? -1 - Math.max(0, Math.ceil(this.closedAt + LAST_STAND - this.t)) : Math.max(0, Math.ceil(this.shrinkAt - this.t));
    return out;
  }

  protected decided() {
    const alive = this.bodies.filter((b) => b.alive);
    const players = alive.filter((b) => !b.seat.bot && !b.seat.gone);
    if (alive.length <= 1) return { winner: alive.length ? alive[0].i : -1, reason: alive.length ? "last" : "draw" };
    if (!players.length) return { winner: -2, reason: "out" };
    if (this.closedAt >= 0 && this.t >= this.closedAt + LAST_STAND) return { winner: -1, reason: "time" };
    return null;
  }

  // ---- bots: bones first, then keep a throwing distance from the nearest, dodge, and throw ahead of it

  private clearShot(x0: number, y0: number, x1: number, y1: number) {
    for (const [rx, ry, rr] of ROCKS) {
      const ex = x1 - x0;
      const ey = y1 - y0;
      const l2 = ex * ex + ey * ey;
      const t = Math.max(0, Math.min(1, ((rx - x0) * ex + (ry - y0) * ey) / Math.max(1, l2)));
      if (Math.hypot(x0 + ex * t - rx, y0 + ey * t - ry) < rr + 6) return false;
    }
    return true;
  }

  protected think(b: Body) {
    b.thinkAt = this.t + 0.18 + Math.random() * 0.2;
    const cx = (this.zone[0] + this.zone[2]) / 2;
    const cy = (this.zone[1] + this.zone[3]) / 2;
    // out of the lava first
    if (!this.inZone(b.x, b.y) || b.x < this.zone[0] + 22 || b.x > this.zone[2] - 22 || b.y < this.zone[1] + 22 || b.y > this.zone[3] - 22) {
      this.seek(b, cx, cy);
      return;
    }
    // a bone coming: step aside
    for (const f of this.flying) {
      if (f.owner === b.i) continue;
      const rx = b.x - f.x;
      const ry = b.y - f.y;
      const s = Math.hypot(f.vx, f.vy);
      const along = (rx * f.vx + ry * f.vy) / s;
      if (along > 0 && along < 170) {
        const side = (rx * f.vy - ry * f.vx) / s;
        if (Math.abs(side) < 34 && Math.random() < 0.75) {
          const sgn = side >= 0 ? 1 : -1;
          b.ix = (f.vy / s) * sgn;
          b.iy = (-f.vx / s) * sgn;
          return;
        }
      }
    }
    // (a target: one of the two nearest, kept for a while, so the bots don't all pile on one)
    const foes = this.bodies.filter((o) => o.alive && o !== b).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
    if (!foes.some((o) => o.i === b.g.target) || Math.random() < 0.05) b.g.target = foes.length ? foes[Math.min(foes.length - 1, Math.floor(Math.random() * 2))].i : -1;
    const foe = foes.find((o) => o.i === b.g.target) ?? null;
    if (b.g.bones <= 0 || (b.g.bones < 2 && this.ground.length && Math.random() < 0.5)) {
      let best: Bone | null = null;
      let bd = 1e9;
      for (const g of this.ground) {
        const d = Math.hypot(g.x - b.x, g.y - b.y);
        if (d < bd) {
          bd = d;
          best = g;
        }
      }
      if (best) {
        this.seek(b, best.x, best.y, 0);
        return;
      }
    }
    if (!foe) return;
    const dx = foe.x - b.x;
    const dy = foe.y - b.y;
    const d = Math.hypot(dx, dy);
    if (b.g.bones > 0 && b.cool <= 0 && d < 320 && this.clearShot(b.x, b.y, foe.x, foe.y) && Math.random() < 0.3) {
      // (a fair aim: some lead, some miss)
      const lead = (d / BONE_SPEED) * (0.3 + Math.random() * 0.7);
      b.ax = foe.x + (foe.vx + foe.kx) * lead + (Math.random() - 0.5) * 70;
      b.ay = foe.y + (foe.vy + foe.ky) * lead + (Math.random() - 0.5) * 70;
      this.throwBone(b);
    }
    // keep a throwing distance, circling
    const ux = dx / Math.max(1, d);
    const uy = dy / Math.max(1, d);
    const side = b.i % 2 ? 1 : -1;
    let mx = -uy * side * 0.8;
    let my = ux * side * 0.8;
    if (d > 250) {
      mx += ux;
      my += uy;
    } else if (d < 150) {
      mx -= ux;
      my -= uy;
    }
    // (and not too near the lava)
    mx += (cx - b.x) * 0.002;
    my += (cy - b.y) * 0.002;
    const l = Math.hypot(mx, my);
    b.ix = l > 0.01 ? mx / l : 0;
    b.iy = l > 0.01 ? my / l : 0;
  }

  protected stats() {
    return this.bodies.map((b) => b.score);
  }
}
