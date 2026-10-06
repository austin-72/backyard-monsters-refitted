import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class UI_VISITOR_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_VISITOR_CLIP" });
        as3.fields(this, { mc: null });
    }

    public mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
