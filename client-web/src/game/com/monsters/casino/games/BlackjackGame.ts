import * as as3 from "as3";
import { int, uint } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoCards, CasinoUI, CasinoWindow, GLOBAL, KEYS, SOUNDS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * Cinderjack (blackjack; the Brimstone Pit, 7 October, the user's pick): the player against Moloch, the
 * dealer. The server shuffles a six-deck shoe for every hand from the player's seeds and deals from it
 * (server/src/services/casino/cardSessions.ts, games/blackjack.ts); this shows the cards it sends as they are
 * dealt. Hit, stand, double (any two cards) or split a pair once; the dealer stands on 17; a blackjack pays 3 to 2.
 * A hand left open is picked up again when the game is opened.
 */
export class BlackjackGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _deal: null, _hit: null, _stand: null, _double: null, _split: null, _info: null, _info2: null, _table: null, _cardLayer: null, _dealerText: null, _handTexts: null, _banner: null, _cards: null, _game: null, _hands: 1, _pending: false, _creditsAt: null, _bannerT: 0, _bannerWait: 0, _t: 0, _ioHint: false, _ioHintBtn: null, _ioHintLine: null });
    }

    private static readonly TX: int = 220;

    private static readonly CARD_W: int = 66;

    private static readonly SHOE_X: number = 404;

    private static readonly SHOE_Y: number = 22;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _deal: Sprite;
    private _hit: Sprite;
    private _stand: Sprite;
    private _double: Sprite;
    private _split: Sprite;
    private _info: TextField;
    private _info2: TextField;
    private _table: Sprite;
    private _cardLayer: Sprite;
    private _dealerText: TextField;
    private _handTexts: any[];
    private _banner: TextField;
    /** The cards on the table: key ("d0", "p1_2") -> {s, card, tx, ty, delay, flip}. */
    private _cards: any;
    /** The game (the server's view of it), or null. */
    private _game: any;
    private _hands: int;
    private _pending: boolean;
    /** The Shiny to show once the dealer's cards are out (frames to wait, credits). */
    private _creditsAt: any;
    private _bannerT: int;
    /** Frames after the hand's end before its banner shows (the dealer's last card down). */
    private _bannerWait: int;
    private _t: int;
    /** Inferno-only (QoL #393): the basic-strategy hint shown (off at first; the player's choice is kept, CASINO.ioRemember). */
    private _ioHint: boolean;
    private _ioHintBtn: Sprite;
    /** The hint's line, under the hand's lines. */
    private _ioHintLine: TextField;

    public $ctor(win?: CasinoWindow): void {
        this._handTexts = [];
        this._cards = {};
        super.$ctor();
        this._win = win;
        this.name = "casinoBlackjack";
        CasinoCards.preload();
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button(KEYS.Get("io_t3c_lobby"), 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("CINDERJACK", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_bet_label"), 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        this._deal = CasinoUI.button(KEYS.Get("io_t3c_deal"), 190, 44, as3.bind(this, this.onDeal), true, 20);
        this._deal.name = "casinoBjDeal";
        this._deal.x = 10;
        this._deal.y = 214;
        p.addChild(this._deal);
        this._hit = this.actButton(p, KEYS.Get("io_t3c_hint_hit"), "hit", 10, 214);
        this._stand = this.actButton(p, KEYS.Get("io_t3c_hint_stand"), "stand", 108, 214);
        this._double = this.actButton(p, KEYS.Get("io_t3c_hint_double"), "double", 10, 262);
        this._split = this.actButton(p, KEYS.Get("io_t3c_split"), "split", 108, 262);
        this._info = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._info.name = "casinoBjInfo";
        this._info.x = 10;
        this._info.y = 312;
        p.addChild(this._info);
        this._info2 = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._info2.x = 10;
        this._info2.y = 332;
        this._info2.multiline = this._info2.wordWrap = true;
        this._info2.height = 64;
        p.addChild(this._info2);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #393: HINT beside LOBBY, and its line at the panel's foot, under "Moloch shows ... On the table ...")
            this._ioHint = CASINO.ioRecall("hint:blackjack") == "1";
            this._ioHintBtn = CasinoUI.toggle(KEYS.Get("io_pit_hint"), 54, 26, (e: MouseEvent): void => {
                this._ioHint = !this._ioHint;
                CASINO.ioRemember("hint:blackjack", this._ioHint ? "1" : "");
                this.ioShowHint();
            });
            this._ioHintBtn.name = "ioCjHint";
            this._ioHintBtn.x = 146;
            this._ioHintBtn.y = 10;
            p.addChild(this._ioHintBtn);
            this._ioHintLine = CasinoUI.label("", 11, 0x9CFF6A, true, 190, TextFormatAlign.CENTER);
            this._ioHintLine.name = "ioCjHintLine";
            this._ioHintLine.x = 10;
            this._ioHintLine.y = 372;
            p.addChild(this._ioHintLine);
            CasinoUI.choose(this._ioHintBtn, this._ioHint);
        }
        // the table
        this._table = as3.as(this.addChild(new Sprite()), Sprite);
        this._table.x = BlackjackGame.TX;
        this._table.addChild(CasinoUI.panel(480, 400, 1));
        let felt: Sprite = as3.as(this._table.addChild(new Sprite()), Sprite);
        CasinoUI.picture(felt, "casino/blackjack/table.jpg", 3, 3, 474, 394);
        // the shoe: a stack of backs
        let shoe: Sprite = as3.as(this._table.addChild(new Sprite()), Sprite);
        let k: int = 0;
        while (k < 4) {
            let cb: Sprite = CasinoCards.card(-1, 0, 50);
            cb.x = BlackjackGame.SHOE_X + k * 2;
            cb.y = BlackjackGame.SHOE_Y - k * 2;
            cb.rotation = 8;
            shoe.addChild(cb);
            k++;
        }
        this._dealerText = CasinoUI.label("", 13, 16777215, true, 300, TextFormatAlign.CENTER);
        this._dealerText.name = "casinoBjDealer";
        this._dealerText.x = 90;
        this._dealerText.y = 136;
        this._dealerText.filters = [new GlowFilter(0, 1, 4, 4, 8, 2)];
        this._table.addChild(this._dealerText);
        this._cardLayer = as3.as(this._table.addChild(new Sprite()), Sprite);
        k = 0;
        while (k < 2) {
            let ht: TextField = CasinoUI.label("", 12, 16777215, true, 220, TextFormatAlign.CENTER);
            ht.name = "casinoBjHand" + k;
            ht.multiline = true;
            ht.height = 40;
            ht.y = 346;
            ht.filters = [new GlowFilter(0, 1, 4, 4, 8, 2)];
            this._table.addChild(ht);
            this._handTexts.push(ht);
            k++;
        }
        this._banner = CasinoUI.title("", 30, 470);
        this._banner.name = "casinoBjBanner";
        this._banner.x = 5;
        this._banner.y = 172;
        this._table.addChild(this._banner);
        let st: any = CASINO.state;
        if (st && st.blackjack && st.blackjack.status == "open") {
            this.resume(st.blackjack);
        } else {
            this.buttons();
            this.idleInfo();
        }
    }

    private actButton(p: Sprite, text: string, action: string, x: number, y: number): Sprite {
        let b: Sprite = CasinoUI.button(text, 92, 42, (e: MouseEvent): void => {
            this.act(action);
        }, false, 16);
        b.name = "casinoBj:" + action;
        b.x = x;
        b.y = y;
        b.visible = false;
        p.addChild(b);
        return b;
    }

    private playing(): boolean {
        return this._game != null && this._game.status == "open";
    }

    private buttons(): void {
        let on: boolean = this.playing();
        let o: any = on ? this._game.options : null;
        this._deal.visible = !on;
        CasinoUI.enable(this._deal, !this._pending);
        let more: int = on && this._game.hands[this._game.at] ? this._game.hands[this._game.at].stake | 0 : 0;
        for (let b of as3.values([this._hit, this._stand, this._double, this._split])) {
            b.visible = on;
        }
        CasinoUI.enable(this._hit, Boolean(on && o && o.hit && !this._pending));
        CasinoUI.enable(this._stand, Boolean(on && o && o.stand && !this._pending));
        CasinoUI.enable(this._double, Boolean(on && o && o.double && !this._pending && CASINO.credits() >= more));
        CasinoUI.enable(this._split, Boolean(on && o && o.split && !this._pending && CASINO.credits() >= more));
        this.ioShowHint();
    }

    /**
     * Inferno-only (QoL #393): the basic-strategy move for the hand being played against Moloch's up card (the
     * simple table, for these rules: he stands on every 17, double on any two cards): hard 17 or more stand; 13 to 16
     * stand against 2 to 6; 12 stand against 4 to 6; 11 double; 10 double against 2 to 9; else hit. Soft 19 or more
     * stand; soft 18 stand against 2 to 8; else hit. A double the hand can't take (three cards, too little Shiny)
     * says hit. Pairs are played as their total (the table has no splits). "" when there is no move to make.
     */
    private ioHintMove(): string {
        if (!this.playing() || this._pending) {
            return "";
        }
        let g: any = this._game;
        let h: any = g.hands ? g.hands[g.at | 0] : null;
        let o: any = g.options;
        if (!h || !o || !o.hit || !o.stand) {
            return "";
        }
        let total: int = h.total | 0;
        // (the up card's value while the hand is open: 2 to 10, an Ace 11)
        let up: int = g.dealer_total | 0;
        let move: string = "hit";
        if (h.soft) {
            if (total >= 19 || (total == 18 && up >= 2 && up <= 8)) {
                move = "stand";
            }
        } else if (total >= 17 || (total >= 13 && up >= 2 && up <= 6) || (total == 12 && up >= 4 && up <= 6)) {
            move = "stand";
        } else if (total == 11 || (total == 10 && up >= 2 && up <= 9)) {
            move = "double";
        }
        if (move == "double" && !(o.double && this._double && this._double["casinoEnabled"])) {
            move = "hit";
        }
        return move;
    }

    /** QoL #393: the hint's line as the hand is now (empty when the hint is off or there is nothing to play). */
    private ioShowHint(): void {
        if (!this._ioHintLine) {
            return;
        }
        CasinoUI.choose(this._ioHintBtn, this._ioHint);
        let move: string = this._ioHint ? this.ioHintMove() : "";
        CasinoUI.setText(this._ioHintLine, move ? KEYS.Get("io_pit_hint_line", { "v1": KEYS.Get("io_t3c_hint_" + move) }) : "");
    }

    private idleInfo(): void {
        this._info.text = KEYS.Get("io_t3c_bj_pays");
        this._info2.text = KEYS.Get("io_t3c_bj_rules");
    }

    private resume(g: any): void {
        this._game = g;
        this._bet.setValue(((g.hands[0].stake | 0) / (g.hands[0].doubled ? 2 : 1)) | 0);
        this.clearTable();
        this.sync(g, false);
        this._win.message(KEYS.Get("io_t3c_bj_resume"), CasinoUI.GOLD);
        this.buttons();
        this.playInfo();
    }

    private clearTable(): void {
        CasinoUI.removeAll(this._cardLayer);
        this._cards = {};
        this._hands = 1;
        this._dealerText.text = "";
        for (let t of as3.values(this._handTexts)) {
            t.text = "";
        }
        this._banner.text = "";
    }

    // ---- the cards on the table
    /** Where hand h's card i goes (one hand in the middle, two side by side). */
    private handSpot(h: int, n: int, i: int): any[] {
        let cx: number = n == 1 ? 240 : (h == 0 ? 124 : 356);
        let step: number = n == 1 ? 30 : 24;
        let count: int = Math.max(1, this._game.hands[h].cards.length | 0) | 0;
        let x0: number = cx - (BlackjackGame.CARD_W + (count - 1) * step) / 2;
        return [x0 + i * step, 232 - i * 4];
    }

    private dealerSpot(i: int, count: int): any[] {
        let x0: number = 240 - (BlackjackGame.CARD_W + (count - 1) * 44) / 2;
        return [x0 + i * 44, 36];
    }

    /** The table brought to the server's view: new cards dealt from the shoe, one after another. */
    private sync(g: any, animate: boolean): void {
        let i: int = 0;
        let order: int = 0;
        let hands: any[] = as3.as(g.hands, Array);
        // a split: the pair's second card goes over to the new hand
        if (hands.length > this._hands && this._cards["p0_1"]) {
            this._cards["p1_0"] = this._cards["p0_1"];
            delete this._cards["p0_1"];
        }
        this._hands = hands.length;
        let h: int = 0;
        while (h < hands.length) {
            let cards: any[] = as3.as(hands[h].cards, Array);
            i = 0;
            while (i < cards.length) {
                let spot: any[] = this.handSpot(h, hands.length, i);
                order = this.place("p" + h + "_" + i, cards[i] | 0, spot, animate, order);
                i++;
            }
            h++;
        }
        let dealer: any[] = as3.as(g.dealer, Array);
        let over: boolean = g.status != "open";
        let dn: int = Math.max(2, dealer.length) | 0;
        i = 0;
        while (i < dn) {
            // (the hole card face down until the hand is over)
            let card: int = i < dealer.length ? dealer[i] | 0 : -1;
            order = this.place("d" + i, card, this.dealerSpot(i, dn), animate, order);
            i++;
        }
        // the hand being played lit
        h = 0;
        while (h < hands.length) {
            let lit: boolean = !over && h == (g.at | 0) && hands.length > 1;
            for (let k in this._cards) {
                if (k.indexOf("p" + h + "_") == 0) {
                    this._cards[k].s.filters = lit ? [new GlowFilter(0xFFD040, 0.9, 12, 12, 2, 2)] : this._cards[k].shadow;
                }
            }
            h++;
        }
        this.texts(g);
    }

    /** A card at its spot: dealt from the shoe if it is new, turned over if it was face down. */
    private place(key: string, card: int, spot: any[], animate: boolean, order: int): int {
        let c: any = this._cards[key];
        if (c && c.card != card) {
            if (c.card < 0 && card >= 0) {
                // turned over: the face replaces the back half way through the turn
                c.flipTo = card;
                c.flip = 12;
                c.delay = animate ? order * 7 : 0;
                c.card = card;
                order++;
            } else {
                c.s.parent.removeChild(c.s);
                c = null;
            }
        }
        if (!c) {
            let s: Sprite = CasinoCards.card((card < 0 ? -1 : card % 13) | 0, card < 0 ? 0 : (card / 13) | 0, BlackjackGame.CARD_W);
            s.name = s.name + ":" + key;
            this._cardLayer.addChild(s);
            c = { "s": s, "card": card, "delay": animate ? order * 7 : 0, "flip": 0, "shadow": s.filters };
            if (animate) {
                s.x = BlackjackGame.SHOE_X;
                s.y = BlackjackGame.SHOE_Y;
                s.rotation = 8;
                s.visible = false;
            } else {
                s.x = Number(spot[0]);
                s.y = Number(spot[1]);
            }
            this._cards[key] = c;
            order++;
        }
        c.tx = spot[0];
        c.ty = spot[1];
        return order;
    }

    private texts(g: any): void {
        let over: boolean = g.status != "open";
        let dealer: any[] = as3.as(g.dealer, Array);
        this._dealerText.text = over ? "MOLOCH " + String(g.dealer_total) : KEYS.Get("io_t3c_bj_shows", { "v1": g.dealer_total });
        let hands: any[] = as3.as(g.hands, Array);
        let i: int = 0;
        while (i < 2) {
            let t: TextField = as3.cast(this._handTexts[i], TextField);
            if (i >= hands.length) {
                t.text = "";
                i++;
                continue;
            }
            let h: any = hands[i];
            t.x = hands.length == 1 ? 130 : (i == 0 ? 14 : 246);
            let total: string = h.soft && (h.total | 0) < 21 && !h.done ? KEYS.Get("io_t3c_bj_soft", { "v1": h.total }) : String(h.total);
            let line: string = ((h.total | 0) > 21 && !h.result ? KEYS.Get("io_t3c_bj_bust_n", { "v1": h.total }) : total) + "  ·  " + KEYS.Get("io_t3c_bj_bet", { "v1": CasinoUI.number(h.stake | 0) }) + (h.doubled ? " " + KEYS.Get("io_t3c_bj_doubled") : "");
            if (h.result) {
                let res: any = { "blackjack": "BLACKJACK", "win": KEYS.Get("io_t3c_bj_r_win"), "push": KEYS.Get("io_t3c_bj_r_push"), "lose": KEYS.Get("io_t3c_bj_r_lose"), "bust": KEYS.Get("io_t3c_bj_r_bust") };
                line += "\n" + res[h.result] + ((h.payout | 0) > 0 && h.result != "push" ? " +" + CasinoUI.number(Number(h.payout) - Number(h.stake)) : "");
                t.textColor = h.result == "win" || h.result == "blackjack" ? CasinoUI.WIN : (h.result == "push" ? CasinoUI.GOLD : CasinoUI.LOSS);
            } else {
                t.textColor = 16777215;
            }
            t.text = line;
            i++;
        }
    }

    private playInfo(): void {
        if (!this.playing()) {
            return;
        }
        let g: any = this._game;
        let h: any = g.hands[g.at];
        this._info.text = g.hands.length > 1 ? KEYS.Get("io_t3c_bj_hand", { "v1": (g.at | 0) + 1, "v2": (h ? h.total : "") }) : KEYS.Get("io_t3c_bj_your", { "v1": (h ? h.total : "") });
        this._info2.text = KEYS.Get("io_t3c_bj_shows_line", { "v1": g.dealer_total }) + "\n" + KEYS.Get("io_t3c_bj_on_table", { "v1": CasinoUI.number(g.stake | 0) });
    }

    // ---- playing
    private onDeal(e: MouseEvent = null): void {
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
            return;
        }
        if (this._pending || this.playing()) {
            return;
        }
        // (the last hand's Shiny first: dealing again before it was shown checked the bet against the balance
        // without that hand's win; 9 October)
        this.flushCredits();
        let bet: int = this._bet.value;
        if (CASINO.credits() < bet) {
            this._win.message(KEYS.Get("io_t3c_no_shiny_bet"), CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        // (QoL #385: more than half the Shiny asked about first, once)
        if (CASINO.ioAskBig("blackjack", bet, (): void => {
            if (this.parent) {
                this.onDeal();
            }
        })) {
            return;
        }
        this._pending = true;
        this.clearTable();
        this.buttons();
        CASINO.blackjackStart(bet, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                CASINO.getState((s: any): void => {
                    if (this.parent && CASINO.state && CASINO.state.blackjack) {
                        this.resume(CASINO.state.blackjack);
                    }
                });
                this.buttons();
                return;
            }
            SOUNDS.Play("click1");
            this.answered(r);
        });
    }

    private act(action: string): void {
        if (!this.playing() || this._pending) {
            return;
        }
        this._pending = true;
        this.buttons();
        CASINO.blackjackAct(this._game.session_id | 0, action, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.buttons();
                return;
            }
            SOUNDS.Play(action == "stand" ? "click1" : "purchasepopup", 0.6);
            this.answered(r);
        });
    }

    /** The server's answer: the cards dealt, and the result once the hand is over. */
    private answered(r: any): void {
        this._game = r;
        this.sync(r, true);
        if (r.status == "open") {
            // (a double or a split took its stake: shown at once)
            CASINO.setCredits(r.credits | 0);
            this.playInfo();
        } else {
            this.over(r);
        }
        this.buttons();
    }

    private over(r: any): void {
        let payout: int = r.payout | 0;
        let staked: int = r.stake | 0;
        let hands: any[] = as3.as(r.hands, Array);
        let natural: boolean = hands.length == 1 && hands[0].result == "blackjack";
        let net: int = (payout - staked) | 0;
        let text: string = null;
        let color: uint = 0;
        if (natural) {
            text = "BLACKJACK!";
            color = CasinoUI.WIN;
        } else if (net > 0) {
            text = KEYS.Get("io_t3c_bj_youwin");
            color = CasinoUI.WIN;
        } else if (net == 0 && payout > 0) {
            text = KEYS.Get("io_t3c_bj_r_push");
            color = CasinoUI.GOLD;
        } else {
            text = (r.dealer_total | 0) == 21 && (as3.as(r.dealer, Array)).length == 2 ? KEYS.Get("io_t3c_bj_moloch_bj") : (hands.every((h: any, i: int, a: any[]): boolean => {
                return (h.total | 0) > 21;
            }) ? KEYS.Get("io_t3c_bj_r_bust") : KEYS.Get("io_t3c_bj_moloch_wins"));
            color = CasinoUI.LOSS;
        }
        this._banner.text = text;
        this._banner.textColor = color;
        this._banner.alpha = 0;
        this._bannerT = 0;
        // (the side panel's lines too wait for the cards: they told the hand while Moloch was still drawing)
        let info: string = net > 0 ? "+" + CasinoUI.number(net) + " SHINY" : (net == 0 && payout > 0 ? KEYS.Get("io_t3c_bj_stake_back") : "-" + CasinoUI.number(staked) + " SHINY");
        let info2: string = KEYS.Get("io_t3c_bj_paid", { "v1": CasinoUI.number(payout), "v2": CasinoUI.number(staked) });
        this._info.text = "";
        this._info2.text = "";
        // the Shiny, the banner and the line below when the dealer's cards are out (9 October: the banner came in
        // about halfway through the dealer's draw, and the line at once, telling the hand before it was dealt)
        let last: int = 0;
        for (let c of as3.values(this._cards)) {
            last = Math.max(last, (c.delay | 0) + 14 + (c.flip | 0)) | 0;
        }
        this._bannerWait = (last + 2) | 0;
        this._creditsAt = { "t": last + 6, "credits": r.credits | 0, "payout": payout, "staked": staked, "net": net, "line": net > 0 ? text + " +" + CasinoUI.number(net) + " Shiny" : (net == 0 && payout > 0 ? KEYS.Get("io_t3c_bj_push_line") : KEYS.Get("io_t3c_bj_lost", { "v1": text })), "color": color, "info": info, "info2": info2 };
        this._game = r;
    }

    private flushCredits(): void {
        if (this._creditsAt) {
            CASINO.setCredits(this._creditsAt.credits | 0);
            this._win.message(String(this._creditsAt.line), this._creditsAt.color >>> 0);
            this._info.text = String(this._creditsAt.info);
            this._info2.text = String(this._creditsAt.info2);
            this._creditsAt = null;
        }
    }

    public tick(): void {
        this._t++;
        for (let c of as3.values(this._cards)) {
            if (c.delay > 0) {
                c.delay--;
                continue;
            }
            let s: Sprite = as3.cast(c.s, Sprite);
            if (!s.visible) {
                s.visible = true;
                SOUNDS.Play("click1", 0.3);
            }
            if (Math.abs(s.x - c.tx) > 0.5 || Math.abs(s.y - c.ty) > 0.5 || s.rotation != 0) {
                s.x += (c.tx - s.x) * 0.3;
                s.y += (c.ty - s.y) * 0.3;
                s.rotation *= 0.6;
                if (Math.abs(s.rotation) < 0.3) {
                    s.rotation = 0;
                }
            }
            if (c.flip > 0) {
                c.flip--;
                // a turn: narrower to nothing, the face put in, wider again
                let k: number = Math.abs(c.flip - 6) / 6;
                s.scaleX = Math.max(0.02, k);
                if (c.flip == 6 && c.flipTo != null) {
                    let x: number = s.x;
                    let y: number = s.y;
                    let f: Sprite = CasinoCards.card(((c.flipTo | 0) % 13) | 0, ((c.flipTo | 0) / 13) | 0, BlackjackGame.CARD_W);
                    f.name = s.name.replace("back", CasinoCards.nameOf(((c.flipTo | 0) % 13) | 0, ((c.flipTo | 0) / 13) | 0));
                    f.x = x;
                    f.y = y;
                    f.scaleX = 0.02;
                    this._cardLayer.addChildAt(f, this._cardLayer.getChildIndex(s));
                    this._cardLayer.removeChild(s);
                    c.s = f;
                    c.shadow = f.filters;
                    c.flipTo = null;
                }
                if (c.flip == 0) {
                    c.s.scaleX = 1;
                }
            }
        }
        if (this._banner.text && this._bannerT < 200) {
            this._bannerT++;
            // (after the cards are out)
            this._banner.alpha = Number(this._bannerT < this._bannerWait ? 0 : Math.min(1, (this._bannerT - this._bannerWait) / 8));
            this._banner.scaleX = this._banner.scaleY = 1;
        }
        if (this._creditsAt) {
            this._creditsAt.t--;
            if (this._creditsAt.t <= 0) {
                let ca: any = this._creditsAt;
                this._creditsAt = null;
                CASINO.setCredits(ca.credits | 0);
                this._win.message(String(ca.line), ca.color >>> 0);
                this._info.text = String(ca.info);
                this._info2.text = String(ca.info2);
                if ((ca.net | 0) > 0) {
                    CasinoUI.ioWinSound();
                    this._win.bigWin(ca.payout | 0, ca.staked | 0);
                }
            }
        }
    }

    public get showing(): boolean {
        return this._pending || this._creditsAt != null;
    }

    public dispose(): void {
        this.flushCredits();
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
