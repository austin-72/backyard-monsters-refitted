import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ATTACK, BASE, BFOUNDATION, CREATURELOCKER, CellData, EnumYardType, GLOBAL, ImageCache, InstanceManager, IoOutpostsPopup, KEYS, MapRoomCell, PLEASEWAIT, POPUPSETTINGS, SOUNDS, SecNum, URLLoaderApi } from "@game";

/**
 * Inferno-only: Moloch's Gauntlet, the monthly event (server: services/events/gauntlet.ts).
 *
 * A ladder of Moloch yards fought from the main yard, not the map: its button sits with the top bar's
 * icons on the main yard (UI_TOP.ioGauntletButton). While it is closed the button says only when it
 * starts. The window ("The Descent") shows the 13 gates winding down into the fire, Moloch beside them,
 * and the gate chosen (the one to fight, at first) with its prize and the attempts left, before the
 * player attacks. Admin test mode plays a test ladder of its own, always open. The attack
 * is an ordinary Map Room 2 attack (wmattack) on the player's own copy of the yard, with the monsters
 * housed in the main yard and its flinger: the server sends the main yard as the map describes it
 * (`home`), and the game uses it the way an attack from the map uses a yard in range.
 *
 * During the attack a bar shows how much of the yard is destroyed and the line to reach. The attack's end
 * sends the player home, where the window opens again with what the attack did (the server's `last`).
 */
export class IoGauntlet extends ASObject {
    static {
        as3.fields(this, { _mc: null, _status: null, _gates: null, _selected: 0, _detail: null, _embers: null, _emberLayer: null, _moloch: null, _tick: 0 });
    }

    private static _open: IoGauntlet = null;

    /** The stage being attacked (0: not in a Gauntlet attack). */
    public static attackStage: int = 0;

    private static _winPercent: int = 90;

    /** Open the window once the main yard has loaded again (after a Gauntlet attack). */
    private static _showOnHome: boolean = false;

    /** The server's last result already shown (its time). */
    private static _shownResult: number = 0;

    private static _bar: Sprite = null;

    // ---- the window: "The Descent" (13 gates winding down into the fire, Moloch beside them)
    private static readonly W: int = 740;

    private static readonly H: int = 530;

    /** The gates' names, I to XIII. */
    private static readonly GATE_NAMES: any[] = ["The Ashen Gate", "The Bone Moat", "The Cinder Wall", "The Iron Maw", "The Weeping Spires", "The Sulfur Pits", "The Chained Host", "The Blood Forge", "The Howling Keep", "The Obsidian Crown", "The Pyre of Kings", "The Last Bastion", "Moloch's Throne"];

    private static readonly LORE: string = "Once each moon, Moloch throws open the gates of his Gauntlet. Thirteen strongholds stand between you and his hoard, each crueler than the last. Break them, and his treasures are yours.\n\nFalter thrice at any gate, and the fires mend its walls — and the prize behind it is lost to you until the next moon.";

    /** Where the gates sit: three to a row, winding down (left to right, then back). */
    private static readonly GATE_X: any[] = [-290, -185, -80];

    private static readonly GATE_TOP: int = -14;

    private static readonly GATE_ROW: int = 56;

    private static readonly GATE_R: int = 21;

    // ---- the bar during the attack
    private static _barFill: Shape = null;

    private static _barText: TextField = null;

    private static _ticks: int = 0;

    private static readonly BAR_W: int = 340;

    private static readonly BAR_H: int = 18;
    private _mc: MovieClip;
    private _status: any;
    private _gates: any[];
    private _selected: int;
    private _detail: Sprite;
    private _embers: any[];
    private _emberLayer: Sprite;
    private _moloch: Sprite;
    private _tick: int;

    public $ctor(status?: any): void {
        let moloch: Sprite = null;
        this._gates = [];
        this._embers = [];
        super.$ctor();
        this._status = status;
        IoGauntlet._winPercent = status.winPercent | 0 || 90;
        let stages: any[] = as3.as(status.stages, Array) || [];
        let left: int = (-((IoGauntlet.W * 0.5) | 0)) | 0;
        let top: int = (-((IoGauntlet.H * 0.5) | 0)) | 0;
        let result: string = this.resultText();

        this._mc = new MovieClip();
        this._mc.name = "ioGauntletWindow";
        this.drawBackground(left, top);

        // embers drifting up over everything but the text
        this._emberLayer = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._emberLayer.mouseEnabled = false;
        this._emberLayer.mouseChildren = false;
        let emberMask: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        emberMask.graphics.beginFill(16711680, 1);
        emberMask.graphics.drawRoundRect(left + 6, top + 6, IoGauntlet.W - 12, IoGauntlet.H - 12, 20, 20);
        emberMask.graphics.endFill();
        this._emberLayer.mask = emberMask;
        for (let e: int = 0; e < 34; e++) {
            this._embers.push(this.newEmber(true));
        }

        // Moloch, looming on the right
        this._moloch = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._moloch.x = 210;
        this._moloch.y = -60;
        this._moloch.mouseEnabled = false;
        moloch = this._moloch;
        ImageCache.GetImageWithCallBack("popups/tribe_moloch.png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let picture: Bitmap = new Bitmap(bmd);
            picture.smoothing = true;
            picture.height = 250;
            picture.scaleX = picture.scaleY;
            picture.x = -((picture.width * 0.5) | 0);
            picture.y = -((picture.height * 0.5) | 0);
            moloch.addChild(picture);
        });

