import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils } from "@game";

export class HOUSINGPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HOUSINGPOPUP_CLIP" });
        as3.fields(this, { juicefooter_desc_txt: null, footer_desc_txt: null, ascend_desc_txt: null, title_txt: null, bCancel: null, bJuice: null, bAll: null, bAscend: null, capacity_desc_txt: null, monsterContainerMask: null, tStorage: null, monsterContainer: null, mcStorage: null });
    }

    public juicefooter_desc_txt: TextField;
    public footer_desc_txt: TextField;
    public ascend_desc_txt: TextField;
    public title_txt: TextField;
    public bCancel: Button_CLIP;
    public bJuice: Button_CLIP;
    public bAll: Button_CLIP;
    public bAscend: Button_CLIP;
    public capacity_desc_txt: TextField;
    public monsterContainerMask: MovieClip;
    public tStorage: TextField;
    public monsterContainer: MovieClip;
    public mcStorage: MovieClip;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
