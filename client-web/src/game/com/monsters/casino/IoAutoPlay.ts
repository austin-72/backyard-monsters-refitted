import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormatAlign } from "flash/text";
import { CASINO, CasinoUI, CasinoWindow, KEYS } from "@game";

/**
 * Inferno-only (15 October, QoL #388): auto play in more of the Brimstone Pit's games, the way Magma Slots' AUTO plays
 * (a run of rounds at the bet chosen, stopped by AUTO again, a big win, or the Shiny running out), with the player's
 * own stop rules: after how many rounds, when the run is down by X Shiny, and on one win of Y Shiny or more.
 *
 * Two parts:
 *  - the rules, per game, kept in this browser per player (CASINO.ioRemember "autoplay:<game>": "rounds,down,win"),
 *    and the sheet that sets them (`sheet`): over the lower half of a game's side panel, opened by AUTO;
 *  - a run (an IoAutoPlay, for Magma Drop and Wormzer Roulette): `button` makes the game's AUTO, the game calls `tick`
 *    every frame and `result` with each round's stake and payout once it is shown; `play` (the game's) sends the next
 *    round and says whether it went. Magma Slots and Korath's Fortune keep their own AUTO and use the sheet and `check`.
 */
export class IoAutoPlay extends ASObject {
    static {
        as3.fields(this, { _game: "", _win: null, _host: null, _play: null, _ask: null, _btn: null, _left: 0, _played: 0, _net: 0, _wait: 0, _inRound: false, _down: 0, _winAt: 0, _lastStake: 0 });
    }

    /** The rounds a run can have (as Magma Slots' AUTO). */
    public static readonly COUNTS: any[] = [10, 25, 50, 100];

    private _game: string;
    private _win: CasinoWindow;
    private _host: Sprite;
    private _play: Function;
    private _ask: Function;
    private _btn: Sprite;
    /** Rounds still to play in the run (0: no run). */
    private _left: int;
    private _played: int;
    /** What the run has won (+) or lost (-) so far. */
    private _net: int;
    /** (18 October) The last round's stake: the next one's, for the "down by" rule before it is bet. */
    private _lastStake: int;
    /** Frames until the next round. */
    private _wait: int;
    /** A round of the run is out, its result not yet shown. */
    private _inRound: boolean;
    private _down: int;
    private _winAt: int;

    /**
     * game: the game's id (the rules are kept by it); host: the game, the sheet goes over its side panel; play(): sends
     * the next round at the game's bet, true when it went (false: not enough Shiny, the Pit closed: the game has said
     * so); ask(go): the game's big-bet question (CASINO.ioAskBig), true when it asked, `go` going on after a Yes.
     */
    public $ctor(game?: string, win?: CasinoWindow, host?: Sprite, play?: Function, ask?: Function): void {
        super.$ctor();
        this._game = game;
        this._win = win;
        this._host = host;
        this._play = play;
        this._ask = ask;
    }

    /** The rules kept for `game`: [rounds, down (0: no limit), win (0: no limit)]. */
    public static rules(game: string): any[] {
        let p: any[] = String(CASINO.ioRecall("autoplay:" + game) || "").split(",");
        let rounds: int = Number(p[0]) | 0;
        if (IoAutoPlay.COUNTS.indexOf(rounds) < 0) {
            rounds = 25;
        }
        return [rounds, Math.max(0, Number(p[1]) | 0), Math.max(0, Number(p[2]) | 0)];
    }

    /**
     * The reason a run stops after a round (the run `net` so far, the round's own win `won` = payout - stake), or null:
     * the run down by its limit, or one win of the limit or more.
     */
    public static check(game: string, net: int, won: int): string {
        let r: any[] = IoAutoPlay.rules(game);
        if (r[1] > 0 && -net >= r[1]) {
            return KEYS.Get("io_acc_auto_stop_down", { "v1": CasinoUI.number(-net) });
        }
        if (r[2] > 0 && won >= r[2]) {
            return KEYS.Get("io_acc_auto_stop_win", { "v1": CasinoUI.number(won) });
        }
        return null;
    }

