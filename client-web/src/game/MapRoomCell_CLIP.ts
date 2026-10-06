import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class MapRoomCell_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomCell_CLIP" });
        as3.fields(this, { mc: null });
    }

    public mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mc.mcPlayer.mcWorker) {
            this.mc.mcPlayer.mcWorker.stop();
        }
    }
}
