import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class creatureBar extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "creatureBar" });
        as3.fields(this, { mcBar: null });
    }

    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBar) {
            this.mcBar.stop();
        }
    }
}
