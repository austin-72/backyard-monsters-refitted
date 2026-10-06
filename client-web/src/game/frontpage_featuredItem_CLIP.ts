import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class frontpage_featuredItem_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "frontpage_featuredItem_CLIP" });
        as3.fields(this, { tBody: null, tTitle: null, mcOverlay: null, mcImage: null, bAction: null });
    }

    public tBody: TextField;
    public tTitle: TextField;
    public mcOverlay: MovieClip;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
