import * as as3 from "as3";
import { int, uint } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { BASE, CasinoUI, GLOBAL, IoToast, IoWin, KEYS, SOUNDS, SOULCRUCIBLE, UI2, URLLoaderApi } from "@game";

/**
 * Inferno-only (11 November, the user's): the Soul Crucible's window (opened from the building's info panel:
 * SOULCRUCIBLE). Pick what to pour and what to take, how much, and pour: the server works the pour out and writes
 * it on the yard's save (server/src/services/crucible/crucible.ts; crucible/status, crucible/pour). This shows
 * what the server says and asks; nothing here decides an amount.
 *
 * The window (11 November, the owner's pick of the designs): the crucible in the middle of a ring, the four
 * resources as round buttons on its left (pour) and right (take), the rate on the crucible, a slider for the amount.
 *
 * The numbers shown before a pour (each pair's rate at level 1 and at the top level, the daily caps by level) come with every base
 * load as the flag io_crucible, so the server's settings (config/CrucibleConfig.ts) change them without a new build.
 *
 * After a pour the yard shows it at once: what was given is taken off and what came back is added here, without
 * sending either as spending or income (the server has written both already; a save sends resources as changes,
 * BASE._deltaResources, so the two are taken back out of the change: as IoPets.takeMagma does for pets/grow).
 *
 * Also: when a resource is nearly full and a Crucible stands in the yard, a line at the top offers to pour it
 * (nearFull, asked by the building as it ticks; once per resource every 30 minutes).
 */
export class IoCrucible {
    private static readonly W: int = 640;
    private static readonly H: int = 440;
    /** Where the four round buttons of each side sit on the ring round the crucible (degrees). */
    private static readonly ARC: number[] = [138, 166, 194, 222];
    private static readonly SLIDE_W: int = 244;
    private static readonly RES: string[] = ["r1", "r2", "r3", "r4"];
    private static readonly NAMES: string[] = ["#r_bone#", "#r_coal#", "#r_sulfur#", "#r_magma#"];
    /** A resource this full (of its storage) is "nearly full". */
    private static readonly NEAR_FULL: number = 0.98;
    private static readonly NAG_MS: int = 30 * 60 * 1000;

    private static _win: any = null;
    private static _state: any = null;
    private static _from: int = 0;
    private static _to: int = 1;
    private static _amount: number = 0;
    private static _busy: boolean = false;
    private static _ui: any = null;
    private static _raw: string = null;
    private static _cfg: any = null;
    private static _nagged: any = {};
    private static _nagTick: int = 0;
    private static _anims: any[] = [];

    // ---- the server's settings
    /** { building, rates: {r1: {r2: [at level 1, at the top level], ...}, ...}, levels, caps: [share by level], floor, min } or null when the Crucible is off. */
    public static get config(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_crucible ? String(GLOBAL._flags.io_crucible) : "";
        if (raw === IoCrucible._raw) {
            return IoCrucible._cfg;
        }
        IoCrucible._raw = raw;
        IoCrucible._cfg = null;
        if (raw != "") {
            try {
                let sent: any = JSON.parse(raw);
                if (sent && sent.rates && as3.is(sent.caps, Array)) {
                    IoCrucible._cfg = sent;
                }
            } catch (e) {
            }
        }
        return IoCrucible._cfg;
    }

    /** The share of the yard's storage a Crucible of this level may pour in a day (0 when off). */
    public static capShare(level: int): number {
        let cfg: any = IoCrucible.config;
        if (!cfg || level < 1) {
            return 0;
        }
        let caps: any[] = cfg.caps;
        return Number(caps[Math.min(caps.length, level) - 1]) || 0;
    }

    /** The share of a pour of `from` into `to` (0-3) that comes back at this level, as the server works it out. */
    public static rate(from: int, to: int, level: int): number {
        let cfg: any = IoCrucible.config;
        let row: any = cfg ? cfg.rates[IoCrucible.RES[from]] : null;
        let pair: any[] = row ? row[IoCrucible.RES[to]] : null;
        if (!pair) {
            return 0;
        }
        let lo: number = Number(pair[0]);
        let hi: number = Number(pair[1]);
        if (!(lo > 0) || !(hi > 0)) {
            return 0;
        }
        let top: int = Math.max(1, Number(cfg.levels) || cfg.caps.length) | 0;
        let l: int = Math.max(1, Math.min(top, level | 0)) | 0;
        let r: number = top > 1 ? lo + ((hi - lo) * (l - 1)) / (top - 1) : hi;
        return Math.max(0, Math.min(1, r));
    }

    /** `amount` of resource `from` poured into `to` (0-3) at this level: what comes back. */
    public static poured(from: int, to: int, amount: number, level: int = -1): number {
        if (level < 0) {
            level = IoCrucible._state ? IoCrucible._state.level | 0 : 1;
        }
        return Math.max(0, Math.floor(amount * IoCrucible.rate(from, to, level) + 1e-9));
    }

    /** 32.5 for 0.325, 35 for 0.35. */
    private static percent(share: number): string {
        return String(Math.round(share * 1000) / 10);
    }

    // ---- the window
    public static get isOpen(): boolean {
        return Boolean(IoCrucible._win) && !IoCrucible._win.closed;
    }

