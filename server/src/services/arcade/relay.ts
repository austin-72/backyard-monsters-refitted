import { questArcadeWin } from "../quests/questHooks.js";
import { randomInt } from "crypto";

import { logger } from "../../utils/logger.js";
import { type Conn, Room, type Seat, send } from "./room.js";
import { recordMatch, recordScore } from "./scores.js";
import { arcadeGame } from "../../config/ArcadeConfig.js";
import { arcadeScoreOutOfReach, hellgateWavesIn, noteArcadeScore } from "../anticheat/requestChecks.js";

/**
 * Inferno-only: a two-player match the players' own games run (the Devil's Arcade): Spurtz Smash and Magma
 * Breakout Versus, Balthazar's Flight Race, Hellgate Defense Versus and Co-op. Both games play the same seed;
 * the room passes each one's progress ({t: "s"}) and attacks ({t: "ev"}) to the other, and decides the match
 * from what each says when it is done ({t: "done", score}):
 *
 *  - "score" (Smash, Breakout, Flight): when both are done, the higher score wins (equal: a draw);
 *  - "survive" (Hellgate Versus): the first to fall loses;
 *  - "coop" (Hellgate Co-op): one run for the two; it ends when their lives are gone (either game says so),
 *    and both are credited the waves held.
 *
 * Leaving a match loses it (Co-op: the other plays on alone). A bot takes an empty place in Smash and Breakout
 * (it scores at a steady pace and attacks now and then); in Flight a ghost does (the game flies it: the room
 * only needs its score).
 */
type Policy = "score" | "survive" | "coop";

interface RelaySeat extends Seat {
  score: number;
  done: boolean;
  /** Still playing when the match ran out of time (9 October: Valgos Golf ranks them after the finished). */
  unfinished?: boolean;
  last: Record<string, unknown> | null;
  msgs: number;
  msgWindow: number;
  /** Attacks on the rival it may still send now, and when that was worked out. */
  evLeft?: number;
  evAt?: number;
  /** Reported to the admins for an impossible score once (services/anticheat). */
  cheatNoted?: boolean;
  /** (18 October) Hellgate Versus: gold the seat may still spend on sends, and when that was worked out. */
  goldLeft?: number;
  goldAt?: number;
}

/**
 * (18 October, SUSPECTED-BUGS.md: a send's monster and count passed as sent, so a modified game sent any boss, or
 * twelve Drulls, once a second) Hellgate Versus's sends, as the game sells them (IoTdLink.SENDS): the monster, how
 * many come, and their price in gold. A seat's sends are held to SEND_GOLD_PER_SECOND of gold income (a burst of
 * SEND_GOLD_BURST), well above what a wave pays.
 */
const TD_SENDS: Record<string, { n: number; gold: number }> = {
  IC1: { n: 5, gold: 60 },
  IC7: { n: 4, gold: 220 },
  IC4: { n: 3, gold: 180 },
  IC6: { n: 1, gold: 380 },
  IC8: { n: 1, gold: 520 },
  IC10: { n: 1, gold: 1500 },
};
const SEND_GOLD_PER_SECOND = 60;
const SEND_GOLD_BURST = 1600;
/** Co-op: the shared lives at the start (IoTd), and the most one "life" message may take away. */
const COOP_LIVES = 20;
const COOP_LIFE_DROP = 10;

const POLICY: Record<string, { policy: Policy; maxMs: number }> = {
  "smash:versus": { policy: "score", maxMs: 90_000 },
  "breakout:versus": { policy: "score", maxMs: 240_000 },
  "flight:race": { policy: "score", maxMs: 15 * 60_000 },
  "hellgate:versus": { policy: "survive", maxMs: 3 * 60 * 60_000 },
  "hellgate:coop": { policy: "coop", maxMs: 3 * 60 * 60_000 },
  // (7 October, later)
  "stack:versus": { policy: "survive", maxMs: 30 * 60_000 },
  "swarm:versus": { policy: "score", maxMs: 30 * 60_000 },
  "runner:race": { policy: "score", maxMs: 30 * 60_000 },
  "golf:versus": { policy: "score", maxMs: 30 * 60_000 },
};

