import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class QUESTGROUP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "QUESTGROUP" });
        as3.fields(this, { tLabel: null });
    }

    public tLabel: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
