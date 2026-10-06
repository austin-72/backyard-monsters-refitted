import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { frame_CLIP } from "@game";

export class popup_prefab_enlarge_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_prefab_enlarge_CLIP" });
        as3.fields(this, { mcImage: null, mcFrame: null });
    }

    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
