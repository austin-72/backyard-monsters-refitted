import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class WORKER_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "WORKER_CLIP" });
        as3.fields(this, { mcMarker: null });
    }

    public mcMarker: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcMarker) {
            this.mcMarker.stop();
        }
    }
}
