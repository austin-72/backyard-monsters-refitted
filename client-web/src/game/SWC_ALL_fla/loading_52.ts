import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Event } from "flash/events";

export class loading_52 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.loading_52" });
    }

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
    }

    public Tick(e: Event): void {
        this.rotation -= 12;
    }

    private onRemoved(e: Event): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
    }
}
