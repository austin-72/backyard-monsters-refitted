import * as as3 from "as3";
import { MovieClip, SimpleButton } from "flash/display";

export class DescentMonsterBase_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom_inferno.DescentMonsterBase_CLIP" });
        as3.fields(this, { mediumhit: null, smallhit: null, mcBase: null, largehit: null });
    }

    public mediumhit: SimpleButton;
    public smallhit: SimpleButton;
    public mcBase: MovieClip;
    public largehit: SimpleButton;

    public $ctor(): void {
        super.$ctor();
    }
}
