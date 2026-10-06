import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class QUESTITEM extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "QUESTITEM" });
        as3.fields(this, { mcTick: null, tLabel: null });
    }

    public mcTick: MovieClip;
    public tLabel: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
