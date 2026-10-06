import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class plannerBuildingSquare extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "plannerBuildingSquare" });
        as3.fields(this, { mcBlocked: null, mcOver: null });
    }

    public mcBlocked: MovieClip;
    public mcOver: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
