import * as as3 from "as3";
import { int } from "as3";
import { Shape, Sprite, Stage } from "flash/display";
import { Event, MouseEvent, TouchEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeGame, CasinoUI, GLOBAL, IoPinchZoom, KEYS } from "@game";

/**
 * Inferno-only (7 October, the user's: "make every game mobile compatible"): on-screen controls for the arcade
 * games played with keys, on phones and tablets (GLOBAL.ioOnPhone). A stick (bottom left) and buttons (bottom
 * right, or where a game puts them) that press the game's own keys (ArcadeGame.keyDown / keyUp), so the
 * games play exactly as with a keyboard. Each control follows its own finger (TouchEvents: several at once,
 * the stick and a button together); the first finger also works as the mouse, so a control pressed with it
 * (or with a mouse) works too. Presses on the controls don't reach the game (a tap on SHOVE isn't a click on
 * the arena). Two fingers on the controls don't zoom the yard behind (IoPinchZoom.paused).
 *
 * The stick: "8" (eight ways: arrows, diagonals as two), "4" (four ways: the arrow nearest) or "analog" (the
 * same keys, and stickX / stickY for a game that steers by angle).
 *
 * QoL #222: the player's own layout, from the page's settings (Touch controls, kept in the browser: padLeft,
 * padSize, padOpacity in GLOBAL.ioPageSettings), read when a game starts: left-handed (a game with a stick: its
 * layout mirrored, the stick on the right and the buttons on the left), a size (each control and its distance from its corner of the
 * game's area scaled together, so they keep clear of each other) and an opacity.
 */
export class IoTouchPad extends Sprite {
    static {
        as3.fields(this, { _game: null, _stickMode: null, _stick: null, _knob: null, _stickAt: null, _stickId: -2, stickX: 0, stickY: 0, _stickKeys: null, _buttons: null, _stage: null, _ioLeft: false, _ioSize: 1 });
    }

    public static readonly STICK_R: number = 58;

    private static readonly KNOB_R: number = 26;

    private static readonly DEAD: number = 0.3;

    /** How many pads are up (pinch zoom waits while any is). */
    private static _up: int = 0;
    private _game: ArcadeGame;
    private _stickMode: string;
    private _stick: Sprite;
    private _knob: Shape;
    private _stickAt: Point;
    /** The finger on the stick (-1: the mouse, NaN-ish -2: none). */
    private _stickId: int;
    /** -1 to 1 each way, while the stick is held. */
    public stickX: number;
    public stickY: number;
    /** The keys the stick holds down. */
    private _stickKeys: any;
    /** [{sprite, code, id (finger, -2 none)}] */
    private _buttons: any[];
    private _stage: Stage;
    /** QoL #222: mirrored for the left-handed, and how big (1: as the game set it). */
    private _ioLeft: boolean;
    private _ioSize: number;

