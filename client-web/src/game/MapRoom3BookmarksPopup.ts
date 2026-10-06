import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class MapRoom3BookmarksPopup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3BookmarksPopup" });
        as3.fields(this, { contentsMask: null, contentsContainer: null, contentsFrame: null, frame: null, titleText: null });
    }

    public contentsMask: MovieClip;
    public contentsContainer: MovieClip;
    public contentsFrame: MovieClip;
    public frame: frame_CLIP;
    public titleText: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
