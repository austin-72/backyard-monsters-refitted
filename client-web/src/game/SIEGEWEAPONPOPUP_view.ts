import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, changeCatapultBtn } from "@game";

export class SIEGEWEAPONPOPUP_view extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SIEGEWEAPONPOPUP_view" });
        as3.fields(this, { _bFire: null, timeLeftMC: null, txtName: null, _bOpen: null, _image: null, _iconbg: null, _bar: null });
    }

    public _bFire: Button_CLIP;
    public timeLeftMC: MovieClip;
    public txtName: TextField;
    public _bOpen: changeCatapultBtn;
    public _image: MovieClip;
    public _iconbg: MovieClip;
    public _bar: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
