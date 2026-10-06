import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class bubblepopupUpSiegeWeapon_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubblepopupUpSiegeWeapon_CLIP" });
        as3.fields(this, { mcArrow: null, mcBG: null, tBody: null, tTitle: null });
    }

    public mcArrow: MovieClip;
    public mcBG: MovieClip;
    public tBody: TextField;
    public tTitle: TextField;

    public $ctor(): void {
        super.$ctor();
        if (this.mcArrow) {
            this.mcArrow.stop();
        }
        if (this.mcBG) {
            this.mcBG.stop();
        }
    }
}