/** The games with a bot (a pace of its own, see BotDriver) when nobody comes, and its name. */
export const BOT_NAMES: Record<string, string> = {
  "smash:versus": "Spurtz Bot",
  "breakout:versus": "Brick Imp",
  "stack:versus": "Cinder Stacker",
  "swarm:versus": "Swarm Imp",
  "runner:race": "Rezbot",
  "golf:versus": "Caddie Valgos",
};

export const relayGames = Object.keys(POLICY);

/** The countdown before a match (ms). */
export const COUNTDOWN = 3500;

/**
 * Inferno-only (QoL #367, 15 October): a player whose connection drops mid-match keeps their seat this long (the
 * game reconnects and says {t: "resume", room}); only then does it count as leaving. Told to the games in "start"
 * (`grace`, seconds), to the other player as {t: "away", i, s} and {t: "back", i}.
 */
export const RELAY_GRACE_SECONDS = 12;

export class RelayRoom extends Room {
  readonly policy: Policy;
  readonly maxMs: number;
  readonly seed: number;
  readonly startAt: number;
  /** (18 October) Hellgate Co-op: the shared lives as the relay last let them be said. */
  coopLives?: number;
  ended = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bot: BotDriver | null = null;

  constructor(game: string, mode: string, players: Conn[], botName: string | null = null, extra: Record<string, unknown> = {}, seed = 0) {
    super(game, mode);
    const p = POLICY[`${game}:${mode}`];
    this.policy = p.policy;
    this.maxMs = p.maxMs;
    this.seed = seed || randomInt(1, 2 ** 31 - 1);
    for (const c of players) {
      this.seats.push(this.newSeat(c, c.uid, c.name, false));
      c.room = this;
      c.queue = null;
    }
    if (botName) {
      this.seats.push(this.newSeat(null, -1, botName, true));
    }
    this.startAt = Date.now() + COUNTDOWN;
    const info = this.seats.map((s) => ({ uid: s.uid, name: s.name, bot: s.bot }));
    this.seats.forEach((s, i) => {
      if (!s.bot) send(s.conn, { t: "start", room: this.id, game, mode, seed: this.seed, players: info, you: i, cd: COUNTDOWN, grace: RELAY_GRACE_SECONDS, ...extra });
    });
    if (botName && BOT_NAMES[`${game}:${mode}`]) {
      this.bot = new BotDriver(this, this.seats.length - 1, game);
    }
    this.timer = setInterval(() => this.tick(), 1000);
    logger.info(`Arcade: ${game} ${mode} room ${this.id}: ${info.map((p) => p.name).join(" v ")}`);
  }

  private newSeat(conn: Conn | null, uid: number, name: string, bot: boolean): RelaySeat {
    return { conn, uid, name, bot, gone: false, score: 0, done: false, last: null, msgs: 0, msgWindow: Date.now() };
  }

  get rs(): RelaySeat[] {
    return this.seats as RelaySeat[];
  }

  private tick() {
    if (this.ended) return;
    if (Date.now() - this.startAt > this.maxMs) {
      // (too long: whatever each has now)
      for (const s of this.rs) {
        if (!s.done) s.unfinished = true;
        s.done = true;
      }
      this.finish("time");
    }
  }

  /** A bot's (or a ghost's) progress, as if a player had sent it. */
  fromSeat(index: number, msg: Record<string, unknown>) {
    const seat = this.rs[index];
    if (!seat || this.ended) return;
    this.handle(seat, msg);
  }

