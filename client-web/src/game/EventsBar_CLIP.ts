import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { creatureBar } from "@game";

export class EventsBar_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "EventsBar_CLIP" });
        as3.fields(this, { mcHit: null, mcBG: null, tLabel: null, barProgressTxt: null, tTitle: null, barProgress: null, bHelp: null, mcImage: null, bActionTxt: null, bAction: null, mcLogo: null });
    }

    public mcHit: MovieClip;
    public mcBG: MovieClip;
    public tLabel: TextField;
    public barProgressTxt: TextField;
    public tTitle: TextField;
    public barProgress: creatureBar;
    public bHelp: MovieClip;
    public mcImage: MovieClip;
    public bActionTxt: TextField;
    public bAction: MovieClip;
    public mcLogo: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
