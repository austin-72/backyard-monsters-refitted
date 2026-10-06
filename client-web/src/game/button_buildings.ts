import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class button_buildings extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "button_buildings" });
        as3.fields(this, { mcTick: null });
    }

    public mcTick: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
