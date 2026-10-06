import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class popup_aibase_failure extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_aibase_failure" });
        as3.fields(this, { title_txt: null, b1: null, headline_txt: null, body_txt: null });
    }

    public title_txt: TextField;
    public b1: Button_CLIP;
    public headline_txt: TextField;
    public body_txt: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
