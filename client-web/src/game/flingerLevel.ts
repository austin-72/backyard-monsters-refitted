import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class flingerLevel extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "flingerLevel" });
        as3.fields(this, { _mc: null });
    }

    public _mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
