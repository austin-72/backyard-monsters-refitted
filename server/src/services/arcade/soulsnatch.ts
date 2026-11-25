import { type Body, ArenaRoom, DT } from "./arena.js";

/**
 * Inferno-only: Soul Snatch (the Devil's Arcade, 7 October, the user's pick), capture the flag on the arena
 * (arena.ts). Red's base is on the left, Blue's on the right, each with its team's soul. Touch the other team's
 * soul to carry it (a little slower); bring it into your base while your own soul is home: a capture. On your
 * own half, touching a raider sends them back to their base (they wait two seconds there) and drops what they
 * carried. A dropped soul stays where it fell until it is picked up again (7 October, the user's: it went home at
 * once when one of its team touched it, the one who made the tag standing right there, or by itself after ten
 * seconds): after a moment anyone can pick it up, a raider to carry it off again, one of its own team to carry it
 * back into their base. The action key dashes. First to 3 captures wins, or the most after four minutes (level: a draw).
 * Solo: the player and a bot against two bots; Live: teams of three, bots filling in.
 */
const X0 = 20;
const Y0 = 34;
const X1 = 700;
const Y1 = 412;
const MID_X = (X0 + X1) / 2;
const MID_Y = (Y0 + Y1) / 2;
const BASES = [
  [74, MID_Y],
  [646, MID_Y],
];
const BASE_R = 44;
const TOUCH = 14;
const JAIL = 2;
/** A dropped soul lies this long before anyone can pick it up (so it is seen to drop). */
const SETTLE = 1;
const TO_WIN = 3;
const TIME = 240;
const PAUSE = 1.6;
const ROCKS = [
  [235, 120, 24],
  [485, 120, 24],
  [235, 322, 24],
  [485, 322, 24],
  [MID_X, MID_Y, 30],
];

const BOTS = ["Wisp", "Gloom", "Shade", "Hollow", "Murk", "Grimlet", "Banshee", "Dusk"];

interface Soul {
  x: number;
  y: number;
  home: boolean;
  carrier: number;
  droppedAt: number;
}

export class SoulSnatchRoom extends ArenaRoom {
  private souls: Soul[] = [];
  private caps = [0, 0];
  private pause = 0;