  onMessage(conn: Conn, msg: Record<string, unknown>) {
    const seat = this.seatOf(conn) as RelaySeat | undefined;
    if (!seat || this.ended) return;
    // (a game sends a few a second at most: anything flooding is dropped)
    const now = Date.now();
    if (now - seat.msgWindow > 1000) {
      seat.msgWindow = now;
      seat.msgs = 0;
    }
    if (++seat.msgs > 40) return;
    this.handle(seat, msg);
  }

  private handle(seat: RelaySeat, msg: Record<string, unknown>) {
    const i = this.rs.indexOf(seat);
    switch (msg.t) {
      case "s": {
        if (seat.done) return;
        const score = Number(msg.score);
        if (Number.isFinite(score)) seat.score = this.taken(seat, score);
        seat.last = msg;
        this.broadcast({ ...msg, t: "s", i, score: seat.score }, seat);
        return;
      }
      case "ev": {
        if (seat.done && this.policy !== "coop") return;
        const out: Record<string, unknown> = { ...msg, t: "ev", i };
        if (this.game === "hellgate") {
          // (each kind only where it belongs: a "life" sent in Versus made the rival's Hall fall at once, a win; and
          // monsters sent no oftener than they can be paid for, at no more than the sender's wave; 9 October)
          const k = String(msg.k);
          if (this.policy === "coop" ? k !== "leak" && k !== "life" && k !== "ready" : k !== "send") return;
          const now = Date.now();
          if (k === "send") {
            // (18 October: only what the game sells, as many as it sells, paid from the seat's gold income)
            const sold = TD_SENDS[String(msg.id)];
            if (!sold) return;
            seat.goldLeft = Math.min(SEND_GOLD_BURST, (seat.goldLeft ?? SEND_GOLD_BURST) + ((now - (seat.goldAt ?? now)) / 1000) * SEND_GOLD_PER_SECOND);
            seat.goldAt = now;
            if (seat.goldLeft < sold.gold) return;
            seat.goldLeft -= sold.gold;
            seat.evLeft = Math.min(4, (seat.evLeft ?? 4) + ((now - (seat.evAt ?? now)) / 1000) * 1);
            seat.evAt = now;
            if (seat.evLeft < 1) return;
            seat.evLeft -= 1;
            out.id = String(msg.id);
            out.n = sold.n;
            out.w = Math.max(1, Math.min(seat.score + 1, Math.floor(Number(out.w)) || 1));
          } else {
            // (18 October, Co-op: a leak or a life sent by a partner ended the other's run at once) leaks and lives
            // as often as monsters can get through (a few, then 5 a second), a leak's monster a known kind with
            // some health, and the shared lives going down only a little at a time
            seat.evLeft = Math.min(20, (seat.evLeft ?? 20) + ((now - (seat.evAt ?? now)) / 1000) * 5);
            seat.evAt = now;
            if (k !== "ready") {
              if (seat.evLeft < 1) return;
              seat.evLeft -= 1;
            }
            if (k === "leak") {
              if (!/^I?C\d{1,2}$/.test(String(msg.id))) return;
              out.id = String(msg.id);
              out.hp = Math.max(1, Math.min(50_000_000, Math.floor(Number(msg.hp)) || 1));
              out.leak = Math.max(1, Math.min(COOP_LIFE_DROP, Math.floor(Number(msg.leak)) || 1));
              out.w = Math.max(1, Math.min(seat.score + 1, Math.floor(Number(msg.w)) || 1));
            } else if (k === "life") {
              const was = this.coopLives ?? COOP_LIVES;
              const said = Math.floor(Number(msg.n));
              const n = Number.isFinite(said) ? Math.max(was - COOP_LIFE_DROP, Math.min(was, said)) : was;
              this.coopLives = n;
              out.n = n;
            } else if (k === "ready") {
              out.w = Math.max(1, Math.min(999, Math.floor(Number(msg.w)) || 1));
            }
          }
        } else {
          // (an attack on the rival as often as a game can earn one: a few in a row, then one and a half a second,
          // the junk or rows sent four at most; any number of them went through, as fast as they came; 9 October)
          const now = Date.now();
          seat.evLeft = Math.min(4, (seat.evLeft ?? 4) + ((now - (seat.evAt ?? now)) / 1000) * 1.5);
          seat.evAt = now;
          if (seat.evLeft < 1) return;
          seat.evLeft -= 1;
          if (out.n != null) out.n = Math.max(1, Math.min(4, Math.floor(Number(out.n)) || 1));
        }
        this.broadcast(out, seat);
        return;
      }
      case "done": {
        if (seat.done) return;
        const score = Number(msg.score);
        if (Number.isFinite(score)) seat.score = this.taken(seat, score, true);
        seat.done = true;
        this.broadcast({ t: "done", i, score: seat.score }, seat);
        if (this.policy === "survive" || this.policy === "coop") {
          this.finish("done");
        } else if (this.rs.every((s) => s.done || s.gone)) {
          this.finish("done");
        } else if (!seat.bot && this.bot && this.rs.every((s) => s.done || s.gone || s.bot)) {
          // (only the bot still playing: it plays out the rest of its run at once, so nobody waits for it)
          this.bot.finishNow();
        }
        return;
      }
      default:
        return;
    }
  }

