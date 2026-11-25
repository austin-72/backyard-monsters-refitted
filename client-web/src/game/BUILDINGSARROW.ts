import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event } from "flash/events";

export class BUILDINGSARROW extends MovieClip {
    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGSARROW" });
        as3.fields(this, { mcArrow: null, offsetX: undefined, offsetY: undefined, wobbleCountdown: 0, active: false });
    }

    public mcArrow: MovieClip;
    public offsetX: any;
    public offsetY: any;
    public wobbleCountdown: int;
    public active: boolean;

    public $ctor(): void {
        super.$ctor();
        // (Inferno-only, 18 October: listened to only while on the stage: an every-frame listener keeps its object, and
        // through it the whole Mail or Buildings window, for the rest of the session, still ticking)
        this.addEventListener(Event.ADDED_TO_STAGE, (e: Event): void => {
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Wobble));
        });
        this.addEventListener(Event.REMOVED_FROM_STAGE, (e: Event): void => {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Wobble));
        });
        if (this.stage) {
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Wobble));
        }
    }

    public Trigger(param1: boolean = false): any {
        this.active = param1;
        if (this.active) {
            this.buttonMode = true;
            this.mcArrow.gotoAndStop(2);
        } else {
            this.buttonMode = false;
            this.mcArrow.gotoAndStop(1);
        }
    }

    public Wobble(param1: Event): any {
        if (this.active) {
            if (this.wobbleCountdown == 0) {
                this.wobbleCountdown = 80;
            }
            --this.wobbleCountdown;
        }
    }

    private WobbleB(): any {
    }
}