    /**
     * opts: {stick: "8" | "4" | "analog" | null, buttons: [{label, code, x?, y?, r?}]} (x, y: the button's
     * middle in the game's area; by default in a row from the bottom right).
     */
    public $ctor(game?: ArcadeGame, opts?: any): void {
        this._stickKeys = {};
        this._buttons = [];
        super.$ctor();
        this._game = game;
        this.name = "ioTouchPad";
        this.mouseEnabled = false;
        // (QoL #222: the page's Touch controls settings)
        if (GLOBAL.INFERNO_ONLY) {
            let page: any = GLOBAL.ioPageSettings || {};
            // (a game with a stick: buttons alone, as Magma Stack's LEFT and RIGHT, keep their sides)
            this._ioLeft = page.padLeft === true && !!(opts && opts.stick);
            let size: number = Number(page.padSize);
            this._ioSize = isNaN(size) || size <= 0 ? 1 : Math.max(0.6, Math.min(1.5, size));
            let alpha: number = page.padOpacity == null ? 1 : Number(page.padOpacity);
            this.alpha = isNaN(alpha) ? 1 : Math.max(0.2, Math.min(1, alpha));
        }
        this._stickMode = opts.stick ? String(opts.stick) : null;
        if (this._stickMode) {
            this._stickAt = new Point(opts.stickX != null ? Number(opts.stickX) : 92, opts.stickY != null ? Number(opts.stickY) : ArcadeGame.GH - 92);
            this._stick = new Sprite();
            this._stick.name = "ioTouchStick";
            this._stickAt = this.ioPlace(this._stickAt);
            this._stick.x = this._stickAt.x;
            this._stick.y = this._stickAt.y;
            this._stick.scaleX = this._stick.scaleY = this._ioSize;
            let base: Shape = new Shape();
            base.graphics.lineStyle(2, 16766346, 0.55);
            base.graphics.beginFill(0, 0.28);
            base.graphics.drawCircle(0, 0, IoTouchPad.STICK_R);
            base.graphics.endFill();
            // (a bigger area than it looks: a thumb that slips off the edge still steers)
            base.graphics.lineStyle();
            base.graphics.beginFill(0, 0.001);
            base.graphics.drawCircle(0, 0, IoTouchPad.STICK_R + 26);
            base.graphics.endFill();
            this._stick.addChild(base);
            this._knob = new Shape();
            this._knob.graphics.beginFill(16766346, 0.5);
            this._knob.graphics.drawCircle(0, 0, IoTouchPad.KNOB_R);
            this._knob.graphics.endFill();
            this._stick.addChild(this._knob);
            this.control(this._stick, as3.bind(this, this.stickBegin), as3.bind(this, this.stickMouse));
            this.addChild(this._stick);
        }
        let list: any[] = as3.as(opts.buttons, Array) || [];
        let i: int = 0;
        for (let b of as3.values(list)) {
            let r: number = Number(b.r != null ? Number(b.r) : 33);
            let s: Sprite = new Sprite();
            s.name = "ioTouch:" + String(b.label);
            s.x = b.x != null ? Number(b.x) : ArcadeGame.GW - 52 - i * 80;
            s.y = b.y != null ? Number(b.y) : ArcadeGame.GH - 58 - (i % 2) * 34;
            let at: Point = this.ioPlace(new Point(s.x, s.y));
            s.x = at.x;
            s.y = at.y;
            s.scaleX = s.scaleY = this._ioSize;
            this.drawButton(s, r, false);
            // (QoL #235: the label in the player's language (io_t3a_pad_bomb); the name above keeps the game's English one)
            let padKey: string = "io_t3a_pad_" + String(b.label).toLowerCase();
            let shown: string = KEYS.Get(padKey);
            if (shown == padKey) {
                shown = String(b.label);
            }
            let t: TextField = CasinoUI.label(shown, shown.length > 4 ? 10 : 12, 16777215, true, (r * 2) | 0, TextFormatAlign.CENTER);
            t.x = -r;
            t.y = -9;
            t.mouseEnabled = false;
            t.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            s.addChild(t);
            GLOBAL.ioFitText(t, 8);
            let entry: any = { "sprite": s, "code": b.code | 0, "id": -2, "r": r };
            this._buttons.push(entry);
            this.control(s, this.buttonBegin(entry), this.buttonMouse(entry));
            this.addChild(s);
            i++;
        }
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdded));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
    }

    /**
     * QoL #222: where a control the game put at p goes for this player: mirrored left to right for the
     * left-handed, then its distance from its bottom corner of the game's area scaled with the size.
     */
    private ioPlace(p: Point): Point {
        let x: number = this._ioLeft ? ArcadeGame.GW - p.x : p.x;
        let y: number = p.y;
        if (this._ioSize != 1) {
            let cx: number = x < ArcadeGame.GW / 2 ? 0 : ArcadeGame.GW;
            x = cx + (x - cx) * this._ioSize;
            y = ArcadeGame.GH + (y - ArcadeGame.GH) * this._ioSize;
        }
        return new Point(x, y);
    }

    public get stickActive(): boolean {
        return this._stickId != -2 && (Math.abs(this.stickX) > IoTouchPad.DEAD || Math.abs(this.stickY) > IoTouchPad.DEAD);
    }

    private drawButton(s: Sprite, r: number, down: boolean): void {
        let g: Shape = s.numChildren ? as3.as(s.getChildAt(0), Shape) : null;
        if (!g) {
            g = new Shape();
            s.addChildAt(g, 0);
        }
        g.graphics.clear();
        g.graphics.lineStyle(2, 16766346, down ? 0.95 : 0.6);
        g.graphics.beginFill((down ? 0xC8501A : 0x3A0C06) >>> 0, down ? 0.8 : 0.5);
        g.graphics.drawCircle(0, 0, r);
        g.graphics.endFill();
        g.graphics.lineStyle();
        g.graphics.beginFill(0, 0.001);
        g.graphics.drawCircle(0, 0, r + 10);
        g.graphics.endFill();
    }

    /** A control takes its finger (TOUCH_BEGIN) or the mouse (MOUSE_DOWN), and keeps both from the game. */
    private control(s: Sprite, onTouch: Function, onMouse: Function): void {
        s.mouseChildren = false;
        s.addEventListener(TouchEvent.TOUCH_BEGIN, (e: TouchEvent): void => {
            e.stopPropagation();
            onTouch(e.touchPointID, e.stageX, e.stageY);
        });
        s.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
            onMouse(e.stageX, e.stageY);
        });
        for (const $value of as3.values([MouseEvent.MOUSE_UP, MouseEvent.CLICK, TouchEvent.TOUCH_END, TouchEvent.TOUCH_TAP])) {
            let type: string = as3.str($value);
            s.addEventListener(type, (e: Event): void => {
                e.stopPropagation();
            });
        }
    }

    private onAdded(e: Event): void {
        this._stage = this.stage;
        IoTouchPad._up++;
        IoPinchZoom.paused = true;
        this._stage.addEventListener(TouchEvent.TOUCH_MOVE, as3.bind(this, this.onTouchMove), true);
        this._stage.addEventListener(TouchEvent.TOUCH_END, as3.bind(this, this.onTouchEnd), true);
        this._stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMouseMove), true);
        this._stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp), true);
    }

    private onRemoved(e: Event): void {
        this.releaseAll();
        if (this._stage) {
            this._stage.removeEventListener(TouchEvent.TOUCH_MOVE, as3.bind(this, this.onTouchMove), true);
            this._stage.removeEventListener(TouchEvent.TOUCH_END, as3.bind(this, this.onTouchEnd), true);
            this._stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMouseMove), true);
            this._stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp), true);
            this._stage = null;
        }
        IoTouchPad._up = Math.max(0, IoTouchPad._up - 1) | 0;
        IoPinchZoom.paused = IoTouchPad._up > 0;
    }

    // ---- the stick
    private stickBegin(id: int, sx: number, sy: number): void {
        this._stickId = id;
        this.stickTo(sx, sy);
    }

    private stickMouse(sx: number, sy: number): void {
        // (the first finger also arrives as the mouse: already the stick's)
        if (this._stickId != -2) {
            return;
        }
        this.stickBegin(-1, sx, sy);
    }

    private stickTo(sx: number, sy: number): void {
        let p: Point = this._stick.globalToLocal(new Point(sx, sy));
        let d: number = Math.sqrt(p.x * p.x + p.y * p.y);
        let k: number = Number(d > IoTouchPad.STICK_R ? IoTouchPad.STICK_R / d : 1);
        this._knob.x = p.x * k;
        this._knob.y = p.y * k;
        this.stickX = this._knob.x / IoTouchPad.STICK_R;
        this.stickY = this._knob.y / IoTouchPad.STICK_R;
        this.stickKeys();
    }

    private stickEnd(): void {
        this._stickId = -2;
        this._knob.x = this._knob.y = 0;
        this.stickX = this.stickY = 0;
        this.stickKeys();
    }

    /** The arrow keys the stick says, pressed and released to match. */
    private stickKeys(): void {
        let want: any = {};
        let x: number = this.stickX;
        let y: number = this.stickY;
        if (Math.sqrt(x * x + y * y) > IoTouchPad.DEAD) {
            if (this._stickMode == "4") {
                if (Math.abs(x) >= Math.abs(y)) {
                    want[x > 0 ? Keyboard.RIGHT : Keyboard.LEFT] = true;
                } else {
                    want[y > 0 ? Keyboard.DOWN : Keyboard.UP] = true;
                }
            } else {
                // eight ways: a diagonal when the stick is within 22.5 degrees of one
                let a: number = Math.atan2(y, x);
                let c: number = Math.cos(a);
                let s: number = Math.sin(a);
                if (c > 0.38) {
                    want[Keyboard.RIGHT] = true;
                }
                if (c < -0.38) {
                    want[Keyboard.LEFT] = true;
                }
                if (s > 0.38) {
                    want[Keyboard.DOWN] = true;
                }
                if (s < -0.38) {
                    want[Keyboard.UP] = true;
                }
            }
        }
        let code: any = undefined;
        for (code in this._stickKeys) {
            if (!want[code]) {
                delete this._stickKeys[code];
                this._game.keyUp(code | 0);
            }
        }
        for (code in want) {
            if (!this._stickKeys[code]) {
                this._stickKeys[code] = true;
                this._game.keyDown(code | 0);
            }
        }
    }

    // ---- the buttons
    private buttonBegin(b: any): Function {
        return (id: int, sx: number, sy: number): void => {
            if ((b.id | 0) != -2) {
                return;
            }
            b.id = id;
            this.drawButton(as3.cast(b.sprite, Sprite), Number(b.r), true);
            this._game.keyDown(b.code | 0);
        };
    }

    private buttonMouse(b: any): Function {
        let begin: Function = null;
        begin = this.buttonBegin(b);
        return (sx: number, sy: number): void => {
            begin(-1, sx, sy);
        };
    }

    private buttonEnd(b: any): void {
        if ((b.id | 0) == -2) {
            return;
        }
        b.id = -2;
        this.drawButton(as3.cast(b.sprite, Sprite), Number(b.r), false);
        this._game.keyUp(b.code | 0);
    }

    // ---- fingers and the mouse moving and lifting (on the stage, first, in the capture phase: a finger may
    // slide off its control, and the controls keep their own lifts from the game)
    private onTouchMove(e: TouchEvent): void {
        if (this._stick && e.touchPointID == this._stickId) {
            this.stickTo(e.stageX, e.stageY);
        }
    }

    private onTouchEnd(e: TouchEvent): void {
        if (this._stick && e.touchPointID == this._stickId) {
            this.stickEnd();
        }
        for (let b of as3.values(this._buttons)) {
            if ((b.id | 0) == e.touchPointID) {
                this.buttonEnd(b);
            }
        }
    }

    private onMouseMove(e: MouseEvent): void {
        if (this._stick && this._stickId == -1) {
            this.stickTo(e.stageX, e.stageY);
        }
    }

    private onMouseUp(e: MouseEvent): void {
        if (this._stick && this._stickId == -1) {
            this.stickEnd();
        }
        for (let b of as3.values(this._buttons)) {
            if ((b.id | 0) == -1) {
                this.buttonEnd(b);
            }
        }
    }

    /** Every key the pad holds let go (the game ending or closing). */
    public releaseAll(): void {
        if (this._stick && this._stickId != -2) {
            this.stickEnd();
        }
        for (let b of as3.values(this._buttons)) {
            this.buttonEnd(b);
        }
    }
}
