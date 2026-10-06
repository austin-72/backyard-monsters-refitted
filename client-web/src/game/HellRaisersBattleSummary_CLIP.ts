import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class HellRaisersBattleSummary_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HellRaisersBattleSummary_CLIP" });
        as3.fields(this, { tBody: null, mcImage: null, bAction: null });
    }

    public tBody: TextField;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
