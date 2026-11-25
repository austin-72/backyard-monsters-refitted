import * as as3 from "as3";
import { int } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { BetSelector, CASINO, CasinoCards, CasinoUI, CasinoWindow, KEYS, SOUNDS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * Higher or Lower (the Brimstone Pit, 7 October, the user's pick): a card shows; guess whether the next is the
 * same or higher, or the same or lower (Ace low). Each right guess raises the multiplier by its odds; cash out
 * whenever, lose the bet on a wrong guess. Skip a card to see another without a guess. The server drew the
 * game's cards at the start (server/src/services/casino/cardSessions.ts, games/hilo.ts) and turns them over one
 * by one. A game left open is picked up again when the game is opened.
 */
export class HiLoGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _start: null, _cashout: null, _hi: null, _lo: null, _skip: null, _info: null, _info2: null, _mult: null, _table: null, _cardHolder: null, _trail: null, _card: null, _turn: null, _game: null, _pending: false, _creditsAt: null, _shake: 0, _t: 0 });
    }

    private static readonly TX: int = 220;

    private static readonly BIG_W: int = 128;

    private static readonly SMALL_W: int = 40;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _start: Sprite;
    private _cashout: Sprite;

    /** QoL #560: START takes no click before this (getTimer): it appears where CASH OUT was, under the same finger. */
    private _ioStartReadyAt: int;
    private _hi: Sprite;
    private _lo: Sprite;
    private _skip: Sprite;
    private _info: TextField;
    private _info2: TextField;
    private _mult: TextField;
    private _table: Sprite;
    private _cardHolder: Sprite;
    private _trail: Sprite;
    private _card: Sprite;
    /** The card turning over: {from, to (rank 1-13, suit), t}. */
    private _turn: any;
    private _game: any;
    private _pending: boolean;
    private _creditsAt: any;
    private _shake: int;
    private _t: int;

    public $ctor(win?: CasinoWindow): void {
        super.$ctor();
        this._win = win;
        this.name = "casinoHiLo";
        CasinoCards.preload();
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button(KEYS.Get("io_t3c_lobby"), 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("HIGHER OR LOWER", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_bet_label"), 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        this._start = CasinoUI.button(KEYS.Get("io_t3c_start"), 190, 44, as3.bind(this, this.onStart), true, 20);
        this._start.name = "casinoHiLoStart";
        this._start.x = 10;
        this._start.y = 214;
        p.addChild(this._start);
        this._cashout = CasinoUI.button(KEYS.Get("io_t3c_cashout"), 190, 44, as3.bind(this, this.onCashout), false, 20);
        this._cashout.name = "casinoHiLoCashout";
        this._cashout.x = 10;
        this._cashout.y = 214;
        this._cashout.visible = false;
        p.addChild(this._cashout);
        this._info = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._info.name = "casinoHiLoInfo";
        this._info.x = 10;
        this._info.y = 270;
        p.addChild(this._info);
        this._info2 = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._info2.x = 10;
        this._info2.y = 292;
        this._info2.multiline = this._info2.wordWrap = true;
        this._info2.height = 100;
        p.addChild(this._info2);
        // the table
        this._table = as3.as(this.addChild(new Sprite()), Sprite);
        this._table.x = HiLoGame.TX;
        this._table.addChild(CasinoUI.panel(480, 400, 1));
        let felt: Sprite = as3.as(this._table.addChild(new Sprite()), Sprite);
        CasinoUI.picture(felt, "casino/hilo/table.jpg", 3, 3, 474, 394);
        // the deck, left of the card
        let k: int = 0;
        while (k < 5) {
            let cb: Sprite = CasinoCards.card(-1, 0, 86);
            cb.x = 36 + k * 2;
            cb.y = 66 - k * 2;
            this._table.addChild(cb);
            k++;
        }
        this._cardHolder = as3.as(this._table.addChild(new Sprite()), Sprite);
        this._cardHolder.x = 240 - HiLoGame.BIG_W / 2;
        this._cardHolder.y = 40;
        this._mult = CasinoUI.title("", 30, 160);
        this._mult.name = "casinoHiLoMultiplier";
        this._mult.x = 310;
        this._mult.y = 92;
        this._table.addChild(this._mult);
        this._hi = this.guessButton("hi", 30);
        this._lo = this.guessButton("lo", 250);
        this._skip = CasinoUI.button(KEYS.Get("io_t3c_skip"), 90, 30, (e: MouseEvent): void => {
            this.guess("skip");
        }, false, 13);
        this._skip.name = "casinoHiLo:skip";
        this._skip.x = 195;
        this._skip.y = 282;
        this._table.addChild(this._skip);
        this._trail = as3.as(this._table.addChild(new Sprite()), Sprite);
        this._trail.x = 14;
        this._trail.y = 322;
        let st: any = CASINO.state;
        if (st && st.hilo && st.hilo.status == "open") {
            this.resume(st.hilo);
        } else {
            this.showCard(null);
            this.buttons();
            this.texts();
        }
    }

    private guessButton(g: string, x: number): Sprite {
        let b: Sprite = CasinoUI.button(g == "hi" ? KEYS.Get("io_t3c_higher") : KEYS.Get("io_t3c_lower"), 200, 50, (e: MouseEvent): void => {
            this.guess(g);
        }, false, 18);
        b.name = "casinoHiLo:" + g;
        b.x = x;
        b.y = 224;
        this._table.addChild(b);
        return b;
    }

    private playing(): boolean {
        return this._game != null && this._game.status == "open";
    }

    private buttons(): void {
        let on: boolean = this.playing();
        let n: any = on ? this._game.next : null;
        if (!on && this._cashout.visible) {
            this._ioStartReadyAt = (getTimer() + 400) | 0;
        }
        this._start.visible = !on;
        this._cashout.visible = on;
        CasinoUI.enable(this._start, !this._pending);
        CasinoUI.enable(this._cashout, on && !this._pending && (this._game.right | 0) > 0);
        CasinoUI.enable(this._hi, Boolean(on && !this._pending && n && n.hi != null));
        CasinoUI.enable(this._lo, Boolean(on && !this._pending && n && n.lo != null));
        CasinoUI.enable(this._skip, on && !this._pending && (this._game.skips_left | 0) > 0);
        CasinoUI.relabel(this._hi, on && n && n.hi ? KEYS.Get("io_t3c_higher_pct", { "v1": Math.round(Number(n.hi.chance) * 100) }) : KEYS.Get("io_t3c_higher"));
        CasinoUI.relabel(this._lo, on && n && n.lo ? KEYS.Get("io_t3c_lower_pct", { "v1": Math.round(Number(n.lo.chance) * 100) }) : KEYS.Get("io_t3c_lower"));
    }

    private texts(): void {
        let g: any = this._game;
        if (this.playing()) {
            let m: number = Number(g.multiplier);
            // (QoL #581: the title font has no ×)
            CasinoUI.setText(this._mult, m > 0 ? CasinoUI.mult(m, true) : "");
            let n: any = g.next;
            this._info.text = m > 0 ? KEYS.Get("io_t3c_now", { "v1": CasinoUI.mult(m), "v2": CasinoUI.shiny((g.stake | 0) * m) }) : KEYS.Get("io_t3c_make_guess");
            this._info2.text = (n.hi ? KEYS.Get("io_t3c_hi_same", { "v1": CasinoUI.mult(Number(n.hi.multiplier)) }) + "\n" : "") + (n.lo ? KEYS.Get("io_t3c_lo_same", { "v1": CasinoUI.mult(Number(n.lo.multiplier)) }) + "\n" : "") + KEYS.Get((g.skips_left | 0) == 1 ? "io_t3c_skip_left1" : "io_t3c_skip_left", { "v1": g.skips_left | 0 });
        } else if (!g) {
            CasinoUI.setText(this._mult, "");
            this._info.text = KEYS.Get("io_t3c_guess_next");
            this._info2.text = KEYS.Get("io_t3c_hilo_rules");
        }
    }

    /** The card showing (the server's [rank 1-13, suit]); null: the deck's back. */
    private showCard(c: any[]): void {
        CasinoUI.removeAll(this._cardHolder);
        this._card = CasinoCards.card((c ? (c[0] | 0) - 1 : -1) | 0, c ? c[1] | 0 : 0, HiLoGame.BIG_W);
        this._cardHolder.addChild(this._card);
    }

    /** The cards gone by, small, along the bottom (the last 10), each marked right or wrong. */
    private showTrail(g: any): void {
        CasinoUI.removeAll(this._trail);
        let shown: any[] = as3.as(g.shown, Array);
        let guesses: any[] = as3.as(g.guesses, Array);
        let from: int = Math.max(0, shown.length - 1 - 10) | 0;
        let i: int = from;
        let x: number = 0;
        while (i < shown.length - 1) {
            let s: Sprite = CasinoCards.card(((shown[i][0] | 0) - 1) | 0, shown[i][1] | 0, HiLoGame.SMALL_W);
            s.x = x;
            this._trail.addChild(s);
            let gu: any[] = as3.as(guesses[i], Array);
            if (gu) {
                let mark: TextField = CasinoUI.label(gu[0] == "skip" ? KEYS.Get("io_t3c_skip_mark") : (gu[0] == "hi" ? "▲" : "▼"), 11, gu[0] == "skip" ? CasinoUI.ASH : (gu[1] ? CasinoUI.WIN : CasinoUI.LOSS), true, 26, TextFormatAlign.CENTER);
                mark.x = x + HiLoGame.SMALL_W - 2;
                mark.y = 18;
                mark.filters = [new GlowFilter(0, 1, 3, 3, 6, 2)];
                this._trail.addChild(mark);
            }
            x += HiLoGame.SMALL_W + 4 + 2;
            i++;
        }
    }

    private resume(g: any): void {
        this._game = g;
        this._bet.setValue(g.stake | 0);
        let shown: any[] = as3.as(g.shown, Array);
        this.showCard(as3.cast(shown[shown.length - 1], Array));
        this.showTrail(g);
        this._win.message(KEYS.Get("io_t3c_resume"), CasinoUI.GOLD);
        this.buttons();
        this.texts();
    }

    private onStart(e: MouseEvent = null): void {
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
            return;
        }
        if (this._pending || this.playing()) {
            return;
        }
        // (QoL #560: a double tap on CASH OUT doesn't stake a new round on the START that took its place)
        if (e && getTimer() < this._ioStartReadyAt) {
            return;
        }
        // (the last game's Shiny first, then the bet checked against it; 9 October)
        this.flushCredits();
        let bet: int = this._bet.value;
        if (CASINO.credits() < bet) {
            this._win.message(KEYS.Get("io_t3c_no_shiny_bet"), CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        // (QoL #385: more than half the Shiny asked about first, once)
        if (CASINO.ioAskBig("hilo", bet, (): void => {
            if (this.parent) {
                this.onStart();
            }
        })) {
            return;
        }
        this._pending = true;
        this.buttons();
        CASINO.hiloStart(bet, (r: any): void => {
            this._pending = false;
            if (!this.parent) {
                CASINO.late(r);
                return;
            }
            if (r.error) {
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                CASINO.getState((s: any): void => {
                    if (this.parent && CASINO.state && CASINO.state.hilo) {
                        this.resume(CASINO.state.hilo);
                    }
                });
                this.buttons();
                return;
            }
            this._game = r;
            CASINO.setCredits(r.credits | 0);
            let shown: any[] = as3.as(r.shown, Array);
            this.turnTo(as3.cast(shown[shown.length - 1], Array));
            this.showTrail(r);
            SOUNDS.Play("click1");
            this._win.message(KEYS.Get("io_t3c_hilo_ask"), CasinoUI.GOLD);
            this.buttons();
            this.texts();
        });
    }

    private guess(g: string): void {
        if (!this.playing() || this._pending) {
            return;
        }
        this._pending = true;
        this.buttons();
        CASINO.hiloGuess(this._game.session_id | 0, g, (r: any): void => {
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
            this._game = r;
            let shown: any[] = as3.as(r.shown, Array);
            this.turnTo(as3.cast(shown[shown.length - 1], Array));
            this.showTrail(r);
            if (r.status == "open") {
                if (g == "skip") {
                    this._win.message(KEYS.Get("io_t3c_skipped"), CasinoUI.GOLD);
                } else {
                    this._win.message(KEYS.Get("io_t3c_right", { "v1": CasinoUI.mult(Number(r.multiplier)) }), CasinoUI.WIN);
                    SOUNDS.Play("purchasepopup", 0.6);
                }
            } else if (r.status == "lost") {
                this.finish(r, false);
            } else {
                // (the Pit's most reached, or the cards used up: cashed out)
                this.finish(r, true);
            }
            this.buttons();
            this.texts();
        });
    }

    private onCashout(e: MouseEvent = null): void {
        if (!this.playing() || this._pending || (this._game.right | 0) == 0) {
            return;
        }
        this._pending = true;
        this.buttons();
        CASINO.hiloCashout(this._game.session_id | 0, (r: any): void => {
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
            this._game = r;
            this.finish(r, true);
            this.buttons();
        });
    }

    private finish(r: any, won: boolean): void {
        let payout: int = r.payout | 0;
        if (won) {
            this._info.text = KEYS.Get("io_t3c_cashed_title", { "v1": CasinoUI.mult(Number(r.multiplier)) });
            this._info2.text = KEYS.Get("io_t3c_plus_again", { "v1": CasinoUI.number(payout) });
            CasinoUI.setText(this._mult, CasinoUI.mult(Number(r.multiplier), true));
            this._mult.textColor = CasinoUI.WIN;
            this._win.message(KEYS.Get("io_t3c_cashed_at", { "v1": CasinoUI.mult(Number(r.multiplier)), "v2": CasinoUI.number(payout) }), CasinoUI.WIN);
            this._creditsAt = { "t": 16, "credits": r.credits | 0, "payout": payout, "staked": r.stake | 0 };
        } else {
            this._info.text = KEYS.Get("io_t3c_wrong");
            this._info2.text = KEYS.Get("io_t3c_lost_again");
            CasinoUI.setText(this._mult, KEYS.Get("io_t3c_lost_title"));
            this._mult.textColor = CasinoUI.LOSS;
            this._win.message(KEYS.Get("io_t3c_wrong_lost"), CasinoUI.LOSS);
            this._shake = 16;
            this._creditsAt = { "t": 14, "credits": r.credits | 0, "payout": 0, "staked": r.stake | 0 };
            CasinoUI.ioLoseSound();
        }
    }

    /** The card in the middle turns over to the next one. */
    private turnTo(c: any[]): void {
        this._turn = { "to": c, "t": 12 };
    }

    private flushCredits(): void {
        if (this._creditsAt) {
            CASINO.setCredits(this._creditsAt.credits | 0);
            this._creditsAt = null;
        }
        this._mult.textColor = 16777215;
    }

    public tick(): void {
        this._t++;
        if (this._turn) {
            this._turn.t--;
            let k: number = Math.abs(this._turn.t - 6) / 6;
            this._cardHolder.scaleX = Math.max(0.02, k);
            this._cardHolder.x = 240 - HiLoGame.BIG_W * this._cardHolder.scaleX / 2;
            if (this._turn.t == 6) {
                this.showCard(as3.as(this._turn.to, Array));
            }
            if (this._turn.t <= 0) {
                this._cardHolder.scaleX = 1;
                this._cardHolder.x = 240 - HiLoGame.BIG_W / 2;
                this._turn = null;
            }
        }
        if (this._shake > 0) {
            this._shake--;
            this._table.x = Number(HiLoGame.TX + (this._shake > 0 ? (Math.random() - 0.5) * 8 : 0));
        }
        if (this._creditsAt) {
            this._creditsAt.t--;
            if (this._creditsAt.t <= 0) {
                let ca: any = this._creditsAt;
                this._creditsAt = null;
                CASINO.setCredits(ca.credits | 0);
                if ((ca.payout | 0) > 0) {
                    CasinoUI.ioWinSound((ca.payout | 0) >= 10 * Math.max(1, ca.staked | 0));
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
