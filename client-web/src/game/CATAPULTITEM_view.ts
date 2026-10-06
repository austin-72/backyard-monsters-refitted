import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class CATAPULTITEM_view extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CATAPULTITEM_view" });
        as3.fields(this, { _txtMC: null });
    }

    public _txtMC: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
