import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class ParticlesObject_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ParticlesObject_CLIP" });
        as3.fields(this, { mcDot: null });
    }

    public mcDot: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
