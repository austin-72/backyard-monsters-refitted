import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class PROJECTILE_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PROJECTILE_CLIP" });
        as3.fields(this, { mcProjectile: null, mcShadow: null });
    }

    public mcProjectile: MovieClip;
    public mcShadow: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
