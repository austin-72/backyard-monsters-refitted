import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class koth_looted_marker extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "koth_looted_marker" });
        as3.fields(this, { mcBG: null, check: null });
    }

    public mcBG: MovieClip;
    public check: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBG) {
            this.mcBG.stop();
        }
        if (this.check) {
            this.check.stop();
        }
    }
}
