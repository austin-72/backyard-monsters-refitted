import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { ArcadeArt, ArcadeGame, ArcadeWindow, ArenaGame, CasinoUI, IoQuests, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Ember Hockey (the Devil's Arcade, 7 October, the user's pick), drawn from the server's match
 * (server/src/services/arcade/hockey.ts). Skate into the fireball to push it; Space shoots it when it is at
 * your feet (a lunge when it isn't). Red defends the left goal, Blue the right. First to 5, or the most after
 * three minutes.
 */
export class HockeyGame extends ArenaGame {
    static {
        as3.fields(this, { _rink: null, _goal: 124, _puckR: 11, _toWin: 5, _snaps: null, _trail: null, _score: null, _clock: 180, _puck: null, _board: null, _netFlash: null, _nets: null, _fx: null, _ready: null, _paused: false });
    }

    private _rink: any[];
    private _goal: number;
    private _puckR: number;
    private _toWin: int;
    private _snaps: any[];
    private _trail: any[];
    private _score: any[];
    private _clock: int;
    private _puck: Shape;
    private _board: TextField;
    private _netFlash: any[];
    private _nets: Shape;
    /** The fireball's trail (pooled embers), the ball itself and the shot-ready ring: each drawn once, moved. */
    private _fx: Sprite;
    private _ready: Shape;
    /** The pause after a goal (nobody moves till the face-off). */
    private _paused: boolean;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._rink = [30, 50, 690, 402];
        this._snaps = [];
        this._trail = [];
        this._score = [0, 0];
        this._netFlash = [0, 0];
        super.$ctor(win, mode, ctx);
    }

    protected override get actionLabel(): string {
        return "SHOOT";
    }

    protected override ownSpeed(): number {
        return Number(this._paused ? 0 : super.ownSpeed());
    }

    /** The fireball at its feet: the action is a shot, not a lunge (as the server has it). */
    protected override ownDashes(): boolean {
        return !this._paused && !(this._ready && this._ready.visible);
    }

    protected override lookOf(i: int): any {
        let look: any = super.lookOf(i);
        look.color = ArenaGame.TEAM[(this._players[i].team | 0) % 2];
        return look;
    }

    protected override arenaStart(a: any, m: any): void {
        this._rink = as3.as(a.rink, Array);
        this._goal = Number(a.goal);
        this._puckR = Number(a.puck);
        this._toWin = a.toWin | 0;
        let x0: number = Number(this._rink[0]);
        let y0: number = Number(this._rink[1]);
        let x1: number = Number(this._rink[2]);
        let y1: number = Number(this._rink[3]);
        let mid: number = (y0 + y1) / 2;
        let cx: number = (x0 + x1) / 2;
        let ice: Shape = as3.as(this._ground.addChild(new Shape()), Shape);
        let g: any = ice.graphics;
        g.beginFill(0x120808, 1);
        g.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        g.endFill();
        // the rink: dark obsidian, a red half and a blue half
        let mm: Matrix = new Matrix();
        mm.createGradientBox(x1 - x0, y1 - y0, 0, x0, y0);
        g.lineStyle(8, 0x3A2A2E, 1);
        g.beginGradientFill(GradientType.LINEAR, [0x3A1414, 0x2A2226, 0x14202E], [1, 1, 1], [0, 128, 255], mm);
        g.drawRoundRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 40, 40);
        g.endFill();
        g.lineStyle(2, 0xFF6A1A, 0.8);
        g.drawRoundRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 40, 40);
        // the lines
        g.lineStyle(4, 0xE8DCC0, 0.35);
        g.moveTo(cx, y0);
        g.lineTo(cx, y1);
        g.drawCircle(cx, mid, 52);
        g.lineStyle(3, 0xFF5A3A, 0.5);
        g.moveTo(x0 + 150, y0);
        g.lineTo(x0 + 150, y1);
        g.lineStyle(3, 0x5AB0FF, 0.5);
        g.moveTo(x1 - 150, y0);
        g.lineTo(x1 - 150, y1);
        // the creases in front of the goals
        g.lineStyle(2, 0xFF5A3A, 0.6);
        g.beginFill(0xFF5A3A, 0.12);
        g.drawCircle(x0, mid, this._goal * 0.62);
        g.endFill();
        g.lineStyle(2, 0x5AB0FF, 0.6);
        g.beginFill(0x5AB0FF, 0.12);
        g.drawCircle(x1, mid, this._goal * 0.62);
        g.endFill();
        g.lineStyle(0, 0, 0);
        // the goals' mouths: the boards open, a net behind
        g.beginFill(0x0A0406, 1);
        g.drawRect(x0 - 26, mid - this._goal / 2, 24, this._goal);
        g.drawRect(x1 + 2, mid - this._goal / 2, 24, this._goal);
        g.endFill();
        ice.cacheAsBitmap = true;
        // the painted rink (arcade/hockey/rink.jpg) and fireball (puck.png): art/uikit/minigames.py, 11 October.
        // (Painted for the server's rink, server/src/services/arcade/hockey.ts: 30, 50 to 690, 402, goals 124.)
        let rinkArt: Sprite = as3.as(this._ground.addChild(new Sprite()), Sprite);
        CasinoUI.picture(rinkArt, "arcade/hockey/rink.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH, (b: any): void => {
            ice.visible = false;
        });
        this._nets = as3.as(this._ground.addChild(new Shape()), Shape);
        this.drawNets();
        this._fx = new Sprite();
        this.addChildAt(this._fx, this.getChildIndex(this._over));
        this._puck = as3.as(this._fx.addChild(new Shape()), Shape);
        this.drawPuck(this._puck.graphics, this._puckR);
        ArcadeArt.whenPicture("arcade/hockey/puck.png", (bmd: BitmapData): void => {
            if (this._puck) {
                this._puck.graphics.clear();
                this.drawPuck(this._puck.graphics, this._puckR);
            }
        });
        this._puck.visible = false;
        this._ready = as3.as(this._fx.addChild(new Shape()), Shape);
        this._ready.graphics.lineStyle(2, 16769152, 0.9);
        this._ready.graphics.drawCircle(0, 0, this._puckR + 5);
        this._ready.visible = false;
        this._board = ArcadeGame.text(20, 16777215, 360, TextFormatAlign.CENTER);
        this._board.x = (ArcadeGame.GW - 360) / 2;
        this._board.y = 12;
        this._board.name = "hockeyScore";
        this.hud.addChild(this._board);
        this._status.text = "";
        this.board();
    }

    private drawNets(): void {
        let g: any = this._nets.graphics;
        g.clear();
        let y0: number = Number(this._rink[1]);
        let y1: number = Number(this._rink[3]);
        let mid: number = (y0 + y1) / 2;
        let sides: any[] = [[this._rink[0] - 26, 0], [this._rink[2] + 2, 1]];
        for (let s of as3.values(sides)) {
            let lit: number = Number(this._netFlash[s[1]]);
            let col: uint = (s[1] == 0 ? 0xFF5A3A : 0x5AB0FF) >>> 0;
            g.lineStyle(1, lit > 0 ? 0xFFE080 : col, 0.5 + lit * 0.5);
            let yy: number = mid - this._goal / 2;
            while (yy <= mid + this._goal / 2) {
                g.moveTo(s[0], yy);
                g.lineTo(s[0] + 24, yy);
                yy += 8;
            }
            let xx: number = Number(s[0]);
            while (xx <= s[0] + 24) {
                g.moveTo(xx, mid - this._goal / 2);
                g.lineTo(xx, mid + this._goal / 2);
                xx += 8;
            }
            g.lineStyle(4, col, 1);
            g.moveTo(s[1] == 0 ? s[0] + 24 : s[0], mid - this._goal / 2);
            g.lineTo(s[1] == 0 ? s[0] : s[0] + 24, mid - this._goal / 2);
            g.lineTo(s[1] == 0 ? s[0] : s[0] + 24, mid + this._goal / 2);
            g.lineTo(s[1] == 0 ? s[0] + 24 : s[0], mid + this._goal / 2);
        }
        g.lineStyle(0, 0, 0);
    }

    private board(): void {
        let mm: int = this._clock < 0 ? 0 : (this._clock / 60) | 0;
        let ss: int = (this._clock < 0 ? 0 : this._clock % 60) | 0;
        // (QoL #235: the games' words in the player's language)
        let t: string = this._clock < 0 ? KEYS.Get("io_t3a_ho_next_goal") : mm + ":" + (ss < 10 ? "0" : "") + ss;
        ArcadeGame.setHtml(this._board, "<font color='#FF6A4A'>" + KEYS.Get("io_t3a_red_n", { "v1": this._score[0] }) + "</font>  <font color='#FFFFFF'>-</font>  <font color='#7AC0FF'>" + KEYS.Get("io_t3a_n_blue", { "v1": this._score[1] }) + "</font>   <font color='#FFD58A' size='14'>" + t + "</font>");
    }

    protected override arenaState(msg: any): void {
        if (as3.is(msg.pk, Array)) {
            this._snaps.push([Number(msg.k), Number(msg.pk[0]) / 10, Number(msg.pk[1]) / 10]);
            if (this._snaps.length > 24) {
                this._snaps.shift();
            }
        }
        if (as3.is(msg.sc, Array)) {
            this._score = as3.as(msg.sc, Array);
        }
        if (msg.cl != null) {
            this._clock = msg.cl | 0;
        }
        this.board();
    }

    protected override arenaEvent(e: any): void {
        if (e.e == "goal") {
            let team: int = e.team | 0;
            let mineTeam: int = this._players[this._you].team | 0;
            let by: int = e.by | 0;
            this.banner(by >= 0 ? KEYS.Get("io_t3a_ho_goal_by", { "v1": this.nameOf(by).toUpperCase() }) : KEYS.Get("io_t3a_ho_goal"), (team == mineTeam ? 0x9CFF6A : 0xFF6A5A) >>> 0, 70);
            this._netFlash[1 - team] = 1;
            this._paused = true;
            SOUNDS.Play(team == mineTeam ? "chaching" : "ihit2", 0.7);
            this._trail = [];
        } else if (e.e == "shot") {
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.5);
        } else if (e.e == "faceoff") {
            this._paused = false;
            // (the face-off's own place kept: it came in this message before the event, and clearing it hid the
            // fireball a step; 9 October)
            this._snaps = this._snaps.length ? [this._snaps[this._snaps.length - 1]] : [];
            this._trail = [];
        }
    }

    /** The fireball, round (0, 0): its shadow, its glow and the ball. */
    private drawPuck(g: any, r: number): void {
        g.beginFill(0x000000, 0.3);
        g.drawEllipse(-r, -r * 0.3 + 4, r * 2, r * 0.9);
        g.endFill();
        let art: BitmapData = ArcadeArt.picture("arcade/hockey/puck.png");
        if (art) {
            // (painted for an 11 px fireball and its glow: 40 px across)
            let k: number = r / 11;
            ArcadeArt.stamp(g, art, -20 * k, -20 * k, 40 * k, 40 * k);
            return;
        }
        let mm: Matrix = new Matrix();
        mm.createGradientBox(r * 3, r * 3, 0, -r * 1.5, -r * 1.5);
        g.beginGradientFill(GradientType.RADIAL, [0xFFB040, 0xFF5A1A], [0.5, 0], [0, 255], mm);
        g.drawCircle(0, 0, r * 1.5);
        g.endFill();
        let m2: Matrix = new Matrix();
        m2.createGradientBox(r * 2, r * 2, 0, -r - 2, -r - 2);
        g.lineStyle(1.5, 0x6A1A06, 1);
        g.beginGradientFill(GradientType.RADIAL, [0xFFF0B0, 0xFFA030, 0xE0401A], [1, 1, 1], [0, 120, 255], m2);
        g.drawCircle(0, 0, r);
        g.endFill();
        g.lineStyle(0, 0, 0);
    }

    private static drawEmber(g: any): void {
        g.beginFill(0xFF6A1A, 1);
        g.drawCircle(0, 0, 10);
        g.endFill();
    }

    protected override drawLive(now: int): void {
        if (this._netFlash[0] > 0 || this._netFlash[1] > 0) {
            this._netFlash[0] = Math.max(0, this._netFlash[0] - 0.02);
            this._netFlash[1] = Math.max(0, this._netFlash[1] - 0.02);
            this.drawNets();
        }
        this.poolBegin();
        if (!this._snaps.length) {
            this._puck.visible = false;
            this._ready.visible = false;
            this.poolEnd();
            return;
        }
        // the fireball on the monsters' clock
        let rk: number = this._rk;
        let sn: any[] = this._snaps;
        let j: int = (sn.length - 1) | 0;
        while (j > 0 && sn[j][0] > rk) {
            j--;
        }
        let x: number = Number(sn[j][1]);
        let y: number = Number(sn[j][2]);
        if (j < sn.length - 1 && rk > sn[j][0]) {
            let f: number = (rk - sn[j][0]) / Math.max(1, sn[j + 1][0] - sn[j][0]);
            x += (sn[j + 1][1] - x) * f;
            y += (sn[j + 1][2] - y) * f;
        }
        // (the fireball is drawn a little in the past, the player's own monster in the present: where they would
        // overlap on screen it is drawn against the monster, not through it; 7 October)
        let mine: any = this.mine;
        if (mine && mine.alive) {
            let ox: number = x - Number(mine.dx);
            let oy: number = y - Number(mine.dy);
            let od: number = Math.sqrt(ox * ox + oy * oy);
            let omin: number = this._radius + this._puckR;
            if (od < omin) {
                let onx: number = Number(od > 0.01 ? ox / od : 1);
                let ony: number = Number(od > 0.01 ? oy / od : 0);
                x = Number(mine.dx) + onx * omin;
                y = Number(mine.dy) + ony * omin;
            }
        }
        this._trail.push([x, y]);
        if (this._trail.length > 9) {
            this._trail.shift();
        }
        let i: int = 0;
        while (i < this._trail.length - 1) {
            let t: any[] = as3.cast(this._trail[i], Array);
            let a: number = (i + 1) / this._trail.length;
            let em: Shape = this.poolShape(this._fx, "ember", HockeyGame.drawEmber, Number(t[0]), Number(t[1]));
            em.alpha = a * 0.35;
            em.scaleX = em.scaleY = this._puckR * (0.4 + a * 0.6) / 10;
            i++;
        }
        this.poolEnd();
        // the ball over its trail
        if (this._fx.getChildIndex(this._puck) != this._fx.numChildren - 2) {
            this._fx.setChildIndex(this._puck, (this._fx.numChildren - 1) | 0);
            this._fx.setChildIndex(this._ready, (this._fx.numChildren - 1) | 0);
        }
        this._puck.visible = true;
        this._puck.x = x;
        this._puck.y = y;
        // a shot ready: a ring at the player's feet
        let r: number = this._puckR;
        let me: any = this.mine;
        let near: boolean = false;
        if (me.alive && ((me.flags | 0) & 4) == 0) {
            let dx: number = x - Number(me.dx);
            let dy: number = y - Number(me.dy);
            near = dx * dx + dy * dy < (this._radius + r + 16) * (this._radius + r + 16);
        }
        this._ready.visible = near;
        if (near) {
            this._ready.x = x;
            this._ready.y = y;
        }
    }

    /** Inferno-only quest book: a win without a goal let in. */
    protected override endQuest(msg: any, won: boolean): void {
        let st: any = msg.stats;
        let goals: any[] = st && st.goals ? as3.as(st.goals, Array) : this._score;
        let team: int = this._players[this._you].team | 0;
        if (won && msg.reason != "left" && goals && goals.length > 1 && (goals[1 - team] | 0) == 0) {
            IoQuests.event("hockey_shutout");
        }
    }

    protected override endLine(msg: any, won: boolean): string {
        let st: any = msg.stats;
        let goals: any[] = st && st.goals ? as3.as(st.goals, Array) : this._score;
        let scorers: any[] = st && st.scorers ? as3.as(st.scorers, Array) : [];
        let mine: int = scorers.length > this._you ? scorers[this._you] | 0 : 0;
        return KEYS.Get("io_t3a_red_blue", { "v1": goals[0] | 0, "v2": goals[1] | 0 }) + (msg.reason == "left" ? " " + KEYS.Get("io_t3a_other_side_left") : "") + "\n" + KEYS.Get("io_t3a_ho_your_goals", { "v1": mine });
    }
}
