import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class unreadBtn_50 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.unreadBtn_50" });
        as3.fields(this, { sorter_mc: null });
    }

    public sorter_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
