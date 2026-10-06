import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class InboxMessage_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "InboxMessage_CLIP" });
        as3.fields(this, { subject_txt: null, subjectType_txt: null, placeholder: null, b1: null, userid_txt: null, replies_txt: null, sent_txt: null, sender_txt: null, dot_mc: null, bg_mc: null });
    }

    public subject_txt: TextField;
    public subjectType_txt: TextField;
    public placeholder: MovieClip;
    public b1: Button_CLIP;
    public userid_txt: TextField;
    public replies_txt: TextField;
    public sent_txt: TextField;
    public sender_txt: TextField;
    public dot_mc: MovieClip;
    public bg_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
