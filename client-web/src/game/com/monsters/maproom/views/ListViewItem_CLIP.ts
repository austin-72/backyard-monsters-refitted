import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class ListViewItem_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom.views.ListViewItem_CLIP" });
        as3.fields(this, { online_txt: null, name_txt: null, placeholder: null, userid_txt: null, levelStar: null, attackBtn: null, status_txt: null, dot: null, attacks_txt: null, helpBtn: null, msgBtn: null, truceBtn: null, extraStatus_txt: null });
    }

    public online_txt: TextField;
    public name_txt: TextField;
    public placeholder: MovieClip;
    public userid_txt: TextField;
    public levelStar: MovieClip;
    public attackBtn: Button_CLIP;
    public status_txt: TextField;
    public dot: MovieClip;
    public attacks_txt: TextField;
    public helpBtn: Button_CLIP;
    public msgBtn: Button_CLIP;
    public truceBtn: Button_CLIP;
    public extraStatus_txt: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