        // the title, and how long the gates stay open
        let title: TextField = as3.as(this._mc.addChild(IoGauntlet.label("MOLOCH'S GAUNTLET", 28, 16766346, false, IoGauntlet.W, TextFormatAlign.CENTER, "Groboldov")), TextField);
        title.embedFonts = true;
        title.height = 40;
        title.filters = [new GlowFilter(0xFF4A00, 0.9, 12, 12, 2, 2), new DropShadowFilter(3, 45, 0, 0.8, 4, 4, 1, 2)];
        title.x = left;
        title.y = top + 16;
        let when: TextField = as3.as(this._mc.addChild(IoGauntlet.label(this.whenText(), 12, 15771752, false, IoGauntlet.W, TextFormatAlign.CENTER)), TextField);
        when.name = "ioGauntletWhen";
        when.filters = [new GlowFilter(0, 1, 2, 2, 4, 1)];
        when.x = left;
        when.y = top + 54;
        let y: int = (top + 78) | 0;

        // what the last attack did (once)
        if (result) {
            let banner: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
            let won: boolean = Boolean(this._status.last && this._status.last.result == "won");
            banner.graphics.lineStyle(1, (won ? 0xE2B227 : 0x8A2A1A) >>> 0, 1);
            banner.graphics.beginFill((won ? 0x3A2206 : 0x2A0806) >>> 0, 0.92);
            banner.graphics.drawRoundRect(0, 0, IoGauntlet.W - 60, 28, 10, 10);
            banner.graphics.endFill();
            banner.x = left + 30;
            banner.y = y;
            let bannerText: TextField = as3.as(banner.addChild(IoGauntlet.label("", 12, (won ? 0xFFE08A : 0xF0B090) >>> 0, false, (IoGauntlet.W - 76) | 0, TextFormatAlign.CENTER)), TextField);
            bannerText.htmlText = result;
            bannerText.x = 8;
            bannerText.y = 5;
            y += 34;
            IoGauntlet._shownResult = Number(this._status.last.at);
        }

        // the legend
        let lore: TextField = as3.as(this._mc.addChild(IoGauntlet.label("", 12, 15258288, false, 400, TextFormatAlign.LEFT, "Georgia", true)), TextField);
        lore.name = "ioGauntletLore";
        lore.multiline = true;
        lore.wordWrap = true;
        lore.text = IoGauntlet.LORE;
        lore.height = 118;
        lore.x = left + 30;
        lore.y = y + 2;
        let numbers: TextField = as3.as(this._mc.addChild(IoGauntlet.label(IoGauntlet._winPercent + "% destroyed breaks a gate  ·  " + (status.attempts | 0) + " attempts at each  ·  the gates rise anew on the 1st", 10, 12618330, false, 400, TextFormatAlign.LEFT)), TextField);
        numbers.name = "ioGauntletNumbers";
        numbers.x = lore.x;
        numbers.y = lore.y + lore.textHeight + 10;

        // the gates, winding down into the fire
        this.drawPath(stages);
        for (let i: int = 0; i < stages.length; i++) {
            let gate: Sprite = this.gateSprite(stages[i], i);
            this._gates.push(gate);
            this._mc.addChild(gate);
        }

        // the chosen gate: the one to fight (or the last)
        this._detail = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._detail.x = 72;
        this._detail.y = 72;
        this.select((Math.min(status.current | 0, stages.length) - 1) | 0);

        // close
        let x: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        x.name = "ioGauntletClose";
        x.buttonMode = true;
        x.mouseChildren = false;
        x.graphics.lineStyle(2, 14708778, 1);
        x.graphics.beginFill(2755078, 1);
        x.graphics.drawCircle(0, 0, 14);
        x.graphics.endFill();
        x.graphics.lineStyle(3, 16766346, 1);
        x.graphics.moveTo(-5, -5);
        x.graphics.lineTo(5, 5);
        x.graphics.moveTo(5, -5);
        x.graphics.lineTo(-5, 5);
        x.x = -left - 24;
        x.y = top + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    // ---- the button's state (flag io_gauntlet)
    /** {open, closesAt, opensAt, stage, stages} or null. */
    public static flag(): any {
        try {
            return GLOBAL._flags && GLOBAL._flags.io_gauntlet ? JSON.parse(String(GLOBAL._flags.io_gauntlet)) : null;
        } catch (e) {
        }
        return null;
    }

    /** A Gauntlet yard's baseid: 15 digits starting with 9 (server: gauntletBaseId). */
    public static isGauntletBase(baseid: number): boolean {
        return baseid >= 900000000000000 && baseid < 1000000000000000;
    }