  /**
   * A score as said, or (Hellgate, whose score is the wave reached) no more than one wave on from the last and than
   * there was time to fight (6 s a wave, as a solo run's): Co-op's best was recorded for both as any number sent
   * (9 October).
   */
  private taken(seat: RelaySeat, score: number, final = false) {
    let s = Math.max(0, Math.floor(score));
    // (13 October) not a number: nothing; and no more than the game's most (Golf's was taken as sent: 2,000,000,000
    // won every match and was its best)
    if (!Number.isFinite(s)) s = 0;
    // (Golf's live score is 999 less the strokes so far: held to 999, not to its recorded most, 990)
    const most = this.game === "golf" ? 999 : arcadeGame(this.game)?.maxScore;
    if (this.game !== "hellgate" && most && most > 0) s = Math.min(s, most);
    if (this.game !== "hellgate") {
      // (a player's score past what no one can score in the time: held to the most the arcade takes in that time,
      // and reported to the admins, services/anticheat; bots and ghosts play their own way; Golf's live score is
      // 999 less the strokes so far, not earned over time)
      const g = arcadeGame(this.game);
      if (seat.bot || !g || !(g.maxPerSecond > 0)) return s;
      const seconds = Math.max(1, (Date.now() - this.startAt) / 1000);
      // (18 October, SUSPECTED-BUGS.md: Golf's final score had no check at all, "done" with 999 at the start won;
      // the others were held only past five times the solo most) Golf's round: 990 at best (nine holes), and not
      // before nine holes can be played (minSeconds); the others: the solo rule, the most a run of this length takes
      if (g.id === "golf") return final ? (g.minSeconds && seconds < g.minSeconds ? 0 : Math.min(s, g.maxScore)) : s;
      if (s > arcadeScoreOutOfReach(g, seconds) && !seat.cheatNoted) {
        seat.cheatNoted = true;
        void noteArcadeScore(seat.uid, g, s, seconds, `${this.game} ${this.policy} (live)`, false);
      }
      return Math.min(s, Math.max(seat.score, Math.floor(Math.min(g.maxScore, g.maxPerSecond * seconds + 100))));
    }
    // (18 October: the waves by the game's own timing, services/anticheat hellgateWavesIn; 6 s a wave was too few)
    const possible = Math.min(Math.floor((Date.now() - this.startAt) / 6000), hellgateWavesIn((Date.now() - this.startAt) / 1000));
    return Math.min(s, seat.score + 1, Math.max(seat.score, possible), 999);
  }

