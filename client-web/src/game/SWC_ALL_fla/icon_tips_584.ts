import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class icon_tips_584 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.icon_tips_584" });
        as3.fields(this, { mcSpinner: null, mcRing: null });
    }

    public mcSpinner: MovieClip;
    public mcRing: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
