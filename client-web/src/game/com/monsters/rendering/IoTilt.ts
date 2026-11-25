import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, DisplayObjectContainer, Shape, Sprite, ioUpright, ioUprightRefresh } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { getTimer, setTimeout } from "flash/utils";
import { DropShadowFilter } from "flash/filters";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BFOUNDATION, Button_CLIP, GLOBAL, INFERNO_DESCENT_POPUPS, MAP, SOUNDS } from "@game";

/**
 * Inferno-only (14 October, the user's): the yard seen from another pitch, -10 to +20 degrees from the game's own 30
 * degrees above the ground (so 20 to 50; the user's limits, the same afternoon, after -30 to +30). For admins only for
 * now (flag io_admin): the Tilt button by Designer opens its slider; the choice is kept in this browser (a kept tilt
 * outside the limits is brought inside them).
 *
 * No new pictures: the ground (and what lies on it: shadows, footprints, the ground's effects) is squashed or stretched
 * up and down by k = sin(30 + tilt) / sin(30), and what stands on it (buildings, monsters, workers, their hit areas
 * and bars) keeps its own height, standing where its foot now is. The yard's ground (MAP._GROUND) is scaled by k up
 * and down, so where the mouse is on the yard is as ever and nothing in the game's rules sees the tilt; the canvas the
 * yard is drawn in is k times its height and shown at 1/k (Renderer.ioTilt draws into it), so it stays sharp; the
 * display layers' standing children are kept upright by flash/display's ioUpright.
 */
export class IoTilt extends ASObject {
    public static readonly MIN: number = -10;

    public static readonly MAX: number = 20;

    private static readonly KEY: string = "io_tilt";

    private static _deg: number = NaN;

    private static _panel: Sprite = null;

    /** The k the yard is drawn at now (the tilt's, and a nod's while one plays). */
    public static canvasK: number = 1;

