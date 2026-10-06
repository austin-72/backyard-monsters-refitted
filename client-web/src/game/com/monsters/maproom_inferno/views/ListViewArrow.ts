import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Bounce, Expo, ListViewArrow_CLIP, TweenLite } from "@game";

export class ListViewArrow extends ListViewArrow_CLIP {
    static {
        as3.fields(this, { offsetX: NaN, offsetY: NaN, wobbleCountdown: 0, active: false });
    }

    public offsetX: number;
    public offsetY: number;
    public wobbleCountdown: int;
    public active: boolean;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Wobble));
    }

    public Trigger(param1: boolean = false): void {
        this.active = param1;
        if (this.active) {
            this.buttonMode = true;
            this.mcArrow.gotoAndStop(2);
        } else {
            this.buttonMode = false;
            this.mcArrow.gotoAndStop(1);
        }
    }

    public Wobble(param1: Event): void {
        if (this.active) {
            if (this.wobbleCountdown == 0) {
                this.wobbleCountdown = 80;
                this.mcArrow.x = -15;
                TweenLite.to(this.mcArrow, 0.6, { "x": -20, "ease": Expo.easeInOut, "onComplete": as3.bind(this, this.WobbleB) });
            }
            --this.wobbleCountdown;
        }
    }

    private WobbleB(): void {
        TweenLite.to(this.mcArrow, 0.6, { "x": -15, "ease": Bounce.easeOut });
    }
}
