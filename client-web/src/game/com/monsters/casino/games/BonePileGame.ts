import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { ColorMatrixFilter, GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, SOUNDS } from "@game";

/**
 * Bone Pile (Mines): 25 bone piles, some hiding a Sabnox (the player picks how many). Each safe pile
 * raises the multiplier; cash out whenever, lose it all to a Sabnox. The server placed the Sabnox when
 * the game started (server/src/services/casino/bonePileSessions.ts) and only says, pile by pile,
 * what is under each; a game left open is picked up again when the game is opened.
 */
export class BonePileGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _sabnox: 3, _sabnoxText: null, _quick: null, _start: null, _cashout: null, _info: null, _info2: null, _board: null, _piles: null, _game: null, _pending: false, _over: false, _parts: null, _shake: 0, _flying: null, _t: 0 });
    }

    private static readonly GX: int = 272;

    private static readonly GY: int = 12;

    private static readonly CELL: int = 72;

    private static readonly GAP: int = 4;

    private static readonly QUICK: any[] = [1, 3, 5, 10, 20];
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _sabnox: int;
    private _sabnoxText: TextField;
    private _quick: any[];
    private _start: Sprite;
    private _cashout: Sprite;
    private _info: TextField;
    private _info2: TextField;
    private _board: Sprite;
    private _piles: any[];
    /** The open game (the server's view of it), or null. */
    private _game: any;
    private _pending: boolean;
    private _over: boolean;
    private _parts: any[];
    private _shake: int;
    private _flying: any[];
    private _t: int;

    public $ctor(win?: CasinoWindow): void {
        this._quick = [];
        this._piles = [];
        this._parts = [];
        this._flying = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoBonePile";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("BONE PILE", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        p.addChild(CasinoUI.at(CasinoUI.label("SABNOX HIDING", 11, CasinoUI.EMBER, true, 190), 12, 206));
        let minus: Sprite = CasinoUI.toggle("-", 30, 26, (e: MouseEvent): void => {
            this.setSabnox((this._sabnox - 1) | 0);
        });
        minus.name = "casinoSabnoxLess";
        minus.x = 10;
        minus.y = 222;
        p.addChild(minus);
        this._sabnoxText = CasinoUI.title("3", 20, 120);
        this._sabnoxText.x = 45;
        this._sabnoxText.y = 218;
        p.addChild(this._sabnoxText);
        let plus: Sprite = CasinoUI.toggle("+", 30, 26, (e: MouseEvent): void => {
            this.setSabnox((this._sabnox + 1) | 0);
        });
        plus.name = "casinoSabnoxMore";
        plus.x = 170;
        plus.y = 222;
        p.addChild(plus);
        let i: int = 0;
        while (i < BonePileGame.QUICK.length) {
            let q: Sprite = CasinoUI.toggle(String(BonePileGame.QUICK[i]), 34, 22, this.quickClick(BonePileGame.QUICK[i] | 0));
            q.x = 10 + i * 39;
            q.y = 254;
            p.addChild(q);
            this._quick.push(q);
            i++;
        }
        this._start = CasinoUI.button("START", 190, 42, as3.bind(this, this.onStart), true, 20);
        this._start.x = 10;
        this._start.y = 286;
        p.addChild(this._start);
        this._cashout = CasinoUI.button("CASH OUT", 190, 42, as3.bind(this, this.onCashout), false, 20);
        this._cashout.x = 10;
        this._cashout.y = 286;
        this._cashout.visible = false;
        p.addChild(this._cashout);
        this._info = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._info.x = 10;
        this._info.y = 336;
        this._info.name = "casinoBoneInfo";
        p.addChild(this._info);
        this._info2 = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._info2.x = 10;
        this._info2.y = 356;
        this._info2.multiline = this._info2.wordWrap = true;
        this._info2.height = 40;
        p.addChild(this._info2);
        // the piles
        this._board = as3.as(this.addChild(new Sprite()), Sprite);
        this._board.x = 220;
        this._board.addChild(CasinoUI.panel(480, 400, 1));
        let bgHolder: Sprite = as3.as(this._board.addChild(new Sprite()), Sprite);
        CasinoUI.picture(bgHolder, "casino/bonepile/grid_bg.jpg", 3, 3, 474, 394);
        i = 0;
        while (i < 25) {
            this._piles.push(this.makePile(i));
            i++;
        }
        // a game left open: picked up again
        let st: any = CASINO.state;
        if (st && st.bonepile && st.bonepile.status == "open") {
            this.resume(st.bonepile);
        } else {
            this.setSabnox(3);
        }
    }

    private rules(): any {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.bonepile ? st.rules.bonepile : { "piles": 25, "min_sabnox": 1, "max_sabnox": 20, "rtp": 0.9999, "max_multiplier": 1000 };
    }

    /** The multiplier after k safe piles with m Sabnox (as the server works it out; for showing only). */
    private mult(k: int, m: int): number {
        let r: any = this.rules();
        if (k <= 0) {
            return 0;
        }
        let ratio: number = 1;
        let i: int = 0;
        while (i < k) {
            ratio *= (r.piles - i) / (r.piles - m - i);
            i++;
        }
        return Math.min(Math.floor(Number(r.rtp) * ratio * 100 + 0.0000001) / 100, Number(r.max_multiplier));
    }

    private quickClick(n: int): Function {
        return (e: MouseEvent): void => {
            this.setSabnox(n);
        };
    }

    private setSabnox(n: int): void {
        if (this._game) {
            return;
        }
        let r: any = this.rules();
        this._sabnox = Math.max(r.min_sabnox | 0, Math.min(r.max_sabnox | 0, n)) | 0;
        this._sabnoxText.text = String(this._sabnox);
        let i: int = 0;
        while (i < BonePileGame.QUICK.length) {
            CasinoUI.choose(as3.cast(this._quick[i], Sprite), BonePileGame.QUICK[i] == this._sabnox);
            i++;
        }
        this.showInfo(true);
    }

    private showInfo(force: boolean = false): void {
        let piles: int = this.rules().piles | 0;
        if (this._game && !this._over) {
            let g: any = this._game;
            let k: int = (as3.as(g.revealed, Array)).length;
            let safeLeft: int = (piles - (g.sabnox | 0) - k) | 0;
            this._info.text = k > 0 ? "NOW " + CasinoUI.mult(Number(g.multiplier)) + " = " + CasinoUI.shiny((g.stake | 0) * Number(g.multiplier)) + " SHINY" : "OPEN A PILE";
            this._info2.text = g.next_multiplier != null ? "Next pile: " + CasinoUI.mult(Number(g.next_multiplier)) + "\n" + safeLeft + " of " + (piles - k) + " piles safe (" + Math.round(Number(g.safe_chance) * 100) + "%)" : "";
        } else if (!this._over || force) {
            this._info.text = "FIRST PILE " + CasinoUI.mult(this.mult(1, this._sabnox));
            this._info2.text = (piles - this._sabnox) + " of " + piles + " piles safe. Every safe pile raises the multiplier.";
        }
    }

    private makePile(i: int): any {
        let o: any = null;
        let c: MovieClip = new MovieClip();
        c.name = "casinoPile:" + i;
        c.x = BonePileGame.GX - 220 + (i % 5) * (BonePileGame.CELL + BonePileGame.GAP) + BonePileGame.CELL / 2;
        c.y = BonePileGame.GY + ((i / 5) | 0) * (BonePileGame.CELL + BonePileGame.GAP) + BonePileGame.CELL / 2;
        c.graphics.beginFill(0, 0.35);
        c.graphics.drawEllipse(-30, 10, 60, 20);
        c.graphics.endFill();
        c.graphics.beginFill(0, 0.01);
        c.graphics.drawRect(-BonePileGame.CELL / 2, -BonePileGame.CELL / 2, BonePileGame.CELL, BonePileGame.CELL);
        c.graphics.endFill();
        let crystal: Sprite = as3.as(c.addChild(new Sprite()), Sprite);
        CasinoUI.picture(crystal, "casino/bonepile/crystal.png", -26, -30, 52, 52);
        crystal.visible = false;
        let sabnox: Sprite = as3.as(c.addChild(new Sprite()), Sprite);
        CasinoUI.picture(sabnox, CASINO.monsterKey("sabnox"), -32, -36, 64, 64);
        sabnox.visible = false;
        let pile: Sprite = as3.as(c.addChild(new Sprite()), Sprite);
        CasinoUI.picture(pile, "casino/bonepile/pile.png", -34, -38, 68, 68);
        c.mouseChildren = false;
        o = { "i": i, "s": c, "pile": pile, "crystal": crystal, "sabnox": sabnox, "hover": false, "open": false, "pop": 0 };
        c.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            o.hover = true;
        });
        c.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            o.hover = false;
        });
        c.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.reveal(o);
        });
        this._board.addChild(c);
        return o;
    }

    private playing(): boolean {
        return this._game != null && !this._over;
    }

    private buttons(): void {
        this._start.visible = !this.playing();
        this._cashout.visible = this.playing();
        CasinoUI.enable(this._start, !this._pending);
        CasinoUI.enable(this._cashout, !this._pending && this._game != null && (as3.as(this._game.revealed, Array)).length > 0);
        let o: any = null;
        for (o of as3.values(this._piles)) {
            o.s.buttonMode = this.playing() && !o.open;
        }
    }

    /** The piles back as they were before a game. */
    private resetBoard(): void {
        this._over = false;
        for (let o of as3.values(this._piles)) {
            o.open = false;
            o.pile.visible = true;
            o.pile.alpha = 1;
            o.pile.scaleX = o.pile.scaleY = 1;
            o.pile.rotation = 0;
            o.crystal.visible = false;
            o.crystal.alpha = 1;
            o.crystal.filters = [];
            o.sabnox.visible = false;
            o.sabnox.alpha = 1;
            o.sabnox.filters = [];
            o.s.filters = [];
        }
    }

    private resume(g: any): void {
        this._game = g;
        this._sabnox = g.sabnox | 0;
        this._sabnoxText.text = String(this._sabnox);
        this._bet.setValue(g.stake | 0);
        this.resetBoard();
        for (const $value of as3.values(g.revealed)) {
            let t: int = $value | 0;
            let o: any = this._piles[t];
            o.open = true;
            o.pile.visible = false;
            o.crystal.visible = true;
            o.crystal.filters = [new GlowFilter(0xFF7A20, 0.8, 14, 14, 2, 2)];
        }
        this._win.message("Your Bone Pile game is where you left it.", CasinoUI.GOLD);
        this.buttons();
        this.showInfo();
    }

    private onStart(e: MouseEvent = null): void {
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
            return;
        }
        if (this._pending || this.playing()) {
            return;
        }
        let bet: int = this._bet.value;
        if (CASINO.credits() < bet) {
            this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        this._pending = true;
        this.resetBoard();
        this.buttons();
        CASINO.bonePileStart(bet, this._sabnox, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                // (a game already open elsewhere: picked up)
                CASINO.getState((s: any): void => {
                    if (this.parent && CASINO.state && CASINO.state.bonepile) {
                        this.resume(CASINO.state.bonepile);
                    }
                });
                this.buttons();
                return;
            }
            this._game = r;
            this._win.message(r.sabnox + " Sabnox are hiding. Pick a pile.", CasinoUI.GOLD);
            SOUNDS.Play("click1");
            this.buttons();
            this.showInfo();
        });
    }

    private reveal(o: any): void {
        if (!this.playing() || this._pending || o.open) {
            return;
        }
        this._pending = true;
        o.pop = -1;
        this.buttons();
        let g: any = this._game;
        CASINO.bonePileReveal(g.session_id | 0, o.i | 0, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                return;
            }
            o.pop = 0;
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.buttons();
                return;
            }
            if (r.safe) {
                this._game = r;
                this.openSafe(o);
                if (r.status == "won") {
                    // every safe pile: paid at once
                    this.finish(r, true);
                } else {
                    this._win.message("Safe! " + CasinoUI.mult(Number(r.multiplier)), CasinoUI.WIN);
                }
            } else {
                this.openSabnox(o);
                this.finish(r, false);
            }
            this.buttons();
            this.showInfo();
        });
    }

    private onCashout(e: MouseEvent = null): void {
        if (!this.playing() || this._pending || (as3.as(this._game.revealed, Array)).length == 0) {
            return;
        }
        this._pending = true;
        this.buttons();
        CASINO.bonePileCashout(this._game.session_id | 0, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.buttons();
                return;
            }
            this.finish(r, true);
            this.buttons();
        });
    }

    /** Bones fly off, a magma crystal is under them. */
    private openSafe(o: any): void {
        o.open = true;
        o.pile.visible = false;
        o.crystal.visible = true;
        o.crystal.scaleX = o.crystal.scaleY = 0.2;
        o.pop = 12;
        o.crystal.filters = [new GlowFilter(0xFF7A20, 0.9, 16, 16, 2, 2)];
        this.burst(Number(o.s.x), Number(o.s.y), [0xE8DCC8, 0xC8BCA8, 0xF4ECDC], 9, 4.5);
        SOUNDS.Play((as3.as(this._game.revealed, Array)).length % 2 ? "click1" : "purchasepopup");
    }

    /** The Sabnox bursts out, acid flies. */
    private openSabnox(o: any): void {
        o.open = true;
        o.pile.visible = false;
        o.sabnox.visible = true;
        o.sabnox.scaleX = o.sabnox.scaleY = 0.2;
        o.pop = 16;
        o.s.filters = [new GlowFilter(0x7AFF3A, 1, 20, 20, 3, 2)];
        this.burst(Number(o.s.x), Number(o.s.y), [0x7AFF3A, 0x3AD01A, 0xC8FF6A], 26, 7);
        this._shake = 20;
        SOUNDS.Play("error1");
    }

    private burst(x: number, y: number, colors: any[], n: int, speed: number): void {
        let k: int = 0;
        while (k < n) {
            let d: Shape = as3.as(this._board.addChild(new Shape()), Shape);
            d.graphics.beginFill(colors[k % colors.length] >>> 0, 1);
            if (colors[0] == 0xE8DCC8) {
                d.graphics.drawRoundRect(-5, -1.5, 10, 3, 3, 3);
            } else {
                d.graphics.drawCircle(0, 0, 2 + Math.random() * 3);
            }
            d.graphics.endFill();
            d.x = x;
            d.y = y;
            d.rotation = Math.random() * 360;
            let a: number = Math.random() * Math.PI * 2;
            let v: number = speed * (0.5 + Math.random() * 0.7);
            this._parts.push({ "s": d, "vx": Math.cos(a) * v, "vy": Math.sin(a) * v - 2, "vr": (Math.random() - 0.5) * 30, "life": 30, "max": 30 });
            k++;
        }
    }

    /** The game is over: paid (the crystals fly to the Shiny) or lost; the layout shown. */
    private finish(r: any, won: boolean): void {
        this._over = true;
        this._game = null;
        let mines: any[] = as3.as(r.layout, Array);
        let o: any = null;
        for (o of as3.values(this._piles)) {
            if (!o.open && mines) {
                o.pile.alpha = 0.25;
                if (mines.indexOf(o.i) >= 0) {
                    o.sabnox.visible = true;
                    o.sabnox.alpha = 0.75;
                    o.sabnox.filters = [new ColorMatrixFilter([0.3, 0.5, 0.1, 0, 0, 0.3, 0.5, 0.1, 0, 0, 0.3, 0.5, 0.1, 0, 0, 0, 0, 0, 1, 0])];
                } else {
                    o.crystal.visible = true;
                    o.crystal.alpha = 0.35;
                    o.crystal.filters = [];
                }
            }
        }
        if (won) {
            let payout: int = r.payout | 0;
            for (o of as3.values(this._piles)) {
                if (o.open && o.crystal.visible) {
                    this.fly(o);
                }
            }
            this._info.text = "CASHED OUT " + CasinoUI.mult(Number(r.multiplier));
            this._info2.text = "+" + CasinoUI.number(payout) + " Shiny";
            this._win.message("Cashed out at " + CasinoUI.mult(Number(r.multiplier)) + ": +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
            this._win.bigWin(payout, (r.bet != null ? r.bet | 0 : Math.round(payout / Math.max(1, Number(r.multiplier)))) | 0);
            let credits: int = r.credits | 0;
            this._flying.push({ "credits": credits, "t": 26 });
        } else {
            this._info.text = "A SABNOX!";
            this._info2.text = "The bet is lost. Start again?";
            this._win.message("A Sabnox was under that one. The bet is lost.", CasinoUI.LOSS);
            if (r.credits != null) {
                CASINO.setCredits(r.credits | 0);
            }
        }
    }

    /** A crystal copy flying to the Shiny at the top of the window. */
    private fly(o: any): void {
        let c: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        CasinoUI.picture(c, "casino/bonepile/crystal.png", -14, -14, 28, 28);
        c.x = Number(this._board.x + o.s.x);
        c.y = Number(this._board.y + o.s.y);
        c.filters = [new GlowFilter(0xFF7A20, 1, 10, 10, 2, 1)];
        this._parts.push({ "s": c, "fly": true, "x0": c.x, "y0": c.y, "life": 26, "max": 26 });
    }

    public tick(): void {
        this._t++;
        for (let o of as3.values(this._piles)) {
            if (o.pop > 0) {
                o.pop--;
                let sp: Sprite = as3.cast(o.sabnox.visible && !o.crystal.visible ? o.sabnox : o.crystal, Sprite);
                let k: number = 1 - o.pop / 14;
                sp.scaleX = sp.scaleY = Math.min(1.15, 0.2 + k * 1.1) - (o.pop == 0 ? 0.15 : 0);
            } else if (o.pop < 0) {
                // waiting for the server: the pile trembles
                o.pile.rotation = Math.sin(this._t * 1.6) * 6;
            } else if (o.hover && this.playing() && !o.open) {
                o.pile.rotation = Math.sin(this._t / 2.5) * 4;
            } else if (o.pile.rotation != 0) {
                o.pile.rotation = 0;
            }
        }
        let i: int = (this._parts.length - 1) | 0;
        while (i >= 0) {
            let p: any = this._parts[i];
            p.life--;
            if (p.fly) {
                let u: number = 1 - p.life / p.max;
                p.s.x = p.x0 + (650 - p.x0) * u * u;
                p.s.y = p.y0 + (-60 - p.y0) * u - Math.sin(u * Math.PI) * 60;
            } else {
                p.s.x += p.vx;
                p.s.y += p.vy;
                p.vy += 0.35;
                p.s.rotation += p.vr;
                p.s.alpha = Math.max(0, p.life / p.max);
            }
            if (p.life <= 0) {
                p.s.parent.removeChild(p.s);
                this._parts.splice(i, 1);
            }
            i--;
        }
        // the Shiny arrives with the crystals
        i = (this._flying.length - 1) | 0;
        while (i >= 0) {
            let f: any = this._flying[i];
            f.t--;
            if (f.t <= 0) {
                CASINO.setCredits(f.credits | 0);
                SOUNDS.Play("chaching");
                this._flying.splice(i, 1);
            }
            i--;
        }
        if (this._shake > 0) {
            this._shake--;
            this._board.x = Number(220 + (this._shake > 0 ? (Math.random() - 0.5) * 8 : 0));
            this._board.y = Number(this._shake > 0 ? (Math.random() - 0.5) * 6 : 0);
        }
    }

    public get showing(): boolean {
        return this._pending || this._flying.length > 0;
    }

    public dispose(): void {
        for (let f of as3.values(this._flying)) {
            CASINO.setCredits(f.credits | 0);
        }
        this._flying = [];
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