    /**
     * The sheet setting the rules (ROUNDS 10 / 25 / 50 / 100, STOP WHEN DOWN, STOP ON A WIN OF, START and CANCEL) over
     * the lower half of `host`'s side panel; START keeps them and calls onStart(rounds). One at a time. `startRounds`:
     * the rounds chosen at first (0: those kept).
     */
    public static sheet(host: Sprite, game: string, onStart: Function, startRounds: int = 0): Sprite {
        let old: any = host.getChildByName("ioPitAutoSheet");
        if (old) {
            host.removeChild(old);
        }
        let r: any[] = IoAutoPlay.rules(game);
        // (the rounds the game chose already, Magma Slots' 10 / 25 / 50 / 100, or those kept)
        let rounds: int = IoAutoPlay.COUNTS.indexOf(startRounds) >= 0 ? startRounds : r[0] | 0;
        let s: Sprite = CasinoUI.panel(198, 206, 1);
        s.name = "ioPitAutoSheet";
        s.x = 6;
        s.y = 192;
        // (clicks on it stay on it)
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        s.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_acc_auto_title"), 13, CasinoUI.GOLD, true, 186, TextFormatAlign.CENTER), 6, 6));
        s.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_acc_auto_rounds"), 10, CasinoUI.EMBER, true, 186), 8, 28));
        let toggles: any[] = [];
        let choose: Function = (): void => {
            for (let i: int = 0; i < toggles.length; i++) {
                CasinoUI.choose(as3.cast(toggles[i], Sprite), IoAutoPlay.COUNTS[i] == rounds);
            }
        };
        for (let i: int = 0; i < IoAutoPlay.COUNTS.length; i++) {
            let n: int = IoAutoPlay.COUNTS[i] | 0;
            let t: Sprite = CasinoUI.toggle(String(n), 42, 20, (e: MouseEvent): void => {
                rounds = n;
                choose();
            });
            t.name = "ioPitAutoRounds:" + n;
            t.x = 8 + i * 46;
            t.y = 44;
            s.addChild(t);
            toggles.push(t);
        }
        choose();
        s.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_acc_auto_down"), 10, CasinoUI.EMBER, true, 120), 8, 76));
        let down: TextField = CasinoUI.input(62, 22, r[1] > 0 ? String(r[1]) : "", 9, "0-9");
        down.name = "ioPitAutoDown";
        down.x = 128;
        down.y = 72;
        s.addChild(down);
        s.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_acc_auto_win"), 10, CasinoUI.EMBER, true, 120), 8, 104));
        let win: TextField = CasinoUI.input(62, 22, r[2] > 0 ? String(r[2]) : "", 9, "0-9");
        win.name = "ioPitAutoWin";
        win.x = 128;
        win.y = 100;
        s.addChild(win);
        s.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_acc_auto_note"), 9, CasinoUI.ASH, false, 186), 8, 126));
        let start: Sprite = CasinoUI.button(KEYS.Get("io_acc_auto_start"), 182, 34, (e: MouseEvent): void => {
            let d: int = Math.max(0, Number(down.text) | 0);
            let w: int = Math.max(0, Number(win.text) | 0);
            CASINO.ioRemember("autoplay:" + game, rounds + "," + d + "," + w);
            if (s.parent) {
                s.parent.removeChild(s);
            }
            onStart(rounds);
        }, true, 16);
        start.name = "ioPitAutoStart";
        start.x = 8;
        start.y = 142;
        s.addChild(start);
        let cancel: Sprite = CasinoUI.toggle(KEYS.Get("io_acc_auto_cancel"), 182, 20, (e: MouseEvent): void => {
            if (s.parent) {
                s.parent.removeChild(s);
            }
        });
        cancel.name = "ioPitAutoCancel";
        cancel.x = 8;
        cancel.y = 180;
        s.addChild(cancel);
        host.addChild(s);
        return s;
    }

