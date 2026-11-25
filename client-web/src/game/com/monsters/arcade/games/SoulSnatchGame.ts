import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { ArcadeArt, ArcadeGame, ArcadeWindow, ArenaGame, CasinoUI, IoQuests, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Soul Snatch (the Devil's Arcade, 7 October, the user's pick), drawn from the server's match
 * (server/src/services/arcade/soulsnatch.ts). Red's base on the left, Blue's on the right, each with its soul.
 * Touch theirs to carry it; bring it home while yours is safe. On your half, touch a raider to send them back;
 * what they carried drops there and stays until someone picks it up (its own team carries it home).
 * Space dashes. First to 3 captures.
 */
export class SoulSnatchGame extends ArenaGame {
    static {
        as3.fields(this, { _field: null, _bases: null, _baseR: 44, _rocks: null, _souls: null, _caps: null, _clock: 240, _board: null, _fx: null, _soulShapes: null, _flashes: null, _paused: false });
    }

    private _field: any[];
    private _bases: any[];
    private _baseR: number;
    private _rocks: any[];
    /** [x, y, home, carrier] for each team's soul. */
    private _souls: any[];
    private _caps: any[];
    private _clock: int;
    private _board: TextField;
    /** The two souls (each drawn once and moved) and the tag flashes (pooled). */
    private _fx: Sprite;
    private _soulShapes: any[];
    private _flashes: any[];
    /** The pause after a capture (nobody moves till "go"). */
    private _paused: boolean;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._field = [20, 34, 700, 412];
        this._bases = [];
        this._rocks = [];
        this._souls = [];
        this._caps = [0, 0];
        this._soulShapes = [];
        this._flashes = [];
        super.$ctor(win, mode, ctx);
    }

    protected override get actionLabel(): string {
        return "DASH";
    }

    protected override arenaStart(a: any, m: any): void {
        this._field = as3.as(a.field, Array);
        this._bases = as3.as(a.bases, Array);
        this._baseR = Number(a.baseR);
        this._rocks = as3.as(a.rocks, Array);
        this._souls = [[this._bases[0][0], this._bases[0][1], 1, -1], [this._bases[1][0], this._bases[1][1], 1, -1]];
        let x0: number = Number(this._field[0]);
        let y0: number = Number(this._field[1]);
        let x1: number = Number(this._field[2]);
        let y1: number = Number(this._field[3]);
        let mid: number = (x0 + x1) / 2;
        let f: Shape = as3.as(this._ground.addChild(new Shape()), Shape);
        let g: any = f.graphics;
        g.beginFill(0x0E0608, 1);
        g.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        g.endFill();
        // the two halves: Red's ember-lit, Blue's ghost-lit
        let mm: Matrix = new Matrix();
        mm.createGradientBox(x1 - x0, y1 - y0, 0, x0, y0);
        g.lineStyle(6, 0x2A1A1E, 1);
        g.beginGradientFill(GradientType.LINEAR, [0x3A1612, 0x2A1E22, 0x2A1E22, 0x12223A], [1, 1, 1, 1], [0, 120, 135, 255], mm);
        g.drawRoundRect(x0, y0, x1 - x0, y1 - y0, 24, 24);
        g.endFill();
        g.lineStyle(1, 0x000000, 0.25);
        let gx: number = x0 + 34;
        while (gx < x1) {
            g.moveTo(gx, y0 + 4);
            g.lineTo(gx, y1 - 4);
            gx += 34;
        }
        let gy: number = y0 + 34;
        while (gy < y1) {
            g.moveTo(x0 + 4, gy);
            g.lineTo(x1 - 4, gy);
            gy += 34;
        }
        // the middle line
        g.lineStyle(3, 0xE8DCC0, 0.45);
        let dy: number = y0 + 6;
        while (dy < y1 - 6) {
            g.moveTo(mid, dy);
            g.lineTo(mid, dy + 12);
            dy += 22;
        }
        // the bases
        let cols: any[] = [0xFF5A3A, 0x5AB0FF];
        let t: int = 0;
        while (t < 2) {
            let bm: Matrix = new Matrix();
            bm.createGradientBox(this._baseR * 2, this._baseR * 2, 0, this._bases[t][0] - this._baseR, this._bases[t][1] - this._baseR);
            g.lineStyle(3, cols[t] >>> 0, 0.9);
            g.beginGradientFill(GradientType.RADIAL, [cols[t] >>> 0, cols[t] >>> 0], [0.35, 0.05], [0, 255], bm);
            g.drawCircle(this._bases[t][0], this._bases[t][1], this._baseR);
            g.endFill();
            g.lineStyle(1, cols[t] >>> 0, 0.5);
            g.drawCircle(this._bases[t][0], this._bases[t][1], this._baseR * 0.6);
            t++;
        }
        g.lineStyle(0, 0, 0);
        for (let r of as3.values(this._rocks)) {
            g.beginFill(0x000000, 0.35);
            g.drawEllipse(r[0] - r[2], r[1] - r[2] * 0.4 + 6, r[2] * 2, r[2] * 1.1);
            g.endFill();
            let rm: Matrix = new Matrix();
            rm.createGradientBox(r[2] * 2, r[2] * 2, 0, r[0] - r[2] - 5, r[1] - r[2] - 8);
            g.lineStyle(2, 0x0A0608, 1);
            g.beginGradientFill(GradientType.RADIAL, [0x7A6A7A, 0x3A2E3E, 0x16101A], [1, 1, 1], [0, 130, 255], rm);
            g.drawCircle(r[0], r[1], r[2]);
            g.endFill();
            g.lineStyle(0, 0, 0);
        }
        f.cacheAsBitmap = true;
        // the painted field (arcade/souls/field.jpg: the halves, the bases' rings, the rocks) and souls
        // (soul_red.png, soul_blue.png): art/uikit/minigames.py, 11 October. (Painted for the server's field and
        // rocks, server/src/services/arcade/soulsnatch.ts.)
        let fieldArt: Sprite = as3.as(this._ground.addChild(new Sprite()), Sprite);
        CasinoUI.picture(fieldArt, "arcade/souls/field.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH, (b: any): void => {
            f.visible = false;
        });
        this._fx = new Sprite();
        this.addChildAt(this._fx, this.getChildIndex(this._over));
        let k: int = 0;
        while (k < 2) {
            let ss: Shape = as3.as(this._fx.addChild(new Shape()), Shape);
            SoulSnatchGame.drawSoul(ss.graphics, k);
            this._soulShapes.push(ss);
            k++;
        }
        for (let team: int = 0; team < 2; team++) {
            ArcadeArt.whenPicture(SoulSnatchGame.soulArt(team), (bmd: BitmapData): void => {
                let sh: Shape = as3.as(this._soulShapes[team], Shape);
                if (sh) {
                    sh.graphics.clear();
                    SoulSnatchGame.drawSoul(sh.graphics, team);
                }
            });
        }
        this._board = ArcadeGame.text(20, 16777215, 360, TextFormatAlign.CENTER);
        this._board.x = (ArcadeGame.GW - 360) / 2;
        this._board.y = 10;
        this._board.name = "soulScore";
        this.hud.addChild(this._board);
        let mine: int = this._players[this._you].team | 0;
        this._status.y = 384;
        // (QoL #235: the games' words in the player's language; team 0 is Red, on the left)
        this._status.text = KEYS.Get(mine == 0 ? "io_t3a_ss_you_red" : "io_t3a_ss_you_blue") + ". " + KEYS.Get(this.touch ? "io_t3a_ss_dash_touch" : "io_t3a_ss_dash_keys");
        this.board();
    }

    private board(): void {
        let mm: int = (this._clock / 60) | 0;
        let ss: int = (this._clock % 60) | 0;
        ArcadeGame.setHtml(this._board, "<font color='#FF6A4A'>" + KEYS.Get("io_t3a_red_n", { "v1": this._caps[0] }) + "</font>  <font color='#FFFFFF'>-</font>  <font color='#7AC0FF'>" + KEYS.Get("io_t3a_n_blue", { "v1": this._caps[1] }) + "</font>   <font color='#FFD58A' size='14'>" + mm + ":" + (ss < 10 ? "0" : "") + ss + "</font>");
    }

    protected override lookOf(i: int): any {
        let look: any = super.lookOf(i);
        look.color = ArenaGame.TEAM[(this._players[i].team | 0) % 2];
        return look;
    }

    protected override ownSpeed(): number {
        let f: int = this.mine.flags | 0;
        return Number((f & 4) != 0 || this._paused ? 0 : ((f & 8) != 0 ? this._speed * 0.8 : this._speed));
    }

    /** Sent back (jailed): faint (set once with the base's own; the two set it in turn every frame; 9 October). */
    protected override bodyAlpha(p: any): number {
        return ((p.flags | 0) & 4) != 0 ? 0.35 : super.bodyAlpha(p);
    }

    /** Sent back (jailed), or the pause after a capture: no lunge (the server takes none; 9 October). */
    protected override ownDashes(): boolean {
        return ((this.mine.flags | 0) & 4) == 0 && !this._paused;
    }

    protected override ownFree(x: number, y: number): boolean {
        for (let r of as3.values(this._rocks)) {
            let dx: number = x - r[0];
            let dy: number = y - r[1];
            if (dx * dx + dy * dy < (r[2] + this._radius) * (r[2] + this._radius)) {
                return false;
            }
        }
        return true;
    }

    protected override arenaState(msg: any): void {
        if (as3.is(msg.so, Array)) {
            this._souls = as3.as(msg.so, Array);
        }
        if (as3.is(msg.sc, Array)) {
            this._caps = as3.as(msg.sc, Array);
        }
        if (msg.cl != null) {
            this._clock = msg.cl | 0;
        }
        this.board();
    }

    protected override arenaEvent(e: any): void {
        let mineTeam: int = this._players[this._you].team | 0;
        if (e.e == "grab") {
            if ((e.by | 0) == this._you) {
                this.banner(KEYS.Get("io_t3a_ss_have_theirs"), 10289002, 60);
            } else if ((e.team | 0) == mineTeam) {
                this.banner(KEYS.Get("io_t3a_ss_stole", { "v1": this.nameOf(e.by | 0).toUpperCase() }), 16738906, 50);
            }
            SOUNDS.Play("click1", 0.6);
        } else if (e.e == "lift") {
            // (a soul dropped where its raider was caught, picked up by its own team to carry it home)
            if ((e.by | 0) == this._you) {
                this.banner(KEYS.Get("io_t3a_ss_have_yours"), 10289002, 50);
            }
            SOUNDS.Play("click1", 0.5);
        } else if (e.e == "tag" && (e.drop | 0) >= 0) {
            let dat: any[] = this.drawnAt(e.i | 0);
            this._flashes.push({ "x": dat[0], "y": dat[1], "life": 18 });
            this.float(KEYS.Get("io_t3a_ss_dropped"), Number(dat[0]), dat[1] - 34, 16766346);
            if ((e.i | 0) == this._you) {
                this.banner(KEYS.Get("io_t3a_ss_caught_drop"), 16747114, 40);
            }
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
        } else if (e.e == "cap") {
            this._paused = true;
            this.banner(KEYS.Get((e.team | 0) == mineTeam ? "io_t3a_ss_captured" : "io_t3a_ss_they_scored"), ((e.team | 0) == mineTeam ? 0x9CFF6A : 0xFF6A5A) >>> 0, 60);
            SOUNDS.Play((e.team | 0) == mineTeam ? "chaching" : "ihit2", 0.7);
        } else if (e.e == "tag") {
            let at: any[] = this.drawnAt(e.i | 0);
            this._flashes.push({ "x": at[0], "y": at[1], "life": 18 });
            if ((e.i | 0) == this._you) {
                this.banner(KEYS.Get("io_t3a_ss_caught_back"), 16747114, 40);
            } else if ((e.by | 0) == this._you) {
                this.float(KEYS.Get("io_t3a_ss_caught_n", { "v1": this.nameOf(e.i | 0) }), Number(at[0]), at[1] - 34, 10289002);
            }
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
        } else if (e.e == "go") {
            this._paused = false;
        } else if (e.e == "back" && e.by != null && (e.by | 0) == this._you) {
            this.float(KEYS.Get("io_t3a_ss_saved"), ArcadeGame.GW / 2, 80, 10289002);
        }
    }

    /** A soul round (0, 0): a glow, a teardrop flame with two eyes. */
    private static soulArt(t: int): string {
        return "arcade/souls/soul_" + (t == 0 ? "red" : "blue") + ".png";
    }

    private static drawSoul(g: any, t: int): void {
        let art: BitmapData = ArcadeArt.picture(SoulSnatchGame.soulArt(t));
        if (art) {
            ArcadeArt.stamp(g, art, -22, -23, 44, 44);
            return;
        }
        let col: uint = (t == 0 ? 0xFF5A3A : 0x5AB0FF) >>> 0;
        let core: uint = (t == 0 ? 0xFFD0A0 : 0xD0F0FF) >>> 0;
        let mm: Matrix = new Matrix();
        mm.createGradientBox(40, 40, 0, -20, -20);
        g.beginGradientFill(GradientType.RADIAL, [col, col], [0.6, 0], [0, 255], mm);
        g.drawCircle(0, 0, 20);
        g.endFill();
        g.lineStyle(1.5, 0xFFFFFF, 0.8);
        g.beginFill(col, 0.9);
        g.moveTo(0, -16);
        g.curveTo(11, -2, 7, 7);
        g.curveTo(0, 12, -7, 7);
        g.curveTo(-11, -2, 0, -16);
        g.endFill();
        g.lineStyle(0, 0, 0);
        g.beginFill(core, 0.9);
        g.drawEllipse(-4, -3, 8, 9);
        g.endFill();
        g.beginFill(0x000000, 0.8);
        g.drawCircle(-2.5, 0, 1.4);
        g.drawCircle(2.5, 0, 1.4);
        g.endFill();
    }

    private static drawFlash(g: any): void {
        g.lineStyle(3, 0xFFFFFF, 1);
        g.drawCircle(0, 0, 40);
    }

    /** The caught wait at their base, see-through, with a ring round them. */
    protected override badgeKey(i: int, p: any): string {
        return ((p.flags | 0) & 4) != 0 ? "jail" : "";
    }

    protected override drawBadge(i: int, p: any, g: any): void {
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.drawCircle(0, -this._radius * 0.6, this._radius + 6);
        g.lineStyle(0, 0, 0);
    }

    protected override drawLive(now: int): void {
        let t: int = 0;
        while (t < 2) {
            let s: any[] = as3.cast(this._souls[t], Array);
            let x: number = Number(s[0]);
            let y: number = Number(s[1]);
            let carrier: int = s[3] | 0;
            if (carrier >= 0) {
                let at: any[] = this.drawnAt(carrier);
                x = Number(at[0]);
                y = at[1] - this._radius * 2.6 - 26;
            }
            let sh: Shape = as3.cast(this._soulShapes[t], Shape);
            sh.x = x;
            sh.y = y + Math.sin(now / 220 + t) * 3;
            t++;
        }
        // a tag: a white ring spreading
        this.poolBegin();
        let keep: any[] = [];
        for (let fl of as3.values(this._flashes)) {
            fl.life--;
            if (fl.life <= 0) {
                continue;
            }
            keep.push(fl);
            let ring: Shape = this.poolShape(this._fx, "flash", SoulSnatchGame.drawFlash, Number(fl.x), Number(fl.y));
            ring.alpha = fl.life / 18;
            ring.scaleX = ring.scaleY = Math.max(0.05, (18 - fl.life) * 2.5 / 40);
        }
        this._flashes = keep;
        this.poolEnd();
    }

    /** Inferno-only quest book: the souls the player carried home this match. */
    protected override endQuest(msg: any, won: boolean): void {
        let st: any = msg.stats;
        let mine: any[] = st && st.mine ? as3.as(st.mine[this._you], Array) : null;
        if (mine && msg.reason != "left") {
            IoQuests.best("soul_caps", mine[0] | 0);
        }
    }

    protected override endLine(msg: any, won: boolean): string {
        let st: any = msg.stats;
        let caps: any[] = st && st.caps ? as3.as(st.caps, Array) : this._caps;
        let mine: any[] = st && st.mine ? as3.as(st.mine[this._you], Array) : [0, 0];
        return KEYS.Get("io_t3a_red_blue", { "v1": caps[0] | 0, "v2": caps[1] | 0 }) + (msg.reason == "left" ? " " + KEYS.Get("io_t3a_other_side_left") : "") + "\n" + KEYS.Get("io_t3a_ss_your_caps", { "v1": mine[0] | 0, "v2": mine[1] | 0 });
    }
}
