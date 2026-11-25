import * as as3 from "as3";
import { int, uint } from "as3";
import { Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ArcadeNet, ArcadeWindow, CasinoUI, GLOBAL, IoPinchZoom, IoTouchPad, KEYS } from "@game";

/**
 * Inferno-only: what every Devil's Arcade game is (com/monsters/arcade/games). A game draws itself in a
 * GW x GH area of the arcade window (ArcadeWindow), which calls `tick` every frame with the milliseconds since
 * the last, passes the keys pressed and released, and the live games' messages (`onNet`). The game says when
 * it is over (`over`) with its result, and the window shows it and records it.
 *
 * Games that run themselves (Smash, Breakout, Flight) step at a fixed 60 a second (`fixed`), so the same seed
 * plays out the same on every machine, whatever its frame rate.
 */
export class ArcadeGame extends Sprite {
    static {
        as3.fields(this, { win: null, mode: null, ctx: null, ended: false, _acc: 0, keys: null, _rng: 1, hud: null, _banner: null, _bannerT: 0, pad: null, _bannerColor: -1, _clockOff: NaN, _period: NaN, _arrivals: null, _jitter: 0, _delay: NaN, rtt: 100, _rttSeen: false, _lastPing: -100000, _pools: null, _leave: null, _ioLeave: null, _ioWatch: null, _ioPadOpts: null });
    }

    public static readonly GW: int = 720;

    public static readonly GH: int = 420;

