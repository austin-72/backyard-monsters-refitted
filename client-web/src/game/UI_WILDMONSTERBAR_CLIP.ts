import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class UI_WILDMONSTERBAR_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_WILDMONSTERBAR_CLIP" });
        as3.fields(this, { tA: null, info: null, back: null, eta_txt: null });
    }

    public tA: TextField;
    public info: MovieClip;
    public back: MovieClip;
    public eta_txt: TextField;

    public $ctor(): void {
        super.$ctor();
        if (this.info) {
            this.info.stop();
        }
    }
}
