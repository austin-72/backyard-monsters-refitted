import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class ChampionChamberFrozen extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChampionChamberFrozen" });
        as3.fields(this, { tName: null, bFreeze: null, mcImage: null });
    }

    public tName: TextField;
    public bFreeze: Button_CLIP;
    public mcImage: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
