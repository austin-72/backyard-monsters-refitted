import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BUILDINGBUTTONSOON extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGBUTTONSOON" });
        as3.fields(this, { t: null });
    }

    public t: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
