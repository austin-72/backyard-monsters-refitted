import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class creatureBarAdv extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "creatureBarAdv" });
        as3.fields(this, { mcBar2: null, mcBar: null });
    }

    public mcBar2: MovieClip;
    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBar) {
            this.mcBar.stop();
        }
        if (this.mcBar2) {
            this.mcBar2.stop();
        }
    }
}
