import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class PopupRelocateMe_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupRelocateMe_CLIP" });
        as3.fields(this, { mcBG: null, mcInstant: null, tTitle: null, mcResources: null, tDescription: null });
    }

    public mcBG: frame_CLIP;
    public mcInstant: MovieClip;
    public tTitle: TextField;
    public mcResources: MovieClip;
    public tDescription: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
