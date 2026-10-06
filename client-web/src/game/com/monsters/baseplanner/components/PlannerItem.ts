import * as as3 from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";

export class PlannerItem extends Sprite {
    static {
        as3.fields(this, { mc: null, size: null });
    }

    public mc: MovieClip;
    public size: Rectangle;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClick));
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onRollOver));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onRollOut));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onMouseDown));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
    }

    public remove(): void {
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClick));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onRollOver));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onRollOut));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onMouseDown));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onMouseUp));
    }

    public update(): void {
    }

    public onClick(param1: MouseEvent = null): void {
    }

    public onRollOver(param1: MouseEvent = null): void {
    }

    public onRollOut(param1: MouseEvent = null): void {
    }

    public onMouseDown(param1: MouseEvent = null): void {
    }

    public onMouseUp(param1: MouseEvent = null): void {
    }
}