  constructor(mode: string) {
    super("soulsnatch", mode, {
      seats: mode === "solo" ? 4 : 6,
      teamSize: mode === "solo" ? 2 : 3,
      speed: 150,
      radius: 15,
      dashSpeed: 380,
      dashTime: 0.22,
      dashCool: 2.2,
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
    this.souls = BASES.map(([x, y]) => ({ x, y, home: true, carrier: -1, droppedAt: 0 }));
    this.place();
  }

  /** Everyone back to their own side. */
  private place() {
    const per = [0, 0];
    for (const b of this.bodies) {
      const k = per[b.team]++;
      const n = this.opt.teamSize;
      b.x = b.team === 0 ? 150 : 570;
      b.y = MID_Y + (k - (n - 1) / 2) * 90;
      b.vx = b.vy = b.kx = b.ky = 0;
      b.dash = 0;
      b.g.jail = 0;
      b.g.slow = 0;
      b.face = b.team === 0 ? 0 : 180;
    }
  }

  /** The ones sent back wait at their base: not moved, and not put elsewhere by their game. Nobody moves in the
   * pause after a capture (they walked on at the keys' speed, then were put back; 9 October). */
  protected move(b: Body) {
    if (b.g.jail > 0 || this.pause > 0) return;
    super.move(b);
  }

  protected hint(b: Body, hx: number, hy: number) {
    if (b.g.jail > 0 || this.pause > 0) return;
    super.hint(b, hx, hy);
  }

  protected arenaInfo() {
    return { field: [X0, Y0, X1, Y1], bases: BASES, baseR: BASE_R, rocks: ROCKS, toWin: TO_WIN, time: TIME };
  }

  private home(team: number) {
    const s = this.souls[team];
    if (s.carrier >= 0) this.bodies[s.carrier].g.slow = 0;
    s.x = BASES[team][0];
    s.y = BASES[team][1];
    s.home = true;
    s.carrier = -1;
  }

  /** On whose half a point is. */
  private half(x: number) {
    return x < MID_X ? 0 : 1;
  }

  private jail(b: Body, by: number) {
    const carried = this.souls.findIndex((s) => s.carrier === b.i);
    if (carried >= 0) {
      const s = this.souls[carried];
      s.carrier = -1;
      s.x = b.x;
      s.y = b.y;
      s.droppedAt = this.t;
    }
    b.g.slow = 0;
    b.g.jail = JAIL;
    b.x = BASES[b.team][0] + (b.team === 0 ? -14 : 14);
    b.y = BASES[b.team][1] + (Math.random() - 0.5) * 40;
    b.vx = b.vy = b.kx = b.ky = 0;
    b.dash = 0;
    b.ix = b.iy = 0;
    if (by >= 0) this.bodies[by].g.tags = (this.bodies[by].g.tags ?? 0) + 1;
    this.events.push({ e: "tag", i: b.i, by, drop: carried });
  }

  protected update() {
    if (this.pause > 0) {
      this.pause -= DT;
      for (const b of this.bodies) {
        b.vx = b.vy = 0;
        b.act = false;
      }
      if (this.pause <= 0) {
        this.place();
        this.events.push({ e: "go" });
      }
      return;
    }
    for (const b of this.bodies) {
      if (b.g.jail > 0) {
        b.g.jail -= DT;
        b.vx = b.vy = 0;
        b.act = false;
        if (b.seat.bot) b.ix = b.iy = 0;
        continue;
      }
      if (b.act) {
        b.act = false;
        this.startDash(b);
      }
    }
    // tags: on your own half, touching a raider sends them home
    for (const [a, c] of this.separate()) {
      if (a.team === c.team || a.g.jail > 0 || c.g.jail > 0) continue;
      const side = this.half((a.x + c.x) / 2);
      if (side === a.team) this.jail(c, a.i);
      else if (side === c.team) this.jail(a, c.i);
    }
    // the souls: carried, picked up, returned, captured
    for (let team = 0; team < 2; team++) {
      const s = this.souls[team];
      if (s.carrier >= 0) {
        const c = this.bodies[s.carrier];
        s.x = c.x;
        s.y = c.y - 4;
        // one of its own team carrying it: home when they bring it into their base
        if (c.team === team) {
          if (Math.hypot(c.x - BASES[team][0], c.y - BASES[team][1]) < BASE_R) {
            this.home(team);
            this.events.push({ e: "back", team, by: c.i });
          }
          continue;
        }
        // home with it, and their own soul at home: a capture
        const own = this.souls[c.team];
        if (Math.hypot(c.x - BASES[c.team][0], c.y - BASES[c.team][1]) < BASE_R && own.home) {
          this.caps[c.team]++;
          c.score++;
          this.events.push({ e: "cap", team: c.team, by: c.i, caps: this.caps.slice() });
          this.home(0);
          this.home(1);
          this.pause = PAUSE;
          return;
        }
        continue;
      }
      if (!s.home && this.t - s.droppedAt < SETTLE) continue;
      for (const b of this.bodies) {
        if (b.g.jail > 0 || Math.hypot(b.x - s.x, b.y - s.y) > b.r + TOUCH) continue;
        // (at home only the other team can take it; lying where it fell, anyone can pick it up)
        if (b.team === team && s.home) continue;
        if (this.souls.some((o) => o.carrier === b.i)) continue;
        s.carrier = b.i;
        s.home = false;
        b.g.slow = 0.8;
        this.events.push({ e: b.team === team ? "lift" : "grab", team, by: b.i });
        break;
      }
    }
  }

  protected flags(b: Body) {
    return (b.dash > 0 ? 1 : 0) | (b.g.jail > 0 ? 4 : 0) | (this.souls.some((s) => s.carrier === b.i) ? 8 : 0);
  }

  protected extra() {
    const left = this.t < 0 ? TIME : Math.max(0, Math.ceil(TIME - this.t));
    return { so: this.souls.map((s) => [Math.round(s.x), Math.round(s.y), s.home ? 1 : 0, s.carrier]), sc: this.caps, cl: left };
  }

  protected decided() {
    if (this.caps[0] >= TO_WIN || this.caps[1] >= TO_WIN) return { winner: this.caps[0] > this.caps[1] ? 0 : 1, reason: "caps" };
    if (this.t >= TIME) return this.caps[0] === this.caps[1] ? { winner: -1, reason: "draw" } : { winner: this.caps[0] > this.caps[1] ? 0 : 1, reason: "time" };
    return null;
  }

  protected stats() {
    return { caps: this.caps, mine: this.bodies.map((b) => [b.score, b.g.tags ?? 0]) };
  }

  // ---- bots: get a dropped soul home; chase whoever carries ours; carry theirs home round the defenders;
  // one guards, the rest raid

  /** A way to (x, y) that bends away from the enemies near (and the rocks). */
  private steer(b: Body, x: number, y: number, shy: number) {
    let mx = x - b.x;
    let my = y - b.y;
    const d = Math.max(1, Math.hypot(mx, my));
    mx /= d;
    my /= d;
    for (const o of this.bodies) {
      if (o.team === b.team || o.g.jail > 0) continue;
      // (only the ones who can tag it: on their own half)
      if (this.half(b.x) !== o.team && this.half(o.x) !== o.team) continue;
      const ox = b.x - o.x;
      const oy = b.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od < shy && od > 0.1) {
        const w = ((shy - od) / shy) * 1.6;
        mx += (ox / od) * w;
        my += (oy / od) * w;
      }
    }
    for (const [rx, ry, rr] of ROCKS) {
      const ox = b.x - rx;
      const oy = b.y - ry;
      const od = Math.hypot(ox, oy);
      if (od < rr + 34) {
        mx += (ox / od) * 0.8;
        my += (oy / od) * 0.8;
      }
    }
    const l = Math.hypot(mx, my);
    b.ix = l > 0.01 ? mx / l : 0;
    b.iy = l > 0.01 ? my / l : 0;
  }

  protected think(b: Body) {
    b.thinkAt = this.t + 0.1 + Math.random() * 0.12;
    if (this.pause > 0 || b.g.jail > 0) {
      b.ix = b.iy = 0;
      return;
    }
    const mine = this.souls[b.team];
    const theirs = this.souls[1 - b.team];
    const mates = this.bodies.filter((o) => o.team === b.team && o.g.jail <= 0);
    const foes = this.bodies.filter((o) => o.team !== b.team && o.g.jail <= 0);
    const nearestTo = (x: number, y: number, list: Body[]) => list.reduce((best, o) => (Math.hypot(o.x - x, o.y - y) < Math.hypot(best.x - x, best.y - y) ? o : best), list[0]);
    // carrying ours (picked up where it fell): back into our base
    if (mine.carrier === b.i) {
      this.steer(b, BASES[b.team][0], BASES[b.team][1], 100);
      return;
    }
    // carrying theirs: home, round the defenders
    if (theirs.carrier === b.i) {
      this.steer(b, BASES[b.team][0], BASES[b.team][1], 100);
      if (b.cool <= 0 && foes.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < 60)) this.startDash(b);
      return;
    }
    // ours dropped: the nearest gets it home
    if (!mine.home && mine.carrier < 0 && mates.length && nearestTo(mine.x, mine.y, mates) === b) {
      this.seek(b, mine.x, mine.y, 0);
      return;
    }
    // ours carried off: chase the carrier (all but the furthest)
    if (mine.carrier >= 0 && this.bodies[mine.carrier].team !== b.team) {
      const c = this.bodies[mine.carrier];
      const chasers = mates.slice().sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y));
      if (chasers.indexOf(b) < Math.max(1, chasers.length - 1)) {
        this.seek(b, c.x + (c.vx + c.kx) * 0.3, c.y + (c.vy + c.ky) * 0.3, 0);
        if (b.cool <= 0 && Math.hypot(c.x - b.x, c.y - b.y) < 80 && this.half(c.x) === b.team) this.startDash(b);
        return;
      }
    }
    // the guard: the lowest seat of the team that isn't busy
    const guard = mates.filter((o) => theirs.carrier !== o.i).sort((p, q) => p.i - q.i)[0];
    if (guard === b) {
      const intruders = foes.filter((o) => this.half(o.x) === b.team);
      if (intruders.length) {
        const t = nearestTo(b.x, b.y, intruders);
        this.seek(b, t.x + (t.vx + t.kx) * 0.25, t.y + (t.vy + t.ky) * 0.25, 0);
        if (b.cool <= 0 && Math.hypot(t.x - b.x, t.y - b.y) < 70) this.startDash(b);
        return;
      }
      // stand between our soul and the middle, watching the nearest raider-to-be
      const watch = foes.length ? nearestTo(BASES[b.team][0], BASES[b.team][1], foes) : null;
      const gx = BASES[b.team][0] + (b.team === 0 ? 90 : -90);
      const gy = watch ? MID_Y + (watch.y - MID_Y) * 0.6 : MID_Y;
      this.seek(b, gx, gy, 10);
      return;
    }
    // raiders: for their soul (or escort the carrier home)
    if (theirs.carrier >= 0 && this.bodies[theirs.carrier].team === b.team) {
      const c = this.bodies[theirs.carrier];
      const threat = foes.length ? nearestTo(c.x, c.y, foes) : null;
      if (threat) this.seek(b, (threat.x + c.x) / 2, (threat.y + c.y) / 2, 0);
      return;
    }
    this.steer(b, theirs.x, theirs.y, 95);
    if (b.cool <= 0 && Math.hypot(theirs.x - b.x, theirs.y - b.y) < 110 && Math.random() < 0.3) this.startDash(b);
  }
}
