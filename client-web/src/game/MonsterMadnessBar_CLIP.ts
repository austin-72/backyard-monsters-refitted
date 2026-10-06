import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { creatureBar } from "@game";

export class MonsterMadnessBar_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterMadnessBar_CLIP" });
        as3.fields(this, { mcHit: null, mcBG: null, tLabel: null, barProgressTxt: null, barProgress: null, mcImage: null, bActionTxt: null, bAction: null });
    }

    public mcHit: MovieClip;
    public mcBG: MovieClip;
    public tLabel: TextField;
    public barProgressTxt: TextField;
    public barProgress: creatureBar;
    public mcImage: MovieClip;
    public bActionTxt: TextField;
    public bAction: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