    /** In an attack on a Gauntlet yard now. */
    public static inAttack(): boolean {
        return IoGauntlet.attackStage > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK) && IoGauntlet.isGauntletBase(BASE._loadedBaseID);
    }

    // ---- the window
    /** Opens the window (loads the ladder from the server first). */
    public static Show(e: MouseEvent = null): void {
        if (IoGauntlet._open && (!IoGauntlet._open._mc || !IoGauntlet._open._mc.stage)) {
            IoGauntlet._open = null;
        }
        if (IoGauntlet._open) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message("Not while your yard is being attacked.");
            return;
        }
        if (e) {
            SOUNDS.Play("click1");
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "gauntlet/status", [["v", "1"]], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error) {
                GLOBAL.Message(response && response.error ? String(response.error) : "Moloch's Gauntlet could not be loaded. Please try again.");
                return;
            }
            if (!response.enabled) {
                GLOBAL.Message("Moloch's Gauntlet is not running on this server.");
                return;
            }
            if (BASE.ioAttackRunning() || IoGauntlet._open || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (!response.open && !response.test) {
                // Not running now: when it starts, and nothing else.
                GLOBAL.Message(IoGauntlet.startsText(response, Number(Number(response.now) || GLOBAL.Timestamp())));
                return;
            }
            IoGauntlet._open = new IoGauntlet(response);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message("Moloch's Gauntlet could not be loaded. Please try again.");
        });
    }

    /** The main yard loaded (BASE): after a Gauntlet attack, the window again with the result. */
    public static AfterHome(): void {
        IoGauntlet.attackStage = 0;
        IoGauntlet.removeBar();
        if (IoGauntlet._showOnHome && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
            IoGauntlet._showOnHome = false;
            IoGauntlet.Show();
        }
    }

    /** Obsidian with a molten rim, cracks of lava, and Moloch's red glow. */
    private drawBackground(left: int, top: int): void {
        let m: Matrix = new Matrix();
        let bg: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m.createGradientBox(IoGauntlet.W, IoGauntlet.H, Math.PI / 2, left, top);
        bg.graphics.lineStyle(4, 656130, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x2C0F09, 0x160605, 0x240804], [1, 1, 1], [0, 150, 255], m);
        bg.graphics.drawRoundRect(left, top, IoGauntlet.W, IoGauntlet.H, 26, 26);
        bg.graphics.endFill();
        // Moloch's glow
        let glow: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m = new Matrix();
        m.createGradientBox(380, 380, 0, 210 - 190, -70 - 190);
        glow.graphics.beginGradientFill(GradientType.RADIAL, [0xFF3A0A, 0xB01A04, 0x400000], [0.5, 0.22, 0], [0, 120, 255], m);
        glow.graphics.drawCircle(210, -70, 190);
        glow.graphics.endFill();
        // the chasm the gates wind down into
        let chasm: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m = new Matrix();
        m.createGradientBox(420, 330, Math.PI / 2, left + 22, 0);
        chasm.graphics.beginGradientFill(GradientType.LINEAR, [0x000000, 0x3A0A02], [0.35, 0.55], [0, 255], m);
        chasm.graphics.drawRoundRect(left + 22, -44, 420, 296, 18, 18);
        chasm.graphics.endFill();
        // lava cracks
        let cracks: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        cracks.graphics.lineStyle(2, 16738842, 0.55);
        this.crack(cracks, left + 14, top + IoGauntlet.H - 14, 6, -1);
        this.crack(cracks, -left - 40, top + IoGauntlet.H - 20, 6, -1);
        this.crack(cracks, left + 12, top + 34, 4, 1);
        this.crack(cracks, -left - 14, top + 120, 5, 1);
        cracks.filters = [new GlowFilter(0xFF4A00, 0.8, 8, 8, 2, 2)];
        // the molten rim
        let rim: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        rim.graphics.lineStyle(2, 13784604, 1);
        rim.graphics.drawRoundRect(left + 6, top + 6, IoGauntlet.W - 12, IoGauntlet.H - 12, 20, 20);
        rim.filters = [new GlowFilter(0xFF4A00, 0.75, 10, 10, 2, 2)];
    }

    /** A jagged crack from a point, going up (-1) or across (1). */
    private crack(g: Shape, x: number, y: number, steps: int, across: int): void {
        g.graphics.moveTo(x, y);
        for (let s: int = 0; s < steps; s++) {
            x = Number(x + (across > 0 ? (x < 0 ? 10 : -10) + (s % 2 == 0 ? 4 : -3) : (s % 2 == 0 ? 7 : -5)));
            y = Number(y + (across > 0 ? (s % 2 == 0 ? 6 : -4) : -9 - (s % 3) * 2));
            g.graphics.lineTo(x, y);
        }
    }

    private static gatePos(index: int): any[] {
        let row: int = (index / 3) | 0;
        let col: int = (index % 3) | 0;
        if (row % 2 == 1) {
            col = (2 - col) | 0;
        }
        return [IoGauntlet.GATE_X[col], IoGauntlet.GATE_TOP + row * IoGauntlet.GATE_ROW];
    }

    /** The lava path from gate to gate: bright where it has been walked, dim ahead. */
    private drawPath(stages: any[]): void {
        let path: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        let lit: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        let current: int = this._status.current | 0;
        for (let i: int = 0; i < stages.length - 1; i++) {
            let a: any[] = IoGauntlet.gatePos(i);
            let b: any[] = IoGauntlet.gatePos((i + 1) | 0);
            let walked: boolean = i + 2 <= current;
            for (let layer of as3.values([[path, 9, 0x1A0402, 1], [walked ? lit : path, 3, walked ? 0xFFB040 : 0x6A2410, 1]])) {
                let s: Shape = as3.cast(layer[0], Shape);
                s.graphics.lineStyle(Number(layer[1]), layer[2] >>> 0, Number(layer[3]));
                s.graphics.moveTo(Number(a[0]), Number(a[1]));
                if (a[1] == b[1]) {
                    s.graphics.lineTo(Number(b[0]), Number(b[1]));
                } else {
                    let out: int = a[0] > -185 ? 52 : -52;
                    s.graphics.curveTo(Number(a[0] + out), (a[1] + b[1]) * 0.5, Number(b[0]), Number(b[1]));
                }
            }
        }
        lit.filters = [new GlowFilter(0xFF6A00, 0.9, 8, 8, 2, 2)];
    }

    private static roman(n: int): string {
        let values: any[] = [10, 9, 5, 4, 1];
        let letters: any[] = ["X", "IX", "V", "IV", "I"];
        let out: string = "";
        for (let i: int = 0; i < values.length; i++) {
            while (n >= values[i]) {
                out += letters[i];
                n = (n - values[i]) | 0;
            }
        }
        return out;
    }

    /** One gate: sealed (dark), the one to fight (burning), or broken (cracked; its prize claimed or lost). */
    private gateSprite(stage: any, index: int): Sprite {
        let gate: Sprite = null;
        let self: IoGauntlet = null;
        gate = new Sprite();
        let pos: any[] = IoGauntlet.gatePos(index);
        let n: int = stage.stage | 0;
        let last: boolean = index == (as3.as(this._status.stages, Array)).length - 1;
        let r: int = (last ? IoGauntlet.GATE_R + 6 : IoGauntlet.GATE_R) | 0;
        let current: boolean = n == (this._status.current | 0);
        let m: Matrix = new Matrix();
        gate.name = "ioGate" + n;
        gate.x = Number(pos[0]);
        gate.y = Number(pos[1]);
        gate.buttonMode = true;
        gate.mouseChildren = false;
        let g: Shape = as3.as(gate.addChild(new Shape()), Shape);
        if (last) {
            // the throne: a crown of spikes
            g.graphics.beginFill((current ? 0xFFB040 : (stage.won ? 0x8A6A4A : 0x5A1A0C)) >>> 0, 1);
            for (let k: int = 0; k < 10; k++) {
                let an: number = k * Math.PI / 5;
                g.graphics.moveTo(Math.cos(an - 0.16) * (r - 2), Math.sin(an - 0.16) * (r - 2));
                g.graphics.lineTo(Math.cos(an) * (r + 9), Math.sin(an) * (r + 9));
                g.graphics.lineTo(Math.cos(an + 0.16) * (r - 2), Math.sin(an + 0.16) * (r - 2));
            }
            g.graphics.endFill();
        }
        if (current && !stage.won) {
            m.createGradientBox(r * 2, r * 2, 0, -r, -r);
            g.graphics.lineStyle(2, 16769184, 1);
            g.graphics.beginGradientFill(GradientType.RADIAL, [0xFFD27A, 0xE0501C, 0x6A1406], [1, 1, 1], [0, 140, 255], m);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            g.filters = [new GlowFilter(0xFF6A00, 0.9, 14, 14, 2, 2)];
        } else if (stage.won) {
            g.graphics.lineStyle(2, 9071178, 1);
            g.graphics.beginFill(2759190, 1);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            // cracked through
            g.graphics.lineStyle(2, (stage.paid ? 0xFFB040 : 0x7A5A5A) >>> 0, 1);
            for (let c of as3.values([[-0.2, 1.0], [2.1, 0.9], [3.9, 1.0]])) {
                g.graphics.moveTo(0, 0);
                g.graphics.lineTo(Math.cos(Number(c[0])) * r * 0.45 + 3, Math.sin(Number(c[0])) * r * 0.45 - 2);
                g.graphics.lineTo(Math.cos(Number(c[0] + 0.3)) * r * c[1], Math.sin(Number(c[0] + 0.3)) * r * c[1]);
            }
        } else {
            g.graphics.lineStyle(2, 4858904, 1);
            g.graphics.beginFill(1707536, 1);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            // a ring of runes, dark until reached
            g.graphics.lineStyle(1, 8010272, 0.8);
            for (let q: int = 0; q < 8; q++) {
                let a0: number = q * Math.PI / 4 + 0.15;
                g.graphics.moveTo(Math.cos(a0) * (r - 5), Math.sin(a0) * (r - 5));
                g.graphics.lineTo(Math.cos(a0 + 0.45) * (r - 5), Math.sin(a0 + 0.45) * (r - 5));
            }
        }
        let numeral: TextField = as3.as(gate.addChild(IoGauntlet.label(IoGauntlet.roman(n), last ? 15 : 13, (current && !stage.won ? 0xFFFFFF : (stage.won ? 0xC8A070 : 0x8A6048)) >>> 0, false, (r * 2 + 10) | 0, TextFormatAlign.CENTER, "Groboldov")), TextField);
        numeral.embedFonts = true;
        numeral.x = -r - 5;
        numeral.y = -((numeral.textHeight * 0.5) | 0) - 3;
        if (current && !stage.won) {
            numeral.filters = [new GlowFilter(0x6A1406, 1, 3, 3, 4, 1)];
        }
        // its prize: claimed (gold) or lost (red)
        if (stage.won || stage.lost) {
            let mark: Shape = as3.as(gate.addChild(new Shape()), Shape);
            let claimed: boolean = Boolean(stage.won && stage.paid);
            mark.graphics.lineStyle(1, 1705988, 1);
            mark.graphics.beginFill((claimed ? 0xE2B227 : 0xB0281A) >>> 0, 1);
            mark.graphics.drawCircle(0, 0, 7);
            mark.graphics.endFill();
            mark.graphics.lineStyle(2, 16777215, 1);
            if (claimed) {
                mark.graphics.moveTo(-3, 0);
                mark.graphics.lineTo(-1, 3);
                mark.graphics.lineTo(3, -3);
            } else {
                mark.graphics.moveTo(-3, -3);
                mark.graphics.lineTo(3, 3);
                mark.graphics.moveTo(3, -3);
                mark.graphics.lineTo(-3, 3);
            }
            mark.x = r * 0.72;
            mark.y = r * 0.72;
        }
        if (last) {
            let prize: TextField = as3.as(gate.addChild(IoGauntlet.label(((stage.reward ? stage.reward.shiny : 0) | 0) + " shiny", 11, 16766346, true, 90, TextFormatAlign.LEFT)), TextField);
            prize.x = r + 14;
            prize.y = -9;
            prize.filters = [new GlowFilter(0xFF4A00, 0.8, 6, 6, 2, 1)];
        }
        let ring: Shape = as3.as(gate.addChild(new Shape()), Shape);
        ring.name = "ring";
        ring.graphics.lineStyle(2, 16773312, 0.9);
        ring.graphics.drawCircle(0, 0, r + 5);
        ring.visible = false;
        self = this;
        gate.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            self.select(index);
        });
        gate.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            gate.scaleX = gate.scaleY = 1.08;
        });
        gate.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            gate.scaleX = gate.scaleY = 1;
        });
        return gate;
    }

    /** Shows a gate in the panel under Moloch: its name, level, prize, and what is left of it. */
    private select(index: int): void {
        let stage: any = null;
        let stages: any[] = as3.as(this._status.stages, Array) || [];
        if (index < 0 || index >= stages.length) {
            return;
        }
        this._selected = index;
        for (let i: int = 0; i < this._gates.length; i++) {
            (as3.as(this._gates[i], Sprite)).getChildByName("ring").visible = i == index;
        }
        stage = stages[index];
        let n: int = stage.stage | 0;
        let current: boolean = n == (this._status.current | 0) && !this._status.finished;
        let d: Sprite = this._detail;
        let PW: int = 282;
        let PH: int = 184;
        let m: Matrix = new Matrix();
        while (d.numChildren > 0) {
            d.removeChildAt(0);
        }
        d.graphics.clear();
        m.createGradientBox(PW, PH, Math.PI / 2, 0, 0);
        d.graphics.lineStyle(2, 11552794, 1);
        d.graphics.beginGradientFill(GradientType.LINEAR, [0x2A0C06, 0x120404], [0.95, 0.95], [0, 255], m);
        d.graphics.drawRoundRect(0, 0, PW, PH, 14, 14);
        d.graphics.endFill();
        d.filters = [new GlowFilter(0xFF4A00, 0.45, 10, 10, 2, 2)];

        let name: TextField = as3.as(d.addChild(IoGauntlet.label("Gate " + IoGauntlet.roman(n) + ": " + IoGauntlet.GATE_NAMES[Math.min(n, IoGauntlet.GATE_NAMES.length) - 1], 15, 16766346, false, (PW - 16) | 0, TextFormatAlign.LEFT, "Groboldov")), TextField);
        name.embedFonts = true;
        name.name = "ioGateName";
        name.height = 24;
        name.x = 10;
        name.y = 8;
        name.filters = [new GlowFilter(0xFF4A00, 0.7, 6, 6, 2, 1)];
        let level: TextField = as3.as(d.addChild(IoGauntlet.label("Level " + (stage.level | 0) + ((stage.stage | 0) == stages.length ? "  ·  Moloch himself" : ""), 11, 12618330, false, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
        level.x = 12;
        level.y = 32;
        let prize: TextField = as3.as(d.addChild(IoGauntlet.label("", 11, 15785152, false, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
        prize.name = "ioGatePrize";
        prize.multiline = true;
        prize.height = 34;
        prize.htmlText = "<b>Prize:</b> " + IoGauntlet.rewardText(stage.reward);
        prize.wordWrap = true;
        prize.x = 12;
        prize.y = 50;

        let state: TextField = as3.as(d.addChild(IoGauntlet.label("", 12, 16777215, true, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
        state.name = "ioGateState";
        state.x = 12;
        state.y = 88;
        let left: int = stage.attemptsLeft | 0;
        if (stage.won) {
            state.htmlText = stage.paid ? "<font color=\"#E2B227\">Broken · its prize is yours</font>" : "<font color=\"#C87A6A\">Broken · its prize was lost</font>";
        } else if (!current) {
            state.htmlText = "<font color=\"#8A6A5A\">Sealed · break gate " + IoGauntlet.roman(this._status.current | 0) + " first</font>";
        } else {
            // attempts left, as flames
            for (let p: int = 0; p < (this._status.attempts | 0); p++) {
                let pip: Shape = as3.as(d.addChild(new Shape()), Shape);
                pip.graphics.lineStyle(1, 3805188, 1);
                pip.graphics.beginFill((p < left ? 0xFF8A2A : 0x3A2420) >>> 0, 1);
                pip.graphics.drawCircle(0, 0, 6);
                pip.graphics.endFill();
                if (p < left) {
                    pip.filters = [new GlowFilter(0xFF6A00, 0.9, 6, 6, 2, 1)];
                }
                pip.x = 19 + p * 17;
                pip.y = 98;
            }
            state.x = 12 + (this._status.attempts | 0) * 17 + 4;
            let lost: string = stage.lost ? " · <font color=\"#E0705A\">prize lost</font>" : (stage.paid ? " · <font color=\"#C8A070\">prize already claimed</font>" : "");
            state.htmlText = left + (left == 1 ? " attempt left" : " attempts left") + lost;
            if ((stage.damage | 0) > 0) {
                let bar: Shape = as3.as(d.addChild(new Shape()), Shape);
                bar.graphics.beginFill(2757648, 1);
                bar.graphics.drawRect(0, 0, PW - 24, 6);
                bar.graphics.endFill();
                bar.graphics.beginFill(14700572, 1);
                bar.graphics.drawRect(0, 0, (PW - 24) * Math.min(100, stage.damage | 0) / 100, 6);
                bar.graphics.endFill();
                bar.graphics.lineStyle(1, 16777215, 1);
                bar.graphics.moveTo((PW - 24) * IoGauntlet._winPercent / 100, -2);
                bar.graphics.lineTo((PW - 24) * IoGauntlet._winPercent / 100, 8);
                bar.x = 12;
                bar.y = 112;
                let broken: TextField = as3.as(d.addChild(IoGauntlet.label((stage.damage | 0) + "% of its walls already broken", 10, 12618330, false, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
                broken.x = 12;
                broken.y = 118;
            }
        }

        let action: Sprite = null;
        if (current) {
            action = IoGauntlet.moltenButton("ENTER THE GATE", 210, 36, (e: MouseEvent): void => {
                this.confirmAttack(stage);
            }, Boolean(this._status.open));
        } else if (this._status.finished && index == stages.length - 1) {
            let done: TextField = as3.as(d.addChild(IoGauntlet.label("You have conquered the Gauntlet this moon.", 12, 16766346, true, (PW - 20) | 0, TextFormatAlign.CENTER)), TextField);
            done.x = 10;
            done.y = PH - 36;
        }
        if (action) {
            action.name = "ioEnterGate";
            action.x = ((PW - 210) * 0.5) | 0;
            action.y = PH - 46;
            d.addChild(action);
        }
    }

    /** A button of molten gold. */
    private static moltenButton(text: string, width: int, height: int, onClick: Function, enabled: boolean): Sprite {
        let b: Sprite = null;
        let m: Matrix = null;
        let draw: Function = null;
        b = new Sprite();
        m = new Matrix();
        b.buttonMode = enabled;
        b.mouseChildren = false;
        m.createGradientBox(width, height, Math.PI / 2, 0, 0);
        draw = (hot: boolean): void => {
            b.graphics.clear();
            b.graphics.lineStyle(2, (enabled ? 0xFFE0A0 : 0x6A5A50) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, enabled ? (hot ? [0xFFC060, 0xE0501C, 0x9A2008] : [0xF0A040, 0xC8401A, 0x7A1806]) : [0x5A4A44, 0x3A2E2A, 0x2A2220], [1, 1, 1], [0, 140, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
            b.graphics.endFill();
        };
        draw(false);
        let t: TextField = as3.as(b.addChild(IoGauntlet.label(text, 16, (enabled ? 0xFFFFFF : 0xA09088) >>> 0, false, width, TextFormatAlign.CENTER, "Groboldov")), TextField);
        t.embedFonts = true;
        t.height = 26;
        t.y = ((height - 24) / 2) | 0;
        t.filters = [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)];
        if (enabled) {
            b.filters = [new GlowFilter(0xFF6A00, 0.7, 10, 10, 2, 2)];
            b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                draw(true);
            });
            b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                draw(false);
            });
            b.addEventListener(MouseEvent.CLICK, onClick);
        }
        return b;
    }

    private newEmber(anywhere: boolean): any {
        let s: Shape = as3.as(this._emberLayer.addChild(new Shape()), Shape);
        let colors: any[] = [0xFFB040, 0xFF6A1A, 0xFFE08A, 0xFF4A10];
        s.graphics.beginFill(colors[(Math.random() * colors.length) | 0] >>> 0, 1);
        s.graphics.drawCircle(0, 0, 0.8 + Math.random() * 1.8);
        s.graphics.endFill();
        s.x = -IoGauntlet.W * 0.5 + Math.random() * IoGauntlet.W;
        s.y = anywhere ? -IoGauntlet.H * 0.5 + Math.random() * IoGauntlet.H : IoGauntlet.H * 0.5 + Math.random() * 20;
        return { "s": s, "vy": 0.35 + Math.random() * 0.9, "sway": Math.random() * 6.28, "life": 0 };
    }

    /** Embers rise, the gate to fight burns brighter and dimmer, Moloch breathes. */
    private animate(e: Event): void {
        if (!this._mc || !this._mc.stage) {
            return;
        }
        this._tick++;
        for (let ember of as3.values(this._embers)) {
            let s: Shape = as3.cast(ember.s, Shape);
            ember.sway += 0.05;
            s.y -= ember.vy;
            s.x += Math.sin(Number(ember.sway)) * 0.35;
            s.alpha = Math.max(0, Math.min(1, (s.y + IoGauntlet.H * 0.5) / (IoGauntlet.H * 0.5)));
            if (s.y < -IoGauntlet.H * 0.5 - 4) {
                s.x = -IoGauntlet.W * 0.5 + Math.random() * IoGauntlet.W;
                s.y = IoGauntlet.H * 0.5 + Math.random() * 20;
            }
        }
        let pulse: number = 0.5 + 0.5 * Math.sin(this._tick * 0.11);
        let current: int = ((this._status.current | 0) - 1) | 0;
        if (current >= 0 && current < this._gates.length && !this._status.finished) {
            let burning: Shape = as3.as((as3.as(this._gates[current], Sprite)).getChildAt(0), Shape);
            burning.filters = [new GlowFilter(0xFF6A00, 0.6 + 0.4 * pulse, 10 + 10 * pulse, 10 + 10 * pulse, 2, 2)];
        }
        if (this._moloch && this._tick % 2 == 0) {
            this._moloch.scaleX = this._moloch.scaleY = 1 + 0.015 * Math.sin(this._tick * 0.05);
            this._moloch.filters = [new GlowFilter(0xFF2A00, 0.35 + 0.25 * pulse, 16, 16, 2, 2)];
        }
    }

    /** "The gates close in 5d 3h" (or when they open). */
    private whenText(): string {
        let s: any = this._status;
        let now: number = Number(Number(s.now) || GLOBAL.Timestamp());
        if (s.test) {
            return "Admin test ladder · always open · nothing is paid";
        }
        if (s.finished) {
            return "You have conquered the Gauntlet this moon." + (s.open && s.closesAt ? " The gates close in " + IoOutpostsPopup.duration((s.closesAt - now) | 0) + "." : "");
        }
        if (s.open) {
            return s.closesAt ? "The gates close in " + IoOutpostsPopup.duration((s.closesAt - now) | 0) : "The gates are open";
        }
        return IoGauntlet.startsText(s, now);
    }

    /** "Moloch's Gauntlet starts in 4d 2h." */
    private static startsText(s: any, now: number): string {
        return "Moloch's Gauntlet starts in " + (s && s.opensAt ? IoOutpostsPopup.duration(Math.max(60, (s.opensAt - now) | 0) | 0) : "a few days") + ".";
    }

    /** What the last attack did, if it hasn't been shown yet. */
    private resultText(): string {
        let last: any = this._status.last;
        if (!last || Number(last.at) <= IoGauntlet._shownResult) {
            return "";
        }
        let gate: string = "Gate " + IoGauntlet.roman(last.stage | 0);
        if (last.result == "won") {
            if (last.reward) {
                return "<b>" + gate + " falls!</b> " + (last.test ? "Test ladder: it would pay " : "You claim ") + IoGauntlet.rewardText(last.reward) + ".";
            }
            if (last.already) {
                return "<b>" + gate + " falls.</b> Its prize was already claimed this moon.";
            }
            return "<b>" + gate + " falls,</b> but its prize was lost. The next gate awaits.";
        }
        if (last.result == "healed") {
            return "<b>" + gate + " held for every attempt.</b> The fires mended its walls, and its prize is lost.";
        }
        let left: int = last.attemptsLeft | 0;
        return "<b>" + gate + " holds.</b> " + left + (left == 1 ? " attempt" : " attempts") + " left" + (last.lost ? "." : " before the fires mend its walls.");
    }

    /** "5 shiny, 2.3M bone, coal and sulfur, 1.2M magma". */
    private static rewardText(reward: any): string {
        if (!reward) {
            return "";
        }
        let same: boolean = reward.r1 == reward.r2 && reward.r2 == reward.r3;
        let resources: string = same ? IoGauntlet.short(Number(reward.r1)) + " bone, coal and sulfur" : IoGauntlet.short(Number(reward.r1)) + " bone, " + IoGauntlet.short(Number(reward.r2)) + " coal, " + IoGauntlet.short(Number(reward.r3)) + " sulfur";
        return (reward.shiny | 0) + " shiny, " + resources + ", " + IoGauntlet.short(Number(reward.r4)) + " magma";
    }

    /** 2300000: "2.3M". */
    private static short(amount: number): string {
        if (amount >= 1000000) {
            return String(Math.round(amount / 100000) / 10) + "M";
        }
        if (amount >= 1000) {
            return String(Math.round(amount / 100) / 10) + "k";
        }
        return String(amount | 0);
    }

    /** Before attacking: the last attempt with a prize still on says what failing it means. */
    private confirmAttack(stage: any): void {
        if (!this._status.open) {
            GLOBAL.Message(IoGauntlet.startsText(this._status, Number(Number(this._status.now) || GLOBAL.Timestamp())));
            return;
        }
        let left: int = stage.attemptsLeft | 0;
        if (left == 1 && !stage.lost && !stage.paid) {
            GLOBAL.Message("<b>Last attempt at Gate " + IoGauntlet.roman(stage.stage | 0) + ".</b><br><br>If it fails, the fires mend its walls and its prize (" + IoGauntlet.rewardText(stage.reward) + ") is lost for this moon.", "Attack", (): void => {
                this.attack(stage);
            });
            return;
        }
        this.attack(stage);
    }

    /**
     * Attacks the stage's yard from the main yard: the main yard as a map cell (the server's `home`) is the
     * one yard in range, so its housed monsters and its flinger are what the attack has, and what the
     * attack's saves take the used monsters from (BASE.getMR2MonsterUpdateSaveData).
     */
    private attack(stage: any): void {
        let home: any = this._status.home;
        let cell: MapRoomCell = null;
        let monsterType: string = null;
        let any: boolean = false;
        if (!home) {
            GLOBAL.Message("Your main yard is not on the world map yet, so it can't attack from there.");
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message("Not while your yard is being attacked.");
            return;
        }
        cell = new MapRoomCell();
        cell.X = home.x | 0;
        cell.Y = home.y | 0;
        cell.Setup(home);
        // The yard attacks itself only (range 0); a yard without a flinger still sends its monsters, and
        // the attack's saves still take the used ones off it (they skip a cell with no flinger range).
        if (!cell._flingerRange || cell._flingerRange.Get() < 1) {
            cell._flingerRange = new SecNum(1);
        }
        ATTACK._curCreaturesAvailable = new Array();
        for (monsterType in cell.monsters) {
            let count: int = cell.monsters[monsterType].Get() | 0;
            if (count > 0) {
                ATTACK._curCreaturesAvailable[monsterType] = count;
                any = true;
            }
        }
        for (let g: int = 0; g < GLOBAL._playerGuardianData.length; g++) {
            if (as3.vget(GLOBAL._playerGuardianData, g) && as3.vget(GLOBAL._playerGuardianData, g).hp.Get() > 0) {
                any = true;
            }
        }
        if (GLOBAL.ioTestMode()) {
            ATTACK._curCreaturesAvailable = new Array();
            for (const $value of as3.values(CREATURELOCKER.ioTestMonsterIds())) {
                monsterType = as3.str($value);
                ATTACK._curCreaturesAvailable[monsterType] = 999;
            }
            any = true;
        }
        if (!any) {
            GLOBAL.Message("You have no monsters in your main yard to attack with. House some there first.");
            return;
        }
        GLOBAL._attackerMapResources = { "r1": GLOBAL._resources.r1.Get(), "r2": GLOBAL._resources.r2.Get(), "r3": GLOBAL._resources.r3.Get(), "catapult": new SecNum(Number(GLOBAL._playerCatapultLevel ? GLOBAL._playerCatapultLevel.Get() : 0)), "flinger": new SecNum(Number(cell._flingerLevel ? cell._flingerLevel.Get() : 0)) };
        GLOBAL._attackerCellsInRange = Vector.from([new CellData(cell, 0)], CellData);
        GLOBAL._currentCell = null;
        IoGauntlet.attackStage = stage.stage | 0;
        IoGauntlet._showOnHome = true;
        this.close();
        IoGauntlet.watchBar();
        BASE.LoadBase(null, 0, Number(stage.baseid), "wmattack", false, EnumYardType.MAIN_YARD);
    }

    /** The attack is over (popup_attackend): home, where the window opens with the result. */
    public static ReturnHome(): void {
        IoGauntlet._showOnHome = true;
        IoGauntlet.attackStage = 0;
        IoGauntlet.removeBar();
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /** The attack-end window's words for a Gauntlet attack. */
    public static endTitle(success: boolean): string {
        return success ? "Gate " + IoGauntlet.roman(IoGauntlet.attackStage) + " falls!" : "Gate " + IoGauntlet.roman(IoGauntlet.attackStage) + " holds";
    }

    public static endMessage(success: boolean): string {
        return success ? "At least " + IoGauntlet._winPercent + "% of Moloch's stronghold lies in ruins. Its prize awaits you at home." : "Less than " + IoGauntlet._winPercent + "% of its walls fell. The damage stays for your next attempt.";
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        SOUNDS.Play("close");
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        this._embers = [];
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoGauntlet._open == this) {
            IoGauntlet._open = null;
        }
    }

    /** Puts the bar up once the Gauntlet yard is on screen, and keeps it up to date. */
    private static watchBar(): void {
        IoGauntlet.removeBar();
        IoGauntlet._bar = new Sprite();
        IoGauntlet._bar.name = "ioGauntletBar";
        IoGauntlet._bar.mouseEnabled = false;
        IoGauntlet._bar.mouseChildren = false;
        GLOBAL._ROOT.stage.addEventListener(Event.ENTER_FRAME, IoGauntlet.tickBar);
        IoGauntlet._bar.visible = false;
    }

    private static removeBar(): void {
        IoGauntlet._barFill = null;
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(Event.ENTER_FRAME, IoGauntlet.tickBar);
        }
        if (IoGauntlet._bar) {
            if (IoGauntlet._bar.parent) {
                IoGauntlet._bar.parent.removeChild(IoGauntlet._bar);
            }
            IoGauntlet._bar = null;
        }
    }

    private static drawBar(): void {
        let g: Shape = null;
        IoGauntlet._bar.graphics.clear();
        IoGauntlet._bar.graphics.beginFill(1706501, 0.8);
        IoGauntlet._bar.graphics.drawRoundRect(-8, -24, IoGauntlet.BAR_W + 16, IoGauntlet.BAR_H + 32, 12, 12);
        IoGauntlet._bar.graphics.endFill();
        IoGauntlet._bar.graphics.lineStyle(1, 9071173, 1);
        IoGauntlet._bar.graphics.beginFill(3811866, 1);
        IoGauntlet._bar.graphics.drawRect(0, 0, IoGauntlet.BAR_W, IoGauntlet.BAR_H);
        IoGauntlet._bar.graphics.endFill();
        IoGauntlet._barFill = new Shape();
        IoGauntlet._bar.addChild(IoGauntlet._barFill);
        g = new Shape();
        // the line to reach
        g.graphics.lineStyle(2, 16777215, 1);
        g.graphics.moveTo(IoGauntlet.BAR_W * IoGauntlet._winPercent / 100, -3);
        g.graphics.lineTo(IoGauntlet.BAR_W * IoGauntlet._winPercent / 100, IoGauntlet.BAR_H + 3);
        IoGauntlet._bar.addChild(g);
        IoGauntlet._barText = IoGauntlet.label("", 12, 16777215, true, IoGauntlet.BAR_W, TextFormatAlign.CENTER);
        IoGauntlet._barText.y = -21;
        IoGauntlet._barText.filters = [new GlowFilter(0, 1, 2, 2, 6, 1)];
        IoGauntlet._bar.addChild(IoGauntlet._barText);
    }

    private static tickBar(e: Event): void {
        if (!IoGauntlet._bar) {
            return;
        }
        if (IoGauntlet.attackStage <= 0 || !IoGauntlet.isGauntletBase(BASE._loadedBaseID) || GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
            IoGauntlet._bar.visible = false;
            return;
        }
        if (++IoGauntlet._ticks % 6 != 0 && IoGauntlet._bar.visible) {
            return;
        }
        if (!IoGauntlet._barFill) {
            IoGauntlet.drawBar();
        }
        if (!IoGauntlet._bar.parent && GLOBAL._layerUI) {
            GLOBAL._layerUI.addChild(IoGauntlet._bar);
        }
        let destroyed: int = IoGauntlet.percentDestroyed();
        IoGauntlet._barFill.graphics.clear();
        IoGauntlet._barFill.graphics.beginFill((destroyed >= IoGauntlet._winPercent ? 0x4CC34C : 0xE0501C) >>> 0, 1);
        IoGauntlet._barFill.graphics.drawRect(1, 1, Math.max(0, (IoGauntlet.BAR_W - 2) * Math.min(100, destroyed) / 100), IoGauntlet.BAR_H - 2);
        IoGauntlet._barFill.graphics.endFill();
        IoGauntlet._barText.text = "Gate " + IoGauntlet.roman(IoGauntlet.attackStage) + ": " + destroyed + "% destroyed, " + IoGauntlet._winPercent + "% breaks it";
        IoGauntlet._bar.x = (GLOBAL._SCREENCENTER.x - IoGauntlet.BAR_W * 0.5) | 0;
        IoGauntlet._bar.y = (GLOBAL._SCREEN.y + 100) | 0;
        IoGauntlet._bar.visible = true;
        if (IoGauntlet._bar.parent) {
            IoGauntlet._bar.parent.setChildIndex(IoGauntlet._bar, (IoGauntlet._bar.parent.numChildren - 1) | 0);
        }
    }

    /** As the attack's end works it out (ATTACK.EndB): building health left, walls and fired traps aside. */
    public static percentDestroyed(): int {
        let health: number = 0;
        let max: number = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b._class != "wall" && (b._type == 53 && b._expireTime < GLOBAL.Timestamp()) === false) {
                health += b.health;
                max += b.maxHealth;
            }
        }
        return max > 0 ? (100 - 100 / max * health) | 0 : 0;
    }

    // ---- helpers
    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string, font: string = "Verdana", italic: boolean = false): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat(font, size, color, bold, italic);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }
}
