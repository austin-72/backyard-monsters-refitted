import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class Message_CLIPB extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "Message_CLIPB" });
        as3.fields(this, { charsLeft_txt: null, subject_txt: null, sendBtn: null, tolabel_txt: null, messagelabel_txt: null, fsWarning: null, status_txt: null, body_txt: null, mcFrame: null, subjectlabel_txt: null });
    }

    public charsLeft_txt: TextField;
    public subject_txt: TextField;
    public sendBtn: Button_CLIP;
    public tolabel_txt: TextField;
    public messagelabel_txt: TextField;
    public fsWarning: MovieClip;
    public status_txt: TextField;
    public body_txt: TextField;
    public mcFrame: frame_CLIP;
    public subjectlabel_txt: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
