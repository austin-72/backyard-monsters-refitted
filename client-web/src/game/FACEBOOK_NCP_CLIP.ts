import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class FACEBOOK_NCP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "FACEBOOK_NCP_CLIP" });
        as3.fields(this, { mcArrow: null, imageHolder: null, bNo: null, bYes: null });
    }

    public mcArrow: MovieClip;
    public imageHolder: MovieClip;
    public bNo: MovieClip;
    public bYes: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
