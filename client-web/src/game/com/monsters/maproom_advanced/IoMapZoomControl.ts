import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { IoMapUi, SOUNDS, buttonZoom_CLIP } from "@game";

/**
 * Inferno-only: the map room's zoom buttons, on the window's top edge left of the full screen button: the
 * yard's own zoom buttons (buttonZoom_CLIP: frame 1 is -, frame 2 is +), side by side. The steps are
 * 0 = the whole world ... 4 = close (MapRoomPopup); a button is dimmed at its end of them. The buttons are
 * only pictures here: the yard clip zooms the yard when clicked, so it sits inside a holder that takes
 * the clicks instead.
 */
export class IoMapZoomControl extends Sprite {
    static {
        as3.fields(this, { _minus: null, _plus: null, _level: 4, _minLevel: 0, _onStep: null });
    }

    public static readonly NAMES: any[] = ["World", "World 2×", "World 4×", "Far", "Close"];

    private static readonly BUTTON: int = 26;

    private static readonly GAP: int = 4;
    private _minus: Sprite;
    private _plus: Sprite;
    private _level: int;
    private _minLevel: int;
    private _onStep: Function;

    public $ctor(onStep?: Function, minLevel?: int): void {
        super.$ctor();
        this._onStep = onStep;
        this._minLevel = minLevel;
        this._minus = this.makeButton(1);
        this.addChild(this._minus);
        this._plus = this.makeButton(2);
        this._plus.x = IoMapZoomControl.BUTTON + IoMapZoomControl.GAP;
        this.addChild(this._plus);
        // A press on the buttons is not a drag of the map, nor a click on the window frame below.
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.setLevel(4);
    }

    private makeButton(frame: int): Sprite {
        let holder: Sprite = null;
        let art: MovieClip = null;
        holder = new Sprite();
        art = new buttonZoom_CLIP();
        let hit: Shape = new Shape();
        art.gotoAndStop(frame);
        // The art is drawn around its own origin; fit it into the button's box.
        let box: number = Math.max(art.width, art.height);
        if (box > 0) {
            art.scaleX = art.scaleY = IoMapZoomControl.BUTTON / box;
        }
        holder.addChild(art);
        let bounds: Rectangle = art.getBounds(holder);
        art.x -= bounds.x;
        art.y -= bounds.y;
        IoMapUi.hitArea(hit.graphics, IoMapZoomControl.BUTTON, IoMapZoomControl.BUTTON);
        holder.addChild(hit);
        holder.mouseChildren = false;
        holder.buttonMode = true;
        holder.addEventListener(MouseEvent.CLICK, frame == 1 ? as3.bind(this, this.onMinus) : as3.bind(this, this.onPlus));
        holder.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            if (holder.mouseEnabled) {
                art.alpha = 0.8;
            }
        });
        holder.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            art.alpha = 1;
        });
        return holder;
    }

    public get level(): int {
        return this._level;
    }

    /** The zoom step showing (0 = the whole world ... 4 = close): - and + are dimmed at the ends. */
    public setLevel(level: int): void {
        this._level = level;
        this.enable(this._minus, level > this._minLevel);
        this.enable(this._plus, level < IoMapZoomControl.NAMES.length - 1);
    }

    private enable(button: Sprite, on: boolean): void {
        button.mouseEnabled = on;
        button.buttonMode = on;
        button.alpha = Number(on ? 1 : 0.4);
    }

    private onMinus(e: MouseEvent): void {
        e.stopPropagation();
        if (this._level > this._minLevel && this._onStep != null) {
            SOUNDS.Play("click1");
            this._onStep(-1);
        }
    }

    private onPlus(e: MouseEvent): void {
        e.stopPropagation();
        if (this._level < IoMapZoomControl.NAMES.length - 1 && this._onStep != null) {
            SOUNDS.Play("click1");
            this._onStep(1);
        }
    }

    public Cleanup(): void {
        this._onStep = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
