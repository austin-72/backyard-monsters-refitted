import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class PointsBar_Inferno_898 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.PointsBar_Inferno_898" });
        as3.fields(this, { tInfo: null, tName: null, mcStar: null, mcLevel: null, mcBar: null });
    }

    public tInfo: TextField;
    public tName: TextField;
    public mcStar: MovieClip;
    public mcLevel: TextField;
    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
