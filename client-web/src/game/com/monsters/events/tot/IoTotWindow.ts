import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { CasinoUI, GLOBAL, ImageCache, IoEventsCalendar, IoKit, IoMapUi, IoTot, KEYS, POPUPSETTINGS, SOUNDS, IoFormat } from "@game";

/**
 * Inferno-only (20 October): Trick or Treat's window (IoTot). A Halloween night: the moon, bats, and the five wild
 * tribes' doors in a row, a jack-o'-lantern flickering by each, the tribe's face over it. Knock! and the door shakes
 * three times while the server rolls it, then swings open: candy and gold (a treat: the Shiny paid), or the dark and
 * a crowd of glowing eyes (a trick: the window closes and the Zagnoids come: IoTot.startTrick).
 */
export class IoTotWindow extends ASObject {
    static {
        as3.fields(this, { _mc: null, _doors: null, _bats: null, _flames: null, _busy: false, _t0: 0, _timeLine: null });
    }

    private static _open: IoTotWindow = null;

    private static readonly W: int = 780;

    private static readonly H: int = 470;

    /** A door slot's width, and the doors' top. */
    private static readonly SLOT: int = 146;

    private static readonly DOOR_Y: int = -62;

    private static readonly DOOR_W: int = 84;

    private static readonly DOOR_H: int = 128;

    private _mc: MovieClip;

    /** Per door: {key, holder, leaf, inside, label, button, shake (ms left), swing (0..1), opening}. */
    private _doors: any[];

    private _bats: any[];

    private _flames: any[];

    private _busy: boolean;

    private _t0: int;

    private _timeLine: TextField;