  onLeave(conn: Conn) {
    const seat = this.seatOf(conn) as RelaySeat | undefined;
    if (!seat) return;
    seat.gone = true;
    if (conn.room === this) conn.room = null;
    if (this.ended) return;
    const i = this.rs.indexOf(seat);
    this.broadcast({ t: "left", i });
    if (this.policy === "coop") {
      // (the other plays on alone; the one who left is credited what they held)
      void recordScore(seat.uid, this.game, this.mode, "", seat.score, 0).catch(() => 0);
      if (!this.humans.length) this.finish("left");
      return;
    }
    // (done already, a score game waiting for the others: leaving keeps the score, the match plays out; it
    // used to lose, so a player who had finished could only wait for a slow rival or forfeit; 9 October)
    if (seat.done && this.policy === "score") {
      if (this.rs.every((s) => s.done || s.gone)) this.finish("done");
      return;
    }
    // leaving loses: the other wins at once
    seat.done = true;
    seat.score = -1;
    this.finish("left");
  }

  // ---- (QoL #367) a dropped connection's grace
  graceMs(conn: Conn) {
    const seat = this.seatOf(conn);
    return !this.ended && seat && !seat.bot ? RELAY_GRACE_SECONDS * 1000 : 0;
  }

  away(conn: Conn) {
    const seat = this.seatOf(conn) as RelaySeat | undefined;
    if (!seat || this.ended) return;
    this.broadcast({ t: "away", i: this.rs.indexOf(seat), s: RELAY_GRACE_SECONDS }, seat);
  }

  resume(old: Conn, conn: Conn) {
    const seat = this.seatOf(old) as RelaySeat | undefined;
    if (!seat || this.ended) return false;
    seat.conn = conn;
    conn.room = this;
    conn.queue = null;
    const i = this.rs.indexOf(seat);
    this.broadcast({ t: "back", i }, seat);
    // (what the others did meanwhile: their latest progress, done or gone)
    this.rs.forEach((s, j) => {
      if (j === i) return;
      if (s.last) send(conn, { ...s.last, t: "s", i: j, score: s.score });
      if (s.done) send(conn, { t: "done", i: j, score: s.score });
      if (s.gone) send(conn, { t: "left", i: j });
    });
    return true;
  }

  private finish(reason: string) {
    if (this.ended) return;
    this.ended = true;
    if (this.timer) clearInterval(this.timer);
    this.bot?.stop();
    const seats = this.rs;
    let winner = -1;
    if (this.policy === "coop") {
      const held = Math.max(...seats.map((s) => s.score));
      for (const s of seats) {
        if (!s.bot && !s.gone) void recordScore(s.uid, this.game, this.mode, "", held, 0).catch((e) => logger.warn(`Arcade: ${e}`));
      }
      this.lastEnd = { t: "end", winner: -1, scores: seats.map((s) => s.score), reason, coop: held };
      this.broadcast(this.lastEnd);
      this.close();
      return;
    }
    if (this.policy === "survive") {
      // (out of time, nobody fell: a draw; every seat is marked done then, so the first used to "fall"; 9 October)
      const fallen = reason === "time" ? -1 : seats.findIndex((s) => s.done);
      winner = fallen < 0 ? -1 : seats.length === 2 ? 1 - fallen : -1;
    } else {
      // (Valgos Golf out of time: a round finished beats one that isn't, whatever its strokes so far: the score is
      // 999 less the strokes, so stopping after a hole led a whole round; 9 October)
      // (a seat gone by now finished and left: an unfinished leaver ended the match then; kept with the finished)
      const counted = this.game === "golf" && reason === "time" && seats.some((s) => !s.unfinished) ? seats.filter((s) => !s.unfinished) : seats;
      const best = Math.max(...counted.map((s) => s.score));
      const top = seats.map((s, i) => (counted.includes(s) && s.score === best ? i : -1)).filter((i) => i >= 0);
      winner = top.length === 1 ? top[0] : -1;
    }
    const humans = seats.filter((s) => !s.bot).length;
    seats.forEach((s, i) => {
      if (s.bot) return;
      const result = winner < 0 ? "draw" : winner === i ? "win" : "loss";
      if (result === "win") questArcadeWin(s.uid, humans >= 2);
      void recordMatch(s.uid, this.game, this.mode, result, Math.max(0, s.score)).catch((e) => logger.warn(`Arcade: ${e}`));
    });
    this.lastEnd = { t: "end", winner, scores: seats.map((s) => s.score), reason };
    this.broadcast(this.lastEnd);
    logger.info(`Arcade: ${this.game} ${this.mode} room ${this.id} ended (${reason}): ${seats.map((s) => `${s.name} ${s.score}`).join(", ")}`);
    this.close();
  }

