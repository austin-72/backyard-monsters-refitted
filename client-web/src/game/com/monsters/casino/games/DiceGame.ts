import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { ArcadeArt, BetSelector, CASINO, CasinoUI, CasinoWindow, GLOBAL, KEYS, SOUNDS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * Devil's Dice (Brimstone Pit level 3, 7 October, the user's pick): a table of up to four players, the same
 * bones thrown for all of them, each betting against the house (server/src/services/casino/diceRounds.ts).
 * Bet while bets are open; then the Devil throws two bones every few seconds. A throw without his face on
 * either bone raises the multiplier (1.43x, 2.07x, 2.98x...); bank before the next throw, or set a bank after
 * so many throws. When his face comes up, whatever is still on the table is his.
 *
 * The game sits the player at a table (CASINO.diceSit), asks for its state about twice a second (which keeps
 * the seat) and once more just as each throw is due, and tumbles the bones until the throw comes.
 */
export class DiceGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _auto: null, _action: null, _actionMode: "", _status: null, _mine: null, _hash: null, _scene: null, _seats: null, _dice: null, _diceFaces: null, _fx: null, _fxShown: false, _sig: null, _mult: null, _sub: null, _ladder: null, _history: null, _players: null, _playersTitle: null, _table: 0, _sitting: false, _state: null, _offset: 0, _polling: false, _pollT: 0, _sending: false, _t: 0, _shownRolls: 0, _shownRound: -1, _landT: 100, _tumble: null, _devilT: 0, _polledFor: 0, _parts: null, _sitAfter: 0, _pollAfter: 0, _ioQueued: 0, _ioQueuedAuto: 0, _ioQueueBtn: null, _ioTakeBtn: null });
    }

    private static readonly SX: int = 220;

    private static readonly SW: int = 480;

    private static readonly SH: int = 300;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _auto: TextField;
    private _action: Sprite;
    private _actionMode: string;
    private _status: TextField;
    private _mine: TextField;
    private _hash: TextField;
    private _scene: Sprite;
    private _seats: Sprite;
    /** The two bones, each drawn round its middle and only drawn again when its face changes. */
    private _dice: any[];
    private _diceFaces: any[];
    private _fx: Shape;
    private _fxShown: boolean;
    /** What each panel was last built from (it is built again only when that changes). */
    private _sig: any;
    private _mult: TextField;
    private _sub: TextField;
    private _ladder: Sprite;
    private _history: Sprite;
    private _players: Sprite;
    private _playersTitle: TextField;
    private _table: int;
    private _sitting: boolean;
    private _state: any;
    private _offset: number;
    private _polling: boolean;
    private _pollT: int;
    private _sending: boolean;
    private _t: int;
    /** The throw last seen landing (its number), when it landed (frames), and the faces tumbling. */
    private _shownRolls: int;
    private _shownRound: int;
    private _landT: int;
    private _tumble: any[];
    private _devilT: int;
    private _polledFor: int;
    private _parts: any[];
    /** When to ask for a seat again after a refusal (Date ms; 0: not to). */
    private _sitAfter: number;
    /** No asking again before this (Date ms) after an error: 9 October, an error was asked again every frame. */
    private _pollAfter: number;
    /** Inferno-only (QoL #387): a bet queued for the next round (0: none), the throws to bank after (0: by hand). */
    private _ioQueued: int;
    private _ioQueuedAuto: int;
    /** QoL #387: "Queued: 25 - cancel", over the seed's line while a bet is queued. */
    private _ioQueueBtn: Sprite;
    /** QoL #504: TAKE BACK, in the seed line's place while the player's bet can still be taken back (no throw yet). */
    private _ioTakeBtn: Sprite;

    public $ctor(win?: CasinoWindow): void {
        this._dice = [];
        this._diceFaces = [0, 0];
        this._sig = {};
        this._tumble = [1, 1];
        this._parts = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoDice";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button(KEYS.Get("io_t3c_lobby"), 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        // (QoL #390: "?", the rules and pays)
        if (GLOBAL.INFERNO_ONLY) {
            CasinoUI.ioRulesButton(p, as3.bind(this, this.ioRules));
        }
        p.addChild(CasinoUI.at(CasinoUI.label("DEVIL'S DICE", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_bet_label"), 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_dice_bank_after"), 11, CasinoUI.EMBER, true, 120), 12, 206));
        this._auto = CasinoUI.input(40, 24, "", 2, "0-9");
        this._auto.name = "casinoDiceAuto";
        this._auto.x = 104;
        this._auto.y = 202;
        p.addChild(this._auto);
        // (QoL #383: kept as last typed)
        this._auto.text = CASINO.ioRecall("auto:dice");
        this._auto.addEventListener(Event.CHANGE, (e: Event): void => {
            CASINO.ioRemember("auto:dice", this._auto.text);
        });
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_throws"), 11, CasinoUI.GOLD, true, 60), 148, 206));
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_dice_empty"), 9, CasinoUI.ASH, false, 190), 12, 226));
        this._action = CasinoUI.button(KEYS.Get("io_t3c_bet_btn"), 190, 44, as3.bind(this, this.onAction), false, 18);
        this._action.name = "casinoDiceAction";
        this._action.x = 10;
        this._action.y = 246;
        p.addChild(this._action);
        this._status = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._status.name = "casinoDiceStatus";
        this._status.x = 10;
        this._status.y = 298;
        p.addChild(this._status);
        this._mine = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._mine.name = "casinoDiceMine";
        this._mine.x = 10;
        this._mine.y = 318;
        this._mine.multiline = this._mine.wordWrap = true;
        this._mine.height = 34;
        p.addChild(this._mine);
        this._hash = CasinoUI.label("", 8, CasinoUI.ASH, false, 190, TextFormatAlign.CENTER);
        this._hash.multiline = this._hash.wordWrap = true;
        this._hash.height = 40;
        this._hash.x = 10;
        this._hash.y = 354;
        p.addChild(this._hash);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #387: the bet queued for the next round, in the seed line's place; a click takes it back)
            this._ioQueueBtn = CasinoUI.toggle("", 190, 24, (e: MouseEvent): void => {
                if (this._ioQueued > 0) {
                    this._ioQueued = 0;
                    this._win.message(KEYS.Get("io_pit_queue_off"), CasinoUI.ASH);
                    this.ioShowQueue();
                }
            });
            this._ioQueueBtn.name = "ioPitQueued";
            this._ioQueueBtn.x = 10;
            this._ioQueueBtn.y = 362;
            p.addChild(this._ioQueueBtn);
            // (QoL #504: the bet on this round taken back, its Shiny paid back, until the bones are thrown)
            this._ioTakeBtn = CasinoUI.toggle(KEYS.Get("io_acc_pit_takeback"), 190, 24, as3.bind(this, this.ioTakeBack));
            this._ioTakeBtn.name = "ioPitTakeBack";
            this._ioTakeBtn.x = 10;
            this._ioTakeBtn.y = 362;
            this._ioTakeBtn.visible = false;
            p.addChild(this._ioTakeBtn);
            this.ioShowQueue();
        }
        // the table
        this._scene = as3.as(this.addChild(new Sprite()), Sprite);
        this._scene.x = DiceGame.SX;
        this._scene.addChild(CasinoUI.panel(DiceGame.SW, DiceGame.SH, 1));
        let felt: Shape = as3.as(this._scene.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(380, 200, 0, 10, 62);
        felt.graphics.lineStyle(6, 3807754, 1);
        felt.graphics.beginGradientFill(GradientType.RADIAL, [0x7A1414, 0x4A0A0A, 0x240404], [1, 1, 1], [0, 150, 255], m);
        felt.graphics.drawEllipse(10, 62, 380, 200);
        felt.graphics.endFill();
        felt.graphics.lineStyle(2, 14196800, 0.9);
        felt.graphics.drawEllipse(16, 68, 368, 188);
        // a pentagram worked into the felt
        felt.graphics.lineStyle(2, 12595232, 0.35);
        let cx: number = 200;
        let cy: number = 162;
        let rr: number = 70;
        let k: int = 0;
        while (k <= 5) {
            let a: number = -Math.PI / 2 + (k * 2 % 5) * Math.PI * 2 / 5;
            if (k == 0) {
                felt.graphics.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55);
            } else {
                felt.graphics.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55);
            }
            k++;
        }
        felt.cacheAsBitmap = true;
        // the table's picture over the drawn felt (casino/dice/table.png, art/uikit/minigames.py; 11 October)
        let table: Sprite = as3.as(this._scene.addChild(new Sprite()), Sprite);
        CasinoUI.picture(table, "casino/dice/table.png", 0, 52, 400, 220, (b: any): void => {
            felt.visible = false;
        });
        for (let f: int = 1; f <= 6; f++) {
            ArcadeArt.picture("casino/dice/die_" + f + ".png");
        }
        this._seats = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._seats.x = 10;
        this._seats.y = 8;
        let dk: int = 0;
        while (dk < 2) {
            let ds: Shape = as3.as(this._scene.addChild(new Shape()), Shape);
            ds.x = dk == 0 ? 150 : 250;
            ds.y = 160;
            this._dice.push(ds);
            dk++;
        }
        this._fx = as3.as(this._scene.addChild(new Shape()), Shape);
        this._mult = CasinoUI.title("", 34, 380);
        this._mult.name = "casinoDiceMultiplier";
        this._mult.x = 10;
        this._mult.y = 216;
        this._scene.addChild(this._mult);
        this._sub = CasinoUI.label("", 12, 16777215, true, 380, TextFormatAlign.CENTER);
        this._sub.filters = [new GlowFilter(0, 1, 4, 4, 6, 1)];
        this._sub.x = 10;
        this._sub.y = 262;
        this._scene.addChild(this._sub);
        this._ladder = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._ladder.x = 400;
        this._ladder.y = 8;
        this._history = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._history.x = 10;
        this._history.y = 278;
        // the bets at the table
        let pl: Sprite = as3.as(this.addChild(CasinoUI.panel(DiceGame.SW, 92)), Sprite);
        pl.x = DiceGame.SX;
        pl.y = DiceGame.SH + 8;
        this._playersTitle = CasinoUI.label(KEYS.Get("io_t3c_dice_table_title"), 11, CasinoUI.EMBER, true, 300);
        this._playersTitle.x = 12;
        this._playersTitle.y = 6;
        pl.addChild(this._playersTitle);
        this._players = as3.as(pl.addChild(new Sprite()), Sprite);
        this._players.x = 12;
        this._players.y = 24;
        this.sit();
    }

    private sit(): void {
        if (this._sitting) {
            return;
        }
        this._sitting = true;
        DiceGame.put(this._status, KEYS.Get("io_t3c_dice_finding"));
        CASINO.diceSit(this._table, (r: any): void => {
            this._sitting = false;
            if (!this.parent) {
                CASINO.late(r);
                // (closed while sitting down: up again, or the seat stayed for 25 s; 9 October)
                if (!r.error && (r.table | 0) > 0) {
                    CASINO.diceLeave((x: any): void => {
                    });
                }
                return;
            }
            if (r.error) {
                DiceGame.put(this._status, String(r.error));
                // (asked again in a few seconds: one refusal left the table WAIT for good; 9 October)
                this._sitAfter = new Date().getTime() + 4000;
                return;
            }
            this._table = r.table | 0;
            this.poll();
        });
    }

    private serverNow(): number {
        return new Date().getTime() + this._offset;
    }

    private poll(): void {
        let sent: number = NaN;
        if (this._polling || this._table <= 0 || new Date().getTime() < this._pollAfter) {
            return;
        }
        this._polling = true;
        sent = new Date().getTime();
        CASINO.diceState(this._table, (r: any): void => {
            this._polling = false;
            if (r.error) {
                this._pollAfter = new Date().getTime() + 2000;
            }
            if (!this.parent || r.error) {
                return;
            }
            let got: number = new Date().getTime();
            this._offset = Number(r.server_ts) - (sent + got) / 2;
            this.setState(r);
        });
    }

    private setState(r: any): void {
        this._state = r;
        if (!r.seated) {
            // (the seat was given up: the server restarted, or the game was away too long)
            this.sit();
        }
        let rolls: any[] = as3.as(r.rolls, Array);
        let n: int = (rolls ? rolls.length : 0) | 0;
        if ((r.round_id | 0) != this._shownRound) {
            this._shownRound = r.round_id | 0;
            this._shownRolls = r.phase == "over" ? n : 0;
            this._devilT = 0;
            this._landT = 100;
        }
        // (a round everyone banked ends early and shows the throws it would have had: they didn't land, so
        // no throw is played for them; 9 October)
        if (r.early && n > this._shownRolls) {
            this._shownRolls = n;
        }
        if (n > this._shownRolls) {
            // a throw has landed
            this._shownRolls = n;
            this._landT = 0;
            let last: any[] = as3.cast(rolls[n - 1], Array);
            if ((last[0] | 0) == 6 || (last[1] | 0) == 6) {
                this._devilT = 1;
                SOUNDS.Play("ihit2", 0.9);
                this.burst(16726554, 40);
            } else {
                SOUNDS.Play("click1", 0.7);
                this.burst(16766346, 14);
            }
        }
        this.hashLine(r);
        this.showSeats(r);
        this.showLadder(r);
        this.showHistory(as3.as(r.history, Array));
        this.showPlayers(r);
        this.showMine(r);
    }

    /** 2.07x; QoL #581: 2.07×, the Pit's one way (CasinoUI.multFixed); `plain`: with an "x", for the title font. */
    private static fx(m: number, plain: boolean = false): string {
        return CasinoUI.multFixed(m, plain);
    }

    /** Texts and colours set only when they change (setting one draws it again; 7 October, performance). */
    private static put(t: TextField, s: string): void {
        CasinoUI.setText(t, s);
    }

    private static tint(t: TextField, c: uint): void {
        if (t.textColor != c) {
            t.textColor = c;
        }
    }

    /** Has this panel's data changed since it was last built? */
    private changed(panel: string, sig: string): boolean {
        if (this._sig[panel] === sig) {
            return false;
        }
        this._sig[panel] = sig;
        return true;
    }

    /** QoL #390: the rules and pays ("?"): the table's four seats, its multipliers (the round's), the most throws. */
    private ioRules(): any[] {
        let m: any[] = this.mults();
        let list: string = m.length ? m.slice(0, 5).map((x: any): string => DiceGame.fx(Number(x))).join(", ") + (m.length > 5 ? "..." : "") : "-";
        return ["DEVIL'S DICE", KEYS.Get("io_pit_rules_dice1", { "v1": 4 }), KEYS.Get("io_pit_rules_dice2", { "v1": list }), KEYS.Get("io_t3c_rules_dice3", { "v1": this._state ? this._state.max | 0 : m.length }), KEYS.Get("io_pit_rules_dice4"), KEYS.Get("io_pit_rules_dice5")];
    }

    private mults(): any[] {
        return this._state && this._state.mults ? as3.as(this._state.mults, Array) : [];
    }

    /** The multiplier after k safe throws (1 before any). */
    private multAt(k: int): number {
        let m: any[] = this.mults();
        return Number(k <= 0 || !m.length ? 1 : Number(m[Math.min(m.length, k) - 1]));
    }

    private hashLine(r: any): void {
        if (r.seed) {
            DiceGame.put(this._hash, KEYS.Get("io_t3c_dice_seed", { "v1": r.round_id | 0, "v2": String(r.seed).substr(0, 24) }));
        } else if (r.seed_hash) {
            DiceGame.put(this._hash, KEYS.Get("io_t3c_dice_hash", { "v1": r.round_id | 0, "v2": String(r.seed_hash).substr(0, 24) }));
        }
    }

    private showSeats(r: any): void {
        let seats: any[] = r.table ? as3.as(r.table.seats, Array) : [];
        let sig: string = "t" + ((r.table ? r.table.id : 0) | 0);
        for (let ss of as3.values(seats)) {
            let sb: any = this.betOf(r, String(ss.name));
            sig += "|" + ss.name + "," + Boolean(ss.me) + (sb ? "," + sb.cashed + "," + Boolean(sb.lost) + "," + (sb.stake | 0) : "");
        }
        if (!this.changed("seats", sig)) {
            return;
        }
        CasinoUI.removeAll(this._seats);
        let title: TextField = CasinoUI.label(KEYS.Get("io_t3c_dice_table", { "v1": (r.table ? r.table.id : 0) | 0 }), 10, CasinoUI.ASH, true, 80);
        title.y = 0;
        this._seats.addChild(title);
        let i: int = 0;
        while (i < 4) {
            let s: any = seats && i < seats.length ? seats[i] : null;
            let plate: Sprite = CasinoUI.panel(92, 34, s ? 0.95 : 0.45);
            plate.x = i * 96;
            plate.y = 14;
            let bet: any = s ? this.betOf(r, String(s.name)) : null;
            let nm: TextField = CasinoUI.label(s ? String(s.name) : KEYS.Get("io_t3c_dice_empty_seat"), 10, (s ? (s.me ? CasinoUI.GOLD : 0xFFFFFF) : CasinoUI.ASH) >>> 0, Boolean(s), 88, TextFormatAlign.CENTER);
            nm.x = 2;
            nm.y = 2;
            plate.addChild(nm);
            if (bet) {
                let line: string = bet.cashed != null ? KEYS.Get("io_t3c_dice_banked_s", { "v1": DiceGame.fx(Number(bet.cashed)) }) : (bet.lost ? KEYS.Get("io_t3c_dice_burned") : KEYS.Get("io_t3c_dice_on_table_s", { "v1": CasinoUI.number(bet.stake | 0) }));
                let bl: TextField = CasinoUI.label(line, 9, bet.cashed != null ? CasinoUI.WIN : (bet.lost ? CasinoUI.LOSS : CasinoUI.EMBER), true, 88, TextFormatAlign.CENTER);
                bl.x = 2;
                bl.y = 17;
                plate.addChild(bl);
            }
            this._seats.addChild(plate);
            i++;
        }
    }

    private betOf(r: any, name: string): any {
        for (let b of as3.values(r.players)) {
            if (String(b.name) == name) {
                return b;
            }
        }
        return null;
    }

    /** The multipliers up the side: the throws to come, the one reached lit, the Devil's marked. */
    private showLadder(r: any): void {
        let m: any[] = this.mults();
        let n: int = (r.rolls ? (as3.as(r.rolls, Array)).length : 0) | 0;
        let devil: int = r.devil != null ? r.devil | 0 : 0;
        let safe: int = (devil > 0 ? devil - 1 : n) | 0;
        if (!this.changed("ladder", m.join(",") + "|" + safe + "|" + devil + "|" + r.phase)) {
            return;
        }
        CasinoUI.removeAll(this._ladder);
        let i: int = 0;
        while (i < m.length) {
            let k: int = (i + 1) | 0;
            let row: Sprite = CasinoUI.panel(72, 20, Number(k == safe && safe > 0 ? 1 : 0.6));
            row.y = (m.length - 1 - i) * 23;
            let lit: boolean = k <= safe;
            let col: uint = k == devil ? CasinoUI.LOSS : (lit ? CasinoUI.WIN : (k == safe + 1 && r.phase == "rolling" ? CasinoUI.GOLD : CasinoUI.ASH));
            let t: TextField = CasinoUI.label((k == devil ? KEYS.Get("io_t3c_dice_devil") : k + ": " + DiceGame.fx(Number(m[i]))), 10, col, true, 72, TextFormatAlign.CENTER);
            t.y = 2;
            row.addChild(t);
            if (k == safe && safe > 0) {
                row.filters = [new GlowFilter(0x9CFF6A, 0.8, 8, 8, 2, 1)];
            }
            this._ladder.addChild(row);
            i++;
        }
    }

    private showHistory(h: any[]): void {
        let sig: string = "";
        if (h) {
            let hi: int = 0;
            while (hi < Math.min(h.length, 8)) {
                sig += (h[hi].devil | 0) + ",";
                hi++;
            }
        }
        if (!this.changed("history", (h ? "h" : "-") + sig)) {
            return;
        }
        CasinoUI.removeAll(this._history);
        if (!h) {
            return;
        }
        let label: TextField = CasinoUI.label(KEYS.Get("io_t3c_dice_came_on"), 9, CasinoUI.ASH, true, 80);
        label.y = 2;
        this._history.addChild(label);
        let i: int = 0;
        while (i < Math.min(h.length, 8)) {
            let d: int = h[i].devil | 0;
            let box: Sprite = CasinoUI.panel(30, 16, 0.85);
            box.x = 76 + i * 33;
            let t: TextField = CasinoUI.label(d > 0 ? String(d) : "-", 9, d >= 4 ? CasinoUI.WIN : (d >= 2 ? CasinoUI.GOLD : CasinoUI.LOSS), true, 30, TextFormatAlign.CENTER);
            t.y = 1;
            box.addChild(t);
            this._history.addChild(box);
            i++;
        }
    }

    private showPlayers(r: any): void {
        let list: any[] = as3.as(r.players, Array);
        let sig: string = list ? String(list.length) : "-";
        for (let pb of as3.values(list)) {
            sig += "|" + pb.name + "," + (pb.stake | 0) + "," + pb.cashed + "," + (pb.payout | 0) + "," + Boolean(pb.lost) + "," + pb.auto + "," + Boolean(pb.me);
        }
        if (!this.changed("players", sig)) {
            return;
        }
        CasinoUI.removeAll(this._players);
        DiceGame.put(this._playersTitle, KEYS.Get("io_t3c_dice_bets_round", { "v1": list ? list.length : 0 }));
        if (!list) {
            return;
        }
        let i: int = 0;
        while (i < Math.min(list.length, 8)) {
            let b: any = list[i];
            let text: string = b.name + "  " + CasinoUI.number(b.stake | 0) + (b.cashed != null ? "  " + DiceGame.fx(Number(b.cashed)) + " +" + CasinoUI.number(b.payout | 0) : (b.lost ? "  " + KEYS.Get("io_t3c_dice_burned") : (b.auto != null ? "  " + KEYS.Get("io_t3c_dice_bank_n", { "v1": b.auto | 0 }) : "")));
            let t: TextField = CasinoUI.label(text, 10, (b.cashed != null ? CasinoUI.WIN : (b.lost ? CasinoUI.LOSS : (b.me ? CasinoUI.GOLD : 0xE8DCC8))) >>> 0, Boolean(b.me), 225);
            t.x = (i % 2) * 230;
            t.y = ((i / 2) | 0) * 15;
            this._players.addChild(t);
            i++;
        }
    }

    private showMine(r: any): void {
        let b: any = r.my_bet;
        if (!b) {
            DiceGame.put(this._mine, "");
            return;
        }
        if (b.cashed != null) {
            DiceGame.put(this._mine, KEYS.Get("io_t3c_banked_at", { "v1": DiceGame.fx(Number(b.cashed)), "v2": CasinoUI.number(b.payout | 0) }));
            DiceGame.tint(this._mine, CasinoUI.WIN);
        } else if (b.lost) {
            DiceGame.put(this._mine, KEYS.Get("io_t3c_dice_took", { "v1": CasinoUI.number(b.stake | 0) }));
            DiceGame.tint(this._mine, CasinoUI.LOSS);
        } else {
            DiceGame.put(this._mine, b.auto != null ? KEYS.Get((b.auto | 0) == 1 ? "io_t3c_dice_mybet1" : "io_t3c_dice_mybet", { "v1": CasinoUI.number(b.stake | 0), "v2": b.auto | 0 }) : KEYS.Get("io_t3c_your_bet", { "v1": CasinoUI.number(b.stake | 0) }));
            DiceGame.tint(this._mine, 15260872);
        }
    }

    private setAction(mode: string, text: string, on: boolean): void {
        if (mode != this._actionMode || text != this._action["casinoText"]) {
            this._actionMode = mode;
            this._action["casinoText"] = text;
            let t: TextField = as3.as(this._action.getChildAt(0), TextField);
            t.text = text;
        }
        CasinoUI.enable(this._action, on && !this._sending);
    }

    private onAction(e: MouseEvent = null): void {
        let bet: int = 0;
        let r: any = this._state;
        if (!r || this._sending) {
            return;
        }
        // (QoL #387: "queue", BET NEXT ROUND while no bets are taken: the same checks, then the bet is kept for the next)
        if (this._actionMode == "bet" || this._actionMode == "queue") {
            let st: any = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
                return;
            }
            bet = this._bet.value;
            let auto: int = Number(this._auto.text) | 0 || 0;
            let max: int = r.max | 0;
            if (auto < 0 || auto > max) {
                this._win.message(KEYS.Get("io_t3c_dice_range", { "v1": max }), CasinoUI.LOSS);
                return;
            }
            if (CASINO.credits() < bet) {
                this._win.message(KEYS.Get("io_t3c_no_shiny_bet"), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            // (QoL #385: more than half the Shiny asked about first, once)
            if (CASINO.ioAskBig("dice", bet, (): void => {
                // (only if it still takes bets: the round may have moved on while the question was up)
                if (this.parent && (this._actionMode == "bet" || this._actionMode == "queue")) {
                    this.onAction();
                }
            })) {
                return;
            }
            if (this._actionMode == "queue") {
                this._ioQueued = bet;
                this._ioQueuedAuto = auto;
                SOUNDS.Play("click1");
                this._win.message(KEYS.Get("io_pit_queue_set", { "v1": CasinoUI.number(bet) }), CasinoUI.GOLD);
                this.ioShowQueue();
                return;
            }
            this.sendBet(r.round_id | 0, bet, auto);
        } else if (this._actionMode == "bank") {
            this._sending = true;
            CASINO.diceBank(r.round_id | 0, (res: any): void => {
                this._sending = false;
                if (!this.parent) {
                    return;
                }
                if (res.error) {
                    this._win.message(String(res.error), CasinoUI.LOSS);
                } else if (res.cashed != null) {
                    this._win.message(KEYS.Get("io_t3c_banked_at", { "v1": DiceGame.fx(Number(res.cashed)), "v2": CasinoUI.number(res.payout | 0) }), CasinoUI.WIN);
                    CasinoUI.ioWinSound(Number(res.cashed) >= 10);
                    this._win.bigWin(res.payout | 0, Math.round((res.payout | 0) / Math.max(1, Number(res.cashed))) | 0);
                } else {
                    this._win.message(KEYS.Get("io_t3c_dice_late"), CasinoUI.LOSS);
                }
                this.poll();
            });
        }
    }

    /** A bet sent on the table's round open for bets (BET, or a bet queued for it: QoL #387). */
    private sendBet(roundId: int, bet: int, auto: int): void {
        this._sending = true;
        CASINO.diceBet(roundId, bet, auto, (res: any): void => {
            this._sending = false;
            if (!this.parent) {
                return;
            }
            if (res.error) {
                this._win.message(String(res.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
            } else {
                SOUNDS.Play("click1");
                this._win.message(res.auto ? KEYS.Get("io_t3c_dice_placed_auto", { "v1": CasinoUI.number(bet), "v2": res.auto | 0 }) : KEYS.Get("io_t3c_dice_placed", { "v1": CasinoUI.number(bet) }), CasinoUI.GOLD);
            }
            this.poll();
        });
    }

    /** QoL #387: "Queued: 25 - cancel" in place of the seed's line while a bet waits for the next round. */
    private ioShowQueue(): void {
        if (!this._ioQueueBtn) {
            return;
        }
        let on: boolean = this._ioQueued > 0;
        this._ioQueueBtn.visible = on;
        this._hash.visible = !on && !(this._ioTakeBtn && this._ioTakeBtn.visible);
        if (on) {
            CasinoUI.relabel(this._ioQueueBtn, KEYS.Get("io_pit_queued", { "v1": CasinoUI.number(this._ioQueued) }));
        }
    }

    /** QoL #504: TAKE BACK shown (the player's bet on a round still taking bets), or not; the seed line in its place. */
    private ioShowTakeBack(on: boolean): void {
        if (!this._ioTakeBtn || this._ioTakeBtn.visible == on) {
            return;
        }
        this._ioTakeBtn.visible = on;
        this._hash.visible = !on && !(this._ioQueued > 0);
    }

    /** QoL #504: the bet taken back (the server pays it back if the bones haven't been thrown). */
    private ioTakeBack(e: MouseEvent = null): void {
        let r: any = this._state;
        if (!r || this._sending || !r.my_bet) {
            return;
        }
        this._sending = true;
        CASINO.ioTakeBack("dice", r.round_id | 0, (res: any): void => {
            this._sending = false;
            if (!this.parent) {
                return;
            }
            if (res.error) {
                this._win.message(String(res.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
            } else {
                this._win.message(KEYS.Get("io_acc_pit_taken", { "v1": CasinoUI.number(res.refunded | 0) }), CasinoUI.GOLD);
            }
            this.poll();
        });
    }

    /**
     * QoL #387: bets open at the table (a round without the player's bet): the queued bet goes on it, as BET would send it
     * (the Shiny checked again; the big-bet question was asked when it was queued). Only once: a refusal is shown and the
     * queue is empty.
     */
    private ioPlaceQueued(r: any): void {
        let bet: int = this._ioQueued;
        let auto: int = this._ioQueuedAuto;
        this._ioQueued = 0;
        this.ioShowQueue();
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : KEYS.Get("io_t3c_not_open"), CasinoUI.LOSS);
            return;
        }
        if (CASINO.credits() < bet) {
            this._win.message(KEYS.Get("io_pit_queue_short"), CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        this.sendBet(r.round_id | 0, bet, auto);
    }

    /**
     * QoL #387: the button when it takes no bet (the bones being thrown, the round over, the next not open yet): BET
     * NEXT ROUND, or QUEUED while one waits; otherwise as it was.
     */
    private ioIdle(text: string): void {
        if (!GLOBAL.INFERNO_ONLY || this._table <= 0) {
            this.setAction("", text, false);
        } else if (this._ioQueued > 0) {
            this.setAction("", KEYS.Get("io_pit_queued_btn"), false);
        } else {
            this.setAction("queue", KEYS.Get("io_pit_queue_next_round"), true);
        }
    }

    /** When throw k comes, on the server's clock. */
    private rollAt(k: int): number {
        let r: any = this._state;
        return Number(r.starts_at) + Number(r.first_ms) + (k - 1) * Number(r.roll_ms);
    }

    public tick(): void {
        this._t++;
        this._landT++;
        let r: any = this._state;
        this._pollT++;
        if (this._pollT >= (r && r.phase == "rolling" ? 20 : 36)) {
            this._pollT = 0;
            this.poll();
        }
        if (this._table <= 0 && !this._sitting && this._sitAfter > 0 && new Date().getTime() >= this._sitAfter) {
            this._sitAfter = 0;
            this.sit();
        }
        if (!r) {
            this.setAction("", KEYS.Get("io_t3c_wait"), false);
            this.ioShowTakeBack(false);
            this.drawDice(false);
            return;
        }
        let now: number = this.serverNow();
        let phase: string = String(r.phase);
        let mine: any = r.my_bet;
        let rolls: any[] = as3.as(r.rolls, Array);
        let n: int = (rolls ? rolls.length : 0) | 0;
        let tumbling: boolean = false;
        // (QoL #504: TAKE BACK while the player's bet is on a round whose bones haven't been thrown)
        let take: boolean = false;
        if (phase == "betting") {
            let left: number = Math.max(0, Number(r.starts_at) - now);
            DiceGame.put(this._status, KEYS.Get("io_t3c_bets_close_caps", { "v1": Math.ceil(left / 1000) + "s" }));
            if (mine) {
                this.setAction("", KEYS.Get("io_t3c_on_table"), false);
                take = GLOBAL.INFERNO_ONLY && String(mine.status) == "open" && left > 300;
            } else {
                // (QoL #387: a bet queued for this round goes on now)
                if (this._ioQueued > 0 && left > 300 && !this._sending && this._table > 0) {
                    this.ioPlaceQueued(r);
                }
                this.setAction("bet", KEYS.Get("io_t3c_bet_btn"), left > 300);
            }
            DiceGame.put(this._mult, "1.00x");
            DiceGame.tint(this._mult, 16777215);
            DiceGame.put(this._sub, left > 0 ? KEYS.Get("io_t3c_place_bets", { "v1": (left / 1000).toFixed(1) }) : KEYS.Get("io_t3c_no_more_bets"));
            if (left <= 0) {
                this.poll();
            }
        } else if (phase == "rolling") {
            let next: number = this.rollAt((n + 1) | 0);
            let devilUp: boolean = r.devil != null;
            // the bones tumble for the last moments before a throw, and until it comes
            tumbling = !devilUp && n < (r.max | 0) && now >= next - 700;
            if (!devilUp && n < (r.max | 0) && now >= next + 60 && this._polledFor != n + 1) {
                this._polledFor = (n + 1) | 0;
                this.poll();
            }
            let m: number = this.multAt(n);
            // (QoL #581: the title font has no ×)
            DiceGame.put(this._mult, devilUp ? KEYS.Get("io_t3c_dice_the_devil") : DiceGame.fx(m, true));
            DiceGame.tint(this._mult, (devilUp ? CasinoUI.LOSS : (m >= 10 ? 0x9CFF6A : (m >= 2 ? 0xFFD58A : 0xFFFFFF))) >>> 0);
            DiceGame.put(this._status, devilUp ? KEYS.Get("io_t3c_dice_came", { "v1": r.devil | 0 }) : (n == 0 ? KEYS.Get("io_t3c_dice_throws") : KEYS.Get("io_t3c_dice_safe", { "v1": n })));
            if (mine && mine.cashed == null && !mine.lost && !devilUp && n >= 1) {
                let pay: string = CasinoUI.shiny((mine.stake | 0) * m);
                DiceGame.put(this._sub, KEYS.Get("io_t3c_dice_next_m", { "v1": Math.max(0, (next - now) / 1000).toFixed(1), "v2": DiceGame.fx(this.multAt((n + 1) | 0)) }));
                this.setAction("bank", KEYS.Get("io_t3c_dice_bank_btn", { "v1": pay }), true);
            } else {
                DiceGame.put(this._sub, devilUp ? "" : (n >= 1 ? KEYS.Get("io_t3c_dice_next", { "v1": Math.max(0, (next - now) / 1000).toFixed(1) }) : ""));
                this.ioIdle(mine ? (mine.cashed != null ? KEYS.Get("io_t3c_dice_banked_btn") : (mine.lost ? KEYS.Get("io_t3c_dice_burned_btn") : KEYS.Get("io_t3c_wait"))) : KEYS.Get("io_t3c_next_round"));
            }
        } else if (phase == "over") {
            let d: int = r.devil != null ? r.devil | 0 : 0;
            // (a round everyone banked never reached the Devil, nor the last throw's multiplier: 9 October)
            DiceGame.put(this._mult, r.early ? KEYS.Get("io_t3c_dice_all_banked") : (d > 0 ? KEYS.Get("io_t3c_dice_the_devil") : DiceGame.fx(this.multAt(r.max | 0), true)));
            DiceGame.tint(this._mult, d > 0 && !r.early ? CasinoUI.LOSS : CasinoUI.WIN);
            DiceGame.put(this._status, r.early ? KEYS.Get("io_t3c_dice_everyone") : (d > 0 ? KEYS.Get("io_t3c_dice_came", { "v1": d }) : KEYS.Get("io_t3c_dice_no_devil")));
            DiceGame.put(this._sub, r.early && d > 0 ? KEYS.Get("io_t3c_dice_would", { "v1": d }) : KEYS.Get("io_t3c_dice_round_soon"));
            this.ioIdle(KEYS.Get("io_t3c_next_round"));
        } else {
            DiceGame.put(this._status, KEYS.Get("io_t3c_dice_waiting"));
            DiceGame.put(this._mult, "");
            DiceGame.put(this._sub, "");
            this.ioIdle(KEYS.Get("io_t3c_wait"));
        }
        this.ioShowTakeBack(take);
        this.drawDice(tumbling);
    }

    /**
     * The two bones: tumbling, or showing the last throw (the Devil's face burning). Each is its own shape, drawn
     * again only when its face changes, and only moved and turned while it tumbles.
     */
    private drawDice(tumbling: boolean): void {
        let r: any = this._state;
        let rolls: any[] = r && r.rolls ? as3.as(r.rolls, Array) : [];
        let faces: any[] = null;
        let jump: number = 0;
        let spin: number = 0;
        if (tumbling) {
            if (this._t % 3 == 0) {
                this._tumble = [1 + ((Math.random() * 6) | 0), 1 + ((Math.random() * 6) | 0)];
            }
            faces = this._tumble;
            jump = Math.abs(Math.sin(this._t / 3)) * 26;
            spin = Math.sin(this._t / 2) * 0.5;
        } else if (rolls.length && r.phase != "betting") {
            faces = as3.cast(rolls[rolls.length - 1], Array);
            // landing: a little bounce
            jump = Number(this._landT < 12 ? Math.abs(Math.sin(this._landT / 12 * Math.PI)) * 14 * (1 - this._landT / 12) : 0);
        } else {
            faces = [5, 2];
        }
        let i: int = 0;
        while (i < 2) {
            let d: Shape = as3.cast(this._dice[i], Shape);
            let face: int = faces[i] | 0;
            // (the dice's pictures, casino/dice/die_<face>.png, once loaded: drawn again when they come)
            let art: BitmapData = ArcadeArt.picture("casino/dice/die_" + face + ".png");
            if (face != this._diceFaces[i] || (art != null) != Boolean(d["ioArt"])) {
                this._diceFaces[i] = face;
                d["ioArt"] = art != null;
                d.graphics.clear();
                if (art) {
                    let m: Matrix = new Matrix();
                    m.a = m.d = 72 / art.width;
                    m.tx = m.ty = -36;
                    d.graphics.beginBitmapFill(art, m, false, true);
                    d.graphics.drawRect(-36, -36, 72, 72);
                    d.graphics.endFill();
                } else {
                    this.die(d.graphics, 0, 0, 62, face, 0);
                }
            }
            let y: number = 160 - jump * (i == 0 ? 1 : 0.8);
            let rot: number = (i == 0 ? spin : -spin * 0.8) * 180 / Math.PI;
            if (d.y != y) {
                d.y = y;
            }
            if (d.rotation != rot) {
                d.rotation = rot;
            }
            i++;
        }
        // sparks and the Devil's fire (drawn only while there are some)
        if (!this._parts.length && !this._fxShown) {
            return;
        }
        let f: any = this._fx.graphics;
        f.clear();
        let keep: any[] = [];
        for (let p of as3.values(this._parts)) {
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            if (p.life <= 0) {
                continue;
            }
            keep.push(p);
            f.beginFill(p.c >>> 0, p.life / 30);
            f.drawCircle(p.x, p.y, 2 + p.life / 12);
            f.endFill();
        }
        this._parts = keep;
        this._fxShown = keep.length > 0;
    }

    private burst(color: uint, n: int): void {
        let i: int = 0;
        while (i < n) {
            let a: number = Math.random() * Math.PI * 2;
            let v: number = 1.5 + Math.random() * 4;
            this._parts.push({ "x": 150 + (i % 2) * 100, "y": 160, "vx": Math.cos(a) * v, "vy": Math.sin(a) * v - 2, "life": 30, "c": i % 3 == 0 ? 0xFFE08A : color });
            i++;
        }
    }

    /** A bone die: pips 1 to 5, or the Devil's face on the sixth. */
    private die(g: any, cx: number, cy: number, s: number, face: int, spin: number): void {
        let c: number = NaN;
        let sn: number = NaN;
        let h: number = s / 2;
        c = Math.cos(spin);
        sn = Math.sin(spin);
        let corner: Function = (x: number, y: number): any[] => {
            return [cx + x * c - y * sn, cy + x * sn + y * c];
        };
        let devil: boolean = face == 6;
        // the shadow, then the bone
        g.beginFill(0x000000, 0.35);
        g.drawEllipse(cx - h, cy + h - 4, s, 14);
        g.endFill();
        let pts: any[] = [corner(-h, -h), corner(h, -h), corner(h, h), corner(-h, h)];
        g.lineStyle(3, devil ? 0x5A0A0A : 0x5A4A30, 1);
        g.beginFill(devil ? 0xC0201A : 0xF0E4C8, 1);
        g.moveTo(pts[0][0], pts[0][1]);
        g.lineTo(pts[1][0], pts[1][1]);
        g.lineTo(pts[2][0], pts[2][1]);
        g.lineTo(pts[3][0], pts[3][1]);
        g.lineTo(pts[0][0], pts[0][1]);
        g.endFill();
        g.lineStyle(0, 0, 0);
        // a lit edge
        g.beginFill(0xFFFFFF, devil ? 0.15 : 0.35);
        let e0: any[] = as3.cast(corner(-h + 4, -h + 4), Array);
        let e1: any[] = as3.cast(corner(h - 4, -h + 4), Array);
        let e2: any[] = as3.cast(corner(h - 4, -h + 10), Array);
        let e3: any[] = as3.cast(corner(-h + 4, -h + 10), Array);
        g.moveTo(e0[0], e0[1]);
        g.lineTo(e1[0], e1[1]);
        g.lineTo(e2[0], e2[1]);
        g.lineTo(e3[0], e3[1]);
        g.endFill();
        if (devil) {
            // the Devil: horns, eyes, a grin
            let hl: any[] = as3.cast(corner(-h * 0.55, -h * 0.55), Array);
            let hr: any[] = as3.cast(corner(h * 0.55, -h * 0.55), Array);
            g.beginFill(0x2A0404, 1);
            g.moveTo(hl[0] - 6, hl[1] + 4);
            g.lineTo(hl[0] - 10, hl[1] - 14);
            g.lineTo(hl[0] + 6, hl[1] + 2);
            g.moveTo(hr[0] + 6, hr[1] + 4);
            g.lineTo(hr[0] + 10, hr[1] - 14);
            g.lineTo(hr[0] - 6, hr[1] + 2);
            g.endFill();
            let el: any[] = as3.cast(corner(-h * 0.35, -h * 0.15), Array);
            let er: any[] = as3.cast(corner(h * 0.35, -h * 0.15), Array);
            g.beginFill(0xFFE040, 1);
            g.drawEllipse(el[0] - 6, el[1] - 4, 12, 8);
            g.drawEllipse(er[0] - 6, er[1] - 4, 12, 8);
            g.endFill();
            g.beginFill(0x000000, 1);
            g.drawEllipse(el[0] - 1.5, el[1] - 4, 3, 8);
            g.drawEllipse(er[0] - 1.5, er[1] - 4, 3, 8);
            g.endFill();
            let ml: any[] = as3.cast(corner(-h * 0.5, h * 0.3), Array);
            let mr: any[] = as3.cast(corner(h * 0.5, h * 0.3), Array);
            let mb: any[] = as3.cast(corner(0, h * 0.62), Array);
            g.lineStyle(3, 0x2A0404, 1);
            g.moveTo(ml[0], ml[1]);
            g.curveTo(mb[0], mb[1] + 6, mr[0], mr[1]);
            g.lineStyle(0, 0, 0);
            return;
        }
        // pips (1 to 5)
        let spots: any[] = face == 1 ? [[0, 0]] : (face == 2 ? [[-1, -1], [1, 1]] : (face == 3 ? [[-1, -1], [0, 0], [1, 1]] : (face == 4 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]])));
        for (let sp of as3.values(spots)) {
            let at: any[] = as3.cast(corner(sp[0] * h * 0.5, sp[1] * h * 0.5), Array);
            g.beginFill(0x2A1A0A, 1);
            g.drawCircle(at[0], at[1], s * 0.085);
            g.endFill();
            g.beginFill(0xE0501C, 0.9);
            g.drawCircle(at[0] - 1, at[1] - 1, s * 0.04);
            g.endFill();
        }
    }

    public get showing(): boolean {
        return false;
    }

    public dispose(): void {
        this._state = null;
        if (this._table > 0) {
            CASINO.diceLeave((r: any): void => {
            });
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
