import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class popup_mushroomshiny extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_mushroomshiny" });
        as3.fields(this, { tTitle: null, mcImage: null, mcFrame: null, tMessage: null });
    }

    public tTitle: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
