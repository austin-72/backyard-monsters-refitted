import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP, loading_52 } from "@game";

export class Thread_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "Thread_CLIP" });
        as3.fields(this, { outline_mc: null, msg_txt: null, subject_txt: null, sendBtn: null, denyBtn: null, spinner: null, mask_mc: null, fsWarning: null, largeOutline_mc: null, reportBtn: null, viewBtn: null, mcFrame: null, acceptBtn: null, box: null, inputBox: null });
    }

    public outline_mc: MovieClip;
    public msg_txt: TextField;
    public subject_txt: TextField;
    public sendBtn: Button_CLIP;
    public denyBtn: Button_CLIP;
    public spinner: loading_52;
    public mask_mc: MovieClip;
    public fsWarning: MovieClip;
    public largeOutline_mc: MovieClip;
    public reportBtn: MovieClip;
    public viewBtn: Button_CLIP;
    public mcFrame: frame_CLIP;
    public acceptBtn: Button_CLIP;
    public box: MovieClip;
    public inputBox: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
