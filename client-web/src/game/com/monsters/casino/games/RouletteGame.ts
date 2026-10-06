import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, SOUNDS } from "@game";

/**
 * Wormzer Roulette: a wheel of 29 segments (the seven monsters four times each on Lava and Ash, and
 * King Wormzer, the house's). Chips go on monsters, a colour or King Wormzer (what each pays comes
 * from casino/state: 7.24x, 2.07x, 28.99x), several on one spin. The server draws the segment (server/src/services/casino/games/roulette.ts); the wheel
 * turns and Spurtz, the ball, drops into it. The wheel's order comes from casino/state.
 */
export class RouletteGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _chip: null, _spin: null, _clear: null, _rebet: null, _total: null, _wheel: null, _ball: null, _boxes: null, _slip: null, _lastSlip: null, _results: null, _last: null, _resultText: null, _resultIcon: null, _spinning: null, _busy: false, _pulse: 0, _winners: null, _burst: null, _burstT: 0, _serverCredits: -1 });
    }

    /** The wheel's middle, from the content area's top left, and its radii (wheel.png is 240 across). */
    private static readonly WX: number = 345;

    private static readonly WY: number = 162;

    private static readonly R_TRACK: number = 111;

    private static readonly R_POCKET: number = 66;

    private static readonly SPIN_FRAMES: int = 180;
    private _win: CasinoWindow;
    private _chip: BetSelector;
    private _spin: Sprite;
    private _clear: Sprite;
    private _rebet: Sprite;
    private _total: TextField;
    private _wheel: Sprite;
    private _ball: Sprite;
    private _boxes: any;
    private _slip: any;
    private _lastSlip: any;
    private _results: Sprite;
    private _last: any[];
    private _resultText: TextField;
    private _resultIcon: Sprite;
    /** The spin being shown: the server's answer, and where the wheel and ball are going. */
    private _spinning: any;
    private _busy: boolean;
    private _pulse: int;
    private _winners: any[];
    private _burst: Sprite;
    private _burstT: int;
    private _serverCredits: int;

    public $ctor(win?: CasinoWindow): void {
        let wp: Sprite = null;
        this._boxes = {};
        this._slip = {};
        this._last = [];
        this._winners = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoRoulette";
        // controls
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("WORMZER ROULETTE", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("CHIP (click a place to bet it)", 10, CasinoUI.EMBER, true, 190), 12, 68));
        this._chip = new BetSelector(190);
        this._chip.x = 10;
        this._chip.y = 82;
        this._chip.setValue(5);
        p.addChild(this._chip);
        p.addChild(CasinoUI.at(CasinoUI.label("ON THE TABLE", 11, CasinoUI.EMBER, true, 190), 12, 212));
        this._total = CasinoUI.label("0 Shiny", 15, CasinoUI.GOLD, true, 190);
        this._total.x = 12;
        this._total.y = 226;
        p.addChild(this._total);
        this._spin = CasinoUI.button("SPIN", 190, 42, as3.bind(this, this.onSpin), false, 20);
        this._spin.x = 10;
        this._spin.y = 254;
        p.addChild(this._spin);
        this._clear = CasinoUI.button("CLEAR", 92, 26, as3.bind(this, this.onClear), false, 12);
        this._clear.x = 10;
        this._clear.y = 302;
        p.addChild(this._clear);
        this._rebet = CasinoUI.button("AGAIN", 92, 26, as3.bind(this, this.onRebet), false, 12);
        this._rebet.x = 108;
        this._rebet.y = 302;
        p.addChild(this._rebet);
        p.addChild(CasinoUI.at(CasinoUI.label("LAST SPINS", 11, CasinoUI.EMBER, true, 190), 12, 336));
        this._results = as3.as(p.addChild(new Sprite()), Sprite);
        this._results.x = 10;
        this._results.y = 354;
        // the wheel
        wp = as3.as(this.addChild(CasinoUI.panel(250, 400, 1)), Sprite);
        wp.x = 220;
        CasinoUI.picture(wp, "casino/magmadrop/board_bg.jpg", 3, 3, 244, 394, (b: Bitmap): void => {
            b.alpha = 0.6;
            wp.setChildIndex(b, Math.min(1, wp.numChildren - 1) | 0);
        });
        this._wheel = as3.as(this.addChild(new Sprite()), Sprite);
        this._wheel.name = "casinoWheel";
        this._wheel.x = RouletteGame.WX;
        this._wheel.y = RouletteGame.WY;
        CasinoUI.picture(this._wheel, "casino/roulette/wheel.png", -120, -120, 240, 240);
        this._ball = as3.as(this.addChild(new Sprite()), Sprite);
        this._ball.name = "casinoRouletteBall";
        CasinoUI.picture(this._ball, "casino/magmadrop/spurtz_ball.png", -10, -10, 20, 20);
        this._ball.filters = [new GlowFilter(0xFF6A00, 0.9, 10, 10, 2, 2)];
        this._ball.visible = false;
        let rim: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        rim.x = RouletteGame.WX;
        rim.y = RouletteGame.WY;
        rim.mouseEnabled = rim.mouseChildren = false;
        CasinoUI.picture(rim, "casino/roulette/wheel_rim.png", -130, -130, 260, 260);
        this._resultIcon = as3.as(this.addChild(new Sprite()), Sprite);
        this._resultIcon.x = RouletteGame.WX;
        this._resultIcon.y = RouletteGame.WY + 170;
        this._resultText = CasinoUI.label("Place your chips", 13, CasinoUI.ASH, true, 240, TextFormatAlign.CENTER);
        this._resultText.x = RouletteGame.WX - 120;
        this._resultText.y = RouletteGame.WY + 136;
        this.addChild(this._resultText);
        // the table
        let places: any[] = this.places();
        let i: int = 0;
        while (i < places.length) {
            let box: Sprite = this.makeBox(as3.str(places[i]));
            box.x = 478 + (i % 2) * 112;
            box.y = 4 + ((i / 2) | 0) * 79;
            this.addChild(box);
            i++;
        }
        this._burst = as3.as(this.addChild(new Sprite()), Sprite);
        this._burst.mouseEnabled = this._burst.mouseChildren = false;
        this._burst.x = RouletteGame.WX;
        this._burst.y = RouletteGame.WY;
        this.refresh();
    }

    private rules(): any {
        let st: any = CASINO.state;
        return st && st.rules ? st.rules.roulette : null;
    }

    /** The ten places: the seven monsters, Lava, Ash and King Wormzer. */
    private places(): any[] {
        let r: any = this.rules();
        let monsters: any[] = r ? (as3.as(r.monsters, Array)).concat() : ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox"];
        return monsters.concat(["lava", "ash", "wormzer"]);
    }

    private pays(on: string): number {
        let r: any = this.rules();
        if (!r) {
            return 0;
        }
        return on == "wormzer" ? Number(r.pays.wormzer) : (on == "lava" || on == "ash" ? Number(r.pays.color) : Number(r.pays.monster));
    }

    private makeBox(on: string): Sprite {
        let b: MovieClip = new MovieClip();
        b.name = "casinoPlace:" + on;
        b.buttonMode = true;
        b.mouseChildren = false;
        let W: int = 106;
        let H: int = 73;
        let colors: any[] = on == "lava" ? [0xC03A12, 0x6A1206] : (on == "ash" ? [0x3A3432, 0x141010] : (on == "wormzer" ? [0x7A2AB0, 0x2E0A48] : [0x2A1E1A, 0x140E0C]));
        let m: Matrix = new Matrix();
        m.createGradientBox(W, H, Math.PI / 2, 0, 0);
        b.graphics.lineStyle(1.5, (on == "wormzer" ? 0xD090FF : 0x9A3A14) >>> 0, 1);
        b.graphics.beginGradientFill(GradientType.LINEAR, colors, [1, 1], [0, 255], m);
        b.graphics.drawRoundRect(0, 0, W, H, 12, 12);
        b.graphics.endFill();
        let title: string = on == "lava" ? "LAVA" : (on == "ash" ? "ASH" : String(CASINO.MONSTER_NAMES[on] || on).toUpperCase());
        if (on == "lava" || on == "ash") {
            b.addChild(CasinoUI.at(CasinoUI.label(title, 20, 16777215, true, W, TextFormatAlign.CENTER, "Groboldov"), 0, 14));
        } else {
            // (the picture in its own layer under the name: it arrives later and was drawn over it, Balthazar's
            // wing hiding the "B")
            CasinoUI.picture(as3.as(b.addChild(new Sprite()), Sprite), CASINO.monsterKey(on), 4, 4, 48, 48);
            let t: TextField = CasinoUI.label(title, title.length > 7 ? 9 : 10, 16777215, true, 60, TextFormatAlign.RIGHT);
            t.x = 42;
            t.y = 8;
            t.multiline = t.wordWrap = true;
            t.height = 30;
            b.addChild(t);
        }
        let p: TextField = CasinoUI.label(CasinoUI.mult(this.pays(on)), 12, CasinoUI.GOLD, true, (W - 8) | 0, TextFormatAlign.RIGHT);
        p.x = 0;
        p.y = H - 20;
        b.addChild(p);
        // the chips on it
        let stack: Sprite = as3.as(b.addChild(new Sprite()), Sprite);
        stack.x = 22;
        stack.y = H - 18;
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.place(on);
        });
        this._boxes[on] = { "s": b, "stack": stack };
        return b;
    }

    private place(on: string): void {
        if (this._busy) {
            return;
        }
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            return;
        }
        let total: int = this.slipTotal();
        let chip: int = this._chip.value;
        if (CASINO.credits() < total + chip) {
            this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        let count: int = 0;
        let k: string = null;
        for (k in this._slip) {
            count++;
        }
        let r: any = this.rules();
        if (this._slip[on] == null && r && count >= (r.maxBets | 0)) {
            this._win.message("Up to " + r.maxBets + " places on one spin.", CasinoUI.ASH);
            return;
        }
        SOUNDS.Play("click1");
        this._slip[on] = ((this._slip[on] || 0) | 0) + chip;
        this._winners = [];
        this.refresh();
    }

    private slipTotal(): int {
        let t: int = 0;
        let k: string = null;
        for (k in this._slip) {
            t += this._slip[k] | 0;
        }
        return t;
    }

    /** The chips on the table and the buttons, as the slip is. */
    private refresh(): void {
        let k: string = null;
        for (k in this._boxes) {
            let stack: Sprite = as3.cast(this._boxes[k].stack, Sprite);
            CasinoUI.removeAll(stack);
            let amount: int = (this._slip[k] || 0) | 0;
            if (amount > 0) {
                let c: Shape = as3.as(stack.addChild(new Shape()), Shape);
                c.graphics.lineStyle(2, 16051420, 1);
                c.graphics.beginFill(14200896, 1);
                c.graphics.drawCircle(0, 0, 13);
                c.graphics.endFill();
                c.filters = [new GlowFilter(0, 0.6, 4, 4, 2, 1)];
                let t: TextField = CasinoUI.label(amount >= 10000 ? ((amount / 1000) | 0) + "k" : String(amount), amount >= 1000 ? 8 : 10, 2102288, true, 30, TextFormatAlign.CENTER);
                t.x = -15;
                t.y = -8;
                stack.addChild(t);
            }
        }
        let total: int = this.slipTotal();
        this._total.text = CasinoUI.number(total) + " Shiny";
        CasinoUI.enable(this._spin, total > 0 && !this._busy);
        CasinoUI.enable(this._clear, total > 0 && !this._busy);
        CasinoUI.enable(this._rebet, this._lastSlip != null && total == 0 && !this._busy);
    }

    private onClear(e: MouseEvent = null): void {
        if (!this._busy) {
            this._slip = {};
            this.refresh();
        }
    }

    private onRebet(e: MouseEvent = null): void {
        if (this._busy || !this._lastSlip) {
            return;
        }
        let need: int = 0;
        let k: string = null;
        for (k in this._lastSlip) {
            need += this._lastSlip[k] | 0;
        }
        if (CASINO.credits() < need) {
            this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        this._slip = {};
        for (k in this._lastSlip) {
            this._slip[k] = this._lastSlip[k];
        }
        this._winners = [];
        this.refresh();
    }

    private onSpin(e: MouseEvent = null): void {
        let total: int = 0;
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
            return;
        }
        total = this.slipTotal();
        if (this._busy || total <= 0) {
            return;
        }
        if (CASINO.credits() < total) {
            this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        let bets: any[] = [];
        let k: string = null;
        for (k in this._slip) {
            bets.push({ "on": k, "amount": this._slip[k] | 0 });
        }
        this._busy = true;
        this._winners = [];
        this.refresh();
        CASINO.setCredits((CASINO.credits() - total) | 0);
        this._resultText.text = "No more bets!";
        this._resultText.textColor = CasinoUI.ASH;
        CasinoUI.removeAll(this._resultIcon);
        CASINO.roulette(bets, (r: any): void => {
            if (!this.parent) {
                return;
            }
            if (r.error) {
                this._busy = false;
                CASINO.setCredits((CASINO.credits() + total) | 0);
                this._resultText.text = "Place your chips";
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.refresh();
                return;
            }
            this._serverCredits = r.credits | 0;
            this._lastSlip = this._slip;
            this.startSpin(r);
        });
    }

    /** Segment i's middle, in degrees clockwise from the top of the wheel. */
    private static segAngle(i: int, n: int): number {
        return i * 360 / n;
    }

    private static mod360(a: number): number {
        return ((a % 360) + 360) % 360;
    }

    private startSpin(r: any): void {
        let n: int = this.rules() ? this.rules().segments | 0 : 29;
        let w0: number = this._wheel.rotation;
        // the wheel turns clockwise and stops with the segment drawn under the pointer (the top)
        let dw: number = RouletteGame.mod360(-RouletteGame.segAngle(r.segment | 0, n) - w0) + 360 * 3;
        let b0: number = Math.random() * 360;
        this._spinning = { "r": r, "t": 0, "w0": w0, "dw": dw, "b0": b0, "db": -1, "n": n };
        this._ball.visible = true;
        SOUNDS.Play("click1");
    }

    private static easeOut(u: number): number {
        return 1 - (1 - u) * (1 - u) * (1 - u);
    }

    public tick(): void {
        let s: any = this._spinning;
        if (s) {
            s.t++;
            let u: number = Math.min(1, s.t / RouletteGame.SPIN_FRAMES);
            let w: number = Number(s.w0 + s.dw * RouletteGame.easeOut(u));
            this._wheel.rotation = w;
            let target: number = RouletteGame.segAngle(s.r.segment | 0, s.n | 0);
            let CATCH: number = 0.82;
            let angle: number = NaN;
            let radius: number = NaN;
            if (u < CATCH) {
                if (s.db < 0) {
                    // the ball runs the other way and comes to the segment just as the wheel brings it round
                    let wc: number = Number(s.w0 + s.dw * RouletteGame.easeOut(CATCH));
                    s.db = RouletteGame.mod360(s.b0 - (target + wc)) + 360 * 3;
                }
                let v: number = u / CATCH;
                angle = s.b0 - s.db * (1 - (1 - v) * (1 - v));
                radius = v < 0.7 ? RouletteGame.R_TRACK : RouletteGame.R_TRACK - (RouletteGame.R_TRACK - RouletteGame.R_POCKET) * ((v - 0.7) / 0.3) + Math.abs(Math.sin(v * 40)) * 4 * (1 - v);
            } else {
                angle = target + w;
                radius = RouletteGame.R_POCKET;
            }
            let a: number = angle * Math.PI / 180;
            this._ball.x = RouletteGame.WX + Math.sin(a) * radius;
            this._ball.y = RouletteGame.WY - Math.cos(a) * radius;
            this._ball.rotation -= 12 * (1 - u);
            if (u >= 1) {
                this._spinning = null;
                this.land(s.r);
            }
        }
        // winning places pulse
        if (this._winners.length) {
            this._pulse++;
            let g: number = 0.55 + 0.45 * Math.sin(this._pulse / 5);
            for (const $value of as3.values(this._winners)) {
                let on: string = as3.str($value);
                this._boxes[on].s.filters = [new GlowFilter(0xFFD040, g, 16, 16, 3, 2)];
            }
        }
        // King Wormzer bursts out
        if (this._burstT > 0) {
            this._burstT--;
            let k: number = 1 - this._burstT / 70;
            this._burst.scaleX = this._burst.scaleY = Math.min(1.25, 0.2 + k * 2.4);
            this._burst.alpha = Number(this._burstT > 20 ? 1 : this._burstT / 20);
            this._burst.x = Number(RouletteGame.WX + (this._burstT > 40 ? (Math.random() - 0.5) * 8 : 0));
            if (this._burstT == 0) {
                CasinoUI.removeAll(this._burst);
            }
        }
    }

    private land(r: any): void {
        this._busy = false;
        let payout: int = r.payout | 0;
        let bet: int = r.bet | 0;
        CASINO.setCredits((CASINO.credits() + payout) | 0);
        if (this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        // the result
        let title: string = r.monster == "wormzer" ? "KING WORMZER" : String(CASINO.MONSTER_NAMES[r.monster] || r.monster).toUpperCase() + " - " + String(r.color).toUpperCase();
        this._resultText.text = title;
        this._resultText.textColor = (r.color == "lava" ? 0xFF7A4A : (r.color == "wormzer" ? 0xD090FF : 0xE8DCC8)) >>> 0;
        CasinoUI.removeAll(this._resultIcon);
        CasinoUI.picture(this._resultIcon, CASINO.monsterKey(as3.str(r.monster)), -30, -8, 60, 60);
        this._winners = [];
        this._pulse = 0;
        let k: string = null;
        for (k in this._boxes) {
            this._boxes[k].s.filters = [];
        }
        for (let res of as3.values(r.results)) {
            if (res.won) {
                this._winners.push(String(res.on));
            }
        }
        if (payout > 0) {
            this._win.message((payout > bet ? "+" : "") + CasinoUI.number(payout) + " Shiny back on " + CasinoUI.number(bet) + " bet", payout > bet ? CasinoUI.WIN : CasinoUI.GOLD);
            SOUNDS.Play(payout >= bet * 7 ? "chaching" : "purchasepopup");
            this._win.bigWin(payout, bet);
        } else {
            this._win.message("The house takes it.", CasinoUI.ASH);
        }
        if (r.monster == "wormzer") {
            this.wormzerBursts();
        }
        this.addResult(r);
        this._slip = {};
        this.refresh();
    }

    private wormzerBursts(): void {
        CasinoUI.removeAll(this._burst);
        let ring: Shape = as3.as(this._burst.addChild(new Shape()), Shape);
        ring.graphics.beginFill(8006320, 0.55);
        ring.graphics.drawCircle(0, 0, 80);
        ring.graphics.endFill();
        ring.filters = [new GlowFilter(0xD090FF, 1, 30, 30, 3, 2)];
        CasinoUI.picture(this._burst, CASINO.monsterKey("wormzer"), -80, -85, 160, 160);
        this._burst.filters = [new GlowFilter(0xB060FF, 0.9, 24, 24, 2, 2)];
        this._burstT = 70;
        SOUNDS.Play("chaching");
    }

    private addResult(r: any): void {
        this._last.unshift(r);
        if (this._last.length > 8) {
            this._last.pop();
        }
        CasinoUI.removeAll(this._results);
        let i: int = 0;
        while (i < this._last.length) {
            let o: any = this._last[i];
            let box: Sprite = new Sprite();
            box.graphics.lineStyle(1, 10107412, 1);
            box.graphics.beginFill((o.color == "lava" ? 0xA0300E : (o.color == "wormzer" ? 0x6A2A9A : 0x2A2422)) >>> 0, 1);
            box.graphics.drawRoundRect(0, 0, 44, 20, 8, 8);
            box.graphics.endFill();
            CasinoUI.picture(box, CASINO.monsterKey(as3.str(o.monster)), 12, 0, 20, 20);
            box.x = (i % 4) * 47;
            box.y = ((i / 4) | 0) * 23;
            this._results.addChild(box);
            i++;
        }
    }

    public get showing(): boolean {
        return this._busy;
    }

    public dispose(): void {
        if (this._spinning && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        this._spinning = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
