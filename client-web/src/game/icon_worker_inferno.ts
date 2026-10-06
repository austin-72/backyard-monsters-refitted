import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class icon_worker_inferno extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "icon_worker_inferno" });
        as3.fields(this, { label_txt: null, mcIcon: null });
    }

    public label_txt: TextField;
    public mcIcon: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
