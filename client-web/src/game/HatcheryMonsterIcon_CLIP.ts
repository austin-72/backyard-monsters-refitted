import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { loading_210 } from "@game";

export class HatcheryMonsterIcon_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HatcheryMonsterIcon_CLIP" });
        as3.fields(this, { tLabel: null, mcImage: null, mcLoading: null });
    }

    public tLabel: TextField;
    public mcImage: MovieClip;
    public mcLoading: loading_210;

    public $ctor(): void {
        super.$ctor();
        this.stop();
        if (this.mcLoading) {
            this.mcLoading.stop();
        }
    }
}
