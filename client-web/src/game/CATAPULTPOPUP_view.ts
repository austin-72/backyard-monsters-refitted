import * as as3 from "as3";
import { MovieClip, Sprite } from "flash/display";
import { popup_catapult_mc } from "@game";

export class CATAPULTPOPUP_view extends Sprite {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CATAPULTPOPUP_view" });
        as3.fields(this, { _imageContainer: null, _mc: null });
    }

    public _imageContainer: MovieClip;
    public _mc: popup_catapult_mc;

    public $ctor(): void {
        super.$ctor();
    }
}