    public static readonly STEP: number = 1000 / 60;
    protected win: ArcadeWindow;
    public mode: string;
    /** What the game was started with: {run, seed} for a solo run, the server's "start" message for a live one. */
    protected ctx: any;
    public ended: boolean;
    private _acc: number;
    protected keys: any;
    private _rng: number;
    protected hud: Sprite;
    private _banner: TextField;
    private _bannerT: int;
    /** The on-screen controls, on phones and tablets (touchControls), or null. */
    protected pad: IoTouchPad;
    /** A big line across the middle for a moment (frames: how long, at 40 a second). */
    private _bannerColor: int;
    // ---- live games (Wormzer, Fusebug Blast): the server's clock and the round trip
    //
    // The server numbers its steps (k). Drawing by arrival time stutters whenever a message is late (the
    // next one comes right behind it); instead the games draw a fixed few steps behind the server's clock,
    // between the two steps either side, so a late message is waited for, not jumped over.
    /** Local time (getTimer) at which the server's step 0 would have arrived the quickest way seen. */
    private _clockOff: number;
    /** The server's step as it really runs (its timers drift a little from the nominal step): ms. */
    private _period: number;
    /** The last few seconds of arrivals: [k, getTimer()]. */
    private _arrivals: any[];
    /** How late messages come after the quickest (the slowest tenth left out): ms. */
    private _jitter: number;
    /** The delay drawn at (steps), following the link: see stepDelay. */
    private _delay: number;
    /** The round trip to the server (ms), from pings. */
    protected rtt: number;
    private _rttSeen: boolean;
    private _lastPing: int;
    // ---- drawing helpers
    /**
     * Small things that move about (a shot, an ember, a bone in the air): each a little shape drawn once and only
     * moved after, taken from a pool by kind and given back at the end of the frame (7 October, performance: one
     * big shape drawn again every frame with them all in it made the renderer redraw everything it spanned).
     * Each frame: poolBegin(), poolShape() for each thing shown, poolEnd() (the ones not used are hidden).
     */
    private _pools: any;
    private _leave: Sprite;
    /** Inferno-only (QoL #370): knocked out, the match going on: LEAVE, and the line saying it is watched. */
    private _ioLeave: Sprite;
    private _ioWatch: TextField;
    /** Inferno-only (QoL #221): the controls this game asked for, kept for a touch that comes during the game. */
    private _ioPadOpts: any;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this.keys = {};
        this._clockOff = NaN;
        this._period = NaN;
        this._arrivals = [];
        this._delay = NaN;
        this._pools = {};
        super.$ctor();
        this.win = win;
        this.mode = mode;
        this.ctx = ctx;
        this.seed((ctx && ctx.seed ? ctx.seed : 1) | 0);
        // the area: everything outside it is clipped
        let m: Shape = new Shape();
        m.graphics.beginFill(0);
        m.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        m.graphics.endFill();
        this.addChild(m);
        this.mask = m;
        this.hud = new Sprite();
        this.hud.mouseEnabled = false;
    }

    /** Puts the HUD on top (call after the game's own layers are added). */
    protected topHud(): void {
        this.addChild(this.hud);
        this._banner = CasinoUI.label("", 30, 16777215, false, ArcadeGame.GW, TextFormatAlign.CENTER, "Groboldov");
        this._banner.height = 50;
        this._banner.y = ArcadeGame.GH / 2 - 40;
        this._banner.filters = [new GlowFilter(0x6A1404, 1, 6, 6, 8, 2)];
        this.addChild(this._banner);
    }

    /**
     * Inferno-only: on phones and tablets (GLOBAL.ioOnPhone), on-screen controls that press this game's keys
     * (IoTouchPad: opts {stick, buttons}). Call after topHud: they go on top. Nothing on a computer.
     * (QoL #221: and on any device a finger has touched in this visit (a touch laptop, an iPad with a keyboard:
     * IoPinchZoom.touched); a first touch during the game brings them then, from tick)
     */
    protected touchControls(opts: any): void {
        if (GLOBAL.INFERNO_ONLY) {
            this._ioPadOpts = opts;
        }
        if (!(GLOBAL.ioOnPhone || (GLOBAL.INFERNO_ONLY && IoPinchZoom.touched)) || this.pad) {
            return;
        }
        this.pad = new IoTouchPad(this, opts);
        this.addChild(this.pad);
    }

    /** Is this game played with the on-screen controls? */
    protected get touch(): boolean {
        return this.pad != null;
    }

    protected banner(text: string, color: uint = 16766346, frames: int = 60): void {
        if (!this._banner) {
            return;
        }
        // (the same again, as the countdown's is every frame: not set again, which laid the glowing text out anew;
        // 9 October)
        if (this._banner.text != text || this._bannerColor != color) {
            this._banner.text = text;
            this._banner.textColor = color;
            this._bannerColor = color;
            // (QoL #235: a longer translation drawn smaller, not cut at the area's edges)
            GLOBAL.ioFitText(this._banner, 16);
        }
        this._banner.visible = true;
        this._banner.alpha = 1;
        this._bannerT = frames;
    }

    /** Every frame, from the window. */
    public tick(ms: number): void {
        // (QoL #221: the first touch of the visit came during this game: its controls now)
        if (!this.pad && this._ioPadOpts && !this.ended && IoPinchZoom.touched) {
            this.touchControls(this._ioPadOpts);
        }
        if (this.pad) {
            if (this.pad.parent == this && this.getChildIndex(this.pad) != this.numChildren - 1) {
                this.addChild(this.pad);
            }
            // (gone with the game: not over the result)
            if (this.ended && this.pad.visible) {
                this.pad.releaseAll();
                this.pad.visible = false;
            }
        }
        if (this._bannerT > 0) {
            this._bannerT--;
            if (this._bannerT < 10) {
                this._banner.alpha = this._bannerT / 10;
            }
            if (this._bannerT == 0) {
                this._banner.visible = false;
            }
        }
        if (this.ended) {
            return;
        }
        this._acc += Math.min(ms, 250);
        while (this._acc >= ArcadeGame.STEP) {
            this._acc -= ArcadeGame.STEP;
            this.fixed();
            if (this.ended) {
                break;
            }
        }
        this.draw(this._acc / ArcadeGame.STEP);
    }

    /** One step of the game (60 a second). */
    protected fixed(): void {
    }

    /** Draws the game (alpha: how far into the next step). */
    protected draw(alpha: number): void {
    }

    public keyDown(code: int): void {
        this.keys[code] = true;
    }

    public keyUp(code: int): void {
        delete this.keys[code];
    }

    /** Every key held let go (the window lost the focus: its key-ups never come; 9 October). */
    public releaseKeys(): void {
        let held: any[] = [];
        for (let k in this.keys) {
            held.push(Number(k) | 0);
        }
        for (const $value of as3.values(held)) {
            let code: int = $value | 0;
            this.keyUp(code);
        }
    }

    protected key(code: int): boolean {
        return Boolean(this.keys[code]);
    }

    public onNet(msg: any): void {
    }

    /** The game is over: the window shows the result. result: {score, score2, ghost, ...}. */
    protected over(result: any): void {
        if (this.ended) {
            return;
        }
        this.ended = true;
        if (this._leave) {
            this._leave.visible = false;
        }
        if (this._ioLeave) {
            this._ioLeave.visible = false;
            this._ioWatch.visible = false;
        }
        this.win.gameOver(this, result);
    }

    public destroy(): void {
        this.ended = true;
        if (this.pad) {
            this.pad.releaseAll();
            if (this.pad.parent) {
                this.pad.parent.removeChild(this.pad);
            }
            this.pad = null;
        }
        this.keys = {};
    }

    /**
     * A message of the server's step k (nominally stepMs apart) arrived now. The clock: the step's real length
     * from the last few seconds of arrivals, and when step 0 would have come by the quickest arrival among
     * them (moved there gently, so what is drawn never jumps).
     */
    protected stepSeen(k: number, stepMs: number): void {
        let now: number = getTimer();
        let arr: any[] = this._arrivals;
        if (arr.length && k <= Number(arr[arr.length - 1][0])) {
            return;
        }
        arr.push([k, now]);
        while (arr.length > 2 && Number(arr[arr.length - 1][0]) - Number(arr[0][0]) > 4000 / stepMs) {
            arr.shift();
        }
        let first: any[] = as3.cast(arr[0], Array);
        let span: number = k - Number(first[0]);
        let period: number = stepMs;
        if (span >= 20) {
            period = Math.max(stepMs * 0.8, Math.min(stepMs * 1.25, (now - Number(first[1])) / span));
        }
        this._period = isNaN(this._period) ? period : this._period + (period - this._period) * 0.1;
        let quickest: number = Infinity;
        for (let a of as3.values(arr)) {
            quickest = Math.min(quickest, Number(a[1]) - Number(a[0]) * this._period);
        }
        if (isNaN(this._clockOff) || Math.abs(quickest - this._clockOff) > 1000) {
            this._clockOff = quickest;
        } else {
            // (at most 2 ms a message: the drawn time slows or quickens a little, never jumps)
            this._clockOff += Math.max(-2, Math.min(2, quickest - this._clockOff));
        }
        // how bumpy the link is: how late the arrivals were after the quickest (nine in ten at most this late)
        let late: any[] = [];
        for (let b of as3.values(arr)) {
            late.push(Math.max(0, Number(b[1]) - (this._clockOff + Number(b[0]) * this._period)));
        }
        as3.sort(late, Array.NUMERIC);
        this._jitter = Number(late[Math.min(late.length - 1, (late.length * 0.9) | 0)]);
    }

    /**
     * How far behind the server's clock to draw (steps), at least `least`: enough for the link's bumps, so a
     * late message is still in time. It grows at once when the link gets bumpier and shrinks slowly after.
     */
    protected stepDelay(least: number): number {
        let p: number = Number(isNaN(this._period) ? 50 : this._period);
        let want: number = Math.min(8, Math.max(least, (this._jitter + 15) / p + 0.5));
        if (isNaN(this._delay) || want > this._delay) {
            this._delay = isNaN(this._delay) ? want : this._delay + (want - this._delay) * 0.25;
        } else {
            this._delay += (want - this._delay) * 0.01;
        }
        return this._delay;
    }

    /** The server step to draw now (with a fraction): `delay` steps behind the newest that should be here. */
    protected stepNow(stepMs: number, delay: number): number {
        return Number(isNaN(this._clockOff) ? 0 : (getTimer() - this._clockOff) / this._period - delay);
    }

    /** When (getTimer) the server's step k arrives here the quickest way. */
    protected stepTime(k: number, stepMs: number): number {
        return Number(isNaN(this._clockOff) ? getTimer() : this._clockOff + k * this._period);
    }

    /** Every couple of seconds a ping (its answer times the round trip). */
    protected pingNow(): void {
        let now: int = getTimer();
        if (now - this._lastPing > 2000) {
            this._lastPing = now;
            ArcadeNet.send({ "t": "ping", "c": now });
        }
    }

    /** A ping's answer: the round trip, smoothed. */
    protected pong(msg: any): void {
        let r: number = getTimer() - Number(msg.c);
        if (isNaN(r) || r < 0 || r > 5000) {
            return;
        }
        this.rtt = this._rttSeen ? this.rtt * 0.7 + r * 0.3 : r;
        this._rttSeen = true;
    }

    // ---- a random stream from the seed (the same seed makes the same numbers everywhere)
    protected seed(s: int): void {
        this._rng = Math.max(1, Math.abs(s) % 2147483646);
    }

    /** 0 <= n < 1 */
    protected rnd(): number {
        this._rng = (this._rng * 16807) % 2147483647;
        return (this._rng - 1) / 2147483646;
    }

    protected rint(n: int): int {
        return (this.rnd() * n) | 0;
    }

    protected poolBegin(): void {
        for (let k in this._pools) {
            this._pools[k].used = 0;
        }
    }

    /** A shape of `kind` (drawn by draw(graphics) the first time) at (x, y), in `layer`. */
    /** Draws a pool's shapes again (a picture they show has come in since they were made). */
    protected poolRedraw(kind: string, draw: Function): void {
        let p: any = this._pools[kind];
        if (!p) {
            return;
        }
        for (const sh of as3.values(p.shapes)) {
            (sh as Shape).graphics.clear();
            draw((sh as Shape).graphics);
        }
    }

    protected poolShape(layer: Sprite, kind: string, draw: Function, x: number, y: number): Shape {
        let p: any = this._pools[kind];
        if (!p) {
            p = { "shapes": [], "used": 0 };
            this._pools[kind] = p;
        }
        let s: Shape = null;
        if (p.used < p.shapes.length) {
            s = as3.cast(p.shapes[p.used], Shape);
        } else {
            s = new Shape();
            draw(s.graphics);
            layer.addChild(s);
            p.shapes.push(s);
        }
        p.used++;
        if (!s.visible) {
            s.visible = true;
        }
        s.x = x;
        s.y = y;
        return s;
    }

    protected poolEnd(): void {
        for (let p of as3.values(this._pools)) {
            let i: int = p.used | 0;
            while (i < p.shapes.length) {
                if (p.shapes[i].visible) {
                    p.shapes[i].visible = false;
                }
                i++;
            }
        }
    }

    /** Sets a text only when it changes (setting one, even to what it shows, draws it again). */
    public static setText(t: TextField, s: string): void {
        CasinoUI.setText(t, s);
    }

    public static setHtml(t: TextField, s: string): void {
        CasinoUI.setHtml(t, s);
    }

    protected static text(size: int, color: uint, width: int, align: string = "left", font: string = "Groboldov"): TextField {
        let t: TextField = CasinoUI.label("", size, color, true, width, align, font);
        t.filters = [new GlowFilter(0x000000, 0.9, 4, 4, 6, 2)];
        return t;
    }

    /**
     * Inferno-only (QoL #235): a versus result's line in the player's language: "You 1,200  ·  Rival 900", and
     * under it "(Rival left)" or "(you left)" when one side left.
     */
    protected static ioVsLine(mine: string, rival: string, theirs: string, left: boolean, won: boolean): string {
        return KEYS.Get("io_t3a_vs_line", { "v1": mine, "v2": rival, "v3": theirs }) + (left ? "\n" + (won ? KEYS.Get("io_t3a_vs_rival_left", { "v1": rival }) : KEYS.Get("io_t3a_vs_you_left")) : "");
    }

    /**
     * Done, the rival still playing: a LEAVE button (9 October: the only way out was closing the arcade, up to
     * the match's limit; the server keeps a finished player's score when they go).
     */
    protected leaveButton(): void {
        let w: ArcadeWindow = null;
        if (this._leave || !this.hud) {
            return;
        }
        w = this.win;
        // (QoL #235: in the player's language, as the knocked-out LEAVE is)
        this._leave = this.smallButton(KEYS.Get("io_arc_leave"), ArcadeGame.GW / 2 - 45, ArcadeGame.GH - 38, 90, (e: any): void => {
            if (w) {
                w.leaveGame();
            }
        });
        this._leave.name = "arcadeLeave";
        this.hud.addChild(this._leave);
    }

    /**
     * Inferno-only (QoL #370): knocked out while the match goes on (an arena, Fusebug Blast): a LEAVE button at (x, y)
     * (back to the game's page, as the result's BACK does; the server keeps the loss it already was) and a line over
     * it saying the match is being watched (it goes on being drawn). `tw`: the line's width, centred on the button.
     */
    protected ioOutLeave(x: number, y: number, tw: int = 240): void {
        let w: ArcadeWindow = null;
        if (!GLOBAL.INFERNO_ONLY || this._ioLeave || this.ended || !this.hud) {
            return;
        }
        w = this.win;
        this._ioLeave = this.smallButton(KEYS.Get("io_arc_leave"), x, y, 90, (e: any): void => {
            if (w) {
                w.leaveGame();
            }
        });
        this._ioLeave.name = "ioArcLeave";
        this.hud.addChild(this._ioLeave);
        this._ioWatch = ArcadeGame.text(12, 15655632, tw, TextFormatAlign.CENTER);
        this._ioWatch.name = "ioArcSpectate";
        this._ioWatch.multiline = true;
        this._ioWatch.wordWrap = true;
        this._ioWatch.mouseEnabled = false;
        this._ioWatch.height = 36;
        this._ioWatch.text = KEYS.Get("io_arc_watching");
        this._ioWatch.x = x + 45 - tw / 2;
        this._ioWatch.y = y - (tw < 160 ? 36 : 22);
        this.hud.addChild(this._ioWatch);
    }

    /** Inferno-only (QoL #370): the LEAVE shown while knocked out (null until then). */
    public get ioOutLeaveButton(): Sprite {
        return this._ioLeave;
    }

    /** A small round button drawn in the game area (Pause, Quit): it stops the click going to the game. */
    protected smallButton(label: string, x: number, y: number, w: int, onClick: Function): Sprite {
        let b: Sprite = CasinoUI.button(label, w, 26, (e: MouseEvent): void => {
            e.stopPropagation();
            onClick(e);
        }, true, 12);
        b.x = x;
        b.y = y;
        b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        return b;
    }
}