    public $ctor(): void {
        super.$ctor();
        this._doors = [];
        this._bats = [];
        this._flames = [];
        this._t0 = getTimer();
        let left: int = (-IoTotWindow.W / 2) | 0;
        let top: int = (-IoTotWindow.H / 2) | 0;
        this._mc = new MovieClip();
        this._mc.name = "ioTotWindow";
        this.drawNight(left, top);
        let title: TextField = as3.as(this._mc.addChild(CasinoUI.label(KEYS.Get("io_tot_title"), 36, 0xFF8A1E, true, IoTotWindow.W, TextFormatAlign.CENTER, "Groboldov")), TextField);
        title.x = left;
        title.y = top + 12;
        title.filters = [new GlowFilter(0xFF3A00, 0.85, 12, 12, 2)];
        let intro: TextField = as3.as(this._mc.addChild(CasinoUI.label("", 11, 0xFFE8C8, false, IoTotWindow.W - 220, TextFormatAlign.CENTER)), TextField);
        intro.multiline = true;
        intro.wordWrap = true;
        intro.height = 48;
        let f: any = IoTot.flag() || {};
        intro.htmlText = KEYS.Get("io_tot_intro", { "v1": f.shiny | 0 || 25, "v2": IoFormat.number(f.horde | 0 || 1000), "v3": f.level | 0 || 6 });
        intro.x = left + 100;
        intro.y = top + 60;
        this._timeLine = as3.as(this._mc.addChild(CasinoUI.label("", 11, 0xC8B0FF, true, IoTotWindow.W, TextFormatAlign.CENTER)), TextField);
        this._timeLine.x = left;
        this._timeLine.y = top + 104;
        this.timeText();
        for (let i: int = 0; i < IoTot.TRIBES_INFO.length; i++) {
            this.makeDoor(IoTot.TRIBES_INFO[i], ((i - (IoTot.TRIBES_INFO.length - 1) / 2) * IoTotWindow.SLOT) | 0);
        }
        let foot: TextField = as3.as(this._mc.addChild(CasinoUI.label(KEYS.Get("io_tot_foot", { "v1": f.pumpkins | 0 || 6 }), 11, 0xD8C8A8, false, IoTotWindow.W - 80, TextFormatAlign.CENTER)), TextField);
        foot.x = left + 40;
        foot.y = top + IoTotWindow.H - 30;
        let x: Sprite = as3.as(this._mc.addChild(IoKit.closeButton("ioTotClose", 14, (e: any): void => {})), Sprite);
        x.x = -left - 24;
        x.y = top + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));
        this.refresh();
        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
        SOUNDS.Play("pumpkintreat", 0.35);
    }

    public static get isOpen(): boolean {
        if (IoTotWindow._open && (!IoTotWindow._open._mc || !IoTotWindow._open._mc.stage)) {
            IoTotWindow._open = null;
        }
        return IoTotWindow._open != null;
    }

    /** The window open (tests: its doors). */
    public static get current(): IoTotWindow {
        return IoTotWindow.isOpen ? IoTotWindow._open : null;
    }

    public static Open(): void {
        if (IoTotWindow.isOpen) {
            return;
        }
        IoTotWindow._open = new IoTotWindow();
    }

    public static CloseOpen(): void {
        if (IoTotWindow._open) {
            IoTotWindow._open.close(null, true);
        }
    }

    // ---------------------------------------------------------------------------------------- drawing
    /** The night: a deep purple sky into ember red, a moon, stars, a graveyard's hills, bats. */
    private drawNight(left: int, top: int): void {
        let W: int = IoTotWindow.W;
        let H: int = IoTotWindow.H;
        let sky: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(W, H, Math.PI / 2, left, top);
        sky.graphics.lineStyle(3, 0xFF7A1A, 1);
        sky.graphics.beginGradientFill(GradientType.LINEAR, [0x14081F, 0x2A0E2E, 0x4A1408], [1, 1, 1], [0, 150, 255], m);
        sky.graphics.drawRoundRect(left, top, W, H, 22);
        sky.graphics.endFill();
        // stars
        sky.graphics.lineStyle();
        for (let i: int = 0; i < 46; i++) {
            let sx: number = left + 20 + ((i * 97) % (W - 40));
            let sy: number = top + 14 + ((i * 53) % 150);
            sky.graphics.beginFill(0xFFF4D8, 0.35 + (i % 4) * 0.15);
            sky.graphics.drawCircle(sx, sy, i % 5 == 0 ? 1.6 : 1);
            sky.graphics.endFill();
        }
        // the moon, with a glow
        let moon: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        moon.graphics.beginFill(0xFFF0C0, 1);
        moon.graphics.drawCircle(0, 0, 30);
        moon.graphics.endFill();
        moon.graphics.beginFill(0xE8D49A, 0.6);
        moon.graphics.drawCircle(-9, -6, 6);
        moon.graphics.drawCircle(8, 9, 4);
        moon.graphics.drawCircle(10, -10, 3);
        moon.graphics.endFill();
        moon.x = left + W - 74;
        moon.y = top + 58;
        moon.filters = [new GlowFilter(0xFFE8A0, 0.6, 30, 30, 2)];
        // the hills at the bottom, with gravestones
        let hills: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        hills.graphics.beginFill(0x0C0508, 1);
        hills.graphics.moveTo(left + 2, top + H - 70);
        for (let k: int = 0; k <= 12; k++) {
            let hx: number = left + (W * k) / 12;
            hills.graphics.curveTo(hx - W / 24, top + H - 82 - (k % 3) * 9, hx, top + H - 68 - (k % 2) * 6);
        }
        hills.graphics.lineTo(left + W - 2, top + H - 2);
        hills.graphics.lineTo(left + 2, top + H - 2);
        hills.graphics.endFill();
        hills.graphics.beginFill(0x1E1418, 1);
        for (let g: int = 0; g < 9; g++) {
            let gx: number = left + 30 + g * (W - 60) / 8 + (g % 2) * 18;
            let gy: number = top + H - 76 - (g % 3) * 4;
            hills.graphics.drawRoundRect(gx, gy, 14, 20, 12);
        }
        hills.graphics.endFill();
        // bats
        for (let b: int = 0; b < 5; b++) {
            let bat: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
            this._bats.push({ "s": bat, "x": left + Math.random() * W, "y": top + 30 + Math.random() * 110, "v": 0.6 + Math.random() * 0.9, "p": Math.random() * 6, "left": left, "w": W });
        }
    }

    /** A bat's wings (up or down). */
    private static drawBat(s: Shape, up: boolean): void {
        s.graphics.clear();
        s.graphics.beginFill(0x050205, 1);
        s.graphics.drawEllipse(-3, -2, 6, 5);
        let wy: number = up ? -7 : 4;
        s.graphics.moveTo(-2, 0);
        s.graphics.curveTo(-7, wy, -13, wy + 1);
        s.graphics.curveTo(-9, 1, -2, 2);
        s.graphics.moveTo(2, 0);
        s.graphics.curveTo(7, wy, 13, wy + 1);
        s.graphics.curveTo(9, 1, 2, 2);
        s.graphics.endFill();
    }

    /**
     * A door at x: the stone arch, the door itself (its leaf, hinged at its left edge, so it swings open), what is
     * behind it, the tribe's face above in a gold ring, a jack-o'-lantern by it, its name, its button or result.
     */
    private makeDoor(t: any[], x: int): void {
        let key: string = String(t[0]);
        let holder: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        holder.name = "ioTotDoor_" + key;
        holder.x = x;
        holder.y = IoTotWindow.DOOR_Y;
        let w: int = IoTotWindow.DOOR_W;
        let h: int = IoTotWindow.DOOR_H;
        // the arch
        let arch: Shape = as3.as(holder.addChild(new Shape()), Shape);
        arch.graphics.beginFill(0x3A3238, 1);
        arch.graphics.drawRoundRect(-w / 2 - 12, -10, w + 24, h + 14, 60, 60);
        arch.graphics.endFill();
        arch.graphics.lineStyle(1, 0x1A161A, 1);
        for (let r: int = 0; r < 6; r++) {
            arch.graphics.moveTo(-w / 2 - 12, 12 + r * 21);
            arch.graphics.lineTo(-w / 2 - 2, 12 + r * 21);
            arch.graphics.moveTo(w / 2 + 2, 6 + r * 21);
            arch.graphics.lineTo(w / 2 + 12, 6 + r * 21);
        }
        // the doorway (what is behind)
        let inside: Sprite = as3.as(holder.addChild(new Sprite()), Sprite);
        inside.graphics.beginFill(0x050205, 1);
        inside.graphics.drawRoundRect(-w / 2, 0, w, h, 50, 50);
        inside.graphics.endFill();
        // the door's leaf, hinged at its left edge
        let leaf: Sprite = as3.as(holder.addChild(new Sprite()), Sprite);
        leaf.x = -w / 2;
        let lg: any = leaf.graphics;
        let m: Matrix = new Matrix();
        m.createGradientBox(w, h, 0, 0, 0);
        lg.beginGradientFill(GradientType.LINEAR, [0x5A2E14, 0x7A4220, 0x55290F], [1, 1, 1], [0, 128, 255], m);
        lg.drawRoundRect(0, 0, w, h, 50, 50);
        lg.endFill();
        lg.lineStyle(2, 0x3A1A08, 1);
        for (let p: int = 1; p < 4; p++) {
            lg.moveTo((w * p) / 4, 8);
            lg.lineTo((w * p) / 4, h - 2);
        }
        lg.lineStyle(3, 0x2A2420, 1);
        lg.moveTo(4, 34);
        lg.lineTo(w - 4, 34);
        lg.moveTo(4, h - 30);
        lg.lineTo(w - 4, h - 30);
        lg.lineStyle();
        // its little window, lit
        lg.beginFill(0xFFB040, 0.85);
        lg.drawCircle(w / 2, 20, 7);
        lg.endFill();
        lg.lineStyle(1.5, 0x2A1408, 1);
        lg.moveTo(w / 2 - 7, 20);
        lg.lineTo(w / 2 + 7, 20);
        lg.moveTo(w / 2, 13);
        lg.lineTo(w / 2, 27);
        // the knocker
        lg.lineStyle(3, 0xE8B848, 1);
        lg.drawCircle(w / 2, h / 2 + 6, 8);
        lg.lineStyle();
        lg.beginFill(0xE8B848, 1);
        lg.drawCircle(w / 2, h / 2 - 3, 3.5);
        lg.drawCircle(w - 12, h / 2 + 18, 3);
        lg.endFill();
        // the tribe's face over the door, in a gold ring
        let face: Sprite = as3.as(holder.addChild(new Sprite()), Sprite);
        face.y = -34;
        face.graphics.lineStyle(3, 0xE8B848, 1);
        face.graphics.beginFill(0x1A0A04, 1);
        face.graphics.drawCircle(0, 0, 25);
        face.graphics.endFill();
        let pic: Sprite = as3.as(face.addChild(new Sprite()), Sprite);
        let round: Shape = as3.as(face.addChild(new Shape()), Shape);
        round.graphics.beginFill(0xFF0000, 1);
        round.graphics.drawCircle(0, 0, 22);
        round.graphics.endFill();
        pic.mask = round;
        ImageCache.GetImageWithCallBack(String(t[4]), (k: string, bmd: BitmapData, args: any[] = null): void => {
            let image: Bitmap = new Bitmap(bmd);
            image.smoothing = true;
            image.width = image.height = 46;
            image.x = image.y = -23;
            pic.addChild(image);
        });
        // a jack-o'-lantern by the door (its light flickers)
        let lantern: Sprite = as3.as(holder.addChild(new Sprite()), Sprite);
        lantern.x = w / 2 + 2;
        lantern.y = h - 26;
        let glow: Shape = as3.as(lantern.addChild(new Shape()), Shape);
        glow.graphics.beginFill(0xFF8A1E, 0.35);
        glow.graphics.drawCircle(14, 16, 22);
        glow.graphics.endFill();
        IoTotWindow.drawPumpkin(lantern);
        this._flames.push({ "s": glow, "p": Math.random() * 6 });
        // the name, and its button or result
        let tn: string = IoTot.tribeName(key);
        let name: TextField = as3.as(holder.addChild(CasinoUI.label(tn.charAt(0).toUpperCase() + tn.substr(1), 12, 0xFFD890, true, IoTotWindow.SLOT - 6, TextFormatAlign.CENTER)), TextField);
        name.x = -(IoTotWindow.SLOT - 6) / 2;
        name.y = h + 8;
        GLOBAL.ioFitText(name, 9);
        let label: TextField = as3.as(holder.addChild(CasinoUI.label("", 12, 0xFFFFFF, true, IoTotWindow.SLOT - 6, TextFormatAlign.CENTER)), TextField);
        label.x = -(IoTotWindow.SLOT - 6) / 2;
        label.y = h + 58;
        label.multiline = true;
        label.wordWrap = true;
        label.height = 34;
        let door: any = { "key": key, "holder": holder, "leaf": leaf, "inside": inside, "label": label, "button": null, "shake": 0, "swing": 0, "opening": false, "eyes": [] };
        this._doors.push(door);
        leaf.buttonMode = true;
        leaf.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            this.knock(door);
        });
    }

    /** A jack-o'-lantern, drawn: orange ribs, a stalk, a grin lit from inside. */
    private static drawPumpkin(s: Sprite): void {
        let g: any = s.graphics;
        g.beginFill(0xE8641A, 1);
        g.drawEllipse(0, 6, 28, 22);
        g.endFill();
        g.beginFill(0xF07A24, 1);
        g.drawEllipse(6, 6, 16, 22);
        g.endFill();
        g.lineStyle(1, 0xB8460E, 1);
        g.drawEllipse(9, 6, 10, 22);
        g.lineStyle();
        g.beginFill(0x3A6A1A, 1);
        g.drawRect(12, 1, 4, 7);
        g.endFill();
        g.beginFill(0xFFD040, 1);
        g.moveTo(6, 13);
        g.lineTo(11, 13);
        g.lineTo(8.5, 9);
        g.lineTo(6, 13);
        g.moveTo(17, 13);
        g.lineTo(22, 13);
        g.lineTo(19.5, 9);
        g.lineTo(17, 13);
        g.moveTo(6, 19);
        g.lineTo(22, 19);
        g.lineTo(19, 23);
        g.lineTo(16, 21);
        g.lineTo(12, 23);
        g.lineTo(9, 21);
        g.lineTo(6, 19);
        g.endFill();
    }

    /** What is behind an open door: a treat (gold light, candy) or a trick (dark, eyes). */
    private fillInside(door: any, d: any): void {
        let inside: Sprite = door.inside;
        let w: int = IoTotWindow.DOOR_W;
        let h: int = IoTotWindow.DOOR_H;
        while (inside.numChildren > 0) {
            inside.removeChildAt(0);
        }
        inside.graphics.clear();
        door.eyes = [];
        if (d.r == "treat") {
            let m: Matrix = new Matrix();
            m.createGradientBox(w, h, Math.PI / 2, -w / 2, 0);
            inside.graphics.beginGradientFill(GradientType.LINEAR, [0xFFE8A0, 0xFFA830, 0x8A3A08], [1, 1, 1], [0, 140, 255], m);
            inside.graphics.drawRoundRect(-w / 2, 0, w, h, 50, 50);
            inside.graphics.endFill();
            let colors: any[] = [0xFF3A6A, 0x6AE84A, 0x4AA8FF, 0xFFE040, 0xC86AFF, 0xFF8A1E];
            for (let i: int = 0; i < 16; i++) {
                inside.graphics.beginFill(colors[i % colors.length] >>> 0, 1);
                let cx: number = -w / 2 + 12 + ((i * 29) % (w - 24));
                let cy: number = h - 14 - (i % 4) * 9 - ((i * 7) % 5);
                inside.graphics.drawEllipse(cx - 6, cy - 3.5, 12, 7);
                inside.graphics.endFill();
            }
            let plus: TextField = CasinoUI.label("+" + (IoTot.flag() ? IoTot.flag().shiny | 0 : 25), 22, 0xFFFFFF, true, w, TextFormatAlign.CENTER, "Groboldov");
            plus.x = -w / 2;
            plus.y = 36;
            plus.filters = [new GlowFilter(0xB8460E, 1, 6, 6, 4)];
            inside.addChild(plus);
        } else {
            inside.graphics.beginFill(0x030103, 1);
            inside.graphics.drawRoundRect(-w / 2, 0, w, h, 50, 50);
            inside.graphics.endFill();
            for (let e: int = 0; e < 11; e++) {
                let eye: Shape = new Shape();
                let c: uint = (e % 3 == 0 ? 0xFF3A1A : 0xFFB020) >>> 0;
                eye.graphics.beginFill(c, 1);
                eye.graphics.drawEllipse(-5, -1.6, 4, 3.2);
                eye.graphics.drawEllipse(1, -1.6, 4, 3.2);
                eye.graphics.endFill();
                eye.x = -w / 2 + 14 + ((e * 37) % (w - 28));
                eye.y = 16 + ((e * 23) % (h - 30));
                eye.filters = [new GlowFilter(c, 1, 6, 6, 2)];
                inside.addChild(eye);
                door.eyes.push({ "s": eye, "p": e * 1.7 });
            }
        }
    }

    // ---------------------------------------------------------------------------------------- state
    /** Each door as the flag has it: shut with Knock!, or open on its treat or trick, with its line. */
    public refresh(): void {
        let f: any = IoTot.flag() || {};
        let open: boolean = Boolean(f.open || f.test);
        let waiting: string = IoTot.waitingTrick();
        for (let door of this._doors) {
            let d: any = IoTot.door(door.key);
            if (door.button && door.button.parent) {
                door.button.parent.removeChild(door.button);
            }
            door.button = null;
            if (!d) {
                door.leaf.scaleX = door.opening ? door.leaf.scaleX : 1;
                door.label.htmlText = "";
                if (open && !this._busy) {
                    let b: MovieClip = IoMapUi.button(KEYS.Get("io_tot_knock"), 96, 26, (e: any): void => {
                        this.knock(door);
                    }, "gold", 13);
                    b.name = "ioTotKnock_" + door.key;
                    b.x = -48;
                    b.y = IoTotWindow.DOOR_H + 30;
                    door.holder.addChild(b);
                    door.button = b;
                    if (waiting) {
                        b.alpha = 0.45;
                    }
                }
                continue;
            }
            if (!door.opening) {
                door.leaf.scaleX = 0.16;
                this.fillInside(door, d);
            }
            let color: string = d.r == "treat" || d.s == "won" ? "#9CF070" : (d.s == "lost" ? "#FF7A5A" : "#FFB040");
            let text: string = "";
            if (d.r == "treat") {
                text = KEYS.Get("io_tot_door_treat", { "v1": f.shiny | 0 || 25 });
            } else if (d.s == "won") {
                text = KEYS.Get("io_tot_door_won", { "v1": f.shiny | 0 || 25 });
            } else if (d.s == "lost") {
                text = KEYS.Get("io_tot_door_lost", { "v1": IoFormat.number(d.killed | 0), "v2": IoFormat.number(f.horde | 0 || 1000) });
            } else {
                text = KEYS.Get("io_tot_door_trick", { "v1": IoFormat.number(f.horde | 0 || 1000) });
            }
            door.label.htmlText = "<font color=\"" + color + "\">" + text + "</font>";
            if (d.r == "trick" && d.s == "pending" && !this._busy) {
                let face: MovieClip = IoMapUi.button(KEYS.Get("io_tot_face"), 110, 26, (e: any): void => {
                    this.close(null, true);
                    IoTot.startTrick(door.key);
                }, "gold", 12);
                face.name = "ioTotFace_" + door.key;
                face.x = -55;
                face.y = IoTotWindow.DOOR_H + 30;
                door.holder.addChild(face);
                door.button = face;
                door.label.y = IoTotWindow.DOOR_H + 58;
            }
        }
    }

    private timeText(): void {
        let f: any = IoTot.flag() || {};
        let now: number = GLOBAL.Timestamp();
        let text: string = "";
        if (f.test) {
            text = KEYS.Get("io_ev2_test");
        } else if (f.open) {
            text = KEYS.Get("io_tot_ends", { "v1": GLOBAL.ioDuration(Number(f.endsAt) - now), "v2": IoEventsCalendar.at(Number(f.endsAt)) });
        } else if (f.soon) {
            text = KEYS.Get("io_tot_starts", { "v1": GLOBAL.ioDuration(Number(f.startsAt) - now), "v2": IoEventsCalendar.at(Number(f.startsAt)) });
        } else {
            text = KEYS.Get("io_tot_over");
        }
        this._timeLine.text = text;
    }

    // ---------------------------------------------------------------------------------------- knocking
    /** Knock knock knock: the door shakes while the server rolls it; then it swings open on what was behind. */
    public knock(door: any, force: string = null): void {
        if (this._busy || IoTot.door(door.key)) {
            return;
        }
        let f: any = IoTot.flag() || {};
        if (!(f.open || f.test)) {
            return;
        }
        let w: string = IoTot.waitingTrick();
        if (w) {
            GLOBAL.Message(KEYS.Get("io_tot_wait_trick", { "v1": IoTot.tribeName(w) }));
            return;
        }
        if (IoTot.quiet()) {
            return;
        }
        this._busy = true;
        this.refresh();
        door.shake = 1100;
        let answer: any = null;
        let failed: string = null;
        let shook: boolean = false;
        let reveal: Function = (): void => {
            if (!this._mc) {
                return;
            }
            if (failed != null) {
                this._busy = false;
                this.refresh();
                GLOBAL.Message(failed);
                return;
            }
            if (!answer || !shook) {
                return;
            }
            let d: any = answer.door;
            this.fillInside(door, d);
            door.opening = true;
            door.swing = 0;
            if (d.r == "treat") {
                SOUNDS.Play("pumpkintreat", 0.9);
                SOUNDS.Play("chaching", 0.6);
            } else {
                SOUNDS.Play("wmbhorn", 0.6);
                SOUNDS.Play("imonster" + (1 + ((Math.random() * 4) | 0)), 0.9);
            }
            this._busy = false;
            this.refresh();
            if (d.r == "trick") {
                // (the trick: the window closes, and the countdown begins)
                this._busy = true;
                setTimeout((): void => {
                    this.close(null, true);
                    IoTot.startTrick(door.key);
                }, 2200);
            }
        };
        // three knocks, a third of a second apart
        for (let k: int = 0; k < 3; k++) {
            setTimeout((): void => {
                SOUNDS.Play("hit" + (2 + k), 0.8);
            }, k * 330);
        }
        setTimeout((): void => {
            shook = true;
            reveal();
        }, 1150);
        IoTot.knock(door.key, (r: any, why: string = null): void => {
            if (!r) {
                failed = why || KEYS.Get("io_tot_load_fail");
            } else {
                answer = r;
            }
            reveal();
        }, force);
    }

    /** Knocks on a tribe's door (tests: with a forced result in admin test mode). */
    public knockOn(key: string, force: string = null): boolean {
        for (let door of this._doors) {
            if (door.key == key) {
                this.knock(door, force);
                return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------------------------------------------- moving
    private animate(e: Event = null): void {
        let t: number = (getTimer() - this._t0) / 1000;
        for (let b of this._bats) {
            b.x += b.v;
            if (b.x > b.left + b.w + 20) {
                b.x = b.left - 20;
            }
            b.s.x = b.x;
            b.s.y = b.y + Math.sin(t * 2 + b.p) * 6;
            IoTotWindow.drawBat(b.s, Math.sin(t * 14 + b.p) > 0);
        }
        for (let fl of this._flames) {
            fl.s.alpha = 0.55 + Math.sin(t * 9 + fl.p) * 0.2 + Math.sin(t * 23 + fl.p * 3) * 0.15;
            fl.s.scaleX = fl.s.scaleY = 0.92 + Math.sin(t * 7 + fl.p) * 0.08;
        }
        for (let door of this._doors) {
            if (door.shake > 0) {
                door.shake -= 1000 / 60;
                let phase: number = (door.shake % 330) / 330;
                door.leaf.x = -IoTotWindow.DOOR_W / 2 + (phase > 0.75 ? Math.sin(phase * 40) * 3 : 0);
                if (door.shake <= 0) {
                    door.leaf.x = -IoTotWindow.DOOR_W / 2;
                }
            }
            if (door.opening) {
                door.swing = Math.min(1, door.swing + 0.07);
                // (an ease out: fast, then settling)
                let s: number = 1 - (1 - door.swing) * (1 - door.swing);
                door.leaf.scaleX = 1 - s * 0.84;
                if (door.swing >= 1) {
                    door.opening = false;
                }
            }
            for (let eye of door.eyes) {
                eye.s.alpha = Math.sin(t * 2.2 + eye.p) > 0.92 ? 0.05 : 1;
            }
        }
        if ((getTimer() - this._t0) % 1000 < 20) {
            this.timeText();
        }
    }

    public close(e: MouseEvent = null, quiet: boolean = false): void {
        if (!this._mc) {
            return;
        }
        if (!quiet) {
            SOUNDS.Play("close");
        }
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoTotWindow._open == this) {
            IoTotWindow._open = null;
        }
    }
}