    /** Opens the window (the player's own main yard only); `from` (0-3) starts as the resource to pour. */
    public static Show(from: int = -1): void {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard) {
            GLOBAL.Message(KEYS.Get("io_cru_own_yard"));
            return;
        }
        if (!IoCrucible.config) {
            GLOBAL.Message(KEYS.Get("io_cru_off"));
            return;
        }
        if (IoCrucible.isOpen) {
            IoCrucible._win.close();
        }
        if (from >= 0 && from < 4) {
            IoCrucible._from = from;
            if (IoCrucible._to == from) {
                IoCrucible._to = (from + 1) % 4;
            }
        }
        IoCrucible._state = null;
        IoCrucible._amount = 0;
        IoCrucible._busy = false;
        IoCrucible.build();
        IoCrucible.load();
    }

    public static Hide(): void {
        if (IoCrucible.isOpen) {
            IoCrucible._win.close();
        }
    }

    // ---- drawing
    /** Design coordinates (the window's top-left is 0, 0) of the eight round buttons: the Pour arc left, the Take arc right. */
    private static spot(side: int, i: int): any {
        let a: number = (IoCrucible.ARC[i] * Math.PI) / 180;
        let dx: number = 215 * Math.cos(a);
        return { "x": side == 0 ? 320 + dx : 320 - dx, "y": 182 - 120 * Math.sin(a) };
    }

    /** A resource's pictogram (0-3), `size` wide, drawn round its centre. */
    private static icon(i: int, size: number): Sprite {
        let s: Sprite = new Sprite();
        let g: any = s.graphics;
        if (i == 0) {
            g.lineStyle(8, 0x7A6A4A, 1);
            g.moveTo(-6, 4);
            g.lineTo(6, -4);
            g.lineStyle(5.6, 0xEFE6D0, 1);
            g.moveTo(-6, 4);
            g.lineTo(6, -4);
            g.lineStyle(1.2, 0x7A6A4A, 1);
            let knobs: number[][] = [[-7.8, 3.5], [-4.4, 7.2], [4.4, -7.2], [7.8, -3.5]];
            let k: int = 0;
            while (k < 4) {
                g.beginFill(0xEFE6D0, 1);
                g.drawCircle(knobs[k][0], knobs[k][1], 3.4);
                g.endFill();
                k++;
            }
        } else if (i == 1) {
            IoCrucible.poly(g, [[6, 20], [9, 10], [17, 5], [26, 11], [27, 21], [19, 27], [10, 26]], 0x2B2B33, 0x8A8A98);
            IoCrucible.poly(g, [[12, 12], [17, 8], [22, 12], [16, 15]], 0x55556A, -1);
        } else if (i == 2) {
            IoCrucible.poly(g, [[10, 27], [7, 15], [12, 6], [16, 16], [15, 27]], 0xF5C518, 0x8A6400);
            IoCrucible.poly(g, [[16, 27], [17, 13], [22, 9], [26, 18], [23, 27]], 0xFFD94A, 0x8A6400);
        } else {
            g.lineStyle(1.2, 0x8A2A00, 1);
            g.beginFill(0xFF6A1A, 1);
            g.moveTo(0, -12);
            g.cubicCurveTo(4, -5, 10, -1, 10, 5);
            g.cubicCurveTo(10, 18.3, -10, 18.3, -10, 5);
            g.cubicCurveTo(-10, -1, -4, -5, 0, -12);
            g.endFill();
            g.lineStyle();
            g.beginFill(0xFFC23A, 1);
            g.moveTo(0, -2);
            g.cubicCurveTo(2, 2, 5, 3, 5, 6);
            g.cubicCurveTo(5, 12.7, -5, 12.7, -5, 6);
            g.cubicCurveTo(-5, 3, -2, 2, 0, -2);
            g.endFill();
        }
        s.scaleX = s.scaleY = size / 32;
        s.mouseEnabled = false;
        s.mouseChildren = false;
        return s;
    }

    /** A filled polygon given in the pictogram's 32 x 32 box (drawn round its centre). */
    private static poly(g: any, pts: number[][], fill: uint, line: int): void {
        if (line >= 0) {
            g.lineStyle(1.2, line >>> 0, 1);
        } else {
            g.lineStyle();
        }
        g.beginFill(fill, 1);
        g.moveTo(pts[0][0] - 16, pts[0][1] - 16);
        let i: int = 1;
        while (i < pts.length) {
            g.lineTo(pts[i][0] - 16, pts[i][1] - 16);
            i++;
        }
        g.lineTo(pts[0][0] - 16, pts[0][1] - 16);
        g.endFill();
    }

    /** One of the eight round buttons: a resource's pictogram, lit when it is the one poured (left) or taken (right). */
    private static round(side: int, i: int, onClick: Function): Sprite {
        let b: MovieClip = new MovieClip();
        let hot: boolean = false;
        let pic: Sprite = as3.as(b.addChild(IoCrucible.icon(i, 26)), Sprite);
        b.mouseChildren = false;
        b.buttonMode = true;
        let draw: Function = (): void => {
            let on: boolean = Boolean(b["casinoChosen"]);
            let r: number = on ? 29 : 24;
            let m: Matrix = new Matrix();
            m.createGradientBox(r * 2, r * 2, Math.PI / 2, -r, -r);
            b.graphics.clear();
            b.graphics.lineStyle(on ? 2 : 1, (on ? (side == 0 ? 0xFFE0A0 : 0x7CF0D0) : (hot ? 0xFFB35A : 0x6A4A38)) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, on ? (side == 0 ? [0xE08A30, 0x9A3010] : [0x1E5A4E, 0x0E2E28]) : [0x3A2A26, 0x1E1614], [1, 1], [0, 255], m);
            b.graphics.drawCircle(0, 0, r);
            b.graphics.endFill();
            pic.scaleX = pic.scaleY = (on ? 30 : 26) / 32;
            b.filters = on ? [new GlowFilter((side == 0 ? 0xFF6A1A : 0x3AD0A8) >>> 0, 0.7, 10, 10, 2, 2)] : [];
        };
        b["casinoChosen"] = false;
        b["casinoRedraw"] = draw;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hot = true;
            draw();
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hot = false;
            draw();
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick(e);
        });
        draw();
        return b;
    }

    /** A small tag (POUR, TAKE) round its centre. */
    private static tag(text: string, fill: uint): Sprite {
        let s: Sprite = new Sprite();
        let t: TextField = as3.as(s.addChild(CasinoUI.label(text, 10, 0xFFFFFF, true, 120, TextFormatAlign.CENTER)), TextField);
        let w: number = Math.max(40, Math.ceil(t.textWidth) + 18);
        t.x = -60;
        t.y = -9;
        s.graphics.lineStyle(1, 0xFFFFFF, 1);
        s.graphics.beginFill(fill, 1);
        s.graphics.drawRoundRect(-w / 2, -9, w, 18, 18, 18);
        s.graphics.endFill();
        s.mouseEnabled = false;
        s.mouseChildren = false;
        return s;
    }

    /** Where a line from a round button meets the crucible: { ax, ay } by the button, { bx, by } by the pot. */
    private static link(side: int, i: int): any {
        let c: any = IoCrucible.spot(side, i);
        let px: number = 320;
        let py: number = 176;
        let dx: number = px - c.x;
        let dy: number = py - c.y;
        let d: number = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= d;
        dy /= d;
        return { "ax": c.x + dx * 34, "ay": c.y + dy * 34, "bx": px - dx * 74, "by": py - dy * 62, "dx": dx, "dy": dy };
    }

    private static build(): void {
        let W: int = IoCrucible.W;
        let H: int = IoCrucible.H;
        let win: any = IoWin.openPanel("ioCrucible", W, H, KEYS.Get("io_cru_name"));
        IoCrucible._win = win;
        let mc: Sprite = win.mc;
        let left: int = win.left;
        let top: int = win.top;
        let ui: any = { "from": [], "to": [] };
        IoCrucible._ui = ui;
        IoCrucible._anims = [];

        // the level, by the title
        let title: TextField = as3.as(mc.getChildByName("ioCrucibleTitle"), TextField);
        let pill: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        pill.x = left + 20 + (title ? Math.min(300, Math.ceil(title.textWidth)) : 190) + 18;
        pill.y = top + 20;
        pill.graphics.lineStyle(1, 0x6A4A38, 1);
        pill.graphics.beginFill(0x2A1A14, 1);
        pill.graphics.drawRoundRect(0, 0, 96, 22, 22, 22);
        pill.graphics.endFill();
        ui.head = as3.as(pill.addChild(CasinoUI.label(IoWin.loadingText(), 11, 0xF4E6D0, true, 96, TextFormatAlign.CENTER)), TextField);
        ui.head.name = "ioCrucibleHead";
        ui.head.y = 2;
        IoWin.watchLoading(ui.head);

        // the ring the buttons sit on, the glow and the crucible
        let ring: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        ring.mouseEnabled = false;
        ring.graphics.lineStyle(2, 0x6A4A38, 0.6);
        let seg: int = 0;
        while (seg < 60) {
            let a0: number = (seg / 60) * Math.PI * 2;
            let a1: number = ((seg + 0.55) / 60) * Math.PI * 2;
            ring.graphics.moveTo(left + 320 + 215 * Math.cos(a0), top + 182 + 120 * Math.sin(a0));
            ring.graphics.lineTo(left + 320 + 215 * Math.cos(a1), top + 182 + 120 * Math.sin(a1));
            seg++;
        }
        let halo: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        halo.mouseEnabled = false;
        let hm: Matrix = new Matrix();
        hm.createGradientBox(220, 220, 0, left + 210, top + 67);
        halo.graphics.beginGradientFill(GradientType.RADIAL, [0xFF781E, 0xFF781E], [0.4, 0], [0, 180], hm);
        halo.graphics.drawCircle(left + 320, top + 177, 110);
        halo.graphics.endFill();
        let art: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        art.name = "ioCrucibleArt";
        art.mouseEnabled = false;
        CasinoUI.picture(art, "crucible/hero.png", left + 225, top + 76, 190, 190);

        // the lines from the chosen two to the crucible (drawn in refresh)
        ui.lines = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.lines.mouseEnabled = false;

        // the eight round buttons and their names
        let side: int = 0;
        while (side < 2) {
            let list: any[] = side == 0 ? ui.from : ui.to;
            let pick: Function = side == 0 ? IoCrucible.pickFrom : IoCrucible.pickTo;
            let head: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get(side == 0 ? "io_cru_pour" : "io_cru_take").toUpperCase(), 11, 0xFFB35A, true, 200, side == 0 ? TextFormatAlign.LEFT : TextFormatAlign.RIGHT)), TextField);
            head.x = side == 0 ? left + 20 : left + W - 220;
            head.y = top + 56;
            let i: int = 0;
            while (i < 4) {
                let n: int = i;
                let c: any = IoCrucible.spot(side, i);
                let b: Sprite = IoCrucible.round(side, i, (e: any): void => {
                    pick(n);
                });
                b.name = "ioCrucible" + (side == 0 ? "From" : "To") + i;
                b.x = left + c.x;
                b.y = top + c.y;
                mc.addChild(b);
                let align: string = side == 0 ? TextFormatAlign.RIGHT : TextFormatAlign.LEFT;
                let lx: number = side == 0 ? left + c.x - 35 - 76 : left + c.x + 35;
                let nameField: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get(IoCrucible.NAMES[i]), 12, 0xFFFFFF, true, 76, align)), TextField);
                nameField.x = lx;
                nameField.y = top + c.y - 17;
                GLOBAL.ioFitText(nameField, 8);
                let amount: TextField = as3.as(mc.addChild(CasinoUI.label("", 11, 0xD9C6A8, false, 76, align)), TextField);
                amount.x = lx;
                amount.y = top + c.y - 1;
                list.push({ "b": b, "amount": amount });
                i++;
            }
            side++;
        }

        // the rate, on the crucible
        ui.badge = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.badge.mouseEnabled = false;
        ui.badge.mouseChildren = false;
        ui.badge.x = left + 270;
        ui.badge.y = top + 250;
        ui.badge.graphics.lineStyle(2, 0xFFE0A0, 1);
        ui.badge.graphics.beginFill(0x1E0E08, 0.92);
        ui.badge.graphics.drawRoundRect(0, 0, 100, 38, 16, 16);
        ui.badge.graphics.endFill();
        ui.rate = as3.as(ui.badge.addChild(CasinoUI.title("", 22, 100)), TextField);
        ui.rate.name = "ioCrucibleRate";
        ui.rate.textColor = 0xFFD060;
        ui.rate.y = 3;
        ui.tagPour = as3.as(mc.addChild(IoCrucible.tag(KEYS.Get("io_cru_tag_pour"), 0x9A3010)), Sprite);
        ui.tagTake = as3.as(mc.addChild(IoCrucible.tag(KEYS.Get("io_cru_tag_take"), 0x1E5A4E)), Sprite);

        // how much: the slider, the number and the quick shares
        let ay: int = (top + 316) | 0;
        let how: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_cru_amount").toUpperCase(), 11, 0xFFB35A, true, 80, TextFormatAlign.LEFT)), TextField);
        how.x = left + 20;
        how.y = ay + 4;
        GLOBAL.ioFitText(how, 8);
        let sw: int = IoCrucible.SLIDE_W;
        let slider: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        slider.name = "ioCrucibleSlider";
        slider.x = left + 104;
        slider.y = ay + 12;
        slider.buttonMode = true;
        slider.mouseChildren = false;
        ui.slider = slider;
        ui.thumb = as3.as(slider.addChild(new Sprite()), Sprite);
        let tm: Matrix = new Matrix();
        tm.createGradientBox(22, 22, 0, -11, -11);
        ui.thumb.graphics.lineStyle(2, 0x6A1404, 1);
        ui.thumb.graphics.beginGradientFill(GradientType.RADIAL, [0xFFE9B0, 0xFF9A20], [1, 1], [0, 255], tm);
        ui.thumb.graphics.drawCircle(0, 0, 11);
        ui.thumb.graphics.endFill();
        let drag: Function = (e: MouseEvent): void => {
            let x: number = slider.globalToLocal(new Point(e.stageX, e.stageY)).x;
            IoCrucible.setShare(x / sw);
        };
        let drop: Function = null;
        drop = (e: MouseEvent): void => {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, drag);
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, drop);
        };
        slider.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            drag(e);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, drag);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, drop);
        });
        ui.input = as3.as(mc.addChild(CasinoUI.input(100, 24, "0", 10)), TextField);
        ui.input.name = "ioCrucibleAmount";
        ui.input.x = left + 104 + sw + 18;
        ui.input.y = ay;
        ui.input.addEventListener("change", (e: any): void => {
            IoCrucible._amount = Math.max(0, Math.floor(Number(String(ui.input.text).replace(/[^0-9]/g, "")) || 0));
            IoCrucible.refresh(false);
        });
        let shares: any[] = [[0.25, "25%"], [0.5, "50%"], [1, KEYS.Get("io_cru_max")]];
        let qi: int = 0;
        while (qi < shares.length) {
            let share: number = Number(shares[qi][0]);
            let q: Sprite = CasinoUI.toggle(String(shares[qi][1]), 46, 24, (e: any): void => {
                IoCrucible.setShare(share);
            });
            q.name = "ioCrucibleShare" + qi;
            q.x = left + W - 20 - (3 - qi) * 50 + 4;
            q.y = ay;
            mc.addChild(q);
            qi++;
        }

        // what it gives, today's pours and the button
        ui.result = as3.as(mc.addChild(CasinoUI.label("", 12, 0xFFFFFF, false, W - 200, TextFormatAlign.LEFT)), TextField);
        ui.result.name = "ioCrucibleResult";
        ui.result.x = left + 20;
        ui.result.y = ay + 32;
        ui.result.height = 20;
        ui.today = as3.as(mc.addChild(CasinoUI.label("", 11, 0xF4E6D0, false, W - 200, TextFormatAlign.LEFT)), TextField);
        ui.today.name = "ioCrucibleToday";
        ui.today.x = left + 20;
        ui.today.y = ay + 52;
        ui.bar = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.bar.x = left + 20;
        ui.bar.y = ay + 72;
        ui.go = CasinoUI.button(KEYS.Get("io_cru_btn"), 150, 44, (e: any): void => {
            IoCrucible.pour();
        }, false, 18);
        ui.go.name = "ioCruciblePour";
        ui.go.x = left + W - 150 - 20;
        ui.go.y = ay + 38;
        mc.addChild(ui.go);
        ui.note = as3.as(mc.addChild(CasinoUI.label("", 11, 0xFF9A7A, false, W - 40, TextFormatAlign.LEFT)), TextField);
        ui.note.name = "ioCrucibleNote";
        ui.note.x = left + 20;
        ui.note.y = ay + 90;
        ui.note.height = 30;
        ui.note.multiline = true;
        ui.note.wordWrap = true;

        // the pour's pieces, streams and flare, over everything
        ui.fx = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.fx.name = "ioCrucibleFx";
        ui.fx.mouseEnabled = false;
        ui.fx.mouseChildren = false;
        let tick: Function = null;
        tick = (e: any): void => {
            if (win.closed) {
                mc.removeEventListener(Event.ENTER_FRAME, tick);
                IoCrucible._anims = [];
                return;
            }
            IoCrucible.animate(win);
        };
        mc.addEventListener(Event.ENTER_FRAME, tick);
        IoCrucible.refresh(true);
    }

    /** Sets the amount to a share (0-1) of the most that can be poured now, in whole thousands below the most. */
    private static setShare(share: number): void {
        let most: number = IoCrucible.most();
        share = Math.max(0, Math.min(1, share));
        let amount: number = Math.floor(most * share);
        if (share < 1 && amount > 10000) {
            amount = Math.floor(amount / 1000) * 1000;
        }
        IoCrucible._amount = amount;
        IoCrucible.refresh(true);
    }

    private static pickFrom(i: int): void {
        if (IoCrucible._to == i) {
            IoCrucible._to = IoCrucible._from;
        }
        IoCrucible._from = i;
        IoCrucible._amount = Math.min(IoCrucible._amount, IoCrucible.most());
        IoCrucible.refresh(true);
    }

    private static pickTo(i: int): void {
        if (IoCrucible._from == i) {
            IoCrucible._from = IoCrucible._to;
        }
        IoCrucible._to = i;
        IoCrucible._amount = Math.min(IoCrucible._amount, IoCrucible.most());
        IoCrucible.refresh(true);
    }

    /** The yard's amount of resource i (0-3) as the game shows it. */
    private static have(i: int): number {
        let r: any = BASE._resources ? BASE._resources[IoCrucible.RES[i]] : null;
        return r ? Math.max(0, Math.floor(Number(r.Get()))) : 0;
    }

    /** The room left for resource i in the yard's storage. */
    private static room(i: int): number {
        let max: number = BASE._resources ? Number(BASE._resources[IoCrucible.RES[i] + "max"]) || 0 : 0;
        return Math.max(0, Math.floor(max - IoCrucible.have(i)));
    }

    /** The most of the chosen resource that can be poured now: what the yard has, today's cap, the room for what comes back. */
    private static most(): number {
        let s: any = IoCrucible._state;
        let cfg: any = IoCrucible.config;
        if (!s || !cfg || s.closed) {
            return 0;
        }
        let most: number = Math.min(IoCrucible.have(IoCrucible._from), Math.max(0, Number(s.left) || 0));
        // no more than gives back what there is room for
        let room: number = IoCrucible.room(IoCrucible._to);
        let share: number = IoCrucible.rate(IoCrucible._from, IoCrucible._to, s.level | 0);
        while (most > 0 && share > 0 && IoCrucible.poured(IoCrucible._from, IoCrucible._to, most) > room) {
            let fit: number = Math.floor(room / share);
            most = fit < most ? fit : most - 1;
        }
        return Math.max(0, most);
    }

    /** Draws the numbers again; `setInput`: write the amount in the box too (not while the player types in it). */
    private static refresh(setInput: boolean): void {
        let ui: any = IoCrucible._ui;
        let s: any = IoCrucible._state;
        let cfg: any = IoCrucible.config;
        if (!ui || !IoCrucible.isOpen || !cfg) {
            return;
        }
        let win: any = IoCrucible._win;
        let level: int = s ? s.level | 0 : 1;
        let i: int = 0;
        while (i < 4) {
            CasinoUI.choose(ui.from[i].b, i == IoCrucible._from);
            CasinoUI.choose(ui.to[i].b, i == IoCrucible._to);
            let have: number = IoCrucible.have(i);
            CasinoUI.setText(ui.from[i].amount, have < 100000000 ? GLOBAL.FormatNumber(have) : IoCrucible.short(have));
            ui.to[i].amount.textColor = (i == IoCrucible._to ? 0x7CF0D0 : 0xD9C6A8) >>> 0;
            CasinoUI.setText(ui.to[i].amount, i == IoCrucible._from ? KEYS.Get("io_cru_swap") : (s ? IoCrucible.percent(IoCrucible.rate(IoCrucible._from, i, level)) + "%" : ""));
            i++;
        }
        // the lines from the chosen two to the crucible, and their tags
        let a: any = IoCrucible.link(0, IoCrucible._from);
        let b: any = IoCrucible.link(1, IoCrucible._to);
        let g: any = ui.lines.graphics;
        g.clear();
        g.lineStyle(6, 0xFF8A20, 1);
        g.moveTo(win.left + a.ax, win.top + a.ay);
        g.lineTo(win.left + a.bx, win.top + a.by);
        g.lineStyle(6, 0x5ADDBB, 1);
        g.moveTo(win.left + b.bx, win.top + b.by);
        g.lineTo(win.left + b.ax, win.top + b.ay);
        ui.tagPour.x = win.left + a.bx + a.dx * 10;
        ui.tagPour.y = win.top + a.by + a.dy * 10;
        ui.tagTake.x = win.left + b.bx + b.dx * 10;
        ui.tagTake.y = win.top + b.by + b.dy * 10;
        CasinoUI.setText(ui.rate, s ? IoCrucible.percent(IoCrucible.rate(IoCrucible._from, IoCrucible._to, level)) + "%" : "");
        if (setInput) {
            ui.input.text = String(IoCrucible._amount);
        }
        let most: number = IoCrucible.most();
        let at: number = most > 0 ? Math.max(0, Math.min(1, IoCrucible._amount / most)) : 0;
        let sw: int = IoCrucible.SLIDE_W;
        let sg: any = ui.slider.graphics;
        sg.clear();
        // (a see-through strip, so the whole height of the slider can be pressed)
        sg.beginFill(0, 0);
        sg.drawRect(-12, -14, sw + 24, 28);
        sg.endFill();
        sg.lineStyle(1, 0x6A4A38, 1);
        sg.beginFill(0x2A1A14, 1);
        sg.drawRoundRect(0, -4, sw, 8, 8, 8);
        sg.endFill();
        sg.lineStyle();
        if (at > 0) {
            let fm: Matrix = new Matrix();
            fm.createGradientBox(sw, 8, 0, 0, -4);
            sg.beginGradientFill(GradientType.LINEAR, [0xA8300C, 0xFF8A20], [1, 1], [0, 255], fm);
            sg.drawRoundRect(0, -4, sw * at, 8, 8, 8);
            sg.endFill();
        }
        ui.thumb.x = sw * at;
        if (!s) {
            CasinoUI.enable(ui.go, false);
            return;
        }
        CasinoUI.setText(ui.head, KEYS.Get("io_cru_level", { "v1": s.level }));
        CasinoUI.setHtml(ui.today, KEYS.Get("io_cru_today_cap", { "v1": GLOBAL.FormatNumber(Number(s.given)), "v2": GLOBAL.FormatNumber(Number(s.cap)), "v3": Math.round(IoCrucible.capShare(s.level | 0) * 100) }));
        let bw: int = (IoCrucible.W - 200) | 0;
        let done: number = Number(s.cap) > 0 ? Math.max(0, Math.min(1, Number(s.given) / Number(s.cap))) : 0;
        let bg: any = ui.bar.graphics;
        bg.clear();
        bg.lineStyle(1, 0x6A4A38, 1);
        bg.beginFill(0x2A1A14, 1);
        bg.drawRoundRect(0, 0, bw, 12, 12, 12);
        bg.endFill();
        bg.lineStyle();
        if (done > 0) {
            let bm: Matrix = new Matrix();
            bm.createGradientBox(bw, 12, 0, 0, 0);
            bg.beginGradientFill(GradientType.LINEAR, [0xA8300C, 0xFF8A20, 0xFFD060], [1, 1, 1], [0, 150, 255], bm);
            bg.drawRoundRect(1, 1, Math.max(10, (bw - 2) * done), 10, 10, 10);
            bg.endFill();
        }
        let amount: number = IoCrucible._amount;
        let gives: number = IoCrucible.poured(IoCrucible._from, IoCrucible._to, amount);
        let fromName: string = KEYS.Get(IoCrucible.NAMES[IoCrucible._from]);
        let toName: string = KEYS.Get(IoCrucible.NAMES[IoCrucible._to]);
        let problem: string = "";
        let min: number = Number(cfg.min) || 1;
        if (s.closed) {
            problem = String(s.closed);
        } else if (Number(s.left) <= 0) {
            problem = KEYS.Get("io_cru_err_cap", { "v1": GLOBAL.FormatNumber(Number(s.cap)) });
        } else if (amount <= 0) {
            problem = "";
        } else if (amount < min) {
            problem = KEYS.Get("io_cru_err_min", { "v1": GLOBAL.FormatNumber(min) });
        } else if (amount > IoCrucible.have(IoCrucible._from)) {
            problem = KEYS.Get("io_cru_err_have", { "v1": GLOBAL.FormatNumber(IoCrucible.have(IoCrucible._from)), "v2": fromName });
        } else if (amount > Number(s.left)) {
            problem = KEYS.Get("io_cru_err_left", { "v1": GLOBAL.FormatNumber(Number(s.left)) });
        } else if (gives > IoCrucible.room(IoCrucible._to)) {
            problem = KEYS.Get("io_cru_err_room", { "v1": GLOBAL.FormatNumber(IoCrucible.room(IoCrucible._to)), "v2": toName });
        }
        let rateLine: string = KEYS.Get("io_cru_rate", { "v1": fromName, "v2": toName, "v3": IoCrucible.percent(IoCrucible.rate(IoCrucible._from, IoCrucible._to, s.level | 0)) });
        CasinoUI.setHtml(ui.result, amount > 0 ? KEYS.Get("io_cru_result", { "v1": GLOBAL.FormatNumber(amount), "v2": fromName, "v3": "<font color=\"#7CF0D0\">" + GLOBAL.FormatNumber(gives), "v4": toName + "</font>" }) : "<font color=\"#F2D9B0\">" + rateLine + "</font>");
        CasinoUI.setHtml(ui.note, problem);
        CasinoUI.enable(ui.go, !IoCrucible._busy && problem == "" && amount > 0 && gives > 0);
    }

    // ---- the pour, shown (11 November, the owner's pick): pieces of what was poured jump from its button and drop
    // into the crucible as a stream of its colour runs in; the crucible flares; pieces of what was taken ride a
    // stream of its colour out to its button and fly on to the top bar. About 2.5 seconds; it decides nothing.
    private static readonly TINT: uint[] = [0xEFE6D0, 0x6A6A84, 0xF5C518, 0xFF6A1A];
    private static readonly SHINE: uint[] = [0xFFFFFF, 0xB4B4CC, 0xFFF0A0, 0xFFD060];
    private static readonly ANIM_MS: int = 2700;

    private static startAnim(from: int, to: int): void {
        let ui: any = IoCrucible._ui;
        let win: any = IoCrucible._win;
        if (!ui || !ui.fx || !IoCrucible.isOpen) {
            return;
        }
        let fx: Sprite = ui.fx;
        let a: any = IoCrucible.link(0, from);
        let b: any = IoCrucible.link(1, to);
        let ca: any = IoCrucible.spot(0, from);
        let cb: any = IoCrucible.spot(1, to);
        let anim: any = { "t0": getTimer(), "from": from, "to": to, "a": a, "b": b, "ca": ca, "cb": cb, "in": [], "out": [], "done": false };
        anim.streams = as3.as(fx.addChild(new Sprite()), Sprite);
        anim.flare = as3.as(fx.addChild(new Sprite()), Sprite);
        let fm: Matrix = new Matrix();
        fm.createGradientBox(190, 210, 0, -95, -117);
        anim.flare.graphics.beginGradientFill(GradientType.RADIAL, [0xFFF6C8, 0xFFC23A, 0xFF6A1A, 0xC82800], [1, 1, 1, 0], [0, 76, 148, 191], fm);
        anim.flare.graphics.drawEllipse(-52, -116, 104, 116);
        anim.flare.graphics.endFill();
        anim.flare.x = win.left + 320;
        anim.flare.y = win.top + 150;
        anim.flare.visible = false;
        let sizes: number[] = [28, 24, 28, 22, 26];
        let i: int = 0;
        while (i < 5) {
            let p: Sprite = as3.as(fx.addChild(IoCrucible.icon(from, sizes[i])), Sprite);
            p.visible = false;
            anim["in"].push({ "s": p, "size": sizes[i], "x": ca.x - 16 + ((i * 23) % 32), "y": ca.y - 8 + ((i * 11) % 16) });
            i++;
        }
        // where what was taken is shown in the top bar, in the window's own space
        let target: Point = new Point(win.left + cb.x, win.top - 60);
        try {
            let clip: any = UI2._top && UI2._top.mc ? UI2._top.mc["mcR" + (to + 1)] : null;
            if (clip && clip.parent) {
                target = win.mc.globalToLocal(clip.localToGlobal(new Point(22, 12)));
                anim.clip = clip;
            }
        } catch (e) {
        }
        i = 0;
        while (i < 7) {
            let r: Sprite = as3.as(fx.addChild(IoCrucible.icon(to, 22)), Sprite);
            r.visible = false;
            r.filters = [new GlowFilter(0x7CF0D0, 0.8, 6, 6, 2, 1)];
            anim["out"].push({ "s": r, "y": ((i * 7) % 10) - 5, "end": ((i * 29) % 36) - 18, "tx": target.x + ((i * 13) % 20) - 10, "ty": target.y + ((i * 7) % 10) - 5 });
            i++;
        }
        IoCrucible._anims.push(anim);
    }

    private static ease(t: number): number {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }

    /** A stream from (x0, y0) to (x1, y1): grown to `grow` (0-1), its light bands moving with `t`, at `alpha`. */
    private static stream(g: any, x0: number, y0: number, x1: number, y1: number, grow: number, t: number, alpha: number, tint: uint, shine: uint): void {
        if (grow <= 0 || alpha <= 0) {
            return;
        }
        let ex: number = x0 + (x1 - x0) * grow;
        let ey: number = y0 + (y1 - y0) * grow;
        g.lineStyle(11, 0x1A0D08, alpha * 0.8);
        g.moveTo(x0, y0);
        g.lineTo(ex, ey);
        g.lineStyle(8, tint, alpha);
        g.moveTo(x0, y0);
        g.lineTo(ex, ey);
        let len: number = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) || 1;
        let ux: number = (x1 - x0) / len;
        let uy: number = (y1 - y0) / len;
        let at: number = ((t * 0.09) % 22) - 22;
        g.lineStyle(4, shine, alpha * 0.9);
        while (at < len * grow) {
            let s0: number = Math.max(0, at);
            let s1: number = Math.min(len * grow, at + 9);
            if (s1 > s0) {
                g.moveTo(x0 + ux * s0, y0 + uy * s0);
                g.lineTo(x0 + ux * s1, y0 + uy * s1);
            }
            at += 22;
        }
    }

    /** Moves every pour being shown on by a frame (asked by the window on each frame). */
    private static animate(win: any): void {
        let list: any[] = IoCrucible._anims;
        if (!list || list.length == 0) {
            return;
        }
        let now: int = getTimer() | 0;
        let L: number = win.left;
        let T: number = win.top;
        let n: int = list.length - 1;
        while (n >= 0) {
            let an: any = list[n];
            let t: number = now - an.t0;
            if (t >= IoCrucible.ANIM_MS) {
                IoCrucible.endAnim(an);
                list.splice(n, 1);
                n--;
                continue;
            }
            // the pieces of what was poured: up out of their button, over, and down into the crucible
            let i: int = 0;
            while (i < an["in"].length) {
                let p: any = an["in"][i];
                let u: number = (t - i * 70) / 640;
                if (u <= 0 || u >= 1.12) {
                    p.s.visible = false;
                } else {
                    let k: number = Math.min(1, u);
                    let mx: number = 320 - 8 + i * 4;
                    let my: number = 150;
                    let cx: number = p.x + (mx - p.x) * 0.7;
                    let cy: number = Math.min(p.y, my) - 110;
                    let q: number = 1 - k;
                    p.s.visible = true;
                    p.s.x = L + q * q * p.x + 2 * q * k * cx + k * k * mx;
                    p.s.y = T + q * q * p.y + 2 * q * k * cy + k * k * my;
                    p.s.rotation = k * 360;
                    p.s.scaleX = p.s.scaleY = (p.size / 32) * (0.7 + 0.45 * Math.sin(k * Math.PI));
                    p.s.alpha = u < 0.1 ? u * 10 : (u > 1 ? Math.max(0, 1 - (u - 1) / 0.12) : 1);
                }
                i++;
            }
            // the two streams
            let g: any = an.streams.graphics;
            g.clear();
            IoCrucible.stream(g, L + an.a.ax, T + an.a.ay, L + an.a.bx, T + an.a.by, (t - 180) / 370, t, t < 1100 ? 1 : 1 - (t - 1100) / 190, IoCrucible.TINT[an.from], IoCrucible.SHINE[an.from]);
            IoCrucible.stream(g, L + an.b.bx, T + an.b.by, L + an.b.ax, T + an.b.ay, Math.min(1, (t - 1290) / 370), t, t < 2110 ? 1 : 1 - (t - 2110) / 190, IoCrucible.TINT[an.to], IoCrucible.SHINE[an.to]);
            // the flare
            let f: Sprite = an.flare;
            if (t < 830 || t > 1560) {
                f.visible = false;
            } else {
                f.visible = true;
                let up: number = t < 1100 ? IoCrucible.ease((t - 830) / 270) : 1 - IoCrucible.ease((t - 1100) / 460);
                f.scaleX = 0.3 + 0.7 * up;
                f.scaleY = 0.15 + 1.0 * up;
                f.alpha = Math.min(1, up * 1.4);
            }
            // the pieces of what was taken: along the stream to their button, then up to the top bar
            let bx: number = an.cb.x;
            let by: number = an.cb.y;
            i = 0;
            while (i < an["out"].length) {
                let r: any = an["out"][i];
                let rt: number = t - 1380 - i * 60;
                if (rt <= 0 || rt >= 1200) {
                    r.s.visible = false;
                } else {
                    r.s.visible = true;
                    let x: number = 0;
                    let y: number = 0;
                    if (rt < 460) {
                        let k1: number = IoCrucible.ease(rt / 460);
                        x = L + an.b.bx + (bx + r.end - an.b.bx) * k1;
                        y = T + an.b.by + (by + r.y - an.b.by) * k1;
                        r.s.scaleX = r.s.scaleY = (22 / 32) * (0.6 + 0.4 * k1);
                        r.s.alpha = Math.min(1, rt / 90);
                    } else if (rt < 600) {
                        let k2: number = (rt - 460) / 140;
                        x = L + bx + r.end;
                        y = T + by + r.y - 8 * k2;
                        r.s.scaleX = r.s.scaleY = (22 / 32) * (1 + 0.25 * k2);
                        r.s.alpha = 1;
                    } else {
                        let k3: number = IoCrucible.ease((rt - 600) / 500);
                        let sx: number = L + bx + r.end;
                        let sy: number = T + by + r.y - 8;
                        let mx2: number = sx + (r.tx - sx) * 0.35;
                        let my2: number = Math.min(sy, r.ty) - 40;
                        let q2: number = 1 - k3;
                        x = q2 * q2 * sx + 2 * q2 * k3 * mx2 + k3 * k3 * r.tx;
                        y = q2 * q2 * sy + 2 * q2 * k3 * my2 + k3 * k3 * r.ty;
                        r.s.scaleX = r.s.scaleY = (22 / 32) * (1.25 - 0.45 * k3);
                        r.s.alpha = rt > 1100 ? Math.max(0, 1 - (rt - 1100) / 100) : 1;
                    }
                    r.s.x = x;
                    r.s.y = y;
                    r.s.rotation = rt * 0.42;
                }
                i++;
            }
            // the top bar's resource lights up as the first pieces land
            if (!an.lit && t >= 2440 && an.clip) {
                an.lit = true;
                an.was = an.clip.filters;
                an.clip.filters = [new GlowFilter(0x7CF0D0, 0.9, 12, 12, 2, 2)];
            }
            n--;
        }
    }

    private static endAnim(an: any): void {
        if (an.done) {
            return;
        }
        an.done = true;
        let all: any[] = [an.streams, an.flare];
        let i: int = 0;
        while (i < an["in"].length) {
            all.push(an["in"][i].s);
            i++;
        }
        i = 0;
        while (i < an["out"].length) {
            all.push(an["out"][i].s);
            i++;
        }
        i = 0;
        while (i < all.length) {
            if (all[i] && all[i].parent) {
                all[i].parent.removeChild(all[i]);
            }
            i++;
        }
        if (an.lit && an.clip) {
            an.clip.filters = an.was || [];
        }
    }

    /** 12.3M, 450K, 900: for the small "room" line. */
    private static short(n: number): string {
        if (n >= 1000000) {
            return (Math.floor(n / 100000) / 10) + "M";
        }
        if (n >= 10000) {
            return Math.floor(n / 1000) + "K";
        }
        return GLOBAL.FormatNumber(n);
    }

    // ---- the server
    private static call(path: string, params: any[], onDone: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "crucible/" + path, params, (response: any): void => {
            if (!response) {
                onDone(KEYS.Get("io_t3t_srv_try"), null);
                return;
            }
            if (response.error !== 0 && response.error !== "0") {
                onDone(String(response.error || KEYS.Get("io_t3t_srv_try")), null);
                return;
            }
            onDone(null, response);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_t3t_srv_conn"), null);
        });
    }

    private static load(): void {
        let win: any = IoCrucible._win;
        IoCrucible.call("status", [], (error: string, response: any): void => {
            if (IoCrucible._win !== win || !IoCrucible.isOpen) {
                return;
            }
            if (error) {
                CasinoUI.setHtml(IoCrucible._ui.note, IoWin.errRef(error));
                return;
            }
            IoCrucible._state = response;
            IoCrucible.refresh(true);
        });
    }

    /** Asks the server to pour (after any save on its way, so what the server sees is the yard's). */
    private static pour(): void {
        if (IoCrucible._busy || !IoCrucible._state) {
            return;
        }
        let from: int = IoCrucible._from;
        let to: int = IoCrucible._to;
        let amount: number = IoCrucible._amount;
        let win: any = IoCrucible._win;
        IoCrucible._busy = true;
        IoCrucible.refresh(false);
        let tries: int = 0;
        let go: Function = null;
        go = (): void => {
            if (BASE._saving && tries++ < 40) {
                setTimeout(go, 250);
                return;
            }
            IoCrucible.call("pour", [["from", IoCrucible.RES[from]], ["to", IoCrucible.RES[to]], ["amount", amount]], (error: string, response: any): void => {
                IoCrucible._busy = false;
                if (error) {
                    if (IoCrucible._win === win && IoCrucible.isOpen) {
                        CasinoUI.setHtml(IoCrucible._ui.note, IoWin.errRef(error));
                        CasinoUI.enable(IoCrucible._ui.go, true);
                    } else {
                        GLOBAL.Message(error);
                    }
                    return;
                }
                IoCrucible.applyPour(from, to, Number(response.took) || 0, Number(response.gave) || 0);
                SOUNDS.Play("chaching", 0.6);
                IoCrucible._state = response;
                IoCrucible._amount = 0;
                if (IoCrucible._win === win && IoCrucible.isOpen) {
                    IoCrucible.startAnim(from, to);
                    IoCrucible.refresh(true);
                    CasinoUI.setHtml(IoCrucible._ui.note, "<font color=\"#9CFF8A\">" + KEYS.Get("io_cru_done", { "v1": GLOBAL.FormatNumber(Number(response.took)), "v2": KEYS.Get(IoCrucible.NAMES[from]), "v3": GLOBAL.FormatNumber(Number(response.gave)), "v4": KEYS.Get(IoCrucible.NAMES[to]) }) + "</font>");
                }
            });
        };
        if (!BASE._saving) {
            BASE.Save();
        }
        setTimeout(go, 400);
    }

    /**
     * The server took `took` of one resource from the save and put `gave` of another in: the yard shows both, and
     * sends neither with its next save (each is taken back out of the change it is about to send).
     */
    public static applyPour(from: int, to: int, took: number, gave: number): void {
        let f: string = IoCrucible.RES[from];
        let t: string = IoCrucible.RES[to];
        // (13 November: a pour isn't a purchase: no Devil's Contract discount on it)
        BASE._ioPlainCharge = true;
        let ioTaken: int = took > 0 ? BASE.Charge(from + 1, took) : 0;
        BASE._ioPlainCharge = false;
        if (took > 0 && ioTaken > 0 && !GLOBAL.ioFreeBuild()) {
            if (BASE._deltaResources && BASE._deltaResources[f]) {
                BASE._deltaResources[f].Add(took);
            }
            if (BASE._hpDeltaResources && BASE._hpDeltaResources[f] != null) {
                BASE._hpDeltaResources[f] += took;
            }
        }
        if (gave > 0) {
            let got: number = Number(BASE.Fund(to + 1, gave, true));
            if (got > 0) {
                if (BASE._deltaResources && BASE._deltaResources[t]) {
                    BASE._deltaResources[t].Add(-got);
                }
                if (BASE._hpDeltaResources && BASE._hpDeltaResources[t] != null) {
                    BASE._hpDeltaResources[t] -= got;
                }
            }
        }
    }

    // ---- "nearly full": a line at the top offers to pour it
    /** Asked by the building as it ticks (SOULCRUCIBLE.TickFast): about once a second it looks. */
    public static nearFull(building: SOULCRUCIBLE): void {
        if (++IoCrucible._nagTick < 40) {
            return;
        }
        IoCrucible._nagTick = 0;
        if (!IoCrucible.config || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard || IoCrucible.isOpen || !BASE._resources) {
            return;
        }
        if (!building || building._lvl.Get() < 1 || building._countdownBuild.Get() > 0 || building.health < building.maxHealth) {
            return;
        }
        let now: int = getTimer() | 0;
        let i: int = 0;
        while (i < 4) {
            let max: number = Number(BASE._resources[IoCrucible.RES[i] + "max"]) || 0;
            if (max > 0 && IoCrucible.have(i) >= max * IoCrucible.NEAR_FULL && !(now - (IoCrucible._nagged[i] | 0) < IoCrucible.NAG_MS && IoCrucible._nagged[i] != null)) {
                IoCrucible._nagged[i] = now;
                let n: int = i;
                IoToast.Show(KEYS.Get("io_cru_full", { "v1": KEYS.Get(IoCrucible.NAMES[i]) }), 9000, KEYS.Get("io_cru_full_btn"), (): void => {
                    IoCrucible.Show(n);
                });
                return;
            }
            i++;
        }
    }
}
