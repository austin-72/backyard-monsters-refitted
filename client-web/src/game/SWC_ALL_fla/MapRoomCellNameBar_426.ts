import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class MapRoomCellNameBar_426 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.MapRoomCellNameBar_426" });
        as3.fields(this, { txt: null, pic: null, nameBar: null, txtAlliance: null });
    }

    public txt: TextField;
    public pic: MovieClip;
    public nameBar: MovieClip;
    public txtAlliance: TextField;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
