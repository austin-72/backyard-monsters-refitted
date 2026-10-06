import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class MapRoom3RelocateMainYardPopup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3RelocateMainYardPopup" });
        as3.fields(this, { nameTitletext: null, background: null, contentsMask: null, contentsContainer: null, selectDescriptionText: null, levelTitleText: null, randomButton: null, worldtTitleText: null, contentsFrame: null, titleText: null, orText: null, randomDescriptionText: null });
    }

    public nameTitletext: TextField;
    public background: frame_CLIP;
    public contentsMask: MovieClip;
    public contentsContainer: MovieClip;
    public selectDescriptionText: TextField;
    public levelTitleText: TextField;
    public randomButton: Button_CLIP;
    public worldtTitleText: TextField;
    public contentsFrame: MovieClip;
    public titleText: TextField;
    public orText: TextField;
    public randomDescriptionText: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
