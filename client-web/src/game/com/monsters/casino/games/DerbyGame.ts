import * as as3 from "as3";
import { int } from "as3";
import { GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, SOUNDS } from "@game";

/**
 * Magma Derby: a race every few minutes for every player, run by the server
 * (server/src/services/casino/derbyRounds.ts). Six monsters with odds; bet on one or more to win while
 * bets are open; the race is sent when it starts (the order and every runner's checkpoint times) and
 * drawn here from them. Everyone's bets on the race are shown while bets are open: the biggest
 * bettors over the track, what is on each runner on the board.
 */
export class DerbyGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _chip: null, _total: null, _place: null, _clear: null, _status: null, _mine: null, _celebrated: -1, _track: null, _ground: null, _finish: null, _gate: null, _runnersLayer: null, _runners: null, _board: null, _rows: null, _podium: null, _bettors: null, _clock: null, _state: null, _offset: 0, _polling: false, _pollT: 0, _sending: false, _slip: null, _shownRound: -1, _shownPhase: "", _t: 0 });
    }

    private static readonly SX: int = 220;

    private static readonly SW: int = 480;

    private static readonly TH: int = 226;

    /** The track, in its own pixels: the start at 0, the finish at TRACK. */
    private static readonly TRACK: number = 2200;

    private static readonly LANE_Y: int = 74;

    private static readonly LANE_H: int = 26;
    private _win: CasinoWindow;
    private _chip: BetSelector;
    private _total: TextField;
    private _place: Sprite;
    private _clear: Sprite;
    private _status: TextField;
    private _mine: TextField;
    /** The race whose win was last celebrated. */
    private _celebrated: int;
    private _track: Sprite;
    private _ground: Sprite;
    private _finish: Sprite;
    private _gate: Shape;
    private _runnersLayer: Sprite;
    private _runners: any;
    private _board: Sprite;
    private _rows: any;
    private _podium: Sprite;
    /** Who is betting on this race (over the track while bets are open). */
    private _bettors: Sprite;
    private _clock: TextField;
    private _state: any;
    private _offset: number;
    private _polling: boolean;
    private _pollT: int;
    private _sending: boolean;
    private _slip: any;
    private _shownRound: int;
    private _shownPhase: string;
    private _t: int;

    public $ctor(win?: CasinoWindow): void {
        this._runners = {};
        this._rows = {};
        this._slip = {};
        super.$ctor();
        this._win = win;
        this.name = "casinoDerby";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("MAGMA DERBY", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("CHIP (click a monster to bet it)", 10, CasinoUI.EMBER, true, 190), 12, 68));
        this._chip = new BetSelector(190);
        this._chip.x = 10;
        this._chip.y = 82;
        this._chip.setValue(10);
        p.addChild(this._chip);
        p.addChild(CasinoUI.at(CasinoUI.label("ON YOUR SLIP", 11, CasinoUI.EMBER, true, 190), 12, 206));
        this._total = CasinoUI.label("0 Shiny", 14, CasinoUI.GOLD, true, 190);
        this._total.x = 12;
        this._total.y = 220;
        p.addChild(this._total);
        this._place = CasinoUI.button("PLACE BET", 190, 38, as3.bind(this, this.onPlace), false, 17);
        this._place.x = 10;
        this._place.y = 244;
        p.addChild(this._place);
        this._clear = CasinoUI.button("CLEAR", 92, 24, as3.bind(this, this.onClear), false, 11);
        this._clear.x = 10;
        this._clear.y = 288;
        p.addChild(this._clear);
        this._status = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._status.name = "casinoDerbyStatus";
        this._status.x = 10;
        this._status.y = 318;
        p.addChild(this._status);
        this._mine = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._mine.name = "casinoDerbyMine";
        this._mine.multiline = this._mine.wordWrap = true;
        this._mine.height = 58;
        this._mine.x = 10;
        this._mine.y = 338;
        p.addChild(this._mine);
        // the track
        this._track = as3.as(this.addChild(new Sprite()), Sprite);
        this._track.x = DerbyGame.SX;
        this._track.addChild(CasinoUI.panel(DerbyGame.SW, DerbyGame.TH, 1));
        let mask: Shape = as3.as(this._track.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(3, 3, DerbyGame.SW - 6, DerbyGame.TH - 6, 12, 12);
        mask.graphics.endFill();
        this._ground = as3.as(this._track.addChild(new Sprite()), Sprite);
        this._ground.mask = mask;
        let k: int = 0;
        while (k < 4) {
            let bg: Sprite = as3.as(this._ground.addChild(new Sprite()), Sprite);
            CasinoUI.picture(bg, "casino/derby/track.jpg", 0, 0, 960, DerbyGame.TH);
            if (k % 2 == 1) {
                bg.scaleX = -1;
                bg.x = (k + 1) * 960;
            } else {
                bg.x = k * 960;
            }
            k++;
        }
        let lanes: Shape = as3.as(this._ground.addChild(new Shape()), Shape);
        k = 0;
        while (k <= 6) {
            lanes.graphics.lineStyle(1, 16766346, 0.35);
            lanes.graphics.moveTo(0, DerbyGame.LANE_Y + k * DerbyGame.LANE_H - DerbyGame.LANE_H / 2);
            lanes.graphics.lineTo(DerbyGame.TRACK + 400, DerbyGame.LANE_Y + k * DerbyGame.LANE_H - DerbyGame.LANE_H / 2);
            k++;
        }
        // the finish line across the lanes
        k = 0;
        while (k < 12) {
            lanes.graphics.lineStyle(0, 0, 0);
            lanes.graphics.beginFill((k % 2 ? 0x1A1210 : 0xE8DCC8) >>> 0, 0.9);
            lanes.graphics.drawRect(40 + DerbyGame.TRACK - 4, DerbyGame.LANE_Y - DerbyGame.LANE_H / 2 + k * DerbyGame.LANE_H / 2, 8, DerbyGame.LANE_H / 2);
            lanes.graphics.endFill();
            k++;
        }
        this._gate = as3.as(this._ground.addChild(new Shape()), Shape);
        this._gate.graphics.lineStyle(4, 15260872, 1);
        this._gate.graphics.moveTo(40, DerbyGame.LANE_Y - 20);
        this._gate.graphics.lineTo(40, DerbyGame.LANE_Y + 6 * DerbyGame.LANE_H - 10);
        this._finish = as3.as(this._ground.addChild(new Sprite()), Sprite);
        CasinoUI.picture(this._finish, "casino/derby/finish.png", -30, DerbyGame.LANE_Y - 60, 60, 6 * DerbyGame.LANE_H + 52);
        this._finish.x = 40 + DerbyGame.TRACK;
        this._runnersLayer = as3.as(this._ground.addChild(new Sprite()), Sprite);
        this._clock = CasinoUI.title("", 22, DerbyGame.SW);
        this._clock.y = 6;
        this._track.addChild(this._clock);
        this._podium = as3.as(this._track.addChild(new Sprite()), Sprite);
        this._podium.mouseEnabled = this._podium.mouseChildren = false;
        this._bettors = as3.as(this._track.addChild(new Sprite()), Sprite);
        this._bettors.name = "casinoDerbyBettors";
        this._bettors.mouseEnabled = this._bettors.mouseChildren = false;
        this._bettors.x = DerbyGame.SW - 232;
        this._bettors.y = 38;
        // the odds board
        this._board = as3.as(this.addChild(new Sprite()), Sprite);
        this._board.x = DerbyGame.SX;
        this._board.y = DerbyGame.TH + 6;
        this._board.addChild(CasinoUI.panel(DerbyGame.SW, (400 - DerbyGame.TH - 6) | 0, 1));
        this.poll();
    }

    private serverNow(): number {
        return new Date().getTime() + this._offset;
    }

    private poll(): void {
        let sent: number = NaN;
        if (this._polling) {
            return;
        }
        this._polling = true;
        sent = new Date().getTime();
        CASINO.derbyState((r: any): void => {
            this._polling = false;
            if (!this.parent || r.error) {
                return;
            }
            this._offset = Number(r.server_ts) - (sent + new Date().getTime()) / 2;
            this.setState(r);
        });
    }

    private setState(r: any): void {
        this._state = r;
        if ((r.round_id | 0) != this._shownRound) {
            this._shownRound = r.round_id | 0;
            this._slip = {};
            this.buildRace(r);
        }
        if (String(r.phase) != this._shownPhase) {
            this._shownPhase = String(r.phase);
            if (r.phase == "results") {
                this.showPodium(r);
            } else {
                CasinoUI.removeAll(this._podium);
            }
            this.buildBoard(r);
        }
        this.showMine(r);
        this.showBettors(r);
        this.refresh();
    }

    /** The race's bettors, biggest first (a line per player and runner), and how many are in. */
    private showBettors(r: any): void {
        CasinoUI.removeAll(this._bettors);
        this._bettors.graphics.clear();
        let list: any[] = as3.as(r.bettors, Array);
        if (r.phase != "betting" || !list) {
            return;
        }
        let rows: int = Math.min(list.length, 10) | 0;
        this._bettors.graphics.lineStyle(1, 10107412, 0.9);
        this._bettors.graphics.beginFill(788230, 0.72);
        this._bettors.graphics.drawRoundRect(0, 0, 224, 24 + Math.max(1, rows) * 15 + 4, 10, 10);
        this._bettors.graphics.endFill();
        let players: int = r.players | 0;
        this._bettors.addChild(CasinoUI.at(CasinoUI.label(players == 0 ? "NO BETS YET - BE THE FIRST" : (players == 1 ? "1 PLAYER" : players + " PLAYERS") + " - " + CasinoUI.number(r.pot | 0) + " SHINY IN", 10, CasinoUI.GOLD, true, 216, TextFormatAlign.CENTER), 4, 5));
        let i: int = 0;
        while (i < rows) {
            let b: any = list[i];
            let y: int = (24 + i * 15) | 0;
            CasinoUI.picture(this._bettors, CASINO.monsterKey(String(b.on)), 8, y, 13, 13);
            this._bettors.addChild(CasinoUI.at(CasinoUI.label(String(b.name), 10, (b.me ? CasinoUI.GOLD : 0xE8DCC8) >>> 0, Boolean(b.me), 130), 24, y - 2));
            this._bettors.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.number(b.amount | 0), 10, CasinoUI.WIN, true, 64, TextFormatAlign.RIGHT), 152, y - 2));
            i++;
        }
    }

    /** The runners at the gate, the board for this race. */
    private buildRace(r: any): void {
        CasinoUI.removeAll(this._runnersLayer);
        this._runners = {};
        let list: any[] = as3.as(r.runners, Array);
        if (!list) {
            return;
        }
        let i: int = 0;
        while (i < list.length) {
            let id: string = as3.str(list[i].id);
            let s: Sprite = as3.as(this._runnersLayer.addChild(new Sprite()), Sprite);
            s.name = "casinoRunner:" + id;
            let body: Sprite = as3.as(s.addChild(new Sprite()), Sprite);
            CasinoUI.picture(body, CASINO.monsterKey(id), -19, -30, 38, 38);
            s.x = 40;
            s.y = DerbyGame.LANE_Y + i * DerbyGame.LANE_H;
            this._runners[id] = { "s": s, "body": body, "lane": i, "phase": Math.random() * 6 };
            i++;
        }
        this._ground.x = 0;
        this.buildBoard(r);
    }

    private buildBoard(r: any): void {
        while (this._board.numChildren > 1) {
            this._board.removeChildAt(1);
        }
        this._rows = {};
        let list: any[] = as3.as(r.runners, Array);
        if (!list) {
            return;
        }
        let order: any[] = r.phase == "results" ? as3.as(r.order, Array) : null;
        let i: int = 0;
        while (i < list.length) {
            let ru: any = list[i];
            let row: MovieClip = new MovieClip();
            row.name = "casinoOdds:" + ru.id;
            row.x = 6 + (i % 2) * 236;
            row.y = 6 + ((i / 2) | 0) * 52;
            let place: int = (order ? order.indexOf(ru.id) + 1 : 0) | 0;
            let m: Matrix = new Matrix();
            m.createGradientBox(230, 48, Math.PI / 2, 0, 0);
            row.graphics.lineStyle(1.5, (place == 1 ? 0xFFD040 : 0x9A3A14) >>> 0, 1);
            row.graphics.beginGradientFill(GradientType.LINEAR, place == 1 ? [0x6A4A10, 0x2A1A08] : [0x2A1E1A, 0x140E0C], [1, 1], [0, 255], m);
            row.graphics.drawRoundRect(0, 0, 230, 48, 10, 10);
            row.graphics.endFill();
            CasinoUI.picture(row, CASINO.monsterKey(as3.str(ru.id)), 2, 2, 44, 44);
            row.addChild(CasinoUI.at(CasinoUI.label(String(CASINO.MONSTER_NAMES[ru.id] || ru.id), 12, 16777215, true, 110), 50, 4));
            let pips: Shape = as3.as(row.addChild(new Shape()), Shape);
            let k: int = 0;
            while (k < 6) {
                pips.graphics.beginFill((k < Math.round(Number(ru.strength)) ? 0xFF8A2A : 0x3A2E2A) >>> 0, 1);
                pips.graphics.drawRect(50 + k * 9, 26, 7, 7);
                pips.graphics.endFill();
                k++;
            }
            let odds: TextField = CasinoUI.label(Number(ru.odds).toFixed(2), 16, CasinoUI.GOLD, true, 70, TextFormatAlign.RIGHT, "Groboldov");
            odds.x = 152;
            odds.y = 4;
            row.addChild(odds);
            let note: TextField = CasinoUI.label(place > 0 ? (place == 1 ? "WINNER" : "#" + place) : "odds", 9, (place == 1 ? 0xFFD040 : CasinoUI.ASH) >>> 0, true, 70, TextFormatAlign.RIGHT);
            note.x = 152;
            note.y = 30;
            row.addChild(note);
            let stack: Sprite = as3.as(row.addChild(new Sprite()), Sprite);
            stack.x = 126;
            stack.y = 30;
            row.mouseChildren = false;
            row.addEventListener(MouseEvent.CLICK, this.rowClick(String(ru.id)));
            this._board.addChild(row);
            this._rows[ru.id] = { "s": row, "stack": stack, "note": note, "place": place };
            i++;
        }
        this.refresh();
    }

    private rowClick(id: string): Function {
        return (e: MouseEvent): void => {
            this.addChip(id);
        };
    }

    private betting(): boolean {
        let r: any = this._state;
        return r != null && r.phase == "betting" && this.serverNow() < Number(r.starts_at) - 500;
    }

    private addChip(id: string): void {
        if (!this.betting() || this._sending) {
            return;
        }
        let chip: int = this._chip.value;
        if (CASINO.credits() < this.slipTotal() + chip) {
            this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        SOUNDS.Play("click1");
        this._slip[id] = ((this._slip[id] || 0) | 0) + chip;
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

    private refresh(): void {
        let k: string = null;
        for (k in this._rows) {
            let stack: Sprite = as3.cast(this._rows[k].stack, Sprite);
            CasinoUI.removeAll(stack);
            let amount: int = (((this._slip[k] || 0) | 0) + this.placed(k)) | 0;
            this._rows[k].s.buttonMode = this.betting();
            // what everyone has on it
            let all: int = this._state && this._state.totals ? (this._state.totals[k] || 0) | 0 : 0;
            if (this._rows[k].place == 0) {
                this._rows[k].note.text = all > 0 ? CasinoUI.number(all) + " bet" : "odds";
                this._rows[k].note.textColor = all > 0 ? CasinoUI.WIN : CasinoUI.ASH;
            }
            if (amount > 0) {
                let c: Shape = as3.as(stack.addChild(new Shape()), Shape);
                c.graphics.lineStyle(2, 16051420, 1);
                c.graphics.beginFill((((this._slip[k] || 0) | 0) > 0 ? 0xD8B040 : 0x3A9A4A) >>> 0, 1);
                c.graphics.drawCircle(0, 0, 11);
                c.graphics.endFill();
                let t: TextField = CasinoUI.label(amount >= 10000 ? ((amount / 1000) | 0) + "k" : String(amount), amount >= 1000 ? 7 : 9, 2102288, true, 30, TextFormatAlign.CENTER);
                t.x = -15;
                t.y = -7;
                stack.addChild(t);
            }
        }
        let total: int = this.slipTotal();
        this._total.text = CasinoUI.number(total) + " Shiny";
        CasinoUI.enable(this._place, total > 0 && this.betting() && !this._sending);
        CasinoUI.enable(this._clear, total > 0 && !this._sending);
    }

    /** What the player has on a runner already (placed slips). */
    private placed(id: string): int {
        let n: int = 0;
        let r: any = this._state;
        if (!r || !r.my_bets) {
            return 0;
        }
        for (let b of as3.values(r.my_bets)) {
            for (let x of as3.values(b.bets)) {
                if (x.on == id) {
                    n += x.amount | 0;
                }
            }
        }
        return n;
    }

    private onClear(e: MouseEvent = null): void {
        this._slip = {};
        this.refresh();
    }

    private onPlace(e: MouseEvent = null): void {
        let total: int = 0;
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
            return;
        }
        let r: any = this._state;
        total = this.slipTotal();
        if (!this.betting() || total <= 0 || this._sending) {
            return;
        }
        let bets: any[] = [];
        let k: string = null;
        for (k in this._slip) {
            bets.push({ "on": k, "amount": this._slip[k] | 0 });
        }
        this._sending = true;
        this.refresh();
        CASINO.derbyBet(r.round_id | 0, bets, (res: any): void => {
            this._sending = false;
            if (!this.parent) {
                return;
            }
            if (res.error) {
                this._win.message(String(res.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
            } else {
                this._slip = {};
                SOUNDS.Play("purchasepopup");
                this._win.message("Bet placed: " + CasinoUI.number(total) + " Shiny. Good luck!", CasinoUI.GOLD);
            }
            this.poll();
        });
    }

    private showMine(r: any): void {
        let list: any[] = as3.as(r.my_bets, Array);
        if (!list || !list.length) {
            this._mine.text = r.phase == "betting" ? "Pick monsters on the board, then place the bet." : "";
            this._mine.textColor = 15260872;
            return;
        }
        let parts: any[] = [];
        let paid: int = 0;
        let staked: int = 0;
        let settled: boolean = true;
        let odds: any = {};
        for (let ru of as3.values(r.runners)) {
            odds[ru.id] = ru.odds;
        }
        for (let b of as3.values(list)) {
            staked += b.stake | 0;
            paid += b.payout | 0;
            if (b.status != "settled") {
                settled = false;
            }
            for (let x of as3.values(b.bets)) {
                parts.push(String(CASINO.MONSTER_NAMES[x.on] || x.on) + " " + x.amount + " @ " + Number(odds[x.on]).toFixed(2));
            }
        }
        if (settled && r.phase == "results") {
            this._mine.text = paid > 0 ? "You won " + CasinoUI.number(paid) + " Shiny!" : "No luck this race (" + CasinoUI.number(staked) + " Shiny).";
            if (paid > 0 && this._celebrated != (r.round_id | 0)) {
                this._celebrated = r.round_id | 0;
                this._win.bigWin(paid, staked);
            }
            this._mine.textColor = paid > 0 ? CasinoUI.WIN : CasinoUI.LOSS;
        } else {
            this._mine.text = "Your bets: " + parts.join(", ");
            this._mine.textColor = 15260872;
        }
    }

    private showPodium(r: any): void {
        CasinoUI.removeAll(this._podium);
        let order: any[] = as3.as(r.order, Array);
        if (!order) {
            return;
        }
        let bg: Shape = as3.as(this._podium.addChild(new Shape()), Shape);
        bg.graphics.beginFill(788230, 0.72);
        bg.graphics.drawRoundRect(90, 40, 300, 170, 18, 18);
        bg.graphics.endFill();
        let spots: any[] = [[240, 150, 58, 0xFFD040, "1"], [165, 165, 44, 0xC8C8D0, "2"], [315, 175, 34, 0xC8804A, "3"]];
        let i: int = 0;
        while (i < 3 && i < order.length) {
            let sp: any[] = as3.cast(spots[i], Array);
            let block: Shape = as3.as(this._podium.addChild(new Shape()), Shape);
            block.graphics.beginFill(sp[3] >>> 0, 1);
            block.graphics.drawRect(sp[0] - 36, Number(sp[1]), 72, 200 - sp[1]);
            block.graphics.endFill();
            this._podium.addChild(CasinoUI.at(CasinoUI.title(as3.str(sp[4]), 18, 72), sp[0] - 36, Number(sp[1] + 2)));
            let who: Sprite = as3.as(this._podium.addChild(new Sprite()), Sprite);
            CasinoUI.picture(who, CASINO.monsterKey(as3.str(order[i])), sp[0] - sp[2] / 2, sp[1] - sp[2] + 4, Number(sp[2]), Number(sp[2]));
            if (i == 0) {
                who.filters = [new GlowFilter(0xFFD040, 1, 16, 16, 2, 2)];
            }
            i++;
        }
        this._podium.addChild(CasinoUI.at(CasinoUI.title(String(CASINO.MONSTER_NAMES[order[0]] || order[0]).toUpperCase() + " WINS!", 20, 300), 90, 44));
    }

    /** Where a runner is on the track `ms` into the race: along its checkpoints, a little past the finish. */
    private progress(id: string, ms: number): any {
        let sp: any = this._state.splits ? this._state.splits[id] : null;
        if (!sp || ms <= 0) {
            return { "f": 0, "stumble": false };
        }
        let times: any[] = as3.as(sp.times, Array);
        let n: int = times.length;
        let prevT: number = 0;
        let k: int = 0;
        while (k < n) {
            if (ms < times[k]) {
                let u: number = (ms - prevT) / (times[k] - prevT);
                return { "f": (k + u) / n, "stumble": k == (sp.stumble | 0) };
            }
            prevT = Number(times[k]);
            k++;
        }
        // past the finish: slowing to a stop
        return { "f": 1 + Math.min(0.08, (ms - times[n - 1]) / 40000), "stumble": false };
    }

    public tick(): void {
        let id: string = null;
        let o: any = null;
        this._t++;
        let r: any = this._state;
        this._pollT++;
        let near: boolean = Boolean(r && (r.phase == "racing" || Math.abs(Number(r.starts_at) - this.serverNow()) < 3000 || Math.abs(Number(r.ends_at) - this.serverNow()) < 3000));
        if (this._pollT >= (near ? 40 : 80)) {
            this._pollT = 0;
            this.poll();
        }
        if (!r) {
            this._status.text = "Finding the race...";
            return;
        }
        let now: number = this.serverNow();
        let phase: string = String(r.phase);
        if (phase == "betting" || phase == "waiting") {
            let left: number = Math.max(0, Number(r.starts_at) - now);
            let sec: int = Math.ceil(left / 1000) | 0;
            let clock: string = ((sec / 60) | 0) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
            this._status.text = phase == "waiting" || now < Number(r.betting_opens_at) ? "Next race soon..." : "RACE IN " + clock;
            this._clock.text = phase == "betting" ? "BETS CLOSE IN " + clock : "";
            if (left <= 0) {
                this.poll();
            }
            for (id in this._runners) {
                o = this._runners[id];
                o.s.x = 40;
                o.body.y = Math.sin((this._t + o.phase * 10) / 8) * 1.5;
            }
            this._ground.x = 0;
        } else if (phase == "racing" || phase == "results") {
            let ms: number = Number(phase == "results" ? 99999 : now - Number(r.starts_at));
            let lead: number = 0;
            for (id in this._runners) {
                o = this._runners[id];
                let pr: any = this.progress(id, ms);
                o.s.x = 40 + pr.f * DerbyGame.TRACK;
                lead = Math.max(lead, Number(o.s.x));
                let running: boolean = pr.f > 0 && pr.f < 1;
                o.body.y = running ? -Math.abs(Math.sin((this._t + o.phase * 10) / 3)) * 5 : 0;
                o.body.rotation = pr.stumble ? Math.sin(this._t / 2) * 20 : (running ? Math.sin((this._t + o.phase) / 3) * 4 : 0);
            }
            // the view follows the leader
            this._ground.x = -Math.max(0, Math.min(DerbyGame.TRACK + 80 - DerbyGame.SW, lead - 330));
            this._status.text = phase == "racing" ? "RACING!" : "WINNER: " + String(CASINO.MONSTER_NAMES[r.order[0]] || r.order[0]).toUpperCase();
            this._clock.text = phase == "racing" ? ((ms / 1000) >= 0 ? (ms / 1000).toFixed(1) + "s" : "") : "";
        }
        if (this._t % 20 == 0) {
            this.refresh();
        }
    }

    public get showing(): boolean {
        return false;
    }

    public dispose(): void {
        this._state = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
