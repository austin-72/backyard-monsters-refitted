import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, ImageCache, KEYS, SOUNDS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * The Undertaker's Offer (the Brimstone Pit, 7 October, the user's pick; Deal or No Deal): twelve sealed coffins hold the
 * twelve prizes on the board (multipliers of the bet). Pick one to keep (that starts the game and takes the bet),
 * then open the others in rounds; after each round the Undertaker offers to buy your coffin. DEAL takes his offer,
 * NO DEAL plays on. With two coffins left, keep yours or swap it for the other. The server sealed the prizes in
 * the coffins at the start (server/src/services/casino/cardSessions.ts, games/deal.ts) and shows each as it is
 * opened. A game left open is picked up again when the game is opened.
 */
export class UndertakerGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _info: null, _info2: null, _round: null, _offersLine: null, _table: null, _coffinLayer: null, _coffins: null, _board: null, _popup: null, _game: null, _pending: false, _shownOpen: null, _turning: null, _revealQueue: null, _revealT: 0, _popupIn: 0, _creditsAt: null, _keptBefore: -1, _shake: 0, _t: 0, _boardBet: -1 });
    }

    private static readonly TX: int = 220;

    /** A coffin as shown (its pictures are 128 x 168, drawn at half size). */
    private static readonly CFW: int = 64;

    private static readonly CFH: int = 84;

    private static readonly GX: int = 16;

    private static readonly GY: int = 50;

    private static readonly GAP_X: int = 8;

    private static readonly GAP_Y: int = 12;

    private static readonly CLOSED: string = "casino/deal/coffin.png";

    private static readonly OPEN: string = "casino/deal/coffin_open.png";

    private static _closedBmd: BitmapData = null;

    private static _openBmd: BitmapData = null;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _info: TextField;
    private _info2: TextField;
    private _round: TextField;
    private _offersLine: TextField;
    private _table: Sprite;
    private _coffinLayer: Sprite;
    /** Each coffin's holder (at the coffin's middle, so it can turn over), by coffin. */
    private _coffins: any[];
    private _board: Sprite;
    private _popup: Sprite;
    private _game: any;
    private _pending: boolean;
    /** The coffins shown open (coffin -> prize). */
    private _shownOpen: any;
    /** Coffins turning over: [{c, t, prize}]. */
    private _turning: any[];
    /** Coffins still to turn over at the end (all of them shown): [c]. */
    private _revealQueue: any[];
    private _revealT: int;
    /** Ticks until the Undertaker's offer (or keep or swap) comes up, after a round's last coffin. */
    private _popupIn: int;
    private _creditsAt: any;
    /** The coffin kept before a swap (to say what it held). */
    private _keptBefore: int;
    private _shake: int;
    private _t: int;
    /** The bet the prize board was last drawn for (9 October: it kept the old bet's Shiny until a coffin was picked). */
    private _boardBet: int;

    public $ctor(win?: CasinoWindow): void {
        this._coffins = [];
        this._shownOpen = {};
        this._turning = [];
        this._revealQueue = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoDeal";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button(KEYS.Get("io_t3c_lobby"), 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("THE UNDERTAKER'S OFFER", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_bet_label"), 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        this._info = CasinoUI.label("", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._info.name = "casinoDealInfo";
        this._info.x = 10;
        this._info.y = 216;
        p.addChild(this._info);
        this._info2 = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._info2.x = 10;
        this._info2.y = 242;
        this._info2.multiline = this._info2.wordWrap = true;
        this._info2.height = 150;
        p.addChild(this._info2);
        // the table: the coffins left, the prize board right
        this._table = as3.as(this.addChild(new Sprite()), Sprite);
        this._table.x = UndertakerGame.TX;
        this._table.addChild(CasinoUI.panel(480, 400, 1));
        let felt: Sprite = as3.as(this._table.addChild(new Sprite()), Sprite);
        CasinoUI.picture(felt, "casino/deal/table.jpg", 3, 3, 474, 394);
        this._round = CasinoUI.label("", 12, CasinoUI.GOLD, true, 290, TextFormatAlign.CENTER);
        this._round.name = "casinoDealRound";
        this._round.x = 10;
        this._round.y = 18;
        this._round.filters = [new GlowFilter(0, 1, 4, 4, 6, 2)];
        this._table.addChild(this._round);
        this._coffinLayer = as3.as(this._table.addChild(new Sprite()), Sprite);
        let c: int = 0;
        while (c < 12) {
            let h: Sprite = new Sprite();
            h.name = "casinoDealCoffin:" + c;
            h.x = UndertakerGame.GX + (c % 4) * (UndertakerGame.CFW + UndertakerGame.GAP_X) + UndertakerGame.CFW / 2;
            h.y = UndertakerGame.GY + ((c / 4) | 0) * (UndertakerGame.CFH + UndertakerGame.GAP_Y);
            h.buttonMode = h.useHandCursor = true;
            h.mouseChildren = false;
            h.addEventListener(MouseEvent.CLICK, this.coffinClick(c));
            this._coffinLayer.addChild(h);
            this._coffins.push(h);
            c++;
        }
        this._offersLine = CasinoUI.label("", 10, CasinoUI.ASH, true, 290, TextFormatAlign.CENTER);
        this._offersLine.name = "casinoDealOffers";
        this._offersLine.x = 10;
        this._offersLine.y = UndertakerGame.GY + 3 * (UndertakerGame.CFH + UndertakerGame.GAP_Y) + 4;
        this._offersLine.multiline = this._offersLine.wordWrap = true;
        this._offersLine.height = 40;
        this._offersLine.filters = [new GlowFilter(0, 1, 4, 4, 6, 2)];
        this._table.addChild(this._offersLine);
        this._board = as3.as(this._table.addChild(new Sprite()), Sprite);
        this._board.x = 312;
        this._board.y = 24;
        this.loadPictures();
        let st: any = CASINO.state;
        if (st && st.deal && st.deal.status == "open") {
            this.resume(st.deal);
        } else {
            this.redraw();
        }
    }

    private loadPictures(): void {
        let self: UndertakerGame = null;
        self = this;
        if (!UndertakerGame._closedBmd) {
            ImageCache.GetImageWithCallBack(UndertakerGame.CLOSED, (k: string, bmd: BitmapData, args: any[] = null): void => {
                if (bmd) {
                    UndertakerGame._closedBmd = bmd;
                    if (self.parent) {
                        self.drawCoffins();
                    }
                }
            });
        }
        if (!UndertakerGame._openBmd) {
            ImageCache.GetImageWithCallBack(UndertakerGame.OPEN, (k: string, bmd: BitmapData, args: any[] = null): void => {
                if (bmd) {
                    UndertakerGame._openBmd = bmd;
                    if (self.parent) {
                        self.drawCoffins();
                    }
                }
            });
        }
    }

    private coffinClick(c: int): Function {
        return (e: MouseEvent): void => {
            this.onCoffin(c);
        };
    }

    private playing(): boolean {
        return this._game != null && this._game.status == "open";
    }

    private rules(): any {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.deal ? st.rules.deal : { "prizes": [0, 0.01, 0.05, 0.1, 0.25, 0.33, 0.5, 0.75, 1, 1.5, 2.5, 5], "rounds": [3, 3, 2, 2] };
    }

    private kept(): int {
        return this._game ? this._game.kept | 0 : -1;
    }

    // ---- drawing
    private redraw(): void {
        this.drawCoffins();
        this.drawBoard();
        this.texts();
    }

    /** Every coffin as it stands (those turning over are left to tick()). */
    private drawCoffins(): void {
        let c: int = 0;
        while (c < 12) {
            if (!this.isTurning(c)) {
                this.drawCoffin(c, this._shownOpen[c] != null ? Number(this._shownOpen[c]) : NaN);
            }
            c++;
        }
    }

    private isTurning(c: int): boolean {
        let i: int = 0;
        while (i < this._turning.length) {
            if ((this._turning[i].c | 0) == c) {
                return true;
            }
            i++;
        }
        return false;
    }

    /** A coffin closed (prize NaN) or open showing its prize. */
    private drawCoffin(c: int, prize: number): void {
        let h: Sprite = as3.as(this._coffins[c], Sprite);
        CasinoUI.removeAll(h);
        let open: boolean = !isNaN(prize);
        let body: Sprite = new Sprite();
        body.x = -UndertakerGame.CFW / 2;
        h.addChild(body);
        let bmd: BitmapData = open ? UndertakerGame._openBmd : UndertakerGame._closedBmd;
        if (bmd) {
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            b.width = UndertakerGame.CFW;
            b.height = UndertakerGame.CFH;
            body.addChild(b);
        } else {
            let g: Shape = as3.as(body.addChild(new Shape()), Shape);
            g.graphics.lineStyle(2, 13144128, 1);
            g.graphics.beginFill((open ? 0x5A0C10 : 0x3A2018) >>> 0, 1);
            g.graphics.moveTo(UndertakerGame.CFW * 0.3, 0);
            g.graphics.lineTo(UndertakerGame.CFW * 0.7, 0);
            g.graphics.lineTo(UndertakerGame.CFW, UndertakerGame.CFH * 0.28);
            g.graphics.lineTo(UndertakerGame.CFW * 0.78, UndertakerGame.CFH);
            g.graphics.lineTo(UndertakerGame.CFW * 0.22, UndertakerGame.CFH);
            g.graphics.lineTo(0, UndertakerGame.CFH * 0.28);
            g.graphics.lineTo(UndertakerGame.CFW * 0.3, 0);
            g.graphics.endFill();
        }
        let mine: boolean = c == this.kept();
        if (open) {
            let big: boolean = prize >= 1;
            let t: TextField = CasinoUI.label(CasinoUI.mult(prize), prize >= 10 ? 12 : 13, (big ? 0xFF8A6A : 0xFFE6A8) >>> 0, true, UndertakerGame.CFW, TextFormatAlign.CENTER);
            t.y = UndertakerGame.CFH * 95 / 168 - 10;
            t.filters = [new GlowFilter(0, 1, 4, 4, 8, 2)];
            body.addChild(t);
        } else {
            let n: TextField = CasinoUI.label(String(c + 1), 15, 2757640, true, UndertakerGame.CFW, TextFormatAlign.CENTER);
            n.y = UndertakerGame.CFH * 72 / 168 - 11;
            body.addChild(n);
        }
        if (mine) {
            let tag: TextField = CasinoUI.label(KEYS.Get("io_t3c_yours"), 9, CasinoUI.GOLD, true, UndertakerGame.CFW, TextFormatAlign.CENTER);
            tag.y = UndertakerGame.CFH - 14;
            tag.filters = [new GlowFilter(0, 1, 3, 3, 8, 2)];
            body.addChild(tag);
            h.filters = [new GlowFilter(0xFFC040, 0.9, 12, 12, 2, 2), new DropShadowFilter(3, 60, 0, 0.5, 6, 6)];
        } else {
            h.filters = [new DropShadowFilter(3, 60, 0, 0.5, 6, 6)];
        }
        // opened coffins (not yours) fade back once the game is on
        h.alpha = Number(open && !mine && this.playing() ? 0.55 : 1);
        let clickable: boolean = !this._pending && (!this.playing() ? !this._game || this._revealQueue.length == 0 : this._game.phase == "open" && !mine && !open);
        h.buttonMode = h.useHandCursor = clickable;
    }

    /** The prizes, smallest first; those opened dimmed. */
    private drawBoard(fresh: boolean = false): void {
        // (fresh: the bet changed after a game: the board for the next one, at the new bet)
        let game: any = fresh ? null : this._game;
        CasinoUI.removeAll(this._board);
        let t: TextField = CasinoUI.label(KEYS.Get("io_t3c_prizes"), 12, CasinoUI.GOLD, true, 146, TextFormatAlign.CENTER);
        this._board.addChild(t);
        let prizes: any[] = as3.sort((as3.as(this.rules().prizes, Array)).concat(), Array.NUMERIC);
        // which are still sealed (the server's list, smallest first): matched off one by one
        let sealed: any[] = game && game.sealed ? (as3.as(game.sealed, Array)).concat() : prizes.concat();
        let stake: int = game ? game.stake | 0 : this._bet.value;
        this._boardBet = this._bet.value;
        let won: number = game && game.status != "open" ? this.wonMultiplier(game) : NaN;
        let i: int = 0;
        while (i < prizes.length) {
            let p: number = Number(prizes[i]);
            let k: int = this.indexOf(sealed, p);
            let lit: boolean = k >= 0;
            if (lit) {
                sealed.splice(k, 1);
            }
            let row: Sprite = new Sprite();
            row.name = "casinoDealBoard:" + i;
            row.y = 20 + i * 27;
            let bg: Shape = as3.as(row.addChild(new Shape()), Shape);
            bg.graphics.beginFill((p >= 1 ? 0x8A1A0C : 0x6A4A14) >>> 0, lit ? 0.85 : 0.2);
            bg.graphics.drawRoundRect(0, 0, 146, 24, 8, 8);
            bg.graphics.endFill();
            let m: TextField = CasinoUI.label(CasinoUI.mult(p), 12, (lit ? 0xFFFFFF : 0x806858) >>> 0, true, 64);
            m.x = 6;
            m.y = 3;
            row.addChild(m);
            let v: TextField = CasinoUI.label(CasinoUI.shiny(stake * p), 10, (lit ? CasinoUI.GOLD : 0x806858) >>> 0, true, 74, TextFormatAlign.RIGHT);
            v.x = 66;
            v.y = 5;
            row.addChild(v);
            if (!isNaN(won) && Math.abs(won - p) < 1e-9 && game.end != "deal") {
                bg.graphics.lineStyle(2, CasinoUI.WIN, 1);
                bg.graphics.drawRoundRect(0, 0, 146, 24, 8, 8);
            }
            this._board.addChild(row);
            i++;
        }
    }

    private indexOf(a: any[], p: number): int {
        let i: int = 0;
        while (i < a.length) {
            if (Math.abs(Number(a[i]) - p) < 1e-9) {
                return i;
            }
            i++;
        }
        return -1;
    }

    private texts(): void {
        let g: any = this._game;
        let r: any = this.rules();
        let offers: any[] = g && g.offers ? as3.as(g.offers, Array) : [];
        this._offersLine.text = offers.length ? KEYS.Get("io_t3c_offers_down", { "v1": offers.map((o: any, i: int, a: any[]): string => {
            return CasinoUI.mult(Number(o));
        }).join("   ") }) : "";
        if (!this.playing()) {
            if (!g) {
                this._round.text = KEYS.Get("io_t3c_pick_your");
                this._info.text = KEYS.Get("io_t3c_pick_a");
                this._info2.text = KEYS.Get("io_t3c_deal_intro");
            } else {
                this._round.text = KEYS.Get("io_t3c_pick_again");
            }
            return;
        }
        let n: int = g.to_open | 0;
        if (g.phase == "open") {
            this._round.text = KEYS.Get(n == 1 ? "io_t3c_round_open1" : "io_t3c_round_open", { "v1": (g.round | 0) + 1, "v2": g.rounds | 0, "v3": n });
            this._info.text = KEYS.Get("io_t3c_open_more", { "v1": n });
            this._info2.text = KEYS.Get("io_t3c_your_coffin_n", { "v1": (g.kept | 0) + 1 }) + "\n" + KEYS.Get("io_t3c_click_coffins");
        } else if (g.phase == "offer") {
            this._round.text = KEYS.Get("io_t3c_makes_offer");
            this._info.text = KEYS.Get("io_t3c_deal_q");
            this._info2.text = KEYS.Get("io_t3c_he_offers", { "v1": CasinoUI.mult(Number(g.offer)), "v2": CasinoUI.shiny((g.stake | 0) * Number(g.offer)), "v3": (g.kept | 0) + 1 });
        } else if (g.phase == "final") {
            this._round.text = KEYS.Get("io_t3c_two_left");
            this._info.text = KEYS.Get("io_t3c_keep_swap_q");
            this._info2.text = KEYS.Get("io_t3c_keep_or", { "v1": (g.kept | 0) + 1, "v2": this.otherSealed() + 1 });
        }
    }

    /** The other coffin still sealed at the end. */
    private otherSealed(): int {
        let c: int = 0;
        while (c < 12) {
            if (c != this.kept() && this._shownOpen[c] == null) {
                return c;
            }
            c++;
        }
        return -1;
    }

    /** What the game paid, as a multiplier: the offer taken, or the kept coffin's prize. */
    private wonMultiplier(g: any): number {
        if (g.end == "deal") {
            return Number(g.offer);
        }
        let prizes: any[] = as3.as(g.prizes, Array);
        return Number(prizes ? Number(prizes[g.kept | 0]) : 0);
    }

    // ---- the Undertaker's offer, keep or swap
    private showPopup(): void {
        this.hidePopup();
        let g: any = this._game;
        if (!this.playing() || (g.phase != "offer" && g.phase != "final")) {
            return;
        }
        let p: Sprite = new Sprite();
        p.name = "casinoDealPopup";
        p.addChild(CasinoUI.panel(276, 170, 0.95));
        p.x = 14;
        p.y = 104;
        p.filters = [new GlowFilter(0xFF4010, 0.7, 18, 18, 2, 2)];
        let a: Sprite = null;
        let b: Sprite = null;
        if (g.phase == "offer") {
            p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_offers"), 13, CasinoUI.EMBER, true, 256, TextFormatAlign.CENTER), 10, 10));
            // (QoL #581: the title font has no ×)
            let o: TextField = CasinoUI.title(CasinoUI.mult(Number(g.offer), true), 34, 256);
            o.name = "casinoDealOffer";
            o.x = 10;
            o.y = 30;
            p.addChild(o);
            p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_eq_for", { "v1": CasinoUI.shiny((g.stake | 0) * Number(g.offer)), "v2": (g.kept | 0) + 1 }), 11, CasinoUI.GOLD, true, 256, TextFormatAlign.CENTER), 10, 76));
            a = CasinoUI.button(KEYS.Get("io_t3c_ut_deal"), 120, 42, (e: MouseEvent): void => {
                this.decide("deal");
            }, true, 20);
            a.name = "casinoDeal:deal";
            b = CasinoUI.button(KEYS.Get("io_t3c_ut_nodeal"), 120, 42, (e: MouseEvent): void => {
                this.decide("nodeal");
            }, true, 18);
            b.name = "casinoDeal:nodeal";
        } else {
            p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_two_left"), 13, CasinoUI.EMBER, true, 256, TextFormatAlign.CENTER), 10, 10));
            let q: TextField = CasinoUI.label(KEYS.Get("io_t3c_keep_or_q", { "v1": (g.kept | 0) + 1, "v2": this.otherSealed() + 1 }), 13, 16777215, true, 256, TextFormatAlign.CENTER);
            q.multiline = q.wordWrap = true;
            q.height = 44;
            q.x = 10;
            q.y = 36;
            p.addChild(q);
            let left: any[] = (as3.as(g.sealed, Array));
            p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_one_holds", { "v1": CasinoUI.mult(Number(left[0])), "v2": CasinoUI.mult(Number(left[left.length - 1])) }), 11, CasinoUI.GOLD, true, 256, TextFormatAlign.CENTER), 10, 82));
            a = CasinoUI.button(KEYS.Get("io_t3c_keep"), 120, 42, (e: MouseEvent): void => {
                this.decide("keep");
            }, true, 20);
            a.name = "casinoDeal:keep";
            b = CasinoUI.button(KEYS.Get("io_t3c_swap"), 120, 42, (e: MouseEvent): void => {
                this.decide("swap");
            }, true, 20);
            b.name = "casinoDeal:swap";
        }
        a.x = 12;
        a.y = 114;
        b.x = 144;
        b.y = 114;
        p.addChild(a);
        p.addChild(b);
        this._popup = p;
        this._table.addChild(p);
        SOUNDS.Play("purchasepopup", 0.5);
    }

    private hidePopup(): void {
        if (this._popup) {
            if (this._popup.parent) {
                this._popup.parent.removeChild(this._popup);
            }
            this._popup = null;
        }
    }

    private popupButtons(on: boolean): void {
        if (!this._popup) {
            return;
        }
        let names: any[] = ["casinoDeal:deal", "casinoDeal:nodeal", "casinoDeal:keep", "casinoDeal:swap"];
        for (const $value of as3.values(names)) {
            let n: string = as3.str($value);
            let b: Sprite = as3.as(this._popup.getChildByName(n), Sprite);
            if (b) {
                CasinoUI.enable(b, on);
            }
        }
    }

    // ---- playing
    private resume(g: any): void {
        this._game = g;
        this._bet.setValue(g.stake | 0);
        this._shownOpen = {};
        for (let o of as3.values(as3.as(g.opened, Array))) {
            this._shownOpen[o[0] | 0] = Number(o[1]);
        }
        this._win.message(KEYS.Get("io_t3c_resume"), CasinoUI.GOLD);
        this.redraw();
        this.showPopup();
    }

    private onCoffin(c: int): void {
        if (this._pending || this._revealQueue.length || this._turning.length) {
            return;
        }
        if (!this.playing()) {
            this.start(c);
            return;
        }
        let g: any = this._game;
        if (g.phase != "open" || c == (g.kept | 0) || this._shownOpen[c] != null) {
            if (g.phase == "offer" || g.phase == "final") {
                this.showPopup();
            }
            return;
        }
        this._pending = true;
        this.drawCoffins();
        CASINO.dealOpen(g.session_id | 0, c, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.drawCoffins();
                return;
            }
            this._game = r;
            let prize: number = NaN;
            for (let o of as3.values(as3.as(r.opened, Array))) {
                if ((o[0] | 0) == c) {
                    prize = Number(o[1]);
                }
            }
            this.turn(c, prize);
            if (prize >= 1) {
                this._win.message(KEYS.Get("io_t3c_coffin_gone", { "v1": c + 1, "v2": CasinoUI.mult(prize) }), CasinoUI.LOSS);
            } else {
                this._win.message(KEYS.Get("io_t3c_coffin_held", { "v1": c + 1, "v2": CasinoUI.mult(prize) }), CasinoUI.WIN);
            }
            if (r.phase == "offer") {
                this._popupIn = 30;
            }
            this.drawBoard();
            this.texts();
        });
    }

    private start(c: int): void {
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
            return;
        }
        let bet: int = this._bet.value;
        if (CASINO.credits() < bet) {
            this._win.message(KEYS.Get("io_t3c_no_shiny_bet"), CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        // (QoL #385: more than half the Shiny asked about first, once; a Yes picks the same coffin)
        if (CASINO.ioAskBig("deal", bet, (): void => {
            if (this.parent) {
                this.onCoffin(c);
            }
        })) {
            return;
        }
        this.flushCredits();
        this._pending = true;
        this._game = null;
        this._shownOpen = {};
        this._keptBefore = -1;
        this.hidePopup();
        this.redraw();
        CASINO.dealStart(bet, c, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                CASINO.getState((s: any): void => {
                    if (this.parent && CASINO.state && CASINO.state.deal) {
                        this.resume(CASINO.state.deal);
                    }
                });
                this.redraw();
                return;
            }
            this._game = r;
            CASINO.setCredits(r.credits | 0);
            SOUNDS.Play("click1");
            this._win.message(KEYS.Get("io_t3c_coffin_yours", { "v1": c + 1, "v2": r.to_open | 0 }), CasinoUI.GOLD);
            this.redraw();
        });
    }

    private decide(choice: string): void {
        if (!this.playing() || this._pending) {
            return;
        }
        this._pending = true;
        this.popupButtons(false);
        if (choice == "swap") {
            this._keptBefore = this.kept();
        }
        CASINO.dealDecide(this._game.session_id | 0, choice, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.popupButtons(true);
                return;
            }
            this._game = r;
            this.hidePopup();
            if (r.status == "open") {
                if (r.phase == "final") {
                    this._win.message(KEYS.Get("io_t3c_nodeal_two"), CasinoUI.GOLD);
                    this._popupIn = 12;
                } else {
                    this._win.message(KEYS.Get("io_t3c_nodeal_more", { "v1": r.to_open | 0 }), CasinoUI.GOLD);
                }
                this.redraw();
                return;
            }
            this.finish(r);
        });
    }

    /** The game over: every coffin turns over, yours last, then the win is paid. */
    private finish(r: any): void {
        let prizes: any[] = as3.as(r.prizes, Array);
        let mult: number = this.wonMultiplier(r);
        let payout: int = r.payout | 0;
        let mine: int = r.kept | 0;
        let held: number = Number(prizes[mine]);
        this._revealQueue = [];
        let c: int = 0;
        while (c < 12) {
            if (this._shownOpen[c] == null && c != mine) {
                this._revealQueue.push(c);
            }
            c++;
        }
        this._revealQueue.push(mine);
        this._revealT = 10;
        if (r.end == "deal") {
            this._info.text = KEYS.Get("io_t3c_deal_done", { "v1": CasinoUI.mult(mult) });
            this._info2.text = "+" + CasinoUI.number(payout) + " Shiny.\n" + KEYS.Get(held > mult ? "io_t3c_held_ut_wins" : "io_t3c_held_good", { "v1": CasinoUI.mult(held) }) + "\n" + KEYS.Get("io_t3c_pick_play");
            this._win.message(KEYS.Get("io_t3c_deal_at", { "v1": CasinoUI.mult(mult), "v2": CasinoUI.number(payout) }), CasinoUI.WIN);
        } else {
            this._info.text = KEYS.Get("io_t3c_your_coffin", { "v1": CasinoUI.mult(mult) });
            let swapped: string = r.end == "swap" && this._keptBefore >= 0 ? KEYS.Get("io_t3c_swapped", { "v1": mine + 1, "v2": this._keptBefore + 1, "v3": CasinoUI.mult(Number(prizes[this._keptBefore])) }) + "\n" : "";
            this._info2.text = swapped + (payout > 0 ? "+" + CasinoUI.number(payout) + " Shiny." : KEYS.Get("io_t3c_nothing_in")) + "\n" + KEYS.Get("io_t3c_pick_play");
        }
        this._creditsAt = { "t": this._revealQueue.length * 10 + 20, "credits": r.credits | 0, "payout": payout, "staked": r.stake | 0, "mult": mult, "end": String(r.end) };
        this.drawBoard();
        this.texts();
        this.drawCoffins();
    }

    /** A coffin turns over to show its prize. */
    private turn(c: int, prize: number): void {
        this._turning.push({ "c": c, "t": 12, "prize": prize });
        SOUNDS.Play("click1", 0.6);
    }

    private flushCredits(): void {
        if (this._creditsAt) {
            CASINO.setCredits(this._creditsAt.credits | 0);
            this._creditsAt = null;
        }
        while (this._revealQueue.length) {
            let c: int = this._revealQueue.shift() | 0;
            if (this._game && this._game.prizes) {
                this._shownOpen[c] = Number((as3.as(this._game.prizes, Array))[c]);
            }
        }
        this._turning = [];
        this._popupIn = 0;
        let k: int = 0;
        while (k < this._coffins.length) {
            (as3.as(this._coffins[k], Sprite)).scaleX = 1;
            k++;
        }
    }

    public tick(): void {
        this._t++;
        // (after a game too: the board kept the last game's Shiny, at the old bet, till a coffin was picked)
        if (!this.playing() && this._bet && this._bet.value != this._boardBet) {
            this.drawBoard(this._game != null);
        }
        let i: int = (this._turning.length - 1) | 0;
        while (i >= 0) {
            let tu: any = this._turning[i];
            tu.t--;
            let h: Sprite = as3.as(this._coffins[tu.c | 0], Sprite);
            h.scaleX = Math.max(0.02, Math.abs(tu.t - 6) / 6);
            if (tu.t == 6) {
                this._shownOpen[tu.c | 0] = Number(tu.prize);
                this.drawCoffin(tu.c | 0, Number(tu.prize));
            }
            if (tu.t <= 0) {
                h.scaleX = 1;
                this._turning.splice(i, 1);
                this.drawCoffin(tu.c | 0, Number(tu.prize));
            }
            i--;
        }
        if (this._revealQueue.length) {
            this._revealT--;
            if (this._revealT <= 0) {
                let c: int = this._revealQueue.shift() | 0;
                this.turn(c, Number((as3.as(this._game.prizes, Array))[c]));
                this._revealT = this._revealQueue.length == 1 ? 24 : 10;
            }
        }
        if (this._popupIn > 0) {
            this._popupIn--;
            if (this._popupIn == 0) {
                this.texts();
                this.showPopup();
            }
        }
        if (this._shake > 0) {
            this._shake--;
            this._table.x = Number(UndertakerGame.TX + (this._shake > 0 ? (Math.random() - 0.5) * 8 : 0));
        }
        if (this._creditsAt) {
            this._creditsAt.t--;
            if (this._creditsAt.t <= 0) {
                let ca: any = this._creditsAt;
                this._creditsAt = null;
                CASINO.setCredits(ca.credits | 0);
                this.drawCoffins();
                if ((ca.payout | 0) > 0) {
                    CasinoUI.ioWinSound(Number(ca.mult) >= 10);
                    this._win.bigWin(ca.payout | 0, ca.staked | 0);
                }
                if (ca.end != "deal") {
                    if ((ca.payout | 0) > (ca.staked | 0)) {
                        this._win.message(KEYS.Get("io_t3c_held_win", { "v1": CasinoUI.mult(Number(ca.mult)), "v2": CasinoUI.number(ca.payout | 0) }), CasinoUI.WIN);
                    } else {
                        this._win.message((ca.payout | 0) > 0 ? KEYS.Get("io_t3c_held_win", { "v1": CasinoUI.mult(Number(ca.mult)), "v2": CasinoUI.number(ca.payout | 0) }) : KEYS.Get("io_t3c_held", { "v1": CasinoUI.mult(Number(ca.mult)) }), Number(ca.mult) >= 1 ? CasinoUI.WIN : CasinoUI.LOSS);
                        if (Number(ca.mult) < 0.5) {
                            this._shake = 16;
                            CasinoUI.ioLoseSound();
                        }
                    }
                }
            }
        }
    }

    public get showing(): boolean {
        return this._pending || this._creditsAt != null || this._turning.length > 0 || this._revealQueue.length > 0;
    }

    public dispose(): void {
        this.flushCredits();
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
