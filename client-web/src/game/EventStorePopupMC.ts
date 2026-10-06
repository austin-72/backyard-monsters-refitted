import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { ButtonBrown_CLIP } from "@game";

export class EventStorePopupMC extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "EventStorePopupMC" });
        as3.fields(this, { tabButton2: null, tabButton1: null, titleImageHolder: null, experienceDisplay: null, displayContainer: null });
    }

    public tabButton2: ButtonBrown_CLIP;
    public tabButton1: ButtonBrown_CLIP;
    public titleImageHolder: MovieClip;
    public experienceDisplay: MovieClip;
    public displayContainer: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
