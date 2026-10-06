import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { points_txt } from "@game";

export class ResourceBar2 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ResourceBar2" });
        as3.fields(this, { mcHit: null, tR: null, bAdd: null, mcPoints: null, mcBar: null });
    }

    public mcHit: MovieClip;
    public tR: TextField;
    public bAdd: MovieClip;
    public mcPoints: points_txt;
    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBar) {
            this.mcBar.stop();
        }
        if (this.mcPoints) {
            this.mcPoints.stop();
        }
        if (this.bAdd) {
            this.bAdd.stop();
        }
    }
}
