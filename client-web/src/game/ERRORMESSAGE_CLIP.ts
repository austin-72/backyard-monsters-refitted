import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class ERRORMESSAGE_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ERRORMESSAGE_CLIP" });
        as3.fields(this, { bg: null, tMessage: null });
    }

    public bg: MovieClip;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
