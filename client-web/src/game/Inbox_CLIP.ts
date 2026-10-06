import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { BUILDINGSARROW, Button_CLIP, MovieClipUtils, frame_CLIP } from "@game";

export class Inbox_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "Inbox_CLIP" });
        as3.fields(this, { outBtn: null, bNext: null, subjectBtn: null, noMessages_btn: null, bPrevious: null, title_txt: null, dateBtn: null, fromBtn: null, mask_mc: null, unreadBtn: null, mcFrame: null, newBtn: null, inBtn: null });
    }

    public outBtn: Button_CLIP;
    public bNext: BUILDINGSARROW;
    public subjectBtn: MovieClip;
    public noMessages_btn: MovieClip;
    public bPrevious: BUILDINGSARROW;
    public title_txt: TextField;
    public dateBtn: MovieClip;
    public fromBtn: MovieClip;
    public mask_mc: MovieClip;
    public unreadBtn: MovieClip;
    public mcFrame: frame_CLIP;
    public newBtn: Button_CLIP;
    public inBtn: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
