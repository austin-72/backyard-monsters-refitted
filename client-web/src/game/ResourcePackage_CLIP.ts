import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { packagedot } from "@game";

export class ResourcePackage_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ResourcePackage_CLIP" });
        as3.fields(this, { mcShadow: null, mcDot: null });
    }

    public mcShadow: MovieClip;
    public mcDot: packagedot;

    public $ctor(): void {
        super.$ctor();
    }
}
