import * as as3 from "as3";
import { Event } from "flash/events";

export class TweenEvent extends Event {
    static {
        as3.fields(this, { info: null });
    }

    public static readonly version: number = 0.9;

    public static readonly START: string = "start";

    public static readonly UPDATE: string = "update";

    public static readonly COMPLETE: string = "complete";
    public info: any;

    public $ctor(param1?: string, param2: any /* any */ = null, param3: boolean = false, param4: boolean = false): void {
        super.$ctor(param1, param3, param4);
        this.info = param2;
    }

    public override clone(): Event {
        return new TweenEvent(this.type, this.info, this.bubbles, this.cancelable);
    }
}