    public static get allowed(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && GLOBAL._flags && (GLOBAL._flags.io_admin | 0) == 1);
    }

    /** The tilt chosen (degrees; 0 when not an admin). */
    public static get deg(): number {
        if (IoTilt._deg !== IoTilt._deg) {
            let v: number = 0;
            try {
                v = Number(window.localStorage.getItem(IoTilt.KEY)) || 0;
            } catch (e) {
                v = 0;
            }
            IoTilt._deg = Math.max(IoTilt.MIN, Math.min(IoTilt.MAX, v));
        }
        return IoTilt.allowed ? IoTilt._deg : 0;
    }

    /** The ground's squash for a tilt: sin(pitch) / sin(30 degrees). */
    public static kOf(deg: number): number {
        // (exactly 1 at the game's own pitch: nothing is tilted then)
        if (deg === 0) {
            return 1;
        }
        let pitch: number = Math.max(3, Math.min(87, 30 + deg));
        return Math.sin(pitch * Math.PI / 180) / 0.5;
    }

    public static get k(): number {
        return IoTilt.kOf(IoTilt.deg);
    }

    /** A tilt chosen: kept, and the yard redrawn at it. */
    public static set(deg: number): void {
        deg = Math.round(Math.max(IoTilt.MIN, Math.min(IoTilt.MAX, deg)));
        if (deg === IoTilt._deg) {
            return;
        }
        IoTilt._deg = deg;
        try {
            window.localStorage.setItem(IoTilt.KEY, String(deg));
        } catch (e) {
        }
        IoTilt.apply();
        if (IoTilt._refresh != null) {
            IoTilt._refresh();
        }
    }

    /** The open slider's own redraw (its knob and label), or null. */
    private static _refresh: Function = null;

    /** The map's layers whose children stand (kept upright). */
    private static uprightLayers(): DisplayObjectContainer[] {
        return [MAP._BUILDINGTOPS, MAP._BUILDINGINFO, MAP._PROJECTILES, MAP._FIREBALLS, MAP._RESOURCES].filter((l) => l != null) as DisplayObjectContainer[];
    }

    /**
     * The tilt put on the map now on screen (after MAP.Setup, and whenever it changes): the canvas's height (room for
     * a nod's dip too, when nods play), its scale and the ground's, the standing layers, the camera kept on the same
     * spot. A nod going on stops (the yard at its tilt).
     */
    public static apply(): void {
        let map: any = MAP.instance;
        if (!MAP._GROUND || !map || !MAP._canvas || !MAP._canvasContainer) {
            return;
        }
        IoTilt.nodStop(false);
        let H: int = MAP.MAP_HEIGHT;
        let room: number = IoTilt.nodAllowed ? IoTilt.NOD_ROOM : 0;
        let h: int = Math.max(2, Math.ceil(H * IoTilt.kOf(IoTilt.deg + room))) | 0;
        if (MAP._canvas.height != h) {
            let old: BitmapData = MAP._canvas;
            MAP._canvas = new BitmapData(MAP._canvas.width, h, false, 0);
            MAP._canvasContainer.bitmapData = MAP._canvas;
            map.ioCanvasChanged(MAP._canvas);
            old.dispose();
        }
        for (let l of IoTilt.uprightLayers()) {
            (l as any).$ioUpright = true;
        }
        IoTilt.live(IoTilt.k, true);
        BFOUNDATION.updateAllRasterData();
        map.ioRedrawAll();
    }

    /**
     * The yard drawn at k (no new canvas: it is tall enough): the canvas shown at 1/k, the ground at k, what stands kept
     * upright, the spot in the middle of the screen kept there (unless the yard is being dragged).
     */
    private static live(k: number, keepSpot: boolean): void {
        let map: any = MAP.instance;
        let before: number = IoTilt.canvasK;
        let midY: number = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height / 2;
        let localMid: number = (midY - MAP._GROUND.y) / (MAP._GROUND.scaleY || 1);
        IoTilt.canvasK = k;
        MAP._canvasContainer.scaleY = 1 / k;
        MAP._GROUND.scaleY = MAP._GROUND.scaleX * k;
        ioUpright.k = k;
        ioUprightRefresh(IoTilt.uprightLayers());
        if (keepSpot && before !== k && !MAP._dragging) {
            MAP._GROUND.y = Math.round(midY - localMid * MAP._GROUND.scaleY);
            MAP.ty = MAP._GROUND.y;
        }
        map.resizeViewRect();
    }

    // ---- nods (14 October, the user's): the yard's pitch dips a little and springs back when something happens:
    // a building placed, moved, built, upgraded or recycled; the Under Hall upgraded or destroyed; monsters flung
    // in landing; a champion dying; the Inferno emergence event; Moloch attacking; the yard first seen, and the
    // Descent's yards. For admins, as the tilt, unless flag io_nod says 2 (everyone) or 0 (no one); an admin can turn
    // them off in the Tilt panel (kept in the browser). Off screen, nothing; one at a time (a bigger one takes over).

    /** The degrees a nod may dip past the tilt (the canvas has room for them). */
    public static readonly NOD_ROOM: number = 2.5;

    /** Strengths, in degrees of pitch at the dip. */
    // (the user's, the same afternoon: quicker and gentler, about half as deep)
    public static readonly VERY_LIGHT: number = 0.4;
    public static readonly LIGHT: number = 0.8;
    public static readonly MEDIUM: number = 1.3;
    public static readonly HEAVY: number = 2;

    private static readonly OFF_KEY: string = "io_nod_off";

    private static _nodAmp: number = 0;
    private static _nodScale: number = 1;
    private static _nodStart: number = 0;
    private static _nodPeriod: number = 500;
    private static _nodTau: number = 230;
    private static _nodOn: boolean = false;
    private static _nodOffLocal: number = -1;

    /** Nods started since the game opened (tests). */
    public static nodCount: int = 0;

    /** Do nods play for this player? */
    public static get nodAllowed(): boolean {
        if (!GLOBAL.INFERNO_ONLY) {
            return false;
        }
        let f: number = GLOBAL._flags && GLOBAL._flags.hasOwnProperty("io_nod") ? Number(GLOBAL._flags.io_nod) : 1;
        if (!(f > 0)) {
            return false;
        }
        if (IoTilt.nodTurnedOff) {
            return false;
        }
        return f >= 2 || IoTilt.allowed;
    }

    /** Turned off in this browser (the Tilt panel). */
    public static get nodTurnedOff(): boolean {
        if (IoTilt._nodOffLocal < 0) {
            let v: string = null;
            try {
                v = window.localStorage.getItem(IoTilt.OFF_KEY);
            } catch (e) {
            }
            IoTilt._nodOffLocal = v == "1" ? 1 : 0;
        }
        return IoTilt._nodOffLocal == 1;
    }

    public static setNodsOff(off: boolean): void {
        IoTilt._nodOffLocal = off ? 1 : 0;
        try {
            window.localStorage.setItem(IoTilt.OFF_KEY, off ? "1" : "0");
        } catch (e) {
        }
        IoTilt.apply();
    }

    /** Is a yard point (the ground's own, iso) on screen (a margin round it)? */
    private static onScreen(x: number, y: number): boolean {
        if (!(x === x) || !(y === y)) {
            return true;
        }
        let g: any = MAP._GROUND.localToGlobal(new Point(x, y));
        let s: any = GLOBAL._ROOT.stage;
        let left: number = -(s.stageWidth - GLOBAL._SCREENINIT.width) / 2;
        let top: number = -(s.stageHeight - GLOBAL._SCREENINIT.height) / 2;
        return g.x > left - 80 && g.x < left + s.stageWidth + 80 && g.y > top - 80 && g.y < top + s.stageHeight + 160;
    }

    /**
     * A nod: the pitch dips by `deg` and springs back (a slow one: over a second, else in about a third of one), after
     * `delayMs`.
     * At (x, y) on the yard (iso), if given: nothing when that is off screen. A smaller nod than what is left of the one
     * going on does nothing.
     */
    public static nod(deg: number, x: number = NaN, y: number = NaN, slow: boolean = false, delayMs: number = 0): void {
        // (QoL #229: none with Reduce motion)
        if (GLOBAL.ioReduceMotion) {
            return;
        }
        if (!IoTilt.nodAllowed || !MAP._GROUND || !MAP._canvas || !MAP._canvasContainer || !GLOBAL._render || GLOBAL._catchup) {
            return;
        }
        if (delayMs > 0) {
            setTimeout((): void => {
                IoTilt.nod(deg, x, y, slow, 0);
            }, delayMs);
            return;
        }
        if (!IoTilt.onScreen(x, y)) {
            return;
        }
        let now: number = getTimer();
        if (IoTilt._nodOn && deg <= IoTilt._nodAmp * Math.exp(-(now - IoTilt._nodStart) / IoTilt._nodTau)) {
            return;
        }
        deg = Math.min(deg, IoTilt.NOD_ROOM);
        IoTilt._nodAmp = deg;
        IoTilt._nodPeriod = slow ? 1000 : 300;
        IoTilt._nodTau = slow ? 450 : 120;
        // (the dip's peak is deg: the curve's highest point, found once)
        let peak: number = 0;
        for (let t: number = 0; t < IoTilt._nodPeriod; t += 5) {
            peak = Math.max(peak, Math.exp(-t / IoTilt._nodTau) * Math.sin(2 * Math.PI * t / IoTilt._nodPeriod));
        }
        IoTilt._nodScale = peak > 0 ? 1 / peak : 1;
        IoTilt._nodStart = now;
        ++IoTilt.nodCount;
        if (!IoTilt._nodOn) {
            IoTilt._nodOn = true;
            GLOBAL._ROOT.stage.addEventListener(Event.ENTER_FRAME, IoTilt.nodFrame);
        }
    }

    /** The pitch a nod adds now (degrees). */
    public static get nodNow(): number {
        if (!IoTilt._nodOn) {
            return 0;
        }
        let t: number = getTimer() - IoTilt._nodStart;
        return IoTilt._nodAmp * IoTilt._nodScale * Math.exp(-t / IoTilt._nodTau) * Math.sin(2 * Math.PI * t / IoTilt._nodPeriod);
    }

    private static nodFrame(e: Event = null): void {
        if (!MAP._GROUND || !MAP._canvas || !MAP._canvasContainer) {
            IoTilt.nodStop(false);
            return;
        }
        let t: number = getTimer() - IoTilt._nodStart;
        if (t > IoTilt._nodTau * 6) {
            IoTilt.nodStop(true);
            return;
        }
        IoTilt.live(IoTilt.kOf(IoTilt.deg + IoTilt.nodNow), true);
    }

    /** The nod over: the yard back at its tilt, the canvas below the yard's foot cleared (a dip drew there). */
    private static nodStop(settle: boolean): void {
        if (!IoTilt._nodOn) {
            return;
        }
        IoTilt._nodOn = false;
        IoTilt._nodAmp = 0;
        GLOBAL._ROOT.stage.removeEventListener(Event.ENTER_FRAME, IoTilt.nodFrame);
        if (settle && MAP._GROUND && MAP._canvas) {
            IoTilt.live(IoTilt.k, true);
            let y0: int = Math.floor(MAP.MAP_HEIGHT * IoTilt.k) | 0;
            if (y0 < MAP._canvas.height) {
                MAP._canvas.fillRect(new Rectangle(0, y0, MAP._canvas.width, MAP._canvas.height - y0), 0xFF000000);
            }
        }
    }

    /** The yard ready (BASE, after its load): the first one of the session, and the Descent's, appear with a slow nod. */
    private static _seenYard: boolean = false;

    public static yardReady(): void {
        let first: boolean = !IoTilt._seenYard;
        IoTilt._seenYard = true;
        let descent: boolean = false;
        try {
            descent = INFERNO_DESCENT_POPUPS.isInDescent();
        } catch (e) {
        }
        if (first || descent) {
            IoTilt.nod(IoTilt.MEDIUM, NaN, NaN, true, 600);
        }
    }

    /** A champion (one of the overworld's, Korath, Drull, Ashkarr, Rimegrave, the Basilisk)? */
    public static isChampion(id: string): boolean {
        return !!id && (id.charAt(0) == "G" || id == "IC9" || id == "IC10" || id == "IC24" || id == "IC25" || id == "IC32");
    }

    /** The ground's scale up and down for a zoom (the tilt's k times it). */
    public static groundScaleY(zoom: number): number {
        return zoom * IoTilt.canvasK;
    }

    // ---- the slider (admins)

    public static Toggle(e: MouseEvent = null): void {
        SOUNDS.Play("click1");
        if (IoTilt._panel && IoTilt._panel.parent) {
            IoTilt._panel.parent.removeChild(IoTilt._panel);
            IoTilt._panel = null;
            return;
        }
        IoTilt.Show();
    }

    public static Show(): void {
        if (!IoTilt.allowed) {
            return;
        }
        const W: int = 300, Hh: int = 74, TRACK: int = 240;
        let p: Sprite = new Sprite();
        p.name = "ioTiltPanel";
        p.graphics.lineStyle(2, 0x6E4A22, 1);
        p.graphics.beginFill(0x231811, 0.94);
        p.graphics.drawRoundRect(0, 0, W, Hh, 12, 12);
        p.graphics.endFill();
        p.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let label: TextField = new TextField();
        let tf: TextFormat = new TextFormat("Verdana", 11, 0xFFD24A, true);
        tf.align = TextFormatAlign.LEFT;
        label.defaultTextFormat = tf;
        label.selectable = false;
        label.mouseEnabled = false;
        label.width = 150;
        label.height = 18;
        label.x = 12;
        label.y = 8;
        label.name = "ioTiltLabel";
        p.addChild(label);
        let track: Sprite = new Sprite();
        track.name = "ioTiltTrack";
        track.x = 30;
        track.y = 44;
        track.buttonMode = true;
        // (a tall hit area round the line)
        track.graphics.beginFill(0x000000, 0.01);
        track.graphics.drawRect(-10, -12, TRACK + 20, 24);
        track.graphics.endFill();
        track.graphics.lineStyle(4, 0x6E4A22, 1);
        track.graphics.moveTo(0, 0);
        track.graphics.lineTo(TRACK, 0);
        track.graphics.lineStyle(2, 0xC9A060, 1);
        for (let d: int = IoTilt.MIN; d <= IoTilt.MAX; d += 5) {
            let tx: number = (d - IoTilt.MIN) / (IoTilt.MAX - IoTilt.MIN) * TRACK;
            track.graphics.moveTo(tx, -6);
            track.graphics.lineTo(tx, 6);
        }
        p.addChild(track);
        let knob: Shape = new Shape();
        knob.graphics.lineStyle(2, 0x3A2A18, 1);
        knob.graphics.beginFill(0xFFD24A, 1);
        knob.graphics.drawCircle(0, 0, 8);
        knob.graphics.endFill();
        knob.y = 0;
        track.addChild(knob);
        let show = (): void => {
            let d: number = IoTilt.deg;
            knob.x = (d - IoTilt.MIN) / (IoTilt.MAX - IoTilt.MIN) * TRACK;
            label.text = "Tilt " + (d > 0 ? "+" : "") + d + "° (pitch " + (30 + d) + "°)";
        };
        let fromMouse = (): void => {
            let x: number = Math.max(0, Math.min(TRACK, track.mouseX));
            IoTilt.set(IoTilt.MIN + x / TRACK * (IoTilt.MAX - IoTilt.MIN));
            show();
        };
        let dragging: boolean = false;
        track.addEventListener(MouseEvent.MOUSE_DOWN, (ev: MouseEvent): void => {
            dragging = true;
            fromMouse();
            ev.stopPropagation();
        });
        let move = (ev: MouseEvent): void => {
            if (dragging) {
                fromMouse();
            }
        };
        let up = (ev: MouseEvent): void => {
            dragging = false;
        };
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, up);
        p.addEventListener("removedFromStage", (): void => {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, up);
        });
        let reset: Button_CLIP = new Button_CLIP();
        reset.Setup("0", false, 34, 22);
        reset.name = "ioTiltReset";
        reset.x = W - 46;
        reset.y = 6;
        reset.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoTilt.set(0);
            show();
        });
        p.addChild(reset);
        // (nods: on or off in this browser)
        let nods: Button_CLIP = new Button_CLIP();
        let nodsLabel = (): void => {
            nods.Setup(IoTilt.nodTurnedOff ? "Nods: off" : "Nods: on", false, 84, 22);
        };
        nodsLabel();
        nods.name = "ioTiltNods";
        nods.x = W - 140;
        nods.y = 6;
        nods.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoTilt.setNodsOff(!IoTilt.nodTurnedOff);
            nodsLabel();
            if (!IoTilt.nodTurnedOff) {
                IoTilt.nod(IoTilt.LIGHT);
            }
        });
        p.addChild(nods);
        show();
        IoTilt._refresh = show;
        p.addEventListener("removedFromStage", (): void => {
            if (IoTilt._refresh === show) {
                IoTilt._refresh = null;
            }
        });
        p.x = Math.round(GLOBAL._SCREENCENTER.x - W / 2);
        p.y = 70;
        GLOBAL._layerTop.addChild(p);
        IoTilt._panel = p;
    }
}
