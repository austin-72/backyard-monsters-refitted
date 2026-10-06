import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BetSelector, CASINO, CasinoUI, CasinoWindow, ImageCache, SOUNDS } from "@game";

/**
 * Magma Slots: three reels in the chest of a Moloch idol. The server draws a stop on each reel
 * (server/src/services/casino/games/slots.ts) from the reels' fixed strips (casino/state); the reels
 * spin and stop left to right on them. Three King Wormzer win the jackpot pool, shown on the idol's
 * brow, which takes a part of every spin everywhere.
 *
 * The same class is Korath's Fortune (mode "fortune", Pit level 6): the same reels, read on five lines
 * (the rows and the diagonals, casino/state rules.fortune.lines), each a fifth of the bet, and the same
 * jackpot pool. Korath looms over its cabinet, and the reels show the champions (casino/fortune/<symbol>
 * .png: each stands for a Slots symbol, so the server's draw and pays are the Slots'; FORTUNE_NAMES). On both: when the first two reels already show a pair on a line, the last reel spins
 * longer (the draw is the server's and already made: this only holds it back); SPIN while the reels
 * turn stops them at once on the result; AUTO plays 10 to 100 spins in a row; Moloch's Favor is the
 * free Slots spin of the day.
 */
export class SlotsGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _bet: null, _spin: null, _cabinet: null, _reels: null, _bmd: null, _jackpot: null, _jackpotNote: null, _line: null, _lever: null, _leverT: 0, _spinning: null, _winCells: null, _pulse: 0, _rain: null, _rainLayer: null, _celebrate: 0, _banner: null, _serverCredits: -1, _mode: null, _lines: null, _tease: null, _teaseColor: 16756784, _teaseFx: null, _teaseSpots: null, _autoBtn: null, _autoToggles: null, _auto: 0, _autoCount: 25, _autoWait: 0, _favorBtn: null });
    }

    public static readonly SYMBOLS: any[] = ["wormzer", "balthazar", "grokus", "valgos", "zagnoid", "malphus", "spurtz"];

    /** The cabinet (cabinet.png, 480 x 400) from the content area's left, and its reels in it. */
    private static readonly CX: int = 220;

    private static readonly REEL_X: int = 94;

    private static readonly REEL_Y: int = 120;

    private static readonly REEL_W: int = 92;

    private static readonly ROW: int = 64;

    private static readonly SYM: int = 58;

    /** Korath's Fortune's champions, by the Slots symbol each stands for (the jackpot is three Korath). */
    public static readonly FORTUNE_NAMES: any = { "wormzer": "Korath", "balthazar": "Krallen", "grokus": "Fomor", "valgos": "Drull", "zagnoid": "Gorgo", "malphus": "Young Korath", "spurtz": "Baby Korath" };

    public static readonly LINE_COLORS: any[] = [0xFFB030, 0x6AE0FF, 0x9CFF6A, 0xFF6AD0, 0xD090FF];

    /** Korath's Fortune's lines (rows top to bottom, per reel), if the server has not sent them. */
    public static readonly FORTUNE_LINES: any[] = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
    private _win: CasinoWindow;
    private _bet: BetSelector;
    private _spin: Sprite;
    private _cabinet: Sprite;
    private _reels: any[];
    private _bmd: any;
    private _jackpot: TextField;
    private _jackpotNote: TextField;
    private _line: Shape;
    private _lever: Sprite;
    private _leverT: int;
    /** The spin: sent, its answer (null until it comes), the frame it came. */
    private _spinning: any;
    private _winCells: any[];
    private _pulse: int;
    private _rain: any[];
    private _rainLayer: Sprite;
    private _celebrate: int;
    private _banner: Sprite;
    private _serverCredits: int;
    /** "slots" or "fortune". */
    private _mode: string;
    /** Korath's Fortune's five lines, drawn when they win. */
    private _lines: any[];
    /** The cells held up while the last reel spins on (a pair waiting for its third). */
    private _tease: any[];
    private _teaseColor: uint;
    /** Frames round the pair (and the last reel's place for its third) while it waits. */
    private _teaseFx: Shape;
    private _teaseSpots: any[];
    private _autoBtn: Sprite;
    private _autoToggles: any[];
    /** Spins left to play by themselves, how many a run is, and the frames to the next. */
    private _auto: int;
    private _autoCount: int;
    private _autoWait: int;
    private _favorBtn: Sprite;

    public $ctor(win?: CasinoWindow, mode: string = "slots"): void {
        let s: string = null;
        this._reels = [];
        this._bmd = {};
        this._winCells = [];
        this._rain = [];
        this._lines = [];
        this._tease = [];
        this._teaseSpots = [];
        this._autoToggles = [];
        super.$ctor();
        this._win = win;
        this._mode = mode;
        this.name = mode == "fortune" ? "casinoFortune" : "casinoSlots";
        let i: int = 0;
        // controls
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label(this.fortune ? "KORATH'S FORTUNE" : "MAGMA SLOTS", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
        this._bet = new BetSelector(190);
        this._bet.x = 10;
        this._bet.y = 82;
        p.addChild(this._bet);
        this._spin = CasinoUI.button("SPIN", 128, 40, as3.bind(this, this.onSpin), true, 20);
        this._spin.x = 10;
        this._spin.y = 206;
        p.addChild(this._spin);
        this._autoBtn = CasinoUI.button("AUTO", 58, 40, as3.bind(this, this.onAuto), true, 13);
        this._autoBtn.x = 142;
        this._autoBtn.y = 206;
        p.addChild(this._autoBtn);
        // how many spins AUTO plays
        let counts: any[] = [10, 25, 50, 100];
        i = 0;
        while (i < counts.length) {
            let at: Sprite = CasinoUI.toggle(String(counts[i]), 44, 18, this.autoCountClick(counts[i] | 0));
            at.name = "casinoAuto:" + counts[i];
            at.x = 10 + i * 48;
            at.y = 250;
            p.addChild(at);
            this._autoToggles.push(at);
            i++;
        }
        this.chooseAutoCount();
        p.addChild(CasinoUI.at(CasinoUI.label(this.fortune ? "THREE ON A LINE (x LINE BET)" : "THREE ON THE LINE PAY", 10, CasinoUI.EMBER, true, 190), 12, 272));
        let r: any = this.rules();
        let rows: any[] = [];
        for (const $value of as3.values(SlotsGame.SYMBOLS)) {
            s = as3.str($value);
            rows.push([s, 3, s == "wormzer" ? "JACKPOT" : CasinoUI.mult(Number(r ? Number(r.pays[s]) : 0))]);
        }
        rows.push(["spurtz", 2, CasinoUI.mult(Number(r ? Number(r.two_spurtz) : 1))]);
        i = 0;
        while (i < rows.length) {
            let row: Sprite = as3.as(p.addChild(new Sprite()), Sprite);
            row.x = 12;
            row.y = 287 + i * 13;
            let k: int = 0;
            while (k < rows[i][1]) {
                CasinoUI.picture(row, this.symbolKey(as3.str(rows[i][0])), k * 14, 0, 13, 13);
                k++;
            }
            row.addChild(CasinoUI.at(CasinoUI.label(rows[i][1] == 2 ? "two " + this.symbolName("spurtz") : this.symbolName(as3.str(rows[i][0])), 10, 15260872, false, 100), 50, -2));
            row.addChild(CasinoUI.at(CasinoUI.label(as3.str(rows[i][2]), 10, (rows[i][0] == "wormzer" && rows[i][1] == 3 ? 0xD090FF : CasinoUI.GOLD) >>> 0, true, 70, TextFormatAlign.RIGHT), 116, -2));
            i++;
        }
        // the cabinet and its reels
        if (this.fortune) {
            // Korath, looming over his machine (behind it; the cabinet is a little smaller, lower)
            let korath: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
            korath.name = "casinoKorath";
            korath.mouseEnabled = korath.mouseChildren = false;
            CasinoUI.picture(korath, "casino/fortune/korath.png", SlotsGame.CX, 0, 480, 140);
        }
        this._cabinet = as3.as(this.addChild(new Sprite()), Sprite);
        this._cabinet.x = SlotsGame.CX;
        if (this.fortune) {
            this._cabinet.scaleX = this._cabinet.scaleY = 0.9;
            this._cabinet.x = SlotsGame.CX + 24;
            this._cabinet.y = 40;
        }
        let backing: Shape = as3.as(this._cabinet.addChild(new Shape()), Shape);
        backing.graphics.beginFill(788230, 1);
        backing.graphics.drawRect(SlotsGame.REEL_X - 4, SlotsGame.REEL_Y - 4, SlotsGame.REEL_W * 3 + 16 + 8, SlotsGame.ROW * 3 + 8);
        backing.graphics.endFill();
        i = 0;
        while (i < 3) {
            this._reels.push(this.makeReel(i));
            i++;
        }
        let art: Sprite = as3.as(this._cabinet.addChild(new Sprite()), Sprite);
        art.mouseEnabled = art.mouseChildren = false;
        CasinoUI.picture(art, this.fortune ? "casino/fortune/cabinet.png" : "casino/slots/cabinet.png", 0, 0, 480, 400);
        this._teaseFx = as3.as(this._cabinet.addChild(new Shape()), Shape);
        this._teaseFx.filters = [new GlowFilter(0xFF8A00, 1, 12, 12, 2, 2)];
        this._line = as3.as(this._cabinet.addChild(new Shape()), Shape);
        this._line.graphics.lineStyle(4, 16756784, 1);
        this._line.graphics.moveTo(SlotsGame.REEL_X - 6, SlotsGame.REEL_Y + SlotsGame.ROW * 1.5);
        this._line.graphics.lineTo(SlotsGame.REEL_X + SlotsGame.REEL_W * 3 + 22, SlotsGame.REEL_Y + SlotsGame.ROW * 1.5);
        this._line.filters = [new GlowFilter(0xFF6A00, 1, 12, 12, 3, 2)];
        this._line.visible = false;
        if (this.fortune) {
            this.drawLines();
        }
        this._jackpot = CasinoUI.title("", 22, 260);
        this._jackpot.name = "casinoJackpot";
        this._jackpot.x = 110;
        this._jackpot.y = 62;
        this._cabinet.addChild(this._jackpot);
        this._jackpotNote = CasinoUI.label("", 9, 15255807, true, 260, TextFormatAlign.CENTER);
        this._jackpotNote.x = 110;
        this._jackpotNote.y = 94;
        this._cabinet.addChild(this._jackpotNote);
        this._lever = as3.as(this._cabinet.addChild(new Sprite()), Sprite);
        this._lever.name = "casinoLever";
        this._lever.x = 456;
        this._lever.y = 262;
        this._lever.buttonMode = true;
        CasinoUI.picture(this._lever, "casino/slots/lever.png", -18, -140, 36, 140);
        this._lever.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSpin));
        // the reels themselves: a click stops them at once
        this._cabinet.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onCabinetClick));
        if (!this.fortune) {
            this._favorBtn = CasinoUI.button("FREE SPIN", 112, 30, as3.bind(this, this.onFavor), true, 13);
            this._favorBtn.x = SlotsGame.CX + 8;
            this._favorBtn.y = 10;
            this.addChild(this._favorBtn);
        }
        this._rainLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._rainLayer.mouseEnabled = this._rainLayer.mouseChildren = false;
        this._banner = as3.as(this.addChild(new Sprite()), Sprite);
        this._banner.mouseEnabled = this._banner.mouseChildren = false;
        // the symbols' pictures, once each
        for (const $value of as3.values(SlotsGame.SYMBOLS)) {
            s = as3.str($value);
            ImageCache.GetImageWithCallBack(this.symbolKey(s), as3.bind(this, this.symbolLoaded), true, 1, "", [s]);
        }
        this.showJackpot();
    }

    private rules(): any {
        let st: any = CASINO.state;
        return st && st.rules ? st.rules.slots : null;
    }

    private strip(reel: int): any[] {
        let r: any = this.rules();
        return r ? as3.as(r.strips[reel], Array) : SlotsGame.SYMBOLS;
    }

    private symbolLoaded(key: string, bmd: BitmapData, args: any[] = null): void {
        if (bmd && args) {
            this._bmd[args[0]] = bmd;
            for (let reel of as3.values(this._reels)) {
                this.drawReel(reel);
            }
        }
    }

    private makeReel(i: int): any {
        let holder: Sprite = as3.as(this._cabinet.addChild(new Sprite()), Sprite);
        holder.name = "casinoReel:" + i;
        holder.x = SlotsGame.REEL_X + i * (SlotsGame.REEL_W + 8);
        holder.y = SlotsGame.REEL_Y;
        let m: Matrix = new Matrix();
        m.createGradientBox(SlotsGame.REEL_W, SlotsGame.ROW * 3, Math.PI / 2, 0, 0);
        holder.graphics.beginGradientFill(GradientType.LINEAR, [0x6A5E50, 0xE8DCC8, 0xF4ECDC, 0xE8DCC8, 0x6A5E50], [1, 1, 1, 1, 1], [0, 70, 128, 185, 255], m);
        holder.graphics.drawRect(0, 0, SlotsGame.REEL_W, SlotsGame.ROW * 3);
        holder.graphics.endFill();
        let mask: Shape = as3.as(this._cabinet.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRect(holder.x, holder.y, SlotsGame.REEL_W, SlotsGame.ROW * 3);
        mask.graphics.endFill();
        holder.mask = mask;
        let cells: any[] = [];
        let k: int = 0;
        while (k < 5) {
            let c: Sprite = as3.as(holder.addChild(new Sprite()), Sprite);
            let b: Bitmap = as3.as(c.addChild(new Bitmap()), Bitmap);
            b.smoothing = true;
            cells.push({ "s": c, "b": b, "sym": null });
            k++;
        }
        let reel: any = { "i": i, "s": holder, "cells": cells, "o": Math.floor(Math.random() * 32), "v": 0, "target": -1, "state": "still", "bounce": 0 };
        this.drawReel(reel);
        return reel;
    }

    private static wrap(s: int): int {
        return (((s % 32) + 32) % 32) | 0;
    }

    /** The reel at its offset: the stop `o` in the middle row, o + 1 above it, o - 1 below. */
    private drawReel(reel: any): void {
        let strip: any[] = this.strip(reel.i | 0);
        let base: int = Math.floor(Number(reel.o)) | 0;
        let fast: boolean = reel.state == "spin" || (reel.state == "stopping" && reel.v > 0.2);
        let k: int = 0;
        while (k < 5) {
            let s: int = (base - 2 + k) | 0;
            let cell: any = reel.cells[k];
            let sym: string = as3.str(strip[SlotsGame.wrap(s)]);
            if (cell.sym != sym || !cell.b.bitmapData) {
                cell.sym = sym;
                cell.b.bitmapData = this._bmd[sym] || null;
                if (cell.b.bitmapData) {
                    cell.b.smoothing = true;
                    cell.b.width = cell.b.height = SlotsGame.SYM;
                    cell.b.x = cell.b.y = -SlotsGame.SYM / 2;
                }
            }
            cell.s.x = SlotsGame.REEL_W / 2;
            cell.s.y = SlotsGame.ROW * 1.5 + (reel.o - s) * SlotsGame.ROW + reel.bounce;
            cell.s.scaleY = fast ? 1.35 : 1;
            cell.s.alpha = fast ? 0.7 : 1;
            k++;
        }
    }

    /** The cell on the middle row of a reel (for the win glow). */
    private lineCell(reel: any): Sprite {
        return as3.cast(reel.cells[2].s, Sprite);
    }

    private showJackpot(): void {
        let st: any = CASINO.state;
        let pool: number = Number(st ? Number(st.jackpot) : 0);
        this._jackpot.text = CasinoUI.number(Math.floor(pool));
        let r: any = this.rules();
        let full: int = r ? r.jackpot_full_bet | 0 : 100;
        // (Korath's Fortune: the line's bet, a fifth of the stake, wins its share)
        let lines: int = (this.fortune ? this.lineSet().length : 1) | 0;
        let bet: number = this._bet.value / lines;
        let all: string = CasinoUI.number(full * lines);
        this._jackpotNote.text = (this.fortune ? "ON A LINE " : "") + (bet == full ? "THIS BET WINS ALL OF IT" : (bet > full ? "THIS BET WINS IT " + CasinoUI.mult(bet / full).toUpperCase() + " OVER" : "THIS BET WINS " + Math.max(1, Math.round(bet * 100 / full)) + "% OF IT - ALL FROM " + all + " SHINY"));
        if (this._favorBtn) {
            let f: any = CASINO.state ? CASINO.state.favor : null;
            this._favorBtn.visible = Boolean(f && f.enabled && f.ready);
        }
    }

    private get fortune(): boolean {
        return this._mode == "fortune";
    }

    /** A symbol's picture: the Slots' monsters, or Korath's Fortune's champions. */
    private symbolKey(s: string): string {
        return this.fortune ? "casino/fortune/" + s + ".png" : CASINO.monsterKey(s);
    }

    private symbolName(s: string): string {
        return String(this.fortune ? SlotsGame.FORTUNE_NAMES[s] : CASINO.MONSTER_NAMES[s]);
    }

    /** Korath's Fortune's lines: for each, the row (0 top, 1 middle, 2 bottom) on each reel. */
    private lineSet(): any[] {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.fortune && st.rules.fortune.lines ? as3.as(st.rules.fortune.lines, Array) : SlotsGame.FORTUNE_LINES;
    }

    /** The middle of a reel's row, in the cabinet. */
    private static cellX(reel: int): number {
        return SlotsGame.REEL_X + reel * (SlotsGame.REEL_W + 8) + SlotsGame.REEL_W / 2;
    }

    private static rowY(row: int): number {
        return SlotsGame.REEL_Y + SlotsGame.ROW * (row + 0.5);
    }

    /** The cell on a row of a reel (0 top: the stop above the middle one). */
    private rowCell(reel: any, row: int): Sprite {
        return as3.cast(reel.cells[3 - row].s, Sprite);
    }

    /** Korath's Fortune: each line's number at its ends, and the line itself (shown when it wins). */
    private drawLines(): void {
        let set: any[] = this.lineSet();
        let i: int = 0;
        while (i < set.length) {
            let rows: any[] = as3.cast(set[i], Array);
            let col: uint = SlotsGame.LINE_COLORS[i % SlotsGame.LINE_COLORS.length] >>> 0;
            let ln: Shape = as3.as(this._cabinet.addChild(new Shape()), Shape);
            ln.graphics.lineStyle(4, col, 1);
            ln.graphics.moveTo(SlotsGame.REEL_X - 6, SlotsGame.rowY(rows[0] | 0));
            let k: int = 0;
            while (k < rows.length) {
                ln.graphics.lineTo(SlotsGame.cellX(k), SlotsGame.rowY(rows[k] | 0));
                k++;
            }
            ln.graphics.lineTo(SlotsGame.REEL_X + SlotsGame.REEL_W * 3 + 22, SlotsGame.rowY(rows[rows.length - 1] | 0));
            ln.filters = [new GlowFilter(col, 1, 10, 10, 3, 2)];
            ln.visible = false;
            this._lines.push(ln);
            // a straight line is numbered on the left, a diagonal where it ends on the right
            let straight: boolean = rows[0] == rows[rows.length - 1];
            let badge: Sprite = as3.as(this._cabinet.addChild(new Sprite()), Sprite);
            badge.graphics.lineStyle(1.5, 16777215, 0.9);
            badge.graphics.beginFill(col, 1);
            badge.graphics.drawCircle(0, 0, 9);
            badge.graphics.endFill();
            badge.addChild(CasinoUI.at(CasinoUI.label(String(i + 1), 10, 1706502, true, 18, TextFormatAlign.CENTER), -9, -8));
            badge.x = straight ? SlotsGame.REEL_X - 16 : SlotsGame.REEL_X + SlotsGame.REEL_W * 3 + 16 + 14;
            badge.y = SlotsGame.rowY((straight ? rows[0] : rows[rows.length - 1]) | 0);
            badge.mouseEnabled = badge.mouseChildren = false;
            i++;
        }
    }

    private autoCountClick(n: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._autoCount = n;
            this.chooseAutoCount();
        };
    }

    private chooseAutoCount(): void {
        let counts: any[] = [10, 25, 50, 100];
        let i: int = 0;
        while (i < this._autoToggles.length) {
            CasinoUI.choose(as3.cast(this._autoToggles[i], Sprite), counts[i] == this._autoCount);
            i++;
        }
    }

    /** AUTO: a run of spins at this bet (stopped by AUTO again, a jackpot, a big win or the Shiny running out). */
    private onAuto(e: MouseEvent = null): void {
        if (this._auto > 0) {
            this.stopAuto("Auto-spin stopped.");
            return;
        }
        this._auto = this._autoCount;
        this._autoWait = 0;
        if (!this._spinning) {
            this.nextAuto();
        }
    }

    private stopAuto(why: string = null): void {
        if (this._auto > 0 && why) {
            this._win.message(why, CasinoUI.ASH);
        }
        this._auto = 0;
        this._autoWait = 0;
    }

    private nextAuto(): void {
        if (this._auto <= 0) {
            return;
        }
        if (CASINO.credits() < this._bet.value) {
            this.stopAuto("Auto-spin stopped: not enough Shiny for the next spin.");
            return;
        }
        this._auto--;
        this.onSpin();
        if (!this._spinning) {
            this._auto = 0;
        }
    }

    private onCabinetClick(e: MouseEvent): void {
        // (not the click on the lever that has just started the spin)
        if (this._spinning && this._spinning.t > 2) {
            this.quickStop();
        }
    }

    /** The reels stopped at once on the result (or as soon as it comes). */
    private quickStop(): void {
        let sp: any = this._spinning;
        if (!sp || sp.quick) {
            return;
        }
        sp.quick = true;
        this.snapReels();
    }

    private snapReels(): void {
        let sp: any = this._spinning;
        if (!sp || !sp.r || sp.r.error) {
            return;
        }
        for (let reel of as3.values(this._reels)) {
            if (reel.state == "still") {
                continue;
            }
            reel.o = sp.r.stops[reel.i] | 0;
            reel.state = "still";
            reel.bounce = 6;
            this.drawReel(reel);
        }
        SOUNDS.Play("click1");
        this.clearTease();
    }

    /** Today's free spin, now (the lobby's FREE SPIN). */
    public playFavor(): void {
        let f: any = CASINO.state ? CASINO.state.favor : null;
        if (f && f.enabled && f.ready) {
            this.onFavor();
        }
    }

    private onFavor(e: MouseEvent = null): void {
        if (!this._spinning) {
            this.stopAuto();
            this.onSpin(null, true);
        }
    }

    /**
     * A pair on a line on the first two reels, waiting for its third: how much longer the last reel
     * spins (more for two King Wormzer), and the cells to light meanwhile.
     */
    private closeCall(r: any): any {
        let cells: any[] = [];
        // [reel, row] of each lit cell, and of the last reel's cell each pair waits on
        let spots: any[] = [];
        let wormzer: boolean = false;
        if (this.fortune) {
            let win: any[] = as3.as(r.window, Array);
            for (let rows of as3.values(this.lineSet())) {
                let a: string = as3.str(win[rows[0]][0]);
                if (a == win[rows[1]][1]) {
                    cells.push(this.rowCell(this._reels[0], rows[0] | 0), this.rowCell(this._reels[1], rows[1] | 0));
                    spots.push([0, rows[0]], [1, rows[1]], [2, rows[2], true]);
                    wormzer = wormzer || a == "wormzer";
                }
            }
        } else if (r.symbols[0] == r.symbols[1]) {
            cells.push(this.lineCell(this._reels[0]), this.lineCell(this._reels[1]));
            spots.push([0, 1], [1, 1], [2, 1, true]);
            wormzer = r.symbols[0] == "wormzer";
        }
        return { "cells": cells, "spots": spots, "extra": !cells.length ? 0 : (wormzer ? 80 : 46), "wormzer": wormzer };
    }

    private clearTease(): void {
        for (let c of as3.values(this._tease)) {
            c.filters = [];
        }
        this._tease = [];
        this._teaseSpots = [];
        if (this._teaseFx) {
            this._teaseFx.graphics.clear();
        }
    }

    /** The pair framed, pulsing; the last reel's cell it waits on dashed in. */
    private drawTease(t: int): void {
        let g: number = 0.75 + 0.25 * Math.sin(t / 3);
        this._teaseFx.graphics.clear();
        for (let sp of as3.values(this._teaseSpots)) {
            let x: number = SlotsGame.cellX(sp[0] | 0) - SlotsGame.REEL_W / 2 + 3;
            let y: number = SlotsGame.rowY(sp[1] | 0) - SlotsGame.ROW / 2 + 3;
            if (sp[2]) {
                // waiting: a fainter frame, brighter as it pulses
                this._teaseFx.graphics.lineStyle(3, this._teaseColor, 0.25 + 0.5 * g);
            } else {
                this._teaseFx.graphics.lineStyle(5, this._teaseColor, g);
                this._teaseFx.graphics.beginFill(this._teaseColor, 0.2 * g);
            }
            this._teaseFx.graphics.drawRoundRect(x, y, SlotsGame.REEL_W - 6, SlotsGame.ROW - 6, 12, 12);
            this._teaseFx.graphics.endFill();
        }
        this._teaseFx.filters = [new GlowFilter(this._teaseColor, 1, 12, 12, 2, 2)];
    }

    private onSpin(e: MouseEvent = null, favor: boolean = false): void {
        let bet: int = 0;
        let isFortune: boolean = false;
        if (this._spinning) {
            // SPIN (or the lever) while the reels turn: the result at once
            this.quickStop();
            return;
        }
        if (e != null && this._auto > 0) {
            this.stopAuto("Auto-spin stopped.");
        }
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
            this.stopAuto();
            return;
        }
        bet = favor ? st.favor.bet | 0 : this._bet.value;
        if (!favor && CASINO.credits() < bet) {
            this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            this.stopAuto();
            return;
        }
        SOUNDS.Play("click1");
        this._leverT = 16;
        if (!favor) {
            CASINO.setCredits((CASINO.credits() - bet) | 0);
        } else if (this._favorBtn) {
            this._favorBtn.visible = false;
        }
        this.clearWin();
        this._spinning = { "bet": bet, "r": null, "at": 0, "t": 0, "quick": false, "favor": favor, "extra": 0 };
        for (let reel of as3.values(this._reels)) {
            reel.state = "spin";
            reel.v = 0;
            reel.target = -1;
        }
        isFortune = this.fortune;
        let send: Function = favor ? (done: Function): void => {
            CASINO.favor(done);
        } : (done: Function): void => {
            if (isFortune) {
                CASINO.fortune(bet, done);
            } else {
                CASINO.slots(bet, done);
            }
        };
        send((r: any): void => {
            if (!this.parent || !this._spinning) {
                return;
            }
            if (r.error) {
                this.stopAuto();
                if (!favor) {
                    CASINO.setCredits((CASINO.credits() + bet) | 0);
                } else if (CASINO.state && CASINO.state.favor) {
                    // (today's is gone, or the Pit says no: asked again when the lobby next loads)
                    CASINO.state.favor.ready = false;
                }
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                for (let rl of as3.values(this._reels)) {
                    rl.state = "stopping";
                    rl.target = Math.ceil(Number(rl.o)) + 1;
                }
                this._spinning.r = { "error": true };
                return;
            }
            this._serverCredits = r.credits | 0;
            this._spinning.r = r;
            this._spinning.at = this._spinning.t;
            if (this._spinning.quick) {
                this.snapReels();
            } else {
                let cc: any = this.closeCall(r);
                this._spinning.extra = cc.extra;
                this._spinning.tease = cc;
            }
        });
    }

    private clearWin(): void {
        this._line.visible = false;
        for (let ln of as3.values(this._lines)) {
            ln.visible = false;
        }
        this.clearTease();
        for (let c of as3.values(this._winCells)) {
            c.filters = [];
        }
        this._winCells = [];
    }

    public tick(): void {
        let reel: any = null;
        let sp: any = this._spinning;
        if (sp) {
            sp.t++;
            let r: any = sp.r;
            for (reel of as3.values(this._reels)) {
                if (reel.state == "spin") {
                    reel.v = Math.min(0.5, Number(reel.v + 0.05));
                    reel.o += reel.v;
                    // the answer is in: each reel is told its stop in turn, left to right
                    let extra: int = reel.i == 2 ? sp.extra | 0 : 0;
                    if (r && (r.error || sp.t >= sp.at + 18 + reel.i * 14 + extra && sp.t >= 30 + reel.i * 14 + extra)) {
                        if (!r.error) {
                            let stop: int = r.stops[reel.i] | 0;
                            // (held back: it creeps in over more stops)
                            let from: int = (Math.ceil(Number(reel.o)) + (extra > 0 ? 6 : 3)) | 0;
                            reel.target = from + SlotsGame.wrap((stop - from) | 0);
                        }
                        reel.state = "stopping";
                        reel.slow = extra > 0;
                    }
                } else if (reel.state == "stopping") {
                    let left: number = reel.target - reel.o;
                    if (left > (reel.slow ? 4.5 : 2.5)) {
                        reel.o += reel.v;
                    } else {
                        reel.v = Math.max(reel.slow ? 0.014 : 0.02, left * (reel.slow ? 0.12 : 0.22));
                        reel.o += reel.v;
                    }
                    if (reel.target - reel.o < 0.01) {
                        reel.o = reel.target;
                        reel.state = "still";
                        reel.bounce = 9;
                        SOUNDS.Play("click1");
                        // the first two are in: a pair on a line lights up while the last spins on
                        if (reel.i == 1 && sp.tease && sp.tease.cells.length && !sp.quick) {
                            this._tease = as3.cast(sp.tease.cells, Array);
                            this._teaseSpots = as3.cast(sp.tease.spots, Array);
                            this._teaseColor = (sp.tease.wormzer ? 0xD090FF : 0xFFB030) >>> 0;
                            SOUNDS.Play(sp.tease.wormzer ? "lightningstart" : "iquestshow");
                        }
                    }
                }
                if (reel.bounce > 0) {
                    reel.bounce = reel.bounce * -0.6;
                    if (Math.abs(Number(reel.bounce)) < 0.5) {
                        reel.bounce = 0;
                    }
                } else if (reel.bounce < 0) {
                    reel.bounce = reel.bounce * -0.6;
                    if (Math.abs(Number(reel.bounce)) < 0.5) {
                        reel.bounce = 0;
                    }
                }
                this.drawReel(reel);
            }
            let allStill: boolean = true;
            for (reel of as3.values(this._reels)) {
                if (reel.state != "still") {
                    allStill = false;
                }
            }
            if (this._tease.length) {
                let tg: number = 0.6 + 0.4 * Math.sin(sp.t / 3);
                for (let tc of as3.values(this._tease)) {
                    tc.filters = [new GlowFilter(this._teaseColor, tg, 16, 16, 3, 2)];
                }
                this.drawTease(sp.t | 0);
            }
            if (allStill && r) {
                this._spinning = null;
                this.clearTease();
                if (!r.error) {
                    if (this.fortune) {
                        this.settleFortune(r);
                    } else {
                        this.settle(r);
                    }
                    this.afterSpin(r);
                }
            }
        } else {
            for (reel of as3.values(this._reels)) {
                if (reel.bounce != 0) {
                    reel.bounce = Math.abs(Number(reel.bounce)) < 0.5 ? 0 : reel.bounce * -0.6;
                    this.drawReel(reel);
                }
            }
        }
        // the lever
        if (this._leverT > 0) {
            this._leverT--;
            let u: number = this._leverT > 10 ? (16 - this._leverT) / 6 : this._leverT / 10;
            this._lever.scaleY = 1 - 0.65 * u;
        }
        // the win
        if (this._winCells.length) {
            this._pulse++;
            let g: number = 0.55 + 0.45 * Math.sin(this._pulse / 4);
            for (let c of as3.values(this._winCells)) {
                c.filters = [new GlowFilter(0xFFB030, g, 18, 18, 3, 2)];
            }
            this._line.alpha = g;
            for (let wl of as3.values(this._lines)) {
                wl.alpha = g;
            }
        }
        // the jackpot: Shiny rains
        if (this._celebrate > 0) {
            this._celebrate--;
            if (this._celebrate % 2 == 0 && this._celebrate > 40) {
                this.gem();
            }
            this._banner.alpha = Number(this._celebrate > 30 ? 1 : this._celebrate / 30);
            this._banner.scaleX = this._banner.scaleY = 1 + 0.04 * Math.sin(this._celebrate / 4);
        }
        let i: int = (this._rain.length - 1) | 0;
        while (i >= 0) {
            let d: any = this._rain[i];
            d.s.y += d.vy;
            d.s.rotation += d.vr;
            d.vy += 0.12;
            if (d.s.y > 420) {
                this._rainLayer.removeChild(as3.cast(d.s, DisplayObject));
                this._rain.splice(i, 1);
            }
            i--;
        }
        // SPIN stops the reels while they turn
        CasinoUI.relabel(this._spin, this._spinning ? "STOP" : "SPIN");
        CasinoUI.relabel(this._autoBtn, this._auto > 0 || (this._autoWait > 0) ? "STOP " + (this._auto + (this._spinning ? 1 : 0)) : "AUTO");
        if (!this._spinning && this._celebrate == 0) {
            this.showJackpot();
        }
        if (!this._spinning && this._auto > 0 && this._autoWait > 0) {
            if (--this._autoWait == 0) {
                this.nextAuto();
            }
        }
    }

    /** After a spin's result: the next auto-spin, unless it should stop there. */
    private afterSpin(r: any): void {
        if (this._auto <= 0) {
            return;
        }
        let bet: int = r.bet | 0;
        if (r.line == "jackpot") {
            this.stopAuto();
        } else if ((r.payout | 0) >= bet * CasinoWindow.BIG_WIN) {
            this.stopAuto();
        } else {
            this._autoWait = (r.payout | 0) > bet ? 36 : 14;
        }
    }

    private settle(r: any): void {
        let payout: int = r.payout | 0;
        let bet: int = r.bet | 0;
        CASINO.setCredits((CASINO.credits() + payout) | 0);
        if (this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        let favor: string = r.free ? "Moloch's Favor: " : "";
        if (r.line == "none") {
            this._win.message(favor + "Nothing on the line." + (r.free ? " Moloch smiles again tomorrow." : ""), CasinoUI.ASH);
            return;
        }
        this._line.visible = true;
        this._pulse = 0;
        let k: int = 0;
        while (k < 3) {
            if (r.line != "two_spurtz" || r.symbols[k] == "spurtz") {
                this._winCells.push(this.lineCell(this._reels[k]));
            }
            k++;
        }
        if (r.line == "jackpot") {
            this.jackpot(r.jackpot_won | 0);
        } else if (r.line == "two_spurtz") {
            this._win.message(favor + (r.free ? "two Spurtz, +" + CasinoUI.number(payout) + " Shiny" : "Two Spurtz: your " + CasinoUI.number(bet) + " Shiny back."), CasinoUI.GOLD);
            SOUNDS.Play("purchasepopup");
        } else {
            this._win.message(favor + "Three " + CASINO.MONSTER_NAMES[r.symbols[0]] + ": " + CasinoUI.mult(Number(r.multiplier)) + ", +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
            SOUNDS.Play(Number(r.multiplier) >= 25 ? "chaching" : "purchasepopup");
            this._win.bigWin(payout, bet);
        }
    }

    /** Korath's Fortune: every line that pays lit in its colour; what the spin paid in all. */
    private settleFortune(r: any): void {
        let payout: int = r.payout | 0;
        let bet: int = r.bet | 0;
        CASINO.setCredits((CASINO.credits() + payout) | 0);
        if (this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        let wins: any[] = as3.as(r.wins, Array);
        if (!wins || !wins.length) {
            this._win.message("Nothing on the lines.", CasinoUI.ASH);
            return;
        }
        let set: any[] = this.lineSet();
        this._pulse = 0;
        let best: any = null;
        for (let w of as3.values(wins)) {
            if (this._lines[w.line]) {
                this._lines[w.line].visible = true;
            }
            let rows: any[] = as3.cast(set[w.line], Array);
            let k: int = 0;
            while (k < 3) {
                if (w.kind != "two_spurtz" || w.symbols[k] == "spurtz") {
                    let c: Sprite = this.rowCell(this._reels[k], rows[k] | 0);
                    if (this._winCells.indexOf(c) < 0) {
                        this._winCells.push(c);
                    }
                }
                k++;
            }
            if (w.kind == "three" && (!best || Number(w.multiplier) > Number(best.multiplier))) {
                best = w;
            }
        }
        if (r.line == "jackpot") {
            this.jackpot(r.jackpot_won | 0);
            return;
        }
        let n: string = wins.length == 1 ? "1 line" : wins.length + " lines";
        if (payout > bet) {
            this._win.message(n + (best ? " (three " + this.symbolName(as3.str(best.symbols[0])) + ")" : "") + ": +" + CasinoUI.number(payout) + " Shiny on " + CasinoUI.number(bet), CasinoUI.WIN);
            SOUNDS.Play(payout >= bet * 5 ? "chaching" : "purchasepopup");
            this._win.bigWin(payout, bet);
        } else {
            // (a line of two Spurtz pays its fifth back: said as it is)
            this._win.message(n + ": " + CasinoUI.number(payout) + " of your " + CasinoUI.number(bet) + " Shiny back.", payout == bet ? CasinoUI.GOLD : CasinoUI.ASH);
        }
    }

    private jackpot(won: int): void {
        this._win.message("JACKPOT! Three " + this.symbolName("wormzer") + ": +" + CasinoUI.number(won) + " Shiny", 13668607);
        SOUNDS.Play("chaching");
        this._celebrate = 200;
        CasinoUI.removeAll(this._banner);
        let bg: Shape = as3.as(this._banner.addChild(new Shape()), Shape);
        bg.graphics.beginFill(3017288, 0.85);
        bg.graphics.lineStyle(3, 13668607, 1);
        bg.graphics.drawRoundRect(-200, -50, 400, 100, 24, 24);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xB060FF, 1, 30, 30, 2, 2)];
        this._banner.addChild(CasinoUI.at(CasinoUI.title("JACKPOT!", 40, 400), -200, -48));
        this._banner.addChild(CasinoUI.at(CasinoUI.label("+" + CasinoUI.number(won) + " SHINY", 22, 16777215, true, 400, TextFormatAlign.CENTER), -200, 8));
        this._banner.x = 350;
        this._banner.y = 200;
    }

    /** A Shiny gem falling. */
    private gem(): void {
        let s: Shape = as3.as(this._rainLayer.addChild(new Shape()), Shape);
        s.graphics.lineStyle(1, 16777215, 0.9);
        s.graphics.beginFill(8052991, 1);
        s.graphics.moveTo(0, -8);
        s.graphics.lineTo(7, -2);
        s.graphics.lineTo(0, 9);
        s.graphics.lineTo(-7, -2);
        s.graphics.lineTo(0, -8);
        s.graphics.endFill();
        s.filters = [new GlowFilter(0x7AE0FF, 0.8, 8, 8, 2, 1)];
        s.x = 220 + Math.random() * 480;
        s.y = -10;
        this._rain.push({ "s": s, "vy": 1 + Math.random() * 2, "vr": (Math.random() - 0.5) * 12 });
    }

    public get showing(): boolean {
        return this._spinning != null;
    }

    public dispose(): void {
        if (this._spinning && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        this._spinning = null;
        this._auto = 0;
        this._lever.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onSpin));
        this._cabinet.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onCabinetClick));
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
