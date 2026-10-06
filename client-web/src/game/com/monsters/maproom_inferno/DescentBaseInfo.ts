import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class DescentBaseInfo extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom_inferno.DescentBaseInfo" });
        as3.fields(this, { info_txt: null, mcArrow: null, mcBG: null });
    }

    public info_txt: TextField;
    public mcArrow: MovieClip;
    public mcBG: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
