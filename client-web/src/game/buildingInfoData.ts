import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class buildingInfoData extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buildingInfo" });
        as3.fields(this, { tInfoRight: null, tName: null, mcBG: null, tInfoLeft: null });
    }

    public tInfoRight: TextField;
    public tName: TextField;
    public mcBG: MovieClip;
    public tInfoLeft: TextField;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
