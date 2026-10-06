import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class creatureBarGuardian extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "creatureBarGuardian" });
        as3.fields(this, { mcBuff1: null, mcBuff2: null, mcBar: null, mcBuff3: null });
    }

    public mcBuff1: MovieClip;
    public mcBuff2: MovieClip;
    public mcBar: MovieClip;
    public mcBuff3: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBar) {
            this.mcBar.stop();
        }
        if (this.mcBuff1) {
            this.mcBuff1.stop();
        }
        if (this.mcBuff2) {
            this.mcBuff2.stop();
        }
        if (this.mcBuff3) {
            this.mcBuff3.stop();
        }
    }
}
