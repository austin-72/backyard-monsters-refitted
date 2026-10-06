import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MONSTERBAITERPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MONSTERBAITERPOPUP_CLIP" });
        as3.fields(this, { m8: null, b_mc: null, m9: null, r_mc: null, sendBtn: null, tl_mc: null, title_txt: null, bContinue: null, m10: null, txtGuide: null, m11: null, t_mc: null, tr_mc: null, bl_mc: null, m12: null, m13: null, m14: null, m1: null, br_mc: null, m2: null, m3: null, m4: null, clearBtn: null, tSize: null, m5: null, m6: null, l_mc: null, tUpgrade: null, mcStorage: null, m7: null });
    }

    public m8: MovieClip;
    public b_mc: MovieClip;
    public m9: MovieClip;
    public r_mc: MovieClip;
    public sendBtn: Button_CLIP;
    public tl_mc: MovieClip;
    public title_txt: TextField;
    public bContinue: Button_CLIP;
    public m10: MovieClip;
    public txtGuide: TextField;
    public m11: MovieClip;
    public t_mc: MovieClip;
    public tr_mc: MovieClip;
    public bl_mc: MovieClip;
    public m12: MovieClip;
    public m13: MovieClip;
    public m14: MovieClip;
    public m1: MovieClip;
    public br_mc: MovieClip;
    public m2: MovieClip;
    public m3: MovieClip;
    public m4: MovieClip;
    public clearBtn: Button_CLIP;
    public tSize: TextField;
    public m5: MovieClip;
    public m6: MovieClip;
    public l_mc: MovieClip;
    public tUpgrade: TextField;
    public mcStorage: MovieClip;
    public m7: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