  /** A ghost's (Flight) final score: the game flies it, the room only needs to know where it crashed. */
  ghostDone(index: number, score: number) {
    const seat = this.rs[index];
    if (!seat) return;
    seat.score = score;
    seat.done = true;
  }
}

/**
 * A bot in a two-player game the players' own games run: it plays at a pace of its own (a little uneven, faster
 * when it is behind) and attacks now and then, as a player's game would say:
 *
 *  - Spurtz Smash: 60 seconds; a Fusebug onto the other board now and then.
 *  - Magma Breakout: loses its last ball somewhere between 1.5 and 3.5 minutes; a row of bricks now and then.
 *  - Magma Stack: tops out between 1.5 and 5 minutes; junk rows now and then; its pit's heights for the
 *    other player's little picture of it.
 *  - Spurtz Swarm: loses its last life between 1.5 and 4.5 minutes; a swarm now and then.
 *  - Rezghul Runner: runs at the road's speed (a little under it) and crashes between 15 and 75 seconds in
 *    (about 250 to 2,000 metres); its distance as it goes.
 *  - Valgos Golf: plays the nine holes, 12 to 25 seconds each, around par.
 *
 * When the player is done first (and the match is decided by score), the bot plays out the rest at once
 * (`finishNow`), so nobody waits for it.
 */
class BotDriver {
  private timer: ReturnType<typeof setInterval>;
  private score = 0;
  private t = 0;
  private readonly rate: number;
  private readonly endAt: number;
  private nextAttack: number;
  private stopped = false;
  private hole = 0;
  private strokes = 0;
  private holeEndsAt = 0;
  private heights: number[] = new Array(10).fill(0);
  private metres = 0;

  constructor(
    private readonly room: RelayRoom,
    private readonly index: number,
    private readonly game: string,
  ) {
    const r = Math.random();
    switch (game) {
      case "smash":
        this.rate = 30 + r * 35; // points a second
        this.endAt = 60;
        this.nextAttack = 6 + Math.random() * 6;
        break;
      case "stack":
        this.rate = 25 + r * 60;
        this.endAt = 90 + Math.random() * 210;
        this.nextAttack = 15 + Math.random() * 10;
        break;
      case "swarm":
        this.rate = 35 + r * 55;
        this.endAt = 90 + Math.random() * 180;
        this.nextAttack = 18 + Math.random() * 12;
        break;
      case "runner":
        this.rate = 0.9 + r * 0.1; // (the road's own speed, a little under it)
        this.endAt = 15 + Math.random() * 60;
        this.nextAttack = 1e9;
        break;
      case "golf":
        this.rate = 0;
        this.endAt = 1e9;
        this.nextAttack = 1e9;
        this.holeEndsAt = 12 + Math.random() * 13;
        break;
      default:
        this.rate = 14 + r * 18;
        this.endAt = 90 + Math.random() * 120;
        this.nextAttack = 12 + Math.random() * 10;
    }
    const start = Date.now();
    this.timer = setInterval(() => {
      const elapsed = (Date.now() - start - COUNTDOWN) / 1000;
      if (elapsed < 0 || this.stopped) return;
      this.step(elapsed);
    }, 500);
  }

