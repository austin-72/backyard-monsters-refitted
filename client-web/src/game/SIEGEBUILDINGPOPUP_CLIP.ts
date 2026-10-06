import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { ButtonBrown_CLIP, Button_CLIP, creatureBarAdv, frame3_CLIP } from "@game";

export class SIEGEBUILDINGPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SIEGEBUILDINGPOPUP_CLIP" });
        as3.fields(this, { title_siegelab: null, weaponContainer_frame: null, stat1_bar: null, stat3_bar: null, stat2_bar: null, tab_siegelab: null, bMap: null, videoCanvas_mc: null, tNotice: null, scroller: null, weaponContainer_mc: null, stat1_label: null, mcInstant: null, title_siegefactory: null, bCancel: null, tDesc: null, tTitle: null, mcTime: null, stat3_label: null, mcResources: null, stat2_label: null, stat2_bartxt: null, stat3_bartxt: null, stat1_bartxt: null, tTitleReady: null, mcFrame: null, weaponContainer_mask: null, mcTimeTxt: null, tWarning: null, window: null, tab_siegefactory: null });
    }

    public title_siegelab: TextField;
    public weaponContainer_frame: MovieClip;
    public stat1_bar: creatureBarAdv;
    public stat3_bar: creatureBarAdv;
    public stat2_bar: creatureBarAdv;
    public tab_siegelab: ButtonBrown_CLIP;
    public bMap: Button_CLIP;
    public videoCanvas_mc: MovieClip;
    public tNotice: TextField;
    public scroller: MovieClip;
    public weaponContainer_mc: MovieClip;
    public stat1_label: TextField;
    public mcInstant: MovieClip;
    public title_siegefactory: TextField;
    public bCancel: Button_CLIP;
    public tDesc: TextField;
    public tTitle: TextField;
    public mcTime: creatureBarAdv;
    public stat3_label: TextField;
    public mcResources: MovieClip;
    public stat2_label: TextField;
    public stat2_bartxt: TextField;
    public stat3_bartxt: TextField;
    public stat1_bartxt: TextField;
    public tTitleReady: TextField;
    public mcFrame: frame3_CLIP;
    public weaponContainer_mask: MovieClip;
    public mcTimeTxt: TextField;
    public tWarning: TextField;
    public window: MovieClip;
    public tab_siegefactory: ButtonBrown_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
