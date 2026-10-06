import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class CreatureLockerItem extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CreatureLockerItem" });
        as3.fields(this, { mcTick: null, tLabel: null, mcBar: null });
    }

    public mcTick: MovieClip;
    public tLabel: TextField;
    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
