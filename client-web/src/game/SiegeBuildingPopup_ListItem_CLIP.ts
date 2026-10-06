import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { creatureBar } from "@game";

export class SiegeBuildingPopup_ListItem_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SiegeBuildingPopup_ListItem_CLIP" });
        as3.fields(this, { star1: null, tTime: null, star2: null, tReady: null, star3: null, star4: null, star5: null, star6: null, tLabel: null, star7: null, star8: null, mcTime: null, star9: null, mcImage: null, tDescription: null, star10: null });
    }

    public star1: MovieClip;
    public tTime: TextField;
    public star2: MovieClip;
    public tReady: TextField;
    public star3: MovieClip;
    public star4: MovieClip;
    public star5: MovieClip;
    public star6: MovieClip;
    public tLabel: TextField;
    public star7: MovieClip;
    public star8: MovieClip;
    public mcTime: creatureBar;
    public star9: MovieClip;
    public mcImage: MovieClip;
    public tDescription: TextField;
    public star10: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
