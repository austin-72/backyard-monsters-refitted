import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, ImageCache, SOUNDS } from "@game";

/**
 * Balthazar's Ascent (crash): one round for every player at once, run by the server
 * (server/src/services/casino/ascentRounds.ts). Bets are taken for 10 seconds; Balthazar takes off and
 * the multiplier climbs until a Sharpshooter Tower (the yard's own art, its turret following him)
 * shoots him down. Cash out by hand before that (the
 * server's clock decides) or set an automatic cash-out. The game asks for the round about twice a
 * second and draws the flight from the server's clock.
 */
export class AscentGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _auto: null, _action: null, _actionMode: "", _status: null, _mine: null, _scene: null, _sky: null, _trail: null, _balthazar: null, _tower: null, _mult: null, _sub: null, _history: null, _players: null, _playersTitle: null, _fx: null, _parts: null, _state: null, _offset: 0, _polling: false, _pollT: 0, _sending: false, _shownRound: -1, _crashT: 0, _crashAt: null, _points: null, _t: 0, _turretSheet: null, _turret: null, _turretFrame: -1 });
    }

    /** The scene (from the content area's top left). */
    private static readonly SX: int = 220;

    private static readonly SW: int = 480;

    private static readonly SH: int = 300;

    private static readonly START_X: number = 50;

    private static readonly START_Y: number = 245;

    /** The tower's art is the yard's at this scale; the turret's head from the tower's foot. */
    private static readonly TOWER_SCALE: number = 0.85;

    private static readonly HEAD_X: number = -14;

    private static readonly HEAD_Y: number = -118;
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _auto: TextField;
    private _action: Sprite;
    private _actionMode: string;
    private _status: TextField;
    private _mine: TextField;
    private _scene: Sprite;
    private _sky: Sprite;
    private _trail: Shape;
    private _balthazar: Sprite;
    private _tower: Sprite;
    private _mult: TextField;
    private _sub: TextField;
    private _history: Sprite;
    private _players: Sprite;
    private _playersTitle: TextField;
    private _fx: Sprite;
    private _parts: any[];
    /** The last state from the server, and the difference between its clock and ours. */
    private _state: any;
    private _offset: number;
    private _polling: boolean;
    private _pollT: int;
    private _sending: boolean;
    private _shownRound: int;
    private _crashT: int;
    private _crashAt: any;
    private _points: any[];
    private _t: int;
    /** The Sharpshooter's turret: its 30 headings (buildings/isnipertower anim), the one shown. */
    private _turretSheet: BitmapData;
    private _turret: Bitmap;
    private _turretFrame: int;

    public $ctor(win?: CasinoWindow): void {
        this._parts = [];
        this._points = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoAscent";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("BALTHAZAR'S ASCENT", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        p.addChild(CasinoUI.at(CasinoUI.label("AUTO CASH-OUT AT", 11, CasinoUI.EMBER, true, 120), 12, 206));
        // (after the label: at 118 the field covered its "AT")
        this._auto = CasinoUI.input(54, 24, "", 7, "0-9.");
        this._auto.name = "casinoAutoField";
        this._auto.x = 134;
        this._auto.y = 202;
        p.addChild(this._auto);
        p.addChild(CasinoUI.at(CasinoUI.label("x", 12, CasinoUI.GOLD, true, 12), 190, 206));
        p.addChild(CasinoUI.at(CasinoUI.label("(empty: cash out by hand)", 9, CasinoUI.ASH, false, 190), 12, 226));
        this._action = CasinoUI.button("BET", 190, 44, as3.bind(this, this.onAction), false, 18);
        this._action.x = 10;
        this._action.y = 246;
        p.addChild(this._action);
        this._status = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
        this._status.name = "casinoAscentStatus";
        this._status.x = 10;
        this._status.y = 298;
        p.addChild(this._status);
        this._mine = CasinoUI.label("", 10, 15260872, false, 190, TextFormatAlign.CENTER);
        this._mine.x = 10;
        this._mine.y = 318;
        this._mine.multiline = this._mine.wordWrap = true;
        this._mine.height = 40;
        p.addChild(this._mine);
        let note: TextField = CasinoUI.label("By hand, the server's clock decides; an automatic cash-out is settled exactly.", 9, CasinoUI.ASH, false, 190, TextFormatAlign.CENTER);
        note.multiline = note.wordWrap = true;
        note.height = 30;
        note.x = 10;
        note.y = 362;
        p.addChild(note);
        // the scene
        this._scene = as3.as(this.addChild(new Sprite()), Sprite);
        this._scene.x = AscentGame.SX;
        this._scene.addChild(CasinoUI.panel(AscentGame.SW, AscentGame.SH, 1));
        this._sky = as3.as(this._scene.addChild(new Sprite()), Sprite);
        let skyMask: Shape = as3.as(this._scene.addChild(new Shape()), Shape);
        skyMask.graphics.beginFill(0);
        skyMask.graphics.drawRoundRect(3, 3, AscentGame.SW - 6, AscentGame.SH - 6, 12, 12);
        skyMask.graphics.endFill();
        this._sky.mask = skyMask;
        let skyA: Sprite = as3.as(this._sky.addChild(new Sprite()), Sprite);
        CasinoUI.picture(skyA, "casino/ascent/sky.jpg", 0, 0, 960, AscentGame.SH);
        let skyB: Sprite = as3.as(this._sky.addChild(new Sprite()), Sprite);
        CasinoUI.picture(skyB, "casino/ascent/sky.jpg", 0, 0, 960, AscentGame.SH);
        skyB.scaleX = -1;
        skyB.x = 1920;
        // (the first again past the mirrored one: the scene always has sky behind it, up to the wrap)
        let skyC: Sprite = as3.as(this._sky.addChild(new Sprite()), Sprite);
        CasinoUI.picture(skyC, "casino/ascent/sky.jpg", 0, 0, 960, AscentGame.SH);
        skyC.x = 1920;
        this._trail = as3.as(this._scene.addChild(new Shape()), Shape);
        this._trail.filters = [new GlowFilter(0xFF6A00, 0.9, 10, 10, 2, 2)];
        this._tower = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._tower.name = "casinoSharpshooter";
        let towerArt: Sprite = as3.as(this._tower.addChild(new Sprite()), Sprite);
        towerArt.scaleX = towerArt.scaleY = AscentGame.TOWER_SCALE;
        CasinoUI.picture(towerArt, "buildings/isnipertower/top.1.v2.png", -35, -60);
        this._turret = as3.as(towerArt.addChild(new Bitmap()), Bitmap);
        this._turret.x = -56;
        this._turret.y = -141;
        this._turret.smoothing = true;
        ImageCache.GetImageWithCallBack("buildings/isnipertower/anim.1.v2.png", (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (bmd) {
                this._turretSheet = bmd;
                this._turret.bitmapData = new BitmapData(85, 81, true, 0);
                this._turretFrame = -1;
                this.aimAt(this._balthazar.x, this._balthazar.y);
            }
        });
        this._tower.x = 425;
        this._tower.y = AscentGame.SH - 8;
        this._balthazar = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._balthazar.name = "casinoBalthazar";
        CasinoUI.picture(this._balthazar, CASINO.monsterKey("balthazar"), -34, -34, 68, 68);
        this._balthazar.x = AscentGame.START_X;
        this._balthazar.y = AscentGame.START_Y;
        this._fx = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._mult = CasinoUI.title("", 44, AscentGame.SW);
        this._mult.name = "casinoAscentMultiplier";
        this._mult.y = 40;
        this._scene.addChild(this._mult);
        this._sub = CasinoUI.label("", 13, 16777215, true, AscentGame.SW, TextFormatAlign.CENTER);
        this._sub.filters = [new GlowFilter(0, 1, 4, 4, 6, 1)];
        this._sub.y = 100;
        this._scene.addChild(this._sub);
        this._history = as3.as(this._scene.addChild(new Sprite()), Sprite);
        this._history.x = 10;
        this._history.y = 10;
        // the players
        let pl: Sprite = as3.as(this.addChild(CasinoUI.panel(AscentGame.SW, 92)), Sprite);
        pl.x = AscentGame.SX;
        pl.y = AscentGame.SH + 8;
        this._playersTitle = CasinoUI.label("ON THIS FLIGHT", 11, CasinoUI.EMBER, true, 300);
        this._playersTitle.x = 12;
        this._playersTitle.y = 6;
        pl.addChild(this._playersTitle);
        this._players = as3.as(pl.addChild(new Sprite()), Sprite);
        this._players.x = 12;
        this._players.y = 24;
        this.poll();
    }

    private rules(): any {
        return this._state && this._state.rules ? this._state.rules : { "growth": 0.00006, "min_auto": 1.01 };
    }

    /** 2.40x (always two decimals: the readout does not jump about). */
    private static fx(m: number): string {
        return m.toFixed(2) + "x";
    }

    private serverNow(): number {
        return new Date().getTime() + this._offset;
    }

    /** The multiplier `ms` into the flight (as the server works it out). */
    private multAt(ms: number): number {
        return Math.max(1, Math.floor(100 * Math.exp(Number(this.rules().growth) * Math.max(0, ms)) + 0.000000001) / 100);
    }

    private poll(): void {
        let sent: number = NaN;
        if (this._polling) {
            return;
        }
        this._polling = true;
        sent = new Date().getTime();
        CASINO.ascentState((r: any): void => {
            this._polling = false;
            if (!this.parent || r.error) {
                return;
            }
            let got: number = new Date().getTime();
            this._offset = Number(r.server_ts) - (sent + got) / 2;
            this.setState(r);
        });
    }

    private setState(r: any): void {
        let was: any = this._state;
        this._state = r;
        if ((r.round_id | 0) != this._shownRound) {
            // a new round on screen
            this._shownRound = r.round_id | 0;
            this._points = [];
            this._trail.graphics.clear();
            this._crashT = 0;
            this._crashAt = null;
            CasinoUI.removeAll(this._fx);
            this._balthazar.visible = true;
            this._balthazar.rotation = 0;
            this._balthazar.alpha = 1;
        }
        if (r.phase == "crashed" && (!was || was.phase != "crashed" || (was.round_id | 0) != (r.round_id | 0)) && this._crashT == 0) {
            this.shotDown(Number(r.crash));
        }
        this.showHistory(as3.as(r.history, Array));
        this.showPlayers(r);
        this.showMine(r);
    }

    private showHistory(h: any[]): void {
        CasinoUI.removeAll(this._history);
        if (!h) {
            return;
        }
        let i: int = 0;
        while (i < Math.min(h.length, 9)) {
            let c: number = Number(h[i].crash);
            let box: Sprite = CasinoUI.panel(48, 18, 0.85);
            box.x = i * 51;
            let t: TextField = CasinoUI.label(AscentGame.fx(c), 10, c >= 10 ? CasinoUI.WIN : (c >= 2 ? CasinoUI.GOLD : CasinoUI.ASH), true, 48, TextFormatAlign.CENTER);
            t.y = 1;
            box.addChild(t);
            this._history.addChild(box);
            i++;
        }
    }

    private showPlayers(r: any): void {
        CasinoUI.removeAll(this._players);
        let list: any[] = as3.as(r.players, Array);
        this._playersTitle.text = "ON THIS FLIGHT (" + (r.player_count | 0) + ")";
        if (!list) {
            return;
        }
        let i: int = 0;
        while (i < Math.min(list.length, 12)) {
            let pl: any = list[i];
            let text: string = pl.name + "  " + CasinoUI.number(pl.stake | 0) + (pl.cashed != null ? "  " + AscentGame.fx(Number(pl.cashed)) + " +" + CasinoUI.number(pl.payout | 0) : (pl.lost ? "  lost" : ""));
            let t: TextField = CasinoUI.label(text, 10, (pl.cashed != null ? CasinoUI.WIN : (pl.lost ? CasinoUI.LOSS : (pl.me ? CasinoUI.GOLD : 0xE8DCC8))) >>> 0, Boolean(pl.me), 150);
            t.x = (i % 3) * 152;
            t.y = ((i / 3) | 0) * 15;
            this._players.addChild(t);
            i++;
        }
    }

    private showMine(r: any): void {
        let b: any = r.my_bet;
        if (!b) {
            this._mine.text = "";
            return;
        }
        if (b.cashed != null) {
            this._mine.text = "Cashed out at " + AscentGame.fx(Number(b.cashed)) + ": +" + CasinoUI.number(b.payout | 0) + " Shiny";
            this._mine.textColor = CasinoUI.WIN;
        } else if (b.lost) {
            this._mine.text = "Shot down with your " + CasinoUI.number(b.stake | 0) + " Shiny aboard.";
            this._mine.textColor = CasinoUI.LOSS;
        } else {
            this._mine.text = "Your bet: " + CasinoUI.number(b.stake | 0) + (b.auto != null ? ", cashing out at " + AscentGame.fx(Number(b.auto)) : "");
            this._mine.textColor = 15260872;
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
        if (this._actionMode == "bet") {
            let st: any = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                return;
            }
            bet = this._bet.value;
            let auto: number = Number(Number(this._auto.text) || 0);
            if (auto > 0 && auto < Number(this.rules().min_auto)) {
                this._win.message("An automatic cash-out is " + Number(this.rules().min_auto).toFixed(2) + "x or more.", CasinoUI.LOSS);
                return;
            }
            if (CASINO.credits() < bet) {
                this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            this._sending = true;
            CASINO.ascentBet(r.round_id | 0, bet, auto, (res: any): void => {
                this._sending = false;
                if (!this.parent) {
                    return;
                }
                if (res.error) {
                    this._win.message(String(res.error), CasinoUI.LOSS);
                    SOUNDS.Play("error1");
                } else {
                    SOUNDS.Play("click1");
                    this._win.message("On board: " + CasinoUI.number(bet) + " Shiny" + (res.auto ? ", out at " + AscentGame.fx(Number(res.auto)) : "") + ".", CasinoUI.GOLD);
                }
                this.poll();
            });
        } else if (this._actionMode == "cashout") {
            this._sending = true;
            CASINO.ascentCashout(r.round_id | 0, (res: any): void => {
                this._sending = false;
                if (!this.parent) {
                    return;
                }
                if (res.error) {
                    this._win.message(String(res.error), CasinoUI.LOSS);
                } else if (res.cashed != null) {
                    this._win.message("Cashed out at " + AscentGame.fx(Number(res.cashed)) + ": +" + CasinoUI.number(res.payout | 0) + " Shiny", CasinoUI.WIN);
                    SOUNDS.Play("chaching");
                    this._win.bigWin(res.payout | 0, Math.round((res.payout | 0) / Math.max(1, Number(res.cashed))) | 0);
                } else {
                    this._win.message("Too late: Balthazar was already shot down.", CasinoUI.LOSS);
                }
                this.poll();
            });
        }
    }

    public tick(): void {
        this._t++;
        let r: any = this._state;
        // ask again: twice a second while he flies, about once otherwise
        this._pollT++;
        if (this._pollT >= (r && r.phase == "flying" ? 18 : 36)) {
            this._pollT = 0;
            this.poll();
        }
        if (!r) {
            this._status.text = "Finding the flight...";
            this.setAction("", "WAIT", false);
            return;
        }
        let now: number = this.serverNow();
        let phase: string = String(r.phase);
        let mine: any = r.my_bet;
        let m: number = 1;
        if (phase == "betting" || phase == "waiting") {
            let opens: number = Number(r.betting_opens_at);
            let left: number = Math.max(0, Number(r.starts_at) - now);
            if (phase == "waiting" || now < opens) {
                this._status.text = "Next flight soon...";
                this.setAction("", "WAIT", false);
            } else {
                this._status.text = "TAKING OFF IN " + Math.ceil(left / 1000) + "s";
                if (mine) {
                    this.setAction("", "ON BOARD", false);
                } else {
                    this.setAction("bet", "BET", left > 300);
                }
            }
            this._mult.text = "1.00x";
            this._mult.textColor = 16777215;
            this._sub.text = left > 0 ? "Bets close in " + (left / 1000).toFixed(1) + "s" : "";
            this._balthazar.x = AscentGame.START_X;
            this._balthazar.y = AscentGame.START_Y + Math.sin(this._t / 6) * 2;
            this.aimAt(this._balthazar.x, this._balthazar.y);
            if (left <= 0 && now >= opens) {
                // take-off: the server says so on the next answer
                this.poll();
            }
        } else if (phase == "flying") {
            let ms: number = Math.max(0, now - Number(r.starts_at));
            m = this.multAt(ms);
            this._mult.text = AscentGame.fx(m);
            this._mult.textColor = (m >= 10 ? 0x9CFF6A : (m >= 2 ? 0xFFD58A : 0xFFFFFF)) >>> 0;
            this._status.text = "FLYING";
            if (mine && mine.cashed == null && !mine.lost) {
                let pay: string = CasinoUI.shiny((mine.stake | 0) * m);
                this._sub.text = "Cash out now: " + pay + " Shiny";
                this.setAction("cashout", "CASH OUT " + pay, true);
            } else {
                this._sub.text = "";
                this.setAction("", mine ? "CASHED OUT" : "NEXT FLIGHT", false);
            }
            this.fly(ms, m);
        } else if (phase == "crashed") {
            this._mult.text = AscentGame.fx(Number(r.crash));
            this._mult.textColor = CasinoUI.LOSS;
            this._sub.text = "SHOT DOWN";
            this._status.text = "SHOT DOWN AT " + AscentGame.fx(Number(r.crash));
            this.setAction("", "NEXT FLIGHT", false);
        }
        this.animate();
    }

    /** Balthazar's place `ms` into the flight: up and to the right, slower as he goes. */
    private fly(ms: number, m: number): void {
        let x: number = AscentGame.START_X + 300 * (1 - Math.exp(-ms / 14000));
        let y: number = AscentGame.START_Y - 190 * (1 - Math.pow(m, -0.8));
        this._balthazar.x = x;
        this._balthazar.y = y + Math.sin(this._t / 3) * 3;
        this._balthazar.rotation = -8 + Math.sin(this._t / 5) * 4;
        let last: any = this._points.length ? this._points[this._points.length - 1] : null;
        if (!last || Math.abs(last.x - x) + Math.abs(last.y - y) > 3) {
            this._points.push({ "x": x, "y": y });
            this._trail.graphics.clear();
            this._trail.graphics.lineStyle(4, 16756800, 0.9);
            this._trail.graphics.moveTo(AscentGame.START_X, AscentGame.START_Y);
            for (let p of as3.values(this._points)) {
                this._trail.graphics.lineTo(Number(p.x), Number(p.y));
            }
        }
        this.aimAt(x, y);
        // the sky goes by faster as he climbs
        this._sky.x -= Math.min(6, 0.6 + m * 0.35);
        if (this._sky.x <= -1920) {
            this._sky.x += 1920;
        }
    }

    /** The turret turned toward a point of the scene (30 headings: right 26, up 18, left 10, down 3). */
    private aimAt(x: number, y: number): void {
        if (!this._turretSheet || !this._turret.bitmapData) {
            return;
        }
        let hx: number = this._tower.x + AscentGame.HEAD_X * AscentGame.TOWER_SCALE;
        let hy: number = this._tower.y + AscentGame.HEAD_Y * AscentGame.TOWER_SCALE;
        let deg: number = Math.atan2(hy - y, x - hx) * 180 / Math.PI;
        if (deg < 0) {
            deg += 360;
        }
        let f: number = deg <= 180 ? 26 - deg / 180 * 16 : 10 - (deg - 180) / 180 * 14;
        let frame: int = (((Math.round(f) % 30) + 30) % 30) | 0;
        if (frame != this._turretFrame) {
            this._turretFrame = frame;
            this._turret.bitmapData.fillRect(this._turret.bitmapData.rect, 0);
            this._turret.bitmapData.copyPixels(this._turretSheet, new Rectangle(frame * 85, 0, 85, 81), new Point(0, 0));
        }
    }

    /** The muzzle: the turret's head, a little toward where it points. */
    private muzzle(x: number, y: number): any {
        let hx: number = this._tower.x + AscentGame.HEAD_X * AscentGame.TOWER_SCALE;
        let hy: number = this._tower.y + AscentGame.HEAD_Y * AscentGame.TOWER_SCALE;
        let d: number = Math.max(1, Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy)));
        return { "x": hx + (x - hx) / d * 26, "y": hy + (y - hy) / d * 26 };
    }

    /** The tower fires, a burst, he falls. */
    private shotDown(crash: number): void {
        this._crashT = 1;
        this._crashAt = { "x": this._balthazar.x, "y": this._balthazar.y };
        this.aimAt(Number(this._crashAt.x), Number(this._crashAt.y));
        SOUNDS.Play("isniper");
    }

    private animate(): void {
        if (this._crashT > 0 && this._crashT < 200) {
            this._crashT++;
            let k: int = this._crashT;
            let mz: any = this.muzzle(Number(this._crashAt.x), Number(this._crashAt.y));
            let tx: number = Number(mz.x);
            let ty: number = Number(mz.y);
            if (k < 12) {
                // the Sharpshooter's round: a flash at the muzzle, a tracer straight to him
                CasinoUI.removeAll(this._fx);
                let u: number = Math.min(1, k / 4);
                let shot: Shape = as3.as(this._fx.addChild(new Shape()), Shape);
                if (k <= 3) {
                    shot.graphics.beginFill(16773312, 1);
                    shot.graphics.drawCircle(tx, ty, 9 - k * 2);
                    shot.graphics.endFill();
                }
                shot.graphics.lineStyle(3 - Math.min(2, k / 5), 16771232, Math.max(0.15, 1 - k / 12));
                shot.graphics.moveTo(tx + (this._crashAt.x - tx) * Math.max(0, u - 0.6), ty + (this._crashAt.y - ty) * Math.max(0, u - 0.6));
                shot.graphics.lineTo(tx + (this._crashAt.x - tx) * u, ty + (this._crashAt.y - ty) * u);
                shot.filters = [new GlowFilter(0xFF8A20, 1, 10, 10, 3, 2)];
                if (k == 5) {
                    // (he is hit as the tracer reaches him: the burst starts at once)
                    k = this._crashT = 12;
                }
            }
            if (k == 12) {
                CasinoUI.removeAll(this._fx);
                let n: int = 0;
                while (n < 30) {
                    let d: Shape = as3.as(this._fx.addChild(new Shape()), Shape);
                    d.graphics.beginFill([0xFF6A1A, 0xFFB040, 0xFFE08A, 0x5A4A44][n % 4] >>> 0, 1);
                    d.graphics.drawCircle(0, 0, 2 + Math.random() * 4);
                    d.graphics.endFill();
                    d.x = Number(this._crashAt.x);
                    d.y = Number(this._crashAt.y);
                    let a: number = Math.random() * Math.PI * 2;
                    let v: number = 2 + Math.random() * 5;
                    this._parts.push({ "s": d, "vx": Math.cos(a) * v, "vy": Math.sin(a) * v, "life": 34, "max": 34 });
                    n++;
                }
                SOUNDS.Play("chaching");
            } else {
                // he spirals down
                this._balthazar.rotation += 14;
                this._balthazar.y = Math.min(AscentGame.SH + 60, this._balthazar.y + (k - 12) * 0.35);
                this._balthazar.alpha = Math.max(0.2, this._balthazar.alpha - 0.01);
                if (k % 3 == 0 && this._balthazar.y < AscentGame.SH) {
                    let smoke: Shape = as3.as(this._fx.addChild(new Shape()), Shape);
                    smoke.graphics.beginFill(3814450, 0.6);
                    smoke.graphics.drawCircle(0, 0, 5 + Math.random() * 4);
                    smoke.graphics.endFill();
                    smoke.x = this._balthazar.x;
                    smoke.y = this._balthazar.y;
                    this._parts.push({ "s": smoke, "vx": 0, "vy": -0.4, "life": 40, "max": 40, "grow": 0.03 });
                }
            }
        }
        let i: int = (this._parts.length - 1) | 0;
        while (i >= 0) {
            let p: any = this._parts[i];
            p.life--;
            p.s.x += p.vx;
            p.s.y += p.vy;
            if (p.grow) {
                p.s.scaleX = p.s.scaleY = p.s.scaleX + p.grow;
            } else {
                p.vy += 0.15;
            }
            p.s.alpha = Math.max(0, p.life / p.max);
            if (p.life <= 0) {
                if (p.s.parent) {
                    p.s.parent.removeChild(p.s);
                }
                this._parts.splice(i, 1);
            }
            i--;
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
