import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, GLOBAL, ImageCache, IoAutoPlay, KEYS, SOUNDS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * Magma Drop (Plinko): a Spurtz dropped through ten rows of obsidian pegs into one of eleven lava cups.
 * The server draws the ten bounces (server/src/services/casino/games/magmaDrop.ts) and pays the cup's
 * multiplier; this plays the path it sends. Several balls may fall at once. The Shiny shown drops by
 * the bet when a ball is sent and rises by its prize when it lands.
 */
export class MagmaDropGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _risk: "low", _riskButtons: null, _drop: null, _board: null, _pegs: null, _cups: null, _balls: null, _sparks: null, _results: null, _last: null, _spurtz: null, _pending: 0, _serverCredits: -1, _lastNonce: -1, _ioAuto: null, _ioAutoDrop: false });
    }

    private static readonly ROWS: int = 10;

    private static readonly SP: number = 36;

    private static readonly ROW_H: number = 29;

    /** The board, from the content area's top left. */
    private static readonly BX: int = 220;

    private static readonly BW: int = 480;

    private static readonly BH: int = 400;

    /** Pegs' top row and the cups' line, in the board. */
    private static readonly TOP: number = 44;

    private static readonly CUP_Y: number = MagmaDropGame.TOP + MagmaDropGame.ROWS * MagmaDropGame.ROW_H + 14;

    private static readonly FRAMES_PER_ROW: int = 7;

    /** QoL #389: with QUICK on (a ball dropped then keeps it to its cup). */
    private static readonly IO_QUICK_FRAMES: int = 2;

    /** Spurtz in the air at once (was 6; 3 October: 20). */
    private static readonly MAX_IN_FLIGHT: int = 20;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _risk: string;
    private _riskButtons: any;
    private _drop: Sprite;
    private _board: Sprite;
    private _pegs: any[];
    private _cups: any[];
    private _balls: any[];
    private _sparks: any[];
    private _results: Sprite;
    private _last: any[];
    private _spurtz: BitmapData;
    private _pending: int;
    private _serverCredits: int;
    private _lastNonce: number;
    /** Inferno-only (QoL #388): AUTO, a run of drops with the player's stop rules. */
    private _ioAuto: IoAutoPlay;
    /** QoL #388: the drop being sent is the run's. */
    private _ioAutoDrop: boolean;

    public $ctor(win?: CasinoWindow): void {
        this._riskButtons = {};
        this._pegs = [];
        this._cups = [];
        this._balls = [];
        this._sparks = [];
        this._last = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoMagmaDrop";
        // controls
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button(KEYS.Get("io_t3c_lobby"), 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        // (QoL #390: "?", the rules and pays)
        if (GLOBAL.INFERNO_ONLY) {
            CasinoUI.ioRulesButton(p, as3.bind(this, this.ioRules));
            // (QoL #389: QUICK, a ball falls in a third of the time)
            CasinoUI.ioQuickToggle(p, "magmadrop");
        }
        p.addChild(CasinoUI.at(CasinoUI.label("MAGMA DROP", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_bet_label"), 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_risk"), 11, CasinoUI.EMBER, true, 190), 12, 212));
        let risks: any[] = ["low", "medium", "high"];
        let i: int = 0;
        while (i < risks.length) {
            let r: Sprite = CasinoUI.toggle(MagmaDropGame.ioRisk(as3.str(risks[i])), 60, 26, this.riskClick(as3.str(risks[i])));
            r.x = 10 + i * 64;
            r.y = 228;
            p.addChild(r);
            this._riskButtons[risks[i]] = r;
            i++;
        }
        // (Inferno-only, QoL #388: DROP narrower, AUTO beside it, as Magma Slots' SPIN and AUTO)
        this._drop = CasinoUI.button(KEYS.Get("io_t3c_drop"), GLOBAL.INFERNO_ONLY ? 128 : 190, 44, as3.bind(this, this.onDrop), true, 20);
        this._drop.x = 10;
        this._drop.y = 266;
        p.addChild(this._drop);
        if (GLOBAL.INFERNO_ONLY) {
            this._ioAuto = new IoAutoPlay("magmadrop", win, this, (): boolean => {
                let before: int = this._pending;
                if (CASINO.credits() < this._bet.value) {
                    this._win.message(KEYS.Get("io_acc_auto_stop_shiny"), CasinoUI.LOSS);
                    return false;
                }
                this._ioAutoDrop = true;
                this.onDrop();
                this._ioAutoDrop = false;
                return this._pending > before;
            }, (go: Function): boolean => CASINO.ioAskBig("magmadrop", this._bet.value, go));
            this._ioAuto.button(p, 142, 266, 58, 44);
        }
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_last_drops"), 11, CasinoUI.EMBER, true, 190), 12, 318));
        this._results = as3.as(p.addChild(new Sprite()), Sprite);
        this._results.x = 10;
        this._results.y = 336;
        // the board
        this._board = as3.as(this.addChild(new Sprite()), Sprite);
        this._board.x = MagmaDropGame.BX;
        let bg: Sprite = as3.as(this._board.addChild(CasinoUI.panel(MagmaDropGame.BW, MagmaDropGame.BH, 1)), Sprite);
        CasinoUI.picture(this._board, "casino/magmadrop/board_bg.jpg", 3, 3, MagmaDropGame.BW - 6, MagmaDropGame.BH - 6, (b: Bitmap): void => {
            this._board.setChildIndex(b, Math.min(1, this._board.numChildren - 1) | 0);
        });
        this.buildPegs();
        this.buildCups();
        ImageCache.GetImageWithCallBack("casino/magmadrop/spurtz_ball.png", (k: string, bmd: BitmapData, args: any[] = null): void => {
            this._spurtz = bmd;
        });
        this.setRisk(GLOBAL.INFERNO_ONLY && /^(low|medium|high)$/.test(CASINO.ioRecall("risk")) ? CASINO.ioRecall("risk") : "low");
    }

    private riskClick(r: string): Function {
        return (e: MouseEvent): void => {
            this.setRisk(r);
        };
    }

    private setRisk(r: string): void {
        this._risk = r;
        if (GLOBAL.INFERNO_ONLY) {
            CASINO.ioRemember("risk", r);
        }
        let k: string = null;
        for (k in this._riskButtons) {
            CasinoUI.choose(as3.cast(this._riskButtons[k], Sprite), k == r);
        }
        let table: any[] = this.table();
        let i: int = 0;
        while (i < this._cups.length) {
            let c: any = this._cups[i];
            let m: number = Number(table ? Number(table[i]) : 0);
            c.label.text = CasinoUI.mult(m);
            c.label.textColor = MagmaDropGame.cupColor(m);
            i++;
        }
    }

    /** QoL #235: a risk as its button reads (LOW, MEDIUM, HIGH, in the player's language); the History tab's too. */
    public static ioRisk(r: string): string {
        return r == "low" || r == "medium" || r == "high" ? KEYS.Get("io_t3c_risk_" + r) : String(r).toUpperCase();
    }

    private table(): any[] {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.magmadrop ? as3.as(st.rules.magmadrop.risks[this._risk], Array) : null;
    }

    private static cupColor(m: number): uint {
        return (m >= 10 ? 0xFF5A3A : (m >= 3 ? 0xFFA040 : (m >= 1 ? 0xFFD58A : 0xB8A898))) >>> 0;
    }

    /** Where peg `i` of row `r` sits on the board (row r has r + 3 pegs). */
    private static pegX(r: int, i: int): number {
        return MagmaDropGame.BW / 2 + (i - (r + 2) / 2) * MagmaDropGame.SP;
    }

    private static pegY(r: int): number {
        return MagmaDropGame.TOP + r * MagmaDropGame.ROW_H;
    }

    private buildPegs(): void {
        let r: int = 0;
        while (r < MagmaDropGame.ROWS) {
            let i: int = 0;
            while (i < r + 3) {
                let peg: Sprite = as3.as(this._board.addChild(new Sprite()), Sprite);
                CasinoUI.picture(peg, "casino/magmadrop/peg.png", -9, -9, 18, 18);
                peg.x = MagmaDropGame.pegX(r, i);
                peg.y = MagmaDropGame.pegY(r);
                this._pegs.push(peg);
                i++;
            }
            r++;
        }
    }

    private buildCups(): void {
        let k: int = 0;
        while (k <= MagmaDropGame.ROWS) {
            let cup: Sprite = as3.as(this._board.addChild(new Sprite()), Sprite);
            cup.name = "casinoCup:" + k;
            CasinoUI.picture(cup, "casino/magmadrop/cup.png", -17, -8, 34, 30);
            cup.x = MagmaDropGame.BW / 2 + (k - MagmaDropGame.ROWS / 2) * MagmaDropGame.SP;
            cup.y = MagmaDropGame.CUP_Y;
            let t: TextField = CasinoUI.label("", 10, 16777215, true, 40, TextFormatAlign.CENTER);
            t.x = -20;
            t.y = 22;
            t.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            cup.addChild(t);
            this._cups.push({ "s": cup, "label": t, "glow": 0 });
            k++;
        }
    }

    /** QoL #390: the rules and pays ("?"): the rows and cups, and each risk's best cup (casino/state's tables). */
    private ioRules(): any[] {
        let st: any = CASINO.state;
        let risks: any = st && st.rules && st.rules.magmadrop ? st.rules.magmadrop.risks : null;
        let top: Function = (id: string): string => {
            let t: any[] = risks ? as3.as(risks[id], Array) : null;
            return t && t.length ? CasinoUI.mult(Math.max(...t.map((m: any): number => Number(m)))) : "-";
        };
        return ["MAGMA DROP", KEYS.Get("io_pit_rules_drop1", { "v1": MagmaDropGame.ROWS, "v2": MagmaDropGame.ROWS + 1 }), KEYS.Get("io_pit_rules_drop2"), KEYS.Get("io_pit_rules_drop3"), KEYS.Get("io_t3c_rules_drop4", { "v1": top("low"), "v2": top("medium"), "v3": top("high") }), KEYS.Get("io_pit_rules_drop5")];
    }

    private onDrop(e: MouseEvent = null): void {
        let bet: int = 0;
        // (QoL #388: DROP pressed while AUTO plays stops the run; the drop goes as usual)
        let auto: boolean = this._ioAutoDrop;
        if (e != null && this._ioAuto && this._ioAuto.running) {
            this._ioAuto.stop(KEYS.Get("io_acc_auto_stopped"));
        }
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
            return;
        }
        bet = this._bet.value;
        if (CASINO.credits() < bet) {
            this._win.message(KEYS.Get("io_t3c_no_shiny_bet"), CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        if (this._pending >= MagmaDropGame.MAX_IN_FLIGHT) {
            return;
        }
        // (QoL #385: more than half the Shiny on one ball asked about first, once)
        if (CASINO.ioAskBig("magmadrop", bet, (): void => {
            if (this.parent) {
                this.onDrop();
            }
        })) {
            return;
        }
        ++this._pending;
        CASINO.setCredits((CASINO.credits() - bet) | 0);
        let risk: string = this._risk;
        CASINO.magmaDrop(bet, risk, (r: any): void => {
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                --this._pending;
                CASINO.setCredits((CASINO.credits() + bet) | 0);
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                if (auto && this._ioAuto) {
                    this._ioAuto.refused();
                }
                return;
            }
            // (QoL #388: the run's ball, counted when it lands)
            r.ioAuto = auto;
            // (the newest bet's balance: answers to balls dropped together can come back out of order, and the
            // last to come set an older balance; 9 October)
            let n: number = r.nonce != null ? Number(r.nonce) : NaN;
            if (isNaN(n) || this._lastNonce < 0 || n > this._lastNonce || n < this._lastNonce - 50) {
                this._serverCredits = r.credits | 0;
                if (!isNaN(n)) {
                    this._lastNonce = n;
                }
            }
            this.launch(r);
        });
    }

    /** A ball, following the path the server sent. */
    private launch(r: any): void {
        let ball: Sprite = as3.as(this._board.addChild(new Sprite()), Sprite);
        ball.name = "casinoBall";
        // (its glow a soft disc drawn once under it, the Spurtz turning over it: a glow filter on the turning ball
        // was worked out again every frame, for every ball; 9 October)
        let glow: Shape = as3.as(ball.addChild(new Shape()), Shape);
        let gm: Matrix = new Matrix();
        gm.createGradientBox(44, 44, 0, -22, -22);
        glow.graphics.beginGradientFill(GradientType.RADIAL, [0xFF6A00, 0xFF6A00], [0.75, 0], [90, 255], gm);
        glow.graphics.drawCircle(0, 0, 22);
        glow.graphics.endFill();
        let turn: Sprite = as3.as(ball.addChild(new Sprite()), Sprite);
        if (this._spurtz) {
            let b: Bitmap = new Bitmap(this._spurtz);
            b.smoothing = true;
            b.width = b.height = 28;
            b.x = b.y = -14;
            turn.addChild(b);
        } else {
            let s: Shape = as3.as(turn.addChild(new Shape()), Shape);
            s.graphics.beginFill(16747050);
            s.graphics.drawCircle(0, 0, 11);
            s.graphics.endFill();
        }
        ball.x = MagmaDropGame.BW / 2;
        ball.y = MagmaDropGame.TOP - MagmaDropGame.ROW_H;
        this._balls.push({ "s": ball, "r": r, "row": -1, "t": 0, "x0": ball.x, "y0": ball.y, "x1": MagmaDropGame.BW / 2, "y1": MagmaDropGame.pegY(0) - 14, "spin": (Math.random() - 0.5) * 20, "fpr": CasinoUI.ioQuick("magmadrop") ? MagmaDropGame.IO_QUICK_FRAMES : MagmaDropGame.FRAMES_PER_ROW });
    }

    public tick(): void {
        let i: int = (this._balls.length - 1) | 0;
        while (i >= 0) {
            let b: any = this._balls[i];
            b.t++;
            let u: number = Math.min(1, b.t / (b.fpr | 0 || MagmaDropGame.FRAMES_PER_ROW));
            let hop: number = b.row < 0 ? 0 : 9;
            b.s.x = b.x0 + (b.x1 - b.x0) * u;
            b.s.y = b.y0 + (b.y1 - b.y0) * u * u - hop * 4 * u * (1 - u);
            b.s.getChildAt(1).rotation += b.spin;
            if (u >= 1) {
                b.row++;
                let path: any[] = as3.as(b.r.path, Array);
                if (b.row < MagmaDropGame.ROWS) {
                    // on a peg: a spark, then off to the left or right
                    this.spark(Number(b.x1), MagmaDropGame.pegY(b.row | 0));
                    let dir: int = (path[b.row] | 0) == 1 ? 1 : -1;
                    b.spin = dir * (8 + Math.random() * 6);
                    b.x0 = b.x1;
                    b.y0 = b.y1;
                    b.x1 = b.x1 + dir * MagmaDropGame.SP / 2;
                    b.y1 = b.row + 1 < MagmaDropGame.ROWS ? MagmaDropGame.pegY((b.row + 1) | 0) - 14 : MagmaDropGame.CUP_Y;
                    b.t = 0;
                } else {
                    this.land(b);
                    this._board.removeChild(as3.cast(b.s, DisplayObject));
                    this._balls.splice(i, 1);
                }
            }
            i--;
        }
        // sparks and splashes
        i = (this._sparks.length - 1) | 0;
        while (i >= 0) {
            let p: any = this._sparks[i];
            p.life--;
            p.s.x += p.vx;
            p.s.y += p.vy;
            p.vy += p.g;
            p.s.alpha = Math.max(0, p.life / p.max);
            if (p.grow) {
                p.s.scaleX = p.s.scaleY = p.s.scaleX + p.grow;
            }
            if (p.life <= 0) {
                p.s.parent.removeChild(p.s);
                this._sparks.splice(i, 1);
            }
            i--;
        }
        // cups glowing after a landing
        let c: any = null;
        for (c of as3.values(this._cups)) {
            if (c.glow > 0) {
                c.glow--;
                // (every other frame, and the one filter: a new filter each frame; 9 October)
                if (c.glow == 0) {
                    c.s.filters = [];
                } else if (c.glow % 2 == 1) {
                    if (!c.gf) {
                        c.gf = new GlowFilter(0xFFB040, 1, 16, 16, 3, 2);
                    }
                    c.gf.alpha = c.glow / 24;
                    c.s.filters = [c.gf];
                }
            }
        }
        CasinoUI.enable(this._drop, this._pending < MagmaDropGame.MAX_IN_FLIGHT);
        if (this._ioAuto) {
            this._ioAuto.tick();
        }
    }

    private spark(x: number, y: number): void {
        let s: Shape = as3.as(this._board.addChild(new Shape()), Shape);
        // (its glow drawn with it: a glow filter on a spark growing every frame was worked out again each frame;
        // 9 October)
        let sm: Matrix = new Matrix();
        sm.createGradientBox(28, 28, 0, -14, -14);
        s.graphics.beginGradientFill(GradientType.RADIAL, [0xFF6A00, 0xFF6A00], [1, 0], [110, 255], sm);
        s.graphics.drawCircle(0, 0, 14);
        s.graphics.endFill();
        s.graphics.beginFill(16765040, 0.9);
        s.graphics.drawCircle(0, 0, 6);
        s.graphics.endFill();
        s.x = x;
        s.y = y;
        this._sparks.push({ "s": s, "vx": 0, "vy": 0, "g": 0, "life": 8, "max": 8, "grow": 0.08 });
    }

    private land(b: any): void {
        let r: any = b.r;
        let slot: int = r.slot | 0;
        let payout: int = r.payout | 0;
        let bet: int = r.bet | 0;
        let cup: any = this._cups[slot];
        cup.glow = 24;
        // the splash
        let n: int = payout >= bet * 10 ? 26 : 12;
        let k: int = 0;
        while (k < n) {
            let d: Shape = as3.as(this._board.addChild(new Shape()), Shape);
            d.graphics.beginFill([0xFF6A1A, 0xFFB040, 0xFFE08A][k % 3] >>> 0, 1);
            d.graphics.drawCircle(0, 0, 1.5 + Math.random() * 2);
            d.graphics.endFill();
            d.x = Number(cup.s.x);
            d.y = MagmaDropGame.CUP_Y;
            this._sparks.push({ "s": d, "vx": (Math.random() - 0.5) * 3.2, "vy": -2 - Math.random() * 3.5, "g": 0.25, "life": 30, "max": 30, "grow": 0 });
            k++;
        }
        // the prize: shown now in the Shiny
        --this._pending;
        CASINO.setCredits((CASINO.credits() + payout) | 0);
        if (this._pending == 0 && this._balls.length <= 1 && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        let m: number = Number(r.multiplier);
        if (payout > bet) {
            this._win.message(KEYS.Get("io_t3c_cup_win", { "v1": CasinoUI.mult(m), "v2": CasinoUI.number(payout) }), CasinoUI.WIN);
            SOUNDS.Play(m >= 5 ? "chaching" : "purchasepopup");
            this._win.bigWin(payout, bet);
        } else {
            this._win.message(payout > 0 ? KEYS.Get("io_t3c_cup_back", { "v1": CasinoUI.mult(m), "v2": CasinoUI.number(payout) }) : KEYS.Get("io_t3c_cup", { "v1": CasinoUI.mult(m) }), payout > 0 ? CasinoUI.GOLD : CasinoUI.ASH);
        }
        this.addResult(m);
        // (QoL #388: the run goes on, or stops by its rules)
        if (r.ioAuto && this._ioAuto) {
            this._ioAuto.result(bet, payout);
        }
    }

    private addResult(m: number): void {
        this._last.unshift(m);
        if (this._last.length > 12) {
            this._last.pop();
        }
        CasinoUI.removeAll(this._results);
        let i: int = 0;
        while (i < this._last.length) {
            let v: number = Number(this._last[i]);
            let box: Sprite = CasinoUI.panel(44, 22, 1);
            box.x = (i % 4) * 47;
            box.y = ((i / 4) | 0) * 25;
            let t: TextField = CasinoUI.label(CasinoUI.mult(v), 10, MagmaDropGame.cupColor(v), true, 44, TextFormatAlign.CENTER);
            t.y = 3;
            box.addChild(t);
            this._results.addChild(box);
            i++;
        }
    }

    /** Balls in the air (the Shiny shown is not yet the server's). */
    public get showing(): boolean {
        return this._pending > 0 || this._balls.length > 0;
    }

    public dispose(): void {
        // balls still falling: their prizes are already paid; the lobby's state brings the Shiny right
        if (this._pending > 0 && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        this._balls = [];
        this._sparks = [];
        if (this._ioAuto) {
            this._ioAuto.dispose();
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
