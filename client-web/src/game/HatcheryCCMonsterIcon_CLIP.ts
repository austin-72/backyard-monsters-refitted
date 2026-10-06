import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { HatcheryMonsterIcon_CLIP } from "@game";

export class HatcheryCCMonsterIcon_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HatcheryCCMonsterIcon_CLIP" });
        as3.fields(this, { mcMonster: null, mcLevel: null });
    }

    public mcMonster: HatcheryMonsterIcon_CLIP;
    public mcLevel: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
