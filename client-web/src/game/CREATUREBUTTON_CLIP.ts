import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class CREATUREBUTTON_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CREATUREBUTTON_CLIP" });
        as3.fields(this, { _creatureImage: null, txtNumber: null, _bg: null, txtName: null, bLess: null, mcImage: null, bMore: null });
    }

    public _creatureImage: MovieClip;
    public txtNumber: TextField;
    public _bg: MovieClip;
    public txtName: TextField;
    public bLess: Button_CLIP;
    public mcImage: MovieClip;
    public bMore: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
