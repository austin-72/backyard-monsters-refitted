import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class workerMessage extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "workerMessage" });
        as3.fields(this, { txt: null, mcBG: null });
    }

    public txt: TextField;
    public mcBG: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