  /** Points made in dt seconds (the runner speeds up as it goes, like the road). */
  private gain(dt: number, _at: number, behind: number) {
    // (Rezghul Runner: the road's speed at the distance it has run, RunnerGame.speedAt; an ember now and then)
    if (this.game === "runner") {
      const m = (14 + Math.min(26, this.metres / 55)) * this.rate * dt;
      this.metres += m;
      return Math.round(m) + (Math.random() < dt * 0.6 ? 10 : 0);
    }
    return Math.round(this.rate * dt * behind * (0.6 + Math.random() * 0.8));
  }

  /** A hole's strokes, around par 3: an ace now and then, a bad one now and then. */
  private static holeStrokes() {
    const r = Math.random();
    return r < 0.06 ? 1 : r < 0.36 ? 2 : r < 0.78 ? 3 : r < 0.94 ? 4 : 5;
  }

  private golfStep(elapsed: number) {
    while (this.hole < 9 && elapsed >= this.holeEndsAt) {
      this.strokes += BotDriver.holeStrokes();
      this.hole++;
      this.holeEndsAt += 12 + Math.random() * 13;
      this.room.fromSeat(this.index, { t: "s", score: 999 - this.strokes, hole: this.hole, strokes: this.strokes });
    }
    if (this.hole >= 9) {
      this.stop();
      this.room.fromSeat(this.index, { t: "done", score: 999 - this.strokes });
    }
  }

  private step(elapsed: number) {
    if (this.game === "golf") {
      this.golfStep(elapsed);
      return;
    }
    const dt = elapsed - this.t;
    this.t = elapsed;
    const rival = this.room.rs[1 - this.index];
    const behind = rival && rival.score > this.score ? 1.15 : 0.95;
    this.score += this.gain(dt, elapsed, behind);
    const msg: Record<string, unknown> = { t: "s", score: this.score };
    if (this.game === "stack") {
      // its pit fills up as its end comes near
      const full = Math.min(1, elapsed / this.endAt);
      this.heights = this.heights.map((_h, i) => Math.max(0, Math.min(20, Math.round(full * 17 + Math.sin(i * 1.7 + elapsed * 0.3) * 2 + Math.random() * 2))));
      msg.h = this.heights;
    }
    if (this.game === "swarm") msg.wave = 1 + Math.floor(elapsed / 25);
    if (this.game === "runner") msg.m = Math.round(this.metres);
    this.room.fromSeat(this.index, msg);
    if (elapsed >= this.nextAttack) {
      this.nextAttack = elapsed + (this.game === "smash" ? 7 + Math.random() * 7 : 14 + Math.random() * 12);
      const ev =
        this.game === "smash"
          ? { t: "ev", k: "bomb" }
          : this.game === "stack"
            ? { t: "ev", k: "junk", n: Math.random() < 0.7 ? 1 : 2 }
            : this.game === "swarm"
              ? { t: "ev", k: "swarm" }
              : { t: "ev", k: "rows", n: 1 };
      this.room.fromSeat(this.index, ev);
    }
    if (elapsed >= this.endAt) {
      this.stop();
      this.room.fromSeat(this.index, { t: "done", score: this.score });
    }
  }

  /** The player is done: the bot's run played out at once (to where it would have ended). */
  finishNow() {
    if (this.stopped) return;
    if (this.game === "golf") {
      while (this.hole < 9) {
        this.strokes += BotDriver.holeStrokes();
        this.hole++;
      }
      this.stop();
      this.room.fromSeat(this.index, { t: "done", score: 999 - this.strokes });
      return;
    }
    const left = Math.max(0, this.endAt - this.t);
    let at = this.t;
    while (at < this.t + left) {
      const dt = Math.min(1, this.t + left - at);
      at += dt;
      this.score += this.gain(dt, at, 1);
    }
    this.stop();
    this.room.fromSeat(this.index, { t: "done", score: this.score });
  }

  stop() {
    this.stopped = true;
    clearInterval(this.timer);
  }
}