    /** The game's AUTO button (w x h at x, y in its side panel `p`): the sheet, or STOP n while a run is on. */
    public button(p: Sprite, x: number, y: number, w: int, h: int): Sprite {
        this._btn = CasinoUI.button("AUTO", w, h, (e: MouseEvent): void => {
            if (this.running) {
                this.stop(KEYS.Get("io_acc_auto_stopped"));
                return;
            }
            IoAutoPlay.sheet(this._host, this._game, (rounds: int): void => {
                this.start(rounds);
            });
        }, true, 13);
        this._btn.name = "ioPitAuto";
        this._btn.x = x;
        this._btn.y = y;
        p.addChild(this._btn);
        return this._btn;
    }

    public get running(): boolean {
        return this._left > 0 || this._inRound;
    }

    /** A run of `rounds`, at the game's bet (the big-bet question first, as the game's own button asks). */
    public start(rounds: int): void {
        if (this._ask != null && this._ask((): void => {
            this.begin(rounds);
        })) {
            return;
        }
        this.begin(rounds);
    }

    private begin(rounds: int): void {
        if (!this._host || !this._host.parent) {
            return;
        }
        this._left = rounds;
        this._played = 0;
        this._net = 0;
        this._lastStake = 0;
        this._inRound = false;
        this._wait = 1;
    }

    /** The run stopped (`why` said, when given). */
    public stop(why: string = null): void {
        if (this.running && why) {
            this._win.message(why, CasinoUI.ASH);
        }
        this._left = 0;
        this._inRound = false;
        this._wait = 0;
    }

    /** Every frame: the next round when it is due; AUTO says STOP and the rounds left. */
    public tick(): void {
        if (this._btn) {
            CasinoUI.relabel(this._btn, this.running ? KEYS.Get("io_acc_auto_stop_n", { "v1": this._left + (this._inRound ? 1 : 0) }) : "AUTO");
        }
        if (this._left <= 0 || this._inRound || this._wait <= 0) {
            return;
        }
        if (--this._wait > 0) {
            return;
        }
        // (18 October, SUSPECTED-BUGS.md: the "down by" rule was only checked after a round, so the next bet could take
        // the run past it) a round whose stake (the last one's) would take the run past it isn't played
        let down: int = IoAutoPlay.rules(this._game)[1] | 0;
        if (down > 0 && this._lastStake > 0 && -this._net + this._lastStake > down) {
            this._left = 0;
            this._win.message(KEYS.Get("io_acc_auto_stop_down", { "v1": CasinoUI.number(-this._net) }), CasinoUI.GOLD);
            return;
        }
        this._left--;
        this._inRound = true;
        let went: boolean = false;
        try {
            went = Boolean(this._play());
        } catch (e) {
            went = false;
        }
        if (!went) {
            this._left = 0;
            this._inRound = false;
        }
    }

    /**
     * A round's result shown (its stake and payout): counted in the run if it was the run's; the stop rules, a big win
     * (as Magma Slots' AUTO stops), the next round after a short wait, or the run's end said.
     */
    public result(stake: int, payout: int): void {
        if (!this._inRound) {
            return;
        }
        this._inRound = false;
        this._played++;
        this._lastStake = stake;
        this._net = (this._net + payout - stake) | 0;
        let why: string = IoAutoPlay.check(this._game, this._net, (payout - stake) | 0);
        if (!why && payout >= stake * CasinoWindow.BIG_WIN) {
            why = KEYS.Get("io_acc_auto_stop_big");
        }
        if (why) {
            this._left = 0;
            this._win.message(why, CasinoUI.GOLD);
            return;
        }
        if (this._left <= 0) {
            this._win.message(KEYS.Get(this._net >= 0 ? "io_acc_auto_done_up" : "io_acc_auto_done_down", { "v1": this._played, "v2": CasinoUI.number(Math.abs(this._net)) }), CasinoUI.ASH);
            return;
        }
        this._wait = payout > stake ? 36 : 14;
    }

    /** A round of the run that was refused (the game gave the bet back): the run stops. */
    public refused(): void {
        if (this._inRound) {
            this._inRound = false;
            this._left = 0;
        }
    }

    /** The game was left. */
    public dispose(): void {
        this._left = 0;
        this._inRound = false;
        this._play = null;
        this._ask = null;
    }
}
