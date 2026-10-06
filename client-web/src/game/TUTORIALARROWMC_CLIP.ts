import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class TUTORIALARROWMC_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "TUTORIALARROWMC_CLIP" });
        as3.fields(this, { mcArrow: null });
    }

    public mcArrow: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
